import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[TEST-BROWSER] Starting browser test...');
    
    // Test 1: Import browser manager
    const { browserManager } = await import('@/lib/scraper/browser-manager');
    console.log('[TEST-BROWSER] BrowserManager imported successfully');
    
    // Test 2: Get browser status
    const status = browserManager.getStatus();
    console.log('[TEST-BROWSER] Current status:', status);
    
    // Test 3: Try to create browser
    console.log('[TEST-BROWSER] Attempting to create browser...');
    const browser = await browserManager.getBrowser('test');
    console.log('[TEST-BROWSER] Browser created successfully');
    
    // Test 4: Try to create a page
    const page = await browser.newPage();
    console.log('[TEST-BROWSER] Page created successfully');
    
    // Test 5: Navigate to a simple page
    await page.goto('data:text/html,<h1>Test</h1>');
    console.log('[TEST-BROWSER] Navigation successful');
    
    // Test 6: Close page
    await page.close();
    console.log('[TEST-BROWSER] Page closed successfully');
    
    // Test 7: Release browser
    await browserManager.releaseBrowser(browser);
    console.log('[TEST-BROWSER] Browser released successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'All browser tests passed',
      status: browserManager.getStatus()
    });
    
  } catch (error: any) {
    console.error('[TEST-BROWSER] Error:', error);
    
    // Get detailed error information
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      signal: error.signal,
      killed: error.killed,
      pid: error.pid,
      spawnargs: error.spawnargs,
      // Serialize all enumerable properties
      ...Object.getOwnPropertyNames(error).reduce((acc, key) => {
        try {
          acc[key] = error[key];
        } catch (e) {
          acc[key] = `[Unable to serialize: ${e.message}]`;
        }
        return acc;
      }, {} as any)
    };
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      errorDetails,
      browserManagerStatus: (() => {
        try {
          const { browserManager } = require('@/lib/scraper/browser-manager');
          return browserManager.getStatus();
        } catch (e) {
          return { error: 'Could not get browser manager status' };
        }
      })()
    }, { status: 500 });
  }
}