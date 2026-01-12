import { create } from 'zustand';
import { 
  ImportSession, 
  ImportFormData,
  Lead
} from '@/lib/leads/types';
import { useAuthStore } from '@/store/auth';
import { useLeadsStore } from './leads';
import { getLeadsAdapter } from '@/lib/leads/leadsAdapter';
import { storage, STORAGE_KEYS, generateId } from '@/lib/leads/localStorage';
import { extractCoordinatesFromUrl } from '@/lib/leads/validation';

// Use the interface version of ImportError (not the class)
type ImportErrorDetail = {
  row: number;
  field: string;
  value: any;
  error: string;
  timestamp: string;
};

interface ImportState {
  sessions: ImportSession[];
  currentSession: ImportSession | null;
  isImporting: boolean;
  error: string | null;
  importProgress: number; // 0-100
  
  // Actions
  fetchImportSessions: () => Promise<void>;
  createImportSession: (sessionData: ImportFormData) => Promise<ImportSession>;
  updateImportSession: (sessionId: string, updates: Partial<ImportSession>) => Promise<void>;
  importFromExcel: (file: File, fieldMapping: Record<string, string>) => Promise<ImportSession>;
  importFromScraper: (scraperId: string) => Promise<ImportSession>;
  getImportProgress: (sessionId: string) => Promise<ImportSession>;
  processImportData: (data: any[], sessionId: string) => Promise<void>;
  validateImportData: (data: any[]) => ImportErrorDetail[];
  parseExcelFile: (file: File, fieldMapping: Record<string, string>) => Promise<any[]>;
  setCurrentSession: (session: ImportSession | null) => void;
  clearError: () => void;
}

export const useImportStore = create<ImportState>((set, get) => ({
  sessions: [],
  currentSession: null,
  isImporting: false,
  error: null,
  importProgress: 0,

  // Fetch all import sessions for the current user
  fetchImportSessions: async () => {
    try {
      const sessions = storage.get<ImportSession[]>(STORAGE_KEYS.IMPORT_SESSIONS) || [];
      
      // Sort by created_at descending (most recent first)
      sessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      set({ sessions });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch import sessions' });
      throw error;
    }
  },

  // Create a new import session
  createImportSession: async (sessionData: ImportFormData & { list_name?: string }) => {
    set({ isImporting: true, error: null, importProgress: 0 });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const allSessions = storage.get<ImportSession[]>(STORAGE_KEYS.IMPORT_SESSIONS) || [];

      const newSession: ImportSession = {
        id: generateId(),
        source_type: sessionData.source_type,
        source_id: sessionData.source_id || null,
        file_name: sessionData.file?.name || null,
        list_name: sessionData.list_name || null,
        total_records: 0,
        imported_records: 0,
        failed_records: 0,
        status: 'pending',
        error_log: null,
        user_id: user.id,
        created_at: new Date().toISOString()
      };

      // Save to localStorage
      const updatedSessions = [newSession, ...allSessions];
      storage.set(STORAGE_KEYS.IMPORT_SESSIONS, updatedSessions);

      set({ 
        currentSession: newSession,
        sessions: [newSession, ...get().sessions]
      });

      return newSession;
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to create import session',
        isImporting: false 
      });
      throw error;
    }
  },

  // Update an existing import session
  updateImportSession: async (sessionId: string, updates: Partial<ImportSession>) => {
    try {
      const allSessions = storage.get<ImportSession[]>(STORAGE_KEYS.IMPORT_SESSIONS) || [];
      const sessionIndex = allSessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex === -1) {
        throw new Error('Import session not found');
      }

      const updatedSession: ImportSession = {
        ...allSessions[sessionIndex],
        ...updates
      };

      // Update in localStorage
      allSessions[sessionIndex] = updatedSession;
      storage.set(STORAGE_KEYS.IMPORT_SESSIONS, allSessions);

      // Update in local state
      const currentSessions = get().sessions;
      const updatedSessions = currentSessions.map(session =>
        session.id === sessionId ? updatedSession : session
      );

      set({ 
        sessions: updatedSessions,
        currentSession: get().currentSession?.id === sessionId ? updatedSession : get().currentSession
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update import session' });
      throw error;
    }
  },

  // Import data from Excel file
  importFromExcel: async (file: File, fieldMapping: Record<string, string>, listName?: string) => {
    set({ isImporting: true, error: null, importProgress: 0 });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create import session
      const session = await get().createImportSession({
        source_type: 'excel',
        file,
        list_name: listName
      });

      // Update session status to processing
      await get().updateImportSession(session.id, { status: 'processing' });

      // Read and parse Excel file
      const data = await get().parseExcelFile(file, fieldMapping);

      // Update total records
      await get().updateImportSession(session.id, { 
        total_records: data.length 
      });

      // Validate data
      const validationErrors = get().validateImportData(data);
      
      if (validationErrors.length > 0) {
        console.warn('Validation errors found:', validationErrors);
        await get().updateImportSession(session.id, {
          error_log: validationErrors as any
        });
      }

      // Process and import data
      await get().processImportData(data, session.id);

      // Mark session as completed
      await get().updateImportSession(session.id, { 
        status: 'completed' 
      });

      set({ 
        isImporting: false,
        importProgress: 100
      });

      // Refresh leads in the leads store
      await useLeadsStore.getState().fetchLeads();

      return session;
    } catch (error: any) {
      const currentSession = get().currentSession;
      if (currentSession) {
        await get().updateImportSession(currentSession.id, { 
          status: 'failed' 
        });
      }
      
      set({ 
        error: error.message || 'Failed to import from Excel',
        isImporting: false,
        importProgress: 0
      });
      throw error;
    }
  },

  // Import data from scraper
  importFromScraper: async (scraperId: string, listName?: string) => {
    set({ isImporting: true, error: null, importProgress: 0 });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create import session
      const session = await get().createImportSession({
        source_type: 'scraper',
        source_id: scraperId,
        list_name: listName
      });

      // Update session status to processing
      await get().updateImportSession(session.id, { status: 'processing' });

      // Fetch scraper data from API
      const response = await fetch(`/api/scraper-data/${scraperId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch scraper data');
      }

      const scraperData = await response.json();
      
      if (!scraperData.data || !Array.isArray(scraperData.data)) {
        throw new Error('Invalid scraper data format');
      }

      const data = scraperData.data;

      // Update total records
      await get().updateImportSession(session.id, { 
        total_records: data.length 
      });

      // Validate data
      const validationErrors = get().validateImportData(data);
      
      if (validationErrors.length > 0) {
        console.warn('Validation errors found:', validationErrors);
        await get().updateImportSession(session.id, {
          error_log: validationErrors as any
        });
      }

      // Process and import data
      await get().processImportData(data, session.id);

      // Mark session as completed
      await get().updateImportSession(session.id, { 
        status: 'completed' 
      });

      set({ 
        isImporting: false,
        importProgress: 100
      });

      // Refresh leads in the leads store
      await useLeadsStore.getState().fetchLeads();

      return session;
    } catch (error: any) {
      const currentSession = get().currentSession;
      if (currentSession) {
        await get().updateImportSession(currentSession.id, { 
          status: 'failed' 
        });
      }
      
      set({ 
        error: error.message || 'Failed to import from scraper',
        isImporting: false,
        importProgress: 0
      });
      throw error;
    }
  },

  // Get import progress for a specific session
  getImportProgress: async (sessionId: string) => {
    try {
      const allSessions = storage.get<ImportSession[]>(STORAGE_KEYS.IMPORT_SESSIONS) || [];
      const session = allSessions.find(s => s.id === sessionId);

      if (!session) {
        throw new Error('Import session not found');
      }

      // Calculate progress percentage
      if (session.total_records > 0) {
        const progress = Math.round(
          (session.imported_records / session.total_records) * 100
        );
        set({ importProgress: progress });
      }

      return session;
    } catch (error: any) {
      set({ error: error.message || 'Failed to get import progress' });
      throw error;
    }
  },

  // Process and import data into leads table
  processImportData: async (data: any[], sessionId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    let importedCount = 0;
    let failedCount = 0;
    const batchSize = 100; // Larger batches for bulk insert

    // Get the list name from the current session
    const session = get().currentSession;
    const listName = session?.list_name || null;

    // Get current max number for 'new' status to start numbering from
    const existingLeads = await getLeadsAdapter().getLeads(user.id, { status: 'new' });
    let nextNumber = existingLeads.length + 1;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        // Prepare all leads in the batch
        const leadsToInsert = batch.map((item, index) => {
          const mapsAddress = item.maps_address || item.mapsAddress || '';
          
          // Extract coordinates from maps URL
          let coordinates = null;
          if (mapsAddress) {
            coordinates = extractCoordinatesFromUrl(mapsAddress);
          }
          
          return {
            maps_address: mapsAddress,
            number: nextNumber + index,
            name: item.name || '',
            phone: item.phone || null,
            provider: item.provider || null,
            address: item.address || null,
            type_of_business: item.type_of_business || item.typeOfBusiness || null,
            status: 'new' as const,
            notes: item.notes || null,
            date_to_call_back: null,
            coordinates,
            background_color: null,
            list_name: listName,
            import_session_id: sessionId,
          };
        });

        // Bulk insert using PostgreSQL directly
        const { data: insertedLeads, error } = await getLeadsAdapter().bulkCreateLeads(user.id, leadsToInsert);
        
        if (error) {
          console.error('Batch import error:', error);
          failedCount += batch.length;
        } else {
          importedCount += insertedLeads?.length || batch.length;
          nextNumber += batch.length; // Increment for next batch
        }

        // Update progress
        const progress = Math.round((importedCount / data.length) * 100);
        set({ importProgress: progress });

        // Update session progress
        await get().updateImportSession(sessionId, {
          imported_records: importedCount,
          failed_records: failedCount
        });

      } catch (error) {
        console.error('Batch import error:', error);
        failedCount += batch.length;
        
        // Update session with failed count
        await get().updateImportSession(sessionId, {
          imported_records: importedCount,
          failed_records: failedCount
        });
      }
    }

    // Final update
    await get().updateImportSession(sessionId, {
      imported_records: importedCount,
      failed_records: failedCount
    });
  },

  // Validate import data
  validateImportData: (data: any[]): ImportErrorDetail[] => {
    const errors: ImportErrorDetail[] = [];

    data.forEach((item, index) => {
      const row = index + 1;

      // Required field: name
      if (!item.name || item.name.trim() === '') {
        errors.push({
          row,
          field: 'name',
          value: item.name,
          error: 'Name is required',
          timestamp: new Date().toISOString()
        });
      }

      // Required field: maps_address or mapsAddress
      if (!item.maps_address && !item.mapsAddress) {
        errors.push({
          row,
          field: 'maps_address',
          value: item.maps_address || item.mapsAddress,
          error: 'Maps address is required',
          timestamp: new Date().toISOString()
        });
      }

      // Validate phone format if provided
      if (item.phone && typeof item.phone === 'string') {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(item.phone)) {
          errors.push({
            row,
            field: 'phone',
            value: item.phone,
            error: 'Invalid phone number format',
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    return errors;
  },

  // Parse Excel file
  parseExcelFile: async (file: File, fieldMapping: Record<string, string>): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            throw new Error('Failed to read file');
          }

          // Dynamic import of xlsx library
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Get first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Apply field mapping
          const mappedData = jsonData.map((row: any) => {
            const mappedRow: any = {};
            
            Object.entries(fieldMapping).forEach(([targetField, sourceField]) => {
              mappedRow[targetField] = row[sourceField];
            });

            return mappedRow;
          });

          resolve(mappedData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsBinaryString(file);
    });
  },

  // Set current session
  setCurrentSession: (session: ImportSession | null) => {
    set({ currentSession: session });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));

// Convenience selectors
export const useImportSessions = () => useImportStore((state) => state.sessions);
export const useCurrentImportSession = () => useImportStore((state) => state.currentSession);
export const useIsImporting = () => useImportStore((state) => state.isImporting);
export const useImportError = () => useImportStore((state) => state.error);
export const useImportProgress = () => useImportStore((state) => state.importProgress);
