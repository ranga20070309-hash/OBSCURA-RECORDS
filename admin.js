const firebaseConfig = {
    apiKey: "AIzaSyCHf_R1n2Qn-q4NHAjfJt6xD_TWIRjiN1o",
    authDomain: "obscura-records.firebaseapp.com",
    databaseURL: "https://obscura-records-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "obscura-records",
    storageBucket: "obscura-records.firebasestorage.app",
    messagingSenderId: "831882873428",
    appId: "1:831882873428:web:3cf009875e160a9f8efbc1"
};

// Ensure Firebase is initialized only once (compatible with v10-compat)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
// Debug Initialization
alert("CORE SYSTEM ONLINE: PERSONNEL SYNC READY (v4.4)");
console.log("Transmission link established.");

// Toast Notification System (Administrative Grade)
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notif ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// --- LINK INTEGRITY GUARD: SECURITY ENGINE ---
function analyzeLinkSafety(url) {
    if (!url || url === '#' || url === '') return { status: 'n/a', color: '#888', icon: 'fa-minus' };

    try {
        const domain = new URL(url).hostname.toLowerCase();
        
        // Trusted Domains (Safe Zone)
        const trusted = ['spotify.com', 'soundcloud.com', 'youtube.com', 'youtu.be', 'drive.google.com', 'dropbox.com', 'wetransfer.com', 'music.apple.com'];
        if (trusted.some(t => domain.includes(t))) {
            return { status: 'SAFE', color: '#00ff8c', icon: 'fa-shield-check' };
        }

        // Suspicious: Link Shorteners (Obscured destination)
        const risky = ['bit.ly', 'tinyurl.com', 't.co', 'rb.gy', 'cutt.ly'];
        if (risky.some(r => domain.includes(r))) {
            return { status: 'RISKY (SHORTENED)', color: '#ffcc00', icon: 'fa-exclamation-triangle' };
        }

        // Default: Untrusted/Unknown
        return { status: 'UNTRUSTED SOURCE', color: '#ff3e3e', icon: 'fa-biohazard' };
    } catch (e) {
        return { status: 'INVALID URL', color: '#ff3e3e', icon: 'fa-bug' };
    }
}


// --- ADMIN HANDSHAKE SYSTEM (CORE) ---
window.secureNavigate = function(url, key) {
    sessionStorage.setItem(key, 'true');
    window.location.href = url;
};

window.saveIndividualStaff = function (discordId) {
    const item = document.querySelector(`.staff-editor-item[data-discord-id="${discordId}"]`);
    if (!item) { showToast("CRITICAL ERROR: Editor entry missing.", 'error'); return; }
    const saveBtn = item.querySelector('.save-btn-staff');
    if(saveBtn) saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCING...';
    const nameInput = item.querySelector('.s-name');
    const bio = item.querySelector('.s-bio').value;
    const avatar = item.querySelector('.s-avatar') ? item.querySelector('.s-avatar').value : '';
    const role = item.querySelector('.s-role') ? item.querySelector('.s-role').value : '';
    const discordLink = item.querySelector('.s-discord-link') ? item.querySelector('.s-discord-link').value : '';
    const socials = {};
    item.querySelectorAll('input[class^="s-social-"]').forEach(input => {
        const platform = input.className.replace('s-social-', '');
        if (input.value.trim() !== '') socials[platform] = input.value.trim();
    });
    const data = { bio, avatar_url: avatar, role, discord_link: discordLink, socials };
    if (nameInput && nameInput.value.trim()) data.name = nameInput.value.trim();
    const isPartner = item.dataset.type === 'partner';
    const path = isPartner ? 'partner_status/' : 'staff_status/';
    db.ref(path + discordId).update(data).then(() => {
        showToast(`${isPartner ? 'PARTNER' : 'PERSONNEL'} SYNC SUCCESSFUL: ${discordId}`);
        if(saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> SYNC';
        bumpSiteVersion();
        loadStaff();
    }).catch(err => {
        showToast('SYNC ERROR: ' + err.message, 'error');
        if(saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> RETRY';
    });
};

// UI Elements
const navBtns = document.querySelectorAll('.nav-btn');
const panels = document.querySelectorAll('.panel');

// Auto-Versioning (Cache Buster)
function bumpSiteVersion() {
    db.ref('siteData/globals/v').transaction((v) => {
        const nextV = (parseFloat(v || 1.0) + 0.1).toFixed(1);
        const display = document.getElementById('display-v');
        if (display) display.textContent = nextV;
        return nextV;
    });
}

// Navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        navBtns.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const target = btn.dataset.target;
        const panel = document.getElementById(target);
        if (panel) panel.classList.add('active');

        // Auto-refresh and trace panel data on navigation
        console.log("Navigating to:", target);
        if (target === 'staff-panel') {
            loadStaff();
        } else if (target === 'demo-inbox-panel') {
            loadSubmissions();
        } else if (target === 'releases-panel') {
            loadReleases();
        } else if (target === 'upcoming-panel') {
            loadUpcoming();
        } else if (target === 'security-panel') {
            loadSecurityLogs();
        } else if (target === 'popular-panel') {
            loadPopularReleases();
        }
    });
});

// Show Save Msg function
function showSaveMsg(id) {
    const msg = document.getElementById(id);
    if (msg) {
        msg.classList.add('show');
        setTimeout(() => { msg.classList.remove('show'); }, 3000);
    }
}

// --- MOBILE ACCESS CONTROL ---
const mobileBlockOverlay = document.getElementById('mobile-block-overlay');

function checkDevice() {
    const isSmall = window.innerWidth < 900; // Optimized for high-DPI scaled desktops

    const wrapper = document.querySelector('.admin-wrapper');
    const login = document.getElementById('login-overlay');

    if (isSmall) {
        if (mobileBlockOverlay) {
            mobileBlockOverlay.style.display = 'flex';
            initMobileVibe(); 
        }
        if (wrapper) wrapper.style.display = 'none';
        if (login) login.style.display = 'none';
        document.body.style.overflow = 'hidden';
    } else {
        if (mobileBlockOverlay) mobileBlockOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // RESTORATION LOGIC: Re-show dashboard based on auth state if it was hidden
        const isAuth = sessionStorage.getItem('rootAuth') === 'granted' || firebase.auth().currentUser;
        if (isAuth) {
            if (wrapper) wrapper.style.display = 'flex';
            if (login) login.style.display = 'none'; // HIDE LOGIN if authorized
        } else {
            if (login) login.style.display = 'flex';
            if (wrapper) wrapper.style.display = 'none';
        }
    }
}

// Secondary Engine for Mobile Block Screen
let mobileEngineRunning = false;
function initMobileVibe() {
    if (mobileEngineRunning) return;
    const canvas = document.getElementById('mobile-vibe-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let pArray = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class P {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.s = Math.random() * 2;
            this.sx = (Math.random() - 0.5) * 1;
            this.sy = (Math.random() - 0.5) * 1;
            this.o = Math.random();
        }
        update() {
            this.x += this.sx;
            this.y += this.sy;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
        }
        draw() {
            ctx.fillStyle = `rgba(255, 62, 62, ${this.o * 0.3})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.s, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pArray.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    resize();
    for (let i = 0; i < 80; i++) pArray.push(new P());
    mobileEngineRunning = true;
    loop();
}

// --- SECURE AUTHENTICATION SYSTEM ---
const loginOverlay = document.getElementById('login-overlay');
const loginBtn = document.getElementById('login-btn');
const emailInput = document.getElementById('root-email-input');
const passInput = document.getElementById('root-pass-input');
const loginError = document.getElementById('login-error');
const adminWrapper = document.querySelector('.admin-wrapper');

function initializeSecurity() {
    checkDevice();
    window.addEventListener('resize', checkDevice);

    const isLocal = window.location.protocol === 'file:';

    // Track real auth state via Firebase
    firebase.auth().onAuthStateChanged((user) => {
        if (user || (isLocal && sessionStorage.getItem('rootAuth') === 'granted')) {
            console.log("Transmission link secured.");
            unlockDashboard();
        } else {
            console.log("Portal locked. Awaiting valid authorization.");
            if (loginOverlay) loginOverlay.style.display = 'flex';
            if (adminWrapper) adminWrapper.style.display = 'none';
        }
    });
}

function unlockDashboard() {
    sessionStorage.setItem('rootAuth', 'granted');
    
    if (window.innerWidth < 1024) {
        checkDevice();
        return;
    }
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (adminWrapper) adminWrapper.style.display = 'flex';

    // DELAYED DATA GATING (Fully Isolated for Stability)
    try { loadGlobals(); } catch (e) { console.error("Globals fail:", e); }
    try { loadSubmissions(); } catch (e) { console.error("Submissions fail:", e); }
    try { loadReleases(); } catch (e) { console.error("Releases fail:", e); }
    try { loadUpcoming(); } catch (e) { console.error("Upcoming fail:", e); }
    try { loadStaff(); } catch (e) { console.error("Staff fail:", e); }

    // START KERNEL SECURITY MONITOR
    initKernelSecurity();
}

function initKernelSecurity() {
    console.log("INITIALIZING ADMINISTRATIVE KERNEL MONITOR...");
    const kmIntegrity = document.getElementById('km-integrity');
    const kmNetwork = document.getElementById('km-network');
    const kmShield = document.getElementById('km-shield');

    setInterval(() => {
        if (kmNetwork) {
            const lat = Math.floor(Math.random() * 20) + 5; // Admin connection usually faster
            kmNetwork.textContent = `${lat}MS / ENCRYPTED`;
        }
        if (kmIntegrity) {
            kmIntegrity.textContent = "CORE SECURE";
            kmIntegrity.style.color = "var(--primary)";
        }
    }, 2000);

    // Console detection for Admin
    let devToolsOpen = false;
    const threshold = 160;
    setInterval(() => {
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;
        if ((widthDiff || heightDiff) && !devToolsOpen) {
            devToolsOpen = true;
            if (kmShield) {
                kmShield.textContent = "INTERNAL VIOLATION";
                kmShield.style.color = "#ff0080";
                kmShield.classList.add('scanning');
            }
        } else if (!(widthDiff || heightDiff) && devToolsOpen) {
            devToolsOpen = false;
            if (kmShield) {
                kmShield.textContent = "SHIELD ARMED";
                kmShield.style.color = "var(--primary)";
                kmShield.classList.remove('scanning');
            }
        }
    }, 1000);
}

// --- GLOBAL SITE-WIDE ALARM SYNC ENGINE ---
function initGlobalAlarmSync() {
    const alarmOverlay = document.getElementById('global-security-alarm');
    const alarmTypeText = document.getElementById('alarm-type');

    db.ref('siteData/security/globalAlarm').on('value', (snapshot) => {
        const alarm = snapshot.val();
        if (alarm && alarm.active === true) {
            console.warn("!!! GLOBAL SECURITY ALARM ACTIVE !!!");
            // [SILENT MONITORING] Suppressed the full-screen intrusive alarm overlay as per staff request
            // If background logging is preferred over active blocking, we keep the status nodes updated.
            if (alarmOverlay) {
                alarmOverlay.style.display = 'none'; // Ensure it stays hidden
            }
            if (alarmTypeText) {
                const locStr = alarm.location ? ` | LOC: ${alarm.location}` : '';
                const ipStr = alarm.ip ? ` | IP: ${alarm.ip}` : '';
                alarmTypeText.textContent = `THREAT DETECTED: ${alarm.type || 'UNKNOWN'}${ipStr}${locStr}`;
            }

            // Highlight the security monitor in admin (Small status indicator only)
            const kmShield = document.getElementById('km-shield');
            if (kmShield) {
                kmShield.textContent = "THREAT DETECTED";
                kmShield.style.color = "#ff0080";
                kmShield.classList.add('scanning');
            }
        } else {
            if (alarmOverlay) alarmOverlay.style.display = 'none';
            const kmShield = document.getElementById('km-shield');
            if (kmShield) {
                kmShield.textContent = "SHIELD ARMED";
                kmShield.style.color = "var(--primary)";
                kmShield.classList.remove('scanning');
            }
        }
    });
}

// Attach to startup sequence
(function () {
    const isLocal = window.location.protocol === 'file:';
    // Check for auth state and start sync once ready
    firebase.auth().onAuthStateChanged((user) => {
        if (user || (isLocal && sessionStorage.getItem('rootAuth') === 'granted')) initGlobalAlarmSync();
    });
})();

// --- SECURITY LOGS MANAGEMENT ---
function loadSecurityLogs() {
    const container = document.getElementById('security-logs-container');
    if (!container) return;
    container.innerHTML = '<p style="opacity:0.5; padding:2rem;">Scanning security vault for intrusions...</p>';

    db.ref('siteData/security/violations').limitToLast(50).once('value', snapshot => {
        container.innerHTML = '';
        const data = snapshot.val();
        if (!data) {
            container.innerHTML = '<p style="opacity:0.3; padding:2rem; text-align:center;">ZERO VIOLATIONS DETECTED. SYSTEM INTEGRITY OPTIMAL.</p>';
            return;
        }

        const logs = Object.keys(data).reverse().map(key => ({ id: key, ...data[key] }));
        logs.forEach(log => {
            const div = document.createElement('div');
            div.className = 'release-editor-item security-log-item';
            div.style.borderColor = '#ff0055';
            div.style.background = 'rgba(255, 0, 85, 0.05)';
            
            const time = new Date(log.timestamp).toLocaleString();
            const sys = log.system || {};
            
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                            <span style="background: #ff0055; color: #fff; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.65rem; font-weight: 700;">${log.type}</span>
                            <span style="font-family: monospace; font-size: 0.75rem; opacity: 0.6;">${time}</span>
                        </div>
                        <h4 style="color: #ff0055; margin-bottom: 0.5rem; letter-spacing: 0.1rem;">IP: ${log.ip || 'HIDDEN'} | LOCATION: ${log.location || 'UNKNOWN'}</h4>
                        <div style="font-size: 0.7rem; color: var(--text-secondary); line-height: 1.4;">
                            <p><strong>PATH:</strong> ${log.path || '/'}</p>
                            <p><strong>BROWSER:</strong> ${sys.ua || 'UNKNOWN'}</p>
                            <p><strong>SCREEN:</strong> ${sys.screen || 'N/A'} | <strong>LANG:</strong> ${sys.language || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
        showToast("SECURITY LOGS SYNCED: " + logs.length + " ENTRIES FOUND.");
    });
}

const refreshSecBtn = document.getElementById('refresh-security');
if (refreshSecBtn) refreshSecBtn.onclick = loadSecurityLogs;

const clearSecBtn = document.getElementById('clear-security');
if (clearSecBtn) {
    clearSecBtn.onclick = () => {
        if (confirm("CRITICAL: Purge all security violation records from the vault?")) {
            db.ref('siteData/security/violations').remove().then(() => {
                showToast("SECURITY VAULT PURGED.", "success");
                loadSecurityLogs();
            });
        }
    };
}

if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const pass = passInput.value;

        if (!email || !pass) {
            alert("SECURITY ALERT: Empty credentials detected.");
            return;
        }

        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AUTHORIZING...';
        loginBtn.disabled = true;

        const isLocal = window.location.protocol === 'file:';
        if (isLocal) {
            console.log("KERNEL BYPASS: Local access detected. Granting frequency override.");
            setTimeout(() => {
                unlockDashboard();
            }, 800);
            return;
        }

        firebase.auth().signInWithEmailAndPassword(email, pass)
            .then((userCredential) => {
                showToast("ACCESS GRANTED: ROOT FREQUENCY SYNCED.");
            })
            .catch((error) => {
                loginError.textContent = "AUTH FAILURE: CONTACT KERNEL ADMIN";
                loginError.style.display = 'block';
                passInput.value = '';
                loginBtn.innerHTML = '<i class="fas fa-unlock"></i> INITIATE ACCESS';
                loginBtn.disabled = false;
                showToast("AUTH FAILURE: PIN FREQUENCY DISCREPANCY", "error");
                setTimeout(() => { loginError.style.display = 'none'; }, 5000);
            });
    });
}

// Support for Enter key on both inputs
const authInputs = [emailInput, passInput];
authInputs.forEach(input => {
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loginBtn.click();
        });
    }
});

// --- SPACE VIBE PARTICLES ENGINE ---
(function () {
    const canvas = document.getElementById('vibe-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
        }
        draw() {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function init() {
        resize();
        particles = [];
        for (let i = 0; i < 150; i++) particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    init();
    animate();
})();

// --- UNIVERSAL GLOBALS PANEL (Settings, Links, Modal Texts) ---
function loadGlobals() {
    db.ref('siteData/globals').once('value').then(snapshot => {
        const data = snapshot.val();

        // Update version display (Hard-sync to 60.0 baseline)
        if (data && data.v && parseFloat(data.v) >= 60.0) {
            const display = document.getElementById('display-v');
            if (display) display.textContent = data.v;
        } else {
            // Re-align to 60.0 to match main site's latest engine deployment
            const display = document.getElementById('display-v');
            if (display) display.textContent = "60.0";
            db.ref('siteData/globals/v').set("60.0");
        }

        let needsSync = false;
        let updates = {};

        document.querySelectorAll('input[id^="site_"], textarea[id^="site_"], select[id^="site_"]').forEach(el => {
            const key = el.id.replace('site_', '');
            if (data && data[key] !== undefined && data[key] !== "..." && data[key] !== "") {
                el.value = data[key];
            } else {
                needsSync = true;
                updates[key] = el.value;
            }
        });

        if (needsSync) {
            db.ref('siteData/globals').update(updates);
        }

        // --- Load Security Key ---
        db.ref('siteData/security/rootKey').once('value').then(snap => {
            if (snap.exists()) {
                const keyInput = document.getElementById('security_rootKey');
                if (keyInput) keyInput.value = snap.val();
            }
        });
    });
}

function saveGlobals(msgId) {
    let updates = {};
    document.querySelectorAll('input[id^="site_"], textarea[id^="site_"], select[id^="site_"]').forEach(el => {
        updates[el.id.replace('site_', '')] = el.value;
    });
    db.ref('siteData/globals').update(updates).then(() => {
        const keyInput = document.getElementById('security_rootKey');
        if (keyInput) {
            db.ref('siteData/security/rootKey').set(keyInput.value);
        }
        bumpSiteVersion();
        showSaveMsg(msgId);
        showToast("GLOBAL DIRECTIVES DEPLOYED SUCCESSFULLY.");
    }).catch(err => {
        console.error("Save Globals Error:", err);
        showToast("DEPLOY FAILURE: CHECK CONSOLE", "error");
    });
}

document.getElementById('save-globals').addEventListener('click', () => saveGlobals('save-msg-globals'));
document.getElementById('save-links').addEventListener('click', () => saveGlobals('save-msg-links'));
document.getElementById('save-modals-text').addEventListener('click', () => saveGlobals('save-msg-modals-text'));
document.getElementById('save-ghost').addEventListener('click', () => saveGlobals('save-msg-ghost'));
if (document.getElementById('save-modals-all-data')) {
    document.getElementById('save-modals-all-data').addEventListener('click', () => saveGlobals('save-msg-modals-all-data'));
}
if (document.getElementById('save-staff-main')) {
    document.getElementById('save-staff-main').addEventListener('click', saveStaff);
}

// --- RELEASES PANEL ---
const releasesContainer = document.getElementById('releases-container');
let releasesArray = [];


// Template for a release item
function createReleaseEditor(release, index) {
    const div = document.createElement('div');
    div.className = 'release-editor-item';
    div.innerHTML = `
        <button class="delete-btn" onclick="removeRelease(${index})"><i class="fas fa-trash"></i></button>
        <div class="editor-main-layout">
            <div class="editor-controls">
                <div class="form-grid">
                    <div class="input-group">
                        <label>Track ID / Badge</label>
                        <p class="field-desc">The catalog identifier. (e.g. OS-992 <span class='badge'>NEW</span>)</p>
                        <input type="text" class="r-id" value="${release.id || ''}" oninput="syncLiveReleaseCard(${index})">
                    </div>
                    <div class="input-group">
                        <label>Title</label>
                        <p class="field-desc">Official track name as displayed in the transmission grid.</p>
                        <input type="text" class="r-title" value="${release.title || ''}" oninput="syncLiveReleaseCard(${index})">
                    </div>
                    <div class="input-group">
                        <label>Producers</label>
                        <p class="field-desc">Artist or entity responsible for the audio frequency.</p>
                        <input type="text" class="r-producers" value="${release.producers || ''}" oninput="syncLiveReleaseCard(${index})">
                    </div>
                    <div class="input-group">
                        <label>Release Type</label>
                        <p class="field-desc">The binary classification of the release (SINGLE/EP/ALBUM).</p>
                        <input type="text" class="r-type" value="${release.type || 'SINGLE'}" oninput="syncLiveReleaseCard(${index})">
                    </div>
                    <div class="input-group full">
                        <label>Cover Image Source</label>
                        <p class="field-desc">Direct asset link for the frequency visualization.</p>
                        <div style="display: flex; gap: 0.5rem; align-items: center; position: relative;">
                            <input type="text" class="r-image" value="${release.image || 'assets/cover.png'}" id="input-r-${index}" oninput="updateLivePreview(this, 'prev-r-${index}'); syncLiveReleaseCard(${index})">
                            <button class="action-btn-mini" onclick="triggerReleaseUpload(${index})"><i class="fas fa-folder-open"></i></button>
                            <button class="action-btn-mini" onclick="autoDetectRelease(${index})"><i class="fas fa-wand-magic-sparkles"></i></button>
                            <div id="prev-r-${index}" class="floating-preview"></div>
                            <input type="file" id="file-r-${index}" style="display:none" onchange="handleReleaseFile(this, ${index})" accept="image/*">
                        </div>
                    </div>
                    <div class="input-group full" style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1rem;">
                        <div><label>Spotify Link</label><p class="field-desc">Direct route.</p><input type="text" class="r-spotify" value="${release.spotify || '#'}" oninput="autoDetectRelease(${index}); syncLiveReleaseCard(${index})"></div>
                        <div><label>Apple Link</label><p class="field-desc">Direct route.</p><input type="text" class="r-apple" value="${release.apple || '#'}"></div>
                        <div><label>YouTube Link</label><p class="field-desc">Direct route.</p><input type="text" class="r-youtube" value="${release.youtube || '#'}" oninput="autoDetectRelease(${index}); syncLiveReleaseCard(${index})"></div>
                        <div><label>Preview Audio</label><p class="field-desc">Snippet URL.</p><input type="text" class="r-preview" value="${release.preview || '#'}"></div>
                    </div>
                </div>
            </div>
            <div class="card-preview-zone">
                <label class="preview-label">LIVE PORTAL PREVIEW</label>
                <div id="live-release-card-${index}" class="admin-live-mock">
                    <!-- Preview card will be injected here -->
                </div>
            </div>
        </div>
    `;
    return div;
}

window.triggerReleaseUpload = function(index) {
    document.getElementById(`file-r-${index}`).click();
};

window.handleReleaseFile = function(input, index) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const rInput = document.getElementById(`input-r-${index}`);
            rInput.value = e.target.result;
            updateLivePreview(rInput, `prev-r-${index}`);
            syncLiveReleaseCard(index);
            showToast("LOCAL COVER ASSET ENCODED.");
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.autoDetectRelease = function(index) {
    const editor = document.querySelectorAll('#releases-container .release-editor-item')[index];
    if (!editor) return;

    const imgInput = editor.querySelector('.r-image');
    const spInput = editor.querySelector('.r-spotify');
    const ytInput = editor.querySelector('.r-youtube');

    // Priority: 1. Image field itself, 2. Spotify field, 3. YouTube field
    let url = imgInput.value;
    if (url === 'assets/cover.png' || url === '' || url === '#') {
        url = spInput.value !== '#' ? spInput.value : ytInput.value;
    }

    if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
        const id = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
        const detectedImg = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        imgInput.value = detectedImg;
        updateLivePreview(imgInput, `prev-r-${index}`);
        syncLiveReleaseCard(index);
        showToast("YT COVER CAPTURED.");
    } else if (url && url.includes('spotify.com')) {
        fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
            .then(res => res.json())
            .then(data => {
                if (data.thumbnail_url) {
                    imgInput.value = data.thumbnail_url;
                    updateLivePreview(imgInput, `prev-r-${index}`);
                    syncLiveReleaseCard(index);
                    showToast("SPOTIFY COVER DETECTED.");
                }
            }).catch(() => {});
    }
};

window.autoDetectPopularRelease = function(index) {
    const editor = document.querySelectorAll('#popular-container .release-editor-item')[index];
    if (!editor) return;

    const imgInput = editor.querySelector('.p-image');
    const spInput = editor.querySelector('.p-spotify');
    const ytInput = editor.querySelector('.p-youtube');

    let url = imgInput.value;
    if (url === 'assets/cover.png' || url === '' || url === '#') {
        url = spInput.value !== '#' ? spInput.value : ytInput.value;
    }

    if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
        const id = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
        const detectedImg = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        imgInput.value = detectedImg;
        updateLivePreview(imgInput, `prev-p-${index}`);
        syncLivePopularCard(index);
        showToast("YT COVER CAPTURED.");
    } else if (url && url.includes('spotify.com')) {
        fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
            .then(res => res.json())
            .then(data => {
                if (data.thumbnail_url) {
                    imgInput.value = data.thumbnail_url;
                    updateLivePreview(imgInput, `prev-p-${index}`);
                    syncLivePopularCard(index);
                    showToast("SPOTIFY COVER DETECTED.");
                }
            }).catch(() => {});
    }
};

function renderReleases() {
    const container = document.getElementById('releases-container');
    if (!container) return;
    container.innerHTML = '';
    releasesArray.forEach((r, i) => {
        container.appendChild(createReleaseEditor(r, i));
        syncLiveReleaseCard(i); // Initial sync
    });
}

window.removeRelease = function (index) {
    if(confirm("PURGE ARCHIVE ENTRY: Are you sure? This action is permanent.")) {
        // Remove from local array first
        releasesArray.splice(index, 1);
        
        // Immediate UI feedback
        renderReleases();

        // Sync to Firebase
        db.ref('siteData/releases').set(releasesArray).then(() => {
            showToast("ARCHIVE ENTRY PURGED FROM SERVER.", "error");
            bumpSiteVersion();
        }).catch(err => {
            showToast("SYNC FAILURE: " + err.message, "error");
            loadReleases();
        });
    }
};

const addRelBtn = document.getElementById('add-release-btn');
if (addRelBtn) {
    addRelBtn.onclick = () => {
        gatherReleasesData();
        releasesArray.unshift({
            id: "OS-NEW", 
            title: "NEW TRACK", 
            producers: "UNKNOWN", 
            type: "SINGLE",
            image: "assets/cover.png", 
            spotify: "#", 
            apple: "#", 
            youtube: "#"
        });
        renderReleases();
        showToast("ARCHIVE SLOT INITIALIZED.");
    };
}

function loadReleases() {
    const releasesContainer = document.getElementById('releases-container');
    if (!releasesContainer) {
        console.error("Release container not found!");
        return;
    }

    releasesContainer.innerHTML = '<p style="opacity:0.5; padding:2rem;">Synchronizing release archive...</p>';

    db.ref('siteData/releases').once('value').then(snapshot => {
        let data = snapshot.val();

        if (data && Array.isArray(data) && data.length > 0 && (!data[0] || !data[0]._isEmpty)) {
            releasesArray = data;
            showToast(`ARCHIVE SYNCED: ${data.length} TRACKS LOADED.`);
            renderReleases();
        } else {
            // Default baseline catalog from index.html if empty
            releasesArray = [
                { id: "OS-992", title: "STARLIGHT SYNDROME", producers: "SVYUXU & OBSCURA", type: "SINGLE", image: "assets/cover.png", spotify: "#", apple: "#", youtube: "#", preview: "#" },
                { id: "OS-991", title: "NEUTRON PULSE", producers: "RANGA", type: "EP", image: "assets/releases/cover_1.png", spotify: "#", apple: "#", youtube: "https://www.youtube.com/watch?v=jfKfPfyJRdk", preview: "#" },
                { id: "OS-990", title: "VOID WALKER", producers: "FL4ME", type: "ALBUM", image: "assets/releases/cover_2.png", spotify: "#", apple: "#", youtube: "https://www.youtube.com/watch?v=21X5lGlDOfg", preview: "#" },
                { id: "OS-989", title: "SOLAR FLARE", producers: "SVYUXU & RANGA", type: "SINGLE", image: "assets/releases/cover_3.png", spotify: "#", apple: "#", youtube: "https://www.youtube.com/watch?v=kJQP7kiw5Fk", preview: "#" }
            ];
            showToast('ARCHIVE INITIALIZED WITH BASELINE CATALOG.');
            renderReleases();
        }
    }).catch(err => {
        showToast('RELEASES ERROR: ' + err.message, 'error');
    });
}

function gatherReleasesData() {
    const editors = document.querySelectorAll('#releases-container .release-editor-item');
    releasesArray = [];
    editors.forEach(ed => {
        const idVal = ed.querySelector('.r-id') ? ed.querySelector('.r-id').value : '';
        const titleVal = ed.querySelector('.r-title') ? ed.querySelector('.r-title').value : '';
        const prodVal = ed.querySelector('.r-producers') ? ed.querySelector('.r-producers').value : '';
        const typeVal = ed.querySelector('.r-type') ? ed.querySelector('.r-type').value : 'SINGLE';
        const imgVal = ed.querySelector('.r-image') ? ed.querySelector('.r-image').value : '';
        const spotVal = ed.querySelector('.r-spotify') ? ed.querySelector('.r-spotify').value : '#';
        const appleVal = ed.querySelector('.r-apple') ? ed.querySelector('.r-apple').value : '#';
        const ytVal = ed.querySelector('.r-youtube') ? ed.querySelector('.r-youtube').value : '#';
        const prevVal = ed.querySelector('.r-preview') ? ed.querySelector('.r-preview').value : '#';
        
        releasesArray.push({
            id: idVal,
            title: titleVal,
            producers: prodVal,
            type: typeVal,
            image: imgVal,
            spotify: spotVal,
            apple: appleVal,
            youtube: ytVal,
            preview: prevVal
        });
    });
}

document.getElementById('save-releases').addEventListener('click', () => {
    gatherReleasesData();
    if (releasesArray.length === 0) {
        showToast("SIGNAL EMPTY: NO RELEASES TO DEPLOY.", "error");
        return;
    }
    db.ref('siteData/releases').set(releasesArray).then(() => {
        bumpSiteVersion();
        showSaveMsg('save-msg-releases');
        showToast("ARCHIVE FREQUENCIES DEPLOYED SUCCESSFULLY.");
    }).catch(err => {
        const advice = window.location.protocol === 'file:' ? "\n\nADVICE: Use 'Live Server' (http) to enable writes locally." : "";
        alert("DEPLOY FAILURE: " + err.message + advice);
    });
});

// --- UPCOMING RELEASES PANEL ---
const upcomingContainer = document.getElementById('upcoming-container');
let upcomingArray = [];

function createUpcomingEditor(item, index) {
    const div = document.createElement('div');
    div.className = 'release-editor-item';
    const previewImg = item.image || 'assets/cover.png';
    
    div.innerHTML = `
        <button class="delete-btn" onclick="removeUpcoming(${index})"><i class="fas fa-trash"></i></button>
        <div class="editor-main-layout">
            <div class="editor-controls">
                <div class="form-grid">
                    <div class="input-group">
                        <label>Upcoming Track ID</label>
                        <p class="field-desc">The scheduled identifier for the future frequency.</p>
                        <input type="text" class="u-id" value="${item.id || ''}" oninput="syncLiveCard(${index})">
                    </div>
                    <div class="input-group">
                        <label>Expected Title</label>
                        <p class="field-desc">The designated title for the unreleased transmission.</p>
                        <input type="text" class="u-title" value="${item.title || ''}" oninput="syncLiveCard(${index})">
                    </div>
                    <div class="input-group">
                        <label>Personnel</label>
                        <p class="field-desc">Participating artists for this upcoming signal.</p>
                        <input type="text" class="u-producers" value="${item.producers || ''}" oninput="syncLiveCard(${index})">
                    </div>
                    <div class="input-group">
                        <label>Release Date</label>
                        <p class="field-desc">The scheduled launch frequency (e.g. 2026.05.20 or COMING SOON).</p>
                        <input type="text" class="u-date" value="${item.date || ''}" oninput="syncLiveCard(${index})">
                    </div>
                    <div class="input-group full">
                        <label>Visual Asset Management</label>
                        <p class="field-desc">Browse local storage (ðŸ’¾) or capture YouTube cover (ðŸª„).</p>
                        <div style="display: flex; gap: 0.5rem; align-items: center; position: relative;">
                            <input type="text" class="u-image" value="${item.image || 'assets/cover.png'}" id="input-u-${index}" oninput="updateLivePreview(this, 'prev-u-${index}'); syncLiveCard(${index})">
                            <button class="action-btn-mini" onclick="triggerUpcomingUpload(${index})"><i class="fas fa-folder-open"></i></button>
                            <button class="action-btn-mini" onclick="autoDetectUpcoming(${index})"><i class="fas fa-wand-magic-sparkles"></i></button>
                            <div id="prev-u-${index}" class="floating-preview"></div>
                            <input type="file" id="file-u-${index}" style="display:none" onchange="handleUpcomingFile(this, ${index})" accept="image/*">
                        </div>
                    </div>
                </div>
            </div>
            <div class="card-preview-zone">
                <label class="preview-label">LIVE PORTAL PREVIEW</label>
                <div id="live-card-${index}" class="admin-live-mock">
                    <!-- Preview card will be injected here -->
                </div>
            </div>
        </div>
    `;
    return div;
}

window.triggerUpcomingUpload = function(index) {
    document.getElementById(`file-u-${index}`).click();
};

window.handleUpcomingFile = function(input, index) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result;
            const input = document.getElementById(`input-u-${index}`);
            input.value = base64;
            updateLivePreview(input, `prev-u-${index}`);
            showToast("COVER ASSET ENCODED (BASE64)");
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.autoDetectUpcoming = function(index) {
    // We attempt to detect from links if they are present in other fields, 
    // but usually user pastes link in the image field first? 
    // Let's check for YouTube specifically.
    const input = document.getElementById(`input-u-${index}`);
    const url = input.value;
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const id = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
        const imgUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        input.value = imgUrl;
        updateLivePreview(input, `prev-u-${index}`);
        syncLiveCard(index);
        showToast("YT COVER CAPTURED.");
    } else if (url.includes('spotify.com')) {
        fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
            .then(res => res.json())
            .then(data => {
                if (data.thumbnail_url) {
                    input.value = data.thumbnail_url;
                    updateLivePreview(input, `prev-u-${index}`);
                    syncLiveCard(index);
                    showToast("SPOTIFY COVER DETECTED.");
                }
            }).catch(() => {});
    } else {
        showToast("DETECTION: Paste YT or SPOTIFY Link into Image field first or browse locally.", "error");
    }
};

function renderUpcoming() {
    const container = document.getElementById('upcoming-container');
    if (!container) return;
    container.innerHTML = '';
    upcomingArray.forEach((item, i) => {
        container.appendChild(createUpcomingEditor(item, i));
        syncLiveCard(i); // Initial mirror
    });
}

window.removeUpcoming = function (index) {
    if(confirm("PURGE UPCOMING ENTRY: Are you sure? This action is permanent.")) {
        // Remove from local array first
        upcomingArray.splice(index, 1);
        
        // Immediate UI feedback
        renderUpcoming();

        // Sync to Firebase
        db.ref('siteData/upcoming').set(upcomingArray).then(() => {
            showToast("UPCOMING ENTRY PURGED FROM SERVER.", "error");
            bumpSiteVersion();
        }).catch(err => {
            showToast("SYNC FAILURE: " + err.message, "error");
            // If sync fails, we might want to reload to show actual state
            loadUpcoming();
        });
    }
};

if (document.getElementById('add-upcoming-btn')) {
    document.getElementById('add-upcoming-btn').addEventListener('click', () => {
        gatherUpcomingData();
        upcomingArray.unshift({ 
            id: "OS-NEW", 
            title: "FUTURE TRACK", 
            producers: "UNKNOWN", 
            date: "COMING SOON",
            image: "assets/cover.png" 
        });
        renderUpcoming();
        showToast("UPCOMING NODE INITIALIZED.");
    });
}

function loadUpcoming() {
    db.ref('siteData/upcoming').once('value').then(snapshot => {
        let data = snapshot.val();
        if (data && Array.isArray(data) && data.length > 0) {
            upcomingArray = data;
        } else {
            upcomingArray = [
                { id: "OS-993", title: "CYBERNETIC VOID", producers: "SVYUXU", date: "COMING SOON", image: "assets/cover.png" }
            ];
        }
        renderUpcoming();
    });
}

function gatherUpcomingData() {
    const container = document.getElementById('upcoming-container');
    if (!container) return;
    const editors = container.querySelectorAll('.release-editor-item');
    upcomingArray = [];
    editors.forEach(ed => {
        const idVal = ed.querySelector('.u-id') ? ed.querySelector('.u-id').value : '';
        const titleVal = ed.querySelector('.u-title') ? ed.querySelector('.u-title').value : '';
        const prodVal = ed.querySelector('.u-producers') ? ed.querySelector('.u-producers').value : '';
        const dateVal = ed.querySelector('.u-date') ? ed.querySelector('.u-date').value : '';
        const imgVal = ed.querySelector('.u-image') ? ed.querySelector('.u-image').value : 'assets/cover.png';

        upcomingArray.push({
            id: idVal,
            title: titleVal,
            producers: prodVal,
            date: dateVal,
            image: imgVal
        });
    });
}

if (document.getElementById('save-upcoming')) {
    document.getElementById('save-upcoming').addEventListener('click', () => {
        gatherUpcomingData();

        // Also save the category visibility setting
        const visibilityEl = document.getElementById('site_showUpcoming');
        if (visibilityEl) {
            db.ref('siteData/globals/showUpcoming').set(visibilityEl.value);
        }

        db.ref('siteData/upcoming').set(upcomingArray).then(() => {
            bumpSiteVersion();
            showSaveMsg('save-msg-upcoming');
            showToast("UPCOMING ARCHIVE DEPLOYED.");
        }).catch(err => {
            showToast("SAVE FAILURE: " + err.message, "error");
        });
    });
}

// --- DEMO INBOX LOGIC (STABILIZED v3 - EVENT DELEGATION) ---
const inboxContainer = document.getElementById('demo-inbox-container');
const refreshBtn = document.getElementById('refresh-inbox');
const clearBtn = document.getElementById('clear-inbox');

let pendingDeleteId = null;
let pendingDeletePath = null;

function loadSubmissions() {
    if (!inboxContainer) return;
    inboxContainer.innerHTML = '<div style="padding:4rem; text-align:center; opacity:0.5; font-family:monospace; letter-spacing:0.2rem;">SCANNING FREQUENCIES...</div>';
    
    // Load both Demos and Contact Mails
    const paths = ['siteData/submissions/demo', 'siteData/submissions/contact'];
    Promise.all(paths.map(p => db.ref(p).once('value'))).then(snapshots => {
        inboxContainer.innerHTML = '';
        let allSubs = [];
        
        snapshots.forEach((snap, index) => {
            const data = snap.val();
            if (data) {
                const type = paths[index].split('/').pop().toUpperCase();
                Object.keys(data).forEach(key => {
                    allSubs.push({ id: key, type: type, path: paths[index], ...data[key] });
                });
            }
        });

        if (allSubs.length === 0) {
            inboxContainer.innerHTML = '<p style="opacity:0.5; font-style:italic; padding:4rem; text-align:center;">No active transmissions detected in the vault.</p>';
            return;
        }

        // Sort by date (reverse)
        allSubs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        allSubs.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'demo-card';
            const typeColor = sub.type === 'DEMO' ? 'var(--accent-blue)' : 'var(--accent-magenta)';
            
            // Analyze Link Integrity
            const safety = analyzeLinkSafety(sub.link || sub.spotify);

            card.innerHTML = `
                <button class="delete-demo-record" data-pid="${sub.id}" data-path="${sub.path}" style="position:absolute; top:1.2rem; right:1.2rem; width:32px; height:32px; background:rgba(255,0,0,0.15); border:1px solid rgba(255,0,0,0.3); color:#ff4444; border-radius:6px; cursor:pointer; z-index:100; display:flex; align-items:center; justify-content:center; transition:0.3s;" title="PURGE RECORD"><i class="fas fa-times"></i></button>
                <div class="demo-header">
                    <div class="demo-title">
                        <div style="font-size: 0.6rem; color: ${typeColor}; font-weight: 800; letter-spacing: 0.1rem; margin-bottom: 0.5rem;">[ ${sub.type} ]</div>
                        <h3 style="color:var(--accent-blue); font-size:1.1rem;">${sub.artist || sub.name || 'ANONYMOUS'}</h3>
                        <p style="font-size:0.65rem; opacity:0.5; font-family:monospace;">SIGNAL RECEIVED: ${sub.date || 'UNKNOWN TIME'}</p>
                    </div>
                </div>
                <div class="demo-meta" style="margin-top:1.5rem; display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                    <div class="meta-item"><label style="font-size:0.6rem; opacity:0.5; display:block; margin-bottom:0.3rem;">NAME</label><span style="font-size:0.85rem;">${sub.name || 'N/A'}</span></div>
                    <div class="meta-item"><label style="font-size:0.6rem; opacity:0.5; display:block; margin-bottom:0.3rem;">SUBJECT / GENRE</label><span style="font-size:0.85rem; color:var(--accent-blue);">${sub.genre || sub.subject || 'N/A'}</span></div>
                    <div class="meta-item" style="grid-column: span 2;"><label style="font-size:0.6rem; opacity:0.5; display:block; margin-bottom:0.3rem;">CONTACT</label><span style="font-size:0.85rem;">${sub.email || 'N/A'}</span></div>
                </div>
                <div class="demo-message" style="background: rgba(255,255,255,0.02); padding: 1.2rem; border-radius: 10px; font-size: 0.8rem; margin-top: 1.5rem; border: 1px solid rgba(255,255,255,0.05); color: #ccc; line-height:1.5;">${sub.message || 'No additional data transmitted.'}</div>
                <div class="demo-actions" style="margin-top:2rem;">
                    <div class="link-safety-badge" style="color:${safety.color}; background: ${safety.color}15; border-color:${safety.color}30;">
                        <i class="fas ${safety.icon}"></i> 
                        INTEGRITY: ${safety.status}
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                        ${sub.link ? `<a href="${sub.link}" target="_blank" class="demo-link-btn" style="display:flex; align-items:center; justify-content:center; gap:0.5rem; padding: 1rem; background: var(--accent-blue); color: #000; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.7rem; letter-spacing:0.1rem; text-transform:uppercase; transition:0.3s;"><i class="fas fa-play-circle"></i> TRACK LINK</a>` : ''}
                        ${sub.spotify ? (sub.spotify.includes(' | ') ? 
                            sub.spotify.split(' | ').map((link, i) => `<a href="${link}" target="_blank" class="demo-link-btn" style="margin-bottom:0.5rem; grid-column: span 2; display:flex; align-items:center; justify-content:center; gap:0.5rem; padding: 1rem; background: #1DB954; color: #fff; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.7rem; letter-spacing:0.1rem; text-transform:uppercase; transition:0.3s;"><i class="fab fa-spotify"></i> LINK ${i+1}</a>`).join('') 
                            : `<a href="${sub.spotify}" target="_blank" class="demo-link-btn" style="display:flex; align-items:center; justify-content:center; gap:0.5rem; padding: 1rem; background: #1DB954; color: #fff; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.7rem; letter-spacing:0.1rem; text-transform:uppercase; transition:0.3s;"><i class="fab fa-spotify"></i> SPOTIFY</a>`) : ''}
                    </div>
                </div>
            `;

            inboxContainer.appendChild(card);
        });
    }).catch(err => {
        console.error("Inbox Error:", err);
        inboxContainer.innerHTML = '<p style="color:var(--accent-magenta); font-style:italic; padding:4rem; text-align:center;">VAULT CONNECTION FAILURE: CHECK KERNEL LINK.</p>';
    });
}

// Robust Event Delegation for Deletion
if (inboxContainer) {
    inboxContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.delete-demo-record');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            pendingDeleteId = btn.dataset.pid;
            pendingDeletePath = btn.dataset.path || 'siteData/submissions/demo';
            const modal = document.getElementById('admin-confirm-modal');
            if (modal) modal.style.display = 'flex';
        }
    });
}

// Modal Controls
const confirmPurgeBtn = document.getElementById('confirm-purge-btn');
const cancelPurgeBtn = document.getElementById('cancel-purge-btn');
const adminConfirmModal = document.getElementById('admin-confirm-modal');

if (confirmPurgeBtn) {
    confirmPurgeBtn.onclick = () => {
        if (pendingDeleteId && pendingDeletePath) {
            db.ref(pendingDeletePath + '/' + pendingDeleteId).remove().then(() => {
                if (adminConfirmModal) adminConfirmModal.style.display = 'none';
                pendingDeleteId = null;
                pendingDeletePath = null;
                loadSubmissions();
            }).catch(err => alert("PURGE FAILURE: " + err.message));
        }
    };
}

// Global Purge All Logic (Stabilized)
const clearInboxBtn = document.getElementById('clear-inbox');
if (clearInboxBtn) {
    clearInboxBtn.onclick = () => {
        if (confirm("CRITICAL WARNING: This will permanently wipe ALL Demos and Contact Mails from the vault. Proceed?")) {
            db.ref('siteData/submissions').remove().then(() => {
                showToast("VAULT PURGED: ALL RECORDS DELETED.");
                loadSubmissions();
            }).catch(err => showToast("PURGE ERROR: " + err.message, "error"));
        }
    };
}

if (cancelPurgeBtn) {
    cancelPurgeBtn.onclick = () => {
        if (adminConfirmModal) adminConfirmModal.style.display = 'none';
        pendingDeleteId = null;
    };
}

if (refreshBtn) refreshBtn.addEventListener('click', loadSubmissions);


// --- STAFF PROFILES PANEL ---
function esc(str) { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function createStaffEditor(staff, discordId, type) {
    const div = document.createElement('div');
    div.className = 'release-editor-item staff-editor-item';
    div.style.marginBottom = '2rem';
    div.dataset.discordId = discordId;
    div.dataset.type = type || 'staff';

    const socials = staff.socials || {};
    const platforms = ['instagram', 'spotify', 'apple', 'facebook', 'youtube', 'tiktok', 'twitter'];
    let socialsHtml = platforms.map(p => `
        <div class="input-group">
            <label>${p.toUpperCase()} LINK</label>
            <input type="text" class="s-social-${p}" value="${esc(socials[p])}" placeholder="https://...">
        </div>`).join('');

    const isPartner = type === 'partner';
    const typeLabel = isPartner ? 'LABEL PARTNER' : 'STAFF MEMBER';
    const accentColor = isPartner ? '#ff00ff' : '#00f0ff';
    const avatarUrl = staff.avatar_url || 'assets/staff/default.png';

    div.innerHTML = `
        <button class="delete-btn" onclick="removeStaffMember('${discordId}','${type || 'staff'}')" title="Delete"><i class="fas fa-trash"></i></button>
        <div class="staff-header-row">
            <div class="staff-meta-main">
                <div class="staff-avatar-circle" id="padmin-${discordId}" style="background-image:url('${esc(avatarUrl)}')"></div>
                <div>
                    <h3>${esc(staff.name || 'UNKNOWN')}</h3>
                    <div style="display:flex;gap:0.6rem;align-items:center;margin-top:0.4rem;flex-wrap:wrap;">
                        <span style="font-family:monospace;font-size:0.68rem;color:var(--text-secret);">ID: ${discordId}</span>
                        <span style="font-size:0.58rem;padding:0.2rem 0.7rem;border-radius:6px;background:rgba(255,255,255,0.05);border:1px solid ${accentColor};color:${accentColor};font-family:'Syncopate',sans-serif;letter-spacing:0.08rem;">${typeLabel}</span>
                    </div>
                </div>
            </div>
            <button class="save-btn save-btn-staff" onclick="saveIndividualStaff('${discordId}')"><i class="fas fa-save"></i> SAVE</button>
        </div>
        <div class="form-grid">
            <div class="input-group">
                <label>DISPLAY NAME</label>
                <p class="field-desc">Name shown on the public site card.</p>
                <input type="text" class="s-name" value="${esc(staff.name)}" placeholder="e.g. SVYUXU">
            </div>
            <div class="input-group">
                <label>ROLE / TITLE</label>
                <p class="field-desc">e.g. CEO, A&amp;R, Head of Marketing</p>
                <input type="text" class="s-role" value="${esc(staff.role)}" placeholder="e.g. A&R">
            </div>
            <div class="input-group full">
                <label>AVATAR IMAGE URL</label>
                <p class="field-desc">Direct image link. Updates the preview below instantly.</p>
                <input type="text" class="s-avatar" value="${esc(staff.avatar_url)}" placeholder="https://..." oninput="(function(v){var el=document.getElementById('padmin-${discordId}');if(el)el.style.backgroundImage='url('+v+')'})(this.value)">
            </div>
            <div class="input-group full">
                <label>DISCORD CONNECT LINK</label>
                <p class="field-desc">Optional Discord invite / profile URL — shown as a button in the public card popup.</p>
                <input type="text" class="s-discord-link" value="${esc(staff.discord_link)}" placeholder="https://discord.gg/...">
            </div>
            <div class="input-group full">
                <label>BIOGRAPHY</label>
                <p class="field-desc">Short bio shown in the profile popup on the public site.</p>
                <textarea class="s-bio">${esc(staff.bio)}</textarea>
            </div>
            <h4 class="form-sub-header">SOCIAL / BROADCAST CHANNELS</h4>
            ${socialsHtml}
        </div>
    `;
    return div;
}

window.removeStaff = function (discordId) {
    window.removeStaffMember(discordId, 'staff');
};

window.removeStaffMember = function (discordId, type) {
    const label = (type === 'partner') ? 'PARTNER' : 'PERSONNEL';
    if (confirm(`SYSTEM OVERRIDE: Purge this ${label} record?`)) {
        const path = (type === 'partner') ? 'partner_status/' : 'staff_status/';
        db.ref(path + discordId).remove().then(() => {
            showToast(`${label} PURGED: ${discordId}`);
            loadStaff();
        }).catch(err => showToast('PURGE ERROR: ' + err.message, 'error'));
    }
};

function loadStaff() {
    const staffContainer = document.getElementById('staff-container');
    const partnersContainer = document.getElementById('partners-container');
    if (!staffContainer) return;

    staffContainer.innerHTML = '<p style="opacity:0.5;padding:2rem;"><i class="fas fa-spinner fa-spin" style="margin-right:0.5rem;color:#00f0ff;"></i>Syncing personnel records...</p>';
    if (partnersContainer) partnersContainer.innerHTML = '<p style="opacity:0.5;padding:2rem;"><i class="fas fa-spinner fa-spin" style="margin-right:0.5rem;color:#ff00ff;"></i>Syncing partner records...</p>';

    const baseStaff = {
        "1296819659131326556": { name: "SVYUXU", status: "offline", bio: "CORE STAFF", avatar_url: "assets/staff/default.png" },
        "1126206273722011708": { name: "RANGA", status: "offline", bio: "CORE STAFF", avatar_url: "assets/staff/default.png" },
        "1145271334922879011": { name: "NEIDRAKE", status: "offline", bio: "CORE STAFF", avatar_url: "assets/staff/default.png" },
        "1099844087961632849": { name: "FL4ME", status: "offline", bio: "CORE STAFF", avatar_url: "assets/staff/default.png" }
    };

    db.ref('staff_status').once('value').then(snapshot => {
        let staffData = snapshot.val() || {};
        if (Object.keys(staffData).length === 0) {
            Object.entries(baseStaff).forEach(([id, s]) => { db.ref('staff_status/' + id).set(s); staffData[id] = s; });
        }
        db.ref('partner_status').once('value').then(pSnapshot => {
            const partnerData = pSnapshot.val() || {};
            staffContainer.innerHTML = '';
            if (partnersContainer) partnersContainer.innerHTML = '';

            Object.entries(staffData).forEach(([id, s]) => staffContainer.appendChild(createStaffEditor(s, id, 'staff')));
            Object.entries(partnerData).forEach(([id, p]) => { if (partnersContainer) partnersContainer.appendChild(createStaffEditor(p, id, 'partner')); });

            if (staffContainer.children.length === 0) staffContainer.innerHTML = '<p style="opacity:0.35;padding:2rem;font-style:italic;">No staff records. Click ADD NEW STAFF MEMBER to create one.</p>';
            if (partnersContainer && partnersContainer.children.length === 0) partnersContainer.innerHTML = '<p style="opacity:0.35;padding:2rem;font-style:italic;">No partner records. Click ADD NEW PARTNER to create one.</p>';
        });
    });
}

function saveStaff() {
    const items = document.querySelectorAll('.staff-editor-item');
    if (items.length === 0) { showToast('NO PERSONNEL RECORDS TO SYNC.', 'error'); return; }
    const staffUpdates = {}, partnerUpdates = {};
    items.forEach(item => {
        const id = item.dataset.discordId;
        const isPartner = item.dataset.type === 'partner';
        const nameInput = item.querySelector('.s-name');
        const bio = item.querySelector('.s-bio').value;
        const avatar = item.querySelector('.s-avatar')?.value || '';
        const role = item.querySelector('.s-role')?.value || '';
        const discordLink = item.querySelector('.s-discord-link')?.value || '';
        const socials = {};
        item.querySelectorAll('input[class^="s-social-"]').forEach(inp => {
            const p = inp.className.replace('s-social-', '');
            if (inp.value.trim()) socials[p] = inp.value.trim();
        });
        const target = isPartner ? partnerUpdates : staffUpdates;
        if (nameInput?.value.trim()) target[id + '/name'] = nameInput.value.trim();
        target[id + '/bio'] = bio;
        target[id + '/avatar_url'] = avatar;
        target[id + '/role'] = role;
        target[id + '/discord_link'] = discordLink;
        target[id + '/socials'] = socials;
    });
    const p1 = Object.keys(staffUpdates).length > 0 ? db.ref('staff_status').update(staffUpdates) : Promise.resolve();
    const p2 = Object.keys(partnerUpdates).length > 0 ? db.ref('partner_status').update(partnerUpdates) : Promise.resolve();
    Promise.all([p1, p2]).then(() => {
        showToast('FULL DIRECTORY SYNC SUCCESSFUL.');
        showSaveMsg('save-msg-staff');
        bumpSiteVersion();
        loadStaff();
    }).catch(err => showToast('SYNC ERROR: ' + err.message, 'error'));
}

// ─── ADD NEW STAFF / PARTNER ───────────────────────────────────────────────────
window.openAddMemberModal = function(type) {
    document.getElementById('add-member-modal-overlay')?.remove();
    const isP = type === 'partner';
    const lbl = isP ? 'LABEL PARTNER' : 'STAFF MEMBER';
    const clr = isP ? '#ff00ff' : '#00f0ff';
    const ov = document.createElement('div');
    ov.id = 'add-member-modal-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.88);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;';
    ov.innerHTML = `
        <div style="background:#09090f;border:1px solid ${clr};border-radius:28px;padding:3rem;width:100%;max-width:500px;box-shadow:0 0 80px ${clr}22;position:relative;">
            <button onclick="document.getElementById('add-member-modal-overlay').remove()" style="position:absolute;top:1rem;right:1.5rem;background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;opacity:0.5;">&times;</button>
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:2rem;">
                <i class="fas ${isP ? 'fa-handshake' : 'fa-user-plus'}" style="font-size:2rem;color:${clr};"></i>
                <div>
                    <h2 style="font-family:'Syncopate',sans-serif;font-size:0.95rem;letter-spacing:0.2rem;color:${clr};">ADD NEW ${lbl}</h2>
                    <p style="font-size:0.7rem;opacity:0.45;margin-top:0.3rem;">Written to Firebase immediately.</p>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:1rem;">
                <div>
                    <label style="display:block;font-size:0.65rem;letter-spacing:0.15rem;opacity:0.55;margin-bottom:0.4rem;font-family:'Syncopate',sans-serif;">DISPLAY NAME *</label>
                    <input id="nm-name" type="text" placeholder="e.g. SVYUXU" style="width:100%;padding:0.85rem 1.1rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:0.9rem;font-family:inherit;outline:none;">
                </div>
                <div>
                    <label style="display:block;font-size:0.65rem;letter-spacing:0.15rem;opacity:0.55;margin-bottom:0.4rem;font-family:'Syncopate',sans-serif;">DISCORD USER ID *</label>
                    <input id="nm-id" type="text" placeholder="e.g. 1296819659131326556" style="width:100%;padding:0.85rem 1.1rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:0.9rem;font-family:inherit;outline:none;">
                    <small style="font-size:0.62rem;opacity:0.35;margin-top:0.3rem;display:block;">Right-click user in Discord &rarr; Copy User ID (requires Developer Mode)</small>
                </div>
                <div>
                    <label style="display:block;font-size:0.65rem;letter-spacing:0.15rem;opacity:0.55;margin-bottom:0.4rem;font-family:'Syncopate',sans-serif;">ROLE / TITLE</label>
                    <input id="nm-role" type="text" placeholder="e.g. A&R, CEO, Label Head" style="width:100%;padding:0.85rem 1.1rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:0.9rem;font-family:inherit;outline:none;">
                </div>
                <div id="nm-error" style="color:#ff4466;font-size:0.75rem;display:none;padding:0.4rem 0;"></div>
                <button onclick="addNewMember('${type}')" style="padding:1.1rem;border-radius:14px;border:2px solid ${clr};background:transparent;color:${clr};font-family:'Syncopate',sans-serif;font-size:0.72rem;letter-spacing:0.15rem;cursor:pointer;transition:all 0.3s;font-weight:700;" onmouseover="this.style.background='${clr}';this.style.color='#000'" onmouseout="this.style.background='transparent';this.style.color='${clr}'">
                    <i class="fas fa-plus"></i> CREATE ${lbl} RECORD
                </button>
            </div>
        </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if(e.target===ov) ov.remove(); });
    setTimeout(() => document.getElementById('nm-name')?.focus(), 80);
};

window.addNewMember = function(type) {
    const name = document.getElementById('nm-name')?.value.trim();
    const discordId = document.getElementById('nm-id')?.value.trim();
    const role = document.getElementById('nm-role')?.value.trim() || '';
    const err = document.getElementById('nm-error');
    if (!name || !discordId) { if(err){err.textContent='Name and Discord ID are required.';err.style.display='block';} return; }
    if (!/^\d{17,20}$/.test(discordId)) { if(err){err.textContent='Invalid Discord ID (17-20 digits).';err.style.display='block';} return; }
    if(err) err.style.display='none';
    const path = type === 'partner' ? 'partner_status/' : 'staff_status/';
    const record = { name, status: 'offline', bio: '', role, discord_link: '', avatar_url: 'assets/staff/default.png', socials: {} };
    db.ref(path + discordId).once('value').then(snap => {
        if (snap.exists()) { if(err){err.textContent='A record with this Discord ID already exists.';err.style.display='block';} return; }
        db.ref(path + discordId).set(record).then(() => {
            document.getElementById('add-member-modal-overlay')?.remove();
            showToast(`${type==='partner'?'PARTNER':'STAFF'} CREATED: ${name}`);
            bumpSiteVersion();
            loadStaff();
        }).catch(e => { if(err){err.textContent='Firebase error: '+e.message;err.style.display='block';} });
    });
};

// Individual save function moved to top for scope safety

const saveReleasesBtn = document.getElementById('save-releases');
// Removed duplicate saveReleasesBtn listener to prevent multi-trigger

const initStaffBtn = document.getElementById('init-staff-btn');
if (initStaffBtn) {
    initStaffBtn.addEventListener('click', () => {
        if (confirm('Initialize base staff records? This will only add missing entries and WON\'T overwrite existing avatars.')) {
            const baseStaff = {
                "1296819659131326556": { name: "SVYUXU", status: "offline", bio: "CORE STAFF", avatar_url: "assets/staff/default.png" },
                "1126206273722011708": { name: "RANGA", status: "offline", bio: "CORE STAFF", avatar_url: "assets/staff/default.png" },
                "1145271334922879011": { name: "NEIDRAKE", status: "offline", bio: "CORE STAFF", avatar_url: "assets/staff/default.png" },
                "1099844087961632849": { name: "FL4ME", status: "offline", bio: "CORE STAFF", avatar_url: "assets/staff/default.png" },
                "1466152706145128659": { name: "Itx Record Label", status: "offline", bio: "LABEL PARTNER", avatar_url: "assets/staff/default.png" }
            };

            Object.entries(baseStaff).forEach(([id, staff]) => {
                db.ref('staff_status/' + id).once('value').then(snap => {
                    if (!snap.exists()) {
                        db.ref('staff_status/' + id).set(staff);
                    }
                });
            });

            alert('Safe initialization sequence initiated. Reloading in 1s...');
            setTimeout(() => window.location.reload(), 1000);
        }
    });
}

// Dynamic Preview Logic (Global Spectrum - Now with Auto-Detection Intelligence)
window.updateLivePreview = function(input, previewId) {
    const previewDiv = document.getElementById(previewId);
    if (!previewDiv) return;
    
    let url = input.value.trim();
    if (!url || url === '#' || url === 'assets/cover.png') {
        previewDiv.classList.remove('show');
        return;
    }

    // Full-Auto Analysis: YouTube Spectrum
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const id = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
        const imgUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        previewDiv.innerHTML = `<img src="${imgUrl}" onerror="this.parentElement.classList.remove('show')">`;
        previewDiv.classList.add('show');
        return;
    }

    // Full-Auto Analysis: Spotify Spectrum
    if (url.includes('spotify.com')) {
        fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
            .then(res => res.json())
            .then(data => {
                if (data.thumbnail_url) {
                    previewDiv.innerHTML = `<img src="${data.thumbnail_url}" onerror="this.parentElement.classList.remove('show')">`;
                    previewDiv.classList.add('show');
                }
            }).catch(() => {}); // Silent fail for auto-detect to avoid noise
        return;
    }

    // Direct Image Link Analysis
    previewDiv.innerHTML = `<img src="${url}" onerror="this.parentElement.classList.remove('show')">`;
    previewDiv.classList.add('show');
};

// Live Card Sync Intelligence
window.syncLiveCard = function(index) {
    const editor = document.querySelectorAll('#upcoming-container .release-editor-item')[index];
    const previewDiv = document.getElementById(`live-card-${index}`);
    if (!editor || !previewDiv) return;

    const id = editor.querySelector('.u-id').value;
    const title = editor.querySelector('.u-title').value;
    const producers = editor.querySelector('.u-producers').value;
    const date = editor.querySelector('.u-date').value;
    const image = editor.querySelector('.u-image').value;

    previewDiv.innerHTML = `
        <div class="release-card-large upcoming-card" style="margin: 0; pointer-events: none; transform: scale(0.85); transform-origin: top left;">
            <div class="upcoming-status-badge">COMING SOON</div>
            <div class="release-cover-large">
                <img src="${image || 'assets/cover.png'}" alt="Preview" style="height: 320px; width: 100%; object-fit: cover;">
            </div>
            <div class="release-info-large" style="padding: 1.5rem;">
                ${id ? `<span class="track-id">${id}</span>` : ''}
                <h4 style="font-size: 1.2rem;">${title || 'FUTURE TRACK'}</h4>
                <div class="producers-text" style="font-size: 0.75rem;">Produced by: <span>${producers || 'UNKNOWN'}</span></div>
                ${date ? `<div class="upcoming-date-badge" style="margin-top: 0.8rem; font-size: 0.65rem; padding: 0.4rem 0.8rem;"><i class="far fa-calendar-alt"></i> ${date}</div>` : ''}
            </div>
        </div>
    `;
};

window.syncLiveReleaseCard = function(index) {
    const editor = document.querySelectorAll('#releases-container .release-editor-item')[index];
    const previewDiv = document.getElementById(`live-release-card-${index}`);
    if (!editor || !previewDiv) return;

    const id = editor.querySelector('.r-id').value;
    const title = editor.querySelector('.r-title').value;
    const producers = editor.querySelector('.r-producers').value;
    const type = editor.querySelector('.r-type').value;
    const image = editor.querySelector('.r-image').value;

    previewDiv.innerHTML = `
        <div class="release-card-large" style="margin: 0; pointer-events: none; transform: scale(0.85); transform-origin: top left;">
            <div class="release-type-badge">${type || 'SINGLE'}</div>
            <div class="release-cover-large">
                <img src="${image || 'assets/cover.png'}" alt="Preview" style="height: 320px; width: 100%; object-fit: cover;">
                <div class="player-overlay" style="opacity: 1; background: rgba(0,0,0,0.3);">
                    <div class="play-btn" style="width: 50px; height: 50px; font-size: 1rem;"><i class="fas fa-play"></i></div>
                </div>
            </div>
            <div class="release-info-large" style="padding: 1.5rem;">
                ${id ? `<span class="track-id">${id}</span>` : ''}
                <h4 style="font-size: 1.2rem;">${title || 'TRACK TITLE'}</h4>
                <div class="producers-text" style="font-size: 0.75rem;">Produced by: <span>${producers || 'UNKNOWN'}</span></div>
            </div>
        </div>
    `;
};

// Initial load
initializeSecurity();

// --- POPULAR RELEASES PANEL ---
const popularContainer = document.getElementById('popular-container');
let popularReleasesArray = [];

function createPopularEditor(release, index) {
    const div = document.createElement('div');
    div.className = 'release-editor-item';
    div.innerHTML = `
        <button class="delete-btn" onclick="removePopularRelease(${index})"><i class="fas fa-trash"></i></button>
        <div class="editor-main-layout">
            <div class="editor-controls">
                <div class="form-grid">
                    <div class="input-group">
                        <label>Release Title</label>
                        <input type="text" class="p-title" value="${release.title || ''}" oninput="syncLivePopularCard(${index})">
                    </div>
                    <div class="input-group">
                        <label>Artist / Producer</label>
                        <input type="text" class="p-artist" value="${release.artist || ''}" oninput="syncLivePopularCard(${index})">
                    </div>
                    <div class="input-group full">
                        <label>Cover Image Source</label>
                        <div style="display: flex; gap: 0.5rem; align-items: center; position: relative;">
                            <input type="text" class="p-image" value="${release.image || 'assets/cover.png'}" id="input-p-${index}" oninput="autoDetectPopularRelease(${index}); updateLivePreview(this, 'prev-p-${index}'); syncLivePopularCard(${index})">
                            <button class="action-btn-mini" onclick="triggerPopularUpload(${index})"><i class="fas fa-folder-open"></i></button>
                            <div id="prev-p-${index}" class="floating-preview"></div>
                            <input type="file" id="file-p-${index}" style="display:none" onchange="handlePopularFile(this, ${index})" accept="image/*">
                        </div>
                    </div>
                    <div class="input-group">
                        <label><i class="fab fa-spotify"></i> Spotify Link</label>
                        <input type="text" class="p-spotify" value="${release.spotify || '#'}" oninput="autoDetectPopularRelease(${index}); syncLivePopularCard(${index})">
                    </div>
                    <div class="input-group">
                        <label><i class="fab fa-youtube"></i> YouTube Link</label>
                        <input type="text" class="p-youtube" value="${release.youtube || '#'}" oninput="autoDetectPopularRelease(${index}); syncLivePopularCard(${index})">
                    </div>
                    <div class="input-group">
                        <label><i class="fab fa-apple"></i> Apple Music Link</label>
                        <input type="text" class="p-apple" value="${release.apple || '#'}" oninput="syncLivePopularCard(${index})">
                    </div>
                </div>
            </div>
            <div class="card-preview-zone">
                <label class="preview-label">PORTAL PREVIEW</label>
                <div id="live-popular-card-${index}" class="admin-live-mock">
                    <!-- Preview card will be injected here -->
                </div>
            </div>
        </div>
    `;
    return div;
}

window.syncLivePopularCard = function(index) {
    const editor = document.querySelectorAll('#popular-container .release-editor-item')[index];
    const preview = document.getElementById(`live-popular-card-${index}`);
    if (!editor || !preview) return;

    const title = editor.querySelector('.p-title').value;
    const artist = editor.querySelector('.p-artist').value;
    const img = editor.querySelector('.p-image').value;
    const spotify = editor.querySelector('.p-spotify').value;
    const youtube = editor.querySelector('.p-youtube').value;
    const apple = editor.querySelector('.p-apple').value;

    preview.innerHTML = `
        <div class="popular-card" style="width: 220px; transform: scale(0.85); transform-origin: top left; cursor: default; margin: 0;">
            <div class="trending-badge">TRENDING</div>
            <div class="popular-cover">
                <img src="${img}" alt="${title}" style="height: 220px; object-fit: cover;">
                <div class="popular-overlay">
                    <div class="play-icon-glow"><i class="fas fa-play"></i></div>
                </div>
            </div>
            <div class="popular-info">
                <h3 style="font-size: 1rem;">${title || 'TRACK TITLE'}</h3>
                <p style="font-size: 0.65rem;">${artist || 'ARTIST NAME'}</p>
                <div class="popular-links" style="margin-top: 0.5rem; gap: 0.5rem;">
                    ${spotify !== '#' ? `<i class="fab fa-spotify" style="color: #1DB954; font-size: 0.9rem;"></i>` : ''}
                    ${youtube !== '#' ? `<i class="fab fa-youtube" style="color: #FF0000; font-size: 0.9rem;"></i>` : ''}
                    ${apple !== '#' ? `<i class="fab fa-apple" style="color: #fa243c; font-size: 0.9rem;"></i>` : ''}
                </div>
            </div>
        </div>
    `;
};

window.triggerPopularUpload = function(index) {
    document.getElementById(`file-p-${index}`).click();
};

window.handlePopularFile = function(input, index) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const pInput = document.getElementById(`input-p-${index}`);
            pInput.value = e.target.result;
            updateLivePreview(pInput, `prev-p-${index}`);
            syncLivePopularCard(index);
            showToast("POPULAR COVER ENCODED.");
        };
        reader.readAsDataURL(input.files[0]);
    }
};

function renderPopularReleases() {
    popularContainer.innerHTML = '';
    popularReleasesArray.forEach((r, i) => {
        popularContainer.appendChild(createPopularEditor(r, i));
        syncLivePopularCard(i);
    });
}

window.loadPopularReleases = function() {
    popularContainer.innerHTML = '<p style="opacity:0.5; padding:2rem;">Scanning high-priority frequencies...</p>';
    
    // Load visibility switch
    db.ref('siteData/globals/showPopular').once('value').then(snap => {
        if (snap.exists()) {
            document.getElementById('site_showPopular').value = snap.val();
        }
    });

    db.ref('siteData/popular_releases').once('value').then(snapshot => {
        let data = snapshot.val();
        popularReleasesArray = (data && Array.isArray(data)) ? data : [];
        renderPopularReleases();
        if(popularReleasesArray.length > 0) showToast(`POPULAR GRID SYNCED: ${popularReleasesArray.length} HITS.`);
    });
};

window.removePopularRelease = function(index) {
    if(confirm("PURGE POPULAR FREQUENCY?")) {
        popularReleasesArray.splice(index, 1);
        renderPopularReleases();
    }
};

const addPopBtn = document.getElementById('add-popular-btn');
if(addPopBtn) {
    addPopBtn.onclick = () => {
        popularReleasesArray.unshift({
            title: "NEW HIT",
            artist: "ARTIST",
            image: "assets/cover.png",
            link: "#"
        });
        renderPopularReleases();
        showToast("POPULAR SLOT INITIALIZED.");
    };
}

document.getElementById('save-popular').addEventListener('click', () => {
    const items = document.querySelectorAll('#popular-container .release-editor-item');
    let dataToSave = [];
    items.forEach(item => {
        dataToSave.push({
            title: item.querySelector('.p-title').value,
            artist: item.querySelector('.p-artist').value,
            image: item.querySelector('.p-image').value,
            spotify: item.querySelector('.p-spotify').value,
            youtube: item.querySelector('.p-youtube').value,
            apple: item.querySelector('.p-apple').value
        });
    });

    // Save visibility switch
    const visibility = document.getElementById('site_showPopular').value;
    db.ref('siteData/globals/showPopular').set(visibility);

    db.ref('siteData/popular_releases').set(dataToSave).then(() => {
        bumpSiteVersion();
        showSaveMsg('save-msg-popular');
        showToast("POPULAR GRID DEPLOYED TO MAIN PORTAL.");
    });
});
