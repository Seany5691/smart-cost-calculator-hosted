# Mobile Testing Utilities

This directory contains utilities for testing mobile responsive behavior in the VPS-hosted Docker application.

## Files

### viewport.ts

Viewport testing utilities for simulating different screen sizes.

**Key Functions:**
- `setViewport(width, height)` - Set viewport size
- `setViewportTo(viewport)` - Set to predefined viewport
- `isMobileViewport()` - Check if current viewport is mobile
- `meetsTouchTargetSize(element)` - Validate 44x44px minimum
- `getInteractiveElements(container)` - Get all interactive elements
- `hasHorizontalOverflow(element)` - Check for overflow

**Predefined Viewports:**
- `VIEWPORTS.IPHONE_SE` - 320x568
- `VIEWPORTS.IPHONE_12` - 390x844
- `VIEWPORTS.IPHONE_12_PRO_MAX` - 428x926
- `VIEWPORTS.IPAD` - 768x1024
- `VIEWPORTS.IPAD_PRO` - 1024x1366
- `VIEWPORTS.DESKTOP_SM` - 1024x768
- `VIEWPORTS.DESKTOP_MD` - 1280x800
- `VIEWPORTS.DESKTOP_LG` - 1920x1080

**Breakpoints:**
- `BREAKPOINTS.SM` - 640px
- `BREAKPOINTS.MD` - 768px
- `BREAKPOINTS.LG` - 1024px
- `BREAKPOINTS.XL` - 1280px

### mobile-render.tsx

Enhanced React Testing Library utilities for mobile testing.

**Key Functions:**
- `renderMobile(ui, options)` - Render at mobile viewport
- `renderAtIPhoneSE(ui)` - Render at 320px
- `renderAtIPhone12(ui)` - Render at 390px
- `renderAtIPhoneProMax(ui)` - Render at 428px
- `renderAtIPad(ui)` - Render at 768px
- `renderAtDesktop(ui)` - Render at 1024px
- `simulateTouchEvent(element)` - Simulate touch
- `isFullScreenModal(modal)` - Check modal full-screen
- `hasVerticalFormLayout(form)` - Check form stacking
- `hasReadableFontSize(element)` - Check 14px minimum
- `hasGlasmorphism(element)` - Check backdrop blur

## Usage Examples

### Basic Viewport Testing

```typescript
import { setViewport, VIEWPORTS } from '@/__tests__/utils/viewport';

describe('Component', () => {
  beforeEach(() => {
    setViewport(VIEWPORTS.IPHONE_12.width, VIEWPORTS.IPHONE_12.height);
  });
  
  it('should render on mobile', () => {
    // Test here
  });
});
```

### Mobile Render Helper

```typescript
import { renderAtIPhone12 } from '@/__tests__/utils/mobile-render';

it('should render at iPhone 12 viewport', () => {
  const { container } = renderAtIPhone12(<MyComponent />);
  expect(container).toBeInTheDocument();
});
```

### Touch Target Validation

```typescript
import { meetsTouchTargetSize, getInteractiveElements } from '@/__tests__/utils/viewport';

it('should have touch-friendly buttons', () => {
  const { container } = renderAtIPhone12(<MyComponent />);
  
  const buttons = getInteractiveElements(container);
  buttons.forEach(button => {
    expect(meetsTouchTargetSize(button)).toBe(true);
  });
});
```

### Multiple Viewport Testing

```typescript
import { testAtViewports, getMobileViewports } from '@/__tests__/utils/viewport';

describe('Responsive Component', () => {
  testAtViewports(getMobileViewports(), (viewport) => {
    it('should render correctly', () => {
      // Test at each viewport
    });
  });
});
```

### Modal Full-Screen Testing

```typescript
import { isFullScreenModal } from '@/__tests__/utils/mobile-render';

it('should display modal full-screen on mobile', () => {
  const { container } = renderAtIPhone12(<MyModal isOpen={true} />);
  
  const modal = container.querySelector('[role="dialog"]');
  expect(isFullScreenModal(modal)).toBe(true);
});
```

### Form Layout Testing

```typescript
import { hasVerticalFormLayout } from '@/__tests__/utils/mobile-render';

it('should stack form fields vertically', () => {
  const { container } = renderAtIPhone12(<MyForm />);
  
  const form = container.querySelector('form');
  expect(hasVerticalFormLayout(form)).toBe(true);
});
```

## Best Practices

1. **Always restore viewport after tests**
   ```typescript
   afterEach(() => {
     restoreViewport();
   });
   ```

2. **Test at key breakpoints**
   - 320px (iPhone SE)
   - 390px (iPhone 12)
   - 768px (iPad)
   - 1024px (Desktop)

3. **Use property-based tests for universal properties**
   - Touch target sizes
   - No horizontal overflow
   - Modal behavior
   - Form layouts

4. **Use unit tests for specific cases**
   - Specific viewport widths
   - Edge cases
   - Component interactions

5. **Validate desktop preservation**
   ```typescript
   it('should preserve desktop layout', () => {
     const { container } = renderAtDesktop(<MyComponent />);
     // Verify desktop-specific elements
   });
   ```

## Testing Checklist

- [ ] Component renders at all mobile viewports
- [ ] Interactive elements meet 44x44px minimum
- [ ] No horizontal overflow on mobile
- [ ] Modals are full-screen on mobile
- [ ] Forms stack vertically on mobile
- [ ] Text is readable (14px minimum)
- [ ] Desktop layout preserved at ≥1024px
- [ ] Touch events work correctly
- [ ] Glassmorphism effects render
- [ ] Spacing is consistent

## Related Documentation

- [Mobile Testing Setup Guide](../../MOBILE_TESTING_SETUP.md)
- [Mobile Testing Checklist](../../MOBILE_TESTING_CHECKLIST.md)
- [Design Document](.kiro/specs/mobile-responsive-optimization/design.md)
- [Requirements](.kiro/specs/mobile-responsive-optimization/requirements.md)

## Support

For questions or issues:
1. Check the setup guide
2. Review example tests
3. Consult the design document
4. Review the testing checklist
