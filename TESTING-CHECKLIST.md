# Testing Checklist - Notes & Reminders Refactor

## Quick Test Guide

Use this checklist to verify everything is working correctly after the refactor.

---

## ✅ Visual Verification (5 minutes)

### Check All Status Pages

Visit each page and verify buttons are visible:

- [ ] **Leads Page** (`/leads/status-pages/status/leads`)
  - [ ] Note button visible on cards
  - [ ] Reminder button visible on cards
  
- [ ] **Working On Page** (`/leads/status-pages/status/working`)
  - [ ] Note button visible on cards
  - [ ] Reminder button visible on cards
  
- [ ] **Later Stage Page** (`/leads/status-pages/status/later`)
  - [ ] Note button visible on cards
  - [ ] Reminder button visible on cards
  
- [ ] **Bad Leads Page** (`/leads/status-pages/status/bad`)
  - [ ] Note button visible on cards
  - [ ] Reminder button visible on cards
  
- [ ] **Signed Page** (`/leads/status-pages/status/signed`)
  - [ ] Note button visible on cards
  - [ ] Reminder button visible on cards

---

## ✅ Functional Testing (10 minutes)

### Test Adding Notes

Pick any lead on any page:

1. [ ] Click **Note** button
2. [ ] Modal opens with gradient blue header
3. [ ] Type a test note: "Test note from refactor"
4. [ ] Click "Add Note"
5. [ ] Modal closes
6. [ ] Expand dropdown below card
7. [ ] Verify note appears in dropdown
8. [ ] Verify no "Add" button in dropdown

### Test Adding Reminders

Pick any lead on any page:

1. [ ] Click **Reminder** button
2. [ ] Modal opens with gradient purple header
3. [ ] Select reminder type (e.g., "Call")
4. [ ] Select priority (e.g., "High")
5. [ ] Pick a date (tomorrow)
6. [ ] Enter note: "Test reminder from refactor"
7. [ ] Click "Create Reminder"
8. [ ] Modal closes
9. [ ] Expand dropdown below card
10. [ ] Verify reminder appears in dropdown
11. [ ] Verify no "Add" button in dropdown

### Test Dropdown View

1. [ ] Expand dropdown on a lead with notes/reminders
2. [ ] Verify notes section shows notes (no Add button)
3. [ ] Verify reminders section shows reminders (no Add button)
4. [ ] Verify helpful message if no notes: "Use the Note button above..."
5. [ ] Verify helpful message if no reminders: "Use the Reminder button above..."
6. [ ] Check completed reminders toggle (if any completed)

---

## ✅ Mobile Testing (5 minutes)

### Responsive Design

1. [ ] Open browser dev tools
2. [ ] Switch to mobile view (iPhone/Android)
3. [ ] Visit any status page
4. [ ] Verify buttons are touch-friendly (not too small)
5. [ ] Click Note button - modal should be full-screen
6. [ ] Click Reminder button - modal should be full-screen
7. [ ] Verify modals are scrollable on small screens

---

## ✅ Edge Cases (5 minutes)

### Test Error Handling

1. [ ] Try adding empty note (should show error)
2. [ ] Try adding reminder without date (should show error)
3. [ ] Try adding reminder without note (should show error)
4. [ ] Close modal without saving (should not save)

### Test Multiple Leads

1. [ ] Add note to Lead A
2. [ ] Add note to Lead B
3. [ ] Verify each lead shows only its own notes
4. [ ] Add reminder to Lead A
5. [ ] Add reminder to Lead B
6. [ ] Verify each lead shows only its own reminders

---

## ✅ Performance Check (2 minutes)

1. [ ] Open browser console (F12)
2. [ ] Check for any errors (should be none)
3. [ ] Add a note - check network tab (should save to Supabase)
4. [ ] Add a reminder - check network tab (should save to Supabase)
5. [ ] Refresh page - verify notes/reminders persist

---

## ✅ Cross-Browser Testing (Optional)

If you have time, test in multiple browsers:

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Mobile Safari (if on iPhone)
- [ ] Mobile Chrome (if on Android)

---

## 🐛 If You Find Issues

### Common Issues and Fixes

#### Issue: Buttons not showing
- **Check**: Is LeadCard being used on that page?
- **Fix**: Verify the page imports and uses LeadCard component

#### Issue: Modal doesn't open
- **Check**: Browser console for errors
- **Fix**: Verify AddNoteModal and AddReminderModal are imported

#### Issue: Data doesn't save
- **Check**: Network tab in dev tools
- **Fix**: Verify Supabase connection and RLS policies

#### Issue: Dropdown still has Add buttons
- **Check**: Clear browser cache
- **Fix**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

---

## 📊 Expected Results

After testing, you should see:

✅ **All status pages** have Note and Reminder buttons
✅ **Modals** open smoothly with beautiful UI
✅ **Data saves** to Supabase successfully
✅ **Dropdowns** show notes/reminders (no Add buttons)
✅ **No console errors**
✅ **Mobile responsive**
✅ **Fast and smooth** user experience

---

## 🎉 Success Criteria

The refactor is successful if:

1. ✅ All 5 status pages have consistent buttons
2. ✅ Modals work on all pages
3. ✅ Dropdown is view-only (no Add buttons)
4. ✅ Data persists after page refresh
5. ✅ No TypeScript/console errors
6. ✅ Mobile experience is good
7. ✅ Users can easily add notes/reminders

---

## 📝 Notes Section

Use this space to record any issues or observations:

```
Date: ___________
Tester: ___________

Issues Found:
1. 
2. 
3. 

Observations:
- 
- 
- 

Overall Rating: ☐ Excellent  ☐ Good  ☐ Needs Work
```

---

## 🚀 Next Steps After Testing

Once testing is complete:

1. ✅ Mark all items as complete
2. 📸 Take screenshots if needed
3. 📝 Document any issues found
4. 🎯 Create tickets for any bugs
5. 🎉 Celebrate the successful refactor!

---

**Happy Testing!** 🧪✨
