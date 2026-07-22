import { sendContactEmail } from '../backend/mailer.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, email, message } = req.body || {};

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
    }
    if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    try {
        await sendContactEmail({
            name: String(name).slice(0, 200),
            email: String(email).slice(0, 200),
            message: String(message).slice(0, 5000),
        });
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('contact email failed:', err);
        return res.status(502).json({ error: 'Could not send your message right now. Please try again later.' });
    }
}
