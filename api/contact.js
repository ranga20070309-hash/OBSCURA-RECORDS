const nodemailer = require('nodemailer');
const axios = require('axios');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function verifyRecaptcha(token, requestOrigin) {
    if (!process.env.RECAPTCHA_SECRET_KEY) return true;
    
    const isLocal = requestOrigin && (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1'));
    if (isLocal) {
        return true;
    }

    try {
        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
        );
        return response.data.success;
    } catch (error) {
        console.error("reCAPTCHA verification error:", error);
        return false;
    }
}

function sanitize(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { name, email, message, recaptcha_token } = req.body || {};

    if (!email || !name || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const origin = req.headers.origin || req.headers.referer || '';
    const isValidCaptcha = await verifyRecaptcha(recaptcha_token, origin);
    if (!isValidCaptcha) {
        return res.status(403).json({ error: 'reCAPTCHA verification failed.' });
    }

    const cleanName = sanitize(name);
    const cleanEmail = sanitize(email);
    const cleanMessage = sanitize(message);

    try {
        const adminMailOptions = {
            from: `"Obscura Contact Portal" <${process.env.EMAIL_USER}>`,
            replyTo: email,
            to: process.env.EMAIL_USER,
            subject: `[CONTACT] Message from ${cleanName}`,
            html: `
                <h2>New Contact Message</h2>
                <p><strong>From:</strong> ${cleanName}</p>
                <p><strong>Email:</strong> ${cleanEmail}</p>
                <br/>
                <p><strong>Message:</strong></p>
                <p>${cleanMessage}</p>
            `
        };

        const userMailOptions = {
            from: `"Obscura Records" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `We received your message - Obscura Records`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; padding: 30px; border: 1px solid #b700ff; border-radius: 10px;">
                    <h2 style="color: #b700ff; letter-spacing: 2px;">OBSCURA RECORDS</h2>
                    <p>Hi ${cleanName},</p>
                    <p>We have received your message. Our team will review your inquiry and get back to you if necessary.</p>
                    <p>Thank you for reaching out to the void.</p>
                    <br/>
                    <p>Best Regards,<br/><strong>Obscura Records Team</strong></p>
                </div>
            `
        };

        await transporter.sendMail(adminMailOptions);
        await transporter.sendMail(userMailOptions);

        return res.status(200).json({ success: true, message: 'Contact emails dispatched securely.' });
    } catch (error) {
        console.error("Email Sending Error:", error);
        return res.status(500).json({ error: 'Failed to send emails. Server error.' });
    }
};
