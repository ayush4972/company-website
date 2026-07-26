import { Resend } from 'resend';

const TO = 'info@trasiertech.com.np';
const FROM = 'Trasier Tech <onboarding@resend.dev>';

function getClient() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error('RESEND_API_KEY is not set');
    }
    return new Resend(apiKey);
}

export async function sendContactEmail({ name, email, message }) {
    const resend = getClient();
    return resend.emails.send({
        from: FROM,
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
    });
}

export async function sendCareersEmail({ name, email, expertise, filename, fileBase64 }) {
    const resend = getClient();
    return resend.emails.send({
        from: FROM,
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
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
