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
    const cleanEmail = email.trim();
    const cleanGenre = sanitize(genre);
    const cleanLink = sanitize(link);
    const cleanSpotify = sanitize(spotify);
    const cleanMessage = sanitize(message);
    const cleanDate = sanitize(date);

    try {
        // 1. Email to ADMIN (Label)
        const adminMailOptions = {
            from: `"Obscura Records" <${process.env.EMAIL_USER}>`,
            replyTo: cleanEmail,
            to: process.env.EMAIL_USER,
            subject: `[DEMO SUBMISSION] ${cleanArtist} - ${cleanGenre}`,
            text: `New Demo Received\n\nArtist: ${cleanArtist}\nName: ${cleanName}\nEmail: ${cleanEmail}\nGenre: ${cleanGenre}\nLink: ${cleanLink}\nPresence: ${cleanSpotify}\n\nMessage:\n${cleanMessage}\nDate: ${cleanDate}`,
            html: `
                <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111111;">
                    <h2 style="color: #0066cc; margin-bottom: 10px;">New Demo Submission Received</h2>
                    <table style="width: 100%; max-width: 600px; border-collapse: collapse;">
                        <tr><td style="padding: 6px 0; font-weight: bold; width: 140px;">Artist Name:</td><td>${cleanArtist}</td></tr>
                        <tr><td style="padding: 6px 0; font-weight: bold;">Real Name:</td><td>${cleanName}</td></tr>
                        <tr><td style="padding: 6px 0; font-weight: bold;">Email:</td><td><a href="mailto:${cleanEmail}">${cleanEmail}</a></td></tr>
                        <tr><td style="padding: 6px 0; font-weight: bold;">Genre:</td><td>${cleanGenre}</td></tr>
                        <tr><td style="padding: 6px 0; font-weight: bold;">Demo Link:</td><td><a href="${cleanLink}" target="_blank">${cleanLink}</a></td></tr>
                        <tr><td style="padding: 6px 0; font-weight: bold;">Spotify / Links:</td><td>${cleanSpotify}</td></tr>
                        <tr><td style="padding: 6px 0; font-weight: bold;">Submission Date:</td><td>${cleanDate}</td></tr>
                    </table>
                    <div style="margin-top: 15px; padding: 12px; background-color: #f4f4f4; border-left: 4px solid #0066cc;">
                        <strong>Artist Message / Bio:</strong><br/>
                        <p style="margin: 5px 0 0 0; white-space: pre-wrap;">${cleanMessage}</p>
                    </div>
                </div>
            `,
            headers: {
                'X-Priority': '1 (Highest)',
                'X-MSMail-Priority': 'High',
                'Importance': 'High'
            }
        };

        // 2. Auto-Reply to USER (Optimized for 100% Inbox Placement)
        const userMailOptions = {
            from: `"Obscura Records" <${process.env.EMAIL_USER}>`,
            to: cleanEmail,
            subject: `Thank you for submitting your demo to Obscura Records`,
            text: `Hi ${cleanArtist},\n\nThank you for submitting your demo to Obscura Records. Our A&R team has received your submission and added it to our review queue.\n\nDue to the high volume of demos we receive daily, our team will reach out to you directly if your sound matches our upcoming releases and schedule. Please allow 2-3 weeks for our review process.\n\nWe appreciate your passion and interest in working with Obscura Records.\n\nBest Regards,\nA&R Team\nObscura Records\nhttps://obscurarecords.com\ncontact: artists@obscurarecord.com`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; color: #222222;">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #eaeaea;">
                        <tr>
                            <td style="background-color: #0b0c10; padding: 30px 40px; text-align: center;">
                                <h1 style="color: #66fcf1; margin: 0; font-size: 24px; letter-spacing: 3px; text-transform: uppercase;">OBSCURA RECORDS</h1>
                                <p style="color: #c5c6c7; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 1px;">A&R DEPARTMENT</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 40px 30px 40px; font-size: 15px; line-height: 1.7; color: #333333;">
                                <p style="margin-top: 0; font-size: 16px;">Hi <strong>${cleanArtist}</strong>,</p>
                                <p>Thank you for submitting your track to <strong>Obscura Records</strong>. We have safely received your demo and added it to our A&R review queue.</p>
                                <p style="color: #555555;">Our team listens to every submission carefully. Due to the high volume of releases we manage, we will reach out to you directly if your music aligns with our upcoming catalog and sonic direction.</p>
                                <p style="color: #555555;">Please allow our team <strong>2 to 3 weeks</strong> to review your submission.</p>
                                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;" />
                                <p style="margin-bottom: 0;">Keep pushing boundaries and creating powerful music.</p>
                                <p style="margin-top: 10px;"><strong>Best Regards,</strong><br/>A&R Department<br/><strong>Obscura Records</strong></p>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #f9fbfd; padding: 20px 40px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #eaeaea;">
                                <p style="margin: 0 0 5px 0;">This is an automated confirmation of your submission to <a href="https://obscurarecords.com" style="color: #0066cc; text-decoration: none;">obscurarecords.com</a>.</p>
                                <p style="margin: 0;">Obscura Records &bull; Electronic & Phonk Movement</p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `,
            headers: {
                'X-Auto-Response-Suppress': 'All',
                'Precedence': 'bulk',
                'Auto-Submitted': 'auto-replied',
                'List-Unsubscribe': '<mailto:artists@obscurarecord.com?subject=unsubscribe>'
            }
        };

        await transporter.sendMail(adminMailOptions);
        await transporter.sendMail(userMailOptions);

        return res.status(200).json({ success: true, message: 'Emails dispatched securely.' });
    } catch (error) {
        console.error("Email Sending Error:", error);
        return res.status(500).json({ error: 'Failed to send emails. Server error.' });
    }
};
