import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderHeader, renderFooter } from '../frontend/js/site-shell.js';

const root = fileURLToPath(new URL('../frontend/', import.meta.url));
async function pages(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'assets') result.push(...await pages(file));
    else if (entry.isFile() && entry.name.endsWith('.html') && !entry.name.startsWith('google')) result.push(file);
  }
  return result;
}

function replaceShell(html, kind, markup) {
  const generated = new RegExp(`<!-- site-shell:${kind}:start -->[\\s\\S]*?<!-- site-shell:${kind}:end -->`);
  const placeholder = new RegExp(`<div\\b[^>]*\\bdata-site-${kind}(?:=["'][^"']*["'])?[^>]*>\\s*</div>`);
  const block = `<!-- site-shell:${kind}:start -->\n${markup}\n<!-- site-shell:${kind}:end -->`;
  if (generated.test(html)) return html.replace(generated, block);
  if (placeholder.test(html)) return html.replace(placeholder, block);
  throw new Error(`Missing ${kind} placeholder or generated block`);
}

let changed = 0;
const files = await pages(root);
for (const file of files) {
  const original = await readFile(file, 'utf8');
  let html = original;
  const page = html.match(/<body\b[^>]*\bdata-page=["']([^"']+)["']/i)?.[1] || '';
  const pathname = '/' + path.relative(root, file).replaceAll(path.sep, '/');
  html = replaceShell(html, 'header', renderHeader(page, pathname === '/index.html' ? '/' : pathname));
  html = replaceShell(html, 'footer', renderFooter());

  // One early stylesheet and one useful preload replace duplicate external font chains.
  html = html.replace(/<!-- site-fonts:start -->[\s\S]*?<!-- site-fonts:end -->/g, '');
  html = html.replace(/<link\b[^>]*>/gi, tag => /fonts\.(?:googleapis|gstatic)\.com|\/css\/fonts\.css|\/fonts\/manrope-latin-wght-400-800\.woff2/.test(tag) ? '' : tag);
  const fonts = '\n  <!-- site-fonts:start -->\n  <link rel="preload" href="/fonts/manrope-latin-wght-400-800.woff2" as="font" type="font/woff2" crossorigin>\n  <link rel="stylesheet" href="/css/fonts.css">\n  <!-- site-fonts:end -->\n  ';
  html = html.replace(/(<meta\b[^>]*\bcharset\s*=[^>]*>)\s*/i, (_, charset) => charset + fonts);
  html = html.replace(/<script\b[^>]*\bsrc=["'][^"']*\bjs\/site\.js["'][^>]*>\s*<\/script>/gi, '<script type="module" src="/js/site.js"></script>');
  html = html.replaceAll('https://www.trasiertech.com.np/assets/images/og-image.jpg', 'https://www.trasiertech.com.np/assets/images/og-image.png');

  // An HTML fallback never submits personal details through the default GET method.
  html = html.replace(/<form\b[^>]*\bid=["'](contact|careers)-form["'][^>]*>([\s\S]*?)<\/form>/gi, (match, type, contents) => {
    if (/data-form-fields/.test(contents)) return match;
    const body = contents.replace(/<noscript>[\s\S]*?<\/noscript>/gi, '');
    const label = type === 'contact' ? 'Your enquiry details' : 'Your talent-list introduction';
    return `<form id="${type}-form" method="post" action="/api/${type}">\n<p class="form-fallback" data-form-fallback>Enable JavaScript to use this form, or email <a href="mailto:techtrasier@gmail.com">techtrasier@gmail.com</a> directly.</p>\n<fieldset class="form-fields" data-form-fields disabled><legend class="visually-hidden">${label}</legend>\n<div class="form-honeypot" aria-hidden="true"><label for="${type}-website">Leave this field empty</label><input id="${type}-website" name="website" type="text" autocomplete="off" tabindex="-1" maxlength="300"></div>${body}\n</fieldset></form>`;
  });
  html = html.replace(/^[\t ]+$/gm, '');
  if (html !== original) { await writeFile(file, html); changed++; }
}
console.log(`Prepared ${files.length} static pages (${changed} updated): native navigation, local fonts and safe form fallbacks.`);
