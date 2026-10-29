# Transparent logo

Output: `frontend/assets/images/trasier-logo-transparent.png` (1254 × 1254 RGBA PNG).
Source retained: `frontend/assets/images/trasier-logo.jpeg`.
Mode: built-in image_gen edit, transparent background enabled.

## Edit prompt

Use case: background-extraction. Edit target: the supplied existing Trasier Tech owl logo. Remove only the off-white/white background and replace it with actual alpha transparency. Preserve the exact original owl illustration, branch, circuit lines, circular arc, facial details, blue/cyan gradients, black/navy strokes, and typography pixel-faithfully. The exact words remain TRASIER and TECH, with identical letterforms, spacing and position. Keep white/light-gray portions that belong inside the owl illustration. Make all background including gaps between letters/circuit/arc transparent with clean antialiased edges, no white rectangular matte, no halo, no added shadows, no new artwork, no logo redesign. Preserve the full mark without clipping. Output one transparent PNG with a small clean transparent margin.

## Integration

The shared header/footer and favicons use the PNG. CSS background, frame shadow,
and corner radius are removed. `object-fit: contain` preserves the full artwork.
The PNG's transparent corner and top-edge samples were verified (alpha 0).
