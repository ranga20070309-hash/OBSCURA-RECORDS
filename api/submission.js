const nodemailer = require('nodemailer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const SUBMISSION_OFFICIAL_EMAIL = 'mail.obscurarecords@gmail.com';
const TARGET_SUBMISSION_EMAIL = 'mail.obscurarecords@gmail.com';
const FIREBASE_DB_URL = "https://submission-code-and-mail-sys-default-rtdb.asia-southeast1.firebasedatabase.app";

// Dedicated mailer configuration for Track Submission portal
// Isolated completely from artists@obscurarecord.com (which is reserved exclusively for main site demos)
function getSubmissionTransporter() {
    let user = process.env.SUBMISSION_EMAIL_USER ? process.env.SUBMISSION_EMAIL_USER.trim() : '';
    let pass = process.env.SUBMISSION_EMAIL_PASS ? process.env.SUBMISSION_EMAIL_PASS.trim() : '';

    if (!user) {
        // If EMAIL_USER is NOT artists@obscurarecord.com, allow it; otherwise strictly force mail.obscurarecords@gmail.com
        if (process.env.EMAIL_USER && !process.env.EMAIL_USER.toLowerCase().includes('artists@obscurarecord.com')) {
            user = process.env.EMAIL_USER.trim();
        } else {
            user = SUBMISSION_OFFICIAL_EMAIL;
        }
    }

    if (!pass) {
        pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : '';
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass
        }
    });
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
        mainArtistApple,
        email,
        city,
        country,
        genre,
        language,
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
        if (!realName || !mainArtist || !email || !city || !country || !songTitle || !genre || !language || !driveLink) {
            return res.status(400).json({ error: 'Please fill in all required submission fields.' });
        }

        const cleanSongTitle = sanitize(songTitle);
        const cleanRealName = sanitize(realName);
        const cleanMainArtist = sanitize(mainArtist);
        const cleanMainArtistSpotify = (mainArtistSpotify || '').trim();
        const cleanMainArtistApple = (mainArtistApple || '').trim();
        const cleanEmail = email.trim();
        const cleanCity = sanitize(city) || 'Not specified';
        const cleanCountry = sanitize(country) || 'Not specified';
        const cleanGenre = sanitize(genre) || 'Not specified';
        const cleanLanguage = sanitize(language) || 'English';
        const cleanReleaseDate = sanitize(releaseDate) || 'Flexible / To Be Decided';
        const cleanDriveLink = driveLink.trim();
        const cleanNotes = sanitize(notes) || 'None provided.';
        const subId = sanitize(submissionId) || `OBS-${Date.now().toString(36).toUpperCase()}`;
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC';

        // Sanitize collaborators
        const cleanCollaborators = Array.isArray(collaborators)
            ? collaborators
                .filter(c => c && (c.artistName || c.realName || c.role || c.spotifyLink || c.appleLink))
                .map(c => ({
                    artistName: sanitize(c.artistName) || 'N/A',
                    realName: sanitize(c.realName) || 'N/A',
                    role: sanitize(c.role) || 'Featured / Collaborator',
                    spotifyLink: (c.spotifyLink || '').trim(),
                    appleLink: (c.appleLink || '').trim()
                }))
            : [];

        // 3. Mark Acceptance Code as "used" & Archive Submission in Firebase RTDB FIRST
        // Doing this before email dispatch guarantees database state is updated immediately!
        try {
            await axios.patch(codeLookupUrl, {
                status: 'used',
                usedAt: Date.now(),
                submissionId: subId,
                songTitle: cleanSongTitle,
                submittedByEmail: cleanEmail
            });
            console.log(`[CODE CONSUMED] ${cleanCode} marked as USED for submission ${subId}`);

            await axios.put(`${FIREBASE_DB_URL}/submissions/${encodeURIComponent(subId)}.json`, {
                submissionId: subId,
                acceptanceCode: cleanCode,
                songTitle: cleanSongTitle,
                mainArtist: cleanMainArtist,
                realName: cleanRealName,
                email: cleanEmail,
                city: cleanCity,
                country: cleanCountry,
                genre: cleanGenre,
                language: cleanLanguage,
                mainArtistSpotify: cleanMainArtistSpotify,
                mainArtistApple: cleanMainArtistApple,
                releaseDate: cleanReleaseDate,
                driveLink: cleanDriveLink,
                collaborators: cleanCollaborators,
                notes: cleanNotes,
                submittedAt: Date.now(),
                status: 'received'
            });
            console.log(`[SUBMISSION ARCHIVED] ${subId} saved to database`);
        } catch (dbErr) {
            console.error('[DATABASE UPDATE WARNING]: Failed to update database immediately:', dbErr.message);
        }

        // 4. Setup Logo Attachment (Inline CID to guarantee image loads in all email clients without proxy blocking)
        const possibleLogoPaths = [
            path.join(__dirname, '../assets/OCR_circle.png'),
            path.join(__dirname, '../assets/OCR.png'),
            path.join(process.cwd(), 'assets/OCR_circle.png'),
            path.join(process.cwd(), 'assets/OCR.png')
        ];
        let verifiedLogoPath = null;
        for (const p of possibleLogoPaths) {
            if (fs.existsSync(p)) {
                verifiedLogoPath = p;
                break;
            }
        }

        const emailAttachments = [];
        if (verifiedLogoPath) {
            emailAttachments.push({
                filename: 'ocr_emblem.png',
                path: verifiedLogoPath,
                cid: 'ocr_logo'
            });
        }

        const logoImgSrc = verifiedLogoPath ? 'cid:ocr_logo' : 'https://obscurarecord.com/assets/OCR.png';
        const dossierUrl = `https://obscurarecord.com/submit/dossier.html?id=${encodeURIComponent(subId)}`;
        const adminPortalUrl = `https://obscurarecord.com/submit/admin.html`;

        const collabHtml = cleanCollaborators.length > 0 
            ? `
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #1e2638;">
                <div style="font-size: 11px; font-weight: 700; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">Collaborator Credits:</div>
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 12px; color: #cbd5e1;">
                    ${cleanCollaborators.map((c, i) => `
                        <tr>
                            <td style="padding: 3px 0; color: #38bdf8; font-weight: 600;">${i + 1}. ${c.artistName}</td>
                            <td style="padding: 3px 6px; color: #94a3b8;">(${c.role})</td>
                            <td style="padding: 3px 0; text-align: right;">
                                ${c.spotifyLink ? `<a href="${c.spotifyLink}" target="_blank" style="color: #38bdf8; font-size: 11px; text-decoration: none; margin-right: 6px;">Spotify &rarr;</a>` : ''}
                                ${c.appleLink ? `<a href="${c.appleLink}" target="_blank" style="color: #fa586a; font-size: 11px; text-decoration: none;">Apple &rarr;</a>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </table>
            </div>`
            : '';

        const notesHtml = (cleanNotes && cleanNotes !== 'None provided.') 
            ? `
            <div style="margin-top: 14px; padding: 10px 14px; background-color: #07090f; border-left: 3px solid #38bdf8; border-radius: 4px; font-size: 12px; color: #94a3b8; font-style: italic;">
                "${cleanNotes}"
            </div>`
            : '';

        // Streamlined, High-Class Executive Dark Notification Email for A&R Admin
        const adminEmailHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>New Track Submission - OBSCURA REC LLC</title>
            </head>
            <body style="margin: 0; padding: 24px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #05060a; color: #f8fafc;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #0c0f18; border-radius: 12px; overflow: hidden; border: 1px solid #1c2336; box-shadow: 0 12px 36px rgba(0,0,0,0.6);">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #090c15 0%, #0d1221 100%); padding: 20px 24px; border-bottom: 2px solid #00f0ff;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="vertical-align: middle;">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="vertical-align: middle; padding-right: 12px;">
                                                    <img src="${logoImgSrc}" width="40" height="40" style="border-radius: 50%; border: 1.5px solid #00f0ff; display: block;" alt="OCR">
                                                </td>
                                                <td style="vertical-align: middle;">
                                                    <div style="color: #ffffff; font-size: 17px; font-weight: 800; letter-spacing: 1px; line-height: 1.2;">OBSCURA REC LLC</div>
                                                    <div style="color: #00f0ff; font-size: 10.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; margin-top: 2px;">A&amp;R TRACK SUBMISSION ALERT</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td style="text-align: right; vertical-align: middle;">
                                        <div style="display: inline-block; background: #07090e; border: 1px solid #1e293b; color: #94a3b8; padding: 5px 10px; border-radius: 5px; font-size: 11px; font-family: monospace; font-weight: 700;">
                                            ID: <strong style="color: #38bdf8;">${subId}</strong>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 22px 24px;">

                            <!-- Single-Use Code Status Badge -->
                            <div style="background-color: #051a13; border: 1px solid #059669; border-radius: 6px; padding: 10px 14px; margin-bottom: 18px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td>
                                            <span style="color: #34d399; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px;">
                                                &#10003; ACCEPTANCE CODE VERIFIED &amp; CONSUMED
                                            </span>
                                        </td>
                                        <td style="text-align: right;">
                                            <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #a7f3d0; background: #064e3b; border: 1px solid #059669; padding: 2px 7px; border-radius: 4px;">
                                                ${cleanCode}
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Track Summary Card -->
                            <div style="background: linear-gradient(135deg, #0e1422 0%, #0b0f19 100%); border: 1px solid #1e283d; border-left: 3px solid #00f0ff; border-radius: 6px; padding: 16px 18px; margin-bottom: 18px;">
                                <div style="font-size: 10.5px; text-transform: uppercase; font-weight: 700; letter-spacing: 1.2px; color: #64748b; margin-bottom: 3px;">SUBMITTED TRACK</div>
                                <div style="font-size: 21px; font-weight: 800; color: #ffffff; line-height: 1.2;">"${cleanSongTitle}"</div>
                                <div style="font-size: 14px; color: #94a3b8; margin-top: 5px;">
                                    by <strong style="color: #00f0ff; font-size: 15px;">${cleanMainArtist}</strong> (<span style="color: #cbd5e1;">${cleanRealName}</span>)
                                </div>
                                <div style="font-size: 12px; color: #64748b; margin-top: 3px;">
                                    📍 ${cleanCity}, ${cleanCountry}
                                </div>
                                <div style="margin-top: 12px;">
                                    <span style="display: inline-block; background-color: #2e1065; color: #c084fc; font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 4px; border: 1px solid #581c87; margin-right: 5px;">
                                        🎵 ${cleanGenre}
                                    </span>
                                    <span style="display: inline-block; background-color: #0c4a6e; color: #38bdf8; font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 4px; border: 1px solid #0369a1; margin-right: 5px;">
                                        🌐 ${cleanLanguage}
                                    </span>
                                    <span style="display: inline-block; background-color: #451a03; color: #fde047; font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 4px; border: 1px solid #854d0e;">
                                        📅 Target: ${cleanReleaseDate}
                                    </span>
                                </div>
                            </div>

                            <!-- Clean Action Buttons (Compact & Sleek) -->
                            <div style="background-color: #090d17; border: 1px solid #1c263c; border-radius: 6px; padding: 14px 16px; margin-bottom: 18px;">
                                <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 10px;">
                                    Quick Executive Actions:
                                </div>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td>
                                            <a href="${dossierUrl}" target="_blank" style="display: inline-block; background-color: rgba(0, 240, 255, 0.1); color: #00f0ff; border: 1px solid rgba(0, 240, 255, 0.45); text-decoration: none; font-size: 12px; font-weight: 700; padding: 7px 15px; border-radius: 5px; margin-right: 8px; margin-bottom: 6px;">
                                                &#128196; Open Dossier &rarr;
                                            </a>
                                            <a href="${cleanDriveLink}" target="_blank" style="display: inline-block; background-color: rgba(56, 189, 248, 0.08); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); text-decoration: none; font-size: 12px; font-weight: 700; padding: 7px 15px; border-radius: 5px; margin-right: 8px; margin-bottom: 6px;">
                                                &#128194; Google Drive &rarr;
                                            </a>
                                            <a href="${adminPortalUrl}" target="_blank" style="display: inline-block; background-color: rgba(253, 224, 71, 0.08); color: #fde047; border: 1px solid rgba(253, 224, 71, 0.35); text-decoration: none; font-size: 12px; font-weight: 700; padding: 7px 15px; border-radius: 5px; margin-bottom: 6px;">
                                                &#128273; Admin Portal &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Structured Release Details Table -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b0f19; border: 1px solid #1e2638; border-radius: 6px; margin-bottom: 18px; font-size: 12.5px;">
                                <tr>
                                    <td style="padding: 9px 14px; color: #94a3b8; width: 35%; border-bottom: 1px solid #161d2d;">Artist Email:</td>
                                    <td style="padding: 9px 14px; border-bottom: 1px solid #161d2d;">
                                        <a href="mailto:${cleanEmail}" style="color: #38bdf8; text-decoration: none; font-weight: 600;">${cleanEmail}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 9px 14px; color: #94a3b8; border-bottom: 1px solid #161d2d;">Location:</td>
                                    <td style="padding: 9px 14px; color: #cbd5e1; border-bottom: 1px solid #161d2d;">
                                        ${cleanCity}, ${cleanCountry}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 9px 14px; color: #94a3b8; border-bottom: 1px solid #161d2d;">Spotify Profile:</td>
                                    <td style="padding: 9px 14px; border-bottom: 1px solid #161d2d;">
                                        ${cleanMainArtistSpotify ? `<a href="${cleanMainArtistSpotify}" target="_blank" style="color: #38bdf8; text-decoration: underline;">${cleanMainArtistSpotify}</a>` : '<span style="color: #64748b;">Not provided</span>'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 9px 14px; color: #94a3b8; border-bottom: 1px solid #161d2d;">Apple Music:</td>
                                    <td style="padding: 9px 14px; border-bottom: 1px solid #161d2d;">
                                        ${cleanMainArtistApple ? `<a href="${cleanMainArtistApple}" target="_blank" style="color: #fa586a; text-decoration: underline;">${cleanMainArtistApple}</a>` : '<span style="color: #64748b;">Not provided</span>'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 9px 14px; color: #94a3b8;">Dossier Link:</td>
                                    <td style="padding: 9px 14px; word-break: break-all;">
                                        <a href="${dossierUrl}" target="_blank" style="color: #00f0ff; text-decoration: underline; font-family: monospace; font-size: 11.5px;">${dossierUrl}</a>
                                    </td>
                                </tr>
                            </table>

                            ${collabHtml}
                            ${notesHtml}

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #07090e; padding: 18px 24px; border-top: 1px solid #1c2336; text-align: center;">
                            <div style="color: #64748b; font-size: 11px; line-height: 1.5; letter-spacing: 0.5px;">
                                CONFIDENTIAL &bull; OBSCURA REC LLC A&amp;R DIVISION<br>
                                Automated Dispatch &bull; Submitted at: ${timestamp}
                            </div>
                        </td>
                    </tr>

                </table>
            </body>
            </html>
        `;

        // Streamlined Artist Confirmation Email (No dossier link - Confidential to A&R Admin)
        const artistReceiptHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Track Submission Received - OBSCURA REC LLC</title>
            </head>
            <body style="margin: 0; padding: 28px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #06070c; color: #f8fafc;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #0d1019; border-radius: 12px; overflow: hidden; border: 1px solid #1e273a; box-shadow: 0 12px 36px rgba(0,0,0,0.6);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #090c15 0%, #0e1424 100%); padding: 24px 28px; border-bottom: 2px solid #00f0ff;">
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="vertical-align: middle; padding-right: 14px;">
                                        <img src="${logoImgSrc}" width="42" height="42" style="border-radius: 50%; border: 2px solid #00f0ff; display: block;" alt="OCR">
                                    </td>
                                    <td style="vertical-align: middle;">
                                        <div style="color: #ffffff; font-size: 19px; font-weight: 800; letter-spacing: 1px;">OBSCURA REC LLC</div>
                                        <div style="color: #00f0ff; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Official Submission Confirmation</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 26px 28px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                            <p style="margin-top: 0; color: #ffffff; font-size: 16px;">Hi <strong>${cleanRealName || cleanMainArtist}</strong>,</p>
                            <p>Thank you for submitting your release materials for <strong>"${cleanSongTitle}"</strong> to <strong>OBSCURA REC LLC</strong>. Your master audio, cover artwork, and release metadata have been successfully recorded and archived.</p>
                            
                            <div style="background-color: #080b13; border: 1px solid #1e273a; border-left: 3px solid #00f0ff; border-radius: 8px; padding: 16px 18px; margin: 20px 0;">
                                <div style="margin-bottom: 6px; font-size: 12.5px; color: #94a3b8;">
                                    Submission ID: <strong style="color: #00f0ff; font-family: monospace;">${subId}</strong>
                                </div>
                                <div style="margin-bottom: 6px; font-size: 13px; color: #94a3b8;">
                                    Track Title: <strong style="color: #ffffff;">"${cleanSongTitle}"</strong>
                                </div>
                                <div style="margin-bottom: 6px; font-size: 13px; color: #94a3b8;">
                                    Main Artist: <strong style="color: #ffffff;">${cleanMainArtist}</strong>
                                </div>
                                <div style="margin-bottom: 6px; font-size: 13px; color: #94a3b8;">
                                    Target Release Date: <strong style="color: #fde047;">${cleanReleaseDate}</strong>
                                </div>
                                <div style="margin-bottom: 6px; font-size: 13px; color: #94a3b8;">
                                    Language: <strong style="color: #38bdf8;">${cleanLanguage}</strong>
                                </div>
                                <div style="font-size: 13px; color: #94a3b8;">
                                    Origin: <strong style="color: #cbd5e1;">${cleanCity}, ${cleanCountry}</strong>
                                </div>
                            </div>

                            <p style="color: #94a3b8; font-size: 13px; margin-top: 20px;">
                                Our production and distribution team will verify your master audio (.WAV) and artwork dimensions. We will contact you directly at <strong style="color: #ffffff;">${cleanEmail}</strong> with your release date confirmation, delivery schedule, and pre-save link.
                            </p>
                            
                            <div style="margin-top: 26px; padding-top: 18px; border-top: 1px solid #1e273a; color: #64748b; font-size: 12px;">
                                Best regards,<br>
                                <strong style="color: #ffffff; font-size: 13px;">Distribution &amp; A&amp;R Operations &bull; OBSCURA REC LLC</strong><br>
                                <a href="https://obscurarecord.com" style="color: #00f0ff; text-decoration: none;">obscurarecord.com</a>
                            </div>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        const senderAddress = SUBMISSION_OFFICIAL_EMAIL;

        const adminMailOptions = {
            from: `"OBSCURA A&R Operations" <${senderAddress}>`,
            replyTo: cleanEmail,
            to: TARGET_SUBMISSION_EMAIL,
            subject: `[SUBMISSION] ${cleanMainArtist} - "${cleanSongTitle}" (${subId})`,
            text: `NEW TRACK SUBMISSION RECEIVED - OBSCURA REC LLC\n-------------------------------------------------\nTrack Title: "${cleanSongTitle}"\nMain Artist: ${cleanMainArtist} (${cleanRealName})\nLocation: ${cleanCity}, ${cleanCountry}\nSubmission ID: ${subId}\nAcceptance Code: ${cleanCode} (VERIFIED & CONSUMED)\nPrimary Genre: ${cleanGenre}\nLanguage: ${cleanLanguage}\nTarget Release Date: ${cleanReleaseDate}\nArtist Contact Email: ${cleanEmail}\nSpotify Profile: ${cleanMainArtistSpotify || 'Not provided'}\nApple Music Profile: ${cleanMainArtistApple || 'Not provided'}\n\n📄 VIEW FULL RELEASE DOSSIER (Metadata, Audio, Split Sheet, Notes):\n${dossierUrl}\n\n📂 GOOGLE DRIVE MASTER ASSETS:\n${cleanDriveLink}\n\n-------------------------------------------------\nSubmitted at: ${timestamp}`,
            html: adminEmailHtml,
            attachments: emailAttachments,
            headers: {
                'Message-ID': `<submission-${subId}@obscurarecord.com>`,
                'X-Priority': '1 (Highest)',
                'X-MSMail-Priority': 'High',
                'Importance': 'High'
            }
        };

        const artistMailOptions = {
            from: `"OBSCURA REC LLC" <${senderAddress}>`,
            replyTo: senderAddress,
            to: cleanEmail,
            subject: `Release Materials Received [${subId}] - "${cleanSongTitle}" - OBSCURA REC LLC`,
            text: `Hi ${cleanRealName || cleanMainArtist},\n\nThank you for submitting your release materials for "${cleanSongTitle}" to OBSCURA REC LLC. Your submission (${subId}) has been successfully received.\n\nOur distribution team will inspect your master audio and artwork and will contact you directly with your release schedule and pre-save link.\n\nBest regards,\nOBSCURA REC LLC Distribution Team\nhttps://obscurarecord.com`,
            html: artistReceiptHtml,
            attachments: emailAttachments
        };

        // 5. Dispatch Emails (Settled)
        const transporter = getSubmissionTransporter();
        await Promise.allSettled([
            transporter.sendMail(adminMailOptions),
            transporter.sendMail(artistMailOptions)
        ]);

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
