# Main Sheet Modals - Quick Reference

## Modal Checklist ✓

### Import Modal
```
✓ Portal rendering (document.body)
✓ Backdrop: bg-black/50 backdrop-blur-sm
✓ z-index: 9999
✓ Color: emerald/green theme
✓ Click outside to close
✓ Sticky header
✓ Custom scrollbar (emerald)
✓ ARIA: role="dialog" aria-modal="true"
✓ Keyboard: Escape to close
```

### Delete List Confirmation Modal
```
✓ Portal rendering (document.body)
✓ Backdrop: bg-black/50 backdrop-blur-sm
✓ z-index: 9999
✓ Color: emerald base + red danger accents
✓ Click outside to close (when not loading)
✓ ARIA: Full support
✓ Keyboard: Escape to close (when not loading)
✓ Loading state prevents accidental closure
```

### Bulk Delete Confirmation Modal
```
✓ Portal rendering (document.body)
✓ Backdrop: bg-black/50 backdrop-blur-sm
✓ z-index: 9999
✓ Color: emerald base + red danger accents
✓ Click outside to close (when not loading)
✓ ARIA: Full support
✓ Keyboard: Escape to close (when not loading)
✓ Loading state prevents accidental closure
```

---

## Color Palette

### Emerald/Green Theme (Primary)
```css
/* Backgrounds */
bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900
bg-emerald-500/20
bg-white/5

/* Borders */
border-emerald-500/30
border-emerald-500/20

/* Text */
text-emerald-200
text-emerald-400
text-white

/* Gradients */
from-emerald-500 to-teal-500
from-teal-500 to-emerald-500

/* Scrollbar */
rgba(16, 185, 129, 0.3)  /* emerald-500 */
```

### Danger Variant (Delete Modals)
```css
/* Icon backgrounds */
bg-red-500/20

/* Icon colors */
text-red-400

/* Buttons */
bg-red-600 hover:bg-red-700
```

---

## Code Patterns

### Portal Rendering
```tsx
{isMounted && showModal && createPortal(
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]...">
    {/* Modal content */}
  </div>,
  document.body
)}
```

### Click Outside to Close
```tsx
<div 
  className="fixed inset-0..."
  onClick={(e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }}
>
  <div onClick={(e) => e.stopPropagation()}>
    {/* Modal content */}
  </div>
</div>
```

### Sticky Header
```tsx
<div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-emerald-500/20 bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900 backdrop-blur-sm">
  <h2 id="modal-title" className="text-2xl font-bold text-white">
    Modal Title
  </h2>
  <button
    onClick={onClose}
    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
    aria-label="Close modal"
  >
    <X className="w-5 h-5 text-emerald-200" />
  </button>
</div>
```

### Custom Scrollbar
```tsx
<div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar">
  <style jsx>{`
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(16, 185, 129, 0.3);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(16, 185, 129, 0.5);
    }
  `}</style>
  {/* Scrollable content */}
</div>
```

### Accessibility Attributes
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <h2 id="modal-title">Modal Title</h2>
  <button aria-label="Close modal">
    <X />
  </button>
</div>
```

### Keyboard Support
```tsx
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !loading) {
      onClose();
    }
  };

  if (isOpen) {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }
}, [isOpen, loading, onClose]);
```

---

## Testing Commands

### Visual Testing
1. Open Main Sheet tab
2. Click "Import Leads" button
3. Verify emerald/green colors throughout
4. Check sticky header while scrolling
5. Verify custom scrollbar styling

### Interaction Testing
1. Click backdrop → Modal closes
2. Click X button → Modal closes
3. Press Escape → Modal closes
4. Click inside modal → Modal stays open

### Accessibility Testing
1. Tab through interactive elements
2. Verify focus rings are visible
3. Test with screen reader
4. Verify ARIA attributes in DevTools

---

## Files Modified

1. `app/leads/status-pages/main-sheet.tsx`
   - Import modal colors changed from orange/amber to emerald/green
   - All modal features verified and documented

2. `components/leads/ConfirmModal.tsx`
   - Added click outside to close functionality
   - Added stop propagation on modal content
   - Enhanced accessibility attributes
   - Improved keyboard support

---

## Next Steps

All modals on the Main Sheet are now standardized. No further action required.

If you need to add new modals to the Main Sheet in the future, use this document as a reference to ensure consistency.
