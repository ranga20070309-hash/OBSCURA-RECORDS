const fs = require('fs');
const path = require('path');
const https = require('https');

const SMARTLINKS_DB_URL = "https://obscura-records-smart-links-default-rtdb.asia-southeast1.firebasedatabase.app";
const MAIN_SITE_DB_URL = "https://obscura-records-default-rtdb.asia-southeast1.firebasedatabase.app";

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

function cleanSlug(text) {
    return (text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
            parsedUrl.searchParams.get('slug') ||
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

        let htmlPath = path.join(process.cwd(), 'release', 'index.html');
        if (!fs.existsSync(htmlPath)) {
            htmlPath = path.join(process.cwd(), 'release.html');
        }

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

        const normalizedSlug = cleanSlug(slug);
        const rawSlugLower = slug.toLowerCase();
        let data = null;

        // 1. Direct fetch from smartLinks database
        data = await fetchJson(`${SMARTLINKS_DB_URL}/smartLinks/${encodeURIComponent(slug)}.json`);
        if (!data && normalizedSlug !== slug) {
            data = await fetchJson(`${SMARTLINKS_DB_URL}/smartLinks/${encodeURIComponent(normalizedSlug)}.json`);
        }
        if (!data) {
            data = await fetchJson(`${SMARTLINKS_DB_URL}/smartLinks/-${encodeURIComponent(normalizedSlug)}.json`);
        }

        // 2. All links search fallback in smartLinks database
        if (!data) {
            const allLinks = await fetchJson(`${SMARTLINKS_DB_URL}/smartLinks.json`);
            if (allLinks && typeof allLinks === 'object') {
                const matchKey = Object.keys(allLinks).find(k => {
                    const item = allLinks[k];
                    if (!item) return false;
                    const kClean = cleanSlug(k);
                    const kLower = k.toLowerCase();
                    const titleClean = cleanSlug(item.title || item.name);
                    const slugClean = cleanSlug(item.slug);
                    return kLower === rawSlugLower ||
                           kClean === normalizedSlug ||
                           titleClean === normalizedSlug ||
                           slugClean === normalizedSlug ||
                           (item.id && cleanSlug(item.id) === normalizedSlug);
                });

                if (matchKey && allLinks[matchKey]) {
                    data = allLinks[matchKey];
                }
            }
        }

        // 3. Main catalog siteData.json fallback
        if (!data) {
            const siteData = await fetchJson(`${MAIN_SITE_DB_URL}/siteData.json`);
            if (siteData && typeof siteData === 'object') {
                const releases = [
                    ...(Array.isArray(siteData.releases) ? siteData.releases : Object.values(siteData.releases || {})),
                    ...(Array.isArray(siteData.popular_releases) ? siteData.popular_releases : Object.values(siteData.popular_releases || {})),
                    ...(Array.isArray(siteData.popular) ? siteData.popular : Object.values(siteData.popular || {}))
                ];

                const matched = releases.find(r => {
                    if (!r) return false;
                    const rTitle = cleanSlug(r.title || '');
                    const rCatalog = (r.catalog || r.id || '').toLowerCase().trim();
                    return rTitle === normalizedSlug || rCatalog === rawSlugLower || rTitle.includes(normalizedSlug) || normalizedSlug.includes(rTitle);
                });

                if (matched) {
                    data = {
                        title: matched.title,
                        artist: matched.artist || matched.producers,
                        image: matched.cover || matched.image,
                        links: matched
                    };
                }
            }
        }

        if (data) {
            const title = String(data.title || data.name || "OBSCURA RELEASE").trim();
            let artist = String(data.artist || data.producers || "OBSCURA RECORDS LLC").trim();
            if (artist && !/^prod/i.test(artist)) {
                artist = `PROD By ${artist}`;
            }

            let cover = String(data.image || data.artwork || data.cover || data.thumbnail || data.trackCover || "https://www.obscurarecord.com/assets/OCR.png").trim();
            if (cover.startsWith('data:')) {
                cover = `https://www.obscurarecord.com/api/artwork?id=${encodeURIComponent(normalizedSlug || slug)}`;
            } else if (!cover.startsWith('http://') && !cover.startsWith('https://')) {
                cover = `https://www.obscurarecord.com/${cover.replace(/^\/+/, '')}`;
            }

            const cleanTitle = `${title} - ${artist} | OBSCURA RECORDS LLC`;
            const shortDesc = `Official Music Release: ${title} (${artist}) on Obscura Records LLC. Listen and stream on all digital platforms.`;
            const currentUrl = `https://www.obscurarecord.com/release/?id=${encodeURIComponent(normalizedSlug || slug)}`;

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
