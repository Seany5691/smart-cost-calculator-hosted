# Calculator Auto-Save Implementation

## Overview
Implemented auto-save functionality for the calculator with step navigation prompts and save confirmations for proposal/PDF generation.

## Changes Made

### 1. Auto-Save on Step Navigation
**File: `components/calculator/CalculatorWizard.tsx`**

- Added `handleStepChange()` function that auto-saves the deal before navigating to a new step
- Auto-save only triggers if customer name is filled (minimum requirement)
- Updated all navigation methods to use `handleStepChange()`:
  - Tab clicks
  - Next/Previous buttons
  - Keyboard shortcuts (Arrow keys, 1-6 keys)
- Save failures don't block navigation (user-friendly approach)

### 2. Save Prompts for Proposal/PDF Generation
**File: `components/calculator/TotalCostsStep.tsx`**

- Added save confirmation modals before generating proposals and PDFs
- When clicking "Generate Proposal" or "Generate PDF", user is prompted:
  - "Would you like to save the deal before generating?"
  - Options: "Yes" or "No"
- If "Yes": Saves the deal, then generates proposal/PDF
- If "No": Skips saving and generates proposal/PDF directly
- Replaced direct PDF generation button with custom button that triggers save prompt

### 3. Existing Data Prompt on Calculator Entry
**File: `app/calculator/page.tsx`**

- Added check for existing calculator data when entering the calculator
- Shows modal prompt: "Existing Calculation Found"
  - "Would you like to continue with it or start a new calculation?"
  - Options: "Start New" or "Continue Previous"
- Exception: When coming from leads proposal button (proposal-lead-id in localStorage), skips the prompt and uses pre-cleared data
- "Start New" clears all calculator data and localStorage
- "Continue Previous" keeps existing data

### 4. New Components Created

**File: `components/calculator/SaveConfirmModal.tsx`**
- Reusable modal component for save confirmations
- Props: `isOpen`, `onConfirm`, `onCancel`, `title`, `message`
- Styled with purple gradient theme matching the app
- Supports Escape key to cancel

**File: `components/calculator/ExistingDataModal.tsx`**
- Modal for existing data prompt on calculator entry
- Props: `isOpen`, `onContinue`, `onStartNew`
- Styled with purple gradient theme
- Supports Escape key (defaults to continue)

## User Experience Flow

### Step Navigation Auto-Save
1. User fills in Deal Details (at minimum, customer name)
2. User navigates to next step (via tab, button, or keyboard)
3. Deal is automatically saved in the background
4. Navigation proceeds immediately (no blocking)
5. If save fails, navigation still proceeds (logged to console)

### Proposal/PDF Generation with Save Prompt
1. User clicks "Generate Proposal" or "Generate PDF"
2. Modal appears: "Save Deal Before Generating?"
3. User selects "Yes" or "No"
4. If "Yes": Deal saves, then proposal/PDF generates
5. If "No": Proposal/PDF generates without saving
6. Success/error toasts show appropriate messages

### Calculator Entry with Existing Data
1. User navigates to calculator
2. System checks for existing data in calculator store
3. If existing data found AND not coming from leads:
   - Modal appears: "Existing Calculation Found"
   - User chooses "Start New" or "Continue Previous"
4. If from leads proposal button:
   - Skips prompt (data already cleared)
   - Starts fresh automatically

## Technical Details

### Auto-Save Trigger Conditions
- Customer name must be filled (minimum requirement)
- Triggers on any step navigation
- Non-blocking (failures don't prevent navigation)

### Data Persistence
- Uses Zustand store with localStorage persistence
- Deal ID stored for future updates
- All sections, totals, factors, and scales saved

### Error Handling
- Save failures logged to console
- Navigation proceeds even if save fails
- User-friendly error messages via toast notifications

## Testing Recommendations

1. **Step Navigation Auto-Save**
   - Fill in customer name
   - Navigate between steps using tabs, buttons, and keyboard
   - Verify deal saves automatically (check network tab)
   - Test with empty customer name (should not save)

2. **Proposal/PDF Save Prompts**
   - Click "Generate Proposal" and test both "Yes" and "No" options
   - Click "Generate PDF" and test both "Yes" and "No" options
   - Verify save occurs when "Yes" is selected
   - Verify proposal/PDF generates in both cases

3. **Existing Data Prompt**
   - Enter calculator with existing data
   - Verify modal appears
   - Test "Start New" (should clear data)
   - Test "Continue Previous" (should keep data)
   - Navigate from leads proposal button (should skip prompt)

## Notes

- All existing functionality remains unchanged
- Proposal button in leads section already clears data (no changes needed)
- Auto-save is silent and non-intrusive
- Save prompts give users control over when to save
- Existing data prompt prevents accidental data loss
