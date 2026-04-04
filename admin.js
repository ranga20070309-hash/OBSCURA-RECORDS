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
    msg.classList.add('show');
    setTimeout(() => { msg.classList.remove('show'); }, 3000);
}

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

        document.querySelectorAll('input[id^="site_"], textarea[id^="site_"]').forEach(el => {
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
    });
}
loadGlobals();

function saveGlobals(msgId) {
    let updates = {};
    document.querySelectorAll('input[id^="site_"], textarea[id^="site_"]').forEach(el => {
        updates[el.id.replace('site_', '')] = el.value;
    });
    db.ref('siteData/globals').update(updates).then(() => {
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

function gatherReleasesData() {
    const editors = document.querySelectorAll('.release-editor-item');
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
    if (releasesArray.length === 0) {
        db.ref('siteData/releases').set([{ _isEmpty: true }]).then(() => {
            bumpSiteVersion();
            showSaveMsg('save-msg-releases');
        });
    } else {
        db.ref('siteData/releases').set(releasesArray).then(() => {
            bumpSiteVersion();
            showSaveMsg('save-msg-releases');
        });
    }
});

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

// Initial load
loadSubmissions();
