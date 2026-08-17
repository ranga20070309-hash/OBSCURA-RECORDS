const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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

    const { artistName, artistEmail, trackTitle, messageText, subId } = req.body || {};

    if (!artistEmail || !messageText) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const cleanArtist = sanitize(artistName || 'Producer');
    const cleanEmail = artistEmail.trim();
    const cleanTrack = sanitize(trackTitle || 'Demo Submission');
    const cleanMsg = sanitize(messageText);
    const cleanSubId = sanitize(subId || 'N/A');

    try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const mailOptions = {
                from: `"OBSCURA ARTIST PORTAL" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                replyTo: cleanEmail,
                subject: `[A&R COMMUNIQUE] ${cleanArtist} — Re: ${cleanTrack}`,
                text: `New message from Producer ${cleanArtist} (${cleanEmail})\nTrack: ${cleanTrack}\nSubmission ID: ${cleanSubId}\n\nMessage:\n${messageText}`,
                html: `
                    <div style="background-color:#050508; color:#e0e0e0; font-family:'Courier New', monospace; padding:30px; border:1px solid #00f0ff; border-radius:8px; max-width:600px;">
                        <h2 style="color:#00f0ff; letter-spacing:2px; margin-top:0;">[ OBSCURA RECORDS // ARTIST MESSAGE ]</h2>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px;">
                            <tr><td style="padding: 4px 0; color:#888; width: 120px;">PRODUCER:</td><td style="color:#ffffff; font-weight:bold;">${cleanArtist}</td></tr>
                            <tr><td style="padding: 4px 0; color:#888;">EMAIL:</td><td><a href="mailto:${cleanEmail}" style="color:#00f0ff;">${cleanEmail}</a></td></tr>
                            <tr><td style="padding: 4px 0; color:#888;">TRACK:</td><td style="color:#00ff88;">${cleanTrack}</td></tr>
                            <tr><td style="padding: 4px 0; color:#888;">DEMO ID:</td><td><code style="color:#ffaa00;">${cleanSubId}</code></td></tr>
                        </table>
                        <hr style="border:none; border-top:1px solid rgba(0,240,255,0.2); margin:15px 0;">
                        <div style="background:rgba(0,240,255,0.06); padding:16px; border-left:3px solid #00f0ff; border-radius:0 4px 4px 0; font-size: 14px; line-height: 1.6; color:#ffffff;">
                            ${cleanMsg.replace(/\n/g, '<br>')}
                        </div>
                        <hr style="border:none; border-top:1px solid rgba(0,240,255,0.2); margin:15px 0;">
                        <p style="font-size:0.75rem; color:#666; margin:0;">You can click Reply in your email client to directly reply to ${cleanEmail}, or respond through the Obscura Admin Command Portal.</p>
                    </div>
                `,
                headers: {
                    'X-Priority': '1 (Highest)',
                    'X-MSMail-Priority': 'High',
                    'Importance': 'High'
                }
            };

            await transporter.sendMail(mailOptions);
        }

        return res.status(200).json({ success: true, message: 'Delivered to Obscura A&R Desk' });
    } catch (err) {
        console.error("Artist message notification error:", err);
        return res.status(500).json({ error: 'Failed to deliver message via SMTP.' });
    }
};
