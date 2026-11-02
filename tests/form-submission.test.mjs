import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, deflateRawSync } from 'node:zlib';
import { createSubmissionHandler } from '../backend/submissionHandler.js';
import { createRateLimiter, requestAddress, submissionKey } from '../backend/submissionProtection.js';
import { validateAttachment, MAX_FILE_BYTES } from '../backend/attachmentValidation.js';
import { emailConfiguration } from '../backend/mailer.js';

const submissionId = '642056b0-dffe-4d26-a076-d6da59cffb99';
const otherId = '642056b0-dffe-4d26-a076-d6da59cffb98';
const valid = { name: 'QA Example', email: 'qa@example.com', message: 'A project enquiry.', submissionId, website: '' };
function request(body = valid, overrides = {}) {
    return { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, socket: { remoteAddress: '127.0.0.1' }, body, ...overrides };
}
function response() {
    return { headers: {}, code: 0, body: null, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
function harness(kind = 'contact', overrides = {}) {
    const sent = [], logs = [], lookedUp = [];
    const handler = createSubmissionHandler(kind, async (...args) => sent.push(args), {
        validateEmail: async email => { lookedUp.push(email); return true; },
        limiter: createRateLimiter(),
        logError: (...args) => logs.push(args),
        ...overrides,
    });
    return { sent, logs, lookedUp, async call(req) { const res = response(); await handler(req, res); return res; } };
}

test('requires POST and advertises it without validating or sending', async () => {
    const h = harness();
    const res = await h.call(request(undefined, { method: 'GET' }));
    assert.equal(res.code, 405);
    assert.equal(res.headers.Allow, 'POST');
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.equal(h.sent.length + h.lookedUp.length, 0);
});

test('rejects missing/wrong content types and malformed/nonobject JSON before sending', async () => {
    for (const req of [request(valid, { headers: {} }), request(valid, { headers: { 'content-type': 'text/plain' } })]) {
        const h = harness();
        assert.equal((await h.call(req)).code, 415);
        assert.equal(h.sent.length + h.lookedUp.length, 0);
    }
    for (const body of ['{', 'null', '[]', null, []]) {
        const h = harness();
        assert.equal((await h.call(request(body))).code, 400);
        assert.equal(h.sent.length + h.lookedUp.length, 0);
    }
});

test('accepts JSON text/buffer and trims normalized values without truncating', async () => {
    for (const body of [JSON.stringify({ ...valid, name: ' QA Example ', message: ' First\r\nSecond ' }), Buffer.from(JSON.stringify(valid))]) {
        const h = harness();
        assert.equal((await h.call(request(body))).code, 200);
        assert.equal(h.sent[0][0].name, 'QA Example');
        assert.ok(!h.sent[0][0].message.includes('\r'));
        assert.equal(h.sent[0][0].email, 'qa@example.com');
    }
});

test('rejects blank, nonstring, oversized, or control-character required values', async () => {
    for (const patch of [{ name: '  ' }, { name: {} }, { name: 'x'.repeat(201) }, { name: 'A\nB' }, { email: 7 }, { email: 'a'.repeat(201) }, { message: '\t ' }, { message: {} }, { message: 'x'.repeat(5201) }, { message: 'a\0b' }]) {
        const h = harness();
        const res = await h.call(request({ ...valid, ...patch }));
        assert.equal(res.code, 400, JSON.stringify(patch));
        assert.ok(res.body.field);
        assert.equal(h.sent.length + h.lookedUp.length, 0);
    }
});

test('requires UUID submission IDs instead of accepting missing or arbitrary IDs', async () => {
    for (const value of [undefined, '', 'qa@example.com', 'x'.repeat(300), '642056b0-dffe-0d26-a076-d6da59cffb99']) {
        const h = harness();
        const res = await h.call(request({ ...valid, submissionId: value }));
        assert.equal(res.code, 400);
        assert.equal(res.body.field, 'submissionId');
        assert.equal(h.sent.length, 0);
    }
});

test('requires careers background and permits an application without a CV', async () => {
    for (const expertise of [undefined, ' ', {}, 'a'.repeat(5001)]) {
        const h = harness('careers');
        const res = await h.call(request({ ...valid, expertise }));
        assert.equal(res.code, 400);
        assert.equal(res.body.field, 'expertise');
        assert.equal(h.sent.length, 0);
    }
    const h = harness('careers');
    assert.equal((await h.call(request({ ...valid, expertise: ' Design and data ' }))).code, 200);
    assert.deepEqual(h.sent[0][0], { name: valid.name, email: valid.email, expertise: 'Design and data' });
});

test('silently discards filled honeypots without DNS or provider calls', async () => {
    const h = harness();
    const res = await h.call(request({ website: 'https://spam.invalid' }));
    assert.equal(res.code, 200);
    assert.deepEqual(res.body, { ok: true });
    assert.equal(h.sent.length + h.lookedUp.length, 0);
});

test('uses field errors for rejected mail domains and a safe fallback for validation failure', async () => {
    const invalid = harness('contact', { validateEmail: async () => false });
    const rejected = await invalid.call(request());
    assert.equal(rejected.code, 400);
    assert.equal(rejected.body.field, 'email');
    assert.equal(invalid.sent.length, 0);
    const unavailable = harness('contact', { validateEmail: async () => { throw new Error('private details'); } });
    const res = await unavailable.call(request());
    assert.equal(res.code, 503);
    assert.match(res.body.error, /techtrasier@gmail\.com/);
    assert.ok(!JSON.stringify(unavailable.logs).includes('private details'));
});

test('returns rate-limit Retry-After before performing DNS or email work', async () => {
    const h = harness('contact', { limiter: createRateLimiter({ limit: 2, windowMs: 10000, now: () => 1000 }) });
    assert.equal((await h.call(request())).code, 200);
    assert.equal((await h.call(request())).code, 200);
    const res = await h.call(request());
    assert.equal(res.code, 429);
    assert.equal(res.headers['Retry-After'], '10');
    assert.equal(h.sent.length, 2);
    assert.equal(h.lookedUp.length, 2);
});

test('rate-limit state remains bounded, uses overflow safely, and expires', () => {
    let time = 1000;
    const limiter = createRateLimiter({ limit: 1, maxEntries: 2, windowMs: 10000, now: () => time });
    const at = ip => request(valid, { socket: { remoteAddress: ip } });
    assert.ok(limiter.check(at('192.0.2.1')).allowed);
    assert.ok(limiter.check(at('192.0.2.2')).allowed);
    assert.ok(limiter.check(at('192.0.2.3')).allowed);
    assert.equal(limiter.check(at('192.0.2.4')).allowed, false);
    assert.equal(limiter.size, 2);
    assert.equal(limiter.check(at('192.0.2.1')).allowed, false);
    time += 10000;
    assert.ok(limiter.check(at('192.0.2.1')).allowed);
    assert.equal(limiter.size, 1);
});

test('trusts the Vercel-specific IP only on Vercel and ignores spoofable local forwarding', () => {
    const req = request(valid, { socket: { remoteAddress: '::ffff:127.0.0.1' }, headers: { 'x-forwarded-for': '198.51.100.8', 'x-vercel-forwarded-for': '192.0.2.4' } });
    assert.equal(requestAddress(req, false), '127.0.0.1');
    assert.equal(requestAddress(req, true), '192.0.2.4');
    req.headers['x-vercel-forwarded-for'] = 'not an IP';
    assert.equal(requestAddress(req, true), '127.0.0.1');
});

test('same normalized submission retries carry one opaque provider key; changed content/ID has another', async () => {
    const h = harness();
    await h.call(request());
    await h.call(request({ ...valid, name: ' QA Example ' }));
    await h.call(request({ ...valid, message: 'A changed enquiry.' }));
    await h.call(request({ ...valid, submissionId: otherId }));
    const keys = h.sent.map(([, options]) => options.idempotencyKey);
    assert.equal(keys[0], keys[1]);
    assert.notEqual(keys[0], keys[2]);
    assert.notEqual(keys[0], keys[3]);
    assert.match(keys[0], /^website\/contact\/[a-f0-9]{64}$/);
    assert.ok(!keys[0].includes(valid.email) && !keys[0].includes(valid.name) && !keys[0].includes(submissionId));
    assert.notEqual(submissionKey('careers', submissionId, h.sent[0][0]), keys[0]);
});

test('configuration/provider errors never return success or leak details', async () => {
    for (const [code, expected] of [['EMAIL_CONFIGURATION', 503], ['PROVIDER_FAILURE', 502]]) {
        const logs = [];
        const error = Object.assign(new Error('secret key and applicant details'), { code });
        const handler = createSubmissionHandler('contact', async () => { throw error; }, { validateEmail: async () => true, limiter: createRateLimiter(), logError: (...args) => logs.push(args) });
        const res = response();
        await handler(request(), res);
        assert.equal(res.code, expected);
        assert.equal(res.body.ok, undefined);
        assert.match(res.body.error, /techtrasier@gmail\.com/);
        assert.ok(!JSON.stringify([res.body, logs]).includes('secret key'));
    }
});

test('sender configuration rejects missing/test senders and accepts explicit company-format configuration', () => {
    for (const env of [{}, { RESEND_API_KEY: 're_qa' }, { RESEND_API_KEY: 're_qa', RESEND_FROM: 'onboarding@resend.dev' }, { RESEND_API_KEY: 're_qa', RESEND_FROM: 'Name <a@sub.resend.dev>' }, { RESEND_API_KEY: 're_qa', RESEND_FROM: 'bad\nvalue' }, { RESEND_API_KEY: 're_your_resend_api_key_here', RESEND_FROM: 'qa@example.com' }]) {
        assert.throws(() => emailConfiguration(env), { code: 'EMAIL_CONFIGURATION' });
    }
    assert.deepEqual(emailConfiguration({ RESEND_API_KEY: ' re_qa ', RESEND_FROM: 'Company <qa@example.com>' }), { apiKey: 're_qa', from: 'Company <qa@example.com>' });
    assert.equal(emailConfiguration({ RESEND_API_KEY: 're_qa', RESEND_FROM: 'qa@example.com' }).from, 'qa@example.com');
});

function pdf(padding = '') {
    const body = `%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n${padding}`;
    return Buffer.from(`${body}xref\n0 2\n0000000000 65535 f\n0000000009 00000 n\ntrailer\n<< /Root 1 0 R /Size 2 >>\nstartxref\n${Buffer.byteLength(body)}\n%%EOF\n`);
}
function zip(entries, method = 8) {
    const files = [], directory = [];
    let offset = 0;
    for (const [filename, text] of entries) {
        const name = Buffer.from(filename), data = Buffer.from(text), compressed = method === 8 ? deflateRawSync(data) : data;
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(method, 8); local.writeUInt32LE(crc32(data), 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(method, 10); central.writeUInt32LE(crc32(data), 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
        files.push(local, name, compressed); directory.push(central, name);
        offset += local.length + name.length + compressed.length;
    }
    const index = Buffer.concat(directory), end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(index.length, 12); end.writeUInt32LE(offset, 16);
    return Buffer.concat([...files, index, end]);
}
const docxEntries = [
    ['[Content_Types].xml', '<Types><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>CV</w:t></w:r></w:p></w:body></w:document>'],
];
function doc() {
    const file = Buffer.alloc(19 * 512);
    Buffer.from('d0cf11e0a1b11ae1', 'hex').copy(file);
    file.writeUInt16LE(3, 26); file.writeUInt16LE(0xfffe, 28); file.writeUInt16LE(9, 30); file.writeUInt16LE(6, 32); file.writeUInt32LE(1, 44); file.writeUInt32LE(1, 48); file.writeUInt32LE(4096, 56); file.writeUInt32LE(0xfffffffe, 60); file.writeUInt32LE(0xfffffffe, 68);
    for (let i = 0; i < 109; i++) file.writeUInt32LE(i === 0 ? 0 : 0xffffffff, 76 + i * 4);
    for (let i = 0; i < 128; i++) file.writeUInt32LE(0xffffffff, 512 + i * 4);
    file.writeUInt32LE(0xfffffffd, 512); file.writeUInt32LE(0xfffffffe, 516);
    for (let i = 2; i < 18; i++) file.writeUInt32LE(i === 9 || i === 17 ? 0xfffffffe : i + 1, 512 + i * 4);
    for (const [i, name, type, start, length] of [[0, 'Root Entry', 5, 0xfffffffe, 0], [1, 'WordDocument', 2, 2, 4096], [2, '1Table', 2, 10, 4096]]) {
        const entry = 1024 + i * 128;
        Buffer.from(`${name}\0`, 'utf16le').copy(file, entry); file.writeUInt16LE((name.length + 1) * 2, entry + 64); file[entry + 66] = type; file[entry + 67] = 1; file.writeUInt32LE(0xffffffff, entry + 68); file.writeUInt32LE(0xffffffff, entry + 72); file.writeUInt32LE(i === 0 ? 1 : 0xffffffff, entry + 76); file.writeUInt32LE(start, entry + 116); file.writeBigUInt64LE(BigInt(length), entry + 120);
    }
    file.writeUInt16LE(0xa5ec, 3 * 512); file.writeUInt16LE(0x00c1, 3 * 512 + 2);
    return file;
}

test('accepts structurally plausible PDF, DOC, and compressed/stored DOCX attachments', () => {
    for (const [filename, bytes] of [['resume.PDF', pdf()], ['resume.doc', doc()], ['resume.docx', zip(docxEntries)], ['resume.docx', zip(docxEntries, 0)]]) {
        const encoded = bytes.toString('base64');
        assert.deepEqual(validateAttachment(filename, encoded), { filename, fileBase64: encoded });
    }
    assert.deepEqual(validateAttachment(undefined, undefined), {});
});

test('rejects malformed, empty, noncanonical, renamed, partial, and oversized attachments', () => {
    for (const [filename, encoded] of [['resume.pdf', '!!!!'], ['resume.pdf', ''], ['resume.pdf', 'YR=='], ['resume.pdf', 'YQ==\n'], ['resume.pdf', undefined], [undefined, 'YQ=='], ['../resume.pdf', pdf().toString('base64')], ['resume.exe', pdf().toString('base64')], ['resume.docx', pdf().toString('base64')], ['resume.pdf', Buffer.from('%PDF-1.7\n').toString('base64')], ['resume.doc', Buffer.from('d0cf11e0a1b11ae1', 'hex').toString('base64')], ['resume.docx', zip([['unrelated.txt','CV']]).toString('base64')]]) {
        assert.throws(() => validateAttachment(filename, encoded), undefined, `${filename}: ${encoded?.slice(0, 20)}`);
    }
    assert.throws(() => validateAttachment('resume.pdf', Buffer.alloc(MAX_FILE_BYTES + 1).toString('base64')), { status: 413 });
});

test('accepts a large legal PDF without regex stack exhaustion', () => {
    const bytes = pdf('%' + 'x'.repeat(MAX_FILE_BYTES - 1000) + '\n');
    assert.ok(bytes.length <= MAX_FILE_BYTES);
    assert.equal(validateAttachment('resume.pdf', bytes.toString('base64')).filename, 'resume.pdf');
});

test('rejects ZIP expansion bombs and out-of-bounds archive pointers', () => {
    const bomb = zip([docxEntries[0], ['word/document.xml', 'x'.repeat(2 * 1024 * 1024 + 1)]]);
    assert.throws(() => validateAttachment('resume.docx', bomb.toString('base64')), /contents/);
    const broken = zip(docxEntries);
    const end = broken.length - 22;
    broken.writeUInt32LE(0xfffffff0, end + 16);
    assert.throws(() => validateAttachment('resume.docx', broken.toString('base64')), /contents/);
});
