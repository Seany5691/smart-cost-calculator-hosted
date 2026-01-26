# Route Generation Implementation

## Overview

This document describes the implementation of the route generation feature for the Lead Management system. The feature allows users to create Google Maps routes from selected leads, making it easy to plan sales visits.

## Features Implemented

### 1. Coordinate Extraction (`lib/routes.ts`)

Utility functions for extracting coordinates from Google Maps URLs:

- **`extractCoordinatesFromMapsUrl()`**: Extracts latitude and longitude from various Google Maps URL formats
  - Supports `@lat,lng,zoom` format
  - Supports `?q=lat,lng` format
  - Supports `@lat,lng` format without zoom
  - Returns `null` for invalid URLs

- **`validateCoordinates()`**: Validates that coordinates are within valid ranges
  - Latitude: -90 to 90
  - Longitude: -180 to 180

### 2. Route URL Generation

- **`generateRouteUrl()`**: Creates a Google Maps directions URL with multiple waypoints
  - Accepts array of coordinates as waypoints
  - Optional starting point (address string or coordinates)
  - Returns properly formatted Google Maps directions URL

- **`validateRouteUrl()`**: Validates that a URL is a valid Google Maps route URL

- **`calculateStopCount()`**: Calculates the total number of stops in a route

### 3. API Routes

#### GET `/api/leads/routes`
- Fetches all routes for the current user
- Supports pagination
- Returns routes sorted by creation date (newest first)

#### POST `/api/leads/routes`
- Creates a new route from selected leads
- Validates that leads have valid maps_address URLs
- Extracts coordinates from each lead's maps_address
- Generates Google Maps route URL
- Stores route with metadata (name, stop count, lead IDs, notes)
- Returns list of leads with invalid coordinates (if any)

#### GET `/api/leads/routes/[id]`
- Fetches a specific route by ID
- Only returns routes owned by the current user

#### PUT `/api/leads/routes/[id]`
- Updates route name and notes
- Route URL and waypoints cannot be modified (create new route instead)

#### DELETE `/api/leads/routes/[id]`
- Deletes a route
- Only allows deletion of routes owned by the current user

### 4. UI Components

#### `RoutesSection.tsx`
A comprehensive route management component that provides:

- **Route List**: Displays all user's routes with:
  - Route name
  - Stop count and lead count
  - Starting point indicator
  - Creation date
  - Action buttons (edit, open in Google Maps, delete)

- **Create Route Form**: Allows users to create new routes with:
  - Route name (required)
  - Starting point (optional - address or coordinates)
  - Notes (optional)
  - Preview of selected leads

- **Edit Mode**: Inline editing of route name and notes

- **Open in Google Maps**: Opens route URL in new tab

#### `BulkActions.tsx` Integration
- Added "Create Route" button to bulk actions bar
- Opens routes modal when leads are selected
- Passes selected leads to RoutesSection component

### 5. Database Schema

The `routes` table stores:
- `id`: UUID primary key
- `user_id`: Foreign key to users table
- `name`: Route name
- `route_url`: Generated Google Maps directions URL
- `stop_count`: Total number of stops
- `lead_ids`: Array of lead UUIDs
- `starting_point`: Optional starting location
- `notes`: Optional route notes
- `created_at`: Timestamp

### 6. Activity Logging

All route operations are logged to the `activity_log` table:
- `route_created`: When a new route is created
- `route_updated`: When route name/notes are updated
- `route_deleted`: When a route is deleted

## Usage Flow

1. **Select Leads**: User selects multiple leads from the leads table/cards
2. **Open Routes**: Click "Create Route" button in bulk actions bar
3. **Create Route**: 
   - Enter route name
   - Optionally add starting point
   - Optionally add notes
   - Click "Create Route"
4. **System Processing**:
   - Extracts coordinates from each lead's maps_address
   - Validates coordinates
   - Generates Google Maps route URL
   - Saves route to database
5. **View Routes**: All created routes are displayed in the routes list
6. **Open Route**: Click external link icon to open route in Google Maps
7. **Edit Route**: Click edit icon to modify name/notes
8. **Delete Route**: Click delete icon to remove route

## Error Handling

- **Invalid Coordinates**: If a lead's maps_address cannot be parsed, it's added to `invalidLeads` array in response
- **No Valid Coordinates**: If no leads have valid coordinates, returns 400 error
- **Empty Waypoints**: Route generation throws error if no waypoints provided
- **Authorization**: All routes are user-scoped; users can only access their own routes

## Testing

Comprehensive unit tests in `__tests__/lib/routes.test.ts` cover:
- Coordinate extraction from various URL formats
- Coordinate validation
- Route URL generation
- Route URL validation
- Stop count calculation

All 18 tests pass successfully.

## Requirements Validated

This implementation satisfies the following requirements:

- **Requirement 5.18**: Extract coordinates from maps_address URLs
- **Requirement 5.19**: Generate Google Maps route URLs with waypoints
- **Requirement 5.20**: Store routes with lead_ids array

## Future Enhancements

Potential improvements for future iterations:
- Route optimization (reorder waypoints for shortest path)
- Export routes to mobile navigation apps
- Route sharing between users
- Route templates for common areas
- Integration with calendar for scheduling visits
- Distance and time estimates
- Multi-day route planning
