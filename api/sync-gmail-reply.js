const axios = require('axios');

const RTDB_URL = "https://obscura-records-default-rtdb.asia-southeast1.firebasedatabase.app";
const SYNC_SECRET = process.env.SYNC_SECRET || "OBSCURA_GMAIL_SYNC_KEY";

function cleanMessageContent(rawText) {
    if (!rawText) return '';
    let clean = String(rawText);
    
    // 1. Remove quotes (e.g. On Mon, Aug 17... wrote:)
    clean = clean.split(/On .* wrote:/i)[0];
    clean = clean.split(/---/)[0];
    clean = clean.split(/_{3,}/)[0];

    // 2. Remove "ArtistName (email) sent a message:" or "replied in A&R Direct Line:" prefixes
    clean = clean.replace(/^[^\n\r]+(?:sent a message:|replied in A&R Direct Line:)\s*/i, '');

    // 3. Remove "Track: ... | Submission ID: ..." footers
    clean = clean.replace(/Track:\s*[^\n\r]+\|\s*Submission ID:\s*[^\n\r]+/ig, '');

    // 4. Remove leading/trailing whitespace
    return clean.trim();
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

    const { subId, replyText, senderName, secret } = req.body || {};

    if (!subId || !replyText) {
        return res.status(400).json({ error: 'Missing subId or replyText' });
    }

    // Optional secret verification
    if (secret && secret !== SYNC_SECRET && secret !== "OBSCURA_GMAIL_SYNC_KEY") {
        return res.status(403).json({ error: 'Unauthorized sync attempt.' });
    }

    const cleanSubId = String(subId).trim();
    const cleanText = cleanMessageContent(replyText);

    if (!cleanText) {
        return res.status(200).json({ message: 'Empty or template content skipped.' });
    }

    try {
        // 1. Find the submission in Firebase to get the artist's userId
        const subRes = await axios.get(`${RTDB_URL}/siteData/submissions/demo/${cleanSubId}.json`);
        const subData = subRes.data;

        let targetUid = null;
        let artistEmail = '';

        if (subData) {
            targetUid = subData.userId || null;
            artistEmail = subData.email || subData.userEmail || '';
        }

        // If targetUid not found directly, try lookup by email in siteData/users
        if (!targetUid && artistEmail) {
            const usersRes = await axios.get(`${RTDB_URL}/siteData/users.json`);
            const usersData = usersRes.data || {};
            for (const uid in usersData) {
                if (usersData[uid].email && usersData[uid].email.toLowerCase() === artistEmail.toLowerCase()) {
                    targetUid = uid;
                    break;
                }
            }
        }

        if (!targetUid) {
            return res.status(404).json({ error: 'Artist user profile not found for this submission ID.' });
        }

        // 2. Format the message for Firebase Realtime Database
        const timeNow = Date.now();
        const dateStr = new Date(timeNow).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const messagePayload = {
            sender: 'staff',
            senderName: senderName || 'OBSCURA A&R',
            text: cleanText,
            timestamp: timeNow,
            date: dateStr
        };

        // 3. Push to Firebase thread messages
        await axios.post(`${RTDB_URL}/siteData/conversations/${targetUid}/threads/${cleanSubId}/messages.json`, messagePayload);

        // 4. Update thread metadata
        await axios.patch(`${RTDB_URL}/siteData/conversations/${targetUid}/threads/${cleanSubId}/meta.json`, {
            lastMessage: cleanText,
            lastUpdated: timeNow
        });

        // 5. Update top-level conversation metadata
        await axios.patch(`${RTDB_URL}/siteData/conversations/${targetUid}/meta.json`, {
            lastMessage: cleanText,
            lastUpdated: timeNow
        });

        console.log(`✅ [GMAIL SYNC] Successfully synced Gmail reply to thread ${cleanSubId} for artist ${targetUid}`);
        return res.status(200).json({ success: true, message: 'Synced to website thread' });

    } catch (err) {
        console.error("Gmail sync error:", err?.response?.data || err.message);
        return res.status(500).json({ error: 'Failed to sync message to Firebase.' });
    }
};
