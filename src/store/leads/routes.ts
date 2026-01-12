import { create } from 'zustand';
import { Route, RouteFormData, Lead, Coordinates } from '@/lib/leads/types';
import { useAuthStore } from '@/store/auth';
import { getLeadsAdapter } from '@/lib/leads/leadsAdapter';
import { extractCoordinatesFromUrl } from '@/lib/leads/validation';

interface RoutesState {
  routes: Route[];
  isLoading: boolean;
  error: string | null;
  realtimeSubscription: any;
  
  // Actions
  fetchRoutes: () => Promise<void>;
  createRoute: (routeData: RouteFormData) => Promise<Route>;
  deleteRoute: (routeId: string) => Promise<void>;
  generateRouteFromLeads: (leads: Lead[], startingPoint?: string) => Promise<Route>;
  extractCoordinatesFromUrl: (mapsUrl: string) => Coordinates | null;
  generateGoogleMapsUrl: (coordinates: Coordinates[]) => string;
  isValidCoordinate: (coordinates: Coordinates) => boolean;
  getRouteStats: () => { total: number; totalStops: number; avgStops: number };
  subscribeToRoutes: () => void;
  unsubscribeFromRoutes: () => void;
}

export const useRoutesStore = create<RoutesState>((set, get) => ({
  routes: [],
  isLoading: false,
  error: null,
  realtimeSubscription: null,

  // Fetch all routes for the current user
  fetchRoutes: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const routes = await getLeadsAdapter().getRoutes(user.id);
      
      set({ 
        routes, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch routes', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Create a new route
  createRoute: async (routeData: RouteFormData) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate lead IDs
      if (!routeData.lead_ids || routeData.lead_ids.length === 0) {
        throw new Error('At least one lead is required to create a route');
      }

      const newRoute: Partial<Route> = {
        name: routeData.name,
        route_url: '',
        stop_count: routeData.lead_ids.length,
        lead_ids: routeData.lead_ids,
      };

      // Create in PostgreSQL
      const createdRoute = await getLeadsAdapter().createRoute(user.id, newRoute);

      // Add to local state
      set({ 
        routes: [createdRoute, ...get().routes], 
        isLoading: false 
      });

      return createdRoute;
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to create route', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Delete a route
  deleteRoute: async (routeId: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Delete from PostgreSQL
      await getLeadsAdapter().deleteRoute(user.id, routeId);

      // Remove from local state
      const currentRoutes = get().routes;
      const updatedRoutes = currentRoutes.filter(route => route.id !== routeId);
      
      set({ 
        routes: updatedRoutes, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to delete route', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Generate a route from selected leads
  generateRouteFromLeads: async (leads: Lead[], startingPoint?: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate leads
      if (!leads || leads.length === 0) {
        throw new Error('At least one lead is required to generate a route');
      }

      if (leads.length > 25) {
        throw new Error('Google Maps supports a maximum of 25 waypoints. Please use Google My Maps for larger routes.');
      }

      // Extract coordinates from each lead with detailed validation
      const coordinates: Coordinates[] = [];
      const leadIds: string[] = [];
      const failedLeads: string[] = [];

      // If starting point is provided, add it first
      if (startingPoint) {
        const startCoords = get().extractCoordinatesFromUrl(startingPoint);
        if (startCoords && get().isValidCoordinate(startCoords)) {
          coordinates.push(startCoords);
        } else {
          // If not a valid URL, we'll encode it as an address in the URL later
          console.log('Starting point will be treated as an address:', startingPoint);
        }
      }

      for (const lead of leads) {
        let coords: Coordinates | null = null;
        
        // Try to extract coordinates from maps_address URL
        if (lead.maps_address) {
          coords = get().extractCoordinatesFromUrl(lead.maps_address);
        }
        
        // Fallback to stored coordinates if URL extraction fails
        if (!coords && lead.coordinates) {
          coords = lead.coordinates;
        }
        
        // Validate coordinates
        if (coords && get().isValidCoordinate(coords)) {
          coordinates.push(coords);
          leadIds.push(lead.id);
        } else {
          failedLeads.push(lead.name);
          console.warn(`Could not extract valid coordinates for lead: ${lead.name}`);
        }
      }

      // The stop count should be the number of leads (not including starting point)
      const leadCoordinatesCount = leadIds.length;
      if (leadCoordinatesCount === 0) {
        throw new Error(
          'No valid coordinates found in the selected leads. ' +
          'Please ensure all leads have valid Google Maps URLs.'
        );
      }

      // Warn about failed leads
      if (failedLeads.length > 0) {
        console.warn(
          `Warning: ${failedLeads.length} lead(s) skipped due to invalid coordinates: ${failedLeads.join(', ')}`
        );
      }

      // Generate Google Maps URL
      let routeUrl: string;
      if (startingPoint && !get().extractCoordinatesFromUrl(startingPoint)) {
        // Starting point is an address, not coordinates
        const encodedStart = encodeURIComponent(startingPoint);
        const leadCoords = coordinates.map(c => `${c.lat},${c.lng}`).join('/');
        routeUrl = `https://www.google.com/maps/dir/${encodedStart}/${leadCoords}`;
      } else {
        routeUrl = get().generateGoogleMapsUrl(coordinates);
      }

      // Get the list name from the first lead (all leads in working area should have same list)
      const listName = leads[0]?.list_name;
      
      // Fetch existing routes to count
      const existingRoutes = await getLeadsAdapter().getRoutes(user.id);
      
      // Create route name with list name and timestamp
      let routeName: string;
      if (listName) {
        // Count existing routes for this list
        const listRoutes = existingRoutes.filter(r => r.name.startsWith(listName));
        const listRouteNumber = listRoutes.length + 1;
        routeName = `${listName} Route ${listRouteNumber}`;
      } else {
        // Fallback to old naming if no list name
        const routeNumber = existingRoutes.length + 1;
        const date = new Date();
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        routeName = `Route #${routeNumber} - ${dateStr} (${leadCoordinatesCount} stops)`;
      }

      // Create the route
      const newRoute: Partial<Route> = {
        name: routeName,
        route_url: routeUrl,
        stop_count: leadCoordinatesCount,
        lead_ids: leadIds,
        starting_point: startingPoint,
      };

      // Create in PostgreSQL
      const createdRoute = await getLeadsAdapter().createRoute(user.id, newRoute);

      // Add to local state
      set({ 
        routes: [createdRoute, ...get().routes], 
        isLoading: false 
      });

      return createdRoute;
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to generate route', 
        isLoading: false 
      });
      throw error;
    }
  },

  // Validate coordinate values
  isValidCoordinate: (coordinates: Coordinates): boolean => {
    const { lat, lng } = coordinates;
    
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  },

  // Extract coordinates from Google Maps URL
  extractCoordinatesFromUrl: (mapsUrl: string): Coordinates | null => {
    if (!mapsUrl) return null;

    try {
      return extractCoordinatesFromUrl(mapsUrl);
    } catch (error) {
      console.error('Error extracting coordinates:', error);
      return null;
    }
  },

  // Generate Google Maps URL with multiple waypoints
  generateGoogleMapsUrl: (coordinates: Coordinates[]): string => {
    if (coordinates.length === 0) {
      throw new Error('No coordinates provided');
    }

    if (coordinates.length === 1) {
      // Single location - simple maps URL
      const { lat, lng } = coordinates[0];
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }

    // Multiple locations - directions with waypoints
    const origin = coordinates[0];
    const destination = coordinates[coordinates.length - 1];
    const waypoints = coordinates.slice(1, -1);

    let url = `https://www.google.com/maps/dir/?api=1`;
    url += `&origin=${origin.lat},${origin.lng}`;
    url += `&destination=${destination.lat},${destination.lng}`;

    if (waypoints.length > 0) {
      const waypointsStr = waypoints
        .map(coord => `${coord.lat},${coord.lng}`)
        .join('|');
      url += `&waypoints=${waypointsStr}`;
    }

    // Add travel mode (driving by default)
    url += `&travelmode=driving`;

    return url;
  },

  // Get route statistics
  getRouteStats: () => {
    const routes = get().routes;
    
    if (routes.length === 0) {
      return {
        total: 0,
        totalStops: 0,
        avgStops: 0
      };
    }

    const totalStops = routes.reduce((sum, route) => sum + route.stop_count, 0);
    const avgStops = totalStops / routes.length;

    return {
      total: routes.length,
      totalStops,
      avgStops: Math.round(avgStops * 10) / 10 // Round to 1 decimal
    };
  },

  // Subscribe to real-time route updates (no-op for localStorage)
  subscribeToRoutes: () => {
    // No-op for localStorage implementation
  },

  // Unsubscribe from real-time updates (no-op for localStorage)
  unsubscribeFromRoutes: () => {
    // No-op for localStorage implementation
  }
}));

// Convenience selectors
export const useRoutes = () => useRoutesStore((state) => state.routes);
export const useRoutesLoading = () => useRoutesStore((state) => state.isLoading);
export const useRoutesError = () => useRoutesStore((state) => state.error);
export const useRouteStats = () => useRoutesStore((state) => state.getRouteStats());
