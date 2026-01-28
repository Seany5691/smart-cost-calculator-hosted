# Calendar Views Comparison

## Dashboard Calendar vs Reminders Tab Advanced Calendar

### Purpose

**Dashboard Calendar (CallbackCalendar)**
- Quick overview of upcoming items
- At-a-glance view of busy days
- Click for details when needed
- Compact display for dashboard widget

**Reminders Tab Calendar (AdvancedCalendar)**
- Detailed planning and scheduling
- Full information visible without clicking
- Multiple view modes for different needs
- Dedicated calendar page with more space

---

## View Modes Comparison

### Month View

#### Dashboard Calendar
```
┌─────────────────────────────────────┐
│  January 2026                       │
│  [<] [>]                           │
├─────────────────────────────────────┤
│ Sun Mon Tue Wed Thu Fri Sat        │
│  1   2   3   4   5   6   7         │
│  •   ••      •                     │ <- Dots indicate items
│  8   9  10  11  12  13  14         │
│      •   •   ••  •                 │
│ 15  16  17  18  19  20  21         │
│  •       •   •                     │
└─────────────────────────────────────┘
```
- Dots show items exist
- Click to see details in popover
- Count badge if multiple items

#### Advanced Calendar - Month View
```
┌─────────────────────────────────────┐
│  [Month] [Week] [Day]  [Today]     │
│  January 2026                       │
├─────────────────────────────────────┤
│ Sun Mon Tue Wed Thu Fri Sat        │
│  1   2   3   4   5   6   7         │
│  •   ••      •                     │ <- Same as dashboard
│ 📅1 🔔1     📅1                    │ <- Shows counts
│  8   9  10  11  12  13  14         │
│      •   •   ••  •                 │
│     📅1 🔔1 📅2                    │
└─────────────────────────────────────┘
```
- Same grid layout as dashboard
- Additional emoji indicators
- Click to see details
- View mode buttons at top

---

### Week View (Advanced Calendar Only)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Month] [Week] [Day]  [<] [Today] [>]                          │
│  Jan 26 - Feb 1, 2026                                           │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ Sun  │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │
│  26  │  27  │  28  │  29  │  30  │  31  │   1  │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│      │      │      │      │      │      │      │
│ 📅   │ 📅   │ 🔔   │      │ 📅   │ 🔔   │      │
│ Team │ Call │ Call │      │ Meet │ Call │      │
│ Mtg  │ John │ Mary │      │ Acme │ Bob  │      │
│ 9am  │ 2pm  │ 10am │      │ 3pm  │ 11am │      │
│      │      │      │      │      │      │      │
│ 🔔   │      │ 📅   │      │      │      │      │
│ Call │      │ Demo │      │      │      │      │
│ Sue  │      │ 2pm  │      │      │      │      │
│ 3pm  │      │      │      │      │      │      │
│      │      │      │      │      │      │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

**Features:**
- 7 columns (one per day)
- Full item titles visible
- Times shown for each item
- Lead names for reminders
- Locations for events
- Scrollable if many items
- Click event to edit
- Click reminder to view lead

---

### Day View (Advanced Calendar Only)

```
┌──────────────────────────────────────────────────────────┐
│  [Month] [Week] [Day]  [<] [Today] [>]                  │
│  Wednesday, January 28, 2026                             │
│  2 events, 3 reminders                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📅 Calendar Events (2)                                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 📅 Team Meeting                    [HIGH]          │ │
│  │ Discuss Q1 goals and objectives                    │ │
│  │ 🕐 9:00 AM                                         │ │
│  │ 📍 Conference Room A                               │ │
│  │ 👤 Created by John Smith                           │ │
│  │ [Edit] [Delete]                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🗓️ Client Demo                    [MEDIUM]        │ │
│  │ Product demonstration for Acme Corp                │ │
│  │ 🕐 2:00 PM                                         │ │
│  │ 📍 Virtual - Zoom                                  │ │
│  │ [Edit] [Delete]                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  🔔 Lead Reminders (3)                                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 📞 Follow up call                  [HIGH]          │ │
│  │ 🕐 10:00 AM                                        │ │
│  │ 👤 Mary Johnson                                    │ │
│  │    Contact: Mary J.                                │ │
│  │    📍 Cape Town                                    │ │
│  │    📞 +27 21 123 4567                             │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 📧 Send proposal                   [MEDIUM]        │ │
│  │ 🕐 11:00 AM                                        │ │
│  │ 👤 Bob Williams                                    │ │
│  │    Contact: Bob W.                                 │ │
│  │    📍 Johannesburg                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Single day focus
- Full event descriptions
- Complete lead information
- All contact details
- Inline edit/delete buttons
- Separated sections
- Timeline sorted by time
- Maximum detail level

---

## Information Visibility

### Dashboard Calendar (Month View Only)
| Information | Visibility |
|------------|-----------|
| Date has items | ✅ Visible (dots) |
| Item count | ✅ Visible (badge) |
| Item type | ❌ Click to see |
| Item title | ❌ Click to see |
| Item time | ❌ Click to see |
| Lead name | ❌ Click to see |
| Location | ❌ Click to see |
| Description | ❌ Click to see |
| Edit/Delete | ❌ Click to see |

### Advanced Calendar - Month View
| Information | Visibility |
|------------|-----------|
| Date has items | ✅ Visible (dots) |
| Item count | ✅ Visible (badge + emoji) |
| Item type | ✅ Visible (emoji) |
| Item title | ❌ Click to see |
| Item time | ❌ Click to see |
| Lead name | ❌ Click to see |
| Location | ❌ Click to see |
| Description | ❌ Click to see |
| Edit/Delete | ❌ Click to see |

### Advanced Calendar - Week View
| Information | Visibility |
|------------|-----------|
| Date has items | ✅ Visible |
| Item count | ✅ Visible |
| Item type | ✅ Visible (emoji) |
| Item title | ✅ Visible |
| Item time | ✅ Visible |
| Lead name | ✅ Visible (for reminders) |
| Location | ✅ Visible (for events) |
| Description | ❌ Click to see |
| Edit/Delete | ❌ Click to see |

### Advanced Calendar - Day View
| Information | Visibility |
|------------|-----------|
| Date has items | ✅ Visible |
| Item count | ✅ Visible |
| Item type | ✅ Visible (emoji) |
| Item title | ✅ Visible |
| Item time | ✅ Visible |
| Lead name | ✅ Visible |
| Location | ✅ Visible |
| Description | ✅ Visible |
| Edit/Delete | ✅ Visible (inline buttons) |
| Contact info | ✅ Visible (phone, town) |
| Creator | ✅ Visible |
| Priority | ✅ Visible |

---

## Use Cases

### Dashboard Calendar
**Best For:**
- Quick glance at schedule
- Seeing which days are busy
- Dashboard overview widget
- Compact space requirements
- Mobile quick view

**User Actions:**
1. See busy days at a glance
2. Click day to see details
3. Navigate months
4. Add events from popover

### Advanced Calendar - Month View
**Best For:**
- Monthly planning
- Seeing patterns across month
- Identifying busy periods
- Same as dashboard but with more space

**User Actions:**
1. See monthly overview
2. Identify busy days
3. Click for details
4. Switch to Week/Day for more info

### Advanced Calendar - Week View
**Best For:**
- Weekly planning
- Seeing full week schedule
- Comparing days side-by-side
- Quick scanning of week
- No clicking needed for basic info

**User Actions:**
1. See full week at once
2. Read item titles and times
3. Click event to edit
4. Click reminder to view lead
5. Scroll within busy days

### Advanced Calendar - Day View
**Best For:**
- Daily planning
- Detailed schedule review
- Seeing all information
- Managing specific day
- Editing/deleting items

**User Actions:**
1. See complete day schedule
2. Read full descriptions
3. View all lead details
4. Edit events inline
5. Delete events inline
6. Navigate to leads

---

## Navigation

### Dashboard Calendar
```
[<] January 2026 [>]
```
- Previous/Next month only
- No view mode switching
- No "Today" button (not needed in dashboard)

### Advanced Calendar
```
[Month] [Week] [Day]  [<] [Today] [>]
```
- View mode buttons
- Previous/Next (context-aware)
- Today button (all views)
- Date range display

---

## Space Requirements

### Dashboard Calendar
- **Height**: ~400px
- **Width**: Flexible
- **Scrolling**: None (fixed grid)
- **Context**: Dashboard widget

### Advanced Calendar
- **Height**: ~600-800px
- **Width**: Full page width
- **Scrolling**: Yes (Week/Day views)
- **Context**: Dedicated page

---

## When to Use Each

### Use Dashboard Calendar When:
- ✅ Need quick overview
- ✅ Limited space available
- ✅ Dashboard context
- ✅ Mobile quick view
- ✅ Just checking if busy

### Use Advanced Calendar When:
- ✅ Planning schedule
- ✅ Need detailed information
- ✅ Comparing multiple days
- ✅ Managing specific items
- ✅ Full page available
- ✅ Desktop planning session

---

## Summary

| Feature | Dashboard | Advanced Month | Advanced Week | Advanced Day |
|---------|-----------|----------------|---------------|--------------|
| **View Mode** | Month only | Month | Week | Day |
| **Detail Level** | Low | Low | Medium | High |
| **Click Required** | Yes | Yes | Minimal | No |
| **Space Used** | Small | Medium | Large | Large |
| **Best For** | Overview | Planning | Scheduling | Details |
| **Information** | Minimal | Minimal | Moderate | Complete |
| **Actions** | Popover | Popover | Click items | Inline |
| **Scrolling** | No | No | Yes | Yes |
| **Lead Info** | Hidden | Hidden | Visible | Complete |
| **Descriptions** | Hidden | Hidden | Hidden | Visible |

Both calendars serve their purpose perfectly - dashboard for quick overview, advanced for detailed planning!
