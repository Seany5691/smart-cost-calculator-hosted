'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-simple';
import { MapPin, ExternalLink, Trash2, Calendar, Download, Loader2, Edit2, Check, X } from 'lucide-react';

interface Route {
  id: string;
  name: string;
  lead_ids: string[];
  stop_count: number;
  google_maps_url: string;
  starting_point?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

interface Lead {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  status: string;
}

export default function RoutesPage() {
  const { token } = useAuthStore();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingRoute, setEditingRoute] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (token) {
      fetchRoutesAndLeads();
    }
  }, [token]);

  const fetchRoutesAndLeads = async () => {
    try {
      // Fetch all routes
      const routesResponse = await fetch('/api/leads/routes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!routesResponse.ok) {
        throw new Error('Failed to fetch routes');
      }
      
      const routesData = await routesResponse.json();
      const fetchedRoutes = routesData.routes || [];
      setRoutes(fetchedRoutes);

      // Fetch ALL leads without pagination (limit=10000 to get all)
      // This ensures we have all leads that might be in any route
      const leadsResponse = await fetch('/api/leads?limit=10000', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json();
        setLeads(leadsData.leads || []);
      }
    } catch (error) {
      console.error('Error fetching routes and leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameRoute = async (routeId: string) => {
    if (!editName.trim()) return;

    try {
      const response = await fetch(`/api/leads/routes/${routeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName.trim() })
      });

      if (response.ok) {
        const updatedRoute = await response.json();
        setRoutes(routes.map(r => r.id === routeId ? updatedRoute : r));
        setEditingRoute(null);
        setEditName('');
      }
    } catch (error) {
      console.error('Error renaming route:', error);
    }
  };

  const refreshData = async () => {
    await fetchRoutesAndLeads();
  };

  const startEditing = (route: Route) => {
    setEditingRoute(route.id);
    setEditName(route.name);
  };

  const cancelEditing = () => {
    setEditingRoute(null);
    setEditName('');
  };

  const handleDeleteRoute = async (routeId: string) => {
    try {
      const response = await fetch(`/api/leads/routes/${routeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setRoutes(routes.filter(r => r.id !== routeId));
        setDeleteConfirm(null);
        if (selectedRoute?.id === routeId) {
          setSelectedRoute(null);
        }
      }
    } catch (error) {
      console.error('Error deleting route:', error);
    }
  };

  const handleExportRoute = (route: Route) => {
    const routeLeads = leads.filter(lead => route.lead_ids.includes(lead.id));
    
    const csvContent = [
      ['Route Name', route.name],
      ['Created', new Date(route.created_at).toLocaleString()],
      ['Total Stops', route.stop_count.toString()],
      ['Starting Point', route.starting_point || 'N/A'],
      [''],
      ['Stop #', 'Business Name', 'Address', 'Phone', 'Status'],
      ...routeLeads.map((lead, index) => [
        (index + 1).toString(),
        lead.name,
        lead.address || '',
        lead.phone || '',
        lead.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-${route.name.replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getRouteLeads = (route: Route) => {
    return leads.filter(lead => route.lead_ids.includes(lead.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="ml-3 text-gray-300">Loading routes...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Routes</h2>
        <p className="text-gray-300">
          Manage your field visit routes and view route history
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4">
          <div className="text-sm text-gray-400 mb-1">Total Routes</div>
          <div className="text-2xl font-bold text-white">{routes.length}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-sm text-gray-400 mb-1">Total Stops</div>
          <div className="text-2xl font-bold text-white">
            {routes.reduce((sum, r) => sum + r.stop_count, 0)}
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-sm text-gray-400 mb-1">Avg Stops/Route</div>
          <div className="text-2xl font-bold text-white">
            {routes.length > 0 ? Math.round(routes.reduce((sum, r) => sum + r.stop_count, 0) / routes.length) : 0}
          </div>
        </div>
      </div>

      {/* Routes List */}
      {routes.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No routes yet</h3>
          <p className="text-gray-400 mb-4">
            Generate your first route from the Main Sheet tab
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => {
            const routeLeads = getRouteLeads(route);
            const isExpanded = selectedRoute?.id === route.id;

            return (
              <div key={route.id} className="glass-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {editingRoute === route.id ? (
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameRoute(route.id);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          autoFocus
                          className="flex-1 px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-xl font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          onClick={() => handleRenameRoute(route.id)}
                          className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                          title="Save"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          title="Cancel"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-2 group">
                        <h3 className="text-xl font-bold text-white">{route.name}</h3>
                        <button
                          onClick={() => startEditing(route)}
                          className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Rename route"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {route.stop_count} stops
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(route.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(route.google_maps_url, '_blank')}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in Maps
                    </button>
                    <button
                      onClick={() => handleExportRoute(route)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(route.id)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Route Details Toggle */}
                <button
                  onClick={() => setSelectedRoute(isExpanded ? null : route)}
                  className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                >
                  {isExpanded ? 'Hide Details' : 'Show Details'}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    {route.starting_point && (
                      <div className="mb-4">
                        <div className="text-sm text-gray-400 mb-1">Starting Point</div>
                        <div className="text-white">{route.starting_point}</div>
                      </div>
                    )}
                    {route.notes && (
                      <div className="mb-4">
                        <div className="text-sm text-gray-400 mb-1">Notes</div>
                        <div className="text-white">{route.notes}</div>
                      </div>
                    )}
                    <div className="mb-2">
                      <div className="text-sm text-gray-400 mb-2">Stops ({routeLeads.length})</div>
                      <div className="space-y-2">
                        {routeLeads.map((lead, index) => (
                          <div key={lead.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                            <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-white font-medium">{lead.name}</div>
                              {lead.address && (
                                <div className="text-sm text-gray-400">{lead.address}</div>
                              )}
                            </div>
                            {lead.phone && (
                              <div className="text-sm text-gray-400">{lead.phone}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Delete Confirmation */}
                {deleteConfirm === route.id && (
                  <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                    <p className="text-white mb-3">
                      Are you sure you want to delete this route? This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteRoute(route.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
