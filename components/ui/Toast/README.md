# Toast Notification System

A complete toast notification system with glassmorphic design, section-specific colors, and accessibility support.

## Features

- ✅ Four toast types: success, error, warning, info
- ✅ Section-specific colors (leads/emerald, calculator/purple, scraper/teal)
- ✅ Auto-dismiss with configurable duration
- ✅ Manual dismissal
- ✅ Toast stacking (max 5)
- ✅ Smooth slide-in/slide-out animations
- ✅ ARIA live regions for accessibility
- ✅ Glassmorphic design matching app theme

## Installation

The ToastProvider is already added to the root layout (`app/layout.tsx`), so toasts are available throughout the application.

## Usage

### Basic Usage

```tsx
'use client';

import { useToast } from '@/components/ui/Toast/useToast';

export default function MyComponent() {
  const { toast } = useToast();

  return (
    <button onClick={() => toast.success('Operation successful!')}>
      Click me
    </button>
  );
}
```

### Toast Types

```tsx
// Success toast (3 second duration)
toast.success('Lead updated successfully');

// Error toast (5 second duration)
toast.error('Failed to save changes');

// Warning toast (4 second duration)
toast.warning('Unsaved changes detected');

// Info toast (4 second duration)
toast.info('New feature available');
```

### With Message

```tsx
toast.success('Lead updated', {
  message: 'Changes have been saved successfully'
});

toast.error('Failed to save', {
  message: 'Please check your connection and try again'
});
```

### Section-Specific Colors

Use the `section` option to apply section-specific colors to info toasts:

```tsx
// Leads section (emerald theme)
toast.info('Dashboard updated', {
  message: 'Check out the new analytics',
  section: 'leads'
});

// Calculator section (purple theme)
toast.info('Pricing updated', {
  message: 'New options available',
  section: 'calculator'
});

// Scraper section (teal theme)
toast.info('Scraper improved', {
  message: 'Better performance',
  section: 'scraper'
});
```

### Custom Duration

```tsx
// Quick toast (1 second)
toast.info('Quick message', { duration: 1000 });

// Long toast (10 seconds)
toast.error('Important error', { duration: 10000 });

// No auto-dismiss (set duration to 0 or undefined)
toast.warning('Manual dismiss only', { duration: 0 });
```

## API Reference

### useToast Hook

```tsx
const { toast, toasts, removeToast } = useToast();
```

#### `toast.success(title, options?)`
- `title` (string): Toast title
- `options` (object, optional):
  - `message` (string): Additional message
  - `duration` (number): Auto-dismiss duration in ms (default: 3000)
  - `section` ('leads' | 'calculator' | 'scraper'): Section-specific colors

#### `toast.error(title, options?)`
- Same as success, default duration: 5000ms

#### `toast.warning(title, options?)`
- Same as success, default duration: 4000ms

#### `toast.info(title, options?)`
- Same as success, default duration: 4000ms
- Supports `section` option for section-specific colors

#### `toasts`
- Array of currently displayed toasts

#### `removeToast(id)`
- Manually remove a toast by ID

## Toast Stacking

The system automatically limits toasts to a maximum of 5. When a 6th toast is added, the oldest toast is automatically removed.

## Accessibility

- Toasts use ARIA live regions (`role="alert"`, `aria-live="polite"`)
- Each toast is announced to screen readers
- Dismiss buttons have proper `aria-label` attributes
- Keyboard accessible (Tab to focus, Enter/Space to dismiss)

## Animations

- **Slide-in-right**: Toasts slide in from the right (300ms)
- **Slide-out-right**: Toasts slide out to the right (300ms)
- Animations are defined in `app/globals.css`

## Testing

Visit `/test-toast` to see all toast types and test the functionality:
- http://localhost:3000/test-toast

## Examples

### Replace alert() calls

```tsx
// Before
alert('Lead saved successfully!');

// After
toast.success('Lead saved successfully!');
```

### Replace confirm() calls

```tsx
// Before
if (confirm('Are you sure you want to delete this lead?')) {
  deleteLead();
}

// After
// Use a custom confirm modal instead (to be implemented in future tasks)
```

### Error handling

```tsx
try {
  await saveLead(data);
  toast.success('Lead saved', {
    message: 'Changes have been saved successfully',
    section: 'leads'
  });
} catch (error) {
  toast.error('Failed to save lead', {
    message: error.message || 'Please try again',
    section: 'leads'
  });
}
```

## Color Schemes

### Success (Green)
- Border: `border-green-500/30`
- Icon background: `bg-green-500/20`
- Icon color: `text-green-400`

### Error (Red)
- Border: `border-red-500/30`
- Icon background: `bg-red-500/20`
- Icon color: `text-red-400`

### Warning (Yellow)
- Border: `border-yellow-500/30`
- Icon background: `bg-yellow-500/20`
- Icon color: `text-yellow-400`

### Info (Blue or Section-Specific)
- Default: Blue theme
- Leads: Emerald theme
- Calculator: Purple theme
- Scraper: Teal theme

## File Structure

```
components/ui/Toast/
├── ToastContext.tsx      # Context definition and types
├── ToastProvider.tsx     # Provider component with state management
├── Toast.tsx             # Individual toast component
├── ToastContainer.tsx    # Container that renders all toasts
├── useToast.ts           # Hook for using toasts
├── index.ts              # Barrel export
└── README.md             # This file
```

## Implementation Details

- **Position**: Fixed top-right (`top-4 right-4`)
- **Z-index**: 10000 (above modals which are 9999)
- **Max toasts**: 5 simultaneous toasts
- **Auto-dismiss**: Configurable per toast type
- **Animations**: CSS-based for performance
- **Accessibility**: Full ARIA support

## Future Enhancements

- [ ] Toast queue system for better control
- [ ] Custom toast templates
- [ ] Toast actions (undo, retry, etc.)
- [ ] Position configuration (top-left, bottom-right, etc.)
- [ ] Sound notifications (optional)
- [ ] Persistent toasts (saved to localStorage)
