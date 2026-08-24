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
            subject: `Inquiry Received - Obscura Records`,
            text: `Hi ${cleanName},\n\nThank you for reaching out to Obscura Records. We have safely received your inquiry and forwarded it to our management team.\n\nOur team reviews all incoming correspondence and will respond as soon as possible if your inquiry requires follow-up.\n\nBest Regards,\nManagement & Support\nObscura Records\nhttps://obscurarecord.com\n\n---\nNOTE: This is an automated notification. Please do not reply directly to this email as incoming replies to this address are not monitored.`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Obscura Records - Inquiry Received</title>
                </head>
                <body style="margin: 0; padding: 25px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050510; color: #e2e8f0;">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0c0a1a; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 35px rgba(0,0,0,0.8); border: 1px solid rgba(183, 0, 255, 0.25);">
                        <!-- Top Neon Accent Bar -->
                        <tr>
                            <td style="height: 4px; background: linear-gradient(90deg, #b700ff 0%, #00f0ff 50%, #ff007f 100%); line-height: 4px; font-size: 0;">&nbsp;</td>
                        </tr>
                        <!-- Header -->
                        <tr>
                            <td style="background-color: #080614; padding: 32px 35px 25px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.07);">
                                <h1 style="color: #b700ff; margin: 0; font-size: 24px; letter-spacing: 3.5px; font-weight: 800; text-transform: uppercase; text-shadow: 0 0 15px rgba(183,0,255,0.4);">OBSCURA RECORDS</h1>
                                <p style="color: #00f0ff; margin: 6px 0 0 0; font-size: 11.5px; letter-spacing: 2px; font-weight: 700; text-transform: uppercase;">MANAGEMENT // TRANSMISSION RECEIVED</p>
                            </td>
                        </tr>
                        <!-- Main Message Area -->
                        <tr>
                            <td style="background-color: #0f0c22; padding: 35px 35px 30px; font-size: 14.5px; line-height: 1.7; color: #cbd5e1;">
                                <p style="margin-top: 0; font-size: 16px; color: #ffffff;">Hi <strong style="color: #b700ff;">${cleanName}</strong>,</p>
                                <p style="margin-bottom: 18px;">Thank you for getting in touch with <strong style="color: #ffffff;">Obscura Records</strong>. We have safely received your transmission and forwarded it to our management team.</p>
                                
                                <!-- Status Card -->
                                <div style="background-color: #171333; border: 1px solid rgba(183, 0, 255, 0.2); border-left: 4px solid #b700ff; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
                                    <p style="margin: 0; color: #b700ff; font-weight: bold; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Direct Inquiry Status</p>
                                    <p style="margin: 4px 0 0 0; font-size: 13.5px; color: #f1f5f9;">Status: <span style="color: #38bdf8; font-weight: 600;">Dispatched to Management Queue</span></p>
                                </div>

                                <p style="color: #94a3b8; margin-bottom: 16px;">Our team reviews all incoming inquiries and will respond promptly if your inquiry requires follow-up.</p>
                                
                                <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 28px 0 20px;" />
                                
                                <p style="margin-top: 10px; line-height: 1.5; color: #94a3b8;">
                                    <strong style="color: #ffffff;">Best Regards,</strong><br/>
                                    Management & Support<br/>
                                    <span style="color: #b700ff; font-weight: bold;">Obscura Records</span>
                                </p>

                                <!-- Automated Do-Not-Reply Notice -->
                                <div style="background: rgba(183, 0, 255, 0.08); border: 1px solid rgba(183, 0, 255, 0.25); border-radius: 8px; padding: 12px 16px; margin: 25px 0 5px; text-align: center;">
                                    <p style="margin: 0; font-size: 12px; color: #d8b4fe; line-height: 1.5;">
                                        ⚡ <strong>AUTOMATED NOTIFICATION:</strong> This email was generated automatically. <strong>Please do not reply directly to this email</strong> as replies to this address are not monitored.
                                    </p>
                                </div>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #080614; padding: 22px 35px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.07);">
                                <p style="margin: 0 0 6px 0; color: #94a3b8;">
                                    Official Website: <a href="https://obscurarecord.com" target="_blank" style="color: #00f0ff; text-decoration: none; font-weight: 600;">obscurarecord.com</a>
                                </p>
                                <p style="margin: 0; font-size: 11px; color: #475569; letter-spacing: 0.5px;">
                                    OBSCURA RECORDS &bull; ELECTRONIC &amp; PHONK MOVEMENT &bull; ALL RIGHTS RESERVED
                                </p>
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
