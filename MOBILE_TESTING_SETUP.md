# Mobile Testing Infrastructure Setup Guide

This guide explains how to set up and use the mobile testing infrastructure for the VPS-hosted Docker application.

## Overview

The mobile testing infrastructure includes:

1. **Viewport Testing Utilities** - Simulate different screen sizes in tests
2. **Mobile Render Helpers** - Enhanced React Testing Library utilities
3. **Visual Regression Testing** - Percy or Chromatic for screenshot comparison
4. **Performance Testing** - Lighthouse CI for automated performance checks
5. **Testing Checklist** - Comprehensive manual testing guide

## Installation

### Required Dependencies

The following dependencies are already installed in the project:

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "fast-check": "^3.0.0",
    "jest": "^29.7.0"
  }
}
```

### Optional Dependencies for Visual Regression

Choose one of the following:

#### Option 1: Percy (Recommended)

```bash
npm install --save-dev @percy/cli @percy/puppeteer
```

#### Option 2: Chromatic

```bash
npm install --save-dev chromatic
```

### Optional Dependencies for Lighthouse CI

```bash
npm install --save-dev @lhci/cli
```

## Configuration Files

### 1. Viewport Testing Utilities

Location: `__tests__/utils/viewport.ts`

Provides utilities for:
- Setting viewport sizes
- Predefined device viewports
- Checking viewport properties
- Testing at multiple viewports
- Validating touch target sizes

### 2. Mobile Render Helpers

Location: `__tests__/utils/mobile-render.tsx`

Provides utilities for:
- Rendering components at specific viewports
- Simulating touch events
- Checking mobile-specific styling
- Validating responsive behavior

### 3. Lighthouse CI Configuration

Location: `lighthouserc.json`

Configured for:
- Mobile preset with 4G throttling
- Performance score ≥90%
- First Contentful Paint <2s
- Cumulative Layout Shift <0.1
- Touch target validation

### 4. Percy Configuration

Location: `.percy.yml`

Configured for:
- Multiple viewport widths (320px to 1920px)
- JavaScript enabled
- Animation stabilization
- Dynamic content hiding

### 5. Chromatic Configuration

Location: `chromatic.config.json`

Configured for:
- Multiple viewport sizes
- Diff threshold settings
- Build configuration

## Usage

### Running Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Using Viewport Utilities

```typescript
import { setViewport, VIEWPORTS, getMobileViewports } from '@/__tests__/utils/viewport';

describe('Component Mobile Tests', () => {
  beforeEach(() => {
    // Set to iPhone 12 viewport
    setViewport(VIEWPORTS.IPHONE_12.width, VIEWPORTS.IPHONE_12.height);
  });
  
  afterEach(() => {
    // Restore default viewport
    restoreViewport();
  });
  
  it('should render correctly on mobile', () => {
    // Your test here
  });
});
```

### Using Mobile Render Helpers

```typescript
import { renderMobile, renderAtIPhone12 } from '@/__tests__/utils/mobile-render';
import MyComponent from '@/components/MyComponent';

describe('MyComponent Mobile', () => {
  it('should render at iPhone 12 viewport', () => {
    const { container } = renderAtIPhone12(<MyComponent />);
    
    // Assertions
    expect(container).toBeInTheDocument();
  });
  
  it('should render at custom viewport', () => {
    const { container } = renderMobile(<MyComponent />, {
      width: 375,
      height: 667
    });
    
    // Assertions
  });
});
```

### Testing at Multiple Viewports

```typescript
import { testAtViewports, getMobileViewports } from '@/__tests__/utils/viewport';
import { render } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

describe('MyComponent Responsive', () => {
  testAtViewports(getMobileViewports(), (viewport) => {
    it('should meet touch target requirements', () => {
      const { container } = render(<MyComponent />);
      
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      });
    });
  });
});
```

### Property-Based Testing Example

```typescript
import fc from 'fast-check';
import { VIEWPORTS, getMobileViewports } from '@/__tests__/utils/viewport';
import { renderMobile } from '@/__tests__/utils/mobile-render';
import MyComponent from '@/components/MyComponent';

// Feature: mobile-responsive-optimization, Property 1: Touch Target Minimum Size
describe('Touch Target Property', () => {
  it('should ensure all interactive elements meet 44x44px minimum', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1023 }), // Mobile viewport widths
        (viewportWidth) => {
          const { container } = renderMobile(<MyComponent />, {
            width: viewportWidth,
            height: 800
          });
          
          const interactiveElements = container.querySelectorAll(
            'button, a, input, [role="button"]'
          );
          
          interactiveElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            expect(rect.width).toBeGreaterThanOrEqual(44);
            expect(rect.height).toBeGreaterThanOrEqual(44);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Running Lighthouse CI

```bash
# Install Lighthouse CI globally (optional)
npm install -g @lhci/cli

# Run Lighthouse CI
lhci autorun

# Or add to package.json scripts
npm run lighthouse
```

Add to `package.json`:

```json
{
  "scripts": {
    "lighthouse": "lhci autorun"
  }
}
```

### Running Percy Visual Tests

```bash
# Set Percy token
export PERCY_TOKEN=your_percy_token

# Run Percy
npx percy exec -- npm test

# Or add to package.json scripts
npm run test:visual
```

Add to `package.json`:

```json
{
  "scripts": {
    "test:visual": "percy exec -- npm test"
  }
}
```

### Running Chromatic Visual Tests

```bash
# Set Chromatic project token
export CHROMATIC_PROJECT_TOKEN=your_token

# Run Chromatic
npx chromatic --project-token=your_token

# Or add to package.json scripts
npm run chromatic
```

Add to `package.json`:

```json
{
  "scripts": {
    "chromatic": "chromatic --exit-zero-on-changes"
  }
}
```

## Testing Patterns

### Pattern 1: Component Viewport Testing

Test a component at specific viewports:

```typescript
import { VIEWPORTS } from '@/__tests__/utils/viewport';
import { renderMobile } from '@/__tests__/utils/mobile-render';

describe('LeadsCards Mobile', () => {
  it('should display at iPhone SE viewport', () => {
    const { container } = renderMobile(<LeadsCards />, {
      viewport: VIEWPORTS.IPHONE_SE
    });
    
    expect(container.querySelector('.lead-card')).toBeInTheDocument();
  });
});
```

### Pattern 2: Touch Target Validation

Validate touch target sizes:

```typescript
import { meetsTouchTargetSize, getInteractiveElements } from '@/__tests__/utils/viewport';

it('should have touch-friendly buttons', () => {
  const { container } = renderMobile(<MyComponent />);
  
  const buttons = getInteractiveElements(container);
  buttons.forEach(button => {
    expect(meetsTouchTargetSize(button)).toBe(true);
  });
});
```

### Pattern 3: Modal Full-Screen Testing

Test modal full-screen behavior:

```typescript
import { isFullScreenModal } from '@/__tests__/utils/mobile-render';

it('should display modal full-screen on mobile', () => {
  const { container } = renderMobile(<MyModal isOpen={true} />);
  
  const modal = container.querySelector('[role="dialog"]');
  expect(isFullScreenModal(modal)).toBe(true);
});
```

### Pattern 4: Form Layout Testing

Test form vertical stacking:

```typescript
import { hasVerticalFormLayout } from '@/__tests__/utils/mobile-render';

it('should stack form fields vertically on mobile', () => {
  const { container } = renderMobile(<MyForm />);
  
  const form = container.querySelector('form');
  expect(hasVerticalFormLayout(form)).toBe(true);
});
```

### Pattern 5: Horizontal Overflow Testing

Test for unintended horizontal overflow:

```typescript
import { hasHorizontalOverflow } from '@/__tests__/utils/viewport';

it('should not have horizontal overflow', () => {
  const { container } = renderMobile(<MyPage />);
  
  expect(hasHorizontalOverflow(container)).toBe(false);
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Mobile Testing

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test
      
      - name: Run Lighthouse CI
        run: |
          npm run build
          npm start &
          sleep 10
          npx @lhci/cli autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
      
      - name: Run Percy visual tests
        run: npx percy exec -- npm test
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

## Best Practices

### 1. Test at Multiple Viewports

Always test at the key breakpoints:
- 320px (iPhone SE)
- 390px (iPhone 12)
- 768px (iPad)
- 1024px (Desktop)

### 2. Use Property-Based Tests

Use property-based tests for universal properties:
- Touch target sizes
- No horizontal overflow
- Modal full-screen behavior
- Form vertical stacking

### 3. Use Unit Tests for Specific Cases

Use unit tests for specific examples:
- Specific viewport widths
- Edge cases
- Component interactions

### 4. Validate Desktop Preservation

Always verify desktop layout is unchanged:

```typescript
it('should preserve desktop layout at lg breakpoint', () => {
  const { container } = renderMobile(<MyComponent />, {
    viewport: VIEWPORTS.DESKTOP_SM
  });
  
  // Verify desktop-specific elements are visible
  expect(container.querySelector('.desktop-only')).toBeVisible();
});
```

### 5. Test Touch Interactions

Test touch-specific behavior:

```typescript
import { simulateTouchEvent } from '@/__tests__/utils/mobile-render';

it('should respond to touch events', () => {
  const { container } = renderMobile(<MyButton />);
  
  const button = container.querySelector('button');
  simulateTouchEvent(button, 'touchstart');
  
  // Verify touch feedback
});
```

## Troubleshooting

### Issue: Tests fail with viewport errors

**Solution**: Ensure viewport is set before rendering:

```typescript
beforeEach(() => {
  setViewport(390, 844);
});
```

### Issue: Touch target tests fail

**Solution**: Check that elements have proper sizing classes:

```tsx
<button className="min-w-[44px] min-h-[44px]">
  Click me
</button>
```

### Issue: Modal full-screen tests fail

**Solution**: Verify modal has responsive classes:

```tsx
<div className="sm:max-w-full sm:h-screen sm:m-0">
  Modal content
</div>
```

### Issue: Lighthouse CI fails

**Solution**: Check performance optimizations:
- Image optimization
- Code splitting
- Lazy loading
- CSS optimization

## Resources

- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [fast-check Documentation](https://github.com/dubzzz/fast-check)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Percy Documentation](https://docs.percy.io/)
- [Chromatic Documentation](https://www.chromatic.com/docs/)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)

## Support

For questions or issues with the mobile testing infrastructure:

1. Check this documentation
2. Review the testing checklist
3. Examine existing test examples
4. Consult the design document for requirements

## Next Steps

1. Review the [Mobile Testing Checklist](./MOBILE_TESTING_CHECKLIST.md)
2. Run existing tests: `npm test`
3. Add mobile tests for your components
4. Set up visual regression testing (Percy or Chromatic)
5. Configure Lighthouse CI in your CI/CD pipeline
6. Perform manual testing on real devices
