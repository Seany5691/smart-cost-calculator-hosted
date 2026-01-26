# Mobile Device Testing Checklist

This checklist ensures comprehensive testing of the mobile responsive optimization across all devices and scenarios.

## Test Devices

### Physical Devices (Recommended)
- [ ] iPhone SE (320px width) - iOS Safari
- [ ] iPhone 12/13 (390px width) - iOS Safari
- [ ] iPhone 12/13 Pro Max (428px width) - iOS Safari
- [ ] iPad (768px width) - iOS Safari
- [ ] iPad Pro (1024px width) - iOS Safari
- [ ] Android Phone (Samsung Galaxy S21) - Chrome
- [ ] Android Tablet - Chrome

### Browser DevTools Emulation
- [ ] iPhone SE (320x568)
- [ ] iPhone 12 (390x844)
- [ ] iPhone 12 Pro Max (428x926)
- [ ] iPad (768x1024)
- [ ] iPad Pro (1024x1366)
- [ ] Custom: 640px (sm breakpoint)
- [ ] Custom: 768px (md breakpoint)
- [ ] Custom: 1024px (lg breakpoint)

## Viewport Testing

### Mobile Viewports (<1024px)
- [ ] 320px - Smallest modern phone
- [ ] 375px - Legacy iPhone standard
- [ ] 390px - iPhone 12/13 standard
- [ ] 414px - Legacy iPhone Plus
- [ ] 428px - iPhone Pro Max
- [ ] 768px - iPad portrait

### Desktop Viewports (≥1024px)
- [ ] 1024px - lg breakpoint (verify desktop layout)
- [ ] 1280px - xl breakpoint
- [ ] 1920px - Full HD

## Browser Testing

### iOS
- [ ] Safari (latest)
- [ ] Safari (iOS 15)
- [ ] Chrome for iOS
- [ ] Firefox for iOS

### Android
- [ ] Chrome (latest)
- [ ] Samsung Internet
- [ ] Firefox for Android

### Desktop (Baseline)
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (macOS)
- [ ] Edge (latest)

## Page-by-Page Testing

### Login Page
- [ ] Form fields are touch-friendly (44x44px minimum)
- [ ] Inputs are properly sized (h-12)
- [ ] No horizontal overflow
- [ ] Logo and branding visible
- [ ] Submit button is large and accessible
- [ ] Error messages display correctly

### Dashboard
- [ ] Stat cards display in single/double column
- [ ] Quick actions grid is touch-friendly
- [ ] Activity timeline is readable
- [ ] Business lookup works on mobile
- [ ] Upcoming reminders display correctly
- [ ] Callback calendar is usable
- [ ] No horizontal overflow
- [ ] All widgets are accessible

### Leads Management
- [ ] Leads display as cards on mobile
- [ ] Table is hidden on mobile
- [ ] Action buttons are touch-friendly
- [ ] Bulk actions work (dropdown/bottom sheet)
- [ ] Filters are accessible (collapsible panel)
- [ ] Lead details modal is full-screen
- [ ] Edit modal has vertical form layout
- [ ] Notes and reminders are accessible
- [ ] Search and sorting work
- [ ] Pagination is usable
- [ ] No horizontal overflow

### Calculator
- [ ] Wizard navigation works on mobile
- [ ] Step indicator is visible
- [ ] All form fields are stacked vertically
- [ ] Inputs are touch-friendly (h-12)
- [ ] Dropdowns are usable
- [ ] Quantity controls are large enough
- [ ] Navigation buttons are accessible
- [ ] Total costs sections are collapsible
- [ ] Settlement comparison is stacked
- [ ] Proposal modal is full-screen
- [ ] PDF generation works
- [ ] No horizontal overflow

### Scraper
- [ ] Controls are stacked vertically
- [ ] Buttons are touch-friendly
- [ ] Results table scrolls horizontally OR displays as cards
- [ ] Progress indicators are visible
- [ ] Session manager works (bottom sheet)
- [ ] Log viewer is full-screen
- [ ] Export options are accessible
- [ ] Statistics display correctly
- [ ] No unintended horizontal overflow

### Admin Panel
- [ ] User list displays as cards on mobile
- [ ] Config tables scroll horizontally OR display as cards
- [ ] Edit modals are full-screen
- [ ] Form fields are stacked vertically
- [ ] Scales/factors config is collapsible
- [ ] All CRUD operations work
- [ ] No horizontal overflow

## Navigation Testing

### Top Navigation
- [ ] Hamburger menu icon visible on mobile
- [ ] Logo is visible and properly sized
- [ ] Desktop nav links hidden on mobile
- [ ] Hamburger menu opens mobile menu
- [ ] Mobile menu displays full-screen or slide-out
- [ ] Navigation links are touch-friendly
- [ ] Active section is highlighted
- [ ] Close button/overlay works
- [ ] Menu closes after navigation
- [ ] Breadcrumbs are condensed or hidden

## Modal Testing

### All Modals
- [ ] Display full-screen or nearly full-screen on mobile
- [ ] Content is scrollable
- [ ] Action buttons are at bottom
- [ ] Close button is visible and accessible
- [ ] Forms are stacked vertically
- [ ] Tables scroll horizontally or use alternative layout
- [ ] No content is cut off
- [ ] Backdrop overlay works
- [ ] Swipe-to-dismiss works (if implemented)

### Specific Modals to Test
- [ ] Edit Lead Modal
- [ ] Lead Details Modal
- [ ] Add Note Modal
- [ ] Add Reminder Modal
- [ ] Proposal Modal
- [ ] Scraper Session Modal
- [ ] User Edit Modal
- [ ] Config Edit Modals

## Form Testing

### All Forms
- [ ] Fields are stacked vertically on mobile
- [ ] Inputs are at least 44px tall
- [ ] Dropdowns have touch-friendly options
- [ ] Date pickers use native mobile inputs
- [ ] Error messages display below fields
- [ ] Submit buttons are large and clear
- [ ] Form validation works
- [ ] Keyboard appears correctly
- [ ] Focus states are visible
- [ ] No horizontal overflow

## Table Testing

### All Tables
- [ ] Horizontal scroll works where intended
- [ ] Scroll indicators are visible
- [ ] Headers remain visible during scroll
- [ ] Row actions are accessible
- [ ] Card layout alternative works (if implemented)
- [ ] Most important columns are prioritized
- [ ] No unintended horizontal overflow

## Button and Action Testing

### All Interactive Elements
- [ ] Buttons are at least 44x44px
- [ ] Adequate spacing between buttons (8px minimum)
- [ ] Icon buttons are large enough
- [ ] Bulk actions use dropdown/bottom sheet
- [ ] Quick actions are in touch-friendly grid
- [ ] Long button text wraps or truncates
- [ ] All buttons are tappable with thumb
- [ ] Touch feedback is visible (active states)

## Touch Interaction Testing

### Touch Events
- [ ] All clickable elements respond to touch
- [ ] Visual feedback on touch (active states)
- [ ] No double-tap zoom on buttons/inputs
- [ ] Swipe gestures work (if implemented)
- [ ] Long-press actions work (if implemented)
- [ ] Scrolling is smooth (momentum scrolling)
- [ ] Touch-action CSS is applied correctly

### Gestures
- [ ] Swipe to dismiss modals (if implemented)
- [ ] Pull to refresh (if implemented)
- [ ] Pinch to zoom disabled on UI elements
- [ ] Horizontal swipe for navigation (if implemented)

## Visual Design Testing

### Glassmorphism
- [ ] Backdrop blur renders correctly on mobile
- [ ] Transparency effects work
- [ ] Performance is acceptable
- [ ] No visual glitches

### Typography
- [ ] Body text is at least 14px
- [ ] Headings scale appropriately
- [ ] Text is readable on small screens
- [ ] Line height is comfortable
- [ ] No text overflow issues

### Spacing
- [ ] Padding follows consistent scale
- [ ] Margins are appropriate
- [ ] Touch targets have adequate spacing
- [ ] Visual rhythm is maintained
- [ ] No cramped layouts

### Colors
- [ ] Colors match desktop
- [ ] No color variations
- [ ] Contrast is sufficient
- [ ] Dark mode works (if implemented)

## Performance Testing

### Load Performance
- [ ] Pages load within 3 seconds on 4G
- [ ] First Contentful Paint < 2 seconds
- [ ] Largest Contentful Paint < 2.5 seconds
- [ ] Time to Interactive < 3 seconds
- [ ] No blocking resources

### Runtime Performance
- [ ] Scrolling is smooth (60fps)
- [ ] Animations are smooth
- [ ] No jank or stuttering
- [ ] Touch response is immediate
- [ ] No memory leaks

### Layout Stability
- [ ] Cumulative Layout Shift < 0.1
- [ ] No layout shifts during load
- [ ] Images have explicit dimensions
- [ ] Dynamic content has reserved space

### Optimization
- [ ] Images are appropriately sized
- [ ] Lazy loading works
- [ ] Code splitting is effective
- [ ] CSS is optimized
- [ ] JavaScript is minified

## Content Visibility Testing

### All Pages
- [ ] No content is cut off
- [ ] All content is accessible
- [ ] Scrolling reveals all content
- [ ] No hidden overflow issues
- [ ] Modals display all content
- [ ] Forms show all fields

## Accessibility Testing

### Mobile Accessibility
- [ ] Touch targets meet WCAG guidelines (44x44px)
- [ ] Color contrast is sufficient
- [ ] Text is resizable
- [ ] Focus indicators are visible
- [ ] Screen reader support works
- [ ] Keyboard navigation works (external keyboard)
- [ ] ARIA labels are present
- [ ] Semantic HTML is used

## Orientation Testing

### Portrait Mode
- [ ] All pages work in portrait
- [ ] Layouts are optimized
- [ ] No horizontal overflow

### Landscape Mode
- [ ] All pages work in landscape
- [ ] Layouts adapt appropriately
- [ ] Content is accessible

## Network Condition Testing

### Connection Types
- [ ] 4G connection (fast)
- [ ] 3G connection (slow)
- [ ] Slow 3G (very slow)
- [ ] Offline mode (if implemented)

### Network Scenarios
- [ ] Slow loading states display
- [ ] Error states display correctly
- [ ] Retry mechanisms work
- [ ] Cached content loads

## Edge Cases

### Content Edge Cases
- [ ] Very long text (truncation/wrapping)
- [ ] Empty states display correctly
- [ ] Loading states are visible
- [ ] Error states are clear
- [ ] No data scenarios work

### Interaction Edge Cases
- [ ] Rapid tapping doesn't break UI
- [ ] Multiple modals don't stack incorrectly
- [ ] Form submission prevents double-submit
- [ ] Navigation during loading works
- [ ] Back button works correctly

## Regression Testing

### Desktop Preservation
- [ ] Desktop layout unchanged at ≥1024px
- [ ] All desktop features work
- [ ] No mobile styles leak to desktop
- [ ] Performance is maintained

### Existing Functionality
- [ ] All features work on mobile
- [ ] No functionality is lost
- [ ] Data integrity is maintained
- [ ] API calls work correctly

## Final Verification

### Comprehensive Check
- [ ] All requirements are met
- [ ] All acceptance criteria pass
- [ ] All property tests pass
- [ ] All unit tests pass
- [ ] Visual regression tests pass
- [ ] Performance tests pass
- [ ] Manual testing complete
- [ ] Documentation is updated
- [ ] Stakeholder approval obtained

## Testing Tools

### Automated Testing
- [ ] Jest unit tests pass
- [ ] Property-based tests pass
- [ ] Lighthouse CI passes (score ≥90)
- [ ] Percy/Chromatic visual tests pass

### Manual Testing Tools
- [ ] Chrome DevTools Device Mode
- [ ] Firefox Responsive Design Mode
- [ ] Safari Responsive Design Mode
- [ ] BrowserStack (optional)
- [ ] Real devices

## Notes

- Test on real devices whenever possible
- Use browser DevTools for quick iteration
- Document any issues found
- Take screenshots of problems
- Record videos for complex interactions
- Test with different user roles
- Test with different data scenarios
- Test with slow network conditions
- Test with different system settings (font size, zoom)
- Test accessibility with screen readers

## Sign-off

- [ ] Developer testing complete
- [ ] QA testing complete
- [ ] Stakeholder review complete
- [ ] Ready for production deployment
