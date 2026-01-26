/**
 * Mobile Render Utilities
 * 
 * Enhanced React Testing Library utilities for mobile testing
 */

import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement } from 'react';
import { setViewport, ViewportSize, VIEWPORTS } from './viewport';

/**
 * Options for mobile rendering
 */
export interface MobileRenderOptions extends RenderOptions {
  viewport?: ViewportSize;
  width?: number;
  height?: number;
}

/**
 * Render a component with mobile viewport settings
 * @param ui - React component to render
 * @param options - Render options including viewport settings
 */
export function renderMobile(
  ui: ReactElement,
  options?: MobileRenderOptions
): RenderResult {
  // Set viewport before rendering
  if (options?.viewport) {
    setViewport(options.viewport.width, options.viewport.height);
  } else if (options?.width && options?.height) {
    setViewport(options.width, options.height);
  } else {
    // Default to iPhone 12 size
    setViewport(VIEWPORTS.IPHONE_12.width, VIEWPORTS.IPHONE_12.height);
  }
  
  // Render component
  return render(ui, options);
}

/**
 * Render a component at iPhone SE viewport (320px)
 */
export function renderAtIPhoneSE(
  ui: ReactElement,
  options?: Omit<MobileRenderOptions, 'viewport'>
): RenderResult {
  return renderMobile(ui, { ...options, viewport: VIEWPORTS.IPHONE_SE });
}

/**
 * Render a component at iPhone 12 viewport (390px)
 */
export function renderAtIPhone12(
  ui: ReactElement,
  options?: Omit<MobileRenderOptions, 'viewport'>
): RenderResult {
  return renderMobile(ui, { ...options, viewport: VIEWPORTS.IPHONE_12 });
}

/**
 * Render a component at iPhone Pro Max viewport (428px)
 */
export function renderAtIPhoneProMax(
  ui: ReactElement,
  options?: Omit<MobileRenderOptions, 'viewport'>
): RenderResult {
  return renderMobile(ui, { ...options, viewport: VIEWPORTS.IPHONE_12_PRO_MAX });
}

/**
 * Render a component at iPad viewport (768px)
 */
export function renderAtIPad(
  ui: ReactElement,
  options?: Omit<MobileRenderOptions, 'viewport'>
): RenderResult {
  return renderMobile(ui, { ...options, viewport: VIEWPORTS.IPAD });
}

/**
 * Render a component at desktop viewport (1024px)
 */
export function renderAtDesktop(
  ui: ReactElement,
  options?: Omit<MobileRenderOptions, 'viewport'>
): RenderResult {
  return renderMobile(ui, { ...options, viewport: VIEWPORTS.DESKTOP_SM });
}

/**
 * Test helper to render component at multiple viewports
 * @param ui - React component to render
 * @param viewports - Array of viewports to test
 * @param testFn - Test function to run at each viewport
 */
export function renderAtMultipleViewports(
  ui: ReactElement,
  viewports: ViewportSize[],
  testFn: (result: RenderResult, viewport: ViewportSize) => void | Promise<void>
): void {
  viewports.forEach((viewport) => {
    it(`renders correctly at ${viewport.name} (${viewport.width}x${viewport.height})`, async () => {
      const result = renderMobile(ui, { viewport });
      await testFn(result, viewport);
    });
  });
}

/**
 * Mock touch events for testing
 */
export function mockTouchEvents(): void {
  // Mock touch event support
  Object.defineProperty(window, 'ontouchstart', {
    writable: true,
    value: () => {},
  });
  
  // Mock pointer type as coarse (touch)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query === '(pointer: coarse)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

/**
 * Simulate touch event on an element
 * @param element - DOM element
 * @param eventType - Touch event type
 */
export function simulateTouchEvent(
  element: HTMLElement,
  eventType: 'touchstart' | 'touchend' | 'touchmove' = 'touchstart'
): void {
  const touchEvent = new TouchEvent(eventType, {
    bubbles: true,
    cancelable: true,
    touches: [
      {
        identifier: 0,
        target: element,
        clientX: 0,
        clientY: 0,
        screenX: 0,
        screenY: 0,
        pageX: 0,
        pageY: 0,
        radiusX: 0,
        radiusY: 0,
        rotationAngle: 0,
        force: 1,
      } as Touch,
    ],
  });
  
  element.dispatchEvent(touchEvent);
}

/**
 * Check if element has touch-friendly styling
 * @param element - DOM element
 */
export function hasTouchFriendlyStyling(element: HTMLElement): boolean {
  const styles = window.getComputedStyle(element);
  const touchAction = styles.getPropertyValue('touch-action');
  
  // Check for touch-action: manipulation (prevents double-tap zoom)
  return touchAction === 'manipulation' || touchAction === 'none';
}

/**
 * Wait for viewport resize to complete
 */
export async function waitForViewportResize(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 100);
  });
}

/**
 * Get computed styles for an element
 * @param element - DOM element
 */
export function getComputedStyles(element: HTMLElement): CSSStyleDeclaration {
  return window.getComputedStyle(element);
}

/**
 * Check if element uses glassmorphism styling
 * @param element - DOM element
 */
export function hasGlasmorphism(element: HTMLElement): boolean {
  const styles = getComputedStyles(element);
  const backdropFilter = styles.getPropertyValue('backdrop-filter');
  const webkitBackdropFilter = styles.getPropertyValue('-webkit-backdrop-filter');
  
  return (
    backdropFilter.includes('blur') ||
    webkitBackdropFilter.includes('blur')
  );
}

/**
 * Check if element has proper mobile spacing
 * @param element - DOM element
 * @param minPadding - Minimum padding in pixels
 */
export function hasMobileSpacing(element: HTMLElement, minPadding: number = 16): boolean {
  const styles = getComputedStyles(element);
  const padding = parseInt(styles.getPropertyValue('padding'), 10);
  
  return padding >= minPadding;
}

/**
 * Check if text is readable on mobile (minimum 14px)
 * @param element - DOM element
 */
export function hasReadableFontSize(element: HTMLElement): boolean {
  const styles = getComputedStyles(element);
  const fontSize = parseInt(styles.getPropertyValue('font-size'), 10);
  
  return fontSize >= 14;
}

/**
 * Check if element is scrollable
 * @param element - DOM element
 */
export function isScrollable(element: HTMLElement): boolean {
  const styles = getComputedStyles(element);
  const overflowY = styles.getPropertyValue('overflow-y');
  const overflowX = styles.getPropertyValue('overflow-x');
  
  return (
    overflowY === 'auto' ||
    overflowY === 'scroll' ||
    overflowX === 'auto' ||
    overflowX === 'scroll'
  );
}

/**
 * Check if element has momentum scrolling (iOS)
 * @param element - DOM element
 */
export function hasMomentumScrolling(element: HTMLElement): boolean {
  const styles = getComputedStyles(element);
  const webkitOverflowScrolling = styles.getPropertyValue('-webkit-overflow-scrolling');
  const scrollBehavior = styles.getPropertyValue('scroll-behavior');
  
  return webkitOverflowScrolling === 'touch' || scrollBehavior === 'smooth';
}

/**
 * Check if modal is full-screen on mobile
 * @param modal - Modal element
 */
export function isFullScreenModal(modal: HTMLElement): boolean {
  const rect = modal.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Allow small margin for rounding
  const isFullWidth = Math.abs(rect.width - viewportWidth) < 10;
  const isFullHeight = Math.abs(rect.height - viewportHeight) < 10;
  
  return isFullWidth && isFullHeight;
}

/**
 * Check if form fields are stacked vertically
 * @param form - Form element
 */
export function hasVerticalFormLayout(form: HTMLElement): boolean {
  const inputs = form.querySelectorAll('input, select, textarea');
  
  if (inputs.length < 2) return true;
  
  // Check if inputs are stacked (each input starts below the previous one)
  for (let i = 1; i < inputs.length; i++) {
    const prevRect = inputs[i - 1].getBoundingClientRect();
    const currRect = inputs[i].getBoundingClientRect();
    
    // If current input starts at or above previous input, not stacked
    if (currRect.top <= prevRect.top) {
      return false;
    }
  }
  
  return true;
}
