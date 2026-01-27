# Calendar Fixes - Current Status

## ✅ COMPLETED

### 1. Date Timezone Issue - FIXED
**File:** `components/leads/AddCalendarEventModal.tsx`
**Change:** Replaced `toISOString()` with local date formatting
**Result:** Selecting 29th now creates event on 29th (not 30th)

### 2. Edit Calendar Event Modal - CREATED
**File:** `components/leads/EditCalendarEventModal.tsx` (NEW)
**Features:**
- Edit event title, description, date, time
- Change event type and priority
- Update location
- Preserves date/time correctly (no timezone issues)
- Glassmorphic styling matching Add modal

## 🚧 IN PROGRESS

### 3. Add Edit/Delete Buttons to Calendar Popover
**File:** `components/leads/dashboard/CallbackCalendar.tsx`
**Needed:**
- Import EditCalendarEventModal
- Add state for selected event and edit modal
- Add Edit and Delete buttons to each event in popover
- Add delete confirmation dialog
- Wire up edit button to open EditCalendarEventModal
- Wire up delete button to call DELETE API

### 4. Redesign Button Layout
**File:** `components/leads/dashboard/CallbackCalendar.tsx`
**Current Issues:**
- Buttons (Add Event, Share Calendar) are bright colored (blue/green)
- Dropdown is in awkward position
- Layout doesn't flow well

**Needed Changes:**
- Move calendar dropdown to top (above month/year)
- Apply glassmorphic styling to all buttons:
  - `bg-white/10` instead of `bg-blue-600`
  - `border border-emerald-500/30`
  - `hover:bg-white/20`
  - Remove bright colors
- Better spacing and alignment
- Icons with subtle styling

### 5. Add Calendar Events to Upcoming Reminders
**Files:** 
- `components/leads/dashboard/UpcomingReminders.tsx`
- `app/leads/page.tsx`

**Needed:**
- Fetch calendar events in leads page
- Pass events to UpcomingReminders component
- Display events with distinct styling (blue theme)
- Sort events and reminders together by date/time
- Show event icon, title, time, location
- No lead information (events aren't tied to leads)

### 6. Add Calendar Events to Reminders Tab
**File:** Reminders tab component
**Needed:**
- Similar to Upcoming Reminders
- Show events in chronological order with reminders
- Distinct styling for events vs reminders

## 📋 DETAILED IMPLEMENTATION PLAN

### Step 1: Complete Calendar Popover Edit/Delete

```typescript
// In CallbackCalendar.tsx

// Add imports
import EditCalendarEventModal from '@/components/leads/EditCalendarEventModal';
import { Trash2, Edit2 } from 'lucide-react';

// Add state
const [showEditEventModal, setShowEditEventModal] = useState(false);
const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

// Add delete function
const handleDeleteEvent = async (eventId: string) => {
  if (!confirm('Are you sure you want to delete this event?')) return;
  
  setDeletingEventId(eventId);
  try {
    const token = localStorage.getItem('auth-storage');
    let authToken = null;
    if (token) {
      const data = JSON.parse(token);
      authToken = data.state?.token || data.token;
    }

    const response = await fetch(`/api/calendar/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      fetchCalendarEvents(); // Refresh
      handleClosePopover();
    }
  } catch (err) {
    console.error('Error deleting event:', err);
    alert('Failed to delete event');
  } finally {
    setDeletingEventId(null);
  }
};

// In event display, add buttons:
<div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-blue-500/20">
  <button
    onClick={() => {
      setSelectedEvent(event);
      setShowEditEventModal(true);
    }}
    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-emerald-500/30 rounded-lg text-white text-sm flex items-center gap-2 transition-colors"
  >
    <Edit2 className="w-3.5 h-3.5" />
    Edit
  </button>
  <button
    onClick={() => handleDeleteEvent(event.id)}
    disabled={deletingEventId === event.id}
    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
  >
    <Trash2 className="w-3.5 h-3.5" />
    {deletingEventId === event.id ? 'Deleting...' : 'Delete'}
  </button>
</div>

// Add modal at end:
<EditCalendarEventModal
  isOpen={showEditEventModal}
  onClose={() => {
    setShowEditEventModal(false);
    setSelectedEvent(null);
  }}
  event={selectedEvent}
  onSuccess={() => {
    fetchCalendarEvents();
    handleClosePopover();
  }}
/>
```

### Step 2: Redesign Button Layout

```typescript
// New header structure:
<div className="space-y-3 mb-4">
  {/* Calendar Selector - Top */}
  {sharedCalendars.length > 0 && (
    <div className="flex justify-center">
      <select
        value={selectedCalendarUserId || ''}
        onChange={(e) => setSelectedCalendarUserId(e.target.value || null)}
        className="px-4 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 cursor-pointer hover:bg-white/15 transition-colors"
      >
        <option value="">📅 My Calendar</option>
        {sharedCalendars.map(cal => (
          <option key={cal.id} value={cal.owner_user_id}>
            📅 {cal.owner_name || cal.owner_username}'s Calendar
          </option>
        ))}
      </select>
    </div>
  )}
  
  {/* Month Navigation - Middle */}
  <div className="flex items-center justify-between">
    <button
      onClick={handlePrevMonth}
      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
    >
      <ChevronLeft className="w-5 h-5 text-emerald-300" />
    </button>
    
    <h3 className="text-lg font-semibold text-white">
      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
    </h3>
    
    <button
      onClick={handleNextMonth}
      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
    >
      <ChevronRight className="w-5 h-5 text-emerald-300" />
    </button>
  </div>
  
  {/* Action Buttons - Bottom */}
  <div className="flex items-center justify-center gap-2">
    <button
      onClick={() => setShowAddEventModal(true)}
      className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-emerald-500/30 rounded-lg text-white text-sm transition-colors flex items-center gap-2"
    >
      <Plus className="w-4 h-4" />
      <span>Add Event</span>
    </button>
    
    <button
      onClick={() => setShowShareModal(true)}
      className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-emerald-500/30 rounded-lg text-white text-sm transition-colors flex items-center gap-2"
    >
      <User className="w-4 h-4" />
      <span>Share</span>
    </button>
  </div>
</div>
```

### Step 3: Add Events to Upcoming Reminders

This requires fetching calendar events and displaying them alongside reminders with distinct styling.

## NEXT STEPS

1. Complete edit/delete buttons in popover
2. Redesign button layout with glassmorphic styling
3. Add calendar events to Upcoming Reminders card
4. Test all functionality
5. Deploy

## FILES TO MODIFY

- [ ] `components/leads/dashboard/CallbackCalendar.tsx` - Edit/delete + button redesign
- [ ] `components/leads/dashboard/UpcomingReminders.tsx` - Add events display
- [ ] `app/leads/page.tsx` - Fetch events for reminders

## ESTIMATED TIME

- Edit/Delete buttons: 15 minutes
- Button layout redesign: 20 minutes
- Events in Upcoming Reminders: 30 minutes
- Testing: 15 minutes
- **Total: ~80 minutes**
