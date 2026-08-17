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

    const { artistName, artistEmail, trackTitle, genre, messageText, subId } = req.body || {};

    if (!artistEmail || !messageText) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const cleanArtist = sanitize(artistName || 'Producer');
    const cleanEmail = artistEmail.trim();
    const cleanTrack = sanitize(trackTitle || 'Demo');
    const cleanGenre = sanitize(genre || 'test');
    const cleanMsg = sanitize(messageText);
    const cleanSubId = sanitize(subId || 'general');

    try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const threadSubject = `Re: [DEMO SUBMISSION] ${cleanArtist} - ${cleanGenre}`;
            const messageThreadId = `<demo-${cleanSubId}@obscurarecord.com>`;

            const mailOptions = {
                from: `"Obscura Records" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                replyTo: cleanEmail,
                subject: threadSubject,
                text: `${cleanArtist} (${cleanEmail}) sent a message:\n\n${messageText}`,
                html: `
                    <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111111;">
                        <p style="margin:0 0 10px 0;"><strong>${cleanArtist}</strong> (<a href="mailto:${cleanEmail}">${cleanEmail}</a>) replied in A&R Direct Line:</p>
                        <div style="background-color: #f4f4f4; border-left: 4px solid #0066cc; padding: 12px; margin: 10px 0; border-radius: 0 4px 4px 0;">
                            <p style="margin: 0; white-space: pre-wrap;">${cleanMsg}</p>
                        </div>
                        <p style="font-size: 12px; color: #777; margin-top: 15px;">Track: ${cleanTrack} | Submission ID: ${cleanSubId}</p>
                    </div>
                `,
                headers: {
                    'In-Reply-To': messageThreadId,
                    'References': messageThreadId,
                    'X-Priority': '1 (Highest)',
                    'X-MSMail-Priority': 'High',
                    'Importance': 'High'
                }
            };

            await transporter.sendMail(mailOptions);
        }

        return res.status(200).json({ success: true, message: 'Delivered into conversation thread.' });
    } catch (err) {
        console.error("Artist message notification error:", err);
        return res.status(500).json({ error: 'Failed to deliver message via SMTP.' });
    }
};
