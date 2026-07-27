import dns from 'node:dns/promises';

// Stricter than "has an @ and a dot": rejects consecutive dots, leading/trailing
// dots in the local part, and TLDs under 2 letters, without being pedantically
// RFC 5322-complete (that grammar allows plenty of addresses no real inbox uses).
const EMAIL_RE =
    /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

const domainMxCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes, keeps repeat submissions from re-querying DNS

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

    const cached = domainMxCache.get(domain);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.ok;
    }

    let ok = false;
    try {
        const mx = await dns.resolveMx(domain);
        ok = Array.isArray(mx) && mx.length > 0;
    } catch {
        ok = false;
    }

    if (!ok) {
        // No MX record: per RFC 5321, mail can still be delivered to the
        // domain's own A/AAAA record. Try that before giving up.
        try {
            await dns.resolve4(domain);
            ok = true;
        } catch {
            try {
                await dns.resolve6(domain);
                ok = true;
            } catch {
                ok = false;
            }
        }
    }

    domainMxCache.set(domain, { ok, at: Date.now() });
    return ok;
}
