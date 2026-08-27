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
    'cyber-cyan': { accent: '#00f0ff', cardBg: '#07090f', darkness: 0.12, glow: 0.35, buttonStyle: 'cyber-glass' },
    'dark-phonk': { accent: '#ff0055', cardBg: '#0a0407', darkness: 0.08, glow: 0.45, buttonStyle: 'cyber-glass' },
    'tokyo-violet': { accent: '#8b5cf6', cardBg: '#080614', darkness: 0.14, glow: 0.42, buttonStyle: 'cyber-glass' },
    'acid-emerald': { accent: '#00ff8c', cardBg: '#040d08', darkness: 0.12, glow: 0.38, buttonStyle: 'solid-neon' },
    'solar-amber': { accent: '#ffaa00', cardBg: '#0e0904', darkness: 0.12, glow: 0.45, buttonStyle: 'solid-neon' },
    'magma-inferno': { accent: '#ff5500', cardBg: '#0d0502', darkness: 0.10, glow: 0.45, buttonStyle: 'cyber-glass' },
    'neon-sakura': { accent: '#ff2a8d', cardBg: '#100511', darkness: 0.12, glow: 0.45, buttonStyle: 'holographic' },
    'electric-azure': { accent: '#0099ff', cardBg: '#030914', darkness: 0.12, glow: 0.40, buttonStyle: 'cyber-glass' },
    'ice-glacier': { accent: '#38bdf8', cardBg: '#050c14', darkness: 0.10, glow: 0.35, buttonStyle: 'neon-outline' },
    'nebula-magenta': { accent: '#d946ef', cardBg: '#0e0414', darkness: 0.12, glow: 0.45, buttonStyle: 'holographic' },
    'luxury-champagne': { accent: '#f59e0b', cardBg: '#0d0a06', darkness: 0.08, glow: 0.35, buttonStyle: 'clean-light' },
    'minimal-obsidian': { accent: '#ffffff', cardBg: '#09090b', darkness: 0.06, glow: 0.18, buttonStyle: 'velvet-dark' }
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

    // Release Date & Status Mode overrides
    const releaseDateInp = document.getElementById('smartlink-input-release-date');
    if (releaseDateInp) {
        releaseDateInp.addEventListener('input', updateMockupPreview);
        releaseDateInp.addEventListener('change', updateMockupPreview);
    }

    const statusModeInp = document.getElementById('smartlink-input-status-mode');
    if (statusModeInp) statusModeInp.addEventListener('change', updateMockupPreview);

    const customStatusInp = document.getElementById('smartlink-input-custom-status');
    if (customStatusInp) customStatusInp.addEventListener('input', updateMockupPreview);

    const customInstructionInp = document.getElementById('smartlink-input-custom-instruction');
    if (customInstructionInp) customInstructionInp.addEventListener('input', updateMockupPreview);

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
    document.documentElement.style.setProperty('--accent-cyan', accent);
    document.documentElement.style.setProperty('--accent-rgb', rgb);

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

    // Dynamic Status Badge & Platform List in Mockup
    const releaseDateVal = document.getElementById('smartlink-input-release-date')?.value;
    const statusModeVal = document.getElementById('smartlink-input-status-mode')?.value || 'auto';
    const customStatusVal = document.getElementById('smartlink-input-custom-status')?.value?.trim();
    const customInstructionVal = document.getElementById('smartlink-input-custom-instruction')?.value?.trim();

    let isPreSave = false;
    if (statusModeVal === 'presave') {
        isPreSave = true;
    } else if (statusModeVal === 'outnow') {
        isPreSave = false;
    } else {
        isPreSave = Boolean(releaseDateVal && new Date(releaseDateVal).getTime() > Date.now());
    }

    const mockBadge = document.getElementById('mock-status-badge');
    const mockPrompt = document.getElementById('mock-prompt');

    if (mockBadge) {
        if (customStatusVal) {
            mockBadge.className = `smartlink-status-badge ${isPreSave ? 'pre-save' : 'out-now'}`;
            mockBadge.innerHTML = `<i class="fas ${isPreSave ? 'fa-hourglass-half' : 'fa-bolt'}"></i> <span>${customStatusVal.toUpperCase()}</span>`;
        } else if (isPreSave) {
            mockBadge.className = 'smartlink-status-badge pre-save';
            mockBadge.innerHTML = `<i class="fas fa-hourglass-half"></i> <span>PRE-SAVE // RELEASING SOON</span>`;
        } else {
            mockBadge.className = 'smartlink-status-badge out-now';
            mockBadge.innerHTML = `<i class="fas fa-bolt"></i> <span>OUT NOW // STREAMING EVERYWHERE</span>`;
        }
    }

    if (mockPrompt) {
        if (customInstructionVal) {
            mockPrompt.textContent = customInstructionVal.toUpperCase();
        } else {
            mockPrompt.textContent = isPreSave ? 'PRE-SAVE TO YOUR MUSIC LIBRARY' : 'CHOOSE YOUR PREFERRED MUSIC SERVICE';
        }
    }

    const platformContainer = document.getElementById('mock-platforms-container');
    if (platformContainer) {
        platformContainer.className = `mock-platforms-list style-${btnStyle}`;

        const platforms = [
            { id: 'link-spotify', name: 'Spotify', icon: 'fab fa-spotify', col: '#1DB954', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-apple', name: 'Apple Music', icon: 'fab fa-apple', col: '#FA243C', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-itunes', name: 'iTunes Store', icon: 'fab fa-itunes', col: '#EA4CC0', action: isPreSave ? 'Pre-Save' : 'Download' },
            { id: 'link-youtube', name: 'YouTube', icon: 'fab fa-youtube', col: '#FF0000', action: isPreSave ? 'Pre-Save' : 'Watch' },
            { id: 'link-youtubemusic', name: 'YouTube Music', icon: 'fas fa-play-circle', col: '#FF0000', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-amazon', name: 'Amazon Music', icon: 'fab fa-amazon', col: '#00A8E1', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-tidal', name: 'TIDAL', icon: 'fas fa-compact-disc', col: '#00f0ff', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-deezer', name: 'Deezer', icon: 'fab fa-deezer', col: '#FF0092', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-soundcloud', name: 'SoundCloud', icon: 'fab fa-soundcloud', col: '#FF5500', action: isPreSave ? 'Pre-Save' : 'Stream' },
            { id: 'link-beatport', name: 'Beatport', icon: 'fas fa-bolt', col: '#00FF95', action: isPreSave ? 'Pre-Save' : 'Buy' },
            { id: 'link-boomplay', name: 'Boomplay', icon: 'fas fa-play', col: '#00E676', action: isPreSave ? 'Pre-Save' : 'Stream' },
            { id: 'link-audiomack', name: 'Audiomack', icon: 'fas fa-music', col: '#FFAA00', action: isPreSave ? 'Pre-Save' : 'Stream' },
            { id: 'link-pandora', name: 'Pandora', icon: 'fas fa-radio', col: '#005483', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-tiktok', name: 'TikTok', icon: 'fab fa-tiktok', col: '#00f2fe', action: isPreSave ? 'Pre-Save' : 'Use Sound' },
            { id: 'link-sevendigital', name: '7digital', icon: 'fas fa-music', col: '#20B2AA', action: isPreSave ? 'Pre-Save' : 'Download' },
            { id: 'link-alibaba', name: 'Alibaba Music', icon: 'fas fa-store', col: '#FF6A00', action: isPreSave ? 'Pre-Save' : 'Stream' },
            { id: 'link-anghami', name: 'Anghami', icon: 'fas fa-play', col: '#75147C', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-audiblemagic', name: 'Audible Magic', icon: 'fas fa-shield-alt', col: '#9B51E0', action: isPreSave ? 'Pre-Save' : 'Verify' },
            { id: 'link-awa', name: 'AWA', icon: 'fas fa-compact-disc', col: '#FA4870', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-bmat', name: 'BMAT', icon: 'fas fa-chart-simple', col: '#3B82F6', action: isPreSave ? 'Pre-Save' : 'Track' },
            { id: 'link-claromusica', name: 'ClaroMusica', icon: 'fas fa-music', col: '#DA291C', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-facebook', name: 'Facebook Audio', icon: 'fab fa-facebook', col: '#1877F2', action: isPreSave ? 'Pre-Save' : 'Use Audio' },
            { id: 'link-flo', name: 'FLO', icon: 'fas fa-wave-square', col: '#0045FF', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-iheart', name: 'iHeartRadio', icon: 'fas fa-heart', col: '#C6002B', action: isPreSave ? 'Pre-Save' : 'Listen' },
            { id: 'link-jaxsta', name: 'Jaxsta', icon: 'fas fa-award', col: '#00f0ff', action: isPreSave ? 'Pre-Save' : 'Credits' },
            { id: 'link-kanjian', name: 'Kanjian', icon: 'fas fa-eye', col: '#FF3366', action: isPreSave ? 'Pre-Save' : 'Stream' },
            { id: 'link-kkbox', name: 'KKBox', icon: 'fas fa-box-open', col: '#00C8FF', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-netease', name: 'NetEase Cloud Music', icon: 'fas fa-cloud', col: '#E60026', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-peloton', name: 'Peloton', icon: 'fas fa-bicycle', col: '#DF1C25', action: isPreSave ? 'Pre-Save' : 'Ride' },
            { id: 'link-qobuz', name: 'Qobuz', icon: 'fas fa-circle-play', col: '#0058A8', action: isPreSave ? 'Pre-Save' : 'Stream' },
            { id: 'link-saavn', name: 'JioSaavn', icon: 'fas fa-compact-disc', col: '#2BC5B4', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-securycast', name: 'Securycast', icon: 'fas fa-shield-halved', col: '#10B981', action: isPreSave ? 'Pre-Save' : 'Broadcast' },
            { id: 'link-slacker', name: 'Slacker / LiveOne', icon: 'fas fa-sliders', col: '#E02020', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-soundmouse', name: 'Soundmouse', icon: 'fas fa-computer-mouse', col: '#00BCD4', action: isPreSave ? 'Pre-Save' : 'Monitor' },
            { id: 'link-tencent', name: 'Tencent / QQ Music', icon: 'fab fa-qq', col: '#12B7F5', action: isPreSave ? 'Pre-Save' : 'Play' },
            { id: 'link-trebel', name: 'Trebel', icon: 'fas fa-arrow-down', col: '#FF4500', action: isPreSave ? 'Pre-Save' : 'Download' },
            { id: 'link-tunedglobal', name: 'Tuned Global', icon: 'fas fa-globe', col: '#4A90E2', action: isPreSave ? 'Pre-Save' : 'Stream' },
            { id: 'link-yousee', name: 'YouSee / Telmore', icon: 'fas fa-tv', col: '#E30613', action: isPreSave ? 'Pre-Save' : 'Play' }
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

// 5. Local File Upload Handlers (Smart Compression & Size Validation)
function initFileUploads() {
    const imgFileInp = document.getElementById('smartlink-file-image');
    if (imgFileInp) {
        imgFileInp.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Auto compress & resize image to max 1200x1200 JPEG to ensure ultra-fast load and small payload
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let maxDim = 1200;
                        let w = img.width;
                        let h = img.height;
                        if (w > maxDim || h > maxDim) {
                            if (w > h) {
                                h = Math.round((h * maxDim) / w);
                                w = maxDim;
                            } else {
                                w = Math.round((w * maxDim) / h);
                                h = maxDim;
                            }
                        }
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
                        if (document.getElementById('smartlink-input-image')) {
                            document.getElementById('smartlink-input-image').value = compressedDataUrl;
                        }
                        updateMockupPreview();
                        showToast("LOCAL ARTWORK OPTIMIZED & LOADED!");
                    };
                    img.src = event.target.result;
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
                // Check audio size (Max 4.5MB for database storage)
                if (file.size > 4.5 * 1024 * 1024) {
                    showToast(`AUDIO FILE TOO LARGE (${(file.size / (1024 * 1024)).toFixed(1)}MB)! Max upload is 4.5MB (use an MP3 preview snippet) or paste a YouTube / MP3 link.`, 'error');
                    previewFileInp.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                    if (document.getElementById('smartlink-input-preview')) {
                        document.getElementById('smartlink-input-preview').value = reader.result;
                    }
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
    const searchInp = document.getElementById('smartlink-search-input');

    const handleData = (data) => {
        if (data && typeof data === 'object') {
            cachedSmartLinks = data;
            updateStatsAndRender(searchInp ? searchInp.value : '');
        } else {
            cachedSmartLinks = {};
            updateStatsAndRender(searchInp ? searchInp.value : '');
        }
    };

    // 1. Instant REST Fetch
    fetch("https://obscura-records-smart-links-default-rtdb.asia-southeast1.firebasedatabase.app/smartLinks.json")
        .then(res => res.json())
        .then(handleData)
        .catch(err => console.warn("REST fetch fallback:", err));

    // 2. Immediate SDK once() query
    try {
        db.ref('smartLinks').once('value').then(snap => {
            const val = snap.val();
            if (val) handleData(val);
        }).catch(() => {});
    } catch(e) {}

    // 3. Continuous Realtime listener
    try {
        db.ref('smartLinks').on('value', snap => {
            const val = snap.val();
            handleData(val);
        }, err => {
            console.warn("RTDB listener notice:", err);
        });
    } catch(e) {
        console.warn("RTDB subscription notice:", e);
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
        if (!item || typeof item !== 'object') return false;
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
        if (!item || typeof item !== 'object') return;
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

const PLATFORM_INPUT_KEYS = [
    'spotify', 'apple', 'itunes', 'youtube', 'youtubemusic', 'amazon',
    'tidal', 'deezer', 'soundcloud', 'beatport', 'boomplay', 'audiomack',
    'pandora', 'tiktok', 'sevendigital', 'alibaba', 'anghami', 'audiblemagic',
    'awa', 'bmat', 'claromusica', 'facebook', 'flo', 'iheart',
    'jaxsta', 'kanjian', 'kkbox', 'netease', 'peloton', 'qobuz',
    'saavn', 'securycast', 'slacker', 'soundmouse', 'tencent', 'trebel',
    'tunedglobal', 'yousee'
];

// 7. Save / Publish Action
function initActions() {
    const saveBtn = document.getElementById('btn-save-smartlink');
    const resetBtn = document.getElementById('btn-reset-smartlink-form');
    const liveBtn = document.getElementById('btn-open-live-preview');

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const title = document.getElementById('smartlink-input-title')?.value.trim() || '';
            const artist = document.getElementById('smartlink-input-artist')?.value.trim() || '';
            const image = document.getElementById('smartlink-input-image')?.value.trim() || '';
            let slug = document.getElementById('smartlink-input-slug')?.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || '';

            if (!title) {
                showToast("PLEASE ENTER TRACK TITLE!", 'error');
                document.getElementById('smartlink-input-title')?.focus();
                return;
            }

            if (!slug) {
                slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            }

            const rawAudio = document.getElementById('smartlink-input-preview')?.value.trim() || '';
            if (rawAudio && rawAudio.startsWith('data:') && rawAudio.length > 6 * 1024 * 1024) {
                showToast("AUDIO PREVIEW IS TOO LARGE (>5MB)! Please upload a shorter MP3 snippet or paste a direct link.", "error");
                return;
            }

            const links = {};
            PLATFORM_INPUT_KEYS.forEach(key => {
                const el = document.getElementById(`link-${key}`);
                links[key] = el ? el.value.trim() : '';
            });

            const uiSettings = {
                theme: activePreset,
                accent: document.getElementById('ui-accent-color')?.value || '#00f0ff',
                cardBg: document.getElementById('ui-card-bg-color')?.value || '#07090f',
                darkness: parseFloat(document.getElementById('ui-bg-darkness')?.value || '0.12'),
                borderGlow: parseFloat(document.getElementById('ui-border-glow')?.value || '0.35'),
                buttonStyle: document.getElementById('ui-button-style')?.value || 'clean-light',
                showQrDock: document.getElementById('ui-show-qr-dock')?.checked ?? true,
                showGrid: document.getElementById('ui-show-grid')?.checked ?? true
            };

            const legalSettings = {
                contactEmail: document.getElementById('smartlink-contact-email')?.value.trim() || 'artists@obscurarecord.com',
                showConsent: document.getElementById('legal-show-consent')?.checked ?? true,
                showFooter: document.getElementById('legal-show-footer')?.checked ?? true
            };

            const releaseDate = document.getElementById('smartlink-input-release-date')?.value || '';
            const statusMode = document.getElementById('smartlink-input-status-mode')?.value || 'auto';
            const customStatus = document.getElementById('smartlink-input-custom-status')?.value?.trim() || '';
            const customInstruction = document.getElementById('smartlink-input-custom-instruction')?.value?.trim() || '';

            const payload = {
                title: title,
                artist: artist,
                image: image,
                releaseDate: releaseDate,
                statusMode: statusMode,
                customStatus: customStatus,
                customInstruction: customInstruction,
                audioPreview: rawAudio,
                youtube: document.getElementById('smartlink-input-youtube')?.value.trim() || '',
                links: links,
                ui: uiSettings,
                legal: legalSettings,
                updatedAt: Date.now()
            };

            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PUBLISHING...';
            saveBtn.disabled = true;

            const saveToFirebase = async () => {
                let isSaved = false;
                let lastError = null;

                // 1. Dispatch via Firebase SDK
                try {
                    await db.ref(`smartLinks/${slug}`).set(payload);
                    isSaved = true;
                } catch (sdkErr) {
                    console.warn("Firebase SDK save failed, falling back to direct REST:", sdkErr);
                    lastError = sdkErr;
                }

                // 2. Direct REST PUT (for zero WebSocket dependency)
                if (!isSaved) {
                    try {
                        const res = await fetch(`https://obscura-records-smart-links-default-rtdb.asia-southeast1.firebasedatabase.app/smartLinks/${encodeURIComponent(slug)}.json`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        if (res.ok) {
                            isSaved = true;
                        } else {
                            const txt = await res.text();
                            throw new Error(`HTTP ${res.status}: ${txt}`);
                        }
                    } catch (restErr) {
                        console.warn("REST direct save error:", restErr);
                        lastError = restErr;
                    }
                }

                if (!isSaved) {
                    throw new Error(lastError ? (lastError.message || String(lastError)) : "Could not reach database. Check internet connection.");
                }

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
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetForm();
            showToast("FORM RESET TO DEFAULTS");
        });
    }

    if (liveBtn) {
        liveBtn.addEventListener('click', () => {
            const slug = document.getElementById('smartlink-input-slug')?.value.trim() || currentEditingSlug;
            if (!slug) {
                showToast("NO SMART LINK SLUG SPECIFIED!", 'error');
                return;
            }
            window.open(`https://www.obscurarecord.com/release/?id=${slug}`, '_blank');
        });
    }
}

function setSaveButtonText(text) {
    const saveBtn = document.getElementById('btn-save-smartlink');
    if (!saveBtn) return;
    saveBtn.innerHTML = `<i class="fas fa-cloud-arrow-up"></i> <span id="save-btn-text">${text}</span>`;
}

function resetForm() {
    currentEditingSlug = null;
    if (document.getElementById('smartlink-form')) document.getElementById('smartlink-form').reset();
    if (document.getElementById('smartlink-input-release-date')) {
        document.getElementById('smartlink-input-release-date').value = '';
    }
    if (document.getElementById('smartlink-input-status-mode')) document.getElementById('smartlink-input-status-mode').value = 'auto';
    if (document.getElementById('smartlink-input-custom-status')) document.getElementById('smartlink-input-custom-status').value = '';
    if (document.getElementById('smartlink-input-custom-instruction')) document.getElementById('smartlink-input-custom-instruction').value = '';
    PLATFORM_INPUT_KEYS.forEach(key => {
        const el = document.getElementById(`link-${key}`);
        if (el) el.value = '';
    });
    setSaveButtonText('PUBLISH SMART LINK');
    if (document.getElementById('slug-preview-text')) document.getElementById('slug-preview-text').textContent = 'release-slug';
    activePreset = 'cyber-cyan';
    updateMockupPreview();
}

// 8. Global Helper Operations
window.loadForEdit = function(slug) {
    const data = cachedSmartLinks[slug];
    if (!data) return;

    currentEditingSlug = slug;
    if (document.getElementById('smartlink-input-title')) document.getElementById('smartlink-input-title').value = data.title || '';
    if (document.getElementById('smartlink-input-artist')) document.getElementById('smartlink-input-artist').value = data.artist || '';
    if (document.getElementById('smartlink-input-slug')) document.getElementById('smartlink-input-slug').value = slug;
    if (document.getElementById('slug-preview-text')) document.getElementById('slug-preview-text').textContent = slug;
    if (document.getElementById('smartlink-input-image')) document.getElementById('smartlink-input-image').value = data.image || data.artwork || '';
    if (document.getElementById('smartlink-input-preview')) document.getElementById('smartlink-input-preview').value = data.audioPreview || data.previewAudio || '';
    if (document.getElementById('smartlink-input-youtube')) document.getElementById('smartlink-input-youtube').value = data.youtube || '';
    if (document.getElementById('smartlink-input-release-date')) {
        document.getElementById('smartlink-input-release-date').value = data.releaseDate || '';
    }
    if (document.getElementById('smartlink-input-status-mode')) {
        document.getElementById('smartlink-input-status-mode').value = data.statusMode || 'auto';
    }
    if (document.getElementById('smartlink-input-custom-status')) {
        document.getElementById('smartlink-input-custom-status').value = data.customStatus || '';
    }
    if (document.getElementById('smartlink-input-custom-instruction')) {
        document.getElementById('smartlink-input-custom-instruction').value = data.customInstruction || '';
    }

    // Platforms
    const l = data.links || {};
    PLATFORM_INPUT_KEYS.forEach(key => {
        const el = document.getElementById(`link-${key}`);
        if (el) el.value = l[key] || '';
    });

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
