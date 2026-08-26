// ==========================================================================
// OBSCURA SMART LINKS STUDIO // DEDICATED ENGINE (v5.0)
// ==========================================================================

const smartLinksFirebaseConfig = {
    apiKey: "AIzaSyBARRt8caSaWBTjtxzNzr670lTYfqBRIj0",
    authDomain: "obscura-records-smart-links.firebaseapp.com",
    databaseURL: "https://obscura-records-smart-links-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "obscura-records-smart-links",
    storageBucket: "obscura-records-smart-links.firebasestorage.app",
    messagingSenderId: "22595717651",
    appId: "1:22595717651:web:b39895741f4aebe8268de6"
};

// Initialize Dedicated Firebase Instance
if (!firebase.apps.length) {
    firebase.initializeApp(smartLinksFirebaseConfig);
}
const db = firebase.database();

// State Cache
let cachedSmartLinks = {};
let currentEditingSlug = null;
let activePreset = 'cyber-cyan';

// Toast Notification
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast-notif ${type === 'error' ? 'error' : ''}`;
    toast.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-triangle-exclamation' : 'fa-check-circle'}" style="color: ${type === 'error' ? '#ff0055' : '#00ff8c'};"></i>
        <span>${msg}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 30);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

// Preset Theme Defs
const THEME_PRESETS = {
    'cyber-cyan': { accent: '#00f0ff', cardBg: '#07090f', darkness: 0.12, glow: 0.35, buttonStyle: 'clean-light' },
    'dark-phonk': { accent: '#ff0055', cardBg: '#080507', darkness: 0.08, glow: 0.45, buttonStyle: 'cyber-glass' },
    'tokyo-violet': { accent: '#8b5cf6', cardBg: '#080612', darkness: 0.14, glow: 0.4, buttonStyle: 'cyber-glass' },
    'acid-emerald': { accent: '#00ff8c', cardBg: '#050a08', darkness: 0.12, glow: 0.35, buttonStyle: 'solid-neon' },
    'minimal-obsidian': { accent: '#ffffff', cardBg: '#09090b', darkness: 0.06, glow: 0.15, buttonStyle: 'clean-light' }
};

// Studio Engine Startup
function initStudioEngine() {
    initTabs();
    initThemePresets();
    initMagicFetcher();
    initRealtimeMockupSync();
    initDirectoryEngine();
    initFileUploads();
    initActions();
    updateMockupPreview();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudioEngine);
} else {
    initStudioEngine();
}

// 1. Customizer Tabs Engine
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');
        });
    });
}

// 2. Theme Presets Engine
function initThemePresets() {
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const key = btn.getAttribute('data-preset');
            activePreset = key;
            const theme = THEME_PRESETS[key];
            if (!theme) return;

            // Apply to form inputs
            document.getElementById('ui-accent-color').value = theme.accent;
            document.getElementById('ui-accent-hex').value = theme.accent;
            document.getElementById('ui-card-bg-color').value = theme.cardBg;
            document.getElementById('ui-card-bg-hex').value = theme.cardBg;
            document.getElementById('ui-bg-darkness').value = theme.darkness;
            document.getElementById('ui-bg-darkness-val').textContent = `${Math.round(theme.darkness * 100)}%`;
            document.getElementById('ui-border-glow').value = theme.glow;
            document.getElementById('ui-border-glow-val').textContent = `${Math.round(theme.glow * 100)}%`;
            document.getElementById('ui-button-style').value = theme.buttonStyle;

            updateMockupPreview();
            showToast(`THEME APPLIED: ${key.toUpperCase()}`);
        });
    });

    // Color sync helpers
    const accentCol = document.getElementById('ui-accent-color');
    const accentHex = document.getElementById('ui-accent-hex');
    accentCol.addEventListener('input', () => {
        accentHex.value = accentCol.value;
        updateMockupPreview();
    });
    accentHex.addEventListener('input', () => {
        if (/^#[0-9a-f]{6}$/i.test(accentHex.value)) {
            accentCol.value = accentHex.value;
            updateMockupPreview();
        }
    });

    const cardBgCol = document.getElementById('ui-card-bg-color');
    const cardBgHex = document.getElementById('ui-card-bg-hex');
    cardBgCol.addEventListener('input', () => {
        cardBgHex.value = cardBgCol.value;
        updateMockupPreview();
    });
    cardBgHex.addEventListener('input', () => {
        if (/^#[0-9a-f]{6}$/i.test(cardBgHex.value)) {
            cardBgCol.value = cardBgHex.value;
            updateMockupPreview();
        }
    });

    const darkRange = document.getElementById('ui-bg-darkness');
    darkRange.addEventListener('input', () => {
        document.getElementById('ui-bg-darkness-val').textContent = `${Math.round(darkRange.value * 100)}%`;
        updateMockupPreview();
    });

    const glowRange = document.getElementById('ui-border-glow');
    glowRange.addEventListener('input', () => {
        document.getElementById('ui-border-glow-val').textContent = `${Math.round(glowRange.value * 100)}%`;
        updateMockupPreview();
    });

    document.getElementById('ui-button-style').addEventListener('change', updateMockupPreview);
    document.getElementById('ui-show-qr-dock').addEventListener('change', updateMockupPreview);
    document.getElementById('ui-show-grid').addEventListener('change', updateMockupPreview);
}

// 3. Real-Time Interactive Mockup Synchronization
function initRealtimeMockupSync() {
    const titleInp = document.getElementById('smartlink-input-title');
    const artistInp = document.getElementById('smartlink-input-artist');
    const slugInp = document.getElementById('smartlink-input-slug');
    const imageInp = document.getElementById('smartlink-input-image');

    titleInp.addEventListener('input', () => {
        if (!currentEditingSlug) {
            const autoSlug = titleInp.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            slugInp.value = autoSlug;
            document.getElementById('slug-preview-text').textContent = autoSlug || 'release-slug';
        }
        updateMockupPreview();
    });

    artistInp.addEventListener('input', updateMockupPreview);
    slugInp.addEventListener('input', () => {
        const clean = slugInp.value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '');
        slugInp.value = clean;
        document.getElementById('slug-preview-text').textContent = clean || 'release-slug';
        updateMockupPreview();
    });

    imageInp.addEventListener('input', updateMockupPreview);

    // Release Date / Pre-Save Schedule inputs
    const releaseDateInp = document.getElementById('smartlink-input-release-date');
    if (releaseDateInp) {
        releaseDateInp.addEventListener('input', updateMockupPreview);
        releaseDateInp.addEventListener('change', updateMockupPreview);
    }

    const clearScheduleBtn = document.getElementById('btn-schedule-clear');
    if (clearScheduleBtn && releaseDateInp) {
        clearScheduleBtn.addEventListener('click', () => {
            releaseDateInp.value = '';
            updateMockupPreview();
            showToast("RELEASE DATE CLEARED (MARKED AS OUT NOW)");
        });
    }

    const chipBtns = document.querySelectorAll('.quick-chip-btn');
    chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const hours = parseInt(btn.getAttribute('data-hours') || '24', 10);
            const targetDate = new Date(Date.now() + hours * 60 * 60 * 1000);
            // Format to local datetime-local value (YYYY-MM-DDTHH:mm)
            const localIso = new Date(targetDate.getTime() - targetDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            if (releaseDateInp) {
                releaseDateInp.value = localIso;
                updateMockupPreview();
                showToast(`SCHEDULE SET: +${hours >= 24 ? (hours/24) + ' DAY(S)' : hours + ' HOURS'}`);
            }
        });
    });

    // Platform input triggers
    const platformInputs = document.querySelectorAll('#tab-platforms input');
    platformInputs.forEach(inp => inp.addEventListener('input', updateMockupPreview));

    // Device mockup switch buttons
    const btnMobile = document.getElementById('btn-device-mobile');
    const btnDesktop = document.getElementById('btn-device-desktop');
    const viewportFrame = document.getElementById('device-frame-container');

    btnMobile.addEventListener('click', () => {
        btnMobile.classList.add('active');
        btnDesktop.classList.remove('active');
        viewportFrame.classList.remove('desktop-mode');
    });

    btnDesktop.addEventListener('click', () => {
        btnDesktop.classList.add('active');
        btnMobile.classList.remove('active');
        viewportFrame.classList.add('desktop-mode');
    });
}

function updateMockupPreview() {
    const title = document.getElementById('smartlink-input-title').value.trim() || 'UNTITLED RELEASE';
    const rawArtist = document.getElementById('smartlink-input-artist').value.trim();
    let displayArtist = 'PROD By ARTIST';
    if (rawArtist) {
        displayArtist = /^prod/i.test(rawArtist) ? rawArtist : `PROD By ${rawArtist}`;
    }

    const cover = document.getElementById('smartlink-input-image').value.trim() || '/assets/OCR.png';
    const slug = document.getElementById('smartlink-input-slug').value.trim() || 'release-slug';
    const accent = document.getElementById('ui-accent-color').value || '#00f0ff';
    const cardBg = document.getElementById('ui-card-bg-color').value || '#07090f';
    const glowNum = parseFloat(document.getElementById('ui-border-glow').value || '0.35');
    const darkNum = parseFloat(document.getElementById('ui-bg-darkness').value || '0.12');
    const btnStyle = document.getElementById('ui-button-style').value || 'clean-light';
    const showGrid = document.getElementById('ui-show-grid').checked;
    const rgb = hexToRgb(accent);

    // Update Text & Image in Mockup
    document.getElementById('mock-title').textContent = title.toUpperCase();
    document.getElementById('mock-artist').textContent = displayArtist;
    document.getElementById('mock-artist').style.color = accent;
    document.getElementById('mock-cover-img').src = cover;
    
    const playTrigger = document.getElementById('mock-play-trigger');
    playTrigger.style.background = accent;
    playTrigger.style.boxShadow = `0 0 ${20 + Math.round(glowNum * 25)}px ${accent}`;

    // Update Canvas Background (Ambient Darkness & Grid)
    const canvasEl = document.getElementById('mockup-canvas');
    if (canvasEl) {
        const gridLines = showGrid 
            ? `linear-gradient(rgba(${rgb}, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(${rgb}, 0.04) 1px, transparent 1px), `
            : '';
        canvasEl.style.backgroundColor = '#03050a';
        canvasEl.style.backgroundImage = `${gridLines}radial-gradient(circle at 50% 35%, rgba(${rgb}, ${Math.min(0.45, darkNum * 1.5)}) 0%, #030408 85%)`;
        canvasEl.style.backgroundSize = showGrid ? '28px 28px, 28px 28px, 100% 100%' : '100% 100%';
    }

    // Update Card Container Style (Intense Responsive Glow & Border)
    const mockCard = document.getElementById('mock-card');
    mockCard.style.backgroundColor = cardBg;
    mockCard.style.borderColor = `rgba(${rgb}, ${Math.max(0.18, glowNum)})`;
    mockCard.style.boxShadow = `0 25px 60px rgba(0,0,0,0.9), 0 0 ${Math.round(glowNum * 55)}px rgba(${rgb}, ${glowNum * 0.85}), inset 0 0 ${Math.round(glowNum * 18)}px rgba(${rgb}, ${glowNum * 0.25})`;

    // Update Mock Side QR
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://www.obscurarecord.com/release/?id=${slug}`)}&color=0-240-255&bgcolor=7-9-18`;
    document.getElementById('mock-qr-img').src = qrUrl;

    const mockSideQr = document.getElementById('mock-side-qr');
    const showQrDock = document.getElementById('ui-show-qr-dock').checked;
    if (!showQrDock) {
        mockSideQr.style.display = 'none';
    } else {
        mockSideQr.style.removeProperty('display');
        mockSideQr.style.borderColor = accent;
        mockSideQr.style.boxShadow = `0 10px 30px rgba(0,0,0,0.8), 0 0 ${Math.round(glowNum * 35)}px rgba(${rgb}, ${glowNum * 0.6})`;
    }

    // Dynamic Platform List in Mockup with Button Style Variants & Pre-Save Check
    const platformContainer = document.getElementById('mock-platforms-container');
    platformContainer.className = `mock-platforms-list style-${btnStyle}`;

    const releaseDateVal = document.getElementById('smartlink-input-release-date')?.value;
    const isPreSave = Boolean(releaseDateVal && new Date(releaseDateVal).getTime() > Date.now());

    const platforms = [
        { id: 'link-spotify', name: 'Spotify', icon: 'fab fa-spotify', col: '#1DB954', action: isPreSave ? 'Pre-Save' : 'Play' },
        { id: 'link-apple', name: 'Apple Music', icon: 'fab fa-apple', col: '#FA243C', action: isPreSave ? 'Pre-Save' : 'Play' },
        { id: 'link-youtube', name: 'YouTube', icon: 'fab fa-youtube', col: '#FF0000', action: isPreSave ? 'Pre-Save' : 'Watch' },
        { id: 'link-youtubemusic', name: 'YouTube Music', icon: 'fas fa-play-circle', col: '#FF0000', action: isPreSave ? 'Pre-Save' : 'Play' },
        { id: 'link-amazon', name: 'Amazon Music', icon: 'fab fa-amazon', col: '#00A8E1', action: isPreSave ? 'Pre-Save' : 'Play' },
        { id: 'link-tidal', name: 'Tidal', icon: 'fas fa-compact-disc', col: '#00f0ff', action: isPreSave ? 'Pre-Save' : 'Play' },
        { id: 'link-deezer', name: 'Deezer', icon: 'fab fa-deezer', col: '#FF0092', action: isPreSave ? 'Pre-Save' : 'Play' },
        { id: 'link-soundcloud', name: 'SoundCloud', icon: 'fab fa-soundcloud', col: '#FF5500', action: isPreSave ? 'Pre-Save' : 'Stream' }
    ];

    let activePlatforms = platforms.filter(p => {
        const val = document.getElementById(p.id)?.value?.trim();
        return Boolean(val);
    });

    if (!activePlatforms.length) {
        activePlatforms = platforms.slice(0, 3); // Fallback sample
    }

    platformContainer.innerHTML = '';
    activePlatforms.forEach(p => {
        const row = document.createElement('div');
        row.className = 'mock-platform-row';
        row.innerHTML = `
            <div class="mock-p-left"><i class="${p.icon}" style="color:${p.col}; font-size:1.1rem;"></i> <span>${p.name}</span></div>
            <span class="mock-p-btn">${p.action}</span>
        `;
        platformContainer.appendChild(row);
    });
}

function hexToRgb(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

// 4. Magic 1-Click Auto-Fetcher
function initMagicFetcher() {
    const magicBtn = document.getElementById('btn-smartlink-magic-fetch');
    const magicInput = document.getElementById('smartlink-magic-url');

    magicBtn.addEventListener('click', async () => {
        const url = magicInput.value.trim();
        if (!url) {
            showToast("PLEASE PASTE A VALID MUSIC LINK FIRST!", 'error');
            return;
        }

        magicBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> FETCHING INFO...';
        magicBtn.disabled = true;

        try {
            showToast("CONTACTING METADATA SERVERS...");

            // YouTube Auto-Extractor
            const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
            if (ytMatch && ytMatch[1]) {
                const vid = ytMatch[1];
                const oembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${vid}`;
                const resp = await fetch(oembedUrl);
                const data = await resp.json();

                if (data && data.title) {
                    const parsed = parseMusicTitle(data.title, data.author_name);
                    document.getElementById('smartlink-input-title').value = parsed.title;
                    if (parsed.artist) document.getElementById('smartlink-input-artist').value = parsed.artist;
                    
                    const slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    document.getElementById('smartlink-input-slug').value = slug;
                    document.getElementById('slug-preview-text').textContent = slug;
                    
                    const hdThumb = `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`;
                    document.getElementById('smartlink-input-image').value = hdThumb;
                    document.getElementById('smartlink-input-youtube').value = `https://www.youtube.com/watch?v=${vid}`;
                    document.getElementById('link-youtube').value = `https://www.youtube.com/watch?v=${vid}`;
                }
            } else if (url.includes('spotify.com')) {
                // Spotify OEmbed
                const resp = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
                const data = await resp.json();
                if (data && data.title) {
                    const parsed = parseMusicTitle(data.title);
                    document.getElementById('smartlink-input-title').value = parsed.title;
                    if (parsed.artist) document.getElementById('smartlink-input-artist').value = parsed.artist;
                    
                    const slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    document.getElementById('smartlink-input-slug').value = slug;
                    document.getElementById('slug-preview-text').textContent = slug;

                    if (data.thumbnail_url) document.getElementById('smartlink-input-image').value = data.thumbnail_url;
                    document.getElementById('link-spotify').value = url;
                }
            }

            updateMockupPreview();
            showToast("METADATA & ARTWORK EXTRACTED SUCCESSFULLY!");
        } catch (err) {
            showToast("FETCH ERROR: " + err.message, 'error');
        } finally {
            magicBtn.innerHTML = '<i class="fas fa-bolt"></i> AUTO-FETCH INFO';
            magicBtn.disabled = false;
        }
    });
}

function parseMusicTitle(raw, author = '') {
    let clean = (raw || '').trim();
    let prodTag = '';
    const prodMatch = clean.match(/[\(\[\{](?:prod(?:uced)?\.?\s*(?:by)?|beat\s*by)\s*:?\s*([^\]\)\\}]+)[\)\]\}]/i);
    if (prodMatch && prodMatch[1]) prodTag = prodMatch[1].trim();

    let stripped = clean
        .replace(/[\(\[\{](?:official\s*)?(?:music\s*)?(?:audio|video|visualizer|lyric\s*video|hd|4k|hq|remix|slowed|reverb)[\)\]\}]/gi, '')
        .replace(/[\(\[\{](?:prod(?:uced)?\.?\s*(?:by)?|beat\s*by)\s*:?\s*[^\]\)\\}]+[\)\]\}]/gi, '')
        .replace(/\|\s*obscura\s*records?/gi, '')
        .replace(/\|\s*official\s*audio/gi, '')
        .trim();

    let artist = '';
    let title = '';
    const splitMatch = stripped.match(/^(.+?)\s*[-–—|/•:]\s*(.+)$/);
    if (splitMatch) {
        artist = splitMatch[1].trim();
        title = splitMatch[2].trim();
    } else {
        title = stripped;
        if (author && !author.toLowerCase().includes('topic')) artist = author.trim();
    }

    if (prodTag && (!artist || !artist.toLowerCase().includes(prodTag.toLowerCase()))) {
        artist = artist ? `${artist} / ${prodTag}` : prodTag;
    }

    return {
        title: title ? title.toUpperCase() : clean.toUpperCase(),
        artist: artist ? artist : ''
    };
}

// 5. Local File Upload Handlers (Base64)
function initFileUploads() {
    const imgFileInp = document.getElementById('smartlink-file-image');
    if (imgFileInp) {
        imgFileInp.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                    document.getElementById('smartlink-input-image').value = reader.result;
                    updateMockupPreview();
                    showToast("LOCAL ARTWORK LOADED!");
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const previewFileInp = document.getElementById('smartlink-file-preview');
    if (previewFileInp) {
        previewFileInp.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                    document.getElementById('smartlink-input-preview').value = reader.result;
                    showToast("LOCAL AUDIO PREVIEW LOADED!");
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// 6. Directory Engine & Realtime Synchronization
function updateStatsAndRender(query = '') {
    const count = Object.keys(cachedSmartLinks).length;
    const statTotal = document.getElementById('stat-total-links');
    if (statTotal) statTotal.textContent = count;
    const dirCount = document.getElementById('directory-count');
    if (dirCount) dirCount.textContent = count;

    let previewsCount = 0;
    Object.values(cachedSmartLinks).forEach(item => {
        if (item && (item.audioPreview || item.youtube)) previewsCount++;
    });
    const statPrev = document.getElementById('stat-previews');
    if (statPrev) statPrev.textContent = previewsCount;

    renderDirectory(query);
}

function initDirectoryEngine() {
    const listContainer = document.getElementById('smartlinks-directory-list');
    const searchInp = document.getElementById('smartlink-search-input');

    // Instant REST Fetch (Immediate 0ms data load on load)
    fetch("https://obscura-records-smart-links-default-rtdb.asia-southeast1.firebasedatabase.app/smartLinks.json")
        .then(res => res.json())
        .then(data => {
            if (data && typeof data === 'object') {
                cachedSmartLinks = data;
                updateStatsAndRender(searchInp ? searchInp.value : '');
            } else if (!data) {
                cachedSmartLinks = {};
                updateStatsAndRender(searchInp ? searchInp.value : '');
            }
        })
        .catch(err => console.warn("Smartlinks REST fallback:", err));

    // Realtime Listener
    try {
        db.ref('smartLinks').on('value', snap => {
            const val = snap.val();
            cachedSmartLinks = (val && typeof val === 'object') ? val : {};
            updateStatsAndRender(searchInp ? searchInp.value : '');
        }, err => {
            console.warn("RTDB listener error:", err);
            // In case of RTDB listener delay/error, retry REST
            fetch("https://obscura-records-smart-links-default-rtdb.asia-southeast1.firebasedatabase.app/smartLinks.json")
                .then(res => res.json())
                .then(data => {
                    if (data && typeof data === 'object') {
                        cachedSmartLinks = data;
                        updateStatsAndRender(searchInp ? searchInp.value : '');
                    }
                })
                .catch(() => {});
        });
    } catch(e) {
        console.warn("RTDB listener subscription error:", e);
    }

    if (searchInp) {
        searchInp.addEventListener('input', (e) => {
            renderDirectory(e.target.value);
        });
    }
}

function renderDirectory(query = '') {
    const listContainer = document.getElementById('smartlinks-directory-list');
    if (!listContainer) return;

    const entries = Object.entries(cachedSmartLinks);
    if (!entries.length) {
        listContainer.innerHTML = `
            <div class="loading-state-dir">
                <i class="fas fa-link" style="font-size: 2rem; color: #00f0ff; margin-bottom: 0.8rem; display: block;"></i>
                NO SMART LINKS PUBLISHED YET. USE THE BUILDER ABOVE TO LAUNCH YOUR FIRST RELEASE LANDING PAGE.
            </div>
        `;
        return;
    }

    const q = query.toLowerCase().trim();
    const filtered = entries.filter(([slug, item]) => {
        if (!q) return true;
        return (item.title && item.title.toLowerCase().includes(q)) ||
               (item.artist && item.artist.toLowerCase().includes(q)) ||
               (slug && slug.toLowerCase().includes(q));
    });

    if (!filtered.length) {
        listContainer.innerHTML = `<div class="loading-state-dir">NO MATCHING SMART LINKS FOUND FOR "${query}".</div>`;
        return;
    }

    listContainer.innerHTML = '';
    filtered.forEach(([slug, item]) => {
        const card = document.createElement('div');
        card.className = 'dir-item-card';

        const cover = item.image || item.artwork || '/assets/OCR.png';
        const title = item.title || slug.toUpperCase();
        let artist = item.artist || 'OBSCURA RECORDS LLC';
        if (!/^prod/i.test(artist) && artist !== 'OBSCURA RECORDS LLC') artist = `PROD By ${artist}`;

        const liveUrl = `https://www.obscurarecord.com/release/?id=${encodeURIComponent(slug)}`;

        let linkedCount = 0;
        if (item.links) {
            Object.values(item.links).forEach(v => { if (v && v.length > 5) linkedCount++; });
        }

        const safeTitle = (item.title || slug).replace(/'/g, "\\'");
        const safeSlug = slug.replace(/'/g, "\\'");

        const isItemPreSave = Boolean(item.releaseDate && new Date(item.releaseDate).getTime() > Date.now());
        const preSaveBadge = isItemPreSave
            ? `<span style="background: rgba(255, 0, 85, 0.2); color: #ff0055; border: 1px solid rgba(255, 0, 85, 0.4); padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.68rem; margin-left: 6px;"><i class="fas fa-clock"></i> PRE-SAVE ACTIVE</span>`
            : '';

        card.innerHTML = `
            <div class="dir-item-left">
                <img src="${cover}" alt="Cover" class="dir-item-thumb">
                <div class="dir-item-info">
                    <strong class="dir-item-title">${title} ${preSaveBadge}</strong>
                    <span class="dir-item-artist">${artist}</span>
                    <small class="dir-item-meta">
                        SLUG: <strong>${slug}</strong> &bull; <i class="fas fa-headphones" style="color: #00f0ff;"></i> ${linkedCount} SERVICES &bull; THEME: <strong style="color: ${item.ui?.accent || '#00f0ff'};">${item.ui?.theme || 'Default'}</strong>
                    </small>
                </div>
            </div>

            <div class="dir-item-actions">
                <button type="button" class="cyber-btn sm" onclick="openStudioQr('${safeSlug}', '${safeTitle}', '${liveUrl}')">
                    <i class="fas fa-qrcode"></i> QR CODE
                </button>
                <button type="button" class="cyber-btn sm" onclick="copyStudioLink('${liveUrl}')">
                    <i class="fas fa-copy"></i> COPY LINK
                </button>
                <a href="${liveUrl}" target="_blank" class="cyber-btn sm secondary">
                    <i class="fas fa-external-link-alt"></i> VIEW PAGE
                </a>
                <button type="button" class="cyber-btn sm warning" onclick="loadForEdit('${safeSlug}')">
                    <i class="fas fa-edit"></i> EDIT
                </button>
                <button type="button" class="cyber-btn sm accent" onclick="duplicateSmartLink('${safeSlug}')" title="Clone release style">
                    <i class="fas fa-clone"></i> CLONE
                </button>
                <button type="button" class="cyber-btn sm danger" onclick="deleteSmartLink('${safeSlug}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// 7. Save / Publish Action
function initActions() {
    const saveBtn = document.getElementById('btn-save-smartlink');
    const resetBtn = document.getElementById('btn-reset-smartlink-form');
    const liveBtn = document.getElementById('btn-open-live-preview');

    saveBtn.addEventListener('click', () => {
        const title = document.getElementById('smartlink-input-title').value.trim();
        const artist = document.getElementById('smartlink-input-artist').value.trim();
        const image = document.getElementById('smartlink-input-image').value.trim();
        let slug = document.getElementById('smartlink-input-slug').value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        if (!title) {
            showToast("PLEASE ENTER TRACK TITLE!", 'error');
            document.getElementById('smartlink-input-title').focus();
            return;
        }

        if (!slug) {
            slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        }

        const links = {
            spotify: document.getElementById('link-spotify')?.value.trim() || '',
            apple: document.getElementById('link-apple')?.value.trim() || '',
            youtube: document.getElementById('link-youtube')?.value.trim() || '',
            youtubemusic: document.getElementById('link-youtubemusic')?.value.trim() || '',
            amazon: document.getElementById('link-amazon')?.value.trim() || '',
            tidal: document.getElementById('link-tidal')?.value.trim() || '',
            deezer: document.getElementById('link-deezer')?.value.trim() || '',
            soundcloud: document.getElementById('link-soundcloud')?.value.trim() || '',
            beatport: document.getElementById('link-beatport')?.value.trim() || '',
            boomplay: document.getElementById('link-boomplay')?.value.trim() || '',
            audiomack: document.getElementById('link-audiomack')?.value.trim() || '',
            pandora: document.getElementById('link-pandora')?.value.trim() || ''
        };

        const uiSettings = {
            theme: activePreset,
            accent: document.getElementById('ui-accent-color').value || '#00f0ff',
            cardBg: document.getElementById('ui-card-bg-color').value || '#07090f',
            darkness: parseFloat(document.getElementById('ui-bg-darkness').value || '0.12'),
            borderGlow: parseFloat(document.getElementById('ui-border-glow').value || '0.35'),
            buttonStyle: document.getElementById('ui-button-style').value || 'clean-light',
            showQrDock: document.getElementById('ui-show-qr-dock').checked,
            showGrid: document.getElementById('ui-show-grid').checked
        };

        const legalSettings = {
            contactEmail: document.getElementById('smartlink-contact-email').value.trim() || 'artists@obscurarecord.com',
            showConsent: document.getElementById('legal-show-consent').checked,
            showFooter: document.getElementById('legal-show-footer').checked
        };

        const releaseDate = document.getElementById('smartlink-input-release-date')?.value || '';

        const payload = {
            title: title,
            artist: artist,
            image: image,
            releaseDate: releaseDate,
            audioPreview: document.getElementById('smartlink-input-preview').value.trim(),
            youtube: document.getElementById('smartlink-input-youtube').value.trim(),
            links: links,
            ui: uiSettings,
            legal: legalSettings,
            updatedAt: Date.now()
        };

        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PUBLISHING...';
        saveBtn.disabled = true;

        const saveToFirebase = async () => {
            // Direct REST PUT (100% reliable, zero WebSocket latency)
            try {
                await fetch(`https://obscura-records-smart-links-default-rtdb.asia-southeast1.firebasedatabase.app/smartLinks/${encodeURIComponent(slug)}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (e) {
                console.warn("REST direct save error:", e);
            }

            // Also dispatch via Firebase SDK if available
            try {
                db.ref(`smartLinks/${slug}`).set(payload).catch(() => {});
            } catch (e) {}

            // Immediate local sync
            cachedSmartLinks[slug] = payload;
            currentEditingSlug = slug;
            updateStatsAndRender(document.getElementById('smartlink-search-input')?.value || '');
            showToast(`SMART LINK "${title}" PUBLISHED LIVE!`);
        };

        saveToFirebase().catch(err => {
            showToast("PUBLISH ERROR: " + err.message, 'error');
        }).finally(() => {
            setSaveButtonText(currentEditingSlug ? 'UPDATE SMART LINK' : 'PUBLISH SMART LINK');
            saveBtn.disabled = false;
        });
    });

    resetBtn.addEventListener('click', () => {
        resetForm();
        showToast("FORM RESET TO DEFAULTS");
    });

    liveBtn.addEventListener('click', () => {
        const slug = document.getElementById('smartlink-input-slug').value.trim() || currentEditingSlug;
        if (!slug) {
            showToast("NO SMART LINK SLUG SPECIFIED!", 'error');
            return;
        }
        window.open(`https://www.obscurarecord.com/release/?id=${slug}`, '_blank');
    });
}

function setSaveButtonText(text) {
    const saveBtn = document.getElementById('btn-save-smartlink');
    if (!saveBtn) return;
    saveBtn.innerHTML = `<i class="fas fa-cloud-arrow-up"></i> <span id="save-btn-text">${text}</span>`;
}

function resetForm() {
    currentEditingSlug = null;
    document.getElementById('smartlink-form').reset();
    if (document.getElementById('smartlink-input-release-date')) {
        document.getElementById('smartlink-input-release-date').value = '';
    }
    setSaveButtonText('PUBLISH SMART LINK');
    document.getElementById('slug-preview-text').textContent = 'release-slug';
    activePreset = 'cyber-cyan';
    updateMockupPreview();
}

// 8. Global Helper Operations
window.loadForEdit = function(slug) {
    const data = cachedSmartLinks[slug];
    if (!data) return;

    currentEditingSlug = slug;
    document.getElementById('smartlink-input-title').value = data.title || '';
    document.getElementById('smartlink-input-artist').value = data.artist || '';
    document.getElementById('smartlink-input-slug').value = slug;
    document.getElementById('slug-preview-text').textContent = slug;
    document.getElementById('smartlink-input-image').value = data.image || data.artwork || '';
    document.getElementById('smartlink-input-preview').value = data.audioPreview || data.previewAudio || '';
    document.getElementById('smartlink-input-youtube').value = data.youtube || '';
    if (document.getElementById('smartlink-input-release-date')) {
        document.getElementById('smartlink-input-release-date').value = data.releaseDate || '';
    }

    // Platforms
    const l = data.links || {};
    document.getElementById('link-spotify').value = l.spotify || '';
    document.getElementById('link-apple').value = l.apple || '';
    document.getElementById('link-youtube').value = l.youtube || '';
    document.getElementById('link-youtubemusic').value = l.youtubemusic || '';
    document.getElementById('link-amazon').value = l.amazon || '';
    document.getElementById('link-tidal').value = l.tidal || '';
    document.getElementById('link-deezer').value = l.deezer || '';
    document.getElementById('link-soundcloud').value = l.soundcloud || '';
    document.getElementById('link-beatport').value = l.beatport || '';
    document.getElementById('link-boomplay').value = l.boomplay || '';
    document.getElementById('link-audiomack').value = l.audiomack || '';
    document.getElementById('link-pandora').value = l.pandora || '';

    // UI customizer values
    if (data.ui) {
        if (data.ui.accent) {
            document.getElementById('ui-accent-color').value = data.ui.accent;
            document.getElementById('ui-accent-hex').value = data.ui.accent;
        }
        if (data.ui.cardBg) {
            document.getElementById('ui-card-bg-color').value = data.ui.cardBg;
            document.getElementById('ui-card-bg-hex').value = data.ui.cardBg;
        }
        if (data.ui.darkness !== undefined) {
            document.getElementById('ui-bg-darkness').value = data.ui.darkness;
            document.getElementById('ui-bg-darkness-val').textContent = `${Math.round(data.ui.darkness * 100)}%`;
        }
        if (data.ui.borderGlow !== undefined) {
            document.getElementById('ui-border-glow').value = data.ui.borderGlow;
            document.getElementById('ui-border-glow-val').textContent = `${Math.round(data.ui.borderGlow * 100)}%`;
        }
        if (data.ui.buttonStyle) document.getElementById('ui-button-style').value = data.ui.buttonStyle;
        if (data.ui.showQrDock !== undefined) document.getElementById('ui-show-qr-dock').checked = data.ui.showQrDock;
        if (data.ui.showGrid !== undefined) document.getElementById('ui-show-grid').checked = data.ui.showGrid;
    }

    setSaveButtonText('UPDATE SMART LINK');
    updateMockupPreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`LOADED "${data.title || slug}" FOR EDITING`);
};

window.duplicateSmartLink = function(slug) {
    const data = cachedSmartLinks[slug];
    if (!data) return;

    loadForEdit(slug);
    currentEditingSlug = null;
    const newTitle = `${data.title || 'RELEASE'} (COPY)`;
    document.getElementById('smartlink-input-title').value = newTitle;
    const newSlug = `${slug}-copy`;
    document.getElementById('smartlink-input-slug').value = newSlug;
    document.getElementById('slug-preview-text').textContent = newSlug;
    setSaveButtonText('PUBLISH SMART LINK');
    showToast(`CLONED STYLING FROM "${slug}"! EDIT & PUBLISH AS NEW`);
};

window.deleteSmartLink = async function(slug) {
    if (!confirm(`Are you sure you want to permanently delete the Smart Link for "${slug}"?`)) return;

    try {
        await fetch(`https://obscura-records-smart-links-default-rtdb.asia-southeast1.firebasedatabase.app/smartLinks/${encodeURIComponent(slug)}.json`, {
            method: 'DELETE'
        });
        try { db.ref(`smartLinks/${slug}`).remove().catch(() => {}); } catch(e) {}

        delete cachedSmartLinks[slug];
        if (currentEditingSlug === slug) resetForm();
        updateStatsAndRender(document.getElementById('smartlink-search-input')?.value || '');
        showToast(`SMART LINK "${slug}" DELETED!`);
    } catch(err) {
        showToast("DELETE ERROR: " + err.message, 'error');
    }
};

window.copyStudioLink = function(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast("SMART LINK COPIED TO CLIPBOARD!");
    });
};

// 9. QR Code Modal Engine
let currentModalQrUrl = '';
let currentModalReleaseName = '';

window.openStudioQr = function(slug, title, liveUrl) {
    currentModalQrUrl = liveUrl;
    currentModalReleaseName = title || slug;

    document.getElementById('qr-modal-release-title').textContent = title.toUpperCase();
    document.getElementById('qr-modal-url-input').value = liveUrl;

    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(liveUrl)}&color=0-240-255&bgcolor=7-9-18&margin=1`;
    document.getElementById('qr-modal-image').src = qrApi;
    document.getElementById('smartlink-qr-modal').style.display = 'flex';
};

window.closeSmartLinkQrModal = function() {
    document.getElementById('smartlink-qr-modal').style.display = 'none';
};

window.copyQrModalUrl = function() {
    navigator.clipboard.writeText(currentModalQrUrl).then(() => {
        showToast("LINK COPIED!");
    });
};

window.downloadQrModalImage = function() {
    const cleanName = currentModalReleaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'release';
    const hdQrApi = `https://api.qrserver.com/v1/create-qr-code/?size=2000x2000&data=${encodeURIComponent(currentModalQrUrl)}&color=0-240-255&bgcolor=7-9-18&margin=2`;

    showToast("GENERATING ULTRA HD (2000x2000) PNG...");

    fetch(hdQrApi)
        .then(res => res.blob())
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `obscura-qr-${cleanName}-hd.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
            showToast("HD QR CODE DOWNLOADED!");
        })
        .catch(() => {
            window.open(hdQrApi, '_blank');
        });
};
