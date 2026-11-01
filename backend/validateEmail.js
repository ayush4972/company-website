import dns from 'node:dns/promises';

// Stricter than "has an @ and a dot": rejects consecutive dots, leading/trailing
// dots in the local part, and TLDs under 2 letters, without being pedantically
// RFC 5322-complete (that grammar allows plenty of addresses no real inbox uses).
const EMAIL_RE =
    /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

const domainMxCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes, keeps repeat submissions from re-querying DNS
const MAX_CACHED_DOMAINS = 256;
const NO_RECORD_CODES = new Set(['ENODATA', 'ENOTFOUND']);

async function recordsOrMissing(resolve, domain) {
    try { return await resolve(domain); }
    catch (error) {
        if (NO_RECORD_CODES.has(error?.code)) return [];
        // A timeout, refusal, or resolver failure says nothing about the address.
        // Let the form show a temporary-service error, without poisoning the cache.
        throw error;
    }
}

/**
 * Confirms an email is well-formed AND that its domain has mail servers
 * configured (an MX record, or an A/AAAA record as the RFC 5321 fallback).
 * This can't prove a specific mailbox exists, but it does reject typo'd or
 * made-up domains that could never receive mail in the first place.
 */
export async function isValidEmail(email) {
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
        return false;
    }

    const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();

    for (const [name, entry] of domainMxCache) {
        if (Date.now() - entry.at >= CACHE_TTL_MS) domainMxCache.delete(name);
    }

    const cached = domainMxCache.get(domain);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.ok;
    }

    const mx = await recordsOrMissing(domain => dns.resolveMx(domain), domain);
    // RFC 7505's explicit null MX means the domain does not accept email.
    if (Array.isArray(mx) && mx.length === 1 && !mx[0].exchange) {
        if (domainMxCache.size >= MAX_CACHED_DOMAINS) domainMxCache.delete(domainMxCache.keys().next().value);
        domainMxCache.set(domain, { ok: false, at: Date.now() });
        return false;
    }
    let ok = Array.isArray(mx) && mx.length > 0;

    if (!ok) {
        // No MX record: per RFC 5321, mail can still be delivered to the
        // domain's own A/AAAA record. Try that before giving up.
        let temporaryError;
        for (const resolve of [domain => dns.resolve4(domain), domain => dns.resolve6(domain)]) {
            try {
                const addresses = await recordsOrMissing(resolve, domain);
                if (Array.isArray(addresses) && addresses.length > 0) { ok = true; break; }
            } catch (error) { temporaryError ||= error; }
        }
        if (!ok && temporaryError) throw temporaryError;
    }

    if (domainMxCache.size >= MAX_CACHED_DOMAINS) domainMxCache.delete(domainMxCache.keys().next().value);
    domainMxCache.set(domain, { ok, at: Date.now() });
    return ok;
}
