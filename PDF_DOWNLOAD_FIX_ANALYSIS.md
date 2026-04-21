# PDF Download Fix Analysis

## Problem
PDF generates successfully on server but fails to download in browser with "Failed to download. Something went wrong"

## Console Logs Analysis
```
[HtmlProposalGenerator] PDF generated successfully: {
  success: true, 
  pdfUrl: '/api/uploads/pdfs/proposal-The_Security_Mecca___Potch-2026-04-21T11-35-57.pdf',
  fileName: 'proposal-The_Security_Mecca___Potch-2026-04-21T11-35-57.pdf',
  fileSize: 3408456,
  attachmentId: null
}
[HtmlProposalGenerator] PDF URL: /api/uploads/pdfs/proposal-The_Security_Mecca___Potch-2026-04-21T11-35-57.pdf
[HtmlProposalGenerator] PDF window opened successfully
```

## Root Cause
The issue is likely one of the following:

### 1. Content-Disposition Header Conflict
The PDF serving endpoint uses:
```typescript
'Content-Disposition': `attachment; filename="${filename}"`
```

This forces a download, but `window.open()` expects to display the PDF inline. When the browser tries to download instead of display, it may fail.

### 2. File Path Mismatch
- **Save path**: `process.cwd() + '/uploads/pdfs/' + filename`
- **Serve path**: `process.cwd() + '/uploads/pdfs/' + filename`

These should match, but on VPS the working directory might be different.

### 3. File Permissions
The PDF file might be created with permissions that prevent the Next.js process from reading it back.

## Solution

### Option 1: Change Content-Disposition to inline (RECOMMENDED)
Change the PDF serving endpoint to display inline instead of forcing download:

```typescript
'Content-Disposition': `inline; filename="${filename}"`
```

This allows the browser to display the PDF in the new tab, and users can still download it using the browser's download button.

### Option 2: Use direct download instead of window.open()
Instead of opening in a new tab, trigger a direct download:

```typescript
// Create a temporary link and click it
const link = document.createElement('a');
link.href = result.pdfUrl;
link.download = result.fileName;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
```

### Option 3: Add logging to PDF serving endpoint
Add detailed logging to see what's happening when the browser requests the PDF:

```typescript
console.log('[PDF Download] Requested file:', filename);
console.log('[PDF Download] File path:', filePath);
console.log('[PDF Download] File exists:', existsSync(filePath));
console.log('[PDF Download] File size:', fileBuffer.length);
```

## Recommended Fix
**Change Content-Disposition from "attachment" to "inline"** in the PDF serving endpoint. This is the most likely cause of the issue.

The browser is trying to open the PDF in a new tab, but the server is forcing a download. This conflict causes the download to fail.

## Testing Steps
1. Change Content-Disposition to "inline"
2. Build and deploy to VPS
3. Generate a proposal
4. Verify PDF opens in new tab
5. Verify PDF can still be downloaded using browser's download button
