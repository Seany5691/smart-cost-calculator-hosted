@echo off
echo ========================================
echo REMINDERS TAB - LEAD FILTER TEST
echo ========================================
echo.
echo Dev server is running at:
echo http://localhost:3000
echo.
echo ========================================
echo TEST STEPS:
echo ========================================
echo.
echo 1. Open browser to: http://localhost:3000
echo 2. Navigate to: Leads -^> Reminders
echo 3. Click: "Create Reminder" button (top right)
echo 4. Look at: "Lead (Optional)" dropdown
echo.
echo ========================================
echo WHAT TO VERIFY:
echo ========================================
echo.
echo Should SEE:
echo   [✓] "Standalone Reminder" option
echo   [✓] Leads from "Leads" tab (status=leads)
echo   [✓] Leads from "Working On" tab (status=working)
echo   [✓] Leads from "Later Stage" tab (status=later)
echo   [✓] Leads from "Bad Leads" tab (status=bad)
echo   [✓] Leads from "Signed" tab (status=signed)
echo   [✓] Status label next to each lead name
echo   [✓] Helper text below dropdown
echo.
echo Should NOT see:
echo   [✗] Leads from "Main Sheet" tab (status=new)
echo.
echo ========================================
echo TROUBLESHOOTING:
echo ========================================
echo.
echo If Main Sheet leads still showing:
echo   1. Press Ctrl+Shift+Delete (clear cache)
echo   2. Press Ctrl+F5 (hard refresh)
echo   3. Check browser console for errors
echo.
echo If dropdown is empty:
echo   1. Move some leads to other tabs
echo   2. Main Sheet leads are excluded by design
echo.
echo ========================================
echo.
echo Opening browser now...
echo.
start http://localhost:3000/leads?tab=reminders
echo.
echo Browser opened! Follow the test steps above.
echo.
echo Press any key to view the detailed fix documentation...
pause >nul
start REMINDERS_TAB_LEAD_FILTER_FIXED.md
