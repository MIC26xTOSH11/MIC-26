# Enhanced Landing Page - Buzzworthy & Poppr.be Integration

## Overview
The landing page now features advanced animations inspired by Buzzworthy Studio and Poppr.be, creating an immersive and engaging experience.

## Features Implemented

### 1. **BlobCanvas Component** (`components/BlobCanvas.jsx`)
- Generative SVG-like blobs rendered on HTML5 Canvas
- Smooth morphing animations with elastic easing
- Random blob generation with customizable colors (gold, teal, cyan)
- Ooze load animation with staggered scale and rotation
- Continuous morph cycle for organic movement

### 2. **HexGrid Component** (`components/HexGrid.jsx`)
- 20x20 hexagonal beehive grid (400 hexagons total)
- Procedural color generation (teal to gold gradient based on distance from center)
- Scroll-velocity-based animations (buzz, pulse, scale, rotation)
- Interactive hover effects with elastic easing
- GSAP ScrollTrigger integration for performance

### 3. **WebGLOrbs Component** (`components/WebGLOrbs.jsx`)
- 50 pulsing spherical orbs using Three.js
- Random HSL colors (gold-teal-purple spectrum: hue 60-300)
- Gentle floating animation with boundary bounce
- Hamburger menu burst: orbs orbit in a circle on menu open
- Smooth transitions with GSAP animations

### 4. **Enhanced Landing Page** (`app/page.js`)
- Dynamic gradient background that shifts from gold (hue 60) to purple (hue 300) based on scroll progress
- Zero-G warp effects: elements stretch, skew, and translate based on scroll velocity
- Parallax scrolling with multiple layers at different speeds
- Hamburger menu with smooth transitions and backdrop blur
- Responsive design with mobile-first approach
- Integration of all three animation components

## Technical Stack

- **GSAP** (with ScrollTrigger): Advanced scroll-based animations and morphing
- **Three.js**: WebGL rendering for 3D orbs
- **React/Next.js**: Component-based architecture with SSR support
- **Dynamic Imports**: Components loaded client-side only to avoid SSR issues
- **CSS-in-JS**: Inline styles for dynamic color calculations

## Key Animation Details

### Blob Morphing
- Uses quadratic Bezier curves for smooth blob shapes
- 8 control points per blob
- Morphs to new random shapes every 2-4 seconds
- Elastic easing (elastic.out(1, 0.5)) for natural movement

### Hexagon Grid
- Clip-path CSS for hexagon shapes
- Distance-based coloring from center
- Velocity-dependent scaling and rotation
- Staggered animations based on position

### WebGL Orbs
- 16-segment spheres for performance
- Sine wave pulsing based on elapsed time + phase offset
- Orbit animation uses circular trigonometry (cos/sin)
- Elastic easing for burst effect

### Zero-G Scroll Warp
- `scaleX`: 1 + velocity * 0.1 (horizontal stretch)
- `skewY`: velocity * 0.5 (shear effect)
- `yPercent`: velocity * 2 (vertical displacement)
- Applied to all `.warp-element` classes

## Color Palette

- **Deep Navy/Slate**: Base background (hsl(225, 30%, 8%))
- **Honey Gold**: Primary accent (hsl(48, 70%, 60%))
- **Electric Teal/Cyan**: Secondary accent (hsl(180-192, 70%, 60%))
- **Purple**: Tertiary for gradients (hsl(270-300, 70%, 60%))

## Performance Optimization

1. **RequestAnimationFrame**: All canvas animations use RAF for 60fps
2. **will-change**: CSS property on animated elements
3. **Dynamic Imports**: Heavy libraries loaded only when needed
4. **Throttled Scroll**: GSAP ScrollTrigger automatically throttles
5. **Mix-blend-mode**: Screen mode for visual effects without heavy compositing

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Usage

The components are automatically loaded on the main landing page (`/`). No additional setup required beyond the npm packages installed:

```bash
npm install gsap @gsap/react three locomotive-scroll
```

## Future Enhancements

- [ ] Add drag/click horizontal scrolling with Locomotive Scroll
- [ ] Implement snap-to-section behavior
- [ ] Add more interactive blob morphing on hover (morph to icon shapes)
- [ ] Create custom scroll bar with animated progress indicator
- [ ] Add sound effects for interactions (optional)
- [ ] Implement particle trails following cursor

## Credits

Inspired by:
- **Buzzworthy Studio**: Blob morphing, hexagonal grid, zero-G effects
- **Poppr.be**: WebGL orbs, cosmic gradients, menu burst animations
