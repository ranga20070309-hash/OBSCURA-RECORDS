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

async function sendDiscordContactNotification({ name, email, message }) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1538094536637550635/00D-4jyKHXXsNlXMb250cnhl8DPIQVJtyqu9EjKg0fTLXl5i0yT1F0pHN_EcNMZJm_OR';
    if (!webhookUrl) return;

    const payload = {
        username: "OBSCURA CONTACT DISPATCH",
        avatar_url: "https://obscurarecords.com/assets/og-preview.png",
        embeds: [
            {
                title: "📬 NEW DIRECT CONTACT MESSAGE",
                color: 0xb700ff, // Purple Accent
                timestamp: new Date().toISOString(),
                fields: [
                    { name: "👤 Name", value: `**${name}**`, inline: true },
                    { name: "📧 Email", value: `[${email}](mailto:${email})`, inline: true },
                    { name: "💬 Message", value: message ? (message.length > 900 ? message.substring(0, 897) + "..." : message) : "*No message attached.*", inline: false }
                ],
                footer: {
                    text: "Obscura Records • Portal Management Engine",
                    icon_url: "https://obscurarecords.com/assets/og-preview.png"
                }
            }
        ]
    };

    try {
        await axios.post(webhookUrl, payload);
        console.log("✅ Discord Contact Webhook Dispatched");
    } catch (err) {
        console.error("❌ Discord Contact Webhook Error:", err?.response?.data || err.message);
    }
}

function isAllowedOrigin(origin) {
    if (!origin) return true;
    const allowed = ['obscura', 'vercel.app', 'localhost', '127.0.0.1', 'github.io'];
    return allowed.some(domain => origin.toLowerCase().includes(domain));
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

    const origin = req.headers.origin || req.headers.referer || '';
    if (origin && !isAllowedOrigin(origin)) {
        return res.status(403).json({ error: 'Forbidden. Unauthorized Origin.' });
    }

    const { name, email, message, recaptcha_token } = req.body || {};

    if (!email || !name || !message || email.length < 5 || name.length < 2) {
        return res.status(400).json({ error: 'Missing or invalid required fields' });
    }

    const isValidCaptcha = await verifyRecaptcha(recaptcha_token, origin);
    if (!isValidCaptcha) {
        return res.status(403).json({ error: 'reCAPTCHA verification failed.' });
    }

    const cleanName = sanitize(name);
    const cleanEmail = email.trim();
    const cleanMessage = sanitize(message);

    try {
        const adminMailOptions = {
            from: `"Obscura Records" <${process.env.EMAIL_USER}>`,
            replyTo: cleanEmail,
            to: process.env.EMAIL_USER,
            subject: `[CONTACT INQUIRY] Message from ${cleanName}`,
            text: `New Contact Message\n\nFrom: ${cleanName}\nEmail: ${cleanEmail}\n\nMessage:\n${cleanMessage}`,
            html: `
                <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111111;">
                    <h2 style="color: #6a0dad; margin-bottom: 10px;">New Contact Inquiry</h2>
                    <table style="width: 100%; max-width: 600px; border-collapse: collapse;">
                        <tr><td style="padding: 6px 0; font-weight: bold; width: 140px;">Name:</td><td>${cleanName}</td></tr>
                        <tr><td style="padding: 6px 0; font-weight: bold;">Email:</td><td><a href="mailto:${cleanEmail}">${cleanEmail}</a></td></tr>
                    </table>
                    <div style="margin-top: 15px; padding: 12px; background-color: #f4f4f4; border-left: 4px solid #6a0dad;">
                        <strong>Message:</strong><br/>
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

        const userMailOptions = {
            from: `"Obscura Records" <${process.env.EMAIL_USER}>`,
            to: cleanEmail,
            subject: `We have received your message - Obscura Records`,
            text: `Hi ${cleanName},\n\nThank you for reaching out to Obscura Records. We have safely received your inquiry.\n\nOur team reviews all incoming correspondence and will respond as soon as possible if your inquiry requires a response.\n\nBest Regards,\nObscura Records Team\nhttps://obscurarecords.com`,
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
                                <h1 style="color: #b700ff; margin: 0; font-size: 24px; letter-spacing: 3px; text-transform: uppercase;">OBSCURA RECORDS</h1>
                                <p style="color: #c5c6c7; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 1px;">DIRECT TRANSMISSION RECEIVED</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 40px 30px 40px; font-size: 15px; line-height: 1.7; color: #333333;">
                                <p style="margin-top: 0; font-size: 16px;">Hi <strong>${cleanName}</strong>,</p>
                                <p>Thank you for getting in touch with <strong>Obscura Records</strong>. We have received your inquiry and forwarded it to our management team.</p>
                                <p style="color: #555555;">We will review your inquiry and get back to you if follow-up is needed.</p>
                                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;" />
                                <p style="margin-top: 10px;"><strong>Best Regards,</strong><br/>Management & Support<br/><strong>Obscura Records</strong></p>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #f9fbfd; padding: 20px 40px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #eaeaea;">
                                <p style="margin: 0 0 5px 0;">This transmission was generated from <a href="https://obscurarecords.com" style="color: #6a0dad; text-decoration: none;">obscurarecords.com</a>.</p>
                                <p style="margin: 0;">Obscura Records &bull; All Rights Reserved.</p>
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

        await Promise.allSettled([
            transporter.sendMail(adminMailOptions),
            transporter.sendMail(userMailOptions),
            sendDiscordContactNotification({
                name: cleanName,
                email: cleanEmail,
                message: cleanMessage
            })
        ]);

        return res.status(200).json({ success: true, message: 'Contact emails and Discord notification dispatched securely.' });
    } catch (error) {
        console.error("Email Sending Error:", error);
        return res.status(500).json({ error: 'Failed to send emails. Server error.' });
    }
};
