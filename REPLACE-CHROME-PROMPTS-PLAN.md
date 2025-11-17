# Replace Chrome Prompts - Implementation Plan

## Overview

Replace all 9 instances of `confirm()` and `alert()` with proper modals across the leads management section.

## Files to Update

1. ✅ `src/hooks/leads/useConfirmModal.ts` - **CREATED**
2. ⏳ `src/components/leads/leads/LeadCard.tsx` - 1 confirm
3. ⏳ `src/components/leads/leads/LeadTable.tsx` - 1 confirm
4. ⏳ `src/app/leads/status-pages/status/leads/page.tsx` - 3 confirms + 1 alert
5. ⏳ `src/app/leads/status-pages/page.tsx` - 2 confirms
6. ⏳ `src/app/leads/import-pages/page.tsx` - 1 confirm

## Implementation Steps

### Step 1: Update LeadCard Component
```typescript
// Add imports
import { ConfirmModal } from '../ui/ConfirmModal';
import { useConfirmModal } from '@/hooks/leads/useConfirmModal';

// Add hook
const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirmModal();

// Replace confirm() call
onClick={async (e) => {
  e.stopPropagation();
  const confirmed = await confirm({
    title: 'Delete Lead',
    message: `Are you sure you want to delete ${lead.name}? This action cannot be undone.`,
    confirmText: 'Delete',
    variant: 'danger'
  });
  if (confirmed && onDelete) {
    onDelete(lead.id);
  }
}}

// Add modal at end
<ConfirmModal
  isOpen={isOpen}
  onClose={handleCancel}
  onConfirm={handleConfirm}
  {...options}
/>
```

### Step 2: Update LeadTable Component
Same pattern as LeadCard.

### Step 3: Update Leads Status Page
- Add 3 confirm modal states (bulk status, bulk delete, single delete)
- Replace alert() with toast notification
- Wire up all modals

### Step 4: Update Main Sheet Page
- Add 2 confirm modal states (bulk delete, delete filter list)
- Wire up modals

### Step 5: Update Import Page
- Add confirm modal for navigation during import

## Alternative Approach (Simpler)

Instead of using the hook, we can add modal state directly to each component:

```typescript
const [deleteConfirm, setDeleteConfirm] = useState<{
  isOpen: boolean;
  leadId?: string;
  leadName?: string;
  count?: number;
} | null>(null);

// Usage
<ConfirmModal
  isOpen={deleteConfirm?.isOpen || false}
  onClose={() => setDeleteConfirm(null)}
  onConfirm={() => {
    if (deleteConfirm?.leadId) {
      onDelete(deleteConfirm.leadId);
    }
    setDeleteConfirm(null);
  }}
  title="Delete Lead"
  message={`Are you sure you want to delete ${deleteConfirm?.leadName}?`}
  confirmText="Delete"
  variant="danger"
/>
```

## Testing Checklist

After implementation, test:
- [ ] Single lead delete from card
- [ ] Single lead delete from table
- [ ] Bulk delete from Leads tab
- [ ] Bulk status change from Leads tab
- [ ] Bulk delete from Main Sheet
- [ ] Delete filter list from Main Sheet
- [ ] Navigation confirmation during import
- [ ] Error notifications show as toasts

## Estimated Time

- Implementation: 30-45 minutes
- Testing: 15 minutes
- Total: ~1 hour

## Priority

**HIGH** - This affects user experience significantly and should be done ASAP.

