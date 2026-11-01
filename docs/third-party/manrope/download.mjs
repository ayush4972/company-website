import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const fontDirectory = path.join(root, 'frontend/fonts');
const documentationDirectory = path.join(root, 'docs/third-party/manrope');
const cssUrl = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&display=swap';
const licenseUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt';
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
const sha256 = data => createHash('sha256').update(data).digest('hex');

async function download(url) {
  const response = await fetch(url, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

const stylesheet = await download(cssUrl);
const license = await download(licenseUrl);
if (!license.toString().includes('SIL OPEN FONT LICENSE Version 1.1')) throw new Error('Unexpected Manrope license');
const faces = [...stylesheet.toString().matchAll(/\/\*\s*([^*]+?)\s*\*\/\s*(@font-face\s*\{[\s\S]*?\})/g)];
const selected = ['latin-ext', 'latin'].map(subset => {
  const match = faces.find(face => face[1].trim() === subset);
  if (!match) throw new Error(`Missing ${subset} subset`);
  const face = match[2];
  if (!/font-weight:\s*400\s+800\s*;/.test(face)) throw new Error(`Expected variable weights in ${subset}`);
  const sourceUrl = face.match(/src:\s*url\(([^)]+)\)\s*format\(['"]woff2['"]\)/)?.[1];
  const unicodeRange = face.match(/unicode-range:\s*([^;]+);/)?.[1];
  if (!sourceUrl?.startsWith('https://fonts.gstatic.com/') || !unicodeRange) throw new Error(`Invalid ${subset} source`);
  return { subset, sourceUrl, unicodeRange };
});

await mkdir(fontDirectory, { recursive: true });
await mkdir(documentationDirectory, { recursive: true });
const records = [];
const declarations = [];
for (const face of selected) {
  const data = await download(face.sourceUrl);
  if (data.subarray(0, 4).toString() !== 'wOF2') throw new Error(`Invalid WOFF2: ${face.subset}`);
  const name = `manrope-${face.subset}-wght-400-800.woff2`;
  await writeFile(path.join(fontDirectory, name), data);
  records.push({ file: `frontend/fonts/${name}`, sourceUrl: face.sourceUrl, bytes: data.length, sha256: sha256(data), unicodeRange: face.unicodeRange });
  declarations.push(`/* ${face.subset}; unmodified Google Fonts WOFF2 subset. */\n@font-face {\n  font-family: 'Manrope';\n  font-style: normal;\n  font-weight: 400 800;\n  font-display: swap;\n  src: url('../fonts/${name}') format('woff2');\n  unicode-range: ${face.unicodeRange};\n}`);
}
await writeFile(path.join(root, 'frontend/css/fonts.css'), `/* Manrope, SIL OFL 1.1. See /fonts/OFL-Manrope.txt and docs/third-party/manrope. */\n${declarations.join('\n\n')}\n`);
await writeFile(path.join(documentationDirectory, 'google-fonts-source.css'), stylesheet);
await writeFile(path.join(documentationDirectory, 'OFL.txt'), license);
await writeFile(path.join(fontDirectory, 'OFL-Manrope.txt'), license);
const manifest = { fetchedAt: new Date().toISOString(), stylesheetUrl: cssUrl, stylesheetSha256: sha256(stylesheet), userAgent, licenseUrl, licenseSha256: sha256(license), fonts: records };
await writeFile(path.join(documentationDirectory, 'sources.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ fonts: records.map(({ file, bytes, sha256 }) => ({ file, bytes, sha256 })), license: license.toString().split('\n')[0] }, null, 2));
