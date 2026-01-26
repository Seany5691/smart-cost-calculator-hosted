'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, ExternalLink, Edit2, X, Check } from 'lucide-react';

interface Route {
  id: string;
  name: string;
  google_maps_url: string;
  stop_count: number;
  lead_ids: string[];
  starting_point?: string;
  notes?: string;
  created_at: string;
}

interface Lead {
  id: string;
  name: string;
  address: string;
  maps_address?: string;
}

interface RoutesSectionProps {
  selectedLeads?: Lead[];
  onClose?: () => void;
}

export default function RoutesSection({ selectedLeads = [], onClose }: RoutesSectionProps) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  
  // Form state
  const [routeName, setRouteName] = useState('');
  const [startingPoint, setStartingPoint] = useState('');
  const [routeNotes, setRouteNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leads/routes');
      if (response.ok) {
        const data = await response.json();
        setRoutes(data.routes || []);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!routeName.trim()) {
      setError('Route name is required');
      return;
    }

    if (selectedLeads.length === 0) {
      setError('Please select at least one lead to create a route');
      return;
    }

    try {
      const response = await fetch('/api/leads/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routeName,
          leadIds: selectedLeads.map(l => l.id),
          startingPoint: startingPoint || undefined,
          notes: routeNotes || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create route');
        return;
      }

      setSuccess('Route created successfully!');
      setRouteName('');
      setStartingPoint('');
      setRouteNotes('');
      setShowCreateForm(false);
      fetchRoutes();

      if (data.invalidLeads && data.invalidLeads.length > 0) {
        setError(`Warning: Could not extract coordinates for: ${data.invalidLeads.join(', ')}`);
      }
    } catch (error) {
      console.error('Error creating route:', error);
      setError('Failed to create route');
    }
  };

  const handleUpdateRoute = async (routeId: string) => {
    if (!editingRoute) return;

    try {
      const response = await fetch(`/api/leads/routes/${routeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingRoute.name,
          notes: editingRoute.notes
        })
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update route');
        return;
      }

      setSuccess('Route updated successfully!');
      setEditingRoute(null);
      fetchRoutes();
    } catch (error) {
      console.error('Error updating route:', error);
      setError('Failed to update route');
    }
  };

  const handleDeleteRoute = async (routeId: string, routeName: string) => {
    if (!window.confirm(`Are you sure you want to delete the route "${routeName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/leads/routes/${routeId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete route');
        return;
      }

      setSuccess('Route deleted successfully!');
      fetchRoutes();
    } catch (error) {
      console.error('Error deleting route:', error);
      setError('Failed to delete route');
    }
  };

  const openRoute = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Routes</h3>
        </div>
        <div className="flex items-center gap-2">
          {selectedLeads.length > 0 && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Route ({selectedLeads.length} leads)
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Create Route Form */}
      {showCreateForm && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium mb-3">Create New Route</h4>
          <form onSubmit={handleCreateRoute} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route Name *
              </label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Morning Route - Johannesburg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Starting Point (optional)
              </label>
              <input
                type="text"
                value={startingPoint}
                onChange={(e) => setStartingPoint(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Office address or coordinates"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter an address or paste a Google Maps URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={routeNotes}
                onChange={(e) => setRouteNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Add any notes about this route..."
              />
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <p className="font-medium mb-1">Selected Leads:</p>
              <ul className="list-disc list-inside space-y-1">
                {selectedLeads.slice(0, 5).map(lead => (
                  <li key={lead.id}>{lead.name} - {lead.address}</li>
                ))}
                {selectedLeads.length > 5 && (
                  <li>... and {selectedLeads.length - 5} more</li>
                )}
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Create Route
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setRouteName('');
                  setStartingPoint('');
                  setRouteNotes('');
                  setError('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Routes List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading routes...</div>
      ) : routes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No routes created yet</p>
          {selectedLeads.length > 0 && (
            <p className="text-sm mt-1">Select leads and click "Create Route" to get started</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => (
            <div
              key={route.id}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              {editingRoute?.id === route.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editingRoute.name}
                    onChange={(e) => setEditingRoute({ ...editingRoute, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    value={editingRoute.notes || ''}
                    onChange={(e) => setEditingRoute({ ...editingRoute, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Notes..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateRoute(route.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingRoute(null)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{route.name}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>{route.stop_count} stops</span>
                        <span>{route.lead_ids.length} leads</span>
                        {route.starting_point && (
                          <span className="text-blue-600">Starting point set</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingRoute(route)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit route"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => openRoute(route.google_maps_url)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Open in Google Maps"
                      >
                        <ExternalLink className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoute(route.id, route.name)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete route"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {route.notes && (
                    <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                      {route.notes}
                    </p>
                  )}

                  <div className="mt-2 text-xs text-gray-500">
                    Created {new Date(route.created_at).toLocaleDateString()}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
