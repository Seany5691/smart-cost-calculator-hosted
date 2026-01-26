/**
 * Viewport Testing Utilities
 * 
 * Utilities for simulating different screen sizes in tests
 * to verify mobile responsive behavior.
 */

export interface ViewportSize {
  width: number;
  height: number;
  name: string;
  description: string;
}

/**
 * Standard viewport sizes for testing mobile responsive design
 */
export const VIEWPORTS = {
  // Mobile devices (portrait)
  IPHONE_SE: {
    width: 320,
    height: 568,
    name: 'iPhone SE',
    description: 'Smallest modern iPhone in portrait',
  },
  IPHONE_12: {
    width: 390,
    height: 844,
    name: 'iPhone 12/13',
    description: 'Standard iPhone in portrait',
  },
  IPHONE_12_PRO_MAX: {
    width: 428,
    height: 926,
    name: 'iPhone 12/13 Pro Max',
    description: 'Large iPhone in portrait',
  },
  
  // Tablets
  IPAD: {
    width: 768,
    height: 1024,
    name: 'iPad',
    description: 'iPad in portrait',
  },
  IPAD_PRO: {
    width: 1024,
    height: 1366,
    name: 'iPad Pro',
    description: 'iPad Pro in portrait',
  },
  
  // Desktop
  DESKTOP_SM: {
    width: 1024,
    height: 768,
    name: 'Small Desktop',
    description: 'Desktop at lg breakpoint',
  },
  DESKTOP_MD: {
    width: 1280,
    height: 800,
    name: 'Medium Desktop',
    description: 'Desktop at xl breakpoint',
  },
  DESKTOP_LG: {
    width: 1920,
    height: 1080,
    name: 'Large Desktop',
    description: 'Full HD desktop',
  },
} as const;

/**
 * Tailwind CSS breakpoints for reference
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

/**
 * Set the viewport size for testing
 * @param width - Viewport width in pixels
 * @param height - Viewport height in pixels
 */
export function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
}

/**
 * Set viewport to a predefined size
 * @param viewport - Predefined viewport configuration
 */
export function setViewportTo(viewport: ViewportSize): void {
  setViewport(viewport.width, viewport.height);
}

/**
 * Check if current viewport is mobile (<1024px)
 */
export function isMobileViewport(): boolean {
  return window.innerWidth < BREAKPOINTS.LG;
}

/**
 * Check if current viewport is tablet (768px - 1023px)
 */
export function isTabletViewport(): boolean {
  return window.innerWidth >= BREAKPOINTS.MD && window.innerWidth < BREAKPOINTS.LG;
}

/**
 * Check if current viewport is desktop (>=1024px)
 */
export function isDesktopViewport(): boolean {
  return window.innerWidth >= BREAKPOINTS.LG;
}

/**
 * Get all mobile viewport sizes for testing
 */
export function getMobileViewports(): ViewportSize[] {
  return [
    VIEWPORTS.IPHONE_SE,
    VIEWPORTS.IPHONE_12,
    VIEWPORTS.IPHONE_12_PRO_MAX,
    VIEWPORTS.IPAD,
  ];
}

/**
 * Get all desktop viewport sizes for testing
 */
export function getDesktopViewports(): ViewportSize[] {
  return [
    VIEWPORTS.DESKTOP_SM,
    VIEWPORTS.DESKTOP_MD,
    VIEWPORTS.DESKTOP_LG,
  ];
}

/**
 * Get all viewport sizes for comprehensive testing
 */
export function getAllViewports(): ViewportSize[] {
  return [
    ...getMobileViewports(),
    ...getDesktopViewports(),
  ];
}

/**
 * Restore viewport to default size
 */
export function restoreViewport(): void {
  setViewport(1024, 768);
}

/**
 * Create a viewport test helper that runs a test at multiple viewport sizes
 * @param viewports - Array of viewports to test
 * @param testFn - Test function to run at each viewport
 */
export function testAtViewports(
  viewports: ViewportSize[],
  testFn: (viewport: ViewportSize) => void | Promise<void>
): void {
  viewports.forEach((viewport) => {
    describe(`at ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      beforeEach(() => {
        setViewportTo(viewport);
      });
      
      afterEach(() => {
        restoreViewport();
      });
      
      testFn(viewport);
    });
  });
}

/**
 * Match media query mock for testing
 * @param query - Media query string
 */
export function mockMatchMedia(query: string): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((q: string) => ({
      matches: q === query,
      media: q,
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
 * Check if an element has horizontal overflow
 * @param element - DOM element to check
 */
export function hasHorizontalOverflow(element: HTMLElement): boolean {
  return element.scrollWidth > element.clientWidth;
}

/**
 * Check if an element is within viewport bounds
 * @param element - DOM element to check
 */
export function isWithinViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.left >= 0 &&
    rect.right <= window.innerWidth &&
    rect.top >= 0 &&
    rect.bottom <= window.innerHeight
  );
}

/**
 * Get element dimensions
 * @param element - DOM element
 */
export function getElementDimensions(element: HTMLElement): {
  width: number;
  height: number;
} {
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Check if element meets minimum touch target size (44x44px)
 * @param element - DOM element to check
 */
export function meetsTouchTargetSize(element: HTMLElement): boolean {
  const { width, height } = getElementDimensions(element);
  return width >= 44 && height >= 44;
}

/**
 * Get all interactive elements in a container
 * @param container - Container element
 */
export function getInteractiveElements(container: HTMLElement): HTMLElement[] {
  const selector = 'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selector));
}

/**
 * Check if all interactive elements meet touch target size
 * @param container - Container element
 */
export function allInteractiveElementsMeetTouchTarget(container: HTMLElement): boolean {
  const elements = getInteractiveElements(container);
  return elements.every(meetsTouchTargetSize);
}
