const fs = require('fs');
const path = require('path');
const axios = require('axios');

const FIREBASE_DB_URL = "https://obscura-records-smart-links-default-rtdb.asia-southeast1.firebasedatabase.app";

module.exports = async (req, res) => {
    try {
        const { id, track, release } = req.query;
        const slug = (id || track || release || '').trim().toLowerCase();

        // Path to release/index.html
        const htmlPath = path.join(process.cwd(), 'release', 'index.html');
        let html = '';
        try {
            html = fs.readFileSync(htmlPath, 'utf8');
        } catch (e) {
            html = `<!DOCTYPE html><html><head><title>OBSCURA RECORDS LLC</title></head><body><script>window.location.replace('/');</script></body></html>`;
        }

        if (!slug) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.status(200).send(html);
        }

        // Fetch release data from Firebase RTDB REST API
        let data = null;
        try {
            const resp = await axios.get(`${FIREBASE_DB_URL}/smartLinks/${encodeURIComponent(slug)}.json`, { timeout: 3500 });
            data = resp.data;
        } catch (err) {
            console.error("Firebase fetch error in SSR:", err.message);
        }

        if (data) {
            const title = data.title || data.name || "OBSCURA RELEASE";
            let artist = (data.artist || data.producers || "OBSCURA RECORDS LLC").trim();
            if (artist && !/^prod/i.test(artist)) {
                artist = `PROD By ${artist}`;
            }
            const cover = data.image || data.artwork || data.cover || "https://www.obscurarecord.com/assets/OCR.png";
            const fullTitle = `${title} - ${artist} | OBSCURA RECORDS LLC`;
            const description = `Listen to ${title} (${artist}) official release on Spotify, Apple Music, YouTube & all music platforms.`;
            const currentUrl = `https://www.obscurarecord.com/release/?id=${slug}`;

            // Inject Open Graph and Twitter Meta Tags for Discord, WhatsApp, FB, Twitter
            html = html.replace(/<title[^>]*>.*?<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`);
            html = html.replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(fullTitle)}">`);
            html = html.replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}">`);
            html = html.replace(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${escapeHtml(cover)}">\n    <meta property="og:image:secure_url" content="${escapeHtml(cover)}">\n    <meta property="og:image:width" content="1200">\n    <meta property="og:image:height" content="1200">`);
            html = html.replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}">`);

            // Extra rich social embed tags
            const extraMeta = `
    <meta property="og:url" content="${escapeHtml(currentUrl)}">
    <meta property="og:site_name" content="OBSCURA RECORDS LLC">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(cover)}">
    <meta name="theme-color" content="#00f0ff">`;

            html = html.replace('</head>', `${extraMeta}\n</head>`);
        }

        // Cache for 60s at edge, serve stale while revalidating
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);
    } catch (globalErr) {
        console.error("Global release SSR handler error:", globalErr);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`<!DOCTYPE html><html><head><title>OBSCURA RECORDS LLC</title></head><body><script>window.location.replace('/');</script></body></html>`);
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
