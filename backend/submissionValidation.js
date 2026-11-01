import { validateAttachment } from './attachmentValidation.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class SubmissionError extends Error {
    constructor(message, status = 400, field) {
        super(message);
        this.status = status;
        this.field = field;
    }
}

export function readJsonBody(req) {
    const contentType = req.headers?.['content-type'];
    if (typeof contentType !== 'string' || !/^application\/json(?:\s*;|\s*$)/i.test(contentType)) throw new SubmissionError('Please send this form as JSON.', 415);
    let body = req.body;
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
        try { body = JSON.parse(String(body)); }
        catch { throw new SubmissionError('The form could not be read. Please reload the page and try again.'); }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SubmissionError('Please send a valid form.');
    return body;
}

export function isHoneypot(body) {
    if (body.website === undefined) return false;
    if (typeof body.website !== 'string' || body.website.length > 2000) throw new SubmissionError('Please reload the page and try again.');
    return body.website.trim() !== '';
}

function text(body, field, label, max, multiline = false) {
    if (typeof body[field] !== 'string') throw new SubmissionError(`Please enter ${label}.`, 400, field);
    const value = body[field].trim().replace(/\r\n?/g, '\n');
    if (!value) throw new SubmissionError(`Please enter ${label}.`, 400, field);
    if (value.length > max) throw new SubmissionError(`Please keep ${label} to ${max} characters or fewer.`, 400, field);
    if ((multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(value)) throw new SubmissionError(`Please remove unsupported characters from ${label}.`, 400, field);
    return value;
}

export function validateSubmission(kind, body) {
    if (!['contact', 'careers'].includes(kind)) throw new Error('Unknown form type');
    if (typeof body.submissionId !== 'string' || !UUID.test(body.submissionId)) throw new SubmissionError('Please reload the page before sending this form again.', 400, 'submissionId');
    const submissionId = body.submissionId.toLowerCase();
    const payload = { name: text(body, 'name', 'your name', 200), email: text(body, 'email', 'your email address', 200) };
    if (kind === 'contact') payload.message = text(body, 'message', 'your project details', 5200, true);
    else {
        payload.expertise = text(body, 'expertise', 'your background and interests', 5000, true);
        try { Object.assign(payload, validateAttachment(body.filename, body.fileBase64)); }
        catch (error) { throw new SubmissionError(error.message, error.status || 400, 'cv'); }
    }
    return { submissionId, payload };
}
