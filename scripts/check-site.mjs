import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../frontend/', import.meta.url));
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}
const allFiles = await walk(root);
const pages = allFiles.filter(file => file.endsWith('.html') && !file.includes(`${path.sep}assets${path.sep}`) && !path.basename(file).startsWith('google'));
const errors = [];
const htmlByFile = new Map(await Promise.all(pages.map(async file => [file, await readFile(file, 'utf8')])));
let linksChecked = 0;
for (const [file, html] of htmlByFile) {
  const label = path.relative(root, file);
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  if (ids.length !== new Set(ids).size) errors.push(`${label}: duplicate element IDs`);
  if ((html.match(/<h1(?:\s|>)/g) || []).length !== 1) errors.push(`${label}: expected one h1`);
  if (!/<main\b[^>]*\bid=["']main-content["']/.test(html)) errors.push(`${label}: missing main landmark/skip target`);
  if (!/name=["']description["']/.test(html)) errors.push(`${label}: missing meta description`);
  if (!/name=["']viewport["']/.test(html)) errors.push(`${label}: missing viewport`);
  if (!/<header\b[^>]*\bdata-site-header/.test(html) || !/<footer\b[^>]*\bdata-site-footer/.test(html)) errors.push(`${label}: navigation must be present in the delivered HTML`);
  if (!/<details\b[^>]*class=["']mobile-menu["']/.test(html)) errors.push(`${label}: missing native mobile navigation`);
  const sharedScript = [...html.matchAll(/<script\b[^>]*\bsrc=["'][^"']*\/js\/site\.js["'][^>]*>/g)].map(match => match[0]);
  if (sharedScript.length !== 1 || !/\btype=["']module["']/.test(sharedScript[0])) errors.push(`${label}: expected one shared module script`);
  if ((html.match(/href=["']\/css\/fonts\.css["']/g) || []).length !== 1) errors.push(`${label}: expected one local font stylesheet`);
  if (/<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)/.test(html)) errors.push(`${label}: external font loading remains`);
  for (const match of html.matchAll(/<form\b([^>]*\bid=["'](?:contact|careers)-form["'][^>]*)>([\s\S]*?)<\/form>/g)) {
    if (!/\bmethod=["']post["']/.test(match[1])) errors.push(`${label}: enquiry form must not fall back to GET`);
    if (!/<fieldset\b[^>]*\bdata-form-fields[^>]*\bdisabled/.test(match[2])) errors.push(`${label}: form must remain disabled until its submit handler is ready`);
    if (!/data-form-fallback[\s\S]*mailto:techtrasier@gmail\.com[\s\S]*<fieldset/.test(match[2])) errors.push(`${label}: missing usable email fallback outside disabled fields`);
  }
  if (/cdn\.tailwindcss|gsap\.min|js\/shader\.js/.test(html)) errors.push(`${label}: legacy runtime dependency remains`);
  for (const img of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=["'][^"']*["']/.test(img[0])) errors.push(`${label}: image without alt attribute`);
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']*)["']/g)) {
    const value = match[1].replaceAll('&amp;', '&');
    if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) continue;
    const [targetAndQuery, anchor] = value.split('#');
    const targetPath = decodeURIComponent(targetAndQuery.split('?')[0]);
    let target = targetPath.startsWith('/') ? path.join(root, targetPath) : path.resolve(path.dirname(file), targetPath || path.basename(file));
    try { if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html'); }
    catch { errors.push(`${label}: missing local target ${value}`); continue; }
    linksChecked++;
    if (anchor && htmlByFile.has(target) && !new RegExp(`\\bid=["']${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(htmlByFile.get(target))) errors.push(`${label}: missing anchor ${value}`);
  }
}
for (const file of allFiles.filter(file => file.endsWith('.css'))) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    if (/^(?:data:|https?:|\/\/|#)/.test(match[1])) continue;
    const asset = path.resolve(path.dirname(file), match[1].split('?')[0]);
    try { await stat(asset); } catch { errors.push(`${path.relative(root,file)}: missing CSS asset ${match[1]}`); }
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Passed: ${pages.length} pages, ${linksChecked} local links/assets, unique headings/IDs, shared navigation, image alt text, and CSS assets.`);
