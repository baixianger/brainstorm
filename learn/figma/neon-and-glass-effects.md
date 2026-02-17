# Figma - Neon Glow & Glass Effects

Techniques for creating shining, neon, and glass effects in Figma. Learned while building the ccOpener-ghostty app icon.

## Core Principle

**Brightness comes from shadow diffusion, not fill opacity.** Keep the shape semi-transparent so underlying textures show through, and use stacked Drop Shadows to create the glow.

## Neon Glow Effect

### Basic Setup

1. Place elements on a **dark background** (`#0D0D0D` or `#1A1118`)
2. Use **bright saturated colors** for fills

### Standard Neon (Opaque)

- Fill: bright neon color (e.g. `#FF6A35`)
- Stack 3 Drop Shadows with increasing blur and decreasing opacity:

| Layer | Color | Blur | Opacity | Purpose |
|-------|-------|------|---------|---------|
| Shadow 1 | neon color | **30px** | **90%** | tight inner glow |
| Shadow 2 | darker shade | **70px** | **60%** | mid spread |
| Shadow 3 | darkest shade | **120px** | **30%** | ambient light |

- Optional: duplicate shape, fill `#FFFFFF` at 30-40% opacity, Layer Blur 2-4px, place on top → creates the "hot white core" of neon

### Transparent Neon (show texture underneath)

When you need the glow but also want background patterns (e.g. halftone dots, grids) to show through:

1. **Fill**: neon color at **60-70% opacity** (not 100%)
2. **No Layer Blur** on the main shape (preserves crispness)
3. Stack Drop Shadows for the glow — same as above but push even harder:

| Layer | Color | Blur | Opacity |
|-------|-------|------|---------|
| Shadow 1 | lighter shade | **15px** | **100%** |
| Shadow 2 | mid shade | **50px** | **70%** |
| Shadow 3 | deep shade | **100px** | **35%** |

4. **Overlay highlight layer**: duplicate shape on top, fill `#FFFFFF` at **15-20% opacity**, blend mode **Overlay** or **Screen** — brightens the shape without killing transparency

### Color Palettes for Neon

| Theme | Fill | Shadow 1 | Shadow 2 | Shadow 3 |
|-------|------|----------|----------|----------|
| Claude Orange | `#FF8855` | `#FFAA66` | `#FF6622` | `#FF4400` |
| Cyan | `#00FFD4` | `#00FFD4` | `#00CCAA` | `#008866` |
| Pink | `#FF44AA` | `#FF44AA` | `#FF0088` | `#CC0066` |
| Blue | `#4AA8FF` | `#4AA8FF` | `#2288FF` | `#0066FF` |

## Glass Border Effect

Creates a subtle shiny glass-like outline around a shape:

1. **Duplicate** the shape
2. **Remove fill** entirely
3. **Stroke**: `#FFFFFF`, **1.5-2px**, opacity **25-35%**
4. Add to the stroke layer:
   - Drop Shadow: neon color, blur **10-15px**, opacity **40-50%**
   - Optional Inner Shadow: `#FFFFFF`, blur **4px**, opacity **30%** (glass refraction)

For a quicker approach: add the stroke directly on the main layer instead of duplicating.

## Glass / Frosted Panel Effect

For glassmorphism cards and panels:

1. Fill: `#FFFFFF` at **10-20% opacity**
2. **Background Blur**: **15-40px**
3. Stroke: `#FFFFFF` at **10-20% opacity**, **1px**
4. Optional: Inner Shadow with `#FFFFFF` for a top-light reflection

## Tips

- **Scale blur values proportionally to icon size.** A 512px icon needs 40-100px blurs. A 20px blur on a large icon won't be visible.
- **Layer Blur on the main shape makes it fuzzy** — only use it for the white "hot core" overlay, not the main element.
- **Blend modes matter**: Overlay and Screen on highlight layers add brightness without reducing transparency.
- **Sharp shape + massive soft glow = neon.** Never blur the main shape itself.
- Busy backgrounds (halftone, grids) compete with glow — make them subtler or darker if the neon isn't reading well.
