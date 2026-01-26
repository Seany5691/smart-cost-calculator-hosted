# Mobile Optimization Quick Reference

## Quick Start Guide for Developers

This guide provides quick copy-paste examples for common mobile optimization patterns.

---

## 1. Touch-Friendly Buttons

### Standard Button
```tsx
<button className="btn btn-primary min-touch-44">
  Click Me
</button>
```

### Icon Button
```tsx
<button className="btn-icon min-touch-44 bg-white/10 rounded-lg">
  <Icon className="w-5 h-5" />
</button>
```

### Button Group (Mobile Stack)
```tsx
<div className="flex flex-col sm:flex-row gap-3">
  <button className="btn btn-primary">Save</button>
  <button className="btn btn-secondary">Cancel</button>
</div>
```

---

## 2. Forms

### Input Field
```tsx
<div>
  <label className="label">Name</label>
  <input 
    type="text" 
    className="input no-tap-zoom" 
    placeholder="Enter name"
  />
</div>
```

### Form Grid (Single Column on Mobile)
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <div>
    <label className="label">First Name</label>
    <input type="text" className="input" />
  </div>
  <div>
    <label className="label">Last Name</label>
    <input type="text" className="input" />
  </div>
</div>
```

### Select/Dropdown
```tsx
<select className="input no-tap-zoom">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

---

## 3. Tables

### Scrollable Table
```tsx
import ScrollableTable from '@/components/ui/ScrollableTable';

<ScrollableTable minWidth="800px">
  <table className="w-full">
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
        <th>Column 3</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data 1</td>
        <td>Data 2</td>
        <td>Data 3</td>
      </tr>
    </tbody>
  </table>
</ScrollableTable>
```

### Card Alternative (Mobile Only)
```tsx
{/* Desktop: Table */}
<div className="hidden lg:block">
  <table>...</table>
</div>

{/* Mobile: Cards */}
<div className="block lg:hidden space-y-4">
  {items.map(item => (
    <div key={item.id} className="glass-card p-4">
      <h3 className="font-bold">{item.name}</h3>
      <p className="text-sm text-gray-400">{item.description}</p>
      <div className="flex gap-2 mt-3">
        <button className="btn-icon min-touch-44">Edit</button>
        <button className="btn-icon min-touch-44">Delete</button>
      </div>
    </div>
  ))}
</div>
```

---

## 4. Modals

### Full-Screen Modal on Mobile
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/50" onClick={onClose} />
  
  {/* Modal */}
  <div className="relative glass-card w-full max-w-2xl 
                  sm:max-w-full sm:h-screen sm:m-0 sm:rounded-none
                  lg:max-w-2xl lg:h-auto lg:rounded-lg">
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b border-white/10">
      <h2 className="text-xl font-bold">Modal Title</h2>
      <button onClick={onClose} className="btn-icon min-touch-44">
        <X className="w-5 h-5" />
      </button>
    </div>
    
    {/* Content */}
    <div className="p-6 overflow-y-auto max-h-[calc(100vh-12rem)] 
                    sm:h-[calc(100vh-8rem)] custom-scrollbar">
      {/* Your content */}
    </div>
    
    {/* Actions */}
    <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-white/10">
      <button className="btn btn-primary">Save</button>
      <button className="btn btn-secondary">Cancel</button>
    </div>
  </div>
</div>
```

---

## 5. Navigation

### Mobile Menu Integration
```tsx
'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import MobileMenu from '@/components/ui/MobileMenu';

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="flex items-center justify-between p-4">
      {/* Logo */}
      <div className="text-xl font-bold gradient-text">Logo</div>
      
      {/* Desktop Links */}
      <div className="hidden lg:flex gap-4">
        <a href="/dashboard">Dashboard</a>
        <a href="/leads">Leads</a>
        <a href="/calculator">Calculator</a>
      </div>
      
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setMenuOpen(true)}
        className="lg:hidden btn-icon min-touch-44"
      >
        <Menu className="w-6 h-6" />
      </button>
      
      {/* Mobile Menu */}
      <MobileMenu 
        isOpen={menuOpen} 
        onClose={() => setMenuOpen(false)} 
      />
    </nav>
  );
}
```

---

## 6. Bottom Sheet

### Actions Menu
```tsx
'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';

export default function ActionsButton() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setSheetOpen(true)}
        className="btn btn-primary lg:hidden"
      >
        Actions
      </button>
      
      <BottomSheet 
        isOpen={sheetOpen} 
        onClose={() => setSheetOpen(false)}
        title="Choose Action"
      >
        <div className="space-y-3">
          <button className="w-full btn btn-primary min-h-[44px]">
            Export to Excel
          </button>
          <button className="w-full btn btn-secondary min-h-[44px]">
            Export to PDF
          </button>
          <button className="w-full btn btn-info min-h-[44px]">
            Share
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
```

---

## 7. Responsive Layouts

### Grid Layout (Responsive Columns)
```tsx
{/* 1 column on mobile, 2 on tablet, 4 on desktop */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="glass-card p-4">Card 1</div>
  <div className="glass-card p-4">Card 2</div>
  <div className="glass-card p-4">Card 3</div>
  <div className="glass-card p-4">Card 4</div>
</div>
```

### Flex Layout (Stack on Mobile)
```tsx
<div className="flex flex-col lg:flex-row gap-4">
  <div className="flex-1 glass-card p-4">Left</div>
  <div className="flex-1 glass-card p-4">Right</div>
</div>
```

### Hide/Show Based on Viewport
```tsx
{/* Show only on mobile */}
<div className="block lg:hidden">Mobile content</div>

{/* Show only on desktop */}
<div className="hidden lg:block">Desktop content</div>

{/* Show on tablet and up */}
<div className="hidden md:block">Tablet+ content</div>
```

---

## 8. Common Patterns

### Card with Actions
```tsx
<div className="glass-card p-4 sm:p-6">
  <h3 className="text-lg font-bold mb-2">Card Title</h3>
  <p className="text-sm text-gray-400 mb-4">Card description</p>
  
  <div className="flex flex-col sm:flex-row gap-3">
    <button className="btn btn-primary min-touch-44">Primary</button>
    <button className="btn btn-secondary min-touch-44">Secondary</button>
  </div>
</div>
```

### Stats Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {stats.map(stat => (
    <div key={stat.id} className="glass-card p-6">
      <p className="text-sm text-gray-400">{stat.label}</p>
      <p className="text-3xl lg:text-2xl font-bold mt-2">{stat.value}</p>
    </div>
  ))}
</div>
```

### Collapsible Section (Mobile)
```tsx
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-card">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 min-h-[44px]"
      >
        <span className="font-bold">Section Title</span>
        <ChevronDown 
          className={`w-5 h-5 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>
      
      {isOpen && (
        <div className="p-4 border-t border-white/10">
          {/* Section content */}
        </div>
      )}
    </div>
  );
}
```

---

## 9. Utility Classes Cheat Sheet

### Touch Targets
- `.min-touch-44` - 44x44px minimum
- `.min-touch-48` - 48x48px minimum

### Spacing
- `.mobile-spacing-sm` - space-y-3
- `.mobile-spacing-md` - space-y-4
- `.mobile-spacing-lg` - space-y-6

### Typography
- `.mobile-text-base` - text-base on mobile, text-sm on desktop
- `.mobile-text-lg` - text-lg on mobile, text-base on desktop
- `.mobile-heading` - text-2xl on mobile, text-xl on desktop

### Scrolling
- `.scrollable-container` - Horizontal scroll with indicators
- `.momentum-scroll` - Smooth momentum scrolling

### Touch Feedback
- `.no-tap-zoom` - Prevents double-tap zoom
- `.touch-feedback` - Scale down on touch
- `.touch-feedback-subtle` - Opacity change on touch

---

## 10. Breakpoints Reference

```css
/* Mobile (default) */
/* < 640px */

/* Small (sm:) */
@media (min-width: 640px) { }

/* Medium (md:) */
@media (min-width: 768px) { }

/* Large (lg:) - Desktop */
@media (min-width: 1024px) { }

/* Extra Large (xl:) */
@media (min-width: 1280px) { }
```

---

## Testing Checklist

- [ ] All buttons are at least 44x44px on mobile
- [ ] Forms stack vertically on mobile
- [ ] Tables scroll horizontally or convert to cards
- [ ] Modals are full-screen on mobile
- [ ] Navigation uses hamburger menu on mobile
- [ ] No horizontal overflow (except tables)
- [ ] Text is readable (minimum 14px)
- [ ] Spacing is consistent
- [ ] Touch feedback works on all interactive elements
- [ ] Desktop layout unchanged at lg: breakpoint

---

## Need Help?

See the full documentation: `MOBILE_UTILITIES_IMPLEMENTATION.md`
