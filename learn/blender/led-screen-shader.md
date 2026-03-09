# Blender LED Screen Shader Tutorial

> Based on [@moonstarlim](https://www.instagram.com/moonstarlim/)'s tutorial
> Source: https://www.instagram.com/p/DKM_w3mIqAg/

**Prerequisites:** Comfortable with Blender's Shader Editor.

## Step 1 — Prepare your texture image

Use a black-and-white image where:
- **White** = background
- **Black** = the pattern/design (e.g. a pixel heart)

Any simple pixel art works great.

## Step 2 — Create a new material

- Select your screen object
- Create a **new material**
- **Delete the default Principled BSDF** node (we'll build from scratch)

## Step 3 — Build the LED background

Add these three shader nodes:
1. **Voronoi Texture** — creates the LED dot grid
2. **Color Ramp** — controls the dot colors
3. **Glossy BSDF** — gives the surface a reflective look

## Step 4 — Configure the LED grid

- Connect: `Voronoi Texture -> Color Ramp -> Glossy BSDF (Color) -> Material Output`
- **Voronoi Texture settings:**
  - Scale: **35.000** (controls LED density — higher = smaller dots)
  - Randomness: **0** (makes a perfect grid pattern)
- **Color Ramp:** Set your background colors (dark tones for the unlit screen areas)

## Step 5 — Add the Image Texture

- Add an **Image Texture** node
- Open your black-and-white pattern image from Step 1
- Settings: Linear, Flat, Repeat

## Step 6 — Combine with Mix Shader

- Add a **Mix Shader** node
- Connect the **Image Texture** to the **Fac** input of the Mix Shader
- Connect the **Glossy BSDF** (background) to one Shader input of the Mix Shader
- The Mix Shader goes to the **Material Output**

## Step 7 — Add the glowing LEDs

- **Duplicate** the Color Ramp from the background (to keep the same dot proportions)
- Add an **Emission** shader
- Connect: `Voronoi Texture -> copied Color Ramp -> Emission (Color)`
- Plug the **Emission** into the second Shader input of the **Mix Shader**

## Step 8 — Set colors and glow strength

- Pick the **Emission color** you want for your LED pattern (pink, green, purple, etc.)
- Set **Emission Strength to 5** (this makes the LEDs glow brightly)

## Node Chain Summary

```
Voronoi Texture ----> Color Ramp (bg) ----> Glossy BSDF ----> Mix Shader ----> Material Output
       |                                                          ^
       +-------> Color Ramp (copy) ----> Emission (str: 5) ------+
                                                                  ^
Image Texture -----------------------------------------> Fac ----+
```

## Tips

- The **Voronoi scale** controls how many LED dots you see — increase for finer pixels
- Swap out the image texture for different designs
- Change the Emission color for different LED colors per screen
- Model the screen housing (metallic frame) separately
