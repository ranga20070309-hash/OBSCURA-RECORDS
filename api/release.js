const fs = require('fs');
const path = require('path');
const https = require('https');

const FIREBASE_DB_URL = "https://obscura-records-smart-links-default-rtdb.asia-southeast1.firebasedatabase.app";

function fetchJson(url) {
    return new Promise((resolve) => {
        try {
            const req = https.get(url, { timeout: 3500 }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(null);
                    }
                });
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
        } catch (e) {
            resolve(null);
        }
    });
}

module.exports = async (req, res) => {
    try {
        const host = req.headers['x-forwarded-host'] || req.headers?.host || 'www.obscurarecord.com';
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const parsedUrl = new URL(req.url, `${proto}://${host}`);
        
        let slug = (
            req.query?.id ||
            req.query?.track ||
            req.query?.release ||
            req.query?.slug ||
            parsedUrl.searchParams.get('id') ||
            parsedUrl.searchParams.get('track') ||
            parsedUrl.searchParams.get('release') ||
            ''
        ).trim();

        if (!slug) {
            const pathParts = parsedUrl.pathname.replace(/^\/+|\/+$/g, '').split('/');
            if (pathParts.length >= 2 && (pathParts[0].toLowerCase() === 'release' || pathParts[0].toLowerCase() === 'transmit' || pathParts[0].toLowerCase() === 'share')) {
                const candidate = pathParts[1];
                if (candidate && !candidate.includes('.')) {
                    slug = candidate;
                }
            }
        }

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

        const normalizedSlug = slug.toLowerCase();
        let data = null;

        // 1. Direct fetch
        data = await fetchJson(`${FIREBASE_DB_URL}/smartLinks/${encodeURIComponent(normalizedSlug)}.json`);

        // 2. All links fuzzy match fallback
        if (!data) {
            const allLinks = await fetchJson(`${FIREBASE_DB_URL}/smartLinks.json`);
            if (allLinks && typeof allLinks === 'object') {
                const clean = s => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                const targetClean = clean(normalizedSlug);

                const matchKey = Object.keys(allLinks).find(k => {
                    const item = allLinks[k];
                    return k.toLowerCase() === normalizedSlug ||
                           clean(k) === targetClean ||
                           (item && (clean(item.title) === targetClean || clean(item.slug) === targetClean));
                });

                if (matchKey && allLinks[matchKey]) {
                    data = allLinks[matchKey];
                }
            }
        }

        if (data) {
            const title = String(data.title || data.name || "OBSCURA RELEASE").trim();
            let artist = String(data.artist || data.producers || "OBSCURA RECORDS LLC").trim();
            if (artist && !/^prod/i.test(artist)) {
                artist = `PROD By ${artist}`;
            }

            let cover = String(data.image || data.artwork || data.cover || data.thumbnail || "https://www.obscurarecord.com/assets/OCR.png").trim();
            if (cover && !cover.startsWith('http')) {
                cover = `https://www.obscurarecord.com/${cover.replace(/^\/+/, '')}`;
            }

            const cleanTitle = `${title}`;
            const shortDesc = `Listen to ${title} on all platforms`;
            const currentUrl = `https://www.obscurarecord.com/release/?id=${encodeURIComponent(normalizedSlug)}`;

            // Remove any existing duplicate social meta tags from HTML template
            html = html.replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, '');
            html = html.replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, '');
            html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
            html = html.replace(/<title[^>]*>.*?<\/title>/gi, '');

            // Inject single clean set of Open Graph & Twitter Card tags
            const singleMetaBlock = `
    <title>${escapeHtml(cleanTitle)}</title>
    <meta name="description" content="${escapeHtml(shortDesc)}">
    <meta property="og:site_name" content="OBSCURA RECORDS LLC">
    <meta property="og:title" content="${escapeHtml(cleanTitle)}">
    <meta property="og:description" content="${escapeHtml(shortDesc)}">
    <meta property="og:image" content="${escapeHtml(cover)}">
    <meta property="og:image:secure_url" content="${escapeHtml(cover)}">
    <meta property="og:url" content="${escapeHtml(currentUrl)}">
    <meta property="og:type" content="music.song">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(cleanTitle)}">
    <meta name="twitter:description" content="${escapeHtml(shortDesc)}">
    <meta name="twitter:image" content="${escapeHtml(cover)}">
    <meta name="theme-color" content="#00f0ff">`;

            html = html.replace(/<head>/i, `<head>${singleMetaBlock}`);
        }

        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
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
