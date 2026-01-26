@echo off
echo ========================================
echo MAIN SHEET PAGINATION - QUICK TEST
echo ========================================
echo.
echo Dev server is already running at:
echo http://localhost:3000
echo.
echo ========================================
echo TEST STEPS:
echo ========================================
echo.
echo 1. Open browser to: http://localhost:3000
echo 2. Log in to your account
echo 3. Navigate to: Leads -^> Main Sheet
echo 4. Look at "Available Leads" section
echo.
echo ========================================
echo WHAT TO VERIFY:
echo ========================================
echo.
echo If you have MORE than 50 leads:
echo   [✓] Pagination controls appear at bottom
echo   [✓] Header shows: "X leads available (Page 1 of Y)"
echo   [✓] Can click "Next" to see page 2
echo   [✓] Can click page numbers to jump
echo.
echo If you have 50 or FEWER leads:
echo   [✓] All leads shown on one page
echo   [✓] No pagination controls (not needed)
echo.
echo ========================================
echo TROUBLESHOOTING:
echo ========================================
echo.
echo If pagination not showing:
echo   1. Press F12 to open browser console
echo   2. Look for [PAGINATION DEBUG] logs
echo   3. Verify totalPages ^> 1
echo   4. Try importing more leads
echo.
echo ========================================
echo.
echo Opening browser now...
echo.
start http://localhost:3000/leads/status-pages/main-sheet
echo.
echo Browser opened! Follow the test steps above.
echo.
echo Press any key to view the detailed fix documentation...
pause >nul
start MAIN_SHEET_PAGINATION_FIXED.md
