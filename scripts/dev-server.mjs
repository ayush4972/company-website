import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = path.join(project, 'frontend');
const envPath = path.join(project, '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);
const port = Number(process.env.PORT || 8000);
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.woff2': 'font/woff2' };
function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (url.pathname.startsWith('/api/')) {
      const endpoint = url.pathname.replace(/\/$/, '');
      if (!['/api/contact', '/api/careers'].includes(endpoint)) return json(response, 404, { error: 'Endpoint not found.' });
      if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return json(response, 405, { error: 'Method not allowed.' });
      }
      if (!String(request.headers['content-type'] || '').includes('application/json')) return json(response, 415, { error: 'Please send JSON.' });
      const chunks = [];
      let received = 0;
      for await (const chunk of request) {
        received += chunk.length;
        if (received > 4.5 * 1000 * 1000) return json(response, 413, { error: 'The request is too large. Keep CV files under 3 MB.' });
        chunks.push(chunk);
      }
      try { request.body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
      catch { return json(response, 400, { error: 'The request contains invalid JSON.' }); }
      if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) return json(response, 400, { error: 'Please send a JSON object.' });
      const { name, email, message } = request.body;
      if (!name || !email || (endpoint === '/api/contact' && !message)) return json(response, 400, { error: 'Please complete all required fields.' });
      if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_resend_api_key_here') return json(response, 503, { error: 'Email is not configured for this local preview. Please email info@trasiertech.com.np directly. Your form has been kept so you can copy it.' });
      response.status = code => { response.statusCode = code; return response; };
      response.json = body => { response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.end(JSON.stringify(body)); };
      const { default: handler } = await import(pathToFileURL(path.join(project, `${endpoint.slice(1)}.js`)).href);
      await handler(request, response);
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); return json(response, 405, { error: 'Method not allowed.' }); }
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return json(response, 400, { error: 'Invalid URL.' }); }
    // Serve only files in frontend, including on Windows where backslashes are separators.
    let file = path.resolve(publicRoot, `.${pathname.replaceAll('\\', '/')}`);
    if (file !== publicRoot && !file.startsWith(publicRoot + path.sep)) return json(response, 403, { error: 'Forbidden.' });
    let info;
    try { info = await stat(file); } catch { return json(response, 404, { error: 'Page not found.' }); }
    if (info.isDirectory()) { file = path.join(file, 'index.html'); try { info = await stat(file); } catch { return json(response, 404, { error: 'Page not found.' }); } }
    if (!info.isFile()) return json(response, 404, { error: 'Page not found.' });
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (request.method === 'HEAD') { response.end(); return; }
    const stream = createReadStream(file);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  } catch (error) {
    if (!response.headersSent) json(response, 500, { error: 'The local service could not complete the request. Please check the server terminal.' });
    else response.end();
    console.error(error.message);
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Stop the existing server or set PORT to another port.` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Trasier local preview: http://localhost:${port}/`);
  console.log(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_your_resend_api_key_here' ? 'Email API enabled. Submitting forms sends real email.' : 'Email is not configured. Forms show a helpful fallback without sending.');
  console.log('Press Ctrl+C to stop.');
});
