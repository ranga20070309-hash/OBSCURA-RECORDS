// OBSCURA RECORD // CORE DIRECTIVE COMMAND DECK ENGINE (v5.0)
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

// Auto-Versioning (Cache Buster)
function bumpSiteVersion() {
    db.ref('siteData/globals/v').transaction((v) => {
        const nextV = (parseFloat(v || 1.0) + 0.1).toFixed(1);
        const display = document.getElementById('display-v');
        if (display) display.textContent = nextV;
        return nextV;
    });
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

let engineInitialized = false;

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

// Auto-check session on load
window.addEventListener('DOMContentLoaded', () => {
    initLoginStarfield();
});

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
        'staff-panel': { title: '<i class="fas fa-users-cog"></i> PERSONNEL & COLLABORATOR PROFILES', desc: 'Custom avatars, biographies, sort order, and social platforms for personnel.' },
        'demo-inbox-panel': { title: '<i class="fas fa-inbox"></i> DEMO SUBMISSIONS INBOX', desc: 'Review, stream, analyze link security, and tag artist demo transmissions.' },
        'contact-inbox-panel': { title: '<i class="fas fa-envelope-open-text"></i> CONTACT INQUIRIES', desc: 'Direct communications submitted via the public contact portal.' },
        'modals-panel': { title: '<i class="fas fa-window-restore"></i> MODALS, FAQ & POLICIES', desc: 'Interactive FAQ question/answers accordion and legal policy editor.' },
        'security-panel': { title: '<i class="fas fa-shield-virus"></i> SECURITY & SYSTEM AUDIT', desc: 'Real-time database connection telemetry and administrative logs.' }
    };

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.target;
            if (!target) return; // For external links like StreetX
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

        // Populate fields
        const map = {
            site_siteTitle: data.siteTitle || "OBSCURA <span>RECORD</span>",
            site_heroTitle: data.heroTitle || "WELCOME TO <span class='accent'>OBSCURA RECORD</span>",
            site_heroDesc: data.heroDesc || "",
            site_archiveTitle: data.archiveTitle || "LABEL <span class='accent'>RELEASES</span>",
            site_archiveDesc: data.archiveDesc || "",
            site_staffTitle: data.staffTitle || "OBSCURA <span class='accent'>STAFF</span>",
            site_staffDesc: data.staffDesc || "",
            site_partnersTitle: data.partnersTitle || "LABEL <span class='accent'>PARTNERS</span>",
            site_partnersDesc: data.partnersDesc || "",
            site_maintenanceMode: data.maintenanceMode || "Disabled",
            security_rootKey: data.rootKey || "ORC ADMINS PASS 2026",
            site_maintenanceTitle: data.maintenanceTitle || "OBSCURA RECORD // UNDER RENOVATION",
            site_maintenanceMsg: data.maintenanceMsg || "Quantum upgrades in progress.",
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
                bumpSiteVersion();
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
                bumpSiteVersion();
                showToast("NAVIGATION & SOCIAL LINKS SYNCHRONIZED!");
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
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
            coverPreview.innerHTML = url ? `<img src="${url}" onerror="this.src=''; this.parentElement.innerHTML='<i class=\\'fas fa-image\\'></i>'">` : '<i class="fas fa-image"></i>';
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
            if (!query) return true;
            return (r.title || '').toLowerCase().includes(query) ||
                   (r.artist || '').toLowerCase().includes(query) ||
                   (r.catalog || '').toLowerCase().includes(query);
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div class="loading-state" style="color: var(--text-dim);">NO RELEASES FOUND.</div>`;
            return;
        }

        container.innerHTML = filtered.map((rel, i) => {
            const actualIndex = cachedReleases.indexOf(rel);
            const cover = rel.cover || 'assets/cover.png';
            return `
                <div class="admin-release-card">
                    <div class="rel-card-top">
                        <img src="${cover}" alt="Artwork" class="rel-thumb" onerror="this.onerror=null; this.src='assets/OCR.png';">
                        <div class="rel-meta">
                            <h4>${rel.title || 'UNTITLED'}</h4>
                            <div class="rel-artist">${rel.artist || 'UNKNOWN ARTIST'}</div>
                            <div class="rel-code">${rel.catalog || 'OCR---'} | ${rel.date || 'TBA'}</div>
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

            const item = {
                title: title,
                artist: artist,
                catalog: document.getElementById('rel_catalog').value.trim() || 'OCR000',
                date: document.getElementById('rel_date').value.trim() || '2026',
                cover: document.getElementById('rel_cover').value.trim() || 'OCR.png',
                streamUrl: document.getElementById('rel_streamUrl').value.trim(),
                spotifyUrl: document.getElementById('rel_spotifyUrl').value.trim(),
                soundcloudUrl: document.getElementById('rel_soundcloudUrl').value.trim(),
                appleUrl: document.getElementById('rel_appleUrl').value.trim(),
                dlUrl: document.getElementById('rel_dlUrl').value.trim()
            };

            let updatedList = [...cachedReleases];
            if (index >= 0) {
                updatedList[index] = item;
            } else {
                updatedList.unshift(item); // Add to top
            }

            db.ref('siteData/releases').set(updatedList).then(() => {
                bumpSiteVersion();
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
        document.getElementById('rel_artist').value = rel.artist || '';
        document.getElementById('rel_catalog').value = rel.catalog || '';
        document.getElementById('rel_date').value = rel.date || '';
        document.getElementById('rel_cover').value = rel.cover || '';
        document.getElementById('rel_streamUrl').value = rel.streamUrl || '';
        document.getElementById('rel_spotifyUrl').value = rel.spotifyUrl || '';
        document.getElementById('rel_soundcloudUrl').value = rel.soundcloudUrl || '';
        document.getElementById('rel_appleUrl').value = rel.appleUrl || '';
        document.getElementById('rel_dlUrl').value = rel.dlUrl || '';

        if (coverPreview) {
            coverPreview.innerHTML = rel.cover ? `<img src="${rel.cover}">` : '<i class="fas fa-image"></i>';
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
            bumpSiteVersion();
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
                    <img src="${upc.cover || 'assets/OCR.png'}" alt="Teaser" class="rel-thumb" onerror="this.onerror=null; this.src='assets/OCR.png';">
                    <div class="rel-meta">
                        <h4>${upc.title || 'UNTITLED TEASER'}</h4>
                        <div class="rel-artist">${upc.artist || 'UNKNOWN'}</div>
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

            const item = {
                title: title,
                artist: artist,
                date: document.getElementById('upc_date').value.trim() || 'COMING SOON',
                status: document.getElementById('upc_status').value,
                cover: document.getElementById('upc_cover').value.trim() || 'OCR.png'
            };

            let updatedList = [...cachedUpcoming];
            if (index >= 0) {
                updatedList[index] = item;
            } else {
                updatedList.unshift(item);
            }

            db.ref('siteData/upcoming').set(updatedList).then(() => {
                bumpSiteVersion();
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
        document.getElementById('upc_artist').value = item.artist || '';
        document.getElementById('upc_date').value = item.date || '';
        document.getElementById('upc_status').value = item.status || 'COMING SOON';
        document.getElementById('upc_cover').value = item.cover || '';
        editorCard.style.display = 'block';
        editorCard.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteUpcoming = function(index) {
        if (!confirm("Delete this upcoming teaser?")) return;
        const updatedList = cachedUpcoming.filter((_, i) => i !== index);
        db.ref('siteData/upcoming').set(updatedList).then(() => {
            bumpSiteVersion();
            showToast("TEASER DELETED!");
        }).catch(err => showToast("ERROR: " + err.message, 'error'));
    };
}

// --- 5. GHOST PRODUCTION ENGINE ---
function initGhostProdEngine() {
    db.ref('siteData/ghostProduction').on('value', (snap) => {
        const data = snap.val() || {};
        const map = {
            site_ghostTitle: data.title || "GHOST <span class='accent'>PRODUCTION</span>",
            site_ghostPrice: data.price || "STARTING AT $299",
            site_ghostDesc: data.desc || "Premium, uncredited, industry-standard electronic music production.",
            site_ghostTurnaround: data.turnaround || "7-14 DAYS ESTIMATED DELIVERY",
            site_ghostCta: data.cta || "REQUEST CUSTOM TRACK"
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
                title: document.getElementById('site_ghostTitle').value,
                price: document.getElementById('site_ghostPrice').value,
                desc: document.getElementById('site_ghostDesc').value,
                turnaround: document.getElementById('site_ghostTurnaround').value,
                cta: document.getElementById('site_ghostCta').value
            };
            db.ref('siteData/ghostProduction').update(updates).then(() => {
                bumpSiteVersion();
                showToast("GHOST PRODUCTION DIRECTIVES SAVED!");
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
        });
    }
}

// --- 6. PERSONNEL & PARTNERS ENGINE ---
function initStaffEngine() {
    const container = document.getElementById('staff-admin-container');
    const tabStaff = document.getElementById('tab-staff-view');
    const tabPartner = document.getElementById('tab-partner-view');

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

    db.ref('staff_status').on('value', (snap) => {
        cachedStaff = snap.val() || {};
        if (currentStaffView === 'staff') renderStaffProfiles();
    });

    db.ref('partner_status').on('value', (snap) => {
        cachedPartners = snap.val() || {};
        if (currentStaffView === 'partner') renderStaffProfiles();
    });

    function renderStaffProfiles() {
        if (!container) return;
        const isPartner = currentStaffView === 'partner';
        const dataObj = isPartner ? cachedPartners : cachedStaff;
        const entries = Object.entries(dataObj);

        if (entries.length === 0) {
            container.innerHTML = `<div class="loading-state" style="color: var(--text-dim);">NO ${isPartner ? 'PARTNERS' : 'STAFF'} PROFILES FOUND.</div>`;
            return;
        }

        container.innerHTML = entries.map(([id, p]) => {
            const avatar = p.avatar_url || 'assets/OCR.png';
            const socials = p.socials || {};
            return `
                <div class="staff-editor-card" data-id="${id}" data-type="${isPartner ? 'partner' : 'staff'}">
                    <div class="rel-card-top">
                        <img src="${avatar}" alt="Avatar" class="rel-thumb" onerror="this.onerror=null; this.src='assets/OCR.png';">
                        <div class="rel-meta">
                            <h4>${p.name || id}</h4>
                            <div class="rel-artist">${p.role || (isPartner ? 'PARTNER' : 'STAFF MEMBER')}</div>
                            <div class="rel-code">ID: ${id}</div>
                        </div>
                    </div>
                    <div class="form-grid" style="grid-template-columns: 1fr; gap: 0.8rem;">
                        <div class="input-group">
                            <label>CUSTOM AVATAR URL</label>
                            <input type="text" class="st-avatar" value="${p.avatar_url || ''}" placeholder="https://i.imgur.com/...">
                        </div>
                        <div class="input-group">
                            <label>BIOGRAPHY / DESCRIPTION</label>
                            <textarea class="st-bio" rows="2">${p.bio || ''}</textarea>
                        </div>
                        <div class="input-group">
                            <label>SORT PRIORITY (1 = HIGHEST)</label>
                            <input type="number" class="st-order" value="${p.order || 99}">
                        </div>
                        <div class="input-group">
                            <label>INSTAGRAM PROFILE</label>
                            <input type="text" class="st-social-insta" value="${socials.insta || ''}" placeholder="https://instagram.com/...">
                        </div>
                        <div class="input-group">
                            <label>SPOTIFY PROFILE</label>
                            <input type="text" class="st-social-spotify" value="${socials.spotify || ''}" placeholder="https://spotify.com/...">
                        </div>
                    </div>
                    <button type="button" class="cyber-btn primary sm" onclick="saveStaffProfile('${id}', ${isPartner})">
                        <i class="fas fa-save"></i> SYNC PROFILE
                    </button>
                </div>
            `;
        }).join('');
    }

    window.saveStaffProfile = function(id, isPartner) {
        const card = document.querySelector(`.staff-editor-card[data-id="${id}"]`);
        if (!card) return;

        const avatar = card.querySelector('.st-avatar').value.trim();
        const bio = card.querySelector('.st-bio').value.trim();
        const order = parseInt(card.querySelector('.st-order').value) || 99;
        const insta = card.querySelector('.st-social-insta').value.trim();
        const spotify = card.querySelector('.st-social-spotify').value.trim();

        const data = {
            avatar_url: avatar,
            bio: bio,
            order: order,
            socials: {
                insta: insta,
                spotify: spotify
            }
        };

        const path = isPartner ? 'partner_status/' : 'staff_status/';
        db.ref(path + id).update(data).then(() => {
            bumpSiteVersion();
            showToast("PROFILE SYNCED SUCCESSFULLY!");
        }).catch(err => showToast("ERROR: " + err.message, 'error'));
    };
}

// --- 7. DEMO SUBMISSIONS INBOX ENGINE ---
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

    db.ref('demo_submissions').on('value', (snap) => {
        cachedDemos = snap.val() || {};
        const count = Object.keys(cachedDemos).length;
        if (badgeDemos) badgeDemos.textContent = count;
        renderDemosList();
    });

    function renderDemosList() {
        if (!container) return;
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const filter = filterSelect ? filterSelect.value : 'ALL';
        const entries = Object.entries(cachedDemos);

        const filtered = entries.filter(([id, d]) => {
            const status = (d.status || 'PENDING').toUpperCase();
            if (filter !== 'ALL' && status !== filter) return false;
            if (!query) return true;
            return (d.artist || '').toLowerCase().includes(query) ||
                   (d.trackTitle || '').toLowerCase().includes(query) ||
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
                            <h4>${d.trackTitle || 'UNTITLED TRACK'} <span style="font-size: 0.9rem; color: #fff; opacity: 0.8;">by ${d.artist || d.name || 'UNKNOWN'}</span></h4>
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
                            <button type="button" class="inbox-link-btn" onclick="playAudioPreview('${streamLink}', '${d.trackTitle || 'DEMO'}', '${d.artist || 'ARTIST'}')">
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
        db.ref('demo_submissions/' + id).update({ status: status }).then(() => {
            showToast(`STATUS UPDATED: ${status}`);
        }).catch(err => showToast("ERROR: " + err.message, 'error'));
    };

    window.deleteDemoSubmission = function(id) {
        if (!confirm("Permanently delete this demo submission record?")) return;
        db.ref('demo_submissions/' + id).remove().then(() => {
            showToast("SUBMISSION DELETED!");
        }).catch(err => showToast("ERROR: " + err.message, 'error'));
    };
}

// --- 8. CONTACT MESSAGES INBOX ENGINE ---
function initContactEngine() {
    const container = document.getElementById('contact-inbox-container');
    const badgeContact = document.getElementById('badge-contact-msg');
    const btnRefresh = document.getElementById('btn-refresh-contact-msg');

    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            showToast("REFRESHING MESSAGES...");
        });
    }

    db.ref('contact_messages').on('value', (snap) => {
        cachedContacts = snap.val() || {};
        const count = Object.keys(cachedContacts).length;
        if (badgeContact) badgeContact.textContent = count;
        renderContactMessages();
    });

    function renderContactMessages() {
        if (!container) return;
        const entries = Object.entries(cachedContacts);

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
        db.ref('contact_messages/' + id).remove().then(() => {
            showToast("MESSAGE REMOVED!");
        }).catch(err => showToast("ERROR: " + err.message, 'error'));
    };
}

// --- 9. MODALS, FAQ & LEGAL POLICIES ENGINE ---
function initModalsEngine() {
    const faqContainer = document.getElementById('faq-admin-container');
    const btnAddFaq = document.getElementById('btn-add-faq-item');
    const btnSaveModals = document.getElementById('save-modals-text');

    db.ref('siteData/modals').on('value', (snap) => {
        const data = snap.val() || {};
        cachedFAQs = data.faqs || [
            { q: "HOW DO I SUBMIT A DEMO?", a: "Transmit your unreleased master tracks through the Send Demo button." },
            { q: "WHAT GENRES DOES OBSCURA ACCEPT?", a: "We specialize in futuristic electronic, phonk, funk, and cyberpunk soundscapes." }
        ];

        const demoDescEl = document.getElementById('site_demoDesc');
        if (demoDescEl && data.demoDesc) demoDescEl.value = data.demoDesc;

        const privacyEl = document.getElementById('site_privacyContent');
        if (privacyEl && data.privacyContent) privacyEl.value = data.privacyContent;

        renderFaqItems();
    });

    function renderFaqItems() {
        if (!faqContainer) return;
        faqContainer.innerHTML = cachedFAQs.map((item, i) => `
            <div class="form-grid" style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-dim); padding-bottom: 1.2rem;" data-faq-index="${i}">
                <div class="input-group full">
                    <label>QUESTION #${i + 1}</label>
                    <input type="text" class="faq-q-input" value="${item.q || ''}">
                </div>
                <div class="input-group full">
                    <label>ANSWER #${i + 1}</label>
                    <textarea class="faq-a-input" rows="2">${item.a || ''}</textarea>
                </div>
                <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end;">
                    <button type="button" class="cyber-btn danger sm" onclick="removeFaqItem(${i})"><i class="fas fa-trash"></i> REMOVE FAQ</button>
                </div>
            </div>
        `).join('');
    }

    if (btnAddFaq) {
        btnAddFaq.addEventListener('click', () => {
            cachedFAQs.push({ q: "NEW QUESTION", a: "Answer payload..." });
            renderFaqItems();
        });
    }

    window.removeFaqItem = function(index) {
        cachedFAQs.splice(index, 1);
        renderFaqItems();
    };

    if (btnSaveModals) {
        btnSaveModals.addEventListener('click', () => {
            // Gather FAQs
            const qInputs = document.querySelectorAll('.faq-q-input');
            const aInputs = document.querySelectorAll('.faq-a-input');
            const newFaqs = [];
            qInputs.forEach((qIn, i) => {
                const aIn = aInputs[i];
                if (qIn && aIn) {
                    newFaqs.push({
                        q: qIn.value.trim(),
                        a: aIn.value.trim()
                    });
                }
            });

            const updates = {
                faqs: newFaqs,
                demoDesc: document.getElementById('site_demoDesc').value,
                privacyContent: document.getElementById('site_privacyContent').value
            };

            db.ref('siteData/modals').set(updates).then(() => {
                bumpSiteVersion();
                showToast("MODALS & FAQ ACCORDION SAVED!");
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
        });
    }
}
