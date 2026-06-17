# Trasier Technology Civic Site - Screens & Assets

This repository contains the exported design system tokens, guidelines, layout codes, shaders, and image assets for the **Trasier Technology Civic Site** project (Stitch Project ID: `699518231232961565`).

---

## 📁 File Structure

* **`cyan_sentinel_design_system.md`**
  * The visual and brand guidelines for the **Cyan Sentinel** theme (typography definitions, color mode rules, glassmorphic layout standards, shapes, and component design patterns).
* **`cyan_sentinel_design_system.json`**
  * Foundational design tokens (palette hex values, spacing scales, and typography configuration) exported as JSON for programmatic use or theme integration.
* **`trasier_technology_homepage.html`**
  * The main interactive landing page screen. Built with Tailwind CSS, custom interactive cursors, GSAP scroll-triggered animations, and a high-performance WebGL blueprint background grid.
* **`shader.html`**
  * The standalone mouse-interactive WebGL blueprint grid shader canvas page.
* **`whatsapp_image.jpeg`**
  * The source image assets referenced in the project mockup.

---

## 🚀 How to Run and Preview Locally

Since the screens are built using vanilla HTML, Tailwind CSS via CDN, and client-side JavaScript, you can open and run them directly in your web browser.

### Option 1: Direct File Preview
Double-click `trasier_technology_homepage.html` or `shader.html` to open them directly in any modern web browser.

### Option 2: Run a Local Development Server (Recommended)
Running a local server ensures that assets, WebGL shaders, and script CDNs load optimally.

**Using Python:**
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000/trasier_technology_homepage.html` in your browser.

**Using Node.js (`npx`):**
```bash
npx live-server
```

---

## 🛠️ Editing & Customize Guidelines

### 1. Customizing the Design Theme
The landing page HTML uses the **Cyan Sentinel** design system tokens injected directly into the Tailwind configuration script block at the top of the file:
```html
<script id="tailwind-config">
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    primary: "#a8e8ff",
                    surface: "#0a0f1e",
                    // ... other theme tokens
                }
            }
        }
    }
</script>
```
To update colors, spacing, or roundness, modify the Tailwind configuration block using values from `cyan_sentinel_design_system.json`.

### 2. Modifying Animations (GSAP)
Smooth reveal effects, scroll actions, and cursor trails are managed by **GSAP (GreenSock Animation Platform)** scripts located at the bottom of the `trasier_technology_homepage.html` file.
* To alter the custom cursor trail speed, edit the `window.addEventListener('mousemove', ...)` duration.
* To adjust page element reveals on scroll, edit the `gsap.utils.toArray('.glass-card').forEach(...)` duration or viewport triggers.

### 3. Modifying the WebGL Canvas Shader
The futuristic neon grid overlay is rendered via a custom fragment shader inside the canvas script block.
* Open `shader.html` or `trasier_technology_homepage.html`.
* Search for the variable `fs` (Fragment Shader source code string).
* You can adjust grid lines frequency (e.g. modify the `grid` resolution argument in `main()`), glow radius, or base colors (`vec3 color = vec3(...)`) to refine the hud blueprint background style.
