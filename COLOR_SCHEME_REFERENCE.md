# Application Color Scheme Reference

## Overview
Each major section of the Smart Cost Calculator has a unique color theme to help users visually distinguish between different areas of the application. All sections share the same glassmorphism design system and animated blob effects, but with different color palettes.

## Color Themes by Section

### 🔵 Login & Dashboard (Blue/Indigo Theme)
**Background Gradient:**
```css
background: linear-gradient(to bottom right, #0f172a, #1e3a8a, #0f172a);
/* from-slate-900 via-blue-900 to-slate-900 */
```

**Animated Blobs:**
- Primary: Blue (`#3b82f6` / `bg-blue-500`)
- Secondary: Indigo (`#6366f1` / `bg-indigo-500`)
- Tertiary: Sky (`#0ea5e9` / `bg-sky-500`)

**Accent Colors:**
- Loading spinner: `text-blue-400`
- Links and highlights: `text-blue-400`, `text-indigo-400`

**Use Case:** Authentication and main dashboard/home screen

---

### 🟣 Calculator (Purple Theme)
**Background Gradient:**
```css
background: linear-gradient(to bottom right, #0f172a, #581c87, #0f172a);
/* from-slate-900 via-purple-900 to-slate-900 */
```

**Animated Blobs:**
- Primary: Purple (`#a855f7` / `bg-purple-500`)
- Secondary: Pink (`#ec4899` / `bg-pink-500`)
- Tertiary: Violet (`#8b5cf6` / `bg-violet-500`)

**Accent Colors:**
- Loading spinner: `text-purple-400`
- Links and highlights: `text-purple-400`, `text-pink-400`

**Use Case:** Cost calculation and proposal generation

---

### 🟢 Leads (Emerald/Green Theme)
**Background Gradient:**
```css
background: linear-gradient(to bottom right, #0f172a, #064e3b, #0f172a);
/* from-slate-900 via-emerald-900 to-slate-900 */
```

**Animated Blobs:**
- Primary: Emerald (`#10b981` / `bg-emerald-500`)
- Secondary: Teal (`#14b8a6` / `bg-teal-500`)
- Tertiary: Green (`#22c55e` / `bg-green-500`)

**Accent Colors:**
- Loading spinner: `text-emerald-400`
- Links and highlights: `text-emerald-400`, `text-teal-400`

**Use Case:** Lead management, pipeline tracking, reminders

---

### 🔷 Scraper (Teal/Cyan Theme)
**Background Gradient:**
```css
background: linear-gradient(to bottom right, #0f172a, #134e4a, #0f172a);
/* from-slate-900 via-teal-900 to-slate-900 */
```

**Animated Blobs:**
- Primary: Teal (`#14b8a6` / `bg-teal-500`)
- Secondary: Cyan (`#06b6d4` / `bg-cyan-500`)
- Tertiary: Sky (`#0ea5e9` / `bg-sky-500`)

**Accent Colors:**
- Loading spinner: `text-teal-400`
- Links and highlights: `text-teal-400`, `text-cyan-400`

**Use Case:** Google Maps business data scraping

---

## Shared Design Elements

### Glassmorphism Cards
All sections use the same glassmorphism effect:
```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}
```

### Animated Blobs
All sections use the same blob animation:
```css
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}

.animate-blob {
  animation: blob 7s infinite;
  opacity: 0.2;
  filter: blur(40px);
}
```

**Staggered Delays:**
- Blob 1: 0s delay
- Blob 2: 2s delay (`animation-delay-2000`)
- Blob 3: 4s delay (`animation-delay-4000`)

### Text Styles
Consistent across all sections:
- Headings: `text-white`
- Body text: `text-gray-200`
- Labels: `text-gray-300`
- Descriptions: `text-gray-400`
- Gradient text: `gradient-text animate-gradient`

### Button Styles
Consistent button classes:
- Primary: `btn btn-primary` (purple-to-pink gradient)
- Secondary: `btn btn-secondary` (white/10 background)
- Success: `btn btn-success` (green-to-emerald gradient)
- Danger: `btn btn-danger` (red-to-rose gradient)
- Warning: `btn btn-warning` (amber-to-orange gradient)
- Info: `btn btn-info` (sky-to-blue gradient)

### Input Styles
Consistent input styling:
```css
.input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}
```

## Quick Reference Table

| Section | Via Color | Primary Blob | Secondary Blob | Tertiary Blob | Accent |
|---------|-----------|--------------|----------------|---------------|--------|
| Login/Dashboard | Blue-900 | Blue-500 | Indigo-500 | Sky-500 | Blue-400 |
| Calculator | Purple-900 | Purple-500 | Pink-500 | Violet-500 | Purple-400 |
| Leads | Emerald-900 | Emerald-500 | Teal-500 | Green-500 | Emerald-400 |
| Scraper | Teal-900 | Teal-500 | Cyan-500 | Sky-500 | Teal-400 |

## Implementation Notes

### Adding a New Section
To add a new section with a unique color theme:

1. Choose a unique "via" color (e.g., `via-orange-900`)
2. Select 3 complementary blob colors (e.g., `orange-500`, `amber-500`, `yellow-500`)
3. Choose an accent color for loading states (e.g., `orange-400`)
4. Apply the background gradient:
   ```tsx
   <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900">
   ```
5. Add the animated blobs with your chosen colors
6. Use the accent color for loading spinners and highlights

### Maintaining Consistency
- Always use `slate-900` as the base (from/to) color
- Keep blob opacity at 20%
- Use the same animation timing (7s cycle, 2s/4s delays)
- Maintain glassmorphism card styling
- Use consistent text colors (white, gray-200, gray-300, gray-400)

## Accessibility Notes

- All color combinations maintain WCAG AA contrast ratios for text
- Glassmorphism effects have sufficient contrast for readability
- Color is not the only indicator of section (navigation also provides context)
- Loading states use both color and animation for visibility

## Browser Support

All color effects are supported in:
- Chrome/Edge 88+
- Firefox 103+
- Safari 15.4+
- Opera 74+

Fallbacks are provided for older browsers through standard CSS gradients.
