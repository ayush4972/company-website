import { Resend } from 'resend';
import { deliverEmail } from './deliverEmail.js';

const TO = 'info@trasiertech.com.np';

function configurationError() {
    const error = new Error('Configure RESEND_API_KEY and a verified company sender in RESEND_FROM.');
    error.code = 'EMAIL_CONFIGURATION';
    return error;
}

export function emailConfiguration(env = process.env) {
    const apiKey = typeof env.RESEND_API_KEY === 'string' ? env.RESEND_API_KEY.trim() : '';
    const from = typeof env.RESEND_FROM === 'string' ? env.RESEND_FROM.trim() : '';
    // Accept a plain address or "Company name <address>"; never the shared test domain.
    const address = typeof from === 'string' ? /^(?:[^<>\r\n]+<([^<>\s]+)>|([^<>\s]+))$/.exec(from) : null;
    const mailbox = address?.[1] || address?.[2] || '';
    if (!apiKey || apiKey === 're_your_resend_api_key_here' || !from || /[\r\n]/.test(from)
        || !/^[^@\s]+@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}$/i.test(mailbox)
        || /@(?:[^@]*\.)?resend\.dev$/i.test(mailbox)) throw configurationError();
    return { apiKey, from };
}

function getClient() {
    const { apiKey, from } = emailConfiguration();
    return { resend: new Resend(apiKey), from };
}

export async function sendContactEmail({ name, email, message }, options) {
    const { resend, from } = getClient();
    return deliverEmail(resend, {
        from,
        to: TO,
        replyTo: email,
        subject: `New mission request from ${name}`,
        html: `
            <h2>New contact form submission</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>
        `,
    }, options);
}

export async function sendCareersEmail({ name, email, expertise, filename, fileBase64 }, options) {
    const { resend, from } = getClient();
    return deliverEmail(resend, {
        from,
        to: TO,
        replyTo: email,
        subject: `New career application from ${name}`,
        html: `
            <h2>New careers submission</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Areas of expertise:</strong> ${escapeHtml(expertise || 'Not specified')}</p>
            ${filename ? `<p><strong>Attached CV:</strong> ${escapeHtml(filename)}</p>` : '<p>No CV attached.</p>'}
        `,
        attachments: filename && fileBase64 ? [{ filename, content: fileBase64 }] : undefined,
    }, options);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
