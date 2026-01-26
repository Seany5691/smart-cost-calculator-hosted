# Scraper Section - Modal Audit

## Summary

**Total Modals:** 3
- ✅ **1 Fully Compliant** - SessionManager
- ⚠️ **2 Need Updates** - Clear Confirmation & Export to Leads modals (inline in page.tsx)

---

## ✅ Fully Compliant Modal (1)

### SessionManager
**File:** `components/scraper/SessionManager.tsx`

**Compliance Status:** ✅ FULLY COMPLIANT

**Features:**
- ✅ Portal rendering (`createPortal(modal, document.body)`)
- ✅ Backdrop with blur (`bg-black/50 backdrop-blur-sm`)
- ✅ Teal/cyan color scheme (matches scraper page)
- ✅ z-index 9999
- ✅ Click outside to close (when not loading)
- ✅ Sticky header (implicit with fixed height)
- ✅ Custom scrollbar
- ✅ Accessibility (ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`)
- ✅ Keyboard support (Escape key)
- ✅ Mounted state for SSR safety
- ✅ Mobile responsive (full screen on mobile)
- ✅ Loading state management

**Color Scheme:**
```tsx
bg-gradient-to-br from-slate-900 to-teal-900
border-teal-500/30
text-teal-200
text-teal-400
bg-teal-600 hover:bg-teal-700
```

---

## ⚠️ Modals Needing Updates (2)

### 1. Clear Confirmation Modal ⚠️
**File:** `app/scraper/page.tsx` (lines 668-716)

**Issues:**
- ❌ NOT using `createPortal` - renders inline in component tree
- ❌ Missing mounted state check for SSR safety
- ❌ Missing stop propagation on modal content
- ❌ Missing ARIA attributes
- ❌ Missing keyboard support (Escape key)

**Current Implementation:**
```tsx
{showClearConfirm && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div className="bg-gradient-to-br from-slate-900 to-teal-900 rounded-2xl...">
      {/* Modal content */}
    </div>
  </div>
)}
```

**Needs:**
1. Extract to separate component file
2. Add `createPortal` rendering
3. Add mounted state check
4. Add stop propagation on modal content
5. Add ARIA attributes
6. Add Escape key handler
7. Add click outside to close

---

### 2. Export to Leads Prompt Modal ⚠️
**File:** `app/scraper/page.tsx` (lines 719-787)

**Issues:**
- ❌ NOT using `createPortal` - renders inline in component tree
- ❌ Missing mounted state check for SSR safety
- ❌ Missing stop propagation on modal content
- ❌ Missing ARIA attributes
- ❌ Missing keyboard support (Escape key)
- ❌ Missing Enter key submit support

**Current Implementation:**
```tsx
{showExportToLeadsPrompt && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div className="bg-gradient-to-br from-slate-900 to-teal-900 rounded-2xl...">
      {/* Modal content */}
    </div>
  </div>
)}
```

**Needs:**
1. Extract to separate component file
2. Add `createPortal` rendering
3. Add mounted state check
4. Add stop propagation on modal content
5. Add ARIA attributes
6. Add Escape key handler
7. Add Enter key submit support
8. Add click outside to close

---

## Color Scheme

### Teal/Cyan Theme (Scraper Section)
```css
/* Page Background */
bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900

/* Modal Backgrounds */
bg-gradient-to-br from-slate-900 to-teal-900

/* Borders */
border-teal-500/30
border-teal-500/20

/* Text */
text-teal-200
text-teal-300
text-teal-400

/* Buttons */
bg-teal-600 hover:bg-teal-700

/* Inputs */
border-teal-500/30
focus:border-teal-500
focus:ring-teal-500

/* Info Boxes */
bg-teal-500/10
border-teal-500/30
text-teal-300
```

---

## Recommended Actions

### Priority 1: Extract Inline Modals to Components

Create two new component files:

1. **`components/scraper/ClearConfirmModal.tsx`**
   - Extract clear confirmation modal
   - Add all standardization features
   - Follow SessionManager pattern

2. **`components/scraper/ExportToLeadsModal.tsx`**
   - Extract export to leads modal
   - Add all standardization features
   - Follow SessionManager pattern

### Priority 2: Implement Standard Pattern

Both modals should follow this pattern:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  // ... other props
}

export default function Modal({ isOpen, onClose, onConfirm }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="bg-gradient-to-br from-slate-900 to-teal-900 rounded-2xl shadow-2xl max-w-md w-full border border-teal-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">Modal Title</h2>
        {/* Modal content */}
      </div>
    </div>,
    document.body
  );
}
```

---

## Testing Checklist

After updates, verify each modal:

### Functional Tests
- [ ] Opens correctly
- [ ] Closes on backdrop click
- [ ] Closes on X button click
- [ ] Closes on Escape key
- [ ] Stays open when clicking modal content
- [ ] Renders at document.body level (check in DevTools)
- [ ] Enter key submits form (Export modal)

### Visual Tests
- [ ] Appears above all other content
- [ ] Backdrop blur effect works
- [ ] Teal/cyan colors match scraper page
- [ ] Animations are smooth
- [ ] Mobile responsive

### Accessibility Tests
- [ ] Tab navigation works
- [ ] Focus rings visible
- [ ] Screen reader announces modal
- [ ] ARIA attributes present
- [ ] Keyboard shortcuts work

---

## Summary

**Current Status:**
- 1 modal fully compliant (SessionManager)
- 2 modals need extraction and standardization

**Estimated Time:** 45-60 minutes to extract and update both modals

**Impact:** Medium - Modals currently work but don't follow best practices for portal rendering, accessibility, and code organization.

**Benefits of Updates:**
- Better code organization (separate component files)
- Improved accessibility
- Consistent user experience
- Easier maintenance
- Better SSR compatibility
- Proper z-index stacking
