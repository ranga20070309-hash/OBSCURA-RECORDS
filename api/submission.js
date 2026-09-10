const nodemailer = require('nodemailer');
const axios = require('axios');

const TARGET_SUBMISSION_EMAIL = 'mail.obscurarecords@gmail.com';
const FIREBASE_DB_URL = "https://submission-code-and-mail-sys-default-rtdb.asia-southeast1.firebasedatabase.app";

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

function isAllowedOrigin(origin) {
    if (!origin || origin === 'null' || origin.startsWith('file:')) return true;
    const allowed = ['obscura', 'vercel.app', 'localhost', '127.0.0.1', 'github.io'];
    return allowed.some(domain => origin.toLowerCase().includes(domain));
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

    const origin = req.headers.origin || req.headers.referer || '';
    if (origin && !isAllowedOrigin(origin)) {
        return res.status(403).json({ error: 'Forbidden. Unauthorized Origin.' });
    }

    const {
        acceptanceCode,
        songTitle,
        realName,
        mainArtist,
        mainArtistSpotify,
        email,
        genre,
        releaseDate,
        driveLink,
        collaborators,
        notes,
        submissionId
    } = req.body || {};

    // 1. Acceptance Code Verification
    const cleanCode = (acceptanceCode || '').toUpperCase().trim();
    if (!cleanCode) {
        return res.status(400).json({ error: 'Acceptance code is required to submit.' });
    }

    try {
        const codeLookupUrl = `${FIREBASE_DB_URL}/accepted_codes/${encodeURIComponent(cleanCode)}.json`;
        const codeRes = await axios.get(codeLookupUrl);
        const codeRecord = codeRes.data;

        if (!codeRecord) {
            return res.status(403).json({
                error: 'This code is not recognized by the demo accepted list. Please contact our team.'
            });
        }

        if (codeRecord.status === 'used') {
            return res.status(403).json({
                error: 'This acceptance code has already been used for a submission. Please contact our team.'
            });
        }

        if (codeRecord.status !== 'active') {
            return res.status(403).json({
                error: 'This code is not recognized by the demo accepted list. Please contact our team.'
            });
        }

        // 2. Field Validation
        if (!realName || !mainArtist || !email || !driveLink || !songTitle) {
            return res.status(400).json({ error: 'Please fill in all required submission fields.' });
        }

        const cleanSongTitle = sanitize(songTitle);
        const cleanRealName = sanitize(realName);
        const cleanMainArtist = sanitize(mainArtist);
        const cleanMainArtistSpotify = (mainArtistSpotify || '').trim();
        const cleanEmail = email.trim();
        const cleanGenre = sanitize(genre) || 'Not specified';
        const cleanReleaseDate = sanitize(releaseDate) || 'Flexible / To Be Decided';
        const cleanDriveLink = driveLink.trim();
        const cleanNotes = sanitize(notes) || 'None provided.';
        const subId = sanitize(submissionId) || `OBS-${Date.now().toString(36).toUpperCase()}`;
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC';

        // Sanitize collaborators
        const cleanCollaborators = Array.isArray(collaborators)
            ? collaborators
                .filter(c => c && (c.artistName || c.realName || c.role || c.spotifyLink))
                .map(c => ({
                    artistName: sanitize(c.artistName) || 'N/A',
                    realName: sanitize(c.realName) || 'N/A',
                    role: sanitize(c.role) || 'Featured / Collaborator',
                    spotifyLink: (c.spotifyLink || '').trim()
                }))
            : [];

        // Collaborators HTML
        let collaboratorsHtml = '';
        if (cleanCollaborators.length > 0) {
            collaboratorsHtml = `
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px; background-color: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <thead>
                        <tr style="background-color: #f1f5f9; color: #334155; font-size: 12px; font-weight: 700; text-transform: uppercase;">
                            <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #cbd5e1;">#</th>
                            <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #cbd5e1;">Artist Name</th>
                            <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #cbd5e1;">Real Name</th>
                            <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #cbd5e1;">Role</th>
                            <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #cbd5e1;">Spotify Link</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cleanCollaborators.map((c, i) => `
                            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b;">
                                <td style="padding: 10px 12px; font-weight: bold; color: #64748b;">${i + 1}</td>
                                <td style="padding: 10px 12px; font-weight: 600;">${c.artistName}</td>
                                <td style="padding: 10px 12px;">${c.realName}</td>
                                <td style="padding: 10px 12px; color: #7c3aed; font-weight: 600;">${c.role}</td>
                                <td style="padding: 10px 12px;">
                                    ${c.spotifyLink ? `<a href="${c.spotifyLink}" target="_blank" style="color: #0284c7; text-decoration: underline; font-weight: 500;">View Profile</a>` : '<span style="color: #94a3b8;">None</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            collaboratorsHtml = `
                <div style="padding: 12px 14px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; color: #64748b; font-size: 13px;">
                    No additional collaborators (Solo track).
                </div>
            `;
        }

        // Admin Email HTML (Premium High-Contrast A&R Dossier)
        const adminEmailHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>New Track Submission - OBSCURA REC LLC</title>
            </head>
            <body style="margin: 0; padding: 24px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #1e293b;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 680px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td style="background: #090d16; padding: 26px 30px; border-bottom: 3px solid #0284c7;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="vertical-align: middle;">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="vertical-align: middle; padding-right: 14px;">
                                                    <img src="https://obscurarecord.com/assets/OCR_circle.png" width="46" height="46" style="border-radius: 50%; border: 1.5px solid #38bdf8; display: block;" alt="OCR">
                                                </td>
                                                <td style="vertical-align: middle;">
                                                    <div style="color: #ffffff; font-size: 19px; font-weight: 800; letter-spacing: 0.8px; line-height: 1.2;">OBSCURA REC LLC</div>
                                                    <div style="color: #38bdf8; font-size: 11.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 3px;">A&amp;R TRACK SUBMISSION DOSSIER</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td style="text-align: right; vertical-align: middle;">
                                        <div style="display: inline-block; background: #0f172a; border: 1px solid #334155; color: #94a3b8; padding: 6px 12px; border-radius: 6px; font-size: 11.5px; font-family: monospace; font-weight: 600;">
                                            ID: <strong style="color: #38bdf8;">${subId}</strong>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 28px 30px;">

                            <!-- Verified Acceptance Code Card -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 22px;">
                                <tr>
                                    <td style="padding: 14px 18px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td>
                                                    <span style="color: #15803d; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                                                        &#10003; VERIFIED DEMO ACCEPTANCE CODE
                                                    </span>
                                                </td>
                                                <td style="text-align: right;">
                                                    <span style="font-family: monospace; font-size: 14px; font-weight: 700; color: #166534; background: #dcfce7; border: 1px solid #86efac; padding: 4px 10px; border-radius: 4px; letter-spacing: 1px;">
                                                        ${cleanCode}
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="padding-top: 8px; font-size: 12.5px; color: #166534;">
                                                    Assigned to: <strong>${codeRecord.artistName || cleanMainArtist}</strong> (${codeRecord.realName || cleanRealName}) &bull; Accepted: <strong>${codeRecord.acceptedDate || 'Recently Approved'}</strong>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Hero Song Card -->
                            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                                <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; color: #64748b; margin-bottom: 4px;">RELEASE TITLE</div>
                                <div style="font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3;">"${cleanSongTitle}"</div>
                                <div style="font-size: 14px; color: #334155; margin-top: 4px;">
                                    by <strong style="color: #0284c7; font-size: 15px;">${cleanMainArtist}</strong>
                                </div>
                            </div>

                            <!-- Core Track Metadata Table -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; overflow: hidden;">
                                <tr>
                                    <td colspan="2" style="background-color: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569;">
                                        Release Details &amp; Submitter Info
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 18px; color: #64748b; font-size: 13.5px; width: 38%; border-bottom: 1px solid #f1f5f9;">Main Artist:</td>
                                    <td style="padding: 10px 18px; color: #0f172a; font-size: 14px; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${cleanMainArtist}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 18px; color: #64748b; font-size: 13.5px; border-bottom: 1px solid #f1f5f9;">Legal Real Name:</td>
                                    <td style="padding: 10px 18px; color: #0f172a; font-size: 14px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${cleanRealName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 18px; color: #64748b; font-size: 13.5px; border-bottom: 1px solid #f1f5f9;">Primary Genre:</td>
                                    <td style="padding: 10px 18px; border-bottom: 1px solid #f1f5f9;">
                                        <span style="display: inline-block; background-color: #f3e8ff; color: #7e22ce; font-weight: 700; font-size: 12px; padding: 3px 10px; border-radius: 4px;">
                                            ${cleanGenre}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 18px; color: #64748b; font-size: 13.5px; border-bottom: 1px solid #f1f5f9;">Requested Release Date:</td>
                                    <td style="padding: 10px 18px; border-bottom: 1px solid #f1f5f9;">
                                        <span style="display: inline-block; background-color: #fef9c3; color: #a16207; font-weight: 700; font-size: 12px; padding: 3px 10px; border-radius: 4px;">
                                            📅 ${cleanReleaseDate}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 18px; color: #64748b; font-size: 13.5px; border-bottom: 1px solid #f1f5f9;">Main Spotify Profile:</td>
                                    <td style="padding: 10px 18px; font-size: 13.5px; border-bottom: 1px solid #f1f5f9;">
                                        ${cleanMainArtistSpotify ? `<a href="${cleanMainArtistSpotify}" target="_blank" style="color: #0284c7; text-decoration: underline; font-weight: 600;">${cleanMainArtistSpotify}</a>` : '<span style="color: #94a3b8; font-style: italic;">Not provided</span>'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 18px; color: #64748b; font-size: 13.5px;">Submitter Contact Email:</td>
                                    <td style="padding: 10px 18px; font-size: 14px; font-weight: 600;">
                                        <a href="mailto:${cleanEmail}" style="color: #0f172a; text-decoration: none;">${cleanEmail}</a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Master Audio & Artwork Google Drive Box -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f7ff; border: 1px solid #bae6fd; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 22px; text-align: center;">
                                        <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0369a1; margin-bottom: 6px;">
                                            MASTER AUDIO (.WAV) &amp; HIGH-RES ARTWORK (3000x3000px)
                                        </div>
                                        <div style="font-size: 13.5px; color: #334155; margin-bottom: 14px;">
                                            Google Drive folder containing official lossless assets for this release:
                                        </div>
                                        <a href="${cleanDriveLink}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 6px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);">
                                            OPEN IN GOOGLE DRIVE &rarr;
                                        </a>
                                        <div style="margin-top: 12px; font-size: 11.5px; color: #64748b; word-break: break-all;">
                                            <a href="${cleanDriveLink}" target="_blank" style="color: #0284c7; text-decoration: underline;">${cleanDriveLink}</a>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- Collaborators Section -->
                            <div style="margin-bottom: 24px;">
                                <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; margin-bottom: 8px;">
                                    Collaborators &amp; Featured Artists (${cleanCollaborators.length})
                                </div>
                                ${collaboratorsHtml}
                            </div>

                            <!-- Artist Notes / Message -->
                            <div style="margin-bottom: 26px;">
                                <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; margin-bottom: 8px;">
                                    Artist Notes &amp; Remarks
                                </div>
                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #38bdf8; border-radius: 6px; padding: 14px 18px; font-size: 13.5px; color: #334155; line-height: 1.6; white-space: pre-wrap;">
${cleanNotes || '<span style="color: #94a3b8; font-style: italic;">No additional notes provided by artist.</span>'}
                                </div>
                            </div>

                            <!-- Quick Action Bar -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="mailto:${cleanEmail}?subject=Re: OBSCURA REC LLC Submission [${subId}] - ${cleanMainArtist} - ${cleanSongTitle}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 6px; margin: 4px 6px;">
                                            &#9993; Reply to Submitter (${cleanEmail})
                                        </a>
                                        <a href="https://obscurarecord.com/admin-codes" target="_blank" style="display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 6px; margin: 4px 6px;">
                                            &#9881; Open Admin Codes Vault
                                        </a>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #090d16; padding: 18px 24px; text-align: center; border-top: 1px solid #1e293b;">
                            <div style="font-size: 12px; font-weight: 600; color: #94a3b8; letter-spacing: 0.5px;">
                                OBSCURA REC LLC &bull; Automated A&amp;R Submission Engine
                            </div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                                Confidential release material &bull; Dispatched to <a href="mailto:${TARGET_SUBMISSION_EMAIL}" style="color: #38bdf8; text-decoration: none;">${TARGET_SUBMISSION_EMAIL}</a>
                            </div>
                        </td>
                    </tr>

                </table>
            </body>
            </html>
        `;

        // Artist Confirmation Email
        const artistReceiptHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Track Submission Received - OBSCURA REC LLC</title>
            </head>
            <body style="margin: 0; padding: 25px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
                    <tr>
                        <td style="background-color: #0f172a; padding: 26px 30px; text-align: left;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">OBSCURA REC LLC</h1>
                            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Track Submission Received</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; font-size: 14.5px; line-height: 1.6; color: #334155;">
                            <p style="margin-top: 0; color: #0f172a; font-size: 16px;">Hi <strong>${cleanRealName || cleanMainArtist}</strong>,</p>
                            <p>Thank you for submitting your release, <strong>"${cleanSongTitle}"</strong> by <strong>${cleanMainArtist}</strong>, to OBSCURA REC LLC. Your submission has been securely received and recorded.</p>
                            
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                                <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;"><strong>Submission ID:</strong> ${subId}</p>
                                <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;"><strong>Track Title:</strong> ${cleanSongTitle}</p>
                                <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;"><strong>Main Artist:</strong> ${cleanMainArtist}</p>
                                <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;"><strong>Genre:</strong> ${cleanGenre}</p>
                                <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>Requested Release Date:</strong> ${cleanReleaseDate}</p>
                            </div>

                            <p>Our team will prepare and review your Google Drive master assets and metadata. We will contact you directly within <strong>2 to 3 weeks</strong>.</p>
                            
                            <p style="margin-top: 24px; color: #64748b; font-size: 13px;">
                                Best regards,<br>
                                <strong style="color: #0f172a;">A&amp;R Department &bull; OBSCURA REC LLC</strong><br>
                                <a href="https://obscurarecord.com" style="color: #2563eb; text-decoration: none;">obscurarecord.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        const senderAddress = process.env.EMAIL_USER || 'no-reply@obscurarecord.com';

        const adminMailOptions = {
            from: `"Obscura Submissions" <${senderAddress}>`,
            replyTo: cleanEmail,
            to: TARGET_SUBMISSION_EMAIL,
            subject: `[SUBMISSION] ${cleanMainArtist} - "${cleanSongTitle}" (${subId})`,
            text: `NEW TRACK SUBMISSION\nID: ${subId}\nAcceptance Code: ${cleanCode}\nSong Name: ${cleanSongTitle}\nMain Artist: ${cleanMainArtist}\nReal Name: ${cleanRealName}\nSpotify: ${cleanMainArtistSpotify}\nEmail: ${cleanEmail}\nGenre: ${cleanGenre}\nRequested Release Date: ${cleanReleaseDate}\n\nGoogle Drive Link:\n${cleanDriveLink}\n\nCollaborators:\n${cleanCollaborators.map(c => `- ${c.artistName} (${c.realName}) [Role: ${c.role}]: ${c.spotifyLink}`).join('\n')}\n\nNotes:\n${cleanNotes}`,
            html: adminEmailHtml,
            headers: {
                'Message-ID': `<submission-${subId}@obscurarecord.com>`,
                'X-Priority': '1 (Highest)',
                'X-MSMail-Priority': 'High',
                'Importance': 'High'
            }
        };

        const artistMailOptions = {
            from: `"OBSCURA REC LLC" <${senderAddress}>`,
            to: cleanEmail,
            subject: `Submission Received [${subId}] - "${cleanSongTitle}" - OBSCURA REC LLC`,
            text: `Hi ${cleanRealName || cleanMainArtist},\n\nThank you for submitting your release "${cleanSongTitle}" to OBSCURA REC LLC. Your submission (${subId}) has been received.\n\nBest regards,\nOBSCURA REC LLC A&R Team`,
            html: artistReceiptHtml
        };

        // 3. Dispatch Emails
        await Promise.allSettled([
            transporter.sendMail(adminMailOptions),
            transporter.sendMail(artistMailOptions)
        ]);

        // 4. Mark Acceptance Code as "used" in Firebase RTDB and save submission archive
        try {
            await axios.patch(codeLookupUrl, {
                status: 'used',
                usedAt: Date.now(),
                submissionId: subId,
                songTitle: cleanSongTitle,
                submittedByEmail: cleanEmail
            });
            console.log(`[CODE CONSUMED] ${cleanCode} marked as USED for submission ${subId}`);

            // Save full record in new Firebase database submissions table
            await axios.put(`${FIREBASE_DB_URL}/submissions/${encodeURIComponent(subId)}.json`, {
                submissionId: subId,
                acceptanceCode: cleanCode,
                songTitle: cleanSongTitle,
                mainArtist: cleanMainArtist,
                realName: cleanRealName,
                email: cleanEmail,
                genre: cleanGenre,
                releaseDate: cleanReleaseDate,
                driveLink: cleanDriveLink,
                collaborators: cleanCollaborators,
                notes: cleanNotes,
                submittedAt: Date.now(),
                status: 'received'
            });
            console.log(`[SUBMISSION ARCHIVED] ${subId} saved to database`);
        } catch (dbErr) {
            console.error('[DATABASE UPDATE WARNING]: Failed to update database:', dbErr.message);
        }

        return res.status(200).json({
            success: true,
            submissionId: subId,
            message: 'Submission successfully received and verified.'
        });

    } catch (error) {
        console.error('[SUBMISSION ERROR]:', error);
        return res.status(500).json({
            error: 'Failed to process submission. Server error occurred.'
        });
    }
};
