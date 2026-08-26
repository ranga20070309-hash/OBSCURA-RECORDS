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
        const parsedUrl = new URL(req.url, `https://${req.headers?.host || 'www.obscurarecord.com'}`);
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
            const parts = parsedUrl.pathname.replace(/^\/+|\/+$/g, '').split('/');
            if (parts.length >= 2) slug = parts[parts.length - 1];
        }

        if (!slug) {
            res.setHeader('Location', '/assets/OCR.png');
            return res.status(302).end();
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

        // 2. All links fuzzy match
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
                        image: matched.cover || matched.image
                    };
                }
            }
        }

        const rawCover = data?.image || data?.artwork || data?.cover || data?.thumbnail || data?.trackCover;

        if (rawCover && rawCover.startsWith('data:')) {
            const matches = rawCover.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                const mimeType = matches[1] || 'image/jpeg';
                const base64Data = matches[2];
                const imgBuffer = Buffer.from(base64Data, 'base64');

                res.setHeader('Content-Type', mimeType);
                res.setHeader('Content-Length', imgBuffer.length);
                res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
                return res.status(200).send(imgBuffer);
            }
        }

        if (rawCover && (rawCover.startsWith('http://') || rawCover.startsWith('https://'))) {
            res.setHeader('Location', rawCover);
            return res.status(302).end();
        }

        res.setHeader('Location', 'https://www.obscurarecord.com/assets/OCR.png');
        return res.status(302).end();
    } catch (e) {
        res.setHeader('Location', 'https://www.obscurarecord.com/assets/OCR.png');
        return res.status(302).end();
    }
};
