// OBSCURA RECORD // CORE DIRECTIVE COMMAND DECK ENGINE (v5.5)
// ARCHITECTURE: FULL REAL-TIME FIREBASE SYNCHRONIZATION (0 BUGS / ZERO DELAY)

const firebaseConfig = {
    apiKey: "AIzaSyCHf_R1n2Qn-q4NHAjfJt6xD_TWIRjiN1o",
    authDomain: "obscura-records.firebaseapp.com",
    databaseURL: "https://obscura-records-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "obscura-records",
    storageBucket: "obscura-records.firebasestorage.app",
    messagingSenderId: "831882873428",
    appId: "1:831882873428:web:3cf009875e160a9f8efbc1"
};

// Initialize Firebase once
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// State stores
let cachedGlobals = {};
let cachedReleases = [];
let cachedUpcoming = [];
let cachedStaff = {};
let cachedPartners = {};
let cachedDemos = {};
let cachedContacts = {};
let cachedFAQs = [];
let currentStaffView = 'staff'; // 'staff' | 'partner'
let engineInitialized = false;

// --- TOAST NOTIFICATION SYSTEM ---
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast-notif');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notif ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}" style="color: ${type === 'success' ? '#00ff8c' : '#ff0055'};"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// Auto-Versioning (Cache Buster) & Audit Logger
function bumpSiteVersion(actionDesc) {
    db.ref('siteData/globals/v').transaction((v) => {
        const nextV = (parseFloat(v || 1.0) + 0.1).toFixed(1);
        const display = document.getElementById('display-v');
        if (display) display.textContent = nextV;
        return nextV;
    });

    if (actionDesc) {
        logSecurityEvent(actionDesc);
    }
}

function logSecurityEvent(action) {
    const user = firebase.auth().currentUser;
    const email = user ? user.email : 'SYSTEM';
    const logItem = {
        action: action,
        user: email,
        timestamp: Date.now()
    };
    db.ref('security_logs').push(logItem);
}

// Safe navigation helper
window.secureNavigate = function(url, key) {
    sessionStorage.setItem(key, 'true');
    window.location.href = url;
};

// --- FIREBASE AUTHENTICATION & LOGIN DECK ---
const loginOverlay = document.getElementById('login-overlay');
const adminWrapper = document.querySelector('.admin-wrapper');
const rootEmailInput = document.getElementById('root-email-input');
const rootPassInput = document.getElementById('root-pass-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const togglePwdBtn = document.getElementById('toggle-pwd-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');

// Listen to Firebase Auth state
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        sessionStorage.setItem('rootAuth', 'granted');
        sessionStorage.setItem('adminBypass', 'true');
        unlockDashboard();
    } else {
        lockDashboard();
    }
});

// Toggle Password Visibility
if (togglePwdBtn && rootPassInput) {
    togglePwdBtn.addEventListener('click', () => {
        const isPass = rootPassInput.type === 'password';
        rootPassInput.type = isPass ? 'text' : 'password';
        togglePwdBtn.innerHTML = isPass ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    });
}

function handleLogin() {
    const email = rootEmailInput ? rootEmailInput.value.trim() : '';
    const pass = rootPassInput ? rootPassInput.value.trim() : '';

    if (!email || !pass) {
        if (loginError) {
            loginError.textContent = 'PLEASE PROVIDE BOTH ADMIN EMAIL AND PASSWORD.';
            loginError.style.display = 'block';
        }
        return;
    }

    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AUTHENTICATING...';
        loginBtn.disabled = true;
    }

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => {
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-check"></i> ACCESS GRANTED';
                loginBtn.disabled = false;
            }
            if (loginError) loginError.style.display = 'none';
        })
        .catch((error) => {
            console.error("Auth Failure:", error);
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-unlock-alt"></i> INITIATE ROOT ACCESS';
                loginBtn.disabled = false;
            }
            if (loginError) {
                loginError.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ACCESS DENIED: ${error.message}`;
                loginError.style.display = 'block';
            }
        });
}

function unlockDashboard() {
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (adminWrapper) adminWrapper.style.display = 'flex';
    if (!engineInitialized) {
        engineInitialized = true;
        initDashboardEngine();
    }
}

function lockDashboard() {
    if (loginOverlay) loginOverlay.style.display = 'flex';
    if (adminWrapper) adminWrapper.style.display = 'none';
}

if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
}

[rootEmailInput, rootPassInput].forEach(inp => {
    if (inp) {
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
});

if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
        if (confirm("Terminate current administrative session?")) {
            firebase.auth().signOut().then(() => {
                sessionStorage.removeItem('rootAuth');
                sessionStorage.removeItem('adminBypass');
                window.location.reload();
            });
        }
    });
}

// Particle Starfield on Login Screen
function initLoginStarfield() {
    const canvas = document.getElementById('vibe-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = [];
    for (let i = 0; i < 90; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.6 + 0.4,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            color: Math.random() > 0.5 ? '#00f0ff' : '#b700ff'
        });
    }

    function render() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.fill();
        });
        requestAnimationFrame(render);
    }
    render();
}

window.addEventListener('DOMContentLoaded', () => {
    initLoginStarfield();
});

// --- DASHBOARD ENGINE ---
function initDashboardEngine() {
    initNavigation();
    initGlobalsSync();
    initReleasesEngine();
    initUpcomingEngine();
    initGhostProdEngine();
    initStaffEngine();
    initDemosEngine();
    initContactEngine();
    initModalsEngine();
    initSecurityLogsEngine();
}

// --- PANEL NAVIGATION ---
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const panels = document.querySelectorAll('.panel');
    const panelTitle = document.getElementById('current-panel-title');
    const panelDesc = document.getElementById('current-panel-desc');

    const panelMeta = {
        'settings-panel': { title: '<i class="fas fa-sliders-h"></i> GLOBALS & DIRECTIVES', desc: 'Real-time control center for core site typography, branding, and system states.' },
        'links-panel': { title: '<i class="fas fa-link"></i> NAVIGATION & SOCIAL CHANNELS', desc: 'Manage destination URLs for header links, social channels, and external portals.' },
        'releases-panel': { title: '<i class="fas fa-compact-disc"></i> RELEASE CATALOG ARCHIVE', desc: 'Publish, edit, and reorder music releases with instant audio streaming IDs.' },
        'upcoming-panel': { title: '<i class="fas fa-clock"></i> UPCOMING RELEASES & TEASERS', desc: 'Configure teaser artwork, countdown date, and production status tags.' },
        'ghost-production-panel': { title: '<i class="fas fa-ghost"></i> GHOST PRODUCTION DIRECTIVES', desc: 'Manage custom production pricing tiers, turnaround timeline, and feature lists.' },
        'staff-panel': { title: '<i class="fas fa-users-cog"></i> PERSONNEL & COLLABORATOR PROFILES', desc: 'Custom avatars, banners, biographies, sort order, and social platforms for personnel.' },
        'demo-inbox-panel': { title: '<i class="fas fa-inbox"></i> DEMO SUBMISSIONS INBOX', desc: 'Review, stream, analyze link security, and tag artist demo transmissions.' },
        'contact-inbox-panel': { title: '<i class="fas fa-envelope-open-text"></i> CONTACT INQUIRIES', desc: 'Direct communications submitted via the public contact portal.' },
        'modals-panel': { title: '<i class="fas fa-window-restore"></i> MODALS, FAQ & FOOTER', desc: 'Interactive FAQ question/answers accordion, footer links, and legal policy editor.' },
        'security-panel': { title: '<i class="fas fa-shield-virus"></i> SECURITY & SYSTEM AUDIT', desc: 'Real-time database connection telemetry and administrative audit logs.' }
    };

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.target;
            if (!target) return;
            e.preventDefault();

            navBtns.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPanel = document.getElementById(target);
            if (targetPanel) targetPanel.classList.add('active');

            if (panelMeta[target]) {
                if (panelTitle) panelTitle.innerHTML = panelMeta[target].title;
                if (panelDesc) panelDesc.textContent = panelMeta[target].desc;
            }
        });
    });
}

// --- 1 & 2. GLOBALS & LINKS SYNC ---
function initGlobalsSync() {
    db.ref('siteData/globals').on('value', (snap) => {
        const data = snap.val() || {};
        cachedGlobals = data;

        const map = {
            site_siteTitle: data.siteTitle || "OBSCURA <span>RECORD</span>",
            site_heroTitle: data.heroTitle || "WELCOME TO <span class='accent'>OBSCURA RECORD</span>",
            site_heroDesc: data.heroDesc || "",
            site_archiveTitle: data.archiveTitle || "LABEL <span class='accent'>RELEASES</span>",
            site_archiveDesc: data.archiveDesc || "",
            site_upcomingTitle: data.upcomingTitle || "UPCOMING <span class='accent'>RELEASES</span>",
            site_upcomingDesc: data.upcomingDesc || "FUTURE TRANSMISSIONS FROM THE VOID",
            site_staffTitle: data.staffTitle || "OBSCURA <span class='accent'>STAFF</span>",
            site_staffDesc: data.staffDesc || "",
            site_partnersTitle: data.partnersTitle || "LABEL <span class='accent'>PARTNERS</span>",
            site_partnersDesc: data.partnersDesc || "",
            site_maintenanceMode: data.maintenanceMode || "Disabled",
            security_rootKey: data.rootKey || "ORC ADMINS PASS 2026",
            site_maintenanceTitle: data.maintenanceTitle || "OBSCURA RECORD // UNDER RENOVATION",
            site_maintenanceMsg: data.maintenanceMsg || "Quantum upgrades in progress.",
            site_showUpcoming: data.showUpcoming || "Visible",
            site_showGhostProduction: data.showGhostProduction || "Visible",
            // Nav & Socials
            site_navHome: data.navHome || "HOME",
            site_navReleases: data.navReleases || "RELEASES",
            site_navGhostProduction: data.navGhostProduction || "GHOST PRODUCTION",
            site_navStaff: data.navStaff || "STAFF",
            site_navContact: data.navContact || "CONTACT",
            site_navMenuBtn: data.navMenuBtn || "MENU",
            site_socialInstaUrl: data.socialInstaUrl || "https://www.instagram.com/recordsobscura",
            site_socialYoutubeUrl: data.socialYoutubeUrl || "",
            site_socialDiscordUrl: data.socialDiscordUrl || "",
            site_socialTiktokUrl: data.socialTiktokUrl || "",
            site_socialSpotifyUrl: data.socialSpotifyUrl || "",
            site_socialEmailUrl: data.socialEmailUrl || "sayurux@gmail.com",
            site_streetxBadge: data.streetxBadge || "OFFICIAL CLOTHING DIVISION",
            site_streetxTitle: data.streetxTitle || "STREETX <span class='accent'>CLOTHING</span>",
            site_streetxDesc: data.streetxDesc || "",
            site_streetxCta: data.streetxCta || "EXPLORE COLLECTION",
            site_streetxUrl: data.streetxUrl || "streetx-clothing/"
        };

        for (const [id, val] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        }

        const vDisplay = document.getElementById('display-v');
        if (vDisplay && data.v) vDisplay.textContent = data.v;
    });

    // Save Globals button
    const saveGlobalsBtn = document.getElementById('save-globals');
    if (saveGlobalsBtn) {
        saveGlobalsBtn.addEventListener('click', () => {
            const updates = {
                siteTitle: document.getElementById('site_siteTitle').value,
                heroTitle: document.getElementById('site_heroTitle').value,
                heroDesc: document.getElementById('site_heroDesc').value,
                archiveTitle: document.getElementById('site_archiveTitle').value,
                archiveDesc: document.getElementById('site_archiveDesc').value,
                upcomingTitle: document.getElementById('site_upcomingTitle').value,
                upcomingDesc: document.getElementById('site_upcomingDesc').value,
                staffTitle: document.getElementById('site_staffTitle').value,
                staffDesc: document.getElementById('site_staffDesc').value,
                partnersTitle: document.getElementById('site_partnersTitle').value,
                partnersDesc: document.getElementById('site_partnersDesc').value,
                maintenanceMode: document.getElementById('site_maintenanceMode').value,
                rootKey: document.getElementById('security_rootKey').value,
                maintenanceTitle: document.getElementById('site_maintenanceTitle').value,
                maintenanceMsg: document.getElementById('site_maintenanceMsg').value
            };

            db.ref('siteData/globals').update(updates).then(() => {
                bumpSiteVersion("Updated Global Titles & Settings");
                showToast("GLOBALS SAVED & SYNCED TO PRODUCTION!");
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
        });
    }

    // Save Links button
    const saveLinksBtn = document.getElementById('save-links');
    if (saveLinksBtn) {
        saveLinksBtn.addEventListener('click', () => {
            const updates = {
                navHome: document.getElementById('site_navHome').value,
                navReleases: document.getElementById('site_navReleases').value,
                navGhostProduction: document.getElementById('site_navGhostProduction').value,
                navStaff: document.getElementById('site_navStaff').value,
                navContact: document.getElementById('site_navContact').value,
                navMenuBtn: document.getElementById('site_navMenuBtn').value,
                socialInstaUrl: document.getElementById('site_socialInstaUrl').value,
                socialYoutubeUrl: document.getElementById('site_socialYoutubeUrl').value,
                socialDiscordUrl: document.getElementById('site_socialDiscordUrl').value,
                socialTiktokUrl: document.getElementById('site_socialTiktokUrl').value,
                socialSpotifyUrl: document.getElementById('site_socialSpotifyUrl').value,
                socialEmailUrl: document.getElementById('site_socialEmailUrl').value,
                streetxBadge: document.getElementById('site_streetxBadge').value,
                streetxTitle: document.getElementById('site_streetxTitle').value,
                streetxDesc: document.getElementById('site_streetxDesc').value,
                streetxCta: document.getElementById('site_streetxCta').value,
                streetxUrl: document.getElementById('site_streetxUrl').value
            };

            db.ref('siteData/globals').update(updates).then(() => {
                bumpSiteVersion("Updated Navigation & Social URLs");
                showToast("NAVIGATION & SOCIAL LINKS SYNCHRONIZED!");
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
        });
    }

    // Section Visibility Selector Handlers
    const showUpcomingEl = document.getElementById('site_showUpcoming');
    if (showUpcomingEl) {
        showUpcomingEl.addEventListener('change', () => {
            const val = showUpcomingEl.value;
            db.ref('siteData/globals/showUpcoming').set(val).then(() => {
                bumpSiteVersion(`Upcoming Section Set To: ${val}`);
                showToast(`UPCOMING SECTION IS NOW ${val.toUpperCase()}!`);
            });
        });
    }

    const showGhostEl = document.getElementById('site_showGhostProduction');
    if (showGhostEl) {
        showGhostEl.addEventListener('change', () => {
            const val = showGhostEl.value;
            db.ref('siteData/globals/showGhostProduction').set(val).then(() => {
                bumpSiteVersion(`Ghost Production Set To: ${val}`);
                showToast(`GHOST PRODUCTION IS NOW ${val.toUpperCase()}!`);
            });
        });
    }
}

// --- 3. RELEASES & CATALOG ARCHIVE ENGINE ---
function initReleasesEngine() {
    const container = document.getElementById('releases-admin-container');
    const badgeReleases = document.getElementById('badge-releases');
    const editorCard = document.getElementById('release-editor-card');
    const btnAddNew = document.getElementById('btn-add-new-release');
    const btnClose = document.getElementById('close-release-editor');
    const btnCancel = document.getElementById('btn-cancel-release');
    const btnSave = document.getElementById('btn-save-release');
    const searchInput = document.getElementById('release-search-input');
    const coverInput = document.getElementById('rel_cover');
    const coverPreview = document.getElementById('rel-cover-preview');

    if (coverInput && coverPreview) {
        coverInput.addEventListener('input', () => {
            const url = coverInput.value.trim();
            coverPreview.innerHTML = url ? `<img src="${url}" onerror="this.onerror=null; this.src='assets/cover.png';">` : '<i class="fas fa-image"></i>';
        });
    }

    if (btnAddNew && editorCard) {
        btnAddNew.addEventListener('click', () => {
            document.getElementById('rel_edit_index').value = '-1';
            document.getElementById('release-editor-title').textContent = 'ADD NEW RELEASE';
            ['rel_title', 'rel_artist', 'rel_catalog', 'rel_date', 'rel_cover', 'rel_streamUrl', 'rel_spotifyUrl', 'rel_soundcloudUrl', 'rel_appleUrl', 'rel_dlUrl'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            if (coverPreview) coverPreview.innerHTML = '<i class="fas fa-image"></i>';
            editorCard.style.display = 'block';
            editorCard.scrollIntoView({ behavior: 'smooth' });
        });
    }

    [btnClose, btnCancel].forEach(b => {
        if (b && editorCard) {
            b.addEventListener('click', () => editorCard.style.display = 'none');
        }
    });

    db.ref('siteData/releases').on('value', (snap) => {
        const data = snap.val();
        cachedReleases = [];
        if (data) {
            cachedReleases = Array.isArray(data) ? data : Object.values(data);
        }
        if (badgeReleases) badgeReleases.textContent = cachedReleases.length;
        renderReleasesList();
    });

    function renderReleasesList() {
        if (!container) return;
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const filtered = cachedReleases.filter(r => {
            const title = r.title || '';
            const artist = r.artist || r.producers || '';
            const catalog = r.catalog || r.id || '';
            if (!query) return true;
            return title.toLowerCase().includes(query) ||
                   artist.toLowerCase().includes(query) ||
                   catalog.toLowerCase().includes(query);
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div class="loading-state" style="color: var(--text-dim);">NO RELEASES FOUND.</div>`;
            return;
        }

        container.innerHTML = filtered.map((rel, i) => {
            const actualIndex = cachedReleases.indexOf(rel);
            const cover = rel.cover || rel.image || 'assets/cover.png';
            const artist = rel.artist || rel.producers || 'UNKNOWN ARTIST';
            const catalog = rel.catalog || rel.id || 'OCR---';
            return `
                <div class="admin-release-card">
                    <div class="rel-card-top">
                        <img src="${cover}" alt="Artwork" class="rel-thumb" onerror="this.onerror=null; this.src='assets/cover.png';">
                        <div class="rel-meta">
                            <h4>${rel.title || 'UNTITLED'}</h4>
                            <div class="rel-artist">${artist}</div>
                            <div class="rel-code">${catalog} | ${rel.date || 'TBA'}</div>
                        </div>
                    </div>
                    <div class="rel-card-actions">
                        <button type="button" class="cyber-btn primary sm" onclick="editRelease(${actualIndex})">
                            <i class="fas fa-edit"></i> EDIT
                        </button>
                        <button type="button" class="cyber-btn danger sm" onclick="deleteRelease(${actualIndex})">
                            <i class="fas fa-trash"></i> DELETE
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    if (searchInput) {
        searchInput.addEventListener('input', renderReleasesList);
    }

    // Save release handler
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const index = parseInt(document.getElementById('rel_edit_index').value);
            const title = document.getElementById('rel_title').value.trim();
            const artist = document.getElementById('rel_artist').value.trim();

            if (!title || !artist) {
                showToast("PLEASE FILL IN TITLE AND ARTIST!", 'error');
                return;
            }

            const catalog = document.getElementById('rel_catalog').value.trim() || 'OCR000';
            const cover = document.getElementById('rel_cover').value.trim() || 'assets/cover.png';
            const streamUrl = document.getElementById('rel_streamUrl').value.trim();
            const spotifyUrl = document.getElementById('rel_spotifyUrl').value.trim();
            const appleUrl = document.getElementById('rel_appleUrl').value.trim();

            // Store dual keys so both old and new site scripts work seamlessly
            const item = {
                title: title,
                artist: artist,
                producers: artist,
                catalog: catalog,
                id: catalog,
                date: document.getElementById('rel_date').value.trim() || '2026',
                cover: cover,
                image: cover,
                streamUrl: streamUrl,
                youtube: streamUrl,
                spotifyUrl: spotifyUrl,
                spotify: spotifyUrl,
                soundcloudUrl: document.getElementById('rel_soundcloudUrl').value.trim(),
                appleUrl: appleUrl,
                apple: appleUrl,
                dlUrl: document.getElementById('rel_dlUrl').value.trim()
            };

            let updatedList = [...cachedReleases];
            if (index >= 0) {
                updatedList[index] = item;
            } else {
                updatedList.unshift(item); // Add to top
            }

            db.ref('siteData/releases').set(updatedList).then(() => {
                bumpSiteVersion(`Saved Release: ${title}`);
                showToast("RELEASE SAVED SUCCESSFULLY!");
                if (editorCard) editorCard.style.display = 'none';
            }).catch(err => showToast("SAVE ERROR: " + err.message, 'error'));
        });
    }

    window.editRelease = function(index) {
        const rel = cachedReleases[index];
        if (!rel || !editorCard) return;

        document.getElementById('rel_edit_index').value = index;
        document.getElementById('release-editor-title').textContent = `EDIT RELEASE: ${rel.title}`;
        document.getElementById('rel_title').value = rel.title || '';
        document.getElementById('rel_artist').value = rel.artist || rel.producers || '';
        document.getElementById('rel_catalog').value = rel.catalog || rel.id || '';
        document.getElementById('rel_date').value = rel.date || '';
        document.getElementById('rel_cover').value = rel.cover || rel.image || '';
        document.getElementById('rel_streamUrl').value = rel.streamUrl || rel.youtube || '';
        document.getElementById('rel_spotifyUrl').value = rel.spotifyUrl || rel.spotify || '';
        document.getElementById('rel_soundcloudUrl').value = rel.soundcloudUrl || rel.soundcloud || '';
        document.getElementById('rel_appleUrl').value = rel.appleUrl || rel.apple || '';
        document.getElementById('rel_dlUrl').value = rel.dlUrl || '';

        const coverSrc = rel.cover || rel.image || '';
        if (coverPreview) {
            coverPreview.innerHTML = coverSrc ? `<img src="${coverSrc}">` : '<i class="fas fa-image"></i>';
        }

        editorCard.style.display = 'block';
        editorCard.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteRelease = function(index) {
        const rel = cachedReleases[index];
        if (!rel) return;
        if (!confirm(`Are you sure you want to delete "${rel.title}"?`)) return;

        const updatedList = cachedReleases.filter((_, i) => i !== index);
        db.ref('siteData/releases').set(updatedList).then(() => {
            bumpSiteVersion(`Deleted Release: ${rel.title}`);
            showToast("RELEASE DELETED!");
        }).catch(err => showToast("DELETE ERROR: " + err.message, 'error'));
    };
}

// --- 4. UPCOMING TEASERS ENGINE ---
function initUpcomingEngine() {
    const container = document.getElementById('upcoming-admin-container');
    const badgeUpcoming = document.getElementById('badge-upcoming');
    const editorCard = document.getElementById('upcoming-editor-card');
    const btnAddNew = document.getElementById('btn-add-upcoming');
    const btnClose = document.getElementById('close-upcoming-editor');
    const btnCancel = document.getElementById('btn-cancel-upcoming');
    const btnSave = document.getElementById('btn-save-upcoming');

    if (btnAddNew && editorCard) {
        btnAddNew.addEventListener('click', () => {
            document.getElementById('upc_edit_index').value = '-1';
            document.getElementById('upcoming-editor-title').textContent = 'ADD UPCOMING TEASER';
            ['upc_title', 'upc_artist', 'upc_date', 'upc_cover'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            editorCard.style.display = 'block';
            editorCard.scrollIntoView({ behavior: 'smooth' });
        });
    }

    [btnClose, btnCancel].forEach(b => {
        if (b && editorCard) {
            b.addEventListener('click', () => editorCard.style.display = 'none');
        }
    });

    db.ref('siteData/upcoming').on('value', (snap) => {
        const data = snap.val();
        cachedUpcoming = [];
        if (data) {
            cachedUpcoming = Array.isArray(data) ? data : Object.values(data);
        }
        if (badgeUpcoming) badgeUpcoming.textContent = cachedUpcoming.length;
        renderUpcomingList();
    });

    function renderUpcomingList() {
        if (!container) return;
        if (cachedUpcoming.length === 0) {
            container.innerHTML = `<div class="loading-state" style="color: var(--text-dim);">NO UPCOMING TEASERS CONFIGURED.</div>`;
            return;
        }

        container.innerHTML = cachedUpcoming.map((upc, i) => `
            <div class="admin-upcoming-card">
                <div class="rel-card-top">
                    <img src="${upc.cover || upc.image || 'assets/cover.png'}" alt="Teaser" class="rel-thumb" onerror="this.onerror=null; this.src='assets/cover.png';">
                    <div class="rel-meta">
                        <h4>${upc.title || 'UNTITLED TEASER'}</h4>
                        <div class="rel-artist">${upc.artist || upc.producers || 'UNKNOWN'}</div>
                        <div class="rel-code" style="color: var(--accent-yellow); font-weight: 600;">[ ${upc.status || 'COMING SOON'} ]</div>
                    </div>
                </div>
                <div class="rel-card-actions">
                    <button type="button" class="cyber-btn primary sm" onclick="editUpcoming(${i})">EDIT</button>
                    <button type="button" class="cyber-btn danger sm" onclick="deleteUpcoming(${i})">DELETE</button>
                </div>
            </div>
        `).join('');
    }

    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const index = parseInt(document.getElementById('upc_edit_index').value);
            const title = document.getElementById('upc_title').value.trim();
            const artist = document.getElementById('upc_artist').value.trim();

            if (!title || !artist) {
                showToast("PLEASE FILL IN TITLE AND ARTIST!", 'error');
                return;
            }

            const cover = document.getElementById('upc_cover').value.trim() || 'assets/cover.png';
            const item = {
                title: title,
                artist: artist,
                producers: artist,
                date: document.getElementById('upc_date').value.trim() || 'COMING SOON',
                status: document.getElementById('upc_status').value,
                cover: cover,
                image: cover
            };

            let updatedList = [...cachedUpcoming];
            if (index >= 0) {
                updatedList[index] = item;
            } else {
                updatedList.unshift(item);
            }

            db.ref('siteData/upcoming').set(updatedList).then(() => {
                bumpSiteVersion(`Updated Upcoming Teaser: ${title}`);
                showToast("UPCOMING TEASER SAVED!");
                if (editorCard) editorCard.style.display = 'none';
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
        });
    }

    window.editUpcoming = function(index) {
        const item = cachedUpcoming[index];
        if (!item || !editorCard) return;
        document.getElementById('upc_edit_index').value = index;
        document.getElementById('upcoming-editor-title').textContent = `EDIT TEASER: ${item.title}`;
        document.getElementById('upc_title').value = item.title || '';
        document.getElementById('upc_artist').value = item.artist || item.producers || '';
        document.getElementById('upc_date').value = item.date || '';
        document.getElementById('upc_status').value = item.status || 'COMING SOON';
        document.getElementById('upc_cover').value = item.cover || item.image || '';
        editorCard.style.display = 'block';
        editorCard.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteUpcoming = function(index) {
        if (!confirm("Delete this upcoming teaser?")) return;
        const updatedList = cachedUpcoming.filter((_, i) => i !== index);
        db.ref('siteData/upcoming').set(updatedList).then(() => {
            bumpSiteVersion("Deleted Upcoming Teaser");
            showToast("TEASER DELETED!");
        }).catch(err => showToast("ERROR: " + err.message, 'error'));
    };
}

// --- 5. GHOST PRODUCTION ENGINE (ALL OPTIONS & PRICING) ---
function initGhostProdEngine() {
    db.ref('siteData/globals').on('value', (snap) => {
        const data = snap.val() || {};
        const map = {
            site_ghostDesc: data.ghostDesc || "Request your custom sound in any style. Secure professional production for a flat fee.",
            site_ghostServiceTitle: data.ghostServiceTitle || "GHOST PRODUCTION",
            site_ghostTagline: data.ghostTagline || "EXCLUSIVE EVENT",
            site_ghostServiceDesc: data.ghostServiceDesc || "Submit your preferred musical style and vision to our portal. Our elite producers will craft a bespoke, professional track tailored specifically to your requirements.",
            site_ghostPrice30s: data.ghostPrice30s || "$10",
            site_ghostPrice1m: data.ghostPrice1m || "$30",
            site_ghostPriceVocals: data.ghostPriceVocals || "$50",
            site_ghostPriceCustom: data.ghostPriceCustom || "From $100",
            site_ghostAddonMix: data.ghostAddonMix || "+ $20",
            site_ghostFeature1: data.ghostFeature1 || "High-Quality WAV Files",
            site_ghostFeature2: data.ghostFeature2 || "24/7 Customer Service",
            site_ghostFeature3: data.ghostFeature3 || "3 Project Revisions",
            site_ghostAddonRevisions: data.ghostAddonRevisions || "+ $20",
            site_ghostDeliveryTitle: data.ghostDeliveryTitle || "DELIVERY",
            site_ghostDelivery3d: data.ghostDelivery3d || "+ $20",
            site_ghostDelivery5d: data.ghostDelivery5d || "+ $10",
            site_ghostSpecialTitle: data.ghostSpecialTitle || "SPECIAL OFFER: FULL TRACK",
            site_ghostSpecialDesc: data.ghostSpecialDesc || "1 Full Track, Any Style, Mixed & Mastered. MP3 + WAV + MIDI + STEMS + PROJECT FILE"
        };
        for (const [id, val] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        }
    });

    const btnSave = document.getElementById('save-ghost-prod');
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const updates = {
                ghostDesc: document.getElementById('site_ghostDesc').value,
                ghostServiceTitle: document.getElementById('site_ghostServiceTitle').value,
                ghostTagline: document.getElementById('site_ghostTagline').value,
                ghostServiceDesc: document.getElementById('site_ghostServiceDesc').value,
                ghostPrice30s: document.getElementById('site_ghostPrice30s').value,
                ghostPrice1m: document.getElementById('site_ghostPrice1m').value,
                ghostPriceVocals: document.getElementById('site_ghostPriceVocals').value,
                ghostPriceCustom: document.getElementById('site_ghostPriceCustom').value,
                ghostAddonMix: document.getElementById('site_ghostAddonMix').value,
                ghostFeature1: document.getElementById('site_ghostFeature1').value,
                ghostFeature2: document.getElementById('site_ghostFeature2').value,
                ghostFeature3: document.getElementById('site_ghostFeature3').value,
                ghostAddonRevisions: document.getElementById('site_ghostAddonRevisions').value,
                ghostDeliveryTitle: document.getElementById('site_ghostDeliveryTitle').value,
                ghostDelivery3d: document.getElementById('site_ghostDelivery3d').value,
                ghostDelivery5d: document.getElementById('site_ghostDelivery5d').value,
                ghostSpecialTitle: document.getElementById('site_ghostSpecialTitle').value,
                ghostSpecialDesc: document.getElementById('site_ghostSpecialDesc').value
            };
            db.ref('siteData/globals').update(updates).then(() => {
                bumpSiteVersion("Updated All Ghost Production Options");
                showToast("ALL GHOST PRODUCTION OPTIONS SAVED & SYNCED!");
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
        });
    }
}

// --- 6. PERSONNEL & PARTNERS ENGINE (WITH LOCAL IMAGE FILE UPLOAD / BROWSER) ---
function initStaffEngine() {
    const container = document.getElementById('staff-admin-container');
    const tabStaff = document.getElementById('tab-staff-view');
    const tabPartner = document.getElementById('tab-partner-view');
    const badgeStaff = document.getElementById('badge-staff-count');
    const btnAddProf = document.getElementById('btn-add-profile');
    const profEditor = document.getElementById('profile-editor-card');
    const btnCloseProf = document.getElementById('close-profile-editor');
    const btnCancelProf = document.getElementById('btn-cancel-profile');
    const btnSaveProf = document.getElementById('btn-save-profile');
    
    const avatarInput = document.getElementById('prof_avatar');
    const avatarFile = document.getElementById('prof_avatar_file');
    const avatarPreview = document.getElementById('prof-avatar-preview');

    const bannerInput = document.getElementById('prof_banner');
    const bannerFile = document.getElementById('prof_banner_file');
    const bannerPreview = document.getElementById('prof-banner-preview');

    // Local file browser for Avatar / DP
    if (avatarFile && avatarInput) {
        avatarFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                avatarInput.value = event.target.result;
                if (avatarPreview) avatarPreview.innerHTML = `<img src="${event.target.result}">`;
                showToast("AVATAR IMAGE LOADED FROM LOCAL MACHINE!");
            };
            reader.readAsDataURL(file);
        });
    }

    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('input', () => {
            const url = avatarInput.value.trim();
            avatarPreview.innerHTML = url ? `<img src="${url}">` : '<i class="fas fa-user"></i>';
        });
    }

    // Local file browser for Profile Banner
    if (bannerFile && bannerInput) {
        bannerFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                bannerInput.value = event.target.result;
                if (bannerPreview) bannerPreview.innerHTML = `<img src="${event.target.result}">`;
                showToast("BANNER IMAGE LOADED FROM LOCAL MACHINE!");
            };
            reader.readAsDataURL(file);
        });
    }

    if (bannerInput && bannerPreview) {
        bannerInput.addEventListener('input', () => {
            const url = bannerInput.value.trim();
            bannerPreview.innerHTML = url ? `<img src="${url}">` : '<i class="fas fa-image"></i>';
        });
    }

    if (tabStaff && tabPartner) {
        tabStaff.addEventListener('click', () => {
            currentStaffView = 'staff';
            tabStaff.classList.add('active');
            tabPartner.classList.remove('active');
            renderStaffProfiles();
        });
        tabPartner.addEventListener('click', () => {
            currentStaffView = 'partner';
            tabPartner.classList.add('active');
            tabStaff.classList.remove('active');
            renderStaffProfiles();
        });
    }

    // Add new profile button - RESET AND UNLOCK ID TEXTBOX
    if (btnAddProf && profEditor) {
        btnAddProf.addEventListener('click', () => {
            const isPartner = currentStaffView === 'partner';
            document.getElementById('prof_edit_id').value = '';
            document.getElementById('prof_is_partner').value = isPartner ? 'true' : 'false';
            document.getElementById('profile-editor-title').textContent = `CREATE NEW ${isPartner ? 'PARTNER' : 'STAFF'} PROFILE`;
            
            const profIdInput = document.getElementById('prof_id');
            if (profIdInput) {
                profIdInput.disabled = false; // UNLOCKED SO USER CAN TYPE NEW ID
                profIdInput.value = '';
                profIdInput.focus();
            }

            ['prof_name', 'prof_role', 'prof_avatar', 'prof_banner', 'prof_bio', 'prof_social_insta', 'prof_social_spotify', 'prof_social_soundcloud', 'prof_social_youtube', 'prof_social_twitter', 'prof_social_discord'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            if (avatarPreview) avatarPreview.innerHTML = '<i class="fas fa-user"></i>';
            if (bannerPreview) bannerPreview.innerHTML = '<i class="fas fa-image"></i>';
            document.getElementById('prof_order').value = '1';
            
            profEditor.style.display = 'block';
            profEditor.scrollIntoView({ behavior: 'smooth' });
        });
    }

    [btnCloseProf, btnCancelProf].forEach(b => {
        if (b && profEditor) {
            b.addEventListener('click', () => profEditor.style.display = 'none');
        }
    });

    db.ref('staff_status').on('value', (snap) => {
        cachedStaff = snap.val() || {};
        updateStaffCountBadge();
        if (currentStaffView === 'staff') renderStaffProfiles();
    });

    db.ref('partner_status').on('value', (snap) => {
        cachedPartners = snap.val() || {};
        updateStaffCountBadge();
        if (currentStaffView === 'partner') renderStaffProfiles();
    });

    function updateStaffCountBadge() {
        if (badgeStaff) {
            badgeStaff.textContent = Object.keys(cachedStaff).length + Object.keys(cachedPartners).length;
        }
    }

    function renderStaffProfiles() {
        if (!container) return;
        const isPartner = currentStaffView === 'partner';
        const dataObj = isPartner ? cachedPartners : cachedStaff;
        const entries = Object.entries(dataObj).sort((a, b) => {
            const orderA = (a[1] && typeof a[1].order === 'number') ? a[1].order : 99;
            const orderB = (b[1] && typeof b[1].order === 'number') ? b[1].order : 99;
            return orderA - orderB;
        });

        if (entries.length === 0) {
            container.innerHTML = `<div class="loading-state" style="color: var(--text-dim);">NO ${isPartner ? 'PARTNERS' : 'STAFF'} PROFILES FOUND. CLICK "ADD NEW PROFILE" TO CREATE ONE.</div>`;
            return;
        }

        container.innerHTML = entries.map(([id, p]) => {
            const avatar = p.avatar_url || p.logoUrl || 'assets/cover.png';
            return `
                <div class="staff-editor-card" data-id="${id}">
                    <div class="rel-card-top">
                        <img src="${avatar}" alt="Avatar" class="rel-thumb" onerror="this.onerror=null; this.src='assets/cover.png';">
                        <div class="rel-meta">
                            <h4>${p.name || id}</h4>
                            <div class="rel-artist">${p.role || (isPartner ? 'PARTNER' : 'STAFF')}</div>
                            <div class="rel-code">PRIORITY: #${p.order || 99} | ID: ${id}</div>
                        </div>
                    </div>
                    ${p.bio ? `<p style="font-size:0.75rem; color:var(--text-dim); line-height:1.4;">${p.bio}</p>` : ''}
                    
                    <div class="rel-card-actions">
                        <button type="button" class="cyber-btn primary sm" onclick="openProfileEditor('${id}', ${isPartner})">
                            <i class="fas fa-edit"></i> EDIT
                        </button>
                        <button type="button" class="cyber-btn danger sm" onclick="deleteProfile('${id}', ${isPartner})">
                            <i class="fas fa-trash"></i> DELETE
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    if (btnSaveProf) {
        btnSaveProf.addEventListener('click', () => {
            const isPartner = document.getElementById('prof_is_partner').value === 'true';
            const editId = document.getElementById('prof_edit_id').value.trim();
            const profId = editId || document.getElementById('prof_id').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
            const name = document.getElementById('prof_name').value.trim();
            const role = document.getElementById('prof_role').value.trim();

            if (!profId || !name) {
                showToast("PLEASE FILL IN PROFILE ID AND NAME!", 'error');
                return;
            }

            const socials = {};
            const insta = document.getElementById('prof_social_insta').value.trim();
            const spotify = document.getElementById('prof_social_spotify').value.trim();
            const soundcloud = document.getElementById('prof_social_soundcloud').value.trim();
            const youtube = document.getElementById('prof_social_youtube').value.trim();
            const twitter = document.getElementById('prof_social_twitter').value.trim();
            const discord = document.getElementById('prof_social_discord').value.trim();

            if (insta) socials.insta = insta;
            if (spotify) socials.spotify = spotify;
            if (soundcloud) socials.soundcloud = soundcloud;
            if (youtube) socials.youtube = youtube;
            if (twitter) socials.twitter = twitter;
            if (discord) socials.discord = discord;

            const avatarUrl = document.getElementById('prof_avatar').value.trim();
            const bannerUrl = document.getElementById('prof_banner').value.trim();

            const data = {
                name: name,
                role: role,
                order: parseInt(document.getElementById('prof_order').value) || 99,
                avatar_url: avatarUrl,
                logoUrl: avatarUrl,
                banner_url: bannerUrl,
                bannerUrl: bannerUrl,
                bio: document.getElementById('prof_bio').value.trim(),
                socials: socials
            };

            const path = isPartner ? 'partner_status/' : 'staff_status/';
            db.ref(path + profId).update(data).then(() => {
                bumpSiteVersion(`Saved Profile: ${name}`);
                showToast("PROFILE SAVED & SYNCHRONIZED!");
                if (profEditor) profEditor.style.display = 'none';
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
        });
    }

    window.openProfileEditor = function(id, isPartner) {
        const dataObj = isPartner ? cachedPartners : cachedStaff;
        const p = dataObj[id];
        if (!p || !profEditor) return;

        document.getElementById('prof_edit_id').value = id;
        document.getElementById('prof_is_partner').value = isPartner ? 'true' : 'false';
        document.getElementById('profile-editor-title').textContent = `EDIT PROFILE: ${p.name || id}`;
        
        const profIdInput = document.getElementById('prof_id');
        if (profIdInput) {
            profIdInput.value = id;
            profIdInput.disabled = true; // Key lock for existing
        }

        document.getElementById('prof_name').value = p.name || '';
        document.getElementById('prof_role').value = p.role || '';
        document.getElementById('prof_order').value = p.order || 99;
        
        const avUrl = p.avatar_url || p.logoUrl || '';
        document.getElementById('prof_avatar').value = avUrl;
        if (avatarPreview) avatarPreview.innerHTML = avUrl ? `<img src="${avUrl}">` : '<i class="fas fa-user"></i>';

        const bnUrl = p.banner_url || p.bannerUrl || '';
        document.getElementById('prof_banner').value = bnUrl;
        if (bannerPreview) bannerPreview.innerHTML = bnUrl ? `<img src="${bnUrl}">` : '<i class="fas fa-image"></i>';

        document.getElementById('prof_bio').value = p.bio || '';

        const socials = p.socials || {};
        document.getElementById('prof_social_insta').value = socials.insta || '';
        document.getElementById('prof_social_spotify').value = socials.spotify || '';
        document.getElementById('prof_social_soundcloud').value = socials.soundcloud || '';
        document.getElementById('prof_social_youtube').value = socials.youtube || '';
        document.getElementById('prof_social_twitter').value = socials.twitter || '';
        document.getElementById('prof_social_discord').value = socials.discord || '';

        profEditor.style.display = 'block';
        profEditor.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteProfile = function(id, isPartner) {
        if (!confirm(`Delete profile "${id}"?`)) return;
        const path = isPartner ? 'partner_status/' : 'staff_status/';
        db.ref(path + id).remove().then(() => {
            bumpSiteVersion(`Deleted Profile: ${id}`);
            showToast("PROFILE DELETED!");
        }).catch(err => showToast("ERROR: " + err.message, 'error'));
    };
}

// --- 7. DEMO SUBMISSIONS INBOX ENGINE (DUAL SYNC FOR ALL SUBMISSIONS) ---
function initDemosEngine() {
    const container = document.getElementById('demos-inbox-container');
    const badgeDemos = document.getElementById('badge-demos');
    const searchInput = document.getElementById('demo-search-input');
    const filterSelect = document.getElementById('demo-status-filter');
    const audioDock = document.getElementById('admin-audio-preview');
    const previewAudio = document.getElementById('admin-preview-audio');
    const dockTitle = document.getElementById('dock-track-title');
    const dockArtist = document.getElementById('dock-artist-name');
    const closeDockBtn = document.getElementById('close-dock-btn');

    if (closeDockBtn && audioDock && previewAudio) {
        closeDockBtn.addEventListener('click', () => {
            previewAudio.pause();
            audioDock.style.display = 'none';
        });
    }

    // Listen to both paths: 'siteData/submissions/demo' and 'demo_submissions'
    let demosA = {};
    let demosB = {};

    function updateDemos() {
        cachedDemos = { ...demosB, ...demosA };
        const count = Object.keys(cachedDemos).length;
        if (badgeDemos) badgeDemos.textContent = count;
        renderDemosList();
    }

    db.ref('siteData/submissions/demo').on('value', (snap) => {
        demosA = snap.val() || {};
        updateDemos();
    });

    db.ref('demo_submissions').on('value', (snap) => {
        demosB = snap.val() || {};
        updateDemos();
    });

    function renderDemosList() {
        if (!container) return;
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const filter = filterSelect ? filterSelect.value : 'ALL';
        const entries = Object.entries(cachedDemos).reverse(); // Newest first

        const filtered = entries.filter(([id, d]) => {
            const status = (d.status || 'PENDING').toUpperCase();
            if (filter !== 'ALL' && status !== filter) return false;
            if (!query) return true;
            return (d.artist || d.name || '').toLowerCase().includes(query) ||
                   (d.trackTitle || d.track || '').toLowerCase().includes(query) ||
                   (d.email || '').toLowerCase().includes(query) ||
                   (d.genre || '').toLowerCase().includes(query);
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div class="loading-state" style="color: var(--text-dim);">NO DEMO SUBMISSIONS MATCH CRITERIA.</div>`;
            return;
        }

        container.innerHTML = filtered.map(([id, d]) => {
            const status = (d.status || 'PENDING').toUpperCase();
            let statusClass = 'pending';
            if (status === 'ACCEPTED' || status === 'SIGNED') statusClass = 'accepted';
            if (status === 'REJECTED') statusClass = 'rejected';

            const streamLink = d.streamingLink || d.link || '';
            const isAudioStream = streamLink.endsWith('.mp3') || streamLink.endsWith('.wav') || streamLink.includes('snd.mp3');

            return `
                <div class="inbox-entry-card" data-demo-id="${id}">
                    <div class="inbox-top-row">
                        <div class="inbox-artist-info">
                            <h4>${d.trackTitle || d.track || 'UNTITLED TRACK'} <span style="font-size: 0.9rem; color: #fff; opacity: 0.8;">by ${d.artist || d.name || 'UNKNOWN'}</span></h4>
                            <span><i class="fas fa-envelope"></i> ${d.email || 'NO EMAIL'} | <i class="fas fa-music"></i> ${d.genre || 'ELECTRONIC'}</span>
                        </div>
                        <div class="inbox-tags">
                            <span class="status-badge ${statusClass}">${status}</span>
                            <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);">${d.timestamp ? new Date(d.timestamp).toLocaleDateString() : 'RECENT'}</span>
                        </div>
                    </div>

                    ${d.message ? `<div class="inbox-message-box">"${d.message}"</div>` : ''}

                    <div class="inbox-links-row">
                        ${streamLink ? `
                            <a href="${streamLink}" target="_blank" class="inbox-link-btn">
                                <i class="fas fa-external-link-alt"></i> OPEN DEMO LINK
                            </a>
                        ` : ''}
                        ${isAudioStream ? `
                            <button type="button" class="inbox-link-btn" onclick="playAudioPreview('${streamLink}', '${d.trackTitle || d.track || 'DEMO'}', '${d.artist || d.name || 'ARTIST'}')">
                                <i class="fas fa-play"></i> PREVIEW AUDIO
                            </button>
                        ` : ''}
                        
                        <!-- Status Actions -->
                        <button type="button" class="cyber-btn primary sm" onclick="updateDemoStatus('${id}', 'ACCEPTED')">
                            <i class="fas fa-check"></i> ACCEPT
                        </button>
                        <button type="button" class="cyber-btn secondary sm" onclick="updateDemoStatus('${id}', 'PENDING')">
                            <i class="fas fa-clock"></i> PENDING
                        </button>
                        <button type="button" class="cyber-btn danger sm" onclick="updateDemoStatus('${id}', 'REJECTED')">
                            <i class="fas fa-times"></i> REJECT
                        </button>
                        <button type="button" class="cyber-btn danger sm" onclick="deleteDemoSubmission('${id}')">
                            <i class="fas fa-trash"></i> DELETE
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    if (searchInput) searchInput.addEventListener('input', renderDemosList);
    if (filterSelect) filterSelect.addEventListener('change', renderDemosList);

    window.playAudioPreview = function(url, title, artist) {
        if (!audioDock || !previewAudio) return;
        dockTitle.textContent = title;
        dockArtist.textContent = artist;
        previewAudio.src = url;
        audioDock.style.display = 'flex';
        previewAudio.play().catch(e => console.log("Preview play blocked", e));
    };

    window.updateDemoStatus = function(id, status) {
        // Update both paths
        db.ref('siteData/submissions/demo/' + id).update({ status: status });
        db.ref('demo_submissions/' + id).update({ status: status }).then(() => {
            showToast(`STATUS UPDATED: ${status}`);
        }).catch(err => showToast("ERROR: " + err.message, 'error'));
    };

    window.deleteDemoSubmission = function(id) {
        if (!confirm("Permanently delete this demo submission record?")) return;
        db.ref('siteData/submissions/demo/' + id).remove();
        db.ref('demo_submissions/' + id).remove().then(() => {
            showToast("SUBMISSION DELETED!");
        }).catch(err => showToast("ERROR: " + err.message, 'error'));
    };
}

// --- 8. CONTACT MESSAGES INBOX ENGINE (DUAL SYNC FOR ALL CONTACTS) ---
function initContactEngine() {
    const container = document.getElementById('contact-inbox-container');
    const badgeContact = document.getElementById('badge-contact-msg');
    const btnRefresh = document.getElementById('btn-refresh-contact-msg');

    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            showToast("REFRESHING MESSAGES...");
        });
    }

    let contactsA = {};
    let contactsB = {};

    function updateContacts() {
        cachedContacts = { ...contactsB, ...contactsA };
        const count = Object.keys(cachedContacts).length;
        if (badgeContact) badgeContact.textContent = count;
        renderContactMessages();
    }

    db.ref('siteData/submissions/contact').on('value', (snap) => {
        contactsA = snap.val() || {};
        updateContacts();
    });

    db.ref('contact_messages').on('value', (snap) => {
        contactsB = snap.val() || {};
        updateContacts();
    });

    function renderContactMessages() {
        if (!container) return;
        const entries = Object.entries(cachedContacts).reverse();

        if (entries.length === 0) {
            container.innerHTML = `<div class="loading-state" style="color: var(--text-dim);">NO DIRECT INQUIRIES LOGGED.</div>`;
            return;
        }

        container.innerHTML = entries.map(([id, m]) => `
            <div class="inbox-entry-card">
                <div class="inbox-top-row">
                    <div class="inbox-artist-info">
                        <h4>${m.name || 'ANONYMOUS SENDER'} <span style="font-size: 0.85rem; color: var(--primary);">&lt;${m.email || 'N/A'}&gt;</span></h4>
                        <span>TOPIC / SUBJECT: <strong>${m.subject || 'GENERAL INQUIRY'}</strong></span>
                    </div>
                    <div class="inbox-tags">
                        <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);">${m.timestamp ? new Date(m.timestamp).toLocaleString() : 'RECENT'}</span>
                    </div>
                </div>
                <div class="inbox-message-box">"${m.message || ''}"</div>
                <div class="inbox-links-row">
                    <a href="mailto:${m.email}?subject=RE: ${encodeURIComponent(m.subject || 'Obscura Record Inquiry')}" class="cyber-btn primary sm">
                        <i class="fas fa-reply"></i> REPLY VIA EMAIL
                    </a>
                    <button type="button" class="cyber-btn danger sm" onclick="deleteContactMsg('${id}')">
                        <i class="fas fa-trash"></i> DELETE
                    </button>
                </div>
            </div>
        `).join('');
    }

    window.deleteContactMsg = function(id) {
        if (!confirm("Delete this contact message?")) return;
        db.ref('siteData/submissions/contact/' + id).remove();
        db.ref('contact_messages/' + id).remove().then(() => {
            showToast("MESSAGE REMOVED!");
        }).catch(err => showToast("ERROR: " + err.message, 'error'));
    };
}

// --- 9. MODALS, FAQ & FOOTER ENGINE ---
function initModalsEngine() {
    const faqContainer = document.getElementById('faq-admin-container');
    const btnAddFaq = document.getElementById('btn-add-faq-item');
    const btnSaveModals = document.getElementById('save-modals-text');

    db.ref('siteData/globals').on('value', (snap) => {
        const data = snap.val() || {};
        
        const map = {
            site_footerCopyright: data.footerCopyright || "&copy; 2026 OBSCURA RECORD. ALL RIGHTS RESERVED.",
            site_footerFaqText: data.footerFaqText || "FAQ",
            site_footerDemoText: data.footerDemoText || "DEMO SUBMISSION",
            site_footerContactText: data.footerContactText || "CONTACT US",
            site_footerPrivacyText: data.footerPrivacyText || "PRIVACY",
            site_formRule1Title: data.formRule1Title || "Is this track unreleased?",
            site_formRule1Desc: data.formRule1Desc || "We do NOT accept already-released tracks. Any submissions that have already been published will be automatically declined.",
            site_formRule2Title: data.formRule2Title || "Track identification",
            site_formRule2Desc: data.formRule2Desc || "Please provide the title for your track. If you haven't decided on a name yet, a reference title is sufficient so we can identify your submission.",
            site_formSubmitBtn: data.formSubmitBtn || "Initiate Submission",
            site_formDiscordBtn: data.formDiscordBtn || "Join Discord",
            site_formFooterRec: data.formFooterRec || "[ Highly Recommended: Join the server for real-time frequency tracking ]",
            site_contactModalSubtext: data.contactModalSubtext || "Establish a direct frequency with the Obscura Record command center.",
            site_privacyContent: data.privacyContent || "At OBSCURA RECORD, we value the privacy and intellectual property of our artists and visitors..."
        };

        for (const [id, val] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        }
    });

    db.ref('siteData/modals/faqs').on('value', (snap) => {
        const data = snap.val();
        cachedFAQs = (data && Array.isArray(data)) ? data : [
            { q: "HOW DO I SUBMIT A DEMO?", a: "Transmit your unreleased master tracks through the Send Demo button." },
            { q: "WHAT GENRES DOES OBSCURA ACCEPT?", a: "We specialize in futuristic electronic, phonk, funk, and cyberpunk soundscapes." }
        ];
        renderFaqItems();
    });

    function renderFaqItems() {
        if (!faqContainer) return;
        faqContainer.innerHTML = cachedFAQs.map((item, i) => `
            <div class="form-grid" style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-dim); padding-bottom: 1.2rem;" data-faq-index="${i}">
                <div class="input-group full">
                    <label>QUESTION #${i + 1}</label>
                    <input type="text" class="faq-q-input" value="${item.q || item.question || ''}">
                </div>
                <div class="input-group full">
                    <label>ANSWER #${i + 1}</label>
                    <textarea class="faq-a-input" rows="2">${item.a || item.answer || ''}</textarea>
                </div>
                <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end;">
                    <button type="button" class="cyber-btn danger sm" onclick="removeFaqItem(${i})"><i class="fas fa-trash"></i> REMOVE FAQ</button>
                </div>
            </div>
        `).join('');
    }

    if (btnAddFaq) {
        btnAddFaq.addEventListener('click', () => {
            cachedFAQs.push({ q: "NEW QUESTION", a: "Answer transmission payload..." });
            renderFaqItems();
        });
    }

    window.removeFaqItem = function(index) {
        cachedFAQs.splice(index, 1);
        renderFaqItems();
    };

    if (btnSaveModals) {
        btnSaveModals.addEventListener('click', () => {
            const qInputs = document.querySelectorAll('.faq-q-input');
            const aInputs = document.querySelectorAll('.faq-a-input');
            const newFaqs = [];
            qInputs.forEach((qIn, i) => {
                const aIn = aInputs[i];
                if (qIn && aIn) {
                    newFaqs.push({
                        q: qIn.value.trim(),
                        question: qIn.value.trim(),
                        a: aIn.value.trim(),
                        answer: aIn.value.trim()
                    });
                }
            });

            const updates = {
                footerCopyright: document.getElementById('site_footerCopyright').value,
                footerFaqText: document.getElementById('site_footerFaqText').value,
                footerDemoText: document.getElementById('site_footerDemoText').value,
                footerContactText: document.getElementById('site_footerContactText').value,
                footerPrivacyText: document.getElementById('site_footerPrivacyText').value,
                formRule1Title: document.getElementById('site_formRule1Title').value,
                formRule1Desc: document.getElementById('site_formRule1Desc').value,
                formRule2Title: document.getElementById('site_formRule2Title').value,
                formRule2Desc: document.getElementById('site_formRule2Desc').value,
                formSubmitBtn: document.getElementById('site_formSubmitBtn').value,
                formDiscordBtn: document.getElementById('site_formDiscordBtn').value,
                formFooterRec: document.getElementById('site_formFooterRec').value,
                contactModalSubtext: document.getElementById('site_contactModalSubtext').value,
                privacyContent: document.getElementById('site_privacyContent').value
            };

            db.ref('siteData/globals').update(updates);
            db.ref('siteData/modals/faqs').set(newFaqs).then(() => {
                bumpSiteVersion("Updated Modals, FAQ & Footer Options");
                showToast("MODALS, FAQ & FOOTER SYNCHRONIZED!");
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
        });
    }
}

// --- 10. SECURITY & AUDIT LOGS ENGINE ---
function initSecurityLogsEngine() {
    const logsContainer = document.getElementById('security-logs-container');
    if (!logsContainer) return;

    db.ref('security_logs').limitToLast(25).on('value', (snap) => {
        const logs = snap.val();
        if (!logs) return;
        const entries = Object.values(logs).reverse();

        logsContainer.innerHTML = entries.map(l => `
            <div class="log-entry">
                <span class="log-time">[${new Date(l.timestamp).toLocaleTimeString()}]</span>
                <strong style="color: var(--primary);">${l.action}</strong>
                <span style="color: var(--text-muted); font-size: 0.7rem;">(by ${l.user || 'ADMIN'})</span>
            </div>
        `).join('');
    });
}
