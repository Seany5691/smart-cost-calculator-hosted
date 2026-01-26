# Mobile Utilities and Components Implementation

## Overview

This document describes the global mobile utility classes and components created for the mobile responsive optimization of the VPS-hosted Docker application. These utilities and components provide the foundation for mobile-friendly interactions across all pages.

**Task Completed**: Task 2 - Create global mobile utility classes and components
**Date**: 2024
**Requirements Addressed**: 6.1, 6.2, 6.3, 6.4, 8.2, 9.1, 9.2, 10.1, 10.3, 13.3, 13.4, 3.5

---

## 1. Mobile Utility Classes (globals.css)

### Touch Target Utilities

Ensures all interactive elements meet the minimum 44x44px touch target size for comfortable mobile interaction.

```css
.min-touch-44 {
  min-width: 44px;
  min-height: 44px;
}

.min-touch-48 {
  min-width: 48px;
  min-height: 48px;
}
```

**Usage**:
```tsx
<button className="min-touch-44">Click me</button>
```

### Mobile Spacing Utilities

Provides consistent vertical spacing for mobile layouts.

```css
.mobile-spacing-sm { @apply space-y-3; }
.mobile-spacing-md { @apply space-y-4; }
.mobile-spacing-lg { @apply space-y-6; }
```

**Usage**:
```tsx
<div className="mobile-spacing-md">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### Mobile Typography Utilities

Ensures readable font sizes on mobile while maintaining desktop sizes.

```css
.mobile-text-base { @apply text-base lg:text-sm; }
.mobile-text-lg { @apply text-lg lg:text-base; }
.mobile-heading { @apply text-2xl lg:text-xl; }
```

**Usage**:
```tsx
<p className="mobile-text-base">Body text</p>
<h2 className="mobile-heading">Heading</h2>
```

### Scroll Container with Indicators

Creates horizontally scrollable containers with visual scroll indicators (shadow gradients).

```css
.scrollable-container {
  @apply overflow-x-auto lg:overflow-x-visible;
  @apply -mx-4 px-4 lg:mx-0 lg:px-0;
  @apply scroll-smooth;
  /* Shadow gradients added via ::before and ::after */
}
```

**Usage**:
```tsx
<div className="scrollable-container">
  <table>...</table>
</div>
```

### Touch Interaction Utilities

Provides smooth touch feedback and prevents unwanted behaviors.

```css
.momentum-scroll {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

.no-tap-zoom {
  touch-action: manipulation;
}

.touch-feedback {
  @apply active:scale-95 transition-transform duration-100;
}

.touch-feedback-subtle {
  @apply active:opacity-80 transition-opacity duration-100;
}
```

**Usage**:
```tsx
<button className="no-tap-zoom touch-feedback">Button</button>
<div className="momentum-scroll overflow-y-auto">...</div>
```

---

## 2. Mobile Components

### 2.1 MobileMenu Component

**Location**: `components/ui/MobileMenu.tsx`

A slide-out navigation drawer for mobile devices with hamburger menu integration.

**Features**:
- Slide-in animation from left
- Backdrop overlay with click-to-close
- Active route highlighting
- Keyboard navigation (Escape to close)
- Body scroll prevention when open
- Touch-friendly link sizing (44px height)

**Props**:
```typescript
interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath?: string;
}
```

**Usage**:
```tsx
import MobileMenu from '@/components/ui/MobileMenu';

function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <button onClick={() => setMenuOpen(true)}>
        <Menu className="w-6 h-6" />
      </button>
      
      <MobileMenu 
        isOpen={menuOpen} 
        onClose={() => setMenuOpen(false)} 
      />
    </>
  );
}
```

**Navigation Links**:
- Dashboard
- Leads
- Calculator
- Scraper
- Admin

**Styling**:
- Width: 256px (16rem)
- Background: Dark glassmorphism
- Active state: Purple/pink gradient background
- Z-index: 50 (drawer), 40 (overlay)

---

### 2.2 ScrollableTable Component

**Location**: `components/ui/ScrollableTable.tsx`

A wrapper component that makes tables horizontally scrollable on mobile with visual scroll indicators.

**Features**:
- Horizontal scroll on mobile, normal display on desktop
- Dynamic shadow indicators (left/right) based on scroll position
- Scroll hint text for users
- Smooth momentum scrolling
- Responsive minimum width

**Props**:
```typescript
interface ScrollableTableProps {
  children: ReactNode;
  minWidth?: string;      // Default: '800px'
  className?: string;
}
```

**Usage**:
```tsx
import ScrollableTable from '@/components/ui/ScrollableTable';

function DataTable() {
  return (
    <ScrollableTable minWidth="900px">
      <table className="w-full">
        <thead>...</thead>
        <tbody>...</tbody>
      </table>
    </ScrollableTable>
  );
}
```

**Behavior**:
- **Mobile (<1024px)**: Horizontal scroll with shadow indicators
- **Desktop (≥1024px)**: Normal table display, no scroll
- **Indicators**: Fade in/out based on scroll position
- **Hint**: "← Scroll horizontally to see more →" appears when scrollable

---

### 2.3 BottomSheet Component

**Location**: `components/ui/BottomSheet.tsx`

A mobile-optimized bottom sheet for displaying actions, menus, or content that slides up from the bottom.

**Features**:
- Slide-up animation from bottom
- Swipe-to-dismiss gesture (swipe down >100px)
- Backdrop overlay with click-to-close
- Drag handle indicator
- Keyboard navigation (Escape to close)
- Body scroll prevention when open
- Maximum height: 85vh
- Scrollable content area

**Props**:
```typescript
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}
```

**Usage**:
```tsx
import BottomSheet from '@/components/ui/BottomSheet';

function ActionsMenu() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <button onClick={() => setSheetOpen(true)}>
        Show Actions
      </button>
      
      <BottomSheet 
        isOpen={sheetOpen} 
        onClose={() => setSheetOpen(false)}
        title="Actions"
      >
        <div className="space-y-3">
          <button className="w-full min-h-[44px]">Action 1</button>
          <button className="w-full min-h-[44px]">Action 2</button>
        </div>
      </BottomSheet>
    </>
  );
}
```

**Styling**:
- Background: Glassmorphism card
- Border radius: Rounded top (24px)
- Drag handle: 48px wide, 6px tall, white/30 opacity
- Z-index: 50 (sheet), 40 (overlay)

---

## 3. Enhanced Button and Form Styles

### Button Classes

All button classes now include mobile optimizations:

```css
.btn {
  /* Mobile: h-12 (48px), text-base (16px) */
  /* Desktop: h-10 (40px), text-sm (14px) */
  @apply sm:h-12 sm:px-6 sm:text-base lg:h-10 lg:px-4 lg:text-sm;
  @apply no-tap-zoom touch-feedback;
}

.btn-icon {
  /* Mobile: 44x44px */
  /* Desktop: 32x32px */
  @apply sm:w-11 sm:h-11 lg:w-8 lg:h-8;
}
```

**Available Button Variants**:
- `.btn-primary` - Purple/pink gradient
- `.btn-scraper-primary` - Teal/cyan gradient
- `.btn-secondary` - White/10 background
- `.btn-success` - Green/emerald gradient
- `.btn-danger` - Red/rose gradient
- `.btn-warning` - Amber/orange gradient
- `.btn-info` - Sky/blue gradient

### Form Input Classes

```css
.input {
  /* Mobile: h-12 (48px), text-base (16px) */
  /* Desktop: h-10 (40px), text-sm (14px) */
  @apply sm:h-12 sm:text-base lg:h-10 lg:text-sm;
  @apply no-tap-zoom;
}

.label {
  @apply sm:text-base lg:text-sm;
}
```

### Select/Dropdown Styles

Global select elements are now mobile-optimized:

```css
select {
  height: 3rem;        /* 48px for mobile */
  font-size: 1rem;     /* 16px for mobile */
  touch-action: manipulation;
}

@media (min-width: 1024px) {
  select {
    height: 2.5rem;    /* 40px for desktop */
    font-size: 0.875rem; /* 14px for desktop */
  }
}
```

---

## 4. Implementation Guidelines

### When to Use Each Component

**MobileMenu**:
- Use for main navigation on mobile devices
- Integrate with TopNavigation component
- Show/hide based on viewport width (<1024px)

**ScrollableTable**:
- Wrap any data table that has many columns
- Use when table cannot be simplified to card layout
- Minimum width should be set based on table content

**BottomSheet**:
- Use for bulk actions on mobile
- Use for filter panels on mobile
- Use for action menus with multiple options
- Use for export/import options

### Responsive Breakpoints

All utilities and components follow these breakpoints:

- **Mobile**: <640px (xs)
- **Tablet**: 640px-768px (sm)
- **Tablet Large**: 768px-1024px (md)
- **Desktop**: ≥1024px (lg)

### Touch Target Guidelines

All interactive elements should meet minimum touch target sizes:

- **Buttons**: 44x44px minimum (48x48px preferred)
- **Icon buttons**: 44x44px minimum
- **Links**: 44px height minimum
- **Form inputs**: 48px height on mobile
- **Dropdown options**: 44px height minimum

### Accessibility Considerations

All components include:

- **ARIA labels**: Proper labeling for screen readers
- **Keyboard navigation**: Escape key to close modals/sheets
- **Focus management**: Proper focus trapping in modals
- **Role attributes**: Correct ARIA roles (dialog, region, etc.)
- **Touch-action**: Prevents unwanted zoom behaviors

---

## 5. Testing Recommendations

### Manual Testing

Test on these viewport widths:
- 320px (iPhone SE)
- 375px (iPhone standard)
- 414px (iPhone Plus)
- 768px (iPad)
- 1024px (Desktop breakpoint)

### Component Testing

```typescript
// Example test for MobileMenu
describe('MobileMenu', () => {
  it('should open and close correctly', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <MobileMenu isOpen={true} onClose={onClose} />
    );
    
    const closeButton = getByLabelText('Close menu');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});
```

### Touch Target Testing

```typescript
// Verify all buttons meet minimum size
const buttons = container.querySelectorAll('button');
buttons.forEach(button => {
  const rect = button.getBoundingClientRect();
  expect(rect.width).toBeGreaterThanOrEqual(44);
  expect(rect.height).toBeGreaterThanOrEqual(44);
});
```

---

## 6. Next Steps

With these utilities and components in place, the next tasks are:

1. **Task 4**: Optimize Leads Management for mobile
   - Update LeadsTable with mobile card view
   - Apply mobile utilities to modals and forms

2. **Task 6**: Optimize Calculator for mobile
   - Update wizard steps with mobile layouts
   - Apply touch-friendly controls

3. **Task 8**: Optimize Scraper for mobile
   - Wrap ResultsTable in ScrollableTable
   - Use BottomSheet for actions

4. **Task 10**: Optimize Dashboard for mobile
   - Apply responsive grid layouts
   - Use mobile spacing utilities

5. **Task 12**: Optimize Admin Panel for mobile
   - Wrap config tables in ScrollableTable
   - Apply mobile form styles

---

## 7. File Locations

### CSS Utilities
- `hosted-smart-cost-calculator/app/globals.css`

### Components
- `hosted-smart-cost-calculator/components/ui/MobileMenu.tsx`
- `hosted-smart-cost-calculator/components/ui/ScrollableTable.tsx`
- `hosted-smart-cost-calculator/components/ui/BottomSheet.tsx`
- `hosted-smart-cost-calculator/components/ui/mobile/index.ts` (exports)

---

## 8. Requirements Validation

### Requirements Addressed

✅ **Requirement 6.1**: Mobile navigation with hamburger menu (MobileMenu)
✅ **Requirement 6.2**: Full-screen/slide-out navigation panel (MobileMenu)
✅ **Requirement 6.3**: Active section highlighting (MobileMenu)
✅ **Requirement 6.4**: Close button and overlay dismiss (MobileMenu)
✅ **Requirement 8.2**: Touch-friendly input sizing (44px minimum)
✅ **Requirement 9.1**: Horizontal scrolling for tables (ScrollableTable)
✅ **Requirement 9.2**: Visual scroll indicators (ScrollableTable)
✅ **Requirement 10.1**: Minimum 44x44px touch targets (utilities)
✅ **Requirement 10.3**: Bottom sheet for bulk actions (BottomSheet)
✅ **Requirement 13.3**: Readable font sizes (mobile typography utilities)
✅ **Requirement 13.4**: Consistent spacing (mobile spacing utilities)
✅ **Requirement 3.5**: Export options in bottom sheet (BottomSheet)

---

## Summary

This implementation provides a solid foundation for mobile optimization across the entire application. The utility classes ensure consistent touch targets, spacing, and typography, while the three new components (MobileMenu, ScrollableTable, BottomSheet) handle the most common mobile UI patterns.

All components maintain the existing glassmorphism design aesthetic and are fully accessible with keyboard navigation and screen reader support. The desktop experience remains completely unchanged at the lg breakpoint (≥1024px) and above.
