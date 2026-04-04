const firebaseConfig = {
    apiKey: "AI8SjFSqSJ6DYAcBJrNGN76hEhcij5vtyJK5G819CvV7Fm",
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
        document.getElementById(btn.dataset.target).classList.add('active');
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

// --- SECURE AUTHENTICATION SYSTEM ---
const loginOverlay = document.getElementById('login-overlay');
const loginBtn = document.getElementById('login-btn');
const passInput = document.getElementById('root-pass-input');
const loginError = document.getElementById('login-error');
const adminWrapper = document.querySelector('.admin-wrapper');

function initializeSecurity() {
    db.ref('siteData/security/rootKey').once('value').then(snap => {
        if (!snap.exists()) {
            db.ref('siteData/security/rootKey').set("ORC ADMINS PASS 2026");
        }
    });

    // Check session
    if (sessionStorage.getItem('rootAuth') === 'granted') {
        unlockDashboard();
    }
}

function unlockDashboard() {
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (adminWrapper) adminWrapper.style.display = 'grid';
    sessionStorage.setItem('rootAuth', 'granted');
    
    // DELAYED DATA GATING (Only loads after unlock)
    loadGlobals();
    loadSubmissions();
    loadReleases();
    loadUpcoming();
}

if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const input = passInput.value;
        db.ref('siteData/security/rootKey').once('value').then(snap => {
            const secret = snap.val();
            if (input === secret) {
                unlockDashboard();
            } else {
                loginError.style.display = 'block';
                passInput.value = '';
                setTimeout(() => { loginError.style.display = 'none'; }, 2000);
            }
        });
    });
}

if (passInput) {
    passInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginBtn.click();
    });
}

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

document.getElementById('add-release-btn').addEventListener('click', () => {
    gatherReleasesData(); // Save current state before pushing
    releasesArray.unshift({
        id: "OS-NEW", title: "NEW TRACK", producers: "UNKNOWN", type: "SINGLE", 
        image: "assets/cover.png", spotify: "#", apple: "#", youtube: "#"
    });
    renderReleases();
});

function loadReleases() {
    // Load Releases
    db.ref('siteData/releases').once('value').then(snapshot => {
        let data = snapshot.val();
        
        if (data && Array.isArray(data)) {
            if (data[0] && data[0]._isEmpty) {
                releasesArray = [];
            } else {
                releasesArray = data;
            }
            renderReleases();
        } else {
            // Fallback default so details are pre-filled the very first time
            releasesArray = [
                { id: "OS-992 <span class='badge'>NEW</span>", title: "STARLIGHT SYNDROME", producers: "SVYUXU & OBSCURA", type: "SINGLE", image: "assets/cover.png", spotify: "#", apple: "#", youtube: "https://www.youtube.com/watch?v=A0FZIwabctw", preview: "" },
                { id: "OS-991", title: "NEUTRON PULSE", producers: "RANGA", type: "EP", image: "assets/releases/cover_1.png", spotify: "#", apple: "#", youtube: "https://www.youtube.com/watch?v=jfKfPfyJRdk", preview: "" },
                { id: "OS-990", title: "VOID WALKER", producers: "FL4ME", type: "ALBUM", image: "assets/releases/cover_2.png", spotify: "#", apple: "#", youtube: "https://www.youtube.com/watch?v=21X5lGlDOfg", preview: "" },
                { id: "OS-989", title: "SOLAR FLARE", producers: "SVYUXU & RANGA", type: "SINGLE", image: "assets/releases/cover_3.png", spotify: "#", apple: "#", youtube: "https://www.youtube.com/watch?v=kJQP7kiw5Fk", preview: "" }
            ];
            // Automatically sync defaults back to database so main site maintains 1-to- Parity
            db.ref('siteData/releases').set(releasesArray);
            renderReleases();
        }
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
    
    db.ref('siteData/submissions').once('value').then(snapshot => {
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
        db.ref('siteData/submissions/' + id).remove().then(loadSubmissions);
    }
};

if (refreshBtn) refreshBtn.addEventListener('click', loadSubmissions);
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        if (confirm('SYSTEM OVERRIDE: Purge ALL transmission records in the vault?')) {
            db.ref('siteData/submissions').remove().then(loadSubmissions);
        }
    });
}

// Initial load - REMOVED for Gating
initializeSecurity();
