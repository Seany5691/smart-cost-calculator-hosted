# Main Sheet "Move To" Feature

## Feature Added
Added a "Move To" dropdown button in the Main Sheet working area that allows users to move selected leads to any status tab without requiring route generation.

## Changes Made

### 1. New Handler Function
Added `handleMoveToStatus()` function that:
- Takes a target status as parameter ('leads', 'working', 'later', 'bad', 'signed')
- Updates all leads in the working area to the target status
- Clears the working area
- Refreshes the leads data
- Shows success message

### 2. UI Updates
- Added "Move To" dropdown button next to "Generate Route" button
- Dropdown shows all available status options:
  - Leads (Active Pipeline)
  - Working On
  - Later Stage
  - Bad Leads
  - Signed
- Button is disabled when working area is empty
- Dropdown closes automatically after selection

### 3. State Management
- Added `showMoveToDropdown` state to control dropdown visibility
- Reuses existing `routeLoading` state to prevent concurrent operations

## How It Works

1. User adds leads to the working area
2. User clicks "Move To" button
3. Dropdown appears with status options
4. User selects target status
5. All leads in working area are moved to that status
6. Working area is cleared
7. Success message is displayed

## Benefits

- **Flexibility**: Move leads without generating routes
- **Efficiency**: Bulk move multiple leads at once
- **Simplicity**: One-click operation to change lead status
- **No Route Required**: Useful when you want to organize leads without creating a route

## Files Modified
- `hosted-smart-cost-calculator/app/leads/status-pages/main-sheet.tsx`
  - Added `handleMoveToStatus()` function
  - Added `showMoveToDropdown` state
  - Added "Move To" dropdown button UI
  - Added `FolderOpen` and `ChevronDown` icon imports

## Usage Example

**Scenario**: You have 10 leads in the working area that you want to mark as "Bad Leads" without generating a route.

**Steps**:
1. Select leads and add them to working area
2. Click "Move To" button
3. Select "Bad Leads" from dropdown
4. All 10 leads are moved to Bad Leads tab
5. Working area is cleared

## Status
✅ **IMPLEMENTED** - Move To feature is now available in the Main Sheet
