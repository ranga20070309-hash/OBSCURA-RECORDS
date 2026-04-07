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

window.saveIndividualStaff = function(discordId) {
    alert("SYNC ATTEMPT STARTED FOR: " + discordId);
    const item = document.querySelector(`.staff-editor-item[data-discord-id="${discordId}"]`);
    if (!item) {
        alert("CRITICAL ERROR: Editor item not found for " + discordId);
        return;
    }
    const bio = item.querySelector('.s-bio').value;
    const avatar = item.querySelector('.s-avatar') ? item.querySelector('.s-avatar').value : '';
    const socials = {};
    item.querySelectorAll('input[class^="s-social-"]').forEach(input => {
        const platform = input.className.replace('s-social-', '');
        if (input.value.trim() !== '') {
            socials[platform] = input.value.trim();
        }
    });
    const data = { bio: bio, avatar_url: avatar, socials: socials };
    db.ref('staff_status/' + discordId).update(data).then(() => {
        alert('SUCCESS: Personnel frequency synced for ID ' + discordId);
        bumpSiteVersion();
        loadStaff(); 
    }).catch(err => {
        alert('SYNC ERROR: ' + err.message);
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
            alert("NAV: SWITCHING TO RELEASES PANEL...");
            loadReleases();
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
    if (window.innerWidth < 1024) {
        if (mobileBlockOverlay) {
            mobileBlockOverlay.style.display = 'flex';
            initMobileVibe(); // Start secondary engine
        }
        document.body.style.overflow = 'hidden';
    } else {
        if (mobileBlockOverlay) mobileBlockOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
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
    for(let i=0; i<80; i++) pArray.push(new P());
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

    // Track real auth state via Firebase
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log("Transmission link secured for:", user.email);
            unlockDashboard();
        } else {
            console.log("Portal locked. Awaiting valid authorization.");
            if (loginOverlay) loginOverlay.style.display = 'flex';
            if (adminWrapper) adminWrapper.style.display = 'none';
        }
    });
}

function unlockDashboard() {
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (adminWrapper) adminWrapper.style.display = 'flex';
    sessionStorage.setItem('rootAuth', 'granted');
    
    // DELAYED DATA GATING (Fully Isolated for Stability)
    try { loadGlobals(); } catch(e) { console.error("Globals fail:", e); }
    try { loadSubmissions(); } catch(e) { console.error("Submissions fail:", e); }
    try { loadReleases(); } catch(e) { console.error("Releases fail:", e); }
    try { loadUpcoming(); } catch(e) { console.error("Upcoming fail:", e); }
    try { loadStaff(); } catch(e) { console.error("Staff fail:", e); }
    
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
            if (alarmOverlay) alarmOverlay.style.display = 'none'; // OVERRIDE FOR ROOT ACCESS
            if (alarmTypeText) alarmTypeText.textContent = `TYPE: ${alarm.type || 'UNKNOWN'} | TRACE: ${new Date(alarm.time).toLocaleTimeString()}`;
            
            // Highlight the security monitor in admin
            const kmShield = document.getElementById('km-shield');
            if (kmShield) {
                kmShield.textContent = "EXTERNAL THREAT";
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
(function() {
    // Check for auth state and start sync once ready
    firebase.auth().onAuthStateChanged((user) => {
        if (user) initGlobalAlarmSync();
    });
})();

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

        firebase.auth().signInWithEmailAndPassword(email, pass)
            .then((userCredential) => {
                alert("ACCESS GRANTED: Root frequency synced.");
            })
            .catch((error) => {
                loginError.textContent = "AUTH FAILURE: " + error.message;
                loginError.style.display = 'block';
                passInput.value = '';
                loginBtn.innerHTML = '<i class="fas fa-unlock"></i> INITIATE ACCESS';
                loginBtn.disabled = false;
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
(function() {
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
            if (data && data[key] !== undefined) {
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
        // Handle Security Key update separately if modified
        const keyInput = document.getElementById('security_rootKey');
        if (keyInput) {
            db.ref('siteData/security/rootKey').set(keyInput.value);
        }
        bumpSiteVersion();
        showSaveMsg(msgId);
    });
}

document.getElementById('save-globals').addEventListener('click', () => saveGlobals('save-msg-globals'));
document.getElementById('save-links').addEventListener('click', () => saveGlobals('save-msg-links'));
document.getElementById('save-modals-text').addEventListener('click', () => saveGlobals('save-msg-modals-text'));
if(document.getElementById('save-modals-all-data')) {
    document.getElementById('save-modals-all-data').addEventListener('click', () => saveGlobals('save-msg-modals-all-data'));
}
if(document.getElementById('save-staff')) {
    document.getElementById('save-staff').addEventListener('click', saveStaff);
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
        <div class="form-grid">
            <div class="input-group">
                <label>Track ID / Badge (e.g. OS-992 <span class='badge'>NEW</span>)</label>
                <input type="text" class="r-id" value="${release.id || ''}">
            </div>
            <div class="input-group">
                <label>Title</label>
                <input type="text" class="r-title" value="${release.title || ''}">
            </div>
            <div class="input-group">
                <label>Producers</label>
                <input type="text" class="r-producers" value="${release.producers || ''}">
            </div>
            <div class="input-group">
                <label>Release Type (SINGLE / EP / ALBUM)</label>
                <input type="text" class="r-type" value="${release.type || 'SINGLE'}">
            </div>
            <div class="input-group">
                <label>Cover Image Source</label>
                <input type="text" class="r-image" value="${release.image || 'assets/cover.png'}">
            </div>
            <div class="input-group full" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                <div><label><i class="fab fa-spotify" style="color:#1DB954"></i> Spotify Link</label>
                <input type="text" class="r-spotify" value="${release.spotify || '#'}"></div>
                <div><label><i class="fab fa-apple" style="color:#fa243c"></i> Apple Link</label>
                <input type="text" class="r-apple" value="${release.apple || '#'}"></div>
                <div><label><i class="fab fa-youtube" style="color:#FF0000"></i> YouTube Link</label>
                <input type="text" class="r-youtube" value="${release.youtube || '#'}"></div>
            </div>
            <div class="input-group full">
                <label><i class="fas fa-play-circle" style="color:var(--accent-blue)"></i> Preview Audio URL (MP3/Snippet)</label>
                <input type="text" class="r-preview" value="${release.preview || ''}" placeholder="Paste direct MP3/WAV link here...">
            </div>
        </div>
    `;
    return div;
}

function renderReleases() {
    const releasesContainer = document.getElementById('releases-container');
    if (!releasesContainer) return;
    
    releasesContainer.innerHTML = '';
    releasesArray.forEach((r, i) => {
        releasesContainer.appendChild(createReleaseEditor(r, i));
    });
}

window.removeRelease = function(index) {
    gatherReleasesData(); // Save current state before removing
    releasesArray.splice(index, 1);
    renderReleases();
};

const addRelBtn = document.getElementById('add-release-btn');
if (addRelBtn) {
    addRelBtn.onclick = () => {
        gatherReleasesData();
        releasesArray.unshift({
            id: "OS-NEW", title: "NEW TRACK", producers: "UNKNOWN", type: "SINGLE", 
            image: "assets/cover.png", spotify: "#", apple: "#", youtube: "#"
        });
        renderReleases();
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
        
        if (data && Array.isArray(data)) {
            alert('RELEASES DETECTED: Found ' + data.length + ' tracks in archive.');
            if (data[0] && data[0]._isEmpty) {
                releasesArray = [];
            } else {
                releasesArray = data;
            }
            renderReleases();
        } else {
            alert('NOTICE: Release archive is empty or using defaults.');
            releasesArray = [
                { id: "OS-992 <span class='badge'>NEW</span>", title: "STARLIGHT SYNDROME", producers: "SVYUXU & OBSCURA", type: "SINGLE", image: "assets/cover.png", spotify: "#", apple: "#", youtube: "https://www.youtube.com/watch?v=A0FZIwabctw", preview: "" },
                { id: "OS-991", title: "NEUTRON PULSE", producers: "RANGA", type: "EP", image: "assets/releases/cover_1.png", spotify: "#", apple: "#", youtube: "https://www.youtube.com/watch?v=jfKfPfyJRdk", preview: "" },
                { id: "OS-990", title: "VOID WALKER", producers: "FL4ME", type: "ALBUM", image: "assets/releases/cover_2.png", spotify: "#", apple: "#", youtube: "https://www.youtube.com/watch?v=21X5lGlDOfg", preview: "" },
                { id: "OS-989", title: "SOLAR FLARE", producers: "SVYUXU & RANGA", type: "SINGLE", image: "assets/releases/cover_3.png", spotify: "#", apple: "#", youtube: "https://www.youtube.com/watch?v=kJQP7kiw5Fk", preview: "" }
            ];
            renderReleases();
        }
    }).catch(err => {
        alert('RELEASES ERROR: ' + err.message);
    });
}

function gatherReleasesData() {
    const editors = document.querySelectorAll('#releases-container .release-editor-item');
    releasesArray = [];
    editors.forEach(ed => {
        releasesArray.push({
            id: ed.querySelector('.r-id').value,
            title: ed.querySelector('.r-title').value,
            producers: ed.querySelector('.r-producers').value,
            type: ed.querySelector('.r-type').value,
            image: ed.querySelector('.r-image').value,
            spotify: ed.querySelector('.r-spotify').value,
            apple: ed.querySelector('.r-apple').value,
            youtube: ed.querySelector('.r-youtube').value,
            preview: ed.querySelector('.r-preview').value,
        });
    });
}

document.getElementById('save-releases').addEventListener('click', () => {
    gatherReleasesData();
    db.ref('siteData/releases').set(releasesArray).then(() => {
        bumpSiteVersion();
        showSaveMsg('save-msg-releases');
    });
});

// --- UPCOMING RELEASES PANEL ---
const upcomingContainer = document.getElementById('upcoming-container');
let upcomingArray = [];

function createUpcomingEditor(item, index) {
    const div = document.createElement('div');
    div.className = 'release-editor-item';
    div.innerHTML = `
        <button class="delete-btn" onclick="removeUpcoming(${index})"><i class="fas fa-trash"></i></button>
        <div class="form-grid">
            <div class="input-group">
                <label>Track ID / Badge (e.g. OS-NEW <span class='badge'>COMING SOON</span>)</label>
                <input type="text" class="u-id" value="${item.id || ''}">
            </div>
            <div class="input-group">
                <label>Title</label>
                <input type="text" class="u-title" value="${item.title || ''}">
            </div>
            <div class="input-group">
                <label>Producers</label>
                <input type="text" class="u-producers" value="${item.producers || ''}">
            </div>
            <div class="input-group">
                <label>Cover Image Source</label>
                <input type="text" class="u-image" value="${item.image || 'assets/cover.png'}">
            </div>
        </div>
    `;
    return div;
}

function renderUpcoming() {
    if (!upcomingContainer) return;
    upcomingContainer.innerHTML = '';
    upcomingArray.forEach((item, i) => {
        upcomingContainer.appendChild(createUpcomingEditor(item, i));
    });
}

window.removeUpcoming = function(index) {
    gatherUpcomingData();
    upcomingArray.splice(index, 1);
    renderUpcoming();
};

if (document.getElementById('add-upcoming-btn')) {
    document.getElementById('add-upcoming-btn').addEventListener('click', () => {
        gatherUpcomingData();
        upcomingArray.unshift({ id: "OS-NEW", title: "FUTURE TRACK", producers: "UNKNOWN", image: "assets/cover.png" });
        renderUpcoming();
    });
}

function loadUpcoming() {
    db.ref('siteData/upcoming').once('value').then(snapshot => {
        let data = snapshot.val();
        if (data && Array.isArray(data)) {
            upcomingArray = data;
            renderUpcoming();
        }
    });
}

function gatherUpcomingData() {
    const editors = document.querySelectorAll('#upcoming-container .release-editor-item');
    upcomingArray = [];
    editors.forEach(ed => {
        upcomingArray.push({
            id: ed.querySelector('.u-id').value,
            title: ed.querySelector('.u-title').value,
            producers: ed.querySelector('.u-producers').value,
            image: ed.querySelector('.u-image').value
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
        });
    });
}

// --- DEMO INBOX LOGIC ---
const inboxContainer = document.getElementById('demo-inbox-container');
const refreshBtn = document.getElementById('refresh-inbox');
const clearBtn = document.getElementById('clear-inbox');

function loadSubmissions() {
    if (!inboxContainer) return;
    inboxContainer.innerHTML = '<p style="opacity:0.5">Scanning frequencies...</p>';
    
    db.ref('siteData/submissions/demo').once('value').then(snapshot => {
        const data = snapshot.val();
        inboxContainer.innerHTML = '';
        if (!data) {
            inboxContainer.innerHTML = '<p style="opacity:0.5; font-style:italic;">No active transmissions detected.</p>';
            return;
        }

        const subs = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
        subs.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'demo-card';
            card.innerHTML = `
                <div class="demo-header">
                    <div class="demo-title">
                        <h3>${sub.artist || 'UNKNOWN'}</h3>
                        <p>${sub.date || 'DATETIME MISSING'}</p>
                    </div>
                    <button class="delete-btn" onclick="deleteSub('${sub.id}')"><i class="fas fa-times"></i></button>
                </div>
                <div class="demo-meta">
                    <div class="meta-item"><label>Real Name</label><span>${sub.name || 'N/A'}</span></div>
                    <div class="meta-item"><label>Contact</label><span>${sub.email || 'N/A'}</span></div>
                    <div class="meta-item"><label>Genre</label><span>${sub.genre || 'N/A'}</span></div>
                </div>
                ${sub.message ? '<div class="demo-message">' + sub.message + '</div>' : ''}
                <a href="${sub.link}" target="_blank" class="demo-link-btn" style="background: rgba(255, 255, 255, 0.05); color: var(--text-primary);"><i class="fas fa-external-link-alt"></i> ACCESS STORED SONG (Cloud Link)</a>
            `;
            inboxContainer.appendChild(card);
        });
    }).catch(err => {
        console.error("Inbox Error:", err);
        inboxContainer.innerHTML = '<p style="color:var(--accent-magenta); font-style:italic;">LINK FAILURE: Check your galactic connection.</p>';
    });
}

window.deleteSub = function(id) {
    if (confirm('Permanently wipe this transmission record?')) {
        db.ref('siteData/submissions/demo/' + id).remove().then(loadSubmissions);
    }
};

if (refreshBtn) refreshBtn.addEventListener('click', loadSubmissions);
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        if (confirm('SYSTEM OVERRIDE: Purge ALL transmission records in the vault?')) {
            db.ref('siteData/submissions/demo').remove().then(loadSubmissions);
        }
    });
}

// --- STAFF PROFILES PANEL ---
function createStaffEditor(staff, discordId) {
    const div = document.createElement('div');
    div.className = 'release-editor-item staff-editor-item';
    div.style.marginBottom = '2.5rem';
    div.style.background = 'rgba(255,255,255,0.02)';
    div.style.padding = '2.5rem';
    div.style.borderRadius = '24px';
    div.style.border = '1px solid rgba(255,255,255,0.05)';
    div.dataset.discordId = discordId;
    
    // Socials section
    const socials = staff.socials || {};
    const platforms = ['instagram', 'spotify', 'apple', 'facebook', 'youtube', 'tiktok', 'twitter'];
    let socialsHtml = '';
    platforms.forEach(p => {
        socialsHtml += `
            <div class="input-group">
                <label>${p.toUpperCase()} LINK</label>
                <input type="text" class="s-social-${p}" value="${socials[p] || ''}" placeholder="https://...">
            </div>
        `;
    });

    div.innerHTML = `
        <button class="delete-btn" onclick="removeStaff('${discordId}')"><i class="fas fa-trash"></i></button>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 1.5rem;">
            <div style="display: flex; align-items: center; gap: 2rem;">
                <div style="width: 70px; height: 70px; border-radius: 50%; background-image: url(${staff.avatar_url || 'assets/staff/default.png'}); background-position: center; background-size: cover; border: 2px solid var(--accent-blue); background-color: #000;"></div>
                <div>
                    <h3 style="margin:0; color:var(--accent-blue); font-size: 1.4rem;">${staff.name || 'UNKNOWN'}</h3>
                    <small style="opacity:0.5; letter-spacing: 0.1rem;">ACCESS KEY: ${discordId}</small>
                </div>
            </div>
            <button class="save-btn" style="padding: 0.8rem 1.5rem; font-size: 0.7rem; border-radius: 10px;" onclick="saveIndividualStaff('${discordId}')"><i class="fas fa-save"></i> SYNC INDIVIDUAL TRANSMISSION</button>
        </div>
        <div class="form-grid">
            <div class="input-group full">
                <label>AVATAR SOURCE URL (IMAGE LINK)</label>
                <input type="text" class="s-avatar" value="${staff.avatar_url || ''}" placeholder="Paste image link here (PNG/JPG)...">
            </div>
            <div class="input-group full">
                <label>PERSONNEL BIOGRAPHY (HTML ALLOWED)</label>
                <textarea class="s-bio" style="height: 100px; font-family:'Inter', sans-serif;">${staff.bio || ''}</textarea>
            </div>
            <h4 style="grid-column: 1 / -1; color: var(--primary); font-size: 0.7rem; margin-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1.5rem; font-family:'Syncopate', sans-serif; opacity: 0.8;">BROADCAST CHANNELS</h4>
            ${socialsHtml}
        </div>
    `;
    return div;
}

window.removeStaff = function(discordId) {
    if (confirm('SYSTEM OVERRIDE: Purge this personnel record from the transmission?')) {
        db.ref('staff_status/' + discordId).remove().then(() => {
            loadStaff(); // Refresh view
        });
    }
};

function loadStaff() {
    const staffContainer = document.getElementById('staff-container');
    if (!staffContainer) return;

    db.ref('staff_status').once('value').then(snapshot => {
        const data = snapshot.val();
        staffContainer.innerHTML = '';
        
        if (!data) {
            staffContainer.innerHTML = '<p style="opacity:0.5; padding:2rem; font-style:italic; color:var(--accent-magenta);">Personnel node not found. Please click INITIALIZE button above once.</p>';
            return;
        }
        
        Object.entries(data).forEach(([id, staff]) => {
            staffContainer.appendChild(createStaffEditor(staff, id));
        });
    });
}

function saveStaff() {
    const items = document.querySelectorAll('.staff-editor-item');
    if (items.length === 0) {
        alert('NO PERSONNEL RECORDS FOUND TO SYNC.');
        return;
    }
    const updates = {};
    items.forEach(item => {
        const id = item.dataset.discordId;
        const bio = item.querySelector('.s-bio').value;
        const avatar = item.querySelector('.s-avatar') ? item.querySelector('.s-avatar').value : '';
        const socials = {};
        item.querySelectorAll('input[class^="s-social-"]').forEach(input => {
            const platform = input.className.replace('s-social-', '');
            if (input.value.trim() !== '') {
                socials[platform] = input.value.trim();
            }
        });
        updates[id + '/bio'] = bio;
        updates[id + '/avatar_url'] = avatar;
        updates[id + '/socials'] = socials;
    });
    db.ref('staff_status').update(updates).then(() => {
        alert('SUCCESS: All personnel frequencies updated.');
        showSaveMsg('save-msg-staff');
        bumpSiteVersion();
        loadStaff();
    }).catch(err => {
        alert('CRITICAL SYNC ERROR: ' + err.message);
    });
}

// Individual save function moved to top for scope safety

const saveReleasesBtn = document.getElementById('save-releases');
if (saveReleasesBtn) {
    saveReleasesBtn.addEventListener('click', () => {
        const items = document.querySelectorAll('#releases-container .release-editor-item');
        if (items.length === 0) {
            alert('NO RELEASES FOUND TO SYNC.');
            return;
        }
        
        let updates = [];
        items.forEach(item => {
            const id = item.querySelector('.r-id').value;
            const title = item.querySelector('.r-title').value;
            const producers = item.querySelector('.r-producers').value;
            const type = item.querySelector('.r-type').value;
            const image = item.querySelector('.r-image').value;
            const spotify = item.querySelector('.r-spotify').value;
            const apple = item.querySelector('.r-apple').value;
            const youtube = item.querySelector('.r-youtube').value;
            const preview = item.querySelector('.r-preview').value;

            updates.push({ id, title, producers, type, image, spotify, apple, youtube, preview });
        });

        db.ref('siteData/releases').set(updates).then(() => {
            alert('SUCCESS: Release archive successfully updated.');
            bumpSiteVersion();
            loadReleases();
        }).catch(err => {
            alert('CRITICAL SYNC ERROR: ' + err.message);
        });
    });
}

const initStaffBtn = document.getElementById('init-staff-btn');
if (initStaffBtn) {
    initStaffBtn.addEventListener('click', () => {
        if (confirm('Initialize base staff records? This will only add missing entries and WON\'T overwrite existing avatars.')) {
            const baseStaff = {
                "1296819659131326556": { name: "SVYUXU", status: "offline", bio: "CORE STAFF", avatar_url: "assets/staff/default.png" },
                "459345097373515777": { name: "IRANGA", status: "offline", bio: "CORE STAFF", avatar_url: "assets/staff/default.png" },
                "1296819349885161472": { name: "NEIDRAKE", status: "offline", bio: "CORE STAFF", avatar_url: "assets/staff/default.png" },
                "1296813876364705792": { name: "FL4ME", status: "offline", bio: "CORE STAFF", avatar_url: "assets/staff/default.png" }
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

// Initial load
initializeSecurity();
