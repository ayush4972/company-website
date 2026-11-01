import test from 'node:test';
import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import { isValidEmail } from '../backend/validateEmail.js';
import { createSubmissionHandler } from '../backend/submissionHandler.js';

const dnsError = code => Object.assign(new Error(`Mocked DNS ${code}`), { code });

test('email domain checks reject null MX, support address fallback, and bound their cache (all DNS mocked)', async () => {
    const originals = { resolveMx: dns.resolveMx, resolve4: dns.resolve4, resolve6: dns.resolve6 };
    let mxCalls = 0, addressCalls = 0;
    try {
        dns.resolveMx = async domain => {
            mxCalls++;
            if (domain === 'null-mx.example') return [{ exchange: '', priority: 0 }];
            if (domain === 'fallback.example' || domain === 'ipv6.example') throw dnsError('ENODATA');
            return [{ exchange: 'mail.example', priority: 10 }];
        };
        dns.resolve4 = async domain => { addressCalls++; if (domain === 'ipv6.example') throw dnsError('ENODATA'); return ['192.0.2.1']; };
        dns.resolve6 = async () => { addressCalls++; return ['2001:db8::1']; };
        assert.equal(await isValidEmail({}), false);
        assert.equal(await isValidEmail('bad..name@example.com'), false);
        assert.equal(mxCalls, 0);
        assert.equal(await isValidEmail('test@null-mx.example'), false);
        assert.equal(addressCalls, 0, 'An explicit null MX must not fall back to an address record');
        assert.equal(await isValidEmail('test@fallback.example'), true);
        assert.equal(await isValidEmail('test@ipv6.example'), true);
        assert.equal(addressCalls, 3);
        assert.equal(await isValidEmail('one@cached.example'), true);
        const count = mxCalls;
        assert.equal(await isValidEmail('two@CACHED.EXAMPLE'), true);
        assert.equal(mxCalls, count);
        for (let i = 0; i < 256; i++) assert.equal(await isValidEmail(`test@cache-${i}.example`), true);
        const before = mxCalls;
        assert.equal(await isValidEmail('one@cached.example'), true);
        assert.equal(mxCalls, before + 1, 'Oldest domain must be evicted rather than retaining an unbounded cache');
    } finally {
        Object.assign(dns, originals);
    }
});

test('temporary MX failure produces a503 form error and is not cached as an invalid address (all DNS mocked)', async () => {
    const originals = { resolveMx: dns.resolveMx, resolve4: dns.resolve4, resolve6: dns.resolve6 };
    let mxCalls = 0, addressCalls = 0, sent = 0;
    try {
        dns.resolveMx = async () => {
            if (++mxCalls === 1) throw dnsError('ESERVFAIL');
            return [{ exchange: 'mail.example', priority: 10 }];
        };
        dns.resolve4 = dns.resolve6 = async () => { addressCalls++; throw dnsError('ENODATA'); };
        const handler = createSubmissionHandler('contact', async () => { sent++; }, {
            limiter: { check: () => ({ allowed: true }) }, logError: () => {},
        });
        const request = {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: { name: 'QA Example', email: 'qa@temporary-mx.example', message: 'A mocked enquiry.', submissionId: '642056b0-dffe-4d26-a076-d6da59cffb99' },
        };
        const response = () => ({ code: 0, body: null, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
        const first = response();
        await handler(request, first);
        assert.equal(first.code, 503);
        assert.match(first.body.error, /temporarily unavailable/);
        assert.equal(sent, 0);
        assert.equal(addressCalls, 0, 'A failed MX lookup must not be treated as proof of missing MX records');
        const retry = response();
        await handler(request, retry);
        assert.equal(retry.code, 200);
        assert.equal(mxCalls, 2, 'A temporary failure must be retried rather than read from a negative cache');
        assert.equal(sent, 1);
    } finally { Object.assign(dns, originals); }
});

test('address fallback distinguishes missing records from transient failures and retries safely (all DNS mocked)', async () => {
    const originals = { resolveMx: dns.resolveMx, resolve4: dns.resolve4, resolve6: dns.resolve6 };
    const mxCalls = new Map();
    let retryHasAddress = false;
    try {
        dns.resolveMx = async domain => {
            mxCalls.set(domain, (mxCalls.get(domain) || 0) + 1);
            throw dnsError(domain === 'missing-records.example' ? 'ENOTFOUND' : 'ENODATA');
        };
        dns.resolve4 = async domain => {
            if (domain === 'fallback-retry.example' && retryHasAddress) return ['192.0.2.1'];
            throw dnsError(domain === 'missing-records.example' ? 'ENODATA' : 'ETIMEOUT');
        };
        dns.resolve6 = async domain => {
            if (domain === 'fallback-ipv6.example') return ['2001:db8::1'];
            throw dnsError('ENODATA');
        };
        assert.equal(await isValidEmail('qa@missing-records.example'), false);
        assert.equal(await isValidEmail('qa@missing-records.example'), false);
        assert.equal(mxCalls.get('missing-records.example'), 1, 'Definite missing records may be negatively cached');
        await assert.rejects(isValidEmail('qa@fallback-retry.example'), { code: 'ETIMEOUT' });
        retryHasAddress = true;
        assert.equal(await isValidEmail('qa@fallback-retry.example'), true);
        assert.equal(mxCalls.get('fallback-retry.example'), 2);
        assert.equal(await isValidEmail('qa@fallback-ipv6.example'), true, 'A valid IPv6 fallback can succeed even if the A lookup timed out');
    } finally { Object.assign(dns, originals); }
});
