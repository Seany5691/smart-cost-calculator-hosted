import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET() {
  try {
    console.log('[TEST-CHROMIUM] Starting Chromium diagnostics...');
    
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    };

    // Test 1: Check if Chromium is available
    try {
      console.log('[TEST-CHROMIUM] Checking Chromium availability...');
      const chromiumVersion = execSync('chromium --version', { encoding: 'utf8', timeout: 5000 });
      diagnostics.chromiumVersion = chromiumVersion.trim();
      console.log('[TEST-CHROMIUM] Chromium found:', chromiumVersion.trim());
    } catch (error: any) {
      diagnostics.chromiumError = error.message;
      console.log('[TEST-CHROMIUM] Chromium not found via command line:', error.message);
    }

    // Test 2: Check Puppeteer executable path
    try {
      console.log('[TEST-CHROMIUM] Checking Puppeteer executable...');
      const puppeteer = await import('puppeteer');
      const executablePath = puppeteer.default.executablePath();
      diagnostics.puppeteerExecutablePath = executablePath;
      console.log('[TEST-CHROMIUM] Puppeteer executable path:', executablePath);
      
      // Check if the executable exists
      const fs = await import('fs');
      const exists = fs.existsSync(executablePath);
      diagnostics.executableExists = exists;
      console.log('[TEST-CHROMIUM] Executable exists:', exists);
    } catch (error: any) {
      diagnostics.puppeteerError = error.message;
      console.log('[TEST-CHROMIUM] Puppeteer error:', error.message);
    }

    // Test 3: Check environment variables
    diagnostics.environmentVariables = {
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
      PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
      CHROME_BIN: process.env.CHROME_BIN,
      CHROMIUM_PATH: process.env.CHROMIUM_PATH,
    };

    // Test 4: Try basic Puppeteer launch
    try {
      console.log('[TEST-CHROMIUM] Attempting basic Puppeteer launch...');
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      diagnostics.puppeteerLaunchSuccess = true;
      console.log('[TEST-CHROMIUM] Puppeteer launch successful');
      
      // Quick test
      const page = await browser.newPage();
      await page.goto('data:text/html,<h1>Test</h1>');
      const title = await page.title();
      diagnostics.pageTestSuccess = true;
      diagnostics.pageTitle = title;
      
      await page.close();
      await browser.close();
      console.log('[TEST-CHROMIUM] Browser test completed successfully');
      
    } catch (error: any) {
      diagnostics.puppeteerLaunchError = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...Object.getOwnPropertyNames(error).reduce((acc, key) => {
          try {
            acc[key] = error[key];
          } catch (e) {
            acc[key] = `[Unable to serialize: ${e instanceof Error ? e.message : String(e)}]`;
          }
          return acc;
        }, {} as any)
      };
      console.log('[TEST-CHROMIUM] Puppeteer launch failed:', error);
    }

    return NextResponse.json({
      success: true,
      diagnostics
    });

  } catch (error: any) {
    console.error('[TEST-CHROMIUM] Diagnostic error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}