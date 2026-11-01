import { isValidEmail } from './validateEmail.js';
import { readJsonBody, isHoneypot, validateSubmission, SubmissionError } from './submissionValidation.js';
import { submissionKey, submissionLimiter } from './submissionProtection.js';

const FALLBACK = 'Please email info@trasiertech.com.np directly. Your form has been kept.';

export function createSubmissionHandler(kind, send, { validateEmail = isValidEmail, limiter = submissionLimiter, logError = console.error } = {}) {
    return async function handler(req, res) {
        res.setHeader('Cache-Control', 'no-store');
        if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            return res.status(405).json({ error: 'Method not allowed.' });
        }
        let submission;
        try {
            const body = readJsonBody(req);
            if (isHoneypot(body)) return res.status(200).json({ ok: true });
            const rate = limiter.check(req);
            if (!rate.allowed) {
                res.setHeader('Retry-After', String(rate.retryAfter));
                return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes, or email info@trasiertech.com.np directly. Your form has been kept.' });
            }
            submission = validateSubmission(kind, body);
            if (!(await validateEmail(submission.payload.email))) throw new SubmissionError('Please provide a valid email address with a working mail domain.', 400, 'email');
        } catch (error) {
            if (error instanceof SubmissionError) return res.status(error.status).json({ error: error.message, ...(error.field ? { field: error.field } : {}) });
            logError(`${kind} form validation failed`, { code: 'FORM_VALIDATION_FAILED' });
            return res.status(503).json({ error: `The form is temporarily unavailable. ${FALLBACK}` });
        }
        try {
            await send(submission.payload, { idempotencyKey: submissionKey(kind, submission.submissionId, submission.payload) });
            return res.status(200).json({ ok: true });
        } catch (error) {
            const configuration = error?.code === 'EMAIL_CONFIGURATION';
            logError(`${kind} email failed`, { code: configuration ? 'EMAIL_CONFIGURATION' : 'EMAIL_DELIVERY_FAILED' });
            return res.status(configuration ? 503 : 502).json({ error: `${configuration ? 'Email is not configured right now.' : 'We could not send your form right now.'} ${FALLBACK}` });
        }
    };
}
