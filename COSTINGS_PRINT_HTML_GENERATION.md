# Costings Modal - Print Cost Breakdown HTML Generation

## Feature Implementation

Updated the "Print Cost Breakdown" button in the All Deals costings modal to generate a printable HTML file (similar to the "Generate PDF" button in the calculator's Total Costs section).

## Changes Made

### File: `components/deals/CostingsModal.tsx`

**Before:**
- Button called `window.print()` which would print the modal directly
- Limited formatting control
- No standalone HTML file generated

**After:**
- Button now calls `generateCostingsHTML(costings)` function
- Generates a complete, styled HTML file
- Downloads the HTML file automatically
- Opens the HTML in a new browser tab for viewing/printing
- Matches the style and format of the calculator's PDF generation

## HTML Generation Features

### Styling
- Dark gradient background (matches app theme)
- Glassmorphism effects
- Orange/amber color scheme (matches costings modal theme)
- Responsive layout
- Print-friendly CSS

### Content Sections

1. **Header**
   - Deal name and customer name
   - Deal details (created by, role, term, escalation)

2. **Hardware Breakdown**
   - Item-by-item breakdown
   - Quantity, actual cost, rep cost, profit
   - Total row with highlighting

3. **Connectivity Breakdown**
   - Service-by-service breakdown
   - Quantity, actual cost, rep cost, profit
   - Total row with highlighting

4. **Licensing Breakdown**
   - Service-by-service breakdown
   - Quantity, actual cost, rep cost, profit
   - Total row with highlighting

5. **Totals Comparison**
   - Hardware Total, Installation Total, Connectivity Total, Licensing Total
   - Settlement, Finance Fee
   - Factor (5 decimal places)
   - Total Payout (highlighted)
   - Hardware Rental, Total MRC (highlighted)
   - Difference column with color coding (green = positive, red = negative)

6. **Gross Profit Analysis**
   - Actual GP (True GP)
   - Rep GP (Role Based)
   - GP Difference

7. **Term Analysis**
   - Connectivity Over Term
   - Licensing Over Term
   - Total Recurring Over Term
   - GP Over Term

8. **Footer**
   - Generation timestamp
   - App branding

## Color Coding

- **Green text**: Positive differences (savings/profit)
- **Red text**: Negative differences (losses)
- **Neutral text**: Zero difference

## File Naming

Format: `Cost_Breakdown_{CustomerName}_{Timestamp}.html`

Example: `Cost_Breakdown_ABC_Company_2024-01-24T10-30-45.html`

## User Experience

1. User clicks "Print Cost Breakdown" button
2. HTML file is automatically downloaded
3. HTML opens in new browser tab
4. User can:
   - View the formatted breakdown
   - Print using browser's print function (Ctrl+P / Cmd+P)
   - Save the HTML file for records
   - Share the file with others

## Technical Details

- Uses template literals for HTML generation
- Inline CSS for portability
- No external dependencies
- Works in all modern browsers
- Print-optimized CSS media queries

## Status
**COMPLETE** - Print Cost Breakdown button now generates a complete HTML file with all costings data, matching the style and functionality of the calculator's PDF generation feature.
