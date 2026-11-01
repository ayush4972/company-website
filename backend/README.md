# Backend

The root `api/` routes are Vercel functions. `backend/` contains the shared JSON
validation, attachment checks, warm-instance abuse controls, and Resend delivery.
Both forms send to `info@trasiertech.com.np`, with the visitor's address in Reply-To.

## Configure email

1. Install dependencies at the project root with `npm ci`.
2. Add both `RESEND_API_KEY` and `RESEND_FROM` to the Vercel environments that need
   email (Production and, if wanted, Preview). Locally, copy `.env.example` to
   `.env`, fill them in, and run `npm run dev`. Never commit credentials.
3. `RESEND_FROM` must be an address on a domain verified in the same Resend account.
   A plain address or `Company name <address>` is accepted. No sender is invented
   or assumed verified by the code. The shared `resend.dev` test domain is rejected.
4. Redeploy after changing production environment values. Perform a separately
   authorized delivery check and confirm receipt in the company inbox.

Missing/invalid configuration returns HTTP 503 with a direct-email fallback;
provider rejection returns 502. The browser preserves the visitor's entered data.
Logs contain a short error category, not message bodies, attachments, keys, or IPs.
An accepted provider message ID confirms provider acceptance, not final inbox delivery.

## JSON API contract

Send `Content-Type: application/json` and an object, using POST:

- `/api/contact`: `{ name, email, message, submissionId, website }`.
- `/api/careers`: `{ name, email, expertise, submissionId, website, filename?, fileBase64? }`.

`submissionId` is a UUID. Keep the same ID when retrying the same form contents;
generate a new ID when the payload changes or a completed form starts over.
`website` is an empty honeypot field; a filled field is silently discarded without
DNS or email work. Omission is treated as empty, but the documented client sends it.

Required fields must be strings, are trimmed, and reject unsupported control
characters or values beyond their limits. Name/email are limited to 200 characters;
contact message to 5,200 (including an optional service prefix); careers background
to 5,000. Careers background is required server-side as well as in the UI.
Email syntax and mail-domain records are checked; a null MX is rejected and the
DNS-result cache expires after ten minutes and holds at most 256 domains.
Temporary DNS errors return a service error rather than labelling the visitor's
address invalid, and are not negatively cached.

Validation errors return 400 with `{ error, field? }`; non-JSON requests return
415; oversized CVs return 413; successful provider acceptance returns `{ ok: true }`.
All responses are marked `Cache-Control: no-store`.

## CV validation

CVs are optional and limited to 3 MiB. If supplied, filename and base64 data must
both be present. Data must be nonempty canonical base64, without a data-URI prefix
or whitespace. The original filename is bounded and rejects paths/control characters.
Renaming a file to `.pdf`, `.doc`, or `.docx` is insufficient:

- PDF checks include the version header, indirect objects, final EOF, and a bounded
  cross-reference offset (traditional table or stream).
- DOC checks include the compound-file header/allocation chain, Word/Table streams,
  and the Word File Information Block identifier, including mini-stream support.
- DOCX checks include the ZIP central directory, required Word content types and
  document XML, CRC/length consistency, and bounded XML expansion (2 MiB per XML).
  Encrypted or malformed ZIPs are rejected; at most 1,024 ZIP entries are inspected.

These checks establish file-type plausibility and limit parser work. They are not
a malware scanner or a full PDF/Office validator. Treat incoming attachments as
untrusted and use the inbox provider's attachment scanning/normal staff precautions.

## Abuse limits and duplicate protection

Each warm process allows eight non-honeypot JSON attempts per IP per ten minutes,
before validation/DNS/email work. On Vercel, only its `x-vercel-forwarded-for`
header is trusted (`VERCEL=1`); local development ignores forwarded headers and
uses the socket address. IPs are keyed through a random per-process HMAC salt;
only opaque keys/counters remain in memory. The map holds at most 1,024 buckets;
overflow shares a bounded bucket rather than evicting an existing limit. Blocked
requests return 429 and `Retry-After`, while retaining the form.

This is **not a distributed rate limit**: cold starts, multiple regions, and
separate Vercel function instances have independent counters. Add Vercel Firewall
rate limits or a shared durable limiter if traffic/abuse warrants it. The honeypot
also cannot stop a bot that knows to leave it empty.

Provider idempotency uses a SHA-256 hash of the form type, normalized payload, and
stable submission UUID. Keys contain no names, email addresses, IPs, attachment
content, or raw UUID. The same payload/ID can safely retry through Resend's
24-hour deduplication window. A changed payload or ID is a new submission.

## Verification

`node --test tests/form-submission.test.mjs tests/email-delivery.test.mjs tests/email-validation.test.mjs`

These tests mock all provider and DNS work; they never send email. They cover
validation, honeypots, bounded rate/cache behavior, retries, configuration failures,
and valid/malformed/oversized attachment structures. A real end-to-end delivery
check remains separate and requires configured verified sender details.

References: [Resend test-domain restrictions](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain),
[Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[Vercel proxy headers](https://vercel.com/docs/headers/request-headers).
