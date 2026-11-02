import { createHash, createHmac, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';

export function requestAddress(req, isVercel = process.env.VERCEL === '1') {
    // Vercel supplies this header itself. Outside Vercel, never trust forwarded headers.
    const forwarded = isVercel ? req.headers?.['x-vercel-forwarded-for'] : undefined;
    const candidate = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
    const address = isIP(candidate) ? candidate : req.socket?.remoteAddress;
    if (typeof address !== 'string' || !isIP(address)) return 'unknown';
    return address.startsWith('::ffff:') && isIP(address.slice(7)) === 4 ? address.slice(7) : address.toLowerCase();
}

export function createRateLimiter({ limit = 8, windowMs = 10 * 60 * 1000, maxEntries = 1024, now = Date.now, salt = randomBytes(32) } = {}) {
    const entries = new Map();
    let overflow;
    return {
        check(req) {
            const time = now();
            for (const [key, entry] of entries) if (time - entry.start >= windowMs) entries.delete(key);
            if (overflow && time - overflow.start >= windowMs) overflow = undefined;
            const key = createHmac('sha256', salt).update(requestAddress(req)).digest('hex');
            let entry = entries.get(key);
            if (!entry) {
                if (entries.size < maxEntries) { entry = { start: time, count: 0 }; entries.set(key, entry); }
                else { overflow ||= { start: time, count: 0 }; entry = overflow; }
            }
            if (entry.count >= limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((entry.start + windowMs - time) / 1000)) };
            entry.count++;
            return { allowed: true };
        },
        // Expose only the count for tests/diagnostics, never addresses or hashes.
        get size() { return entries.size; },
    };
}

export function submissionKey(kind, submissionId, payload) {
    const digest = createHash('sha256').update(submissionId).update('\0').update(JSON.stringify(payload)).digest('hex');
    return `website/${kind}/${digest}`;
}

export const submissionLimiter = createRateLimiter();
