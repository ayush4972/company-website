import { sendCareersEmail } from '../backend/mailer.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB, comfortably under Vercel's request body limit

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, email, expertise, filename, fileBase64 } = req.body || {};

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required.' });
    }
    if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (fileBase64) {
        const approxBytes = fileBase64.length * 0.75;
        if (approxBytes > MAX_FILE_BYTES) {
            return res.status(413).json({ error: 'CV file is too large. Please keep it under 4MB.' });
        }
    }

    try {
        await sendCareersEmail({
            name: String(name).slice(0, 200),
            email: String(email).slice(0, 200),
            expertise: expertise ? String(expertise).slice(0, 300) : '',
            filename: filename ? String(filename).slice(0, 200) : undefined,
            fileBase64: fileBase64 || undefined,
        });
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('careers email failed:', err);
        return res.status(502).json({ error: 'Could not send your application right now. Please try again later.' });
    }
}
