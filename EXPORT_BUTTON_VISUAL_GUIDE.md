# Export Button - Visual Guide

## Button Location

The Export button replaces the "Manage Lists" button in the header section of each status tab.

### Before:
```
[View Toggle] [Manage Lists] [Refresh]
```

### After:
```
[View Toggle] [Export] [Refresh]
```

## Button Appearance

The Export button maintains the same visual style as the previous "Manage Lists" button:

- **Colors:** Blue to purple gradient (`from-blue-500 to-purple-600`)
- **Icon:** Download icon (⬇️)
- **Text:** "Export" (changes to "Exporting..." during export)
- **Hover Effect:** Darker gradient and enhanced shadow
- **Disabled State:** Reduced opacity when exporting

## Excel File Structure

### Columns (in order):
1. **Maps URL** - Clickable hyperlink to Google Maps
2. **Name** - Lead name
3. **Phone Number** - Contact phone
4. **Provider** - Service provider
5. **Address** - Physical address
6. **Notes** - All notes with timestamps
7. **Reminders** - All reminders with dates/times

### Column Widths:
- Maps URL: 50 characters wide
- Name: 25 characters wide
- Phone Number: 15 characters wide
- Provider: 15 characters wide
- Address: 30 characters wide
- Notes: 50 characters wide
- Reminders: 50 characters wide

## Notes Format Example
```
[2/6/2026] John Smith: Called customer, interested in quote

[2/5/2026] Jane Doe: Left voicemail
```

## Reminders Format Example
```
[2026-02-10 at 14:30] Follow up call (pending) - John Smith

[2026-02-15] Send proposal (pending) - Jane Doe
```

## File Naming Convention
```
leads-{status}-{date}.xlsx
```

Examples:
- `leads-leads-2026-02-06.xlsx`
- `leads-working-2026-02-06.xlsx`
- `leads-proposal-2026-02-06.xlsx`
- `leads-later-2026-02-06.xlsx`
- `leads-bad-2026-02-06.xlsx`
- `leads-signed-2026-02-06.xlsx`

## User Flow

1. User navigates to any status tab (Leads, Working On, Proposal, Later Stage, Bad Leads, or Signed)
2. User clicks the "Export" button
3. Button shows "Exporting..." state
4. Excel file is generated on the server
5. File automatically downloads to user's computer
6. Success toast notification appears
7. Button returns to normal "Export" state

## Error Handling

If export fails:
- Error toast notification appears with error message
- Button returns to normal "Export" state
- User can try again

Common errors:
- "No leads found for this status" - No leads to export
- "Authentication required" - User needs to log in
- "Failed to export leads" - Server error
