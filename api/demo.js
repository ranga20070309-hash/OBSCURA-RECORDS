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
    
    // Bypass for localhost testing if requested from local
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

    const { name, artist, email, genre, link, spotify, message, date, recaptcha_token } = req.body || {};

    if (!email || !artist || !link) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const origin = req.headers.origin || req.headers.referer || '';
    const isValidCaptcha = await verifyRecaptcha(recaptcha_token, origin);
    if (!isValidCaptcha) {
        return res.status(403).json({ error: 'reCAPTCHA verification failed. Bot traffic rejected.' });
    }

    const cleanName = sanitize(name);
    const cleanArtist = sanitize(artist);
    const cleanEmail = sanitize(email);
    const cleanGenre = sanitize(genre);
    const cleanLink = sanitize(link);
    const cleanSpotify = sanitize(spotify);
    const cleanMessage = sanitize(message);
    const cleanDate = sanitize(date);

    try {
        // 1. Email to ADMIN (Label)
        const adminMailOptions = {
            from: `"Obscura Records Portal" <${process.env.EMAIL_USER}>`,
            replyTo: email,
            to: process.env.EMAIL_USER,
            subject: `[NEW DEMO] ${cleanArtist} - ${cleanGenre}`,
            html: `
                <h2>New Demo Submission Received</h2>
                <p><strong>Date:</strong> ${cleanDate}</p>
                <p><strong>Artist Name:</strong> ${cleanArtist}</p>
                <p><strong>Real Name:</strong> ${cleanName}</p>
                <p><strong>Email Address:</strong> ${cleanEmail}</p>
                <p><strong>Genre:</strong> ${cleanGenre}</p>
                <br/>
                <p><strong>Demo Link:</strong> <a href="${cleanLink}">${cleanLink}</a></p>
                <p><strong>Spotify/Presence:</strong> ${cleanSpotify}</p>
                <br/>
                <p><strong>Message:</strong></p>
                <p>${cleanMessage}</p>
                <hr/>
                <p><small>This email was sent securely from the Obscura Records Portal.</small></p>
            `
        };

        // 2. Auto-Reply to USER
        const userMailOptions = {
            from: `"Obscura Records" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Demo Received - Obscura Records`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; padding: 30px; border: 1px solid #00f0ff; border-radius: 10px;">
                    <h2 style="color: #00f0ff; letter-spacing: 2px;">OBSCURA RECORDS</h2>
                    <p>Hi ${cleanArtist},</p>
                    <p>Thank you for submitting your demo to Obscura Records. Our A&R team has successfully received your track.</p>
                    <p style="color: #cccccc;">Due to the high volume of submissions, we will only contact you if we feel your music aligns with our current vision and release schedule. Please allow us a few weeks to review your track.</p>
                    <p>Keep up the great work!</p>
                    <br/>
                    <p>Best Regards,<br/><strong>Obscura Records Team</strong></p>
                    <a href="https://obscurarecords.com" style="color: #00f0ff; text-decoration: none;">www.obscurarecords.com</a>
                </div>
            `
        };

        await transporter.sendMail(adminMailOptions);
        await transporter.sendMail(userMailOptions);

        return res.status(200).json({ success: true, message: 'Emails dispatched securely.' });
    } catch (error) {
        console.error("Email Sending Error:", error);
        return res.status(500).json({ error: 'Failed to send emails. Server error.' });
    }
};
