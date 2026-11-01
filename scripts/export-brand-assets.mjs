import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Technical exports preserve the supplied artwork; the social-card layout is SVG.
const root = fileURLToPath(new URL('../', import.meta.url));
const images = path.join(root, 'frontend/assets/images');
const design = path.join(root, 'frontend/assets/design');
const source = await readFile(path.join(images, 'trasier-logo-transparent.png'));
for (const size of [160, 320]) {
  await sharp(source).resize(size, size).webp({ lossless: true, effort: 6 }).toFile(path.join(images, `trasier-logo-${size}.webp`));
}
const logo = await sharp(source).resize(280, 280).png().toBuffer();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#e3f1ff"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#f8fbff"/>
  <rect x="22" y="22" width="1156" height="586" rx="30" fill="url(#sky)" stroke="#bdd6f0" stroke-width="2"/>
  <circle cx="1150" cy="60" r="230" fill="none" stroke="#cbe3fa" stroke-width="30"/>
  <circle cx="1150" cy="60" r="155" fill="none" stroke="#d5e9fc" stroke-width="2"/>
  <path d="M358 138v354" stroke="#b8d4ef" stroke-width="2"/>
  <image href="data:image/png;base64,${logo.toString('base64')}" x="64" y="167" width="280" height="280"/>
  <g font-family="Arial, Helvetica, sans-serif">
    <text x="405" y="167" fill="#1d5fbf" font-size="20" font-weight="700" letter-spacing="3">TRASIER TECHNOLOGY</text>
    <text x="400" y="273" fill="#16385f" font-size="76" font-weight="700" letter-spacing="-3">Engineering</text>
    <text x="400" y="362" fill="#2364d6" font-size="76" font-weight="700" letter-spacing="-3">what’s next.</text>
    <path d="M405 390h410" stroke="#8bc6f5" stroke-width="5" stroke-linecap="round"/>
    <text x="405" y="450" fill="#476583" font-size="22">Products. Intelligence. Connected systems.</text>
    <text x="405" y="504" fill="#526b88" font-size="18">Built in Kathmandu, Nepal.</text>
    <text x="70" y="570" fill="#315d87" font-size="18">www.trasiertech.com.np</text>
  </g>
</svg>`;
await mkdir(design, { recursive: true });
await writeFile(path.join(design, 'og-card.svg'), svg);
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(images, 'og-image.png'));
for (const name of ['trasier-logo-160.webp', 'trasier-logo-320.webp', 'og-image.png']) {
  const file = path.join(images, name);
  const metadata = await sharp(file).metadata();
  console.log(`${name}: ${metadata.width}×${metadata.height}, ${(await stat(file)).size} bytes`);
}
