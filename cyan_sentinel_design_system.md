# Cyan Sentinel Design System

## Style Guidelines

```markdown
---
name: Cyan Sentinel
colors:
  surface: '#0e1322'
  surface-dim: '#0e1322'
  surface-bright: '#343949'
  surface-container-lowest: '#090e1c'
  surface-container-low: '#161b2b'
  surface-container: '#1a1f2f'
  surface-container-high: '#25293a'
  surface-container-highest: '#2f3445'
  on-surface: '#dee1f7'
  on-surface-variant: '#bbc9cf'
  inverse-surface: '#dee1f7'
  inverse-on-surface: '#2b3040'
  outline: '#859398'
  outline-variant: '#3c494e'
  surface-tint: '#3cd7ff'
  primary: '#a8e8ff'
  on-primary: '#003642'
  primary-container: '#00d4ff'
  on-primary-container: '#00586b'
  inverse-primary: '#00677e'
  secondary: '#9ecaff'
  on-secondary: '#003258'
  secondary-container: '#005c9b'
  on-secondary-container: '#b2d4ff'
  tertiary: '#d1dfff'
  on-tertiary: '#0d2f60'
  tertiary-container: '#a7c3fd'
  on-tertiary-container: '#335082'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#b4ebff'
  primary-fixed-dim: '#3cd7ff'
  on-primary-fixed: '#001f27'
  on-primary-fixed-variant: '#004e5f'
  secondary-fixed: '#d1e4ff'
  secondary-fixed-dim: '#9ecaff'
  on-secondary-fixed: '#001d36'
  on-secondary-fixed-variant: '#00497c'
  tertiary-fixed: '#d7e2ff'
  tertiary-fixed-dim: '#acc7ff'
  on-tertiary-fixed: '#001a40'
  on-tertiary-fixed-variant: '#294678'
  background: '#0e1322'
  on-background: '#dee1f7'
  surface-variant: '#2f3445'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 16px
  grid-columns: '12'
---

## Brand & Style

The design system embodies a **Futuristic Civic Tech** aesthetic, blending high-stakes intelligence with civilian accessibility. It is engineered for precision and high-performance data visualization, drawing inspiration from the technical density of Linear and the authoritative presence of Palantir.

The visual style is a fusion of **Minimalism** and **Glassmorphism**, set against a deep, nocturnal canvas. It conveys a sense of "Mission Control"—where every pixel serves a functional purpose and every interaction feels reactive and intelligent. The brand personality is cold yet reliable, sharp yet inclusive, evoking a feeling of absolute technical supremacy and civic duty.

## Colors

The palette is anchored in a high-contrast dark mode. The **Near-black background (#0A0F1E)** provides a deep, void-like canvas that allows functional elements to emerge through luminosity rather than traditional color blocks.

**Cyan Glow (#00D4FF)** is the primary action color, used sparingly for critical feedback, active states, and interactive borders to simulate a HUD-like luminescence. **Deep Navy** and **Electric Blue** serve as structural colors, defining surface tiers and data groupings. Text is kept at **Pure White** for maximum legibility, with secondary information receding into muted steel-blue tones to maintain hierarchy.

## Typography

The typographic system utilizes a triple-font approach to balance impact with technical utility. **Hanken Grotesk** delivers sharp, aggressive headlines that command attention. **Inter** provides a highly legible, neutral foundation for long-form data and body content. **JetBrains Mono** is introduced for labels, metadata, and status indicators, reinforcing the developer-centric, high-tech narrative.

All display text should utilize tight tracking (letter-spacing) to emphasize the geometric construction of the glyphs, while labels use expanded tracking for a scanned, digital-readout effect.

## Layout & Spacing

This design system employs a **Fixed Grid** model on desktop and a **Fluid Grid** on mobile. The system is built on a 4px atomic unit, ensuring all components align to a strict geometric rhythm. 

- **Desktop:** 12-column grid with a maximum content width of 1440px. 24px gutters provide breathing room for complex data tables.
- **Subtle Grid Lines:** Backgrounds should optionally feature a faint 1px stroke cyan grid (5% opacity, 32px or 64px size) to emphasize the "blueprint" aesthetic.
- **Density:** High density is preferred. Content should be packed efficiently to allow for "at-a-glance" monitoring of multiple data streams.

## Elevation & Depth

Hierarchy is achieved through **Glassmorphism** and **Tonal Layering** rather than traditional drop shadows.

- **Base Layer:** The Near-black (#0A0F1E) foundation.
- **Surface Layer:** Deep Navy (#1B3A6B) at 40% opacity with a 20px backdrop blur. Borders are 1px solid Navy or Cyan.
- **Active Layer:** Elements that are hovered or focused gain a **Cyan Glow**. This is implemented as a `box-shadow: 0 0 12px rgba(0, 212, 255, 0.3)` and a 1px Cyan border.
- **Depth:** Higher elevation is represented by increased transparency and more intense backdrop blurs, making the element feel as if it is floating closer to the user on a glass pane.

## Shapes

The shape language is primarily **Soft (0.25rem)**. This slight rounding prevents the UI from feeling dangerously sharp while maintaining a professional, engineered look. 

Buttons and input fields use the base 4px radius. Larger containers like cards or modals may use **rounded-lg (8px)**. For specific "Status" indicators or tags, a pill shape can be used to differentiate them from functional UI buttons, but these should be used sparingly to avoid breaking the geometric rigor of the system.

## Components

### Buttons
Primary buttons are solid Cyan with black text for maximum contrast. Secondary buttons are ghost-style with a 1px Navy border that glows Cyan on hover. All buttons use `all-caps` labels in **JetBrains Mono** to reinforce the technical vibe.

### Input Fields
Inputs are dark, semi-transparent wells. The bottom border is a 2px stroke that illuminates in Cyan when focused. Placeholder text should use the Mono font at 50% opacity.

### Cards
Cards use the glassmorphic style: a Navy tint, backdrop blur, and a subtle 1px border. On hover, the border color shifts from Navy to Cyan.

### Chips & Status
Chips use a "Glitch" or "Scanline" texture background at very low opacity. Status indicators (Online/Offline) use a pulsing glow effect to simulate hardware LEDs.

### Data Visualization
Charts should strictly use the Primary Cyan and Secondary Electric Blue. Grid lines within charts should match the 5% opacity cyan used in the layout background. Use monospaced fonts for all numerical data.
```
