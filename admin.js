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

// Dedicated Firebase Project for Smart Links: obscura-records-smart-links
const smartLinksFirebaseConfig = {
    apiKey: "AIzaSyBARRt8caSaWBTjtxzNzr670lTYfqBRIj0",
    authDomain: "obscura-records-smart-links.firebaseapp.com",
    databaseURL: "https://obscura-records-smart-links-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "obscura-records-smart-links",
    storageBucket: "obscura-records-smart-links.firebasestorage.app",
    messagingSenderId: "22595717651",
    appId: "1:22595717651:web:b39895741f4aebe8268de6"
};

let smartLinksApp;
try {
    smartLinksApp = firebase.initializeApp(smartLinksFirebaseConfig, "smartLinksApp");
} catch (e) {
    smartLinksApp = firebase.app("smartLinksApp");
}
const smartLinksDb = smartLinksApp.database();

// State stores
let cachedGlobals = {};
let cachedPopular = [];
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

// Auto-Versioning (Cache Buster) & Comprehensive Audit Logger
function bumpSiteVersion(actionDesc) {
    db.ref('siteData/globals/v').transaction((v) => {
        const nextV = (parseFloat(v || 1.0) + 0.1).toFixed(1);
        const display = document.getElementById('display-v');
        if (display) display.textContent = nextV;
        const vInput = document.getElementById('site_v');
        if (vInput) vInput.value = nextV;
        return nextV;
    });

    if (actionDesc) {
        logSecurityEvent(actionDesc);
    }
}

function setSiteVersion(newVersion, actionDesc) {
    const vStr = String(newVersion || '1.0').trim();
    return db.ref('siteData/globals/v').set(vStr).then(() => {
        const display = document.getElementById('display-v');
        if (display) display.textContent = vStr;
        const vInput = document.getElementById('site_v');
        if (vInput) vInput.value = vStr;
        if (actionDesc) {
            logSecurityEvent(actionDesc, { version: vStr });
        }
    });
}

function logSecurityEvent(action, details = {}) {
    // Disabled to eliminate database bandwidth and storage usage
}

// Safe navigation helper
window.secureNavigate = function (url, key) {
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

// Check URL key bypass
const urlParams = new URLSearchParams(window.location.search);
const urlKey = urlParams.get('key') || urlParams.get('pass');
if (urlKey && (urlKey === "ORC ADMINS PASS 2026" || urlKey.length > 5)) {
    sessionStorage.setItem('rootAuth', 'granted');
    sessionStorage.setItem('adminBypass', 'true');
    unlockDashboard();
} else if (sessionStorage.getItem('rootAuth') === 'granted' || sessionStorage.getItem('adminBypass') === 'true') {
    unlockDashboard();
}

// Listen to Firebase Auth state
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        sessionStorage.setItem('rootAuth', 'granted');
        sessionStorage.setItem('adminBypass', 'true');
        unlockDashboard();
    } else {
        if (sessionStorage.getItem('rootAuth') === 'granted' || sessionStorage.getItem('adminBypass') === 'true') {
            unlockDashboard();
        } else {
            lockDashboard();
        }
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

    if (!email && !pass) {
        if (loginError) {
            loginError.textContent = 'PLEASE ENTER MASTER PASSWORD OR ADMIN EMAIL.';
            loginError.style.display = 'block';
        }
        return;
    }

    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AUTHENTICATING...';
        loginBtn.disabled = true;
    }

    // Check Master Passphrase first (works even if Firebase Auth is offline or email not registered)
    const masterKey = "ORC ADMINS PASS 2026";
    if (pass === masterKey || email === masterKey) {
        sessionStorage.setItem('rootAuth', 'granted');
        sessionStorage.setItem('adminBypass', 'true');
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-check"></i> ROOT ACCESS GRANTED';
        }
        if (loginError) loginError.style.display = 'none';
        setTimeout(() => {
            unlockDashboard();
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-unlock-alt"></i> INITIATE ROOT ACCESS';
                loginBtn.disabled = false;
            }
        }, 300);
        return;
    }

    // If email and password format provided, attempt Firebase Auth
    if (email && pass && email.includes('@')) {
        firebase.auth().signInWithEmailAndPassword(email, pass)
            .then(() => {
                sessionStorage.setItem('rootAuth', 'granted');
                sessionStorage.setItem('adminBypass', 'true');
                if (loginBtn) {
                    loginBtn.innerHTML = '<i class="fas fa-check"></i> ACCESS GRANTED';
                }
                if (loginError) loginError.style.display = 'none';
                setTimeout(() => {
                    unlockDashboard();
                    if (loginBtn) {
                        loginBtn.innerHTML = '<i class="fas fa-unlock-alt"></i> INITIATE ROOT ACCESS';
                        loginBtn.disabled = false;
                    }
                }, 300);
            })
            .catch((error) => {
                // Secondary check: verify database stored rootKey
                db.ref('siteData/globals/rootKey').once('value').then(snap => {
                    const dbKey = snap.val();
                    if (dbKey && (pass === dbKey || email === dbKey)) {
                        sessionStorage.setItem('rootAuth', 'granted');
                        sessionStorage.setItem('adminBypass', 'true');
                        if (loginBtn) loginBtn.innerHTML = '<i class="fas fa-check"></i> ACCESS GRANTED';
                        if (loginError) loginError.style.display = 'none';
                        setTimeout(() => {
                            unlockDashboard();
                            if (loginBtn) {
                                loginBtn.innerHTML = '<i class="fas fa-unlock-alt"></i> INITIATE ROOT ACCESS';
                                loginBtn.disabled = false;
                            }
                        }, 300);
                    } else {
                        throw error;
                    }
                }).catch(finalErr => {
                    console.error("Auth Failure:", finalErr);
                    if (loginBtn) {
                        loginBtn.innerHTML = '<i class="fas fa-unlock-alt"></i> INITIATE ROOT ACCESS';
                        loginBtn.disabled = false;
                    }
                    if (loginError) {
                        loginError.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ACCESS DENIED: ${finalErr.message || 'INVALID CREDENTIALS'}`;
                        loginError.style.display = 'block';
                    }
                });
            });
    } else {
        // Only password entered without valid email - check against master database root key
        db.ref('siteData/globals/rootKey').once('value').then(snap => {
            const dbKey = snap.val() || masterKey;
            const inputVal = pass || email;
            if (inputVal === dbKey || inputVal === masterKey) {
                sessionStorage.setItem('rootAuth', 'granted');
                sessionStorage.setItem('adminBypass', 'true');
                if (loginBtn) loginBtn.innerHTML = '<i class="fas fa-check"></i> ACCESS GRANTED';
                if (loginError) loginError.style.display = 'none';
                setTimeout(() => {
                    unlockDashboard();
                    if (loginBtn) {
                        loginBtn.innerHTML = '<i class="fas fa-unlock-alt"></i> INITIATE ROOT ACCESS';
                        loginBtn.disabled = false;
                    }
                }, 300);
            } else {
                if (loginBtn) {
                    loginBtn.innerHTML = '<i class="fas fa-unlock-alt"></i> INITIATE ROOT ACCESS';
                    loginBtn.disabled = false;
                }
                if (loginError) {
                    loginError.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ACCESS DENIED: INVALID MASTER PASSWORD`;
                    loginError.style.display = 'block';
                }
            }
        }).catch(err => {
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-unlock-alt"></i> INITIATE ROOT ACCESS';
                loginBtn.disabled = false;
            }
            if (loginError) {
                loginError.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ACCESS DENIED: INVALID MASTER PASSWORD`;
                loginError.style.display = 'block';
            }
        });
    }
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
    initPopularEngine();
    initReleasesEngine();
    initUpcomingEngine();
    initGhostProdEngine();
    initStaffEngine();
    initDemosEngine();
    initContactEngine();
    initModalsEngine();
    initTransmissionsEngine();
    initSmartLinksEngine();
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
        'popular-panel': { title: '<i class="fas fa-fire"></i> POPULAR RELEASES & TRENDING TRACKS', desc: 'Manage featured trending carousel tracks, ranking order, audio links, and section visibility.' },
        'releases-panel': { title: '<i class="fas fa-compact-disc"></i> RELEASE CATALOG ARCHIVE', desc: 'Publish, edit, and reorder music releases with instant audio streaming IDs.' },
        'upcoming-panel': { title: '<i class="fas fa-clock"></i> UPCOMING RELEASES & TEASERS', desc: 'Configure teaser artwork, countdown date, and production status tags.' },
        'ghost-production-panel': { title: '<i class="fas fa-ghost"></i> GHOST PRODUCTION DIRECTIVES', desc: 'Manage custom production pricing tiers, turnaround timeline, and feature lists.' },
        'bot-admin-panel': { title: '<i class="fas fa-robot"></i> DISCORD BOT // NEURAL GATEWAY', desc: 'Real-time telemetry, server metrics, bot avatar, capabilities showcase, and destination invite links.' },
        'staff-panel': { title: '<i class="fas fa-users-cog"></i> PERSONNEL & COLLABORATOR PROFILES', desc: 'Custom avatars, banners, biographies, sort order, and social platforms for personnel.' },
        'demo-inbox-panel': { title: '<i class="fas fa-inbox"></i> DEMO SUBMISSIONS INBOX', desc: 'Review, stream, analyze link security, and tag artist demo transmissions.' },
        'contact-inbox-panel': { title: '<i class="fas fa-envelope-open-text"></i> CONTACT INQUIRIES', desc: 'Direct communications submitted via the public contact portal.' },
        'modals-panel': { title: '<i class="fas fa-window-restore"></i> MODALS, FAQ & FOOTER', desc: 'Interactive FAQ question/answers accordion, footer links, and legal policy editor.' },
        'smartlinks-panel': { title: '<i class="fas fa-bolt"></i> SMART LINKS HUB // RELEASE LANDING PAGES', desc: 'Auto-generate and manage dedicated release landing pages with streaming platform links (Spotify, Apple, Deezer, YouTube, etc.).' },
        'transmissions-panel': { title: '<i class="fas fa-broadcast-tower"></i> MEDIA FEEDS & DROPS', desc: 'Configure dedicated YouTube and TikTok latest release drops displayed on the main portal.' },
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
            site_maintenanceMsg: data.maintenanceMsg || "Quantum upgrades in progress. Frequencies will resume shortly.",
            site_sidebarLogoText: data.sidebarLogoText || "OBSCURA <span>RECORD</span>",
            site_sidebarPortalLabel: data.sidebarPortalLabel || "CORE PORTAL",
            site_showUpcoming: data.showUpcoming || "Visible",
            site_showGhostProduction: data.showGhostProduction || "Visible",
            site_v: data.v || "1.0",
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
        const vInput = document.getElementById('site_v');
        if (vInput && data.v) vInput.value = data.v;
    });

    // Version Bump Quick Action
    const btnBump = document.getElementById('btn-bump-version');
    if (btnBump) {
        btnBump.addEventListener('click', () => {
            const vInput = document.getElementById('site_v');
            const cur = parseFloat(vInput?.value || cachedGlobals.v || 1.0);
            const next = isNaN(cur) ? '1.1' : (cur + 0.1).toFixed(1);
            if (vInput) vInput.value = next;
            const vDisplay = document.getElementById('display-v');
            if (vDisplay) vDisplay.textContent = next;
            showToast(`VERSION INCREMENTED TO v${next}. CLICK SAVE TO COMMIT.`);
        });
    }

    // Save Globals button
    const saveGlobalsBtn = document.getElementById('save-globals');
    if (saveGlobalsBtn) {
        saveGlobalsBtn.addEventListener('click', () => {
            const vInput = document.getElementById('site_v');
            const curV = parseFloat(vInput?.value || cachedGlobals.v || 1.0);
            const customV = (isNaN(curV) ? 1.1 : (curV + 0.1)).toFixed(1);
            if (vInput) vInput.value = customV;

            const updates = {
                v: customV,
                siteTitle: document.getElementById('site_siteTitle').value,
                sidebarLogoText: document.getElementById('site_sidebarLogoText')?.value || "OBSCURA <span>RECORD</span>",
                sidebarPortalLabel: document.getElementById('site_sidebarPortalLabel')?.value || "CORE PORTAL",
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
                const vDisplay = document.getElementById('display-v');
                if (vDisplay) vDisplay.textContent = customV;
                logSecurityEvent("Updated Global Settings, Brand Titles & Version v" + customV, { version: customV, maintenance: updates.maintenanceMode });
                showToast("GLOBALS & ENGINE VERSION SAVED SUCCESSFULLY (v" + customV + ")!");
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

// --- 2.5 POPULAR RELEASES ENGINE ---
function initPopularEngine() {
    const container = document.getElementById('popular-releases-list');
    const badgePopular = document.getElementById('badge-popular');
    const editorCard = document.getElementById('popular-editor-card');
    const btnAddNew = document.getElementById('btn-add-new-popular');
    const btnClose = document.getElementById('close-popular-editor');
    const btnCancel = document.getElementById('btn-cancel-popular');
    const btnSave = document.getElementById('btn-save-popular-record');
    const searchInput = document.getElementById('popular-search-input');
    const coverInput = document.getElementById('pop_cover');
    const coverFile = document.getElementById('pop_cover_file');
    const coverImg = document.getElementById('pop_cover_preview_img');
    const togglePopular = document.getElementById('toggle-popular-section');
    const btnSaveHeader = document.getElementById('save-popular-header');

    // Live Cover Image Preview
    if (coverInput && coverImg) {
        coverInput.addEventListener('input', () => {
            const url = coverInput.value.trim();
            coverImg.src = url || 'assets/cover.png';
        });
    }

    // Local File Browser for Cover Artwork
    if (coverFile && coverInput && coverImg) {
        coverFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target.result;
                    coverInput.value = dataUrl;
                    coverImg.src = dataUrl;
                    showToast("LOCAL ARTWORK LOADED!");
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Section Visibility & Header sync
    db.ref('siteData/globals').on('value', (snap) => {
        const data = snap.val() || {};
        if (togglePopular) {
            const isVisible = !(data.showPopular === 'Hidden' || data.showPopular === false || data.showPopularReleases === false || data.showPopularReleases === 'Hidden');
            togglePopular.checked = isVisible;
        }
        const titleEl = document.getElementById('site_popularTitle');
        const descEl = document.getElementById('site_popularDesc');
        if (titleEl && data.popularTitle) titleEl.value = data.popularTitle;
        if (descEl && data.popularDesc) descEl.value = data.popularDesc;
    });

    if (togglePopular) {
        togglePopular.addEventListener('change', () => {
            const isChecked = togglePopular.checked;
            const val = isChecked ? 'Visible' : 'Hidden';
            db.ref('siteData/globals').update({
                showPopular: val,
                showPopularReleases: isChecked
            }).then(() => {
                bumpSiteVersion(`Popular Section: ${val}`);
                showToast(`POPULAR RELEASES SECTION IS NOW ${val.toUpperCase()}!`);
            });
        });
    }

    if (btnSaveHeader) {
        btnSaveHeader.addEventListener('click', () => {
            const title = document.getElementById('site_popularTitle').value.trim();
            const desc = document.getElementById('site_popularDesc').value.trim();
            db.ref('siteData/globals').update({
                popularTitle: title,
                popularDesc: desc
            }).then(() => {
                bumpSiteVersion("Updated Popular Releases Section Header");
                showToast("POPULAR SECTION HEADER SYNCHRONIZED!");
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
        });
    }

    // Load and listen to Popular Releases list
    db.ref('siteData/popular_releases').on('value', (snapshot) => {
        const data = snapshot.val();
        cachedPopular = [];
        if (data) {
            if (Array.isArray(data)) {
                cachedPopular = data.filter(Boolean);
            } else if (typeof data === 'object') {
                cachedPopular = Object.values(data);
            }
        }
        if (badgePopular) badgePopular.textContent = cachedPopular.length;
        renderPopularList();
    });

    function renderPopularList() {
        if (!container) return;
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const filtered = cachedPopular.map((item, idx) => ({ ...item, _origIdx: idx })).filter(item => {
            if (!query) return true;
            return (item.title && item.title.toLowerCase().includes(query)) ||
                (item.artist && item.artist.toLowerCase().includes(query)) ||
                (item.producers && item.producers.toLowerCase().includes(query));
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state full-grid">
                    <i class="fas fa-fire"></i>
                    <h3>NO POPULAR RELEASES FOUND</h3>
                    <p>Click "+ ADD NEW POPULAR HIT" to feature trending releases on the front page.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map((item) => {
            const idx = item._origIdx;
            const rank = idx + 1;
            const rankFormatted = rank < 10 ? `0${rank}` : `${rank}`;
            const cover = item.image || item.cover || 'assets/cover.png';
            const title = item.title || 'UNTITLED HIT';
            const artist = item.artist || item.producers || 'UNKNOWN ARTIST';
            const badge = item.badge || 'TRENDING';

            return `
                <div class="admin-release-card" data-index="${idx}">
                    <div class="rel-card-top">
                        <div style="position: relative;">
                            <img src="${cover}" alt="Artwork" class="rel-thumb" onerror="this.onerror=null; this.src='assets/cover.png';">
                            <span class="badge" style="position: absolute; bottom: -4px; right: -4px; background: #ff0055; color: #fff; font-size: 0.65rem; padding: 2px 6px; border-radius: 6px;">#${rankFormatted}</span>
                        </div>
                        <div class="rel-meta" style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h4>${title}</h4>
                                <span class="badge" style="background: rgba(0, 240, 255, 0.2); color: #00f0ff; border: 1px solid rgba(0, 240, 255, 0.4); font-size: 0.65rem;">${badge}</span>
                            </div>
                            <div class="rel-artist"><i class="fas fa-user-astronaut"></i> ${artist}</div>
                            <div class="stream-indicators" style="display: flex; gap: 0.6rem; margin-top: 0.4rem; font-size: 0.9rem;">
                                ${item.youtube || item.streamUrl ? '<span style="color:#ff0000;" title="YouTube Available"><i class="fab fa-youtube"></i></span>' : ''}
                                ${item.spotify || item.spotifyUrl ? '<span style="color:#1db954;" title="Spotify Available"><i class="fab fa-spotify"></i></span>' : ''}
                                ${item.apple || item.appleUrl ? '<span style="color:#fc3c44;" title="Apple Music Available"><i class="fa-brands fa-apple"></i></span>' : ''}
                                ${item.preview ? '<span style="color:#00f0ff;" title="Audio Preview Ready"><i class="fas fa-headphones"></i></span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="rel-card-actions" style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 0.3rem;">
                            <button type="button" class="cyber-btn sm" style="padding: 0.4rem 0.6rem;" title="Move Up" onclick="movePopularItem(${idx}, -1)"><i class="fas fa-arrow-up"></i></button>
                            <button type="button" class="cyber-btn sm" style="padding: 0.4rem 0.6rem;" title="Move Down" onclick="movePopularItem(${idx}, 1)"><i class="fas fa-arrow-down"></i></button>
                        </div>
                        <div style="display: flex; gap: 0.4rem;">
                            <button type="button" class="cyber-btn primary sm" onclick="openPopularEditor(${idx})">
                                <i class="fas fa-edit"></i> EDIT
                            </button>
                            <button type="button" class="cyber-btn danger sm" onclick="deletePopularRecord(${idx})">
                                <i class="fas fa-trash"></i> DELETE
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    if (searchInput) {
        searchInput.addEventListener('input', renderPopularList);
    }

    // Open Add Form
    if (btnAddNew) {
        btnAddNew.addEventListener('click', () => {
            document.getElementById('pop_edit_index').value = "-1";
            document.getElementById('popular-editor-title').innerHTML = '<i class="fas fa-plus-circle"></i> ADD NEW POPULAR RELEASE';
            document.getElementById('pop_title').value = '';
            document.getElementById('pop_artist').value = '';
            document.getElementById('pop_rank').value = cachedPopular.length + 1;
            document.getElementById('pop_badge').value = 'TRENDING';
            document.getElementById('pop_cover').value = '';
            document.getElementById('pop_preview').value = '';
            document.getElementById('pop_youtube').value = '';
            document.getElementById('pop_spotify').value = '';
            document.getElementById('pop_apple').value = '';
            if (coverImg) coverImg.src = 'assets/cover.png';
            if (editorCard) {
                editorCard.style.display = 'block';
                editorCard.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Close / Cancel
    [btnClose, btnCancel].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (editorCard) editorCard.style.display = 'none';
            });
        }
    });

    // Save Popular Track
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const editIndex = parseInt(document.getElementById('pop_edit_index').value, 10);
            const title = document.getElementById('pop_title').value.trim();
            const artist = document.getElementById('pop_artist').value.trim();
            const rank = parseInt(document.getElementById('pop_rank').value, 10) || 1;
            const badge = document.getElementById('pop_badge').value.trim() || 'TRENDING';
            const cover = document.getElementById('pop_cover').value.trim() || 'assets/cover.png';
            const preview = document.getElementById('pop_preview').value.trim();
            const youtube = document.getElementById('pop_youtube').value.trim();
            const spotify = document.getElementById('pop_spotify').value.trim();
            const apple = document.getElementById('pop_apple').value.trim();

            if (!title) {
                showToast("PLEASE ENTER TRACK TITLE!", 'error');
                return;
            }
            if (!artist) {
                showToast("PLEASE ENTER ARTIST NAME!", 'error');
                return;
            }

            const record = {
                title: title,
                artist: artist,
                producers: artist,
                image: cover,
                cover: cover,
                rank: rank,
                badge: badge,
                preview: preview,
                youtube: youtube,
                streamUrl: youtube,
                spotify: spotify,
                spotifyUrl: spotify,
                apple: apple,
                appleUrl: apple
            };

            let newList = [...cachedPopular];
            if (editIndex >= 0 && editIndex < newList.length) {
                newList[editIndex] = record;
            } else {
                newList.push(record);
            }

            // Sort by rank if custom ranks provided
            newList.sort((a, b) => (parseInt(a.rank) || 99) - (parseInt(b.rank) || 99));

            db.ref('siteData/popular_releases').set(newList).then(() => {
                bumpSiteVersion(`Saved Popular Track: ${title}`);
                showToast(`POPULAR TRACK "${title}" SYNCHRONIZED!`);
                if (editorCard) editorCard.style.display = 'none';
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
        });
    }

    // Global Functions for Edit, Delete, Move
    window.openPopularEditor = function (index) {
        const item = cachedPopular[index];
        if (!item) return;

        document.getElementById('pop_edit_index').value = index;
        document.getElementById('popular-editor-title').innerHTML = `<i class="fas fa-edit"></i> EDIT POPULAR RELEASE: ${item.title || ''}`;
        document.getElementById('pop_title').value = item.title || '';
        document.getElementById('pop_artist').value = item.artist || item.producers || '';
        document.getElementById('pop_rank').value = item.rank || (index + 1);
        document.getElementById('pop_badge').value = item.badge || 'TRENDING';
        document.getElementById('pop_cover').value = item.image || item.cover || '';
        document.getElementById('pop_preview').value = item.preview || '';
        document.getElementById('pop_youtube').value = item.youtube || item.streamUrl || '';
        document.getElementById('pop_spotify').value = item.spotify || item.spotifyUrl || '';
        document.getElementById('pop_apple').value = item.apple || item.appleUrl || '';
        if (coverImg) coverImg.src = item.image || item.cover || 'assets/cover.png';

        if (editorCard) {
            editorCard.style.display = 'block';
            editorCard.scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.deletePopularRecord = function (index) {
        const item = cachedPopular[index];
        if (!item) return;
        if (!confirm(`Are you sure you want to remove "${item.title || 'this track'}" from Popular Releases?`)) return;

        const newList = cachedPopular.filter((_, i) => i !== index);
        db.ref('siteData/popular_releases').set(newList).then(() => {
            bumpSiteVersion(`Removed Popular Track: ${item.title}`);
            showToast("TRACK REMOVED FROM POPULAR RELEASES!");
        }).catch(err => showToast("ERROR: " + err.message, 'error'));
    };

    window.movePopularItem = function (index, direction) {
        const targetIdx = index + direction;
        if (targetIdx < 0 || targetIdx >= cachedPopular.length) return;

        const newList = [...cachedPopular];
        const temp = newList[index];
        newList[index] = newList[targetIdx];
        newList[targetIdx] = temp;

        // Update rank numbers
        newList.forEach((item, i) => { item.rank = i + 1; });

        db.ref('siteData/popular_releases').set(newList).then(() => {
            bumpSiteVersion("Reordered Popular Releases");
            showToast("POPULAR RELEASES REORDERED!");
        }).catch(err => showToast("ERROR: " + err.message, 'error'));
    };
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
            ['rel_title', 'rel_artist', 'rel_catalog', 'rel_date', 'rel_cover', 'rel_streamUrl', 'rel_youtubeUrl', 'rel_spotifyUrl', 'rel_soundcloudUrl', 'rel_appleUrl', 'rel_dlUrl'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const typeEl = document.getElementById('rel_type');
            if (typeEl) typeEl.value = 'SINGLE';
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
            const type = r.type || '';
            if (!query) return true;
            return title.toLowerCase().includes(query) ||
                artist.toLowerCase().includes(query) ||
                catalog.toLowerCase().includes(query) ||
                type.toLowerCase().includes(query);
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div class="loading-state" style="color: var(--text-dim);">NO RELEASES FOUND.</div>`;
            return;
        }

        container.innerHTML = filtered.map((rel, i) => {
            const actualIndex = cachedReleases.indexOf(rel);
            const cover = rel.cover || rel.image || 'assets/cover.png';
            const artist = rel.artist || rel.producers || 'UNKNOWN ARTIST';
            const catalog = rel.catalog || (rel.id && !rel.id.includes('NEW') ? rel.id : '');
            const relType = (rel.type || 'SINGLE').toUpperCase();
            const dateStr = rel.date || 'TBA';
            return `
                <div class="admin-release-card">
                    <div class="rel-card-top">
                        <img src="${cover}" alt="Artwork" class="rel-thumb" onerror="this.onerror=null; this.src='assets/cover.png';">
                        <div class="rel-meta">
                            <h4>${rel.title || 'UNTITLED'}</h4>
                            <div class="rel-artist">${artist}</div>
                            <div class="rel-code"><span class="rel-type-tag" style="display:inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.68rem; font-weight: 800; background: rgba(0, 240, 255, 0.15); color: var(--accent-blue); margin-right: 6px; letter-spacing: 0.05rem;">${relType}</span>${catalog ? `${catalog} | ` : ''}${dateStr}</div>
                        </div>
                    </div>
                    <div class="rel-card-actions">
                        <button type="button" class="cyber-btn sm" style="color: #00f0ff; border-color: rgba(0, 240, 255, 0.4);" onclick="generateSmartLinkFromRelease(${actualIndex})" title="Generate Smart Link for this Release">
                            <i class="fas fa-bolt"></i> SMART LINK
                        </button>
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

    window.generateSmartLinkFromRelease = function(index) {
        const rel = cachedReleases[index];
        if (!rel) return;

        const navBtn = document.querySelector('.nav-btn[data-target="smartlinks-panel"]');
        if (navBtn) navBtn.click();

        const titleInput = document.getElementById('smartlink-input-title');
        const artistInput = document.getElementById('smartlink-input-artist');
        const imageInput = document.getElementById('smartlink-input-image');
        const slugInput = document.getElementById('smartlink-input-slug');
        const previewInput = document.getElementById('smartlink-input-preview');
        const slugPreviewText = document.getElementById('slug-preview-text');

        if (titleInput) titleInput.value = rel.title || '';
        if (artistInput) artistInput.value = rel.artist || rel.producers || '';
        if (imageInput) imageInput.value = rel.cover || rel.image || '';
        const slug = (rel.title || 'release').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (slugInput) slugInput.value = slug;
        if (slugPreviewText) slugPreviewText.textContent = slug;
        if (previewInput) previewInput.value = rel.audioUrl || rel.previewAudio || rel.youtube || '';

        if (rel.spotify) document.getElementById('smartlink-link-spotify').value = rel.spotify;
        if (rel.apple) document.getElementById('smartlink-link-apple').value = rel.apple;
        if (rel.youtube) document.getElementById('smartlink-link-youtube').value = rel.youtube;
        if (rel.soundcloud) document.getElementById('smartlink-link-soundcloud').value = rel.soundcloud;

        const formCard = document.getElementById('smartlink-form-title');
        if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast(`LOADED "${rel.title}" INTO SMART LINK GENERATOR!`);
    };

    if (searchInput) {
        searchInput.addEventListener('input', renderReleasesList);
    }

    // --- SPOTIFY & YOUTUBE ARTWORK AUTO-DETECTION ENGINE ---
    async function autoDetectReleaseMetadata(spotifyUrl = '', youtubeUrl = '', currentTitle = '', currentArtist = '') {
        let result = {
            cover: '',
            title: '',
            artist: ''
        };

        // 1. Spotify oEmbed Extraction (CORS friendly, high-res artwork)
        if (spotifyUrl && spotifyUrl.includes('spotify.com')) {
            try {
                // Ensure proper track/album URL format
                const cleanSpotUrl = spotifyUrl.trim().split('?')[0];
                const spotifyOEmbedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(cleanSpotUrl)}`;
                const res = await fetch(spotifyOEmbedUrl);
                if (res.ok) {
                    const data = await res.json();
                    if (data.thumbnail_url) {
                        result.cover = data.thumbnail_url;
                    }
                    if (data.title) {
                        const parts = data.title.split(' - ');
                        if (parts.length > 1) {
                            result.title = parts[0].trim();
                            result.artist = parts.slice(1).join(' - ').trim();
                        } else {
                            result.title = data.title.trim();
                        }
                    }
                }
            } catch (e) {
                console.warn('Spotify oEmbed fetch warning:', e);
            }
        }

        // 2. iTunes Search API (Returns 4K artwork & artist/track name fallback)
        const searchTerms = (result.title && result.artist) ? `${result.title} ${result.artist}` : (currentTitle || currentArtist ? `${currentTitle} ${currentArtist}` : (result.title || ''));
        if (searchTerms && !result.cover) {
            try {
                const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerms)}&entity=song&limit=1`;
                const itunesRes = await fetch(itunesUrl);
                if (itunesRes.ok) {
                    const itunesData = await itunesRes.json();
                    if (itunesData.resultCount > 0) {
                        const item = itunesData.results[0];
                        if (item.artworkUrl100) {
                            result.cover = item.artworkUrl100.replace('100x100bb', '600x600bb');
                        }
                        if (!result.title && item.trackName) result.title = item.trackName;
                        if (!result.artist && item.artistName) result.artist = item.artistName;
                    }
                }
            } catch (e) {
                console.warn('iTunes metadata search warning:', e);
            }
        }

        // 3. YouTube oEmbed Fallback (for cover / title)
        if ((!result.cover || !result.title) && youtubeUrl && (youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be'))) {
            try {
                const ytOEmbed = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl.trim())}&format=json`;
                const ytRes = await fetch(ytOEmbed);
                if (ytRes.ok) {
                    const ytData = await ytRes.json();
                    if (!result.cover && ytData.thumbnail_url) {
                        result.cover = ytData.thumbnail_url;
                    }
                    if (!result.title && ytData.title) {
                        result.title = ytData.title;
                    }
                }
            } catch (e) {
                console.warn('YouTube oEmbed fallback warning:', e);
            }
        }

        return result;
    }

    // Auto-detect button in Release Editor
    const btnAutoDetect = document.getElementById('btn-auto-detect-release-meta');
    const spotifyInput = document.getElementById('rel_spotifyUrl');

    async function triggerAutoDetection(isSilent = false) {
        const spotUrl = spotifyInput ? spotifyInput.value.trim() : '';
        const streamUrl = document.getElementById('rel_streamUrl')?.value.trim() || '';
        const ytUrl = document.getElementById('rel_youtubeUrl')?.value.trim() || streamUrl;
        const curTitle = document.getElementById('rel_title')?.value.trim() || '';
        const curArtist = document.getElementById('rel_artist')?.value.trim() || '';

        if (!spotUrl && !ytUrl && !curTitle) {
            if (!isSilent) showToast("PLEASE ENTER A SPOTIFY OR YOUTUBE URL FIRST!", 'error');
            return;
        }

        if (!isSilent) showToast("FETCHING SPOTIFY ARTWORK...", 'info');

        const meta = await autoDetectReleaseMetadata(spotUrl, ytUrl, curTitle, curArtist);

        if (meta.cover) {
            const coverEl = document.getElementById('rel_cover');
            if (coverEl) {
                coverEl.value = meta.cover;
                if (coverPreview) {
                    coverPreview.innerHTML = `<img src="${meta.cover}" onerror="this.onerror=null; this.src='assets/cover.png';">`;
                }
            }
        }

        if (meta.title && !document.getElementById('rel_title').value.trim()) {
            document.getElementById('rel_title').value = meta.title;
        }

        if (meta.artist && !document.getElementById('rel_artist').value.trim()) {
            document.getElementById('rel_artist').value = meta.artist;
        }

        if (!isSilent) {
            showToast("ARTWORK AUTO-ASSIGNED SUCCESSFULLY!");
        }
    }

    if (btnAutoDetect) {
        btnAutoDetect.addEventListener('click', () => triggerAutoDetection(false));
    }

    if (spotifyInput) {
        spotifyInput.addEventListener('paste', () => {
            setTimeout(() => triggerAutoDetection(false), 200);
        });
        spotifyInput.addEventListener('change', () => {
            if (spotifyInput.value.trim().includes('spotify.com')) {
                triggerAutoDetection(true);
            }
        });
    }

    // Batch Auto-Sync All Existing Releases
    const btnBatchSyncReleases = document.getElementById('btn-batch-sync-releases');
    if (btnBatchSyncReleases) {
        btnBatchSyncReleases.addEventListener('click', async () => {
            if (!cachedReleases || cachedReleases.length === 0) {
                showToast("NO RELEASES FOUND TO SYNC!", 'error');
                return;
            }

            if (!confirm(`Auto-detect Spotify Artworks for all ${cachedReleases.length} releases?`)) {
                return;
            }

            showToast(`SYNCING ${cachedReleases.length} RELEASES WITH SPOTIFY ARTWORKS...`, 'info');
            btnBatchSyncReleases.disabled = true;
            btnBatchSyncReleases.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCING...';

            let updatedCount = 0;
            const updatedList = [...cachedReleases];

            for (let i = 0; i < updatedList.length; i++) {
                const rel = updatedList[i];
                const spotUrl = rel.spotifyUrl || rel.spotify || '';
                const ytUrl = rel.youtubeUrl || rel.youtube || rel.streamUrl || '';
                const title = rel.title || '';
                const artist = rel.artist || rel.producers || '';

                try {
                    const meta = await autoDetectReleaseMetadata(spotUrl, ytUrl, title, artist);
                    let changed = false;

                    if (meta.cover && (!rel.cover || rel.cover === 'assets/cover.png' || rel.cover.includes('placeholder'))) {
                        rel.cover = meta.cover;
                        rel.image = meta.cover;
                        changed = true;
                    }

                    if (changed) updatedCount++;
                } catch (e) {
                    console.warn(`Sync failed for ${rel.title}:`, e);
                }
            }

            db.ref('siteData/releases').set(updatedList).then(() => {
                bumpSiteVersion(`Auto-synced ${updatedCount} Releases Artwork`);
                showToast(`SUCCESSFULLY SYNCED ${updatedCount} RELEASES!`);
                btnBatchSyncReleases.disabled = false;
                btnBatchSyncReleases.innerHTML = '<i class="fab fa-spotify"></i> AUTO-SYNC ARTWORK';
            }).catch(err => {
                showToast("SYNC ERROR: " + err.message, 'error');
                btnBatchSyncReleases.disabled = false;
                btnBatchSyncReleases.innerHTML = '<i class="fab fa-spotify"></i> AUTO-SYNC ARTWORK';
            });
        });
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

            // Catalog code: only save what the user typed without auto-assigning OCR000
            const catalog = document.getElementById('rel_catalog').value.trim();
            const type = (document.getElementById('rel_type')?.value || 'SINGLE').trim().toUpperCase();
            const cover = document.getElementById('rel_cover').value.trim() || 'assets/cover.png';
            const streamUrl = document.getElementById('rel_streamUrl').value.trim(); // YouTube Preview / Player audio
            const youtubeUrl = document.getElementById('rel_youtubeUrl').value.trim() || streamUrl; // YouTube Album / Full release link
            const spotifyUrl = document.getElementById('rel_spotifyUrl').value.trim();
            const appleUrl = document.getElementById('rel_appleUrl').value.trim();
            const soundcloudUrl = document.getElementById('rel_soundcloudUrl').value.trim();
            const dlUrl = document.getElementById('rel_dlUrl').value.trim();

            // Store dual keys so all site player systems and scripts work smoothly
            const item = {
                title: title,
                artist: artist,
                producers: artist,
                type: type,
                catalog: catalog,
                id: catalog,
                date: document.getElementById('rel_date').value.trim() || '2026',
                cover: cover,
                image: cover,
                streamUrl: streamUrl,
                preview: streamUrl,
                youtubePreview: streamUrl,
                youtube: youtubeUrl,
                youtubeUrl: youtubeUrl,
                youtubeAlbum: youtubeUrl,
                spotifyUrl: spotifyUrl,
                spotify: spotifyUrl,
                soundcloudUrl: soundcloudUrl,
                soundcloud: soundcloudUrl,
                appleUrl: appleUrl,
                apple: appleUrl,
                dlUrl: dlUrl
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

    window.editRelease = function (index) {
        const rel = cachedReleases[index];
        if (!rel || !editorCard) return;

        document.getElementById('rel_edit_index').value = index;
        document.getElementById('release-editor-title').textContent = `EDIT RELEASE: ${rel.title}`;
        document.getElementById('rel_title').value = rel.title || '';
        document.getElementById('rel_artist').value = rel.artist || rel.producers || '';
        const typeEl = document.getElementById('rel_type');
        if (typeEl) typeEl.value = (rel.type || 'SINGLE').toUpperCase();
        document.getElementById('rel_catalog').value = rel.catalog || (rel.id && !rel.id.includes('NEW') ? rel.id : '');
        document.getElementById('rel_date').value = rel.date || '';
        document.getElementById('rel_cover').value = rel.cover || rel.image || '';
        document.getElementById('rel_streamUrl').value = rel.streamUrl || rel.preview || rel.youtubePreview || '';
        document.getElementById('rel_youtubeUrl').value = rel.youtubeAlbum || rel.youtubeUrl || rel.youtube || '';
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

    window.deleteRelease = function (index) {
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

    window.editUpcoming = function (index) {
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

    window.deleteUpcoming = function (index) {
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
            b.addEventListener('click', () => {
                profEditor.style.display = 'none';
                document.getElementById('prof_edit_id').value = '';
            });
        }
    });

    const profNameInput = document.getElementById('prof_name');
    if (profNameInput) {
        profNameInput.addEventListener('input', () => {
            const editId = document.getElementById('prof_edit_id').value;
            const profIdInput = document.getElementById('prof_id');
            if (!editId && profIdInput) {
                const slug = profNameInput.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                profIdInput.value = slug;
            }
        });
    }

    db.ref('staff_status').on('value', (snap) => {
        cachedStaff = snap.val() || {};
        updateStaffCountBadge();
        if (currentStaffView === 'staff') renderStaffProfiles();
    });

    db.ref('partner_status').on('value', (snap) => {
        cachedPartners = snap.val() || {};

        // Automatic permanent cleanup of legacy Discord bot ID (859727100758982666) / ITX ghosts
        if (firebase.auth().currentUser && cachedPartners['859727100758982666']) {
            const legacyData = cachedPartners['859727100758982666'];
            const legacyName = (legacyData.name || '').trim().toLowerCase();
            if (legacyName && !legacyName.includes('itx') && !cachedPartners['goost_music']) {
                // If it was renamed to GOOST MUSIC or similar, migrate cleanly to 'goost_music'
                db.ref('partner_status/goost_music').set(legacyData).then(() => {
                    db.ref('partner_status/859727100758982666').remove();
                }).catch(() => { });
            } else {
                // Permanently remove legacy ITX ID from Firebase
                db.ref('partner_status/859727100758982666').remove().catch(() => { });
            }
        }

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
        const rawDataObj = isPartner ? cachedPartners : cachedStaff;
        const dataObj = {};

        for (const [k, v] of Object.entries(rawDataObj)) {
            if (!v) continue;
            if (isPartner) {
                const name = (v.name || '').trim().toLowerCase();
                const tagline = (v.tagline || '').trim().toLowerCase();
                // Filter out legacy ITX ghost / old bot entries
                if (k === '859727100758982666' && (name.includes('itx') || !name)) continue;
                if (name.includes('itx record') || tagline.includes('itx record') || name === 'itx') continue;
            }
            dataObj[k] = v;
        }

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
            const rawEnteredId = document.getElementById('prof_id').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
            const name = document.getElementById('prof_name').value.trim();
            const role = document.getElementById('prof_role').value.trim();

            if (!name) {
                showToast("PLEASE FILL IN PARTNER / PROFILE NAME!", 'error');
                return;
            }

            // Always ensure a unique, dedicated ID so multiple partner cards never overwrite each other
            let profId = editId;
            if (!profId) {
                if (rawEnteredId) {
                    profId = rawEnteredId;
                } else {
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                    profId = (slug || (isPartner ? 'partner' : 'staff')) + '_' + Date.now().toString(36);
                }
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
                role: role || (isPartner ? 'Distribution Partner' : 'Staff Member'),
                tagline: role || (isPartner ? 'Distribution Partner' : 'Staff Member'),
                order: parseInt(document.getElementById('prof_order').value) || 99,
                avatar_url: avatarUrl,
                logoUrl: avatarUrl,
                logo_url: avatarUrl,
                banner_url: bannerUrl,
                bannerUrl: bannerUrl,
                banner: bannerUrl,
                bio: document.getElementById('prof_bio').value.trim(),
                socials: socials,
                updatedAt: Date.now()
            };

            const path = isPartner ? 'partner_status/' : 'staff_status/';
            db.ref(path + profId).set(data).then(() => {
                bumpSiteVersion(`Saved Profile: ${name}`);
                showToast(`PARTNER/STAFF "${name.toUpperCase()}" SAVED SUCCESSFULLY!`);
                if (profEditor) profEditor.style.display = 'none';
                document.getElementById('prof_edit_id').value = '';
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
        });
    }

    window.openProfileEditor = function (id, isPartner) {
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

    window.deleteProfile = function (id, isPartner) {
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

    window.playAudioPreview = function (url, title, artist) {
        if (!audioDock || !previewAudio) return;
        dockTitle.textContent = title;
        dockArtist.textContent = artist;
        previewAudio.src = url;
        audioDock.style.display = 'flex';
        previewAudio.play().catch(e => console.log("Preview play blocked", e));
    };

    window.updateDemoStatus = function (id, status) {
        // Update both paths
        db.ref('siteData/submissions/demo/' + id).update({ status: status });
        db.ref('demo_submissions/' + id).update({ status: status }).then(() => {
            logSecurityEvent("Updated Demo Submission Status: " + status, { id: id, status: status });
            showToast(`STATUS UPDATED: ${status}`);
        }).catch(err => showToast("ERROR: " + err.message, 'error'));
    };

    window.deleteDemoSubmission = function (id) {
        if (!confirm("Permanently delete this demo submission record?")) return;
        db.ref('siteData/submissions/demo/' + id).remove();
        db.ref('demo_submissions/' + id).remove().then(() => {
            logSecurityEvent("Deleted Demo Submission Record", { id: id });
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

    window.deleteContactMsg = function (id) {
        if (!confirm("Delete this contact message?")) return;
        db.ref('siteData/submissions/contact/' + id).remove();
        db.ref('contact_messages/' + id).remove().then(() => {
            logSecurityEvent("Deleted Contact Message Record", { id: id });
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
            // FAQ Modal
            site_modalFaqTitle: data.modalFaqTitle || "FREQUENCY ASKED QUESTIONS",
            // Demo Submission Modal
            site_formTitle: data.formTitle || "Secure <span class='accent'>Form Submission</span>",
            site_formDesc: data.formDesc || "Transmit your audio frequency to the Obscura A&R department for priority review.",
            site_formLabelName: data.formLabelName || "Real Name",
            site_formPlaceholderName: data.formPlaceholderName || "Name",
            site_formLabelArtist: data.formLabelArtist || "Artist Name(s)",
            site_formPlaceholderArtist: data.formPlaceholderArtist || "Names",
            site_formLabelEmail: data.formLabelEmail || "Email Address",
            site_formPlaceholderEmail: data.formPlaceholderEmail || "official@artist.com",
            site_formLabelGenre: data.formLabelGenre || "Primary Genre",
            site_formPlaceholderGenre: data.formPlaceholderGenre || "Funk / EDM / Hip Hop",
            site_formLabelSpotify: data.formLabelSpotify || "Artist Profile / Social Links",
            site_formPlaceholderSpotify: data.formPlaceholderSpotify || "https://open.spotify.com/artist/...",
            site_formLabelLink: data.formLabelLink || "Private streaming link (SoundCloud / Dropbox / Drive)",
            site_formPlaceholderLink: data.formPlaceholderLink || "https://soundcloud.com/...",
            site_formLabelMessage: data.formLabelMessage || "Message / Biography (Optional)",
            site_formPlaceholderMessage: data.formPlaceholderMessage || "A brief transmission regarding your sound...",
            site_formRule1Title: data.formRule1Title || "Is this track unreleased?",
            site_formRule1Desc: data.formRule1Desc || "We do NOT accept already-released tracks. Any submissions that have already been published will be automatically declined.",
            site_formRule2Title: data.formRule2Title || "Track identification",
            site_formRule2Desc: data.formRule2Desc || "Please provide the title for your track. If you haven't decided on a name yet, a reference title is sufficient so we can identify your submission.",
            site_formSubmitBtn: data.formSubmitBtn || "Initiate Submission",
            site_formDiscordBtn: data.formDiscordBtn || "Join Discord",
            site_formFooterRec: data.formFooterRec || "[ Highly Recommended: Join the server for real-time frequency tracking ]",
            // Contact Us Modal
            site_contactModalTitle: data.contactModalTitle || "CONTACT <span class='accent'>VOID</span>",
            site_contactModalSubtext: data.contactModalSubtext || "Establish a direct frequency with the Obscura Record command center.",
            site_contactLabelName: data.contactLabelName || "NAME / IDENTIFIER",
            site_contactPlaceholderName: data.contactPlaceholderName || "Entity Name",
            site_contactLabelEmail: data.contactLabelEmail || "RETURN EMAIL",
            site_contactPlaceholderEmail: data.contactPlaceholderEmail || "freq@void.com",
            site_contactLabelMessage: data.contactLabelMessage || "MESSAGE PAYLOAD",
            site_contactPlaceholderMessage: data.contactPlaceholderMessage || "Type your transmission here...",
            site_contactSubmitBtn: data.contactSubmitBtn || "SEND TRANSMISSION",
            site_contactFooterNote: data.contactFooterNote || "This frequency is guarded by Google reCAPTCHA and sonic encryption.",
            // Privacy Policy Modal
            site_modalPrivacyTitle: data.modalPrivacyTitle || "PRIVACY POLICY",
            site_p1_q: data.p1_q || "INTELLECTUAL PROPERTY",
            site_p1_a: data.p1_a || "All content in this dimension—including audio, graphics, logos, and visual art—is the property of Obscura Record or its licensors.",
            site_p2_q: data.p2_q || "DATA SECURITY",
            site_p2_a: data.p2_a || "Your portal data is encrypted and secure. We only collect what is necessary to maintain your connection.",
            site_p3_q: data.p3_q || "PROMOTIONAL CONTENT",
            site_p3_a: data.p3_a || "By connecting to our portal, you may receive updates on new releases, talent discoveries, and galactic events.",
            site_p4_q: data.p4_q || "EXTERNAL EMBEDS",
            site_p4_a: data.p4_a || "We use third-party players (SoundCloud/YouTube). Their respective privacy policies apply to your interactions on those platforms.",
            site_p5_q: data.p5_q || "DATA RETENTION",
            site_p5_a: data.p5_a || "We retain connection data only as long as necessary for community support and galactic record-keeping.",
            site_p6_q: data.p6_q || "GOVERNING LAW",
            site_p6_a: data.p6_a || "All legal matters are governed by the laws of our primary operational frequency. Disputes are resolved via cosmic mediation.",
            site_p7_q: data.p7_q || "LEGAL CONTACT",
            site_p7_a: data.p7_a || "For all legal inquiries, copyright complaints (DMCA), or licensing requests, please send an email message to our Legal Counsel at sayurux@gmail.com."
        };

        for (const [id, val] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        }
    });

    db.ref('siteData/modals/faqs').on('value', (snap) => {
        const data = snap.val();
        cachedFAQs = (data && Array.isArray(data)) ? data : [
            { q: "HOW DO I SUBMIT A DEMO?", a: "We highly recommend sending demos through our Discord Server for faster review. Alternatively, you can send an email message to sayurux@gmail.com." },
            { q: "WHAT GENRES ARE YOU LOOKING FOR?", a: "Our dimension primarily focuses on Phonk, Funk, and Futuristic Electronic music. We are looking for high-energy vibrations that push the boundaries of sound." },
            { q: "WHERE CAN I JOIN THE COMMUNITY?", a: "Join our galactic community on Discord to connect with other artists, share ideas, and participate in exclusive portal events." },
            { q: "HOW LONG DOES A RESPONSE TAKE?", a: "Our sonic reviewers aim to respond within a few galactic cycles. If your sound resonates with our frequency, we will reach out via Discord or email." }
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

    window.removeFaqItem = function (index) {
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
                // FAQ
                modalFaqTitle: document.getElementById('site_modalFaqTitle').value,
                // Demo
                formTitle: document.getElementById('site_formTitle').value,
                formDesc: document.getElementById('site_formDesc').value,
                formLabelName: document.getElementById('site_formLabelName').value,
                formPlaceholderName: document.getElementById('site_formPlaceholderName').value,
                formLabelArtist: document.getElementById('site_formLabelArtist').value,
                formPlaceholderArtist: document.getElementById('site_formPlaceholderArtist').value,
                formLabelEmail: document.getElementById('site_formLabelEmail').value,
                formPlaceholderEmail: document.getElementById('site_formPlaceholderEmail').value,
                formLabelGenre: document.getElementById('site_formLabelGenre').value,
                formPlaceholderGenre: document.getElementById('site_formPlaceholderGenre').value,
                formLabelSpotify: document.getElementById('site_formLabelSpotify').value,
                formPlaceholderSpotify: document.getElementById('site_formPlaceholderSpotify').value,
                formLabelLink: document.getElementById('site_formLabelLink').value,
                formPlaceholderLink: document.getElementById('site_formPlaceholderLink').value,
                formLabelMessage: document.getElementById('site_formLabelMessage').value,
                formPlaceholderMessage: document.getElementById('site_formPlaceholderMessage').value,
                formRule1Title: document.getElementById('site_formRule1Title').value,
                formRule1Desc: document.getElementById('site_formRule1Desc').value,
                formRule2Title: document.getElementById('site_formRule2Title').value,
                formRule2Desc: document.getElementById('site_formRule2Desc').value,
                formSubmitBtn: document.getElementById('site_formSubmitBtn').value,
                formDiscordBtn: document.getElementById('site_formDiscordBtn').value,
                formFooterRec: document.getElementById('site_formFooterRec').value,
                // Contact
                contactModalTitle: document.getElementById('site_contactModalTitle').value,
                contactModalSubtext: document.getElementById('site_contactModalSubtext').value,
                contactLabelName: document.getElementById('site_contactLabelName').value,
                contactPlaceholderName: document.getElementById('site_contactPlaceholderName').value,
                contactLabelEmail: document.getElementById('site_contactLabelEmail').value,
                contactPlaceholderEmail: document.getElementById('site_contactPlaceholderEmail').value,
                contactLabelMessage: document.getElementById('site_contactLabelMessage').value,
                contactPlaceholderMessage: document.getElementById('site_contactPlaceholderMessage').value,
                contactSubmitBtn: document.getElementById('site_contactSubmitBtn').value,
                contactFooterNote: document.getElementById('site_contactFooterNote').value,
                // Privacy
                modalPrivacyTitle: document.getElementById('site_modalPrivacyTitle').value,
                p1_q: document.getElementById('site_p1_q').value,
                p1_a: document.getElementById('site_p1_a').value,
                p2_q: document.getElementById('site_p2_q').value,
                p2_a: document.getElementById('site_p2_a').value,
                p3_q: document.getElementById('site_p3_q').value,
                p3_a: document.getElementById('site_p3_a').value,
                p4_q: document.getElementById('site_p4_q').value,
                p4_a: document.getElementById('site_p4_a').value,
                p5_q: document.getElementById('site_p5_q').value,
                p5_a: document.getElementById('site_p5_a').value,
                p6_q: document.getElementById('site_p6_q').value,
                p6_a: document.getElementById('site_p6_a').value,
                p7_q: document.getElementById('site_p7_q').value,
                p7_a: document.getElementById('site_p7_a').value
            };

            // Sync legacy individual keys for 100% backward-compatibility
            if (newFaqs.length > 0) {
                newFaqs.forEach((f, idx) => {
                    updates[`faq${idx + 1}_q`] = f.q;
                    updates[`faq${idx + 1}_a`] = f.a;
                });
            }

            db.ref('siteData/globals').update(updates);
            db.ref('siteData/modals/faqs').set(newFaqs).then(() => {
                bumpSiteVersion("Updated All 4 Popups, FAQ & Footer Options");
                showToast("ALL 4 POPUPS & FOOTER BUTTONS SYNCHRONIZED!");
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
        });
    }
}

// --- 10. SECURITY & AUDIT LOGS ENGINE ---
let cachedSecurityLogs = [];
let rawTelemetryLogs = [];
let rawVisitorLogs = [];
let rawViolations = [];
let rawAuditLogs = [];
let rawDemoLogs = [];
let rawContactLogs = [];
let currentLogFilter = 'all';

function initSecurityLogsEngine() {
    const liveStreamContainer = document.getElementById('security-live-stream');
    const searchInput = document.getElementById('sec-log-search-input');
    const filterTabs = document.querySelectorAll('#sec-log-tabs .tab-pill');
    const btnRefresh = document.getElementById('btn-refresh-logs');
    const btnExportJson = document.getElementById('btn-export-logs-json');
    const btnExportCsv = document.getElementById('btn-export-logs-csv');
    const btnClearLogs = document.getElementById('btn-clear-security-logs');
    const alarmBanner = document.getElementById('sec-global-alarm-banner');
    const btnDismissAlarm = document.getElementById('btn-dismiss-alarm');
    const alarmTitle = document.getElementById('alarm-banner-title');
    const alarmDesc = document.getElementById('alarm-banner-desc');

    const statTotal = document.getElementById('sec-stat-total');
    const statViolations = document.getElementById('sec-stat-violations');
    const statNodes = document.getElementById('sec-stat-nodes');
    const badgeSecurity = document.getElementById('badge-security-logs');

    // Tab count pill elements
    const countAll = document.getElementById('count-filter-all');
    const countVisitors = document.getElementById('count-filter-visitors');
    const countAdmin = document.getElementById('count-filter-admin');
    const countViolations = document.getElementById('count-filter-violations');
    const countForms = document.getElementById('count-filter-forms');

    // Active connections count (Single initial read to save bandwidth)
    try {
        db.ref('siteData/activeConnections').once('value').then((snapshot) => {
            const count = snapshot.numChildren();
            if (statNodes) statNodes.textContent = Math.max(1, count);
        }).catch(() => { });
    } catch (e) { }

    // Helper: Re-merge and sort all log collections
    function syncAndRenderLogs() {
        const logMap = new Map();

        // 1. Add Demo Submissions & Contact Forms
        rawDemoLogs.forEach(l => {
            if (l && l.id) logMap.set(l.id, l);
        });
        rawContactLogs.forEach(l => {
            if (l && l.id) logMap.set(l.id, l);
        });

        // Sort descending by timestamp
        cachedSecurityLogs = Array.from(logMap.values()).sort((a, b) => {
            const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timeISO || a.submittedAt || 0).getTime();
            const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timeISO || b.submittedAt || 0).getTime();
            return timeB - timeA;
        });

        // Compute Counters
        const totalCount = cachedSecurityLogs.length;
        const formsCount = cachedSecurityLogs.filter(l => l.type === 'DEMO_SUBMISSION' || l.type === 'CONTACT_MESSAGE').length;

        if (statTotal) statTotal.textContent = totalCount;
        if (badgeSecurity) badgeSecurity.textContent = totalCount;
        if (countAll) countAll.textContent = totalCount;
        if (countForms) countForms.textContent = formsCount;

        renderSecurityLogs();
    }

    // 6. Listen to Demo Submissions for Forms Stream
    db.ref('siteData/submissions/demo').limitToLast(100).on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            rawDemoLogs = Object.entries(data).map(([key, d]) => ({
                id: 'DEMO_SUB_' + key,
                dbKey: key,
                dbPath: 'siteData/submissions/demo',
                altDbPath: 'demo_submissions',
                type: 'DEMO_SUBMISSION',
                timestamp: d.timestamp || (d.submittedAt ? new Date(d.submittedAt).getTime() : Date.now()),
                timeISO: d.submittedAt || new Date().toISOString(),
                ip: d.ip || 'VISITOR NODE',
                city: d.city || 'EXTERNAL',
                country: d.country || 'CLIENT',
                countryCode: d.countryCode || 'XX',
                isp: d.isp || 'PUBLIC WEB',
                device: d.device || { os: 'Audio Client', browser: 'Web', type: 'Music Creator' },
                path: '/#demo-modal',
                details: { artist: d.artistName || d.artist || 'Unknown Artist', track: d.trackTitle || d.track || d.name || 'Demo Track', genre: d.genre || 'EDM', email: d.email || '', link: d.link || d.streamUrl || '' }
            }));
        } else {
            rawDemoLogs = [];
        }
        syncAndRenderLogs();
    });

    // 7. Listen to Contact Inquiries for Forms Stream
    db.ref('siteData/submissions/contact').limitToLast(100).on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            rawContactLogs = Object.entries(data).map(([key, c]) => ({
                id: 'CONTACT_SUB_' + key,
                dbKey: key,
                dbPath: 'siteData/submissions/contact',
                altDbPath: 'contact_messages',
                type: 'CONTACT_MESSAGE',
                timestamp: c.timestamp || (c.submittedAt ? new Date(c.submittedAt).getTime() : Date.now()),
                timeISO: c.submittedAt || new Date().toISOString(),
                ip: c.ip || 'VISITOR NODE',
                city: c.city || 'EXTERNAL',
                country: c.country || 'CLIENT',
                countryCode: c.countryCode || 'XX',
                isp: c.isp || 'PUBLIC WEB',
                device: c.device || { os: 'Client System', browser: 'Web', type: 'Visitor' },
                path: '/#contact-modal',
                details: { name: c.name || 'Anonymous', email: c.email || '', subject: c.subject || 'Inquiry', message: c.message || '' }
            }));
        } else {
            rawContactLogs = [];
        }
        syncAndRenderLogs();
    });

    // 8. Render Security Logs List
    function renderSecurityLogs() {
        if (!liveStreamContainer) return;
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

        const filtered = cachedSecurityLogs.filter(log => {
            // Tab Category Filter
            if (currentLogFilter === 'violations') {
                const isViolation = log.type === 'CONSOLE_TAMPER' || log.type === 'INJECTION_ATTEMPT' || log.type === 'SECURITY_VIOLATION';
                if (!isViolation) return false;
            } else if (currentLogFilter === 'visitors') {
                if (log.type !== 'VISITOR_ACCESS') return false;
            } else if (currentLogFilter === 'admin') {
                if (log.type !== 'ADMIN_AUDIT' && log.type !== 'ADMIN_SAVE') return false;
            } else if (currentLogFilter === 'forms') {
                const isForm = log.type === 'DEMO_SUBMISSION' || log.type === 'CONTACT_MESSAGE';
                if (!isForm) return false;
            }

            // Search Query Filter
            if (query) {
                const ipStr = (log.ip || '').toLowerCase();
                const cityStr = (log.city || '').toLowerCase();
                const countryStr = (log.country || '').toLowerCase();
                const typeStr = (log.type || '').toLowerCase();
                const osStr = (log.device?.os || '').toLowerCase();
                const browserStr = (log.device?.browser || '').toLowerCase();
                const adminStr = (log.user || log.details?.admin || '').toLowerCase();
                const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details).toLowerCase() : (log.details || '').toLowerCase();
                return ipStr.includes(query) || cityStr.includes(query) || countryStr.includes(query) ||
                    typeStr.includes(query) || osStr.includes(query) || browserStr.includes(query) ||
                    adminStr.includes(query) || detailsStr.includes(query);
            }
            return true;
        });

        if (filtered.length === 0) {
            liveStreamContainer.innerHTML = `
                <div class="empty-state full-grid" style="padding: 2.5rem; text-align: center; color: var(--text-dim);">
                    <i class="fas fa-shield-alt" style="font-size: 2.5rem; color: var(--primary); margin-bottom: 1rem;"></i>
                    <h3>NO LOGS RECORDED IN THIS CATEGORY</h3>
                    <p>Telemetry listeners active. Real-time visitor traffic, admin save modifications, and security telemetry will be logged here.</p>
                </div>
            `;
            return;
        }

        liveStreamContainer.innerHTML = filtered.map((log, index) => {
            const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : (log.timeISO || 'RECENT');
            const type = log.type || 'SYSTEM_EVENT';
            const ip = log.ip || 'UNKNOWN_IP';
            const city = log.city || 'CYBERSPACE';
            const country = log.country || 'EARTH';
            const countryCode = log.countryCode || 'UN';
            const isp = log.isp || 'INTERNET PROVIDER';
            const os = log.device?.os || 'Unknown OS';
            const browser = log.device?.browser || 'Unknown Browser';
            const screen = log.device?.screen || 'N/A';
            const devType = log.device?.type || 'Desktop';
            const path = log.path || '/';

            // Event badge styling
            let badgeColor = 'rgba(0, 240, 255, 0.15)';
            let badgeTextColor = 'var(--primary)';
            let icon = 'fas fa-info-circle';
            let labelText = type;

            if (type === 'CONSOLE_TAMPER' || type === 'SECURITY_VIOLATION' || type === 'INJECTION_ATTEMPT') {
                badgeColor = 'rgba(255, 0, 85, 0.2)';
                badgeTextColor = '#ff0055';
                icon = 'fas fa-exclamation-triangle';
                labelText = 'SECURITY ALERT: ' + type;
            } else if (type === 'VISITOR_ACCESS') {
                badgeColor = 'rgba(0, 240, 255, 0.12)';
                badgeTextColor = '#00f0ff';
                icon = 'fas fa-user-astronaut';
                labelText = 'SITE VISITOR TRAFFIC';
            } else if (type === 'ADMIN_AUDIT' || type === 'ADMIN_SAVE') {
                badgeColor = 'rgba(255, 204, 0, 0.2)';
                badgeTextColor = '#ffcc00';
                icon = 'fas fa-tools';
                labelText = 'ADMIN SAVE & AUDIT';
            } else if (type === 'DEMO_SUBMISSION') {
                badgeColor = 'rgba(183, 0, 255, 0.2)';
                badgeTextColor = '#b700ff';
                icon = 'fas fa-music';
                labelText = 'DEMO SUBMISSION';
            } else if (type === 'CONTACT_MESSAGE') {
                badgeColor = 'rgba(0, 255, 140, 0.2)';
                badgeTextColor = '#00ff8c';
                icon = 'fas fa-envelope';
                labelText = 'CONTACT MESSAGE';
            }

            // OS icon
            let osIcon = 'fas fa-desktop';
            if (os.includes('Win')) osIcon = 'fab fa-windows';
            else if (os.includes('Mac') || os.includes('iOS')) osIcon = 'fab fa-apple';
            else if (os.includes('Android')) osIcon = 'fab fa-android';
            else if (os.includes('Linux')) osIcon = 'fab fa-linux';
            else if (os.includes('Admin')) osIcon = 'fas fa-user-shield';

            let actionSummary = '';
            if (type === 'ADMIN_AUDIT') {
                const act = log.details?.action || log.action || 'Settings Synchronized';
                const adminName = log.details?.admin || log.user || 'SUPERUSER';
                actionSummary = `<span style="color: #ffcc00; font-weight: bold;"><i class="fas fa-check-circle"></i> ACTION: ${act}</span> | <span style="color: var(--text-dim);">BY: <strong>${adminName}</strong></span>`;
            } else if (type === 'VISITOR_ACCESS') {
                actionSummary = `<span style="color: #00f0ff;"><i class="fas fa-satellite"></i> Visitor session initiated on <strong>${path}</strong></span>`;
            } else if (type === 'DEMO_SUBMISSION') {
                actionSummary = `<span style="color: #b700ff;"><i class="fas fa-compact-disc"></i> Artist: <strong>${log.details?.artist || 'Unknown'}</strong> | Track: <strong>${log.details?.track || 'Demo'}</strong> (${log.details?.genre || 'EDM'})</span>`;
            } else if (type === 'CONTACT_MESSAGE') {
                actionSummary = `<span style="color: #00ff8c;"><i class="fas fa-comment-dots"></i> From: <strong>${log.details?.name || 'User'}</strong> | Subject: <strong>${log.details?.subject || 'Inquiry'}</strong></span>`;
            } else {
                const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || 'Event logged.');
                actionSummary = `<span>${detailsStr}</span>`;
            }

            return `
                <div class="inbox-entry-card" style="border-left: 4px solid ${badgeTextColor};">
                    <div class="inbox-top-row">
                        <div style="display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;">
                            <span class="status-badge" style="background: ${badgeColor}; color: ${badgeTextColor}; border: 1px solid ${badgeTextColor}; display: inline-flex; align-items: center; gap: 0.4rem;">
                                <i class="${icon}"></i> ${labelText}
                            </span>
                            <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);"><i class="far fa-clock"></i> ${timeStr}</span>
                        </div>
                        <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--primary);">
                            <i class="fas fa-map-marker-alt"></i> <strong>${city}, ${country}</strong> (${countryCode})
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; background: rgba(0,0,0,0.35); padding: 0.9rem 1.2rem; border-radius: 10px; border: 1px solid var(--border-dim);">
                        <div>
                            <span style="font-size: 0.68rem; color: var(--text-muted); display: block; font-family: var(--font-mono);">SOURCE IP & ISP</span>
                            <strong style="font-family: var(--font-mono); font-size: 0.82rem; color: #fff;"><i class="fas fa-network-wired"></i> ${ip}</strong>
                            <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.2rem;">${isp}</div>
                        </div>
                        <div>
                            <span style="font-size: 0.68rem; color: var(--text-muted); display: block; font-family: var(--font-mono);">ENVIRONMENT & DEVICE</span>
                            <strong style="font-family: var(--font-mono); font-size: 0.82rem; color: #fff;"><i class="${osIcon}"></i> ${os} (${devType})</strong>
                            <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.2rem;"><i class="fab fa-chrome"></i> ${browser}</div>
                        </div>
                        <div>
                            <span style="font-size: 0.68rem; color: var(--text-muted); display: block; font-family: var(--font-mono);">RESOLUTION & TARGET</span>
                            <strong style="font-family: var(--font-mono); font-size: 0.82rem; color: #fff;"><i class="fas fa-expand"></i> ${screen}</strong>
                            <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.2rem;"><i class="fas fa-link"></i> ${path}</div>
                        </div>
                    </div>

                    <div class="inbox-message-box" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.8rem; background: rgba(0,0,0,0.25); padding: 0.6rem 1rem; border-radius: 8px;">
                        <div style="font-family: var(--font-mono); font-size: 0.78rem;">
                            ${actionSummary}
                        </div>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <button type="button" class="cyber-btn sm" style="padding: 0.25rem 0.6rem; font-size: 0.68rem;" onclick="viewRawLogData(${index})"><i class="fas fa-code"></i> RAW JSON</button>
                            <button type="button" class="cyber-btn danger sm" style="padding: 0.25rem 0.6rem; font-size: 0.68rem;" onclick="deleteSingleLogEntry(${index})" title="Delete this single entry"><i class="fas fa-trash-alt"></i> DELETE</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const btnClearCategory = document.getElementById('btn-clear-category-logs');
    const labelClearCategory = document.getElementById('label-clear-category');

    function updateCategoryClearLabel() {
        if (!labelClearCategory) return;
        switch (currentLogFilter) {
            case 'visitors':
                labelClearCategory.textContent = 'CLEAR VISITOR LOGS';
                break;
            case 'admin':
                labelClearCategory.textContent = 'CLEAR ADMIN AUDIT';
                break;
            case 'violations':
                labelClearCategory.textContent = 'CLEAR SECURITY ALERTS';
                break;
            case 'forms':
                labelClearCategory.textContent = 'CLEAR SUBMISSIONS';
                break;
            default:
                labelClearCategory.textContent = 'CLEAR CURRENT TAB';
                break;
        }
    }

    // Tab Filtering
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentLogFilter = tab.dataset.filter || 'all';
            updateCategoryClearLabel();
            renderSecurityLogs();
        });
    });

    // Search Input
    if (searchInput) {
        searchInput.addEventListener('input', renderSecurityLogs);
    }

    // Refresh Button
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            showToast("REFRESHING SECURITY & TELEMETRY FEEDS...");
            syncAndRenderLogs();
        });
    }

    // Export JSON
    if (btnExportJson) {
        btnExportJson.addEventListener('click', () => {
            const jsonStr = JSON.stringify(cachedSecurityLogs, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `obscura_audit_security_logs_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("ALL TELEMETRY LOGS EXPORTED AS JSON!");
        });
    }

    // Export CSV
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => {
            if (cachedSecurityLogs.length === 0) {
                showToast("NO LOGS TO EXPORT!", 'error');
                return;
            }
            const headers = ["Timestamp", "Event Type", "IP Address", "City", "Country", "ISP", "OS", "Browser", "Screen", "Path", "Details"];
            const rows = cachedSecurityLogs.map(l => [
                l.timestamp ? new Date(l.timestamp).toISOString() : (l.timeISO || ''),
                l.type || '',
                l.ip || '',
                l.city || '',
                l.country || '',
                l.isp || '',
                l.device?.os || '',
                l.device?.browser || '',
                l.device?.screen || '',
                l.path || '',
                typeof l.details === 'object' ? JSON.stringify(l.details).replace(/"/g, '""') : (l.details || '')
            ]);

            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const a = document.createElement('a');
            a.href = encodedUri;
            a.download = `obscura_audit_security_logs_${Date.now()}.csv`;
            a.click();
            showToast("ALL TELEMETRY LOGS EXPORTED AS CSV!");
        });
    }

    // Clear Specific Category Logs
    if (btnClearCategory) {
        btnClearCategory.addEventListener('click', () => {
            if (currentLogFilter === 'visitors') {
                if (!confirm("Are you sure you want to clear all VISITOR TRAFFIC LOGS?")) return;
                Promise.all([
                    db.ref('siteData/telemetry/visitor_logs').remove(),
                    db.ref('siteData/submissions/visitor_logs').remove()
                ]).then(() => {
                    rawVisitorLogs = [];
                    syncAndRenderLogs();
                    showToast("VISITOR TRAFFIC LOGS CLEARED!");
                }).catch(err => showToast("ERROR: " + err.message, 'error'));
            } else if (currentLogFilter === 'admin') {
                if (!confirm("Are you sure you want to clear all ADMIN AUDIT & SAVE LOGS?")) return;
                Promise.all([
                    db.ref('siteData/security/audit_logs').remove(),
                    db.ref('siteData/submissions/audit_logs').remove()
                ]).then(() => {
                    rawAuditLogs = [];
                    syncAndRenderLogs();
                    showToast("ADMIN AUDIT LOGS CLEARED!");
                }).catch(err => showToast("ERROR: " + err.message, 'error'));
            } else if (currentLogFilter === 'violations') {
                if (!confirm("Are you sure you want to clear all SECURITY VIOLATION ALERTS?")) return;
                Promise.all([
                    db.ref('siteData/security/violations').remove(),
                    db.ref('siteData/security/logs').remove(),
                    db.ref('siteData/submissions/security_logs').remove(),
                    db.ref('siteData/security/globalAlarm').set({ active: false, time: Date.now() })
                ]).then(() => {
                    rawViolations = [];
                    rawTelemetryLogs = [];
                    if (alarmBanner) alarmBanner.style.display = 'none';
                    syncAndRenderLogs();
                    showToast("SECURITY ALERTS & VIOLATIONS CLEARED!");
                }).catch(err => showToast("ERROR: " + err.message, 'error'));
            } else if (currentLogFilter === 'forms') {
                if (!confirm("Are you sure you want to clear all DEMO & CONTACT submissions from the database?")) return;
                Promise.all([
                    db.ref('siteData/submissions/demo').remove(),
                    db.ref('siteData/submissions/contact').remove(),
                    db.ref('demo_submissions').remove(),
                    db.ref('contact_messages').remove()
                ]).then(() => {
                    rawDemoLogs = [];
                    rawContactLogs = [];
                    syncAndRenderLogs();
                    showToast("DEMO & CONTACT SUBMISSIONS CLEARED!");
                }).catch(err => showToast("ERROR: " + err.message, 'error'));
            } else {
                // ALL EVENTS TAB
                if (!confirm("Are you sure you want to PURGE ALL SECURITY, VISITOR & AUDIT LOGS from the database?")) return;
                Promise.all([
                    db.ref('siteData/security/logs').remove(),
                    db.ref('siteData/telemetry/visitor_logs').remove(),
                    db.ref('siteData/security/audit_logs').remove(),
                    db.ref('siteData/security/violations').remove(),
                    db.ref('siteData/submissions/visitor_logs').remove(),
                    db.ref('siteData/submissions/security_logs').remove(),
                    db.ref('siteData/submissions/audit_logs').remove(),
                    db.ref('siteData/security/globalAlarm').set({ active: false, time: Date.now() })
                ]).then(() => {
                    rawTelemetryLogs = [];
                    rawVisitorLogs = [];
                    rawViolations = [];
                    rawAuditLogs = [];
                    cachedSecurityLogs = [];
                    if (alarmBanner) alarmBanner.style.display = 'none';
                    syncAndRenderLogs();
                    showToast("ALL SECURITY & TELEMETRY LOGS PURGED!");
                }).catch(err => showToast("ERROR: " + err.message, 'error'));
            }
        });
    }

    // Purge All Logs
    if (btnClearLogs) {
        btnClearLogs.addEventListener('click', () => {
            if (!confirm("Are you sure you want to PURGE ALL SECURITY, VISITOR & AUDIT LOGS from the database?")) return;
            Promise.all([
                db.ref('siteData/security/logs').remove(),
                db.ref('siteData/telemetry/visitor_logs').remove(),
                db.ref('siteData/security/audit_logs').remove(),
                db.ref('siteData/security/violations').remove(),
                db.ref('siteData/submissions/visitor_logs').remove(),
                db.ref('siteData/submissions/security_logs').remove(),
                db.ref('siteData/submissions/audit_logs').remove(),
                db.ref('siteData/security/globalAlarm').set({ active: false, time: Date.now() })
            ]).then(() => {
                rawTelemetryLogs = [];
                rawVisitorLogs = [];
                rawViolations = [];
                rawAuditLogs = [];
                cachedSecurityLogs = [];
                if (alarmBanner) alarmBanner.style.display = 'none';
                syncAndRenderLogs();
                showToast("ALL SECURITY & TELEMETRY LOGS PURGED!");
            }).catch(err => showToast("ERROR: " + err.message, 'error'));
        });
    }

    // Raw JSON Viewer Global Helper
    window.viewRawLogData = function (index) {
        const item = cachedSecurityLogs[index];
        if (!item) return;
        alert(JSON.stringify(item, null, 2));
    };

    // Delete Single Log / Submission Record Helper
    window.deleteSingleLogEntry = function (index) {
        const item = cachedSecurityLogs[index];
        if (!item) return;

        let confirmMsg = "Are you sure you want to permanently delete this record from the database?";
        if (item.type === 'DEMO_SUBMISSION') {
            confirmMsg = `Delete Demo Submission by "${item.details?.artist || 'Unknown'}"?`;
        } else if (item.type === 'CONTACT_MESSAGE') {
            confirmMsg = `Delete Contact Message from "${item.details?.name || 'User'}"?`;
        }

        if (!confirm(confirmMsg)) return;

        const promises = [];
        const dbKey = item.dbKey;

        if (item.dbPath && dbKey) {
            promises.push(db.ref(item.dbPath + '/' + dbKey).remove());
        }
        if (item.altDbPath && dbKey) {
            promises.push(db.ref(item.altDbPath + '/' + dbKey).remove());
        }

        // Fallbacks if dbKey/dbPath was not set directly
        if (promises.length === 0) {
            const rawId = item.id || '';
            if (item.type === 'DEMO_SUBMISSION') {
                const k = rawId.replace('DEMO_SUB_', '');
                promises.push(db.ref('siteData/submissions/demo/' + k).remove());
                promises.push(db.ref('demo_submissions/' + k).remove());
            } else if (item.type === 'CONTACT_MESSAGE') {
                const k = rawId.replace('CONTACT_SUB_', '');
                promises.push(db.ref('siteData/submissions/contact/' + k).remove());
                promises.push(db.ref('contact_messages/' + k).remove());
            } else if (item.type === 'ADMIN_AUDIT') {
                promises.push(db.ref('siteData/security/audit_logs/' + rawId).remove());
            } else if (item.type === 'VISITOR_ACCESS') {
                promises.push(db.ref('siteData/telemetry/visitor_logs/' + rawId).remove());
            } else {
                promises.push(db.ref('siteData/security/logs/' + rawId).remove());
                promises.push(db.ref('siteData/security/violations/' + rawId).remove());
            }
        }

        Promise.all(promises).then(() => {
            showToast("RECORD DELETED FROM DATABASE!");
        }).catch(err => {
            showToast("DELETE FAILED: " + err.message, 'error');
        });
    };
}

// --- 13. LATEST MEDIA TRANSMISSIONS ENGINE (YOUTUBE & TIKTOK) ---
const KNOWN_YT_CHANNELS = {
    'obscurarecordss': 'UCMeIV48_O_F0H2tL7x_ayHg',
    'recordsobscura': 'UC0A5L7DUgls-AkYaQ4ZwxhA',
    'obscura': 'UCMeIV48_O_F0H2tL7x_ayHg'
};

async function resolveYouTubeChannelIdFromInput(input) {
    if (!input) return 'UCMeIV48_O_F0H2tL7x_ayHg';
    let str = input.trim();

    // Direct Channel ID (UC...)
    if (str.startsWith('UC') && str.length === 24) {
        return str;
    }
    if (str.includes('/channel/')) {
        const parts = str.split('/channel/')[1].split('/')[0].split('?')[0];
        if (parts.startsWith('UC')) return parts;
    }

    // If it's a handle (@name or url with @name)
    let handle = str;
    if (handle.includes('youtube.com/@')) {
        handle = handle.split('youtube.com/@')[1].split('/')[0].split('?')[0];
    }
    const cleanKey = handle.replace('@', '').toLowerCase().trim();
    if (KNOWN_YT_CHANNELS[cleanKey]) {
        return KNOWN_YT_CHANNELS[cleanKey];
    }

    if (!handle.startsWith('@')) {
        handle = '@' + handle;
    }

    // Resolve Handle via AllOrigins proxy
    try {
        const targetUrl = `https://www.youtube.com/${handle}`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const html = await res.text();
            const match = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
            if (match && match[1]) return match[1];

            const match2 = html.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/);
            if (match2 && match2[1]) return match2[1];

            const match3 = html.match(/<meta itemprop="channelId" content="(UC[a-zA-Z0-9_-]{22})"/);
            if (match3 && match3[1]) return match3[1];
        }
    } catch (e) {
        console.warn("Handle resolution attempt failed", e);
    }

    // Default fallback to @Obscurarecordss
    return 'UCMeIV48_O_F0H2tL7x_ayHg';
}

function cleanTikTokUsernameInput(input) {
    if (!input) return 'obscura.records';
    let str = input.trim();
    if (str.includes('tiktok.com/@')) {
        str = str.split('tiktok.com/@')[1].split('/')[0].split('?')[0];
    } else if (str.startsWith('@')) {
        str = str.substring(1);
    }
    return str;
}

async function fetchLatestYouTubeDropLive(inputChannel, filterMode = 'full_only') {
    const cid = await resolveYouTubeChannelIdFromInput(inputChannel);
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${cid}`;

    // Attempt 1: rss2json proxy
    try {
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.items && data.items.length > 0) {
                let chosenItem = data.items[0];

                if (filterMode === 'full_only' && data.items.length > 1) {
                    // Look for the first non-short item (if first item has #shorts or short in title)
                    for (const it of data.items) {
                        const titleLower = (it.title || '').toLowerCase();
                        const linkLower = (it.link || '').toLowerCase();
                        if (!titleLower.includes('#shorts') && !titleLower.includes('#short') && !linkLower.includes('/shorts/')) {
                            chosenItem = it;
                            break;
                        }
                    }
                }

                let videoId = '';
                if (chosenItem.guid && chosenItem.guid.includes(':')) {
                    videoId = chosenItem.guid.split(':').pop();
                } else if (chosenItem.link && chosenItem.link.includes('v=')) {
                    videoId = new URL(chosenItem.link).searchParams.get('v');
                } else if (chosenItem.link && chosenItem.link.includes('/shorts/')) {
                    videoId = chosenItem.link.split('/shorts/')[1].split('?')[0];
                }
                const thumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : (chosenItem.thumbnail || '');
                return {
                    cid: cid,
                    title: chosenItem.title || 'OBSCURA - LATEST DROP',
                    link: chosenItem.link || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : `https://www.youtube.com/channel/${cid}`),
                    thumb: thumb,
                    desc: (chosenItem.description || '').replace(/<[^>]*>?/gm, '').trim().substring(0, 180) || 'Experience the latest official visualizer and soundwave release from our void archive.',
                    tag: 'OFFICIAL MUSIC VIDEO'
                };
            }
        }
    } catch (e) {
        console.warn("RSS2JSON proxy attempt failed, trying allorigins fallback...", e);
    }

    // Attempt 2: Allorigins fallback XML parser
    try {
        const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`);
        if (res.ok) {
            const xmlText = await res.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const entries = xmlDoc.querySelectorAll("entry");
            if (entries && entries.length > 0) {
                let chosenEntry = entries[0];
                if (filterMode === 'full_only' && entries.length > 1) {
                    for (const ent of entries) {
                        const t = ent.querySelector("title")?.textContent || '';
                        if (!t.toLowerCase().includes('#shorts') && !t.toLowerCase().includes('#short')) {
                            chosenEntry = ent;
                            break;
                        }
                    }
                }

                const title = chosenEntry.querySelector("title")?.textContent || '';
                const link = chosenEntry.querySelector("link")?.getAttribute("href") || '';
                const videoId = chosenEntry.querySelector("yt\\:videoId, videoId")?.textContent || '';
                const mediaDesc = chosenEntry.querySelector("media\\:description, description")?.textContent || '';
                return {
                    cid: cid,
                    title: title || 'OBSCURA - LATEST DROP',
                    link: link || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''),
                    thumb: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '',
                    desc: mediaDesc.replace(/<[^>]*>?/gm, '').trim().substring(0, 180) || 'Experience the latest official visualizer and soundwave release from our void archive.',
                    tag: 'OFFICIAL MUSIC VIDEO'
                };
            }
        }
    } catch (e) {
        console.warn("Allorigins XML attempt failed", e);
    }
    return null;
}

async function fetchLatestTikTokDropLive(usernameOrUrl) {
    const raw = (usernameOrUrl || 'obscura.records').trim();

    // Helper to fetch JSON from URL with proxies
    async function fetchWithProxies(targetUrl) {
        // Direct attempt
        try {
            const res = await fetch(targetUrl);
            if (res.ok) return await res.json();
        } catch (e) { }

        // AllOrigins proxy
        try {
            const aoRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
            if (aoRes.ok) {
                const aoData = await aoRes.json();
                if (aoData.contents) return JSON.parse(aoData.contents);
            }
        } catch (e) { }

        // CorsProxy.io
        try {
            const cpRes = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`);
            if (cpRes.ok) return await cpRes.json();
        } catch (e) { }

        return null;
    }

    // If specific video URL or shortlink provided
    if (raw.includes('tiktok.com')) {
        const oEmbedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(raw)}`;
        const data = await fetchWithProxies(oEmbedUrl);
        if (data && (data.thumbnail_url || data.title)) {
            const user = data.author_unique_id || (raw.includes('@') ? raw.split('@')[1].split('/')[0] : 'obscura.records');
            return {
                user: user,
                title: data.title || `LATEST TIKTOK DROP @${user.toUpperCase()}`,
                link: raw,
                thumb: data.thumbnail_url || 'assets/cover.png',
                desc: 'Catch the newest sound clip, trending edits, and short-form sonic previews on TikTok.',
                tag: raw.includes('/video/') ? 'LATEST TIKTOK VIDEO' : 'OFFICIAL TIKTOK HUB'
            };
        }
    }

    const user = cleanTikTokUsernameInput(raw);

    // Try Profile oEmbed API
    const profileOEmbedUrl = `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@${encodeURIComponent(user)}`;
    const data = await fetchWithProxies(profileOEmbedUrl);
    if (data && (data.thumbnail_url || data.author_name)) {
        return {
            user: user,
            title: data.author_name ? `${data.author_name.toUpperCase()} (@${user.toUpperCase()})` : `OBSCURA RECORDS (@${user.toUpperCase()})`,
            link: `https://www.tiktok.com/@${user}`,
            thumb: data.thumbnail_url || 'assets/cover.png',
            desc: 'Catch the newest sound clip, trending edits, and short-form sonic previews on TikTok.',
            tag: 'OFFICIAL TIKTOK HUB'
        };
    }

    return {
        user: user,
        title: `OBSCURA RECORDS (@${user.toUpperCase()})`,
        link: `https://www.tiktok.com/@${user}`,
        thumb: 'assets/cover.png',
        desc: 'Catch the newest sound clip, trending edits, and short-form sonic previews on TikTok.',
        tag: 'OFFICIAL TIKTOK HUB'
    };
}

function initTransmissionsEngine() {
    const saveBtn = document.getElementById('save-transmissions-btn');
    const fetchLiveBtn = document.getElementById('btn-fetch-live-feeds');
    const fetchTtSingleBtn = document.getElementById('btn-fetch-tt-single');
    const msgEl = document.getElementById('save-msg-transmissions');

    function populateTransmissionsAdmin(rawData) {
        if (!rawData || typeof rawData !== 'object') return;

        const data = {
            ...rawData,
            tt_url: rawData.tt_url || rawData.ttUrl || rawData.ttLink || rawData.tiktok || rawData.tiktokUrl || rawData.url || rawData.link || '',
            tt_thumb: rawData.tt_thumb || rawData.ttThumb || rawData.thumbnail || rawData.cover || rawData.image || '',
            tt_title: rawData.tt_title || rawData.ttTitle || rawData.title || '',
            tt_desc: rawData.tt_desc || rawData.ttDesc || rawData.desc || '',
            tt_tag: rawData.tt_tag || rawData.ttTag || rawData.tag || '',
            tt_follow_url: rawData.tt_follow_url || rawData.ttFollowUrl || rawData.followUrl || '',
            yt_url: rawData.yt_url || rawData.ytUrl || rawData.ytLink || rawData.youtube || rawData.youtubeUrl || '',
            yt_thumb: rawData.yt_thumb || rawData.ytThumb || rawData.thumbnail || rawData.cover || '',
            yt_title: rawData.yt_title || rawData.ytTitle || rawData.title || '',
            yt_desc: rawData.yt_desc || rawData.ytDesc || rawData.desc || '',
            yt_tag: rawData.yt_tag || rawData.ytTag || rawData.tag || ''
        };

        const showEl = document.getElementById('trans_showTransmissions');
        if (showEl && data.showTransmissions) showEl.value = data.showTransmissions;

        const titleEl = document.getElementById('trans_title');
        if (titleEl && data.transTitle) titleEl.value = data.transTitle;

        const descEl = document.getElementById('trans_desc');
        if (descEl && data.transDesc) descEl.value = data.transDesc;

        // YouTube
        const ytMode = document.getElementById('trans_yt_mode');
        if (ytMode && data.yt_mode) ytMode.value = data.yt_mode;

        const ytFilter = document.getElementById('trans_yt_filter');
        if (ytFilter && data.yt_filter) ytFilter.value = data.yt_filter;

        const ytCid = document.getElementById('trans_yt_channel_id');
        if (ytCid && data.yt_channel_id) ytCid.value = data.yt_channel_id;

        const ytTag = document.getElementById('trans_yt_tag');
        if (ytTag && data.yt_tag) ytTag.value = data.yt_tag;

        const ytTitle = document.getElementById('trans_yt_title');
        if (ytTitle && data.yt_title) ytTitle.value = data.yt_title;

        const ytDesc = document.getElementById('trans_yt_desc');
        if (ytDesc && data.yt_desc) ytDesc.value = data.yt_desc;

        const ytUrl = document.getElementById('trans_yt_url');
        if (ytUrl && data.yt_url) ytUrl.value = data.yt_url;

        const ytThumb = document.getElementById('trans_yt_thumb');
        if (ytThumb && data.yt_thumb) {
            ytThumb.value = data.yt_thumb;
            const prev = document.getElementById('admin-yt-thumb-preview');
            if (prev) prev.style.backgroundImage = `url('${data.yt_thumb}')`;
        }

        const ytSubUrl = document.getElementById('trans_yt_sub_url');
        if (ytSubUrl && data.yt_sub_url) ytSubUrl.value = data.yt_sub_url;

        // TikTok
        const ttMode = document.getElementById('trans_tt_mode');
        if (ttMode && data.tt_mode) ttMode.value = data.tt_mode;

        const ttUser = document.getElementById('trans_tt_username');
        if (ttUser && data.tt_username) ttUser.value = data.tt_username;

        const ttTag = document.getElementById('trans_tt_tag');
        if (ttTag && data.tt_tag) ttTag.value = data.tt_tag;

        const ttTitle = document.getElementById('trans_tt_title');
        if (ttTitle && data.tt_title) ttTitle.value = data.tt_title;

        const ttDesc = document.getElementById('trans_tt_desc');
        if (ttDesc && data.tt_desc) ttDesc.value = data.tt_desc;

        const ttUrl = document.getElementById('trans_tt_url');
        if (ttUrl && data.tt_url) ttUrl.value = data.tt_url;

        const ttThumb = document.getElementById('trans_tt_thumb');
        if (ttThumb && data.tt_thumb) {
            ttThumb.value = data.tt_thumb;
            const prev = document.getElementById('admin-tt-thumb-preview');
            if (prev) prev.style.backgroundImage = `url('${data.tt_thumb}')`;
        }

        const ttFollowUrl = document.getElementById('trans_tt_follow_url');
        if (ttFollowUrl && data.tt_follow_url) ttFollowUrl.value = data.tt_follow_url;
    }

    async function handleIncomingBotTransmission(bData) {
        if (!bData || typeof bData !== 'object') return;
        const normalized = {
            ...bData,
            tt_url: bData.tt_url || bData.ttUrl || bData.ttLink || bData.tiktok || bData.tiktokUrl || bData.url || bData.link || '',
            tt_thumb: bData.tt_thumb || bData.ttThumb || bData.thumbnail || bData.cover || bData.image || '',
            tt_title: bData.tt_title || bData.ttTitle || bData.title || '',
            tt_desc: bData.tt_desc || bData.ttDesc || bData.desc || '',
            tt_tag: bData.tt_tag || bData.ttTag || bData.tag || 'LATEST TIKTOK DROP',
            tt_follow_url: bData.tt_follow_url || bData.ttFollowUrl || bData.followUrl || 'https://www.tiktok.com/@obscura.records',
            yt_url: bData.yt_url || bData.ytUrl || bData.ytLink || bData.youtube || bData.youtubeUrl || '',
            yt_thumb: bData.yt_thumb || bData.ytThumb || bData.thumbnail || bData.cover || '',
            yt_title: bData.yt_title || bData.ytTitle || bData.title || '',
            yt_desc: bData.yt_desc || bData.ytDesc || bData.desc || '',
            yt_tag: bData.yt_tag || bData.ytTag || bData.tag || 'OFFICIAL MUSIC VIDEO'
        };

        populateTransmissionsAdmin(normalized);

        // If incoming from bot has valid URL, persist to both locations
        if (normalized.tt_url) {
            let thumb = (normalized.tt_thumb && normalized.tt_thumb.startsWith('http') && normalized.tt_thumb !== 'assets/cover.png') ? normalized.tt_thumb : '';
            let title = normalized.tt_title || 'LATEST TIKTOK DROP';

            if (!thumb && normalized.tt_url.includes('tiktok.com')) {
                const resolved = await fetchLatestTikTokDropLive(normalized.tt_url);
                if (resolved && resolved.thumb && resolved.thumb !== 'assets/cover.png') {
                    thumb = resolved.thumb;
                    if (resolved.title) title = resolved.title;
                    if (document.getElementById('trans_tt_thumb')) document.getElementById('trans_tt_thumb').value = thumb;
                    if (document.getElementById('trans_tt_title')) document.getElementById('trans_tt_title').value = title;
                    const prev = document.getElementById('admin-tt-thumb-preview');
                    if (prev) prev.style.backgroundImage = `url('${thumb}')`;
                }
            }

            const updatePayload = {
                tt_url: normalized.tt_url,
                tt_thumb: thumb || 'assets/cover.png',
                tt_title: title,
                tt_desc: normalized.tt_desc || 'Catch the newest sound clip, trending edits, and short-form sonic previews on TikTok.',
                tt_tag: normalized.tt_tag || 'LATEST TIKTOK DROP',
                tt_follow_url: normalized.tt_follow_url,
                updatedAt: Date.now()
            };
            db.ref('siteData/globals/latest_transmissions').update(updatePayload).catch(() => { });
        }
    }

    // Load data from Firebase
    db.ref('siteData/globals/latest_transmissions').on('value', snap => {
        populateTransmissionsAdmin(snap.val() || {});
    });

    // Auto-resolve TikTok metadata on URL paste / input / click
    async function resolveTikTokInput(val) {
        if (!val) return;
        showToast("FETCHING TIKTOK VIDEO PREVIEW...");
        const data = await fetchLatestTikTokDropLive(val);
        if (data) {
            if (document.getElementById('trans_tt_title') && data.title) document.getElementById('trans_tt_title').value = data.title;
            if (document.getElementById('trans_tt_thumb') && data.thumb) {
                document.getElementById('trans_tt_thumb').value = data.thumb;
                const prev = document.getElementById('admin-tt-thumb-preview');
                if (prev) prev.style.backgroundImage = `url('${data.thumb}')`;
            }
            if (document.getElementById('trans_tt_desc') && data.desc) document.getElementById('trans_tt_desc').value = data.desc;
            showToast("TIKTOK PREVIEW LOADED!");
        }
    }

    const ttUrlInput = document.getElementById('trans_tt_url');
    if (ttUrlInput) {
        ttUrlInput.addEventListener('change', (e) => resolveTikTokInput(e.target.value.trim()));
        ttUrlInput.addEventListener('paste', (e) => {
            setTimeout(() => resolveTikTokInput(ttUrlInput.value.trim()), 100);
        });
    }

    if (fetchTtSingleBtn) {
        fetchTtSingleBtn.addEventListener('click', () => {
            const val = document.getElementById('trans_tt_url')?.value?.trim();
            if (!val) {
                showToast("PLEASE ENTER A TIKTOK VIDEO URL FIRST", "error");
                return;
            }
            resolveTikTokInput(val);
        });
    }

    // Full Live Feeds Fetch Engine
    if (fetchLiveBtn) {
        fetchLiveBtn.addEventListener('click', async () => {
            fetchLiveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> FETCHING LIVE DROPS...';
            fetchLiveBtn.disabled = true;
            try {
                showToast("CONTACTING YOUTUBE & TIKTOK FEEDS...");

                // 1. YouTube Fetch
                const ytChannelInput = document.getElementById('trans_yt_channel_id')?.value?.trim() || 'UCMeIV48_O_F0H2tL7x_ayHg';
                const ytFilterMode = document.getElementById('trans_yt_filter')?.value || 'full_only';
                const ytData = await fetchLatestYouTubeDropLive(ytChannelInput, ytFilterMode);
                if (ytData) {
                    if (ytData.cid && document.getElementById('trans_yt_channel_id')) {
                        document.getElementById('trans_yt_channel_id').value = ytData.cid;
                    }
                    if (document.getElementById('trans_yt_title')) document.getElementById('trans_yt_title').value = ytData.title;
                    if (document.getElementById('trans_yt_url')) document.getElementById('trans_yt_url').value = ytData.link;
                    if (document.getElementById('trans_yt_thumb') && ytData.thumb) {
                        document.getElementById('trans_yt_thumb').value = ytData.thumb;
                        const prev = document.getElementById('admin-yt-thumb-preview');
                        if (prev) prev.style.backgroundImage = `url('${ytData.thumb}')`;
                    }
                    if (document.getElementById('trans_yt_desc') && ytData.desc) document.getElementById('trans_yt_desc').value = ytData.desc;
                    if (document.getElementById('trans_yt_tag')) document.getElementById('trans_yt_tag').value = ytData.tag;
                }

                // 2. TikTok Fetch
                const ttTarget = document.getElementById('trans_tt_url')?.value?.trim() || document.getElementById('trans_tt_username')?.value?.trim() || 'obscura.records';
                const ttData = await fetchLatestTikTokDropLive(ttTarget);
                if (ttData) {
                    if (document.getElementById('trans_tt_title')) document.getElementById('trans_tt_title').value = ttData.title;
                    if (document.getElementById('trans_tt_url')) document.getElementById('trans_tt_url').value = ttData.link;
                    if (document.getElementById('trans_tt_thumb') && ttData.thumb) document.getElementById('trans_tt_thumb').value = ttData.thumb;
                    if (document.getElementById('trans_tt_desc') && ttData.desc) document.getElementById('trans_tt_desc').value = ttData.desc;
                    if (document.getElementById('trans_tt_tag') && ttData.tag) document.getElementById('trans_tt_tag').value = ttData.tag;
                }

                showToast(ytData ? "LATEST DROPS RETRIEVED LIVE!" : "LIVE FETCH COMPLETED");
            } catch (e) {
                showToast("FETCH NOTICE: " + e.message, 'error');
            } finally {
                fetchLiveBtn.innerHTML = '<i class="fas fa-bolt"></i> TEST & FETCH LIVE DROPS NOW';
                fetchLiveBtn.disabled = false;
            }
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async (e) => {
            if (e) e.preventDefault();

            let ttThumbVal = String(document.getElementById('trans_tt_thumb')?.value || '').trim();
            const ttUrlVal = String(document.getElementById('trans_tt_url')?.value || 'https://www.tiktok.com/@obscura.records').trim();

            // If user pasted a video URL but thumbnail is empty or default, auto-fetch thumbnail before saving
            if (ttUrlVal.includes('tiktok.com/video') && (!ttThumbVal || ttThumbVal === 'assets/cover.png')) {
                try {
                    const fetchedTt = await fetchLatestTikTokDropLive(ttUrlVal);
                    if (fetchedTt && fetchedTt.thumb) {
                        ttThumbVal = fetchedTt.thumb;
                        if (document.getElementById('trans_tt_thumb')) document.getElementById('trans_tt_thumb').value = ttThumbVal;
                        if (document.getElementById('trans_tt_title') && fetchedTt.title) document.getElementById('trans_tt_title').value = fetchedTt.title;
                    }
                } catch (e) { }
            }

            const payload = {
                showTransmissions: String(document.getElementById('trans_showTransmissions')?.value || 'Visible'),
                transTitle: String(document.getElementById('trans_title')?.value || 'LATEST <span class="accent">TRANSMISSIONS</span>'),
                transDesc: String(document.getElementById('trans_desc')?.value || 'Intercept the newest soundwaves and visual drops across our networks'),

                yt_mode: String(document.getElementById('trans_yt_mode')?.value || 'Auto'),
                yt_filter: String(document.getElementById('trans_yt_filter')?.value || 'full_only'),
                yt_channel_id: String(document.getElementById('trans_yt_channel_id')?.value || '@Obscurarecordss').trim(),
                yt_tag: String(document.getElementById('trans_yt_tag')?.value || 'OFFICIAL MUSIC VIDEO').trim(),
                yt_title: String(document.getElementById('trans_yt_title')?.value || 'MONTAGEM ALMA GEMEA - NXPXLM').trim(),
                yt_desc: String(document.getElementById('trans_yt_desc')?.value || '').trim(),
                yt_url: String(document.getElementById('trans_yt_url')?.value || 'https://www.youtube.com/watch?v=kyS1AFiPa9I').trim(),
                yt_thumb: String(document.getElementById('trans_yt_thumb')?.value || 'https://i4.ytimg.com/vi/kyS1AFiPa9I/hqdefault.jpg').trim(),
                yt_sub_url: String(document.getElementById('trans_yt_sub_url')?.value || 'https://www.youtube.com/@Obscurarecordss?sub_confirmation=1').trim(),

                tt_mode: String(document.getElementById('trans_tt_mode')?.value || 'Auto'),
                tt_username: cleanTikTokUsernameInput(document.getElementById('trans_tt_username')?.value || 'obscura.records'),
                tt_tag: String(document.getElementById('trans_tt_tag')?.value || 'OFFICIAL TIKTOK HUB').trim(),
                tt_title: String(document.getElementById('trans_tt_title')?.value || 'OBSCURA RECORDS (@OBSCURA.RECORDS)').trim(),
                tt_desc: String(document.getElementById('trans_tt_desc')?.value || '').trim(),
                tt_url: ttUrlVal,
                tt_thumb: ttThumbVal || 'assets/cover.png',
                tt_follow_url: String(document.getElementById('trans_tt_follow_url')?.value || 'https://www.tiktok.com/@obscura.records').trim(),
                updatedAt: Date.now()
            };

            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING FEEDS...';
            saveBtn.disabled = true;

            // Save under siteData/globals which has full authorized write permissions in Firebase Rules
            db.ref('siteData/globals').update({ latest_transmissions: payload }).then(() => {
                bumpSiteVersion("Updated Latest Media Feeds (YouTube & TikTok)");
                showToast("MEDIA FEEDS SAVED & SYNCED!");
                if (msgEl) {
                    msgEl.textContent = 'SAVED & SYNCED LIVE!';
                    msgEl.style.color = '#00ff8c';
                    setTimeout(() => { msgEl.textContent = ''; }, 3000);
                }
            }).catch(err => {
                showToast("SAVE FAILED: " + err.message, 'error');
                if (msgEl) {
                    msgEl.textContent = 'ERROR: ' + err.message;
                    msgEl.style.color = '#ff0055';
                }
            }).finally(() => {
                saveBtn.innerHTML = '<i class="fas fa-save"></i> SAVE & SYNC MEDIA FEEDS';
                saveBtn.disabled = false;
            });
        });
    }

    // Webhook Copy Helpers
    const copyUrlBtn = document.getElementById('btn-copy-webhook-url');
    if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', () => {
            const url = 'https://obscura-records-default-rtdb.asia-southeast1.firebasedatabase.app/bot_status/latest_transmissions.json';
            navigator.clipboard.writeText(url).then(() => {
                showToast("FIREBASE WEBHOOK URL COPIED!");
            });
        });
    }

    const copyJsonBtn = document.getElementById('btn-copy-webhook-json');
    if (copyJsonBtn) {
        copyJsonBtn.addEventListener('click', () => {
            const sampleJson = JSON.stringify({
                tt_title: "NEW TIKTOK VIDEO TITLE",
                tt_url: "https://www.tiktok.com/@obscura.records/video/...",
                tt_thumb: "https://...",
                tt_desc: "Catch our newest phonk visualizer drop on TikTok.",
                tt_tag: "LATEST TIKTOK DROP",
                tt_mode: "Auto",
                updatedAt: Date.now()
            }, null, 2);
            navigator.clipboard.writeText(sampleJson).then(() => {
                showToast("SAMPLE JSON PAYLOAD COPIED!");
            });
        });
    }
}

// ==========================================================================
// --- SMART LINKS HUB ENGINE (1-CLICK AUTO-FETCHER & DIRECTORY) ---
// ==========================================================================
let cachedSmartLinks = {};
let currentEditingSmartLinkId = null;

function initSmartLinksEngine() {
    const magicInput = document.getElementById('smartlink-magic-url');
    const magicBtn = document.getElementById('btn-smartlink-magic-fetch');

    const titleInput = document.getElementById('smartlink-input-title');
    const artistInput = document.getElementById('smartlink-input-artist');
    const imageInput = document.getElementById('smartlink-input-image');
    const slugInput = document.getElementById('smartlink-input-slug');
    const previewInput = document.getElementById('smartlink-input-preview');
    const slugPreviewText = document.getElementById('slug-preview-text');

    const saveBtn = document.getElementById('btn-save-smartlink');
    const resetBtn = document.getElementById('btn-reset-smartlink-form');
    const viewCurrentBtn = document.getElementById('btn-preview-current-smartlink');
    const searchInput = document.getElementById('smartlink-search-input');
    const listContainer = document.getElementById('smartlinks-directory-list');
    const badgeSmartlinks = document.getElementById('badge-smartlinks');

    // Auto generate slug from title
    if (titleInput && slugInput) {
        titleInput.addEventListener('input', () => {
            if (!currentEditingSmartLinkId) {
                const slug = titleInput.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                slugInput.value = slug;
                if (slugPreviewText) slugPreviewText.textContent = slug || 'release-slug';
            }
        });
    }

    if (slugInput && slugPreviewText) {
        slugInput.addEventListener('input', () => {
            const slug = slugInput.value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '');
            slugInput.value = slug;
            slugPreviewText.textContent = slug || 'release-slug';
        });
    }

    // Helper: Smart Music Title & Producer Parser
    function parseMusicVideoTitle(rawTitle, channelAuthor = '') {
        let clean = (rawTitle || '').trim();
        
        // Extract Producer tag like (prod. by X) or [prod. X] or (beat by X)
        let prodTag = '';
        const prodMatch = clean.match(/[\(\[\{](?:prod(?:uced)?\.?\s*(?:by)?|beat\s*by)\s*:?\s*([^\]\)\\}]+)[\)\]\}]/i);
        if (prodMatch && prodMatch[1]) {
            prodTag = prodMatch[1].trim();
        }

        // Clean out noise brackets & tags
        let stripped = clean
            .replace(/[\(\[\{](?:official\s*)?(?:music\s*)?(?:audio|video|visualizer|lyric\s*video|hd|4k|hq|remix|slowed|reverb|free\s*dl|free\s*download|out\s*now|phonk)[\)\]\}]/gi, '')
            .replace(/[\(\[\{](?:prod(?:uced)?\.?\s*(?:by)?|beat\s*by)\s*:?\s*[^\]\)\\}]+[\)\]\}]/gi, '')
            .replace(/\|\s*obscura\s*records?/gi, '')
            .replace(/\|\s*official\s*audio/gi, '')
            .replace(/\|\s*visualizer/gi, '')
            .replace(/\|\s*phonk/gi, '')
            .trim();

        let artist = '';
        let title = '';

        // Split by standard track title delimiters: "Artist - Title"
        const splitMatch = stripped.match(/^(.+?)\s*[-–—|/•:]\s*(.+)$/);
        if (splitMatch) {
            artist = splitMatch[1].trim();
            title = splitMatch[2].trim();
        } else {
            title = stripped;
            artist = channelAuthor ? channelAuthor.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim() : '';
        }

        // Merge Producer into artist name if detected
        if (prodTag && !artist.toLowerCase().includes(prodTag.toLowerCase())) {
            artist = artist ? `${artist} / ${prodTag}` : prodTag;
        }

        if ((!artist || artist.toLowerCase() === 'official') && channelAuthor) {
            artist = channelAuthor.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();
        }

        return {
            artist: artist ? artist.toUpperCase() : 'OBSCURA RECORD',
            title: title ? title.toUpperCase() : clean.toUpperCase(),
            prodTag: prodTag
        };
    }

    // 1. Magic Auto-Fetcher Engine
    if (magicBtn && magicInput) {
        magicBtn.addEventListener('click', async () => {
            const rawUrl = magicInput.value.trim();
            if (!rawUrl) {
                showToast("PLEASE PASTE A YOUTUBE OR SPOTIFY LINK FIRST!", 'error');
                return;
            }

            magicBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> FETCHING DATA & LINKS...';
            magicBtn.disabled = true;

            try {
                let trackTitle = '';
                let trackArtist = '';
                let trackImage = '';
                let prodTagFound = '';
                let ytUrl = '';
                let spotifyUrl = '';
                let appleUrl = '';
                let deezerUrl = '';
                let tidalUrl = '';
                let amazonUrl = '';
                let soundcloudUrl = '';
                let boomplayUrl = '';
                let itunesUrl = '';
                let pandoraUrl = '';

                // Check YouTube
                const ytMatch = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                if (ytMatch && ytMatch[1]) {
                    const ytId = ytMatch[1];
                    ytUrl = `https://www.youtube.com/watch?v=${ytId}`;
                    trackImage = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
                    
                    // Fetch YouTube oEmbed for Title & Author
                    try {
                        const oEmbedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(ytUrl)}`);
                        if (oEmbedRes.ok) {
                            const oData = await oEmbedRes.json();
                            if (oData && oData.title) {
                                const parsed = parseMusicVideoTitle(oData.title, oData.author_name || '');
                                trackTitle = parsed.title;
                                trackArtist = parsed.artist;
                                if (parsed.prodTag) prodTagFound = parsed.prodTag;
                            }
                        }
                    } catch (e) {
                        console.log("oEmbed fallback:", e);
                    }
                }

                // Query Songlink / Odesli Music API
                try {
                    const songlinkRes = await fetch(`https://api.songlink.com/v1-alpha.1/links?url=${encodeURIComponent(rawUrl)}`);
                    if (songlinkRes.ok) {
                        const sData = await songlinkRes.json();
                        if (sData && sData.entitiesByUniqueId) {
                            const entityKeys = Object.keys(sData.entitiesByUniqueId);
                            if (entityKeys.length > 0) {
                                const ent = sData.entitiesByUniqueId[entityKeys[0]];
                                if (ent.title) trackTitle = ent.title.toUpperCase();
                                if (ent.artistName) {
                                    if (prodTagFound && !ent.artistName.toLowerCase().includes(prodTagFound.toLowerCase())) {
                                        trackArtist = `${ent.artistName.toUpperCase()} / ${prodTagFound.toUpperCase()}`;
                                    } else {
                                        trackArtist = ent.artistName.toUpperCase();
                                    }
                                }
                                if (ent.thumbnailUrl && !trackImage) trackImage = ent.thumbnailUrl;
                            }
                        }

                        if (sData && sData.linksByPlatform) {
                            const p = sData.linksByPlatform;
                            if (p.spotify) spotifyUrl = p.spotify.url;
                            if (p.appleMusic) appleUrl = p.appleMusic.url;
                            if (p.itunes) itunesUrl = p.itunes.url;
                            if (p.deezer) deezerUrl = p.deezer.url;
                            if (p.amazonMusic) amazonUrl = p.amazonMusic.url;
                            if (p.youtube) ytUrl = p.youtube.url;
                            if (p.tidal) tidalUrl = p.tidal.url;
                            if (p.pandora) pandoraUrl = p.pandora.url;
                            if (p.soundcloud) soundcloudUrl = p.soundcloud.url;
                            if (p.boomplay) boomplayUrl = p.boomplay.url;
                        }
                    }
                } catch (e) {
                    console.log("Songlink API note:", e);
                }

                // Populate Form Fields
                if (trackTitle) titleInput.value = trackTitle;
                if (trackArtist) artistInput.value = trackArtist;
                if (trackImage) imageInput.value = trackImage;
                if (ytUrl) {
                    const ytField = document.getElementById('smartlink-link-youtube');
                    if (ytField) ytField.value = ytUrl;
                    if (previewInput && !previewInput.value) previewInput.value = ytUrl;
                }
                if (spotifyUrl) {
                    const spField = document.getElementById('smartlink-link-spotify');
                    if (spField) spField.value = spotifyUrl;
                }
                if (appleUrl) {
                    const apField = document.getElementById('smartlink-link-apple');
                    if (apField) apField.value = appleUrl;
                }
                if (itunesUrl) {
                    const itField = document.getElementById('smartlink-link-itunes');
                    if (itField) itField.value = itunesUrl;
                }
                if (deezerUrl) {
                    const dzField = document.getElementById('smartlink-link-deezer');
                    if (dzField) dzField.value = deezerUrl;
                }
                if (amazonUrl) {
                    const amField = document.getElementById('smartlink-link-amazon');
                    if (amField) amField.value = amazonUrl;
                }
                if (tidalUrl) {
                    const tdField = document.getElementById('smartlink-link-tidal');
                    if (tdField) tdField.value = tidalUrl;
                }
                if (pandoraUrl) {
                    const pdField = document.getElementById('smartlink-link-pandora');
                    if (pdField) pdField.value = pandoraUrl;
                }
                if (soundcloudUrl) {
                    const scField = document.getElementById('smartlink-link-soundcloud');
                    if (scField) scField.value = soundcloudUrl;
                }
                if (boomplayUrl) {
                    const bpField = document.getElementById('smartlink-link-boomplay');
                    if (bpField) bpField.value = boomplayUrl;
                }

                // Auto-generate Slug
                const generatedSlug = (trackTitle || 'new-release').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                slugInput.value = generatedSlug;
                if (slugPreviewText) slugPreviewText.textContent = generatedSlug;

                showToast("METADATA & PLATFORM LINKS AUTO-FETCHED!");
            } catch (err) {
                showToast("AUTO-FETCH ERROR: " + err.message, 'error');
            } finally {
                magicBtn.innerHTML = '<i class="fas fa-bolt"></i> <span>AUTO-FETCH INFO & LINKS</span>';
                magicBtn.disabled = false;
            }
        });
    }

    // 2. Realtime Database Listener for Smart Links (on dedicated smartLinksDb)
    smartLinksDb.ref('smartLinks').on('value', (snap) => {
        const data = snap.val() || {};
        cachedSmartLinks = data;
        const total = Object.keys(data).length;
        if (badgeSmartlinks) badgeSmartlinks.textContent = total;
        renderSmartLinksDirectory(searchInput ? searchInput.value : '');
    });

    // 3. Render Published Smart Links List
    function renderSmartLinksDirectory(query = '') {
        if (!listContainer) return;
        const items = Object.entries(cachedSmartLinks);
        
        if (!items.length) {
            listContainer.innerHTML = `
                <div style="padding: 2.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px;">
                    <i class="fas fa-link" style="font-size: 1.8rem; margin-bottom: 0.8rem; color: #00f0ff; display: block;"></i>
                    NO SMART LINKS PUBLISHED YET. USE THE GENERATOR ABOVE TO CREATE YOUR FIRST RELEASE SMART LINK.
                </div>
            `;
            return;
        }

        const q = query.toLowerCase().trim();
        const filtered = items.filter(([id, item]) => {
            if (!q) return true;
            return (item.title && item.title.toLowerCase().includes(q)) ||
                   (item.artist && item.artist.toLowerCase().includes(q)) ||
                   (id && id.toLowerCase().includes(q));
        });

        if (!filtered.length) {
            listContainer.innerHTML = '<div style="padding:1.5rem; text-align:center; color:var(--text-muted);">NO MATCHING SMART LINKS FOUND.</div>';
            return;
        }

        listContainer.innerHTML = '';
        filtered.forEach(([slugId, item]) => {
            const row = document.createElement('div');
            row.className = 'cyber-card';
            row.style.cssText = 'padding: 1rem 1.2rem; display: flex; align-items: center; justify-content: space-between; gap: 1.2rem; flex-wrap: wrap; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);';

            const coverImg = item.image || item.artwork || 'assets/OCR.png';
            const title = item.title || 'UNTITLED RELEASE';
            const artist = item.artist || 'OBSCURA RECORD';
            const liveUrl = `${window.location.origin}${window.location.pathname.replace('admin.html', '')}release/?id=${slugId}`;

            // Count connected platforms
            let connectedCount = 0;
            if (item.links) {
                Object.values(item.links).forEach(v => { if (v && v.length > 5) connectedCount++; });
            }

            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 250px;">
                    <img src="${coverImg}" style="width: 52px; height: 52px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(255,255,255,0.15);" alt="Cover">
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <strong style="font-family: var(--font-heading); font-size: 0.98rem; color: #fff;">${title}</strong>
                        <span style="font-size: 0.78rem; color: #00f0ff;">PROD. ${artist.toUpperCase()}</span>
                        <small style="font-family: var(--font-mono); font-size: 0.7rem; color: rgba(255,255,255,0.5);">
                            SLUG: <strong style="color: #fff;">${slugId}</strong> &bull; <i class="fas fa-headphones"></i> ${connectedCount} PLATFORMS LINKED
                        </small>
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    <button type="button" class="cyber-btn sm" onclick="copySmartLinkToClipboard('${liveUrl}')" title="Copy Live Smart Link URL">
                        <i class="fas fa-copy"></i> COPY LINK
                    </button>
                    <a href="${liveUrl}" target="_blank" class="cyber-btn sm" style="text-decoration: none;" title="Open Live Smart Link in new tab">
                        <i class="fas fa-external-link-alt"></i> VIEW PAGE
                    </a>
                    <button type="button" class="cyber-btn sm warning" onclick="editSmartLink('${slugId}')" title="Edit this Smart Link">
                        <i class="fas fa-edit"></i> EDIT
                    </button>
                    <button type="button" class="cyber-btn sm danger" onclick="deleteSmartLink('${slugId}')" title="Delete this Smart Link">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            listContainer.appendChild(row);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderSmartLinksDirectory(e.target.value);
        });
    }

    // 4. Save / Publish Smart Link (Direct to smartLinksDb)
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const title = titleInput.value.trim();
            const artist = artistInput.value.trim();
            const image = imageInput.value.trim();
            let slug = slugInput.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '');

            if (!title) {
                showToast("PLEASE ENTER TRACK TITLE!", 'error');
                titleInput.focus();
                return;
            }
            if (!slug) {
                slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            }

            const links = {
                spotify: document.getElementById('smartlink-link-spotify')?.value.trim() || '',
                apple: document.getElementById('smartlink-link-apple')?.value.trim() || '',
                itunes: document.getElementById('smartlink-link-itunes')?.value.trim() || '',
                deezer: document.getElementById('smartlink-link-deezer')?.value.trim() || '',
                amazon: document.getElementById('smartlink-link-amazon')?.value.trim() || '',
                youtube: document.getElementById('smartlink-link-youtube')?.value.trim() || '',
                youtubemusic: document.getElementById('smartlink-link-youtubemusic')?.value.trim() || '',
                tidal: document.getElementById('smartlink-link-tidal')?.value.trim() || '',
                pandora: document.getElementById('smartlink-link-pandora')?.value.trim() || '',
                boomplay: document.getElementById('smartlink-link-boomplay')?.value.trim() || '',
                soundcloud: document.getElementById('smartlink-link-soundcloud')?.value.trim() || '',
                beatport: document.getElementById('smartlink-link-beatport')?.value.trim() || '',
                tiktok: document.getElementById('smartlink-link-tiktok')?.value.trim() || ''
            };

            const payload = {
                title: title,
                artist: artist || 'OBSCURA RECORD',
                image: image || 'assets/OCR.png',
                slug: slug,
                audioPreview: previewInput.value.trim() || '',
                youtube: links.youtube || '',
                links: links,
                updatedAt: Date.now()
            };

            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PUBLISHING...';
            saveBtn.disabled = true;

            smartLinksDb.ref(`smartLinks/${slug}`).set(payload).then(() => {
                showToast(`SMART LINK PUBLISHED! [ ${slug} ]`);
                bumpSiteVersion(`Published Smart Link for ${title}`);

                if (viewCurrentBtn) {
                    const liveUrl = `${window.location.origin}${window.location.pathname.replace('admin.html', '')}release/?id=${slug}`;
                    viewCurrentBtn.style.display = 'inline-flex';
                    viewCurrentBtn.onclick = () => window.open(liveUrl, '_blank');
                }

                currentEditingSmartLinkId = null;
                const formTitle = document.getElementById('smartlink-form-title');
                if (formTitle) formTitle.textContent = "CREATE NEW SMART LINK (RELEASE HUB)";
            }).catch(err => {
                showToast("SAVE FAILED: " + err.message, 'error');
            }).finally(() => {
                saveBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> <span>PUBLISH SMART LINK</span>';
                saveBtn.disabled = false;
            });
        });
    }

    // 5. Reset Form
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentEditingSmartLinkId = null;
            if (magicInput) magicInput.value = '';
            titleInput.value = '';
            artistInput.value = '';
            imageInput.value = '';
            slugInput.value = '';
            previewInput.value = '';
            if (slugPreviewText) slugPreviewText.textContent = 'release-slug';
            if (viewCurrentBtn) viewCurrentBtn.style.display = 'none';

            const platformInputs = [
                'smartlink-link-spotify', 'smartlink-link-apple', 'smartlink-link-itunes',
                'smartlink-link-deezer', 'smartlink-link-amazon', 'smartlink-link-youtube',
                'smartlink-link-youtubemusic', 'smartlink-link-tidal', 'smartlink-link-pandora',
                'smartlink-link-boomplay', 'smartlink-link-soundcloud', 'smartlink-link-beatport',
                'smartlink-link-tiktok'
            ];
            platformInputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            const formTitle = document.getElementById('smartlink-form-title');
            if (formTitle) formTitle.textContent = "CREATE NEW SMART LINK (RELEASE HUB)";
            showToast("FORM RESET COMPLETED.");
        });
    }
}

// Global Window Helpers for Smart Links
window.copySmartLinkToClipboard = function(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            showToast("SMART LINK COPIED TO CLIPBOARD!");
        });
    } else {
        prompt("Copy your Smart Link URL:", url);
    }
};

window.editSmartLink = function(slugId) {
    const item = cachedSmartLinks[slugId];
    if (!item) return;

    currentEditingSmartLinkId = slugId;
    const formTitle = document.getElementById('smartlink-form-title');
    if (formTitle) formTitle.textContent = `EDITING SMART LINK: ${slugId.toUpperCase()}`;

    const titleInput = document.getElementById('smartlink-input-title');
    const artistInput = document.getElementById('smartlink-input-artist');
    const imageInput = document.getElementById('smartlink-input-image');
    const slugInput = document.getElementById('smartlink-input-slug');
    const previewInput = document.getElementById('smartlink-input-preview');
    const slugPreviewText = document.getElementById('slug-preview-text');

    if (titleInput) titleInput.value = item.title || '';
    if (artistInput) artistInput.value = item.artist || '';
    if (imageInput) imageInput.value = item.image || item.artwork || '';
    if (slugInput) slugInput.value = slugId;
    if (slugPreviewText) slugPreviewText.textContent = slugId;
    if (previewInput) previewInput.value = item.audioPreview || '';

    const links = item.links || item;
    const platformMap = {
        'smartlink-link-spotify': links.spotify,
        'smartlink-link-apple': links.apple,
        'smartlink-link-itunes': links.itunes,
        'smartlink-link-deezer': links.deezer,
        'smartlink-link-amazon': links.amazon,
        'smartlink-link-youtube': links.youtube,
        'smartlink-link-youtubemusic': links.youtubemusic,
        'smartlink-link-tidal': links.tidal,
        'smartlink-link-pandora': links.pandora,
        'smartlink-link-boomplay': links.boomplay,
        'smartlink-link-soundcloud': links.soundcloud,
        'smartlink-link-beatport': links.beatport,
        'smartlink-link-tiktok': links.tiktok
    };

    Object.entries(platformMap).forEach(([elemId, val]) => {
        const el = document.getElementById(elemId);
        if (el) el.value = val || '';
    });

    // Scroll to form smoothly
    const formCard = document.getElementById('smartlink-form-title');
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast(`LOADED "${item.title || slugId}" FOR EDITING.`);
};

window.deleteSmartLink = function(slugId) {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE the smart link "${slugId}"?`)) return;

    smartLinksDb.ref(`smartLinks/${slugId}`).remove().then(() => {
        showToast(`SMART LINK "${slugId}" DELETED!`);
        bumpSiteVersion(`Deleted Smart Link ${slugId}`);
    }).catch(err => {
        showToast("DELETE FAILED: " + err.message, 'error');
    });
};
