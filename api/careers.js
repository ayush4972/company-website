import { sendCareersEmail } from '../backend/mailer.js';
import { isValidEmail } from '../backend/validateEmail.js';

// Base64 adds roughly 33%; 3 MiB keeps the JSON request below Vercel's 4.5 MB cap.
const MAX_FILE_BYTES = 3 * 1024 * 1024;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, email, expertise, filename, fileBase64 } = req.body || {};

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required.' });
    }
    if (!(await isValidEmail(email))) {
        return res.status(400).json({ error: 'Please provide a valid, deliverable email address.' });
    }
    if (fileBase64) {
        if (typeof fileBase64 !== 'string' || !filename || !/\.(pdf|doc|docx)$/i.test(String(filename))) {
            return res.status(400).json({ error: 'Please attach a PDF, DOC, or DOCX file.' });
        }
        const fileBytes = Buffer.byteLength(fileBase64, 'base64');
        if (fileBytes > MAX_FILE_BYTES) {
            return res.status(413).json({ error: 'CV file is too large. Please keep it under 3 MB.' });
        }
    }

    try {
        await sendCareersEmail({
            name: String(name).slice(0, 200),
            email: String(email).slice(0, 200),
            expertise: expertise ? String(expertise).slice(0, 5000) : '',
            filename: filename ? String(filename).slice(0, 200) : undefined,
            fileBase64: fileBase64 || undefined,
        });
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('careers email failed:', err);
        return res.status(502).json({ error: 'Could not send your application right now. Please try again later.' });
    }
}
