import { NextRequest, NextResponse } from 'next/server';
import { Item } from '@/lib/types';

export async function GET() {
  try {
    // Try to get from database first, then fallback to localStorage
    try {
      const { databaseHelpers } = await import('@/lib/databaseAdapter');
      const items = await databaseHelpers.getConnectivityItems();
      
      // Ensure numeric values are properly converted from strings if needed
      const processedItems = items?.map((item: any) => ({
        ...item,
        cost: typeof item.cost === 'string' ? parseFloat(item.cost) : item.cost,
        managerCost: typeof item.managerCost === 'string' ? parseFloat(item.managerCost) : item.managerCost,
        userCost: typeof item.userCost === 'string' ? parseFloat(item.userCost) : item.userCost,
        quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity
      })) || [];
      
      return NextResponse.json(processedItems);
    } catch (dbError) {
      console.warn('Database not available, falling back to localStorage:', dbError);
      
      // Fallback to localStorage data
      const defaultConnectivity: Item[] = [
        {
          id: 'conn-001',
          name: 'Basic Broadband',
          cost: 45,
          managerCost: 36,
          userCost: 45,
          quantity: 1,
          isExtension: false,
          displayOrder: 1,
          showOnProposal: true
        },
        {
          id: 'conn-002',
          name: 'Premium Broadband',
          cost: 85,
          managerCost: 68,
          userCost: 85,
          quantity: 1,
          isExtension: false,
          displayOrder: 2,
          showOnProposal: true
        },
        {
          id: 'conn-003',
          name: 'Fiber Connection',
          cost: 120,
          managerCost: 96,
          userCost: 120,
          quantity: 1,
          isExtension: false,
          displayOrder: 3,
          showOnProposal: true
        }
      ];
      
      return NextResponse.json(defaultConnectivity);
    }
  } catch (error) {
    console.error('Error reading connectivity config:', error);
    return NextResponse.json({ error: 'Failed to read connectivity config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const items: Item[] = await request.json();
    
    // Validate the data
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Ensure all items have required fields
    const validatedItems = items.map(item => ({
      ...item,
      quantity: 0, // Reset quantities when saving
      locked: item.locked || false,
      isActive: true
    }));

    // Try to save to database, fallback to localStorage
    try {
      const { databaseHelpers } = await import('@/lib/databaseAdapter');
      const savedItems = await databaseHelpers.updateConnectivityItems(validatedItems);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Connectivity config updated successfully',
        data: savedItems
      });
    } catch (dbError) {
      console.warn('Database not available, connectivity not saved:', dbError);
      
      return NextResponse.json({ 
        success: false, 
        message: 'Database not available - connectivity not saved',
        data: validatedItems
      });
    }
  } catch (error) {
    console.error('Error writing connectivity config to database:', error);
    return NextResponse.json({ error: 'Failed to update connectivity config' }, { status: 500 });
  }
}