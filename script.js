if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

window.onload = () => {
    window.scrollTo(0, 0);
};

// --- THE CORE SONIC PLAYER ---
let ytPlayer = null;
let isYTApiReady = false;
let currentPlayingBtn = null;
let audioTimer = null;
let previewAudio = new Audio();
previewAudio.crossOrigin = "anonymous";
previewAudio.preload = "auto";
let playbackStartOffset = 0;
let autoScrollInterval = null;
const PREVIEW_LIMIT = 30;

// --- BACKEND API CONFIGURATION ---
// Automatically uses relative path on Vercel production, or localhost:3000 during local dev
const API_BASE_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && window.location.port !== "" && window.location.port !== "3000"
    ? "http://localhost:3000"
    : "";

// --- INITIALIZE GSAP CONFIG (Silence Warnings) ---
gsap.config({ nullTargetWarn: false });

// --- CYBERPUNK UI SOUND SYNTHESIZER & SFX ENGINE ---
let sfxAudioCtx = null;
let sfxEnabled = localStorage.getItem('obscura_sfx_enabled') !== 'false';

const updateSFXToggleUI = () => {
    const sfxBtn = document.getElementById('sfx-toggle-btn');
    if (!sfxBtn) return;
    if (sfxEnabled) {
        sfxBtn.classList.remove('sfx-muted');
        sfxBtn.innerHTML = '<i class="fas fa-volume-up"></i> <span class="sfx-label">SFX ON</span>';
    } else {
        sfxBtn.classList.add('sfx-muted');
        sfxBtn.innerHTML = '<i class="fas fa-volume-mute"></i> <span class="sfx-label">SFX OFF</span>';
    }
};

// Unlock Web Audio Context cleanly on first user gesture (Prevents browser warnings)
const unlockAudioContextOnGesture = () => {
    try {
        if (!sfxAudioCtx) sfxAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (sfxAudioCtx && sfxAudioCtx.state === 'suspended') sfxAudioCtx.resume();
    } catch (e) {}
    window.removeEventListener('click', unlockAudioContextOnGesture);
    window.removeEventListener('keydown', unlockAudioContextOnGesture);
    window.removeEventListener('touchstart', unlockAudioContextOnGesture);
};
window.addEventListener('click', unlockAudioContextOnGesture, { once: true });
window.addEventListener('keydown', unlockAudioContextOnGesture, { once: true });
window.addEventListener('touchstart', unlockAudioContextOnGesture, { once: true });

const playCyberSFX = (type = 'click') => {
    if (!sfxEnabled) return;
    try {
        if (!sfxAudioCtx) {
            // Do not create AudioContext on mere hover before first user gesture
            if (type === 'hover') return;
            sfxAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (sfxAudioCtx.state === 'suspended') {
            if (type === 'hover') return;
            sfxAudioCtx.resume();
        }
        const now = sfxAudioCtx.currentTime;
        
        if (type === 'hover') {
            const osc = sfxAudioCtx.createOscillator();
            const gain = sfxAudioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1400, now);
            osc.frequency.exponentialRampToValueAtTime(700, now + 0.035);
            gain.gain.setValueAtTime(0.015, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
            osc.connect(gain);
            gain.connect(sfxAudioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.035);
        } else if (type === 'click') {
            const osc = sfxAudioCtx.createOscillator();
            const gain = sfxAudioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.07);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
            osc.connect(gain);
            gain.connect(sfxAudioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
        } else if (type === 'whoosh' || type === 'modal') {
            const osc = sfxAudioCtx.createOscillator();
            const gain = sfxAudioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(250, now);
            osc.frequency.exponentialRampToValueAtTime(950, now + 0.14);
            gain.gain.setValueAtTime(0.035, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
            osc.connect(gain);
            gain.connect(sfxAudioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.14);
        } else if (type === 'success') {
            [587.33, 880].forEach((freq, idx) => {
                const osc = sfxAudioCtx.createOscillator();
                const gain = sfxAudioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.07);
                gain.gain.setValueAtTime(0.04, now + idx * 0.07);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.1);
                osc.connect(gain);
                gain.connect(sfxAudioCtx.destination);
                osc.start(now + idx * 0.07);
                osc.stop(now + idx * 0.07 + 0.1);
            });
        }
    } catch (e) { }
};

const playBleep = (freq = 600, type = 'sine', duration = 0.08) => {
    if (!sfxEnabled) return;
    try {
        if (!sfxAudioCtx) sfxAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (sfxAudioCtx.state === 'suspended') sfxAudioCtx.resume();
        const osc = sfxAudioCtx.createOscillator();
        const gain = sfxAudioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, sfxAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, sfxAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, sfxAudioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(sfxAudioCtx.destination);
        osc.start();
        osc.stop(sfxAudioCtx.currentTime + duration);
    } catch (e) { }
};


// --- LOADER DISMISSAL (With Safety Timeout & Ignition Sync) ---
let loaderDismissed = false; // Fixed: lowercase 'false'
const dismissLoader = () => {
    if (loaderDismissed) return;
    loaderDismissed = true;

    const portalLoader = document.getElementById('portal-loader');
    const loaderBar = document.getElementById('loader-bar');
    if (!portalLoader) return;

    gsap.to(loaderBar, {
        width: '100%',
        duration: 0.2,
        ease: "power2.out",
        onComplete: () => {
            gsap.to(portalLoader, {
                opacity: 0,
                duration: 0.2,
                ease: "power2.inOut",
                onComplete: () => {
                    portalLoader.style.display = 'none';
                    // The site is now visible, but we keep scroll locked until the reveal is halfway or entirely done.
                    // We'll remove it inside runIgnition for better flow control.
                    if (typeof runIgnition === 'function') runIgnition();
                }
            });
        }
    });
};

window.addEventListener('load', dismissLoader);
setTimeout(dismissLoader, 1500); // Safety Override: Ultra-Snappy 1.5s

let pendingYTTrack = null;

window.onYouTubeIframeAPIReady = function () {
    initYTPlayer();
};

function initYTPlayer() {
    if (ytPlayer && isYTApiReady) return;
    try {
        const isFileProtocol = window.location.protocol === 'file:';
        ytPlayer = new YT.Player('yt-player-container', {
            height: '180',
            width: '320',
            playerVars: {
                'autoplay': 1,
                'controls': 0,
                'showinfo': 0,
                'rel': 0,
                'modestbranding': 1,
                'enablejsapi': 1,
                'origin': isFileProtocol ? 'https://www.youtube.com' : (window.location.origin === 'null' || !window.location.origin ? '*' : window.location.origin)
            },
            events: {
                'onReady': (event) => {
                    isYTApiReady = true;
                    console.log('YT API Active');
                    if (event.target && event.target.setVolume) event.target.setVolume(100);
                    if (pendingYTTrack) {
                        const track = pendingYTTrack;
                        pendingYTTrack = null;
                        playYouTubeTrack(track.ytId, track.ytType, track.playBtn, track.row, track.coverImg);
                    }
                },
                'onStateChange': onPlayerStateChange,
                'onError': (e) => {
                    console.warn("YT Playback Error Code:", e.data);
                }
            }
        });
    } catch (e) { console.error("YT Setup Fail:", e); }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        if (currentPlayingBtn) {
            stopPlayback(currentPlayingBtn);
            currentPlayingBtn = null;
        }
    }
}

// --- THE AUTOMATIC SPLASH SEQUENCE (ENARMA STYLE) ---
const runIgnition = () => {
    const entranceScreen = document.getElementById('entrance-screen');
    const mainSite = document.getElementById('main-site');
    if (!entranceScreen || !mainSite) return;

    const tl = gsap.timeline({
        onComplete: () => {
            // GENTLY REVEAL CURSOR GLOW AFTER EVERYTHING IS CLEAR
            if (!window.matchMedia("(hover: none) and (pointer: coarse)").matches && window.innerWidth > 1024) {
                gsap.to(".cursor-glow", { opacity: 1, duration: 1.5 });
            }
            console.log("PORTAL IGNITION COMPLETE.");

            // --- SYSTEM OPTIMIZATION PROGRESSION ENGINE ---
            const devStatusTag = document.querySelector('.dev-status-tag');
            if (devStatusTag) {
                let progress = 0;
                
                const timer = setInterval(() => {
                    // Random small increments to make it feel realistic
                    const randomInc = Math.random() * 1.5 + 0.2; 
                    progress += randomInc;

                    if (progress >= 100) {
                        progress = 100;
                        clearInterval(timer);
                        devStatusTag.innerHTML = `<i class="fas fa-check-circle" style="font-size: 0.5rem;"></i> SYSTEM OPTIMIZED`;
                        devStatusTag.style.opacity = "0.6";
                        devStatusTag.style.color = "var(--accent-blue)";
                    } else {
                        devStatusTag.innerHTML = `SYSTEM OPTIMIZATION IN PROGRESS: ${Math.floor(progress)}%`;
                    }
                }, 100); // Update every 100ms
            }
        }
    });

    // 1. Snappy Initial Pause (Faster than before)
    tl.to({}, { duration: 0.1 });

    // 2. Mysterious Cinematic Reveal
    tl.fromTo(".splash-logo",
        {
            opacity: 0,
            scale: 1.05,
            filter: "brightness(0) blur(6px)",
        },
        {
            duration: 1.5, // Slower mysterious reveal
            opacity: 1,
            scale: 1.02, // Gentle float forward
            filter: "brightness(1) blur(0px)",
            ease: "sine.inOut",
            onStart: () => {
                const logo = document.querySelector('.splash-logo');
                if (logo) logo.style.animation = "splashPulse 4s ease-in-out infinite, logoVibrate 3s infinite";
            }
        }
    );

    // 3. Pause for Brand Impact (Cinematic Tension)
    tl.to({}, { duration: 1.2 });

    // 4. Choreographed Realistic RGB Glitch Sequence
    const glitchRed = document.getElementById('red-offset');
    const glitchBlue = document.getElementById('blue-offset');
    const glitchDisp = document.getElementById('glitch-disp');
    const glitchTurb = document.getElementById('glitch-turbulence');

    // Set initial filter state (Using only displacement, no channel offsets)
    tl.set(".splash-logo", { filter: "url(#glitch-filter)" });

    // Step-by-step glitch "impacts" (Realistic RGB Shifts + RAPID JITTER)
    const addGlitchStep = (scale, clipInset, dx = 0, colorShift = 0) => {
        tl.to(".splash-logo", {
            duration: 0.03, // Accelerated for vibration
            x: dx + (Math.random() * 4 - 2), // Random jitter
            y: (Math.random() * 4 - 2),
            skewX: dx * 0.8,
            onUpdate: () => {
                if (glitchDisp) glitchDisp.setAttribute('scale', scale);
                if (glitchRed) glitchRed.setAttribute('dx', colorShift);
                if (glitchBlue) glitchBlue.setAttribute('dx', -colorShift);
                const logo = document.querySelector('.splash-logo');
                if (logo) logo.style.clipPath = clipInset;
            }
        });
    };

    // Realistic Choreographed Sequence with Vibration Start
    tl.set(".splash-logo", { animation: "logoVibrate 0.1s infinite" }); // ACTIVATE VIBRATION

    addGlitchStep(40, "inset(12% 0 75% 0)", 10, 5);
    addGlitchStep(60, "inset(45% 0 25% 0)", -15, -8);
    addGlitchStep(0, "none", 0, 0);
    tl.to({}, { duration: 0.04 });
    addGlitchStep(120, "inset(75% 0 5% 0)", 25, 12);
    addGlitchStep(30, "inset(15% 0 65% 0)", -8, -4);
    addGlitchStep(150, "none", 0, 20); // Heavier vibration stage
    addGlitchStep(10, "none", 4, 3);

    // Final "Vibrate Line Dissolve" (SUPREME EXIT SEQUENCE)
    tl.to(".splash-logo", {
        duration: 0.1,
        scaleY: 0.01, // Squash into a razor-thin line
        scaleX: 1.8,  // Stretch wide
        opacity: 0.9,
        skewX: 60,
        filter: "url(#glitch-filter) brightness(4)",
        onStart: () => {
            const logo = document.querySelector('.splash-logo');
            if (logo) logo.style.animation = "none";
        },
        onUpdate: () => {
            if (glitchDisp) glitchDisp.setAttribute('scale', 300); // MAX SHAKE
            if (glitchRed) glitchRed.setAttribute('dx', 60);
            if (glitchBlue) glitchBlue.setAttribute('dx', -60);
            const logo = document.querySelector('.splash-logo');
            if (logo) logo.style.clipPath = "inset(49% 0 50% 0)"; // Perfect horizontal slice
        }
    });

    // Rapid Disintegration Fade
    tl.to(".splash-logo", {
        duration: 0.1,
        opacity: 0,
        scaleX: 3, // Dissolve outwards
        ease: "power2.out"
    });

    // Environmental Pulse (Intensified)
    tl.to(".scanlines", { duration: 0.04, opacity: 0.8, repeat: 10, yoyo: true }, "<");
    tl.to(".noise-overlay", { duration: 0.04, opacity: 1, repeat: 10, yoyo: true }, "<");

    // The "Patta" Exit (Aggressive Blur + Light Burst Collapse)
    tl.to(".splash-logo", {
        duration: 0.25,
        opacity: 0,
        scaleY: 0.01, // CRT Collapse effect
        scaleX: 2.8,  // Horizontal stretch
        filter: "brightness(20) blur(25px)",
        ease: "expo.out",
        onComplete: () => {
            const logo = document.querySelector('.splash-logo');
            if (logo) {
                logo.style.filter = "none";
                logo.style.clipPath = "none";
                logo.style.transform = "none";
            }
        }
    });

    tl.to(entranceScreen, {
        duration: 0.8,
        opacity: 0,
        filter: "blur(20px)",
        ease: "expo.inOut",
        onStart: () => {
            gsap.set(mainSite, { visibility: 'visible', opacity: 1 });
            // CINEMATIC SCROLLBAR FADE-IN
            gsap.to("html", { "--sb-opacity": 0.2, duration: 1.5, ease: "power2.out" });
        },
        onComplete: () => {
            document.body.classList.remove('no-scroll');
            document.documentElement.classList.remove('no-scroll'); // UNLOCK BOTH
        }
    }, "-=0.2");

    tl.set(entranceScreen, { display: 'none' });

    // 5. Main Site Materialization
    tl.from(".glass-nav", {
        y: -100,
        opacity: 0,
        duration: 1.5,
        ease: "expo.out"
    }, "-=1");

    tl.from(".hero-content", {
        x: -200,
        opacity: 0,
        skewX: 10,
        duration: 1.5,
        ease: "power4.out"
    }, "-=1.2");

    tl.from(".release-card", {
        scale: 0.8,
        opacity: 0,
        y: 100,
        rotateX: -45,
        duration: 2,
        ease: "power2.out"
    }, "-=1");
};

function getYouTubeID(url) {
    if (!url) return null;
    try {
        const u = new URL(url);
        // Prioritize Single Video ID over Playlist ID (Embeds work better for videos)
        if (u.searchParams.has('v')) {
            return { type: 'video', id: u.searchParams.get('v') };
        } else if (u.searchParams.has('list')) {
            return { type: 'playlist', id: u.searchParams.get('list') };
        } else if (u.hostname.includes('youtu.be')) {
            return { type: 'video', id: u.pathname.substring(1) };
        } else if (u.searchParams.has('v')) {
            return { type: 'video', id: u.searchParams.get('v') };
        }
        return null;
    } catch (e) {
        // Fallback for raw IDs
        if (url.length === 11) return { type: 'video', id: url };
        return null;
    }
}

function playYouTubeTrack(ytId, ytType, playBtn, row, coverImg) {
    if (!ytId) return;

    if (!isYTApiReady || !ytPlayer || typeof ytPlayer.loadVideoById !== 'function') {
        pendingYTTrack = { ytId, ytType, playBtn, row, coverImg };
        initYTPlayer();
        startUIPlayback(playBtn, row, coverImg);
        return;
    }

    try {
        if (ytPlayer.unMute) ytPlayer.unMute();
        if (ytPlayer.setVolume) ytPlayer.setVolume(100);
        if (ytType === 'playlist') {
            ytPlayer.loadPlaylist({ listType: 'playlist', list: ytId, index: 0 });
        } else {
            ytPlayer.loadVideoById({ videoId: ytId, startSeconds: 0 });
        }
        if (ytPlayer.playVideo) ytPlayer.playVideo();
    } catch (e) {
        console.warn("YT Player playback delay:", e);
    }
    startUIPlayback(playBtn, row, coverImg);
    if (typeof handleScrollProximityAudio === 'function') handleScrollProximityAudio();
}

function startUIPlayback(btn, row, img) {
    if (!btn) return;
    isAudioAutoPausedByScroll = false;
    btn.innerHTML = '<i class="fas fa-pause"></i>';
    if (row) row.classList.add('active-track');

    gsap.to(btn, { scale: 1.1, boxShadow: '0 0 20px #00f0ff', repeat: -1, yoyo: true, duration: 0.8 });
    if (img) gsap.to(img, { scale: 1.15, duration: 20, ease: "linear", repeat: -1, yoyo: true });

    // Activate Real-Time Sub-Bass Reactive Background Lighting
    if (typeof startBassReactiveEngine === 'function') {
        startBassReactiveEngine();
    }

    // Sync Floating Cyberpunk Music Stream Player
    if (typeof syncFloatingPlayer === 'function') {
        syncFloatingPlayer(row, btn, true);
    }
}

function stopPlayback(btn) {
    if (!btn) return;
    isAudioAutoPausedByScroll = false;
    const parentRow = btn.closest('.release-card-large');
    if (!parentRow) return;
    const parentImg = parentRow.querySelector('.release-cover-large img');
    const timeDisplay = parentRow.querySelector('.preview-time');

    btn.innerHTML = '<i class="fas fa-play"></i>';
    parentRow.classList.remove('active-track');
    gsap.killTweensOf([btn, parentImg]);
    gsap.to(btn, { scale: 1, boxShadow: 'none' });
    if (parentImg) gsap.to(parentImg, { scale: 1, duration: 0.5 });

    // Silence all sources
    previewAudio.pause();
    previewAudio.currentTime = 0;
    playbackStartOffset = 0;

    if (ytPlayer && ytPlayer.stopVideo) {
        try { ytPlayer.stopVideo(); } catch (e) { }
    }

    if (timeDisplay) {
        timeDisplay.style.display = 'none';
        if (audioTimer) clearInterval(audioTimer);
    }

    // Stop Sub-Bass Reactive Background Lighting
    if (typeof stopBassReactiveEngine === 'function') {
        stopBassReactiveEngine();
    }

    // Sync Floating Player State to Paused
    if (typeof syncFloatingPlayer === 'function') {
        syncFloatingPlayer(parentRow, btn, false);
    }
}

// --- POPULAR RELEASES ENGINE ---
function loadPopular() {
    const popularGrid = document.getElementById('popular-grid');
    if (!popularGrid) return;

    firebase.database().ref('siteData/popular_releases').on('value', (snapshot) => {
        const data = snapshot.val();
        popularGrid.innerHTML = '';

        let items = [];
        if (data) {
            items = Array.isArray(data) ? data : Object.values(data);
        }

        if (items.length === 0) {
            popularGrid.innerHTML = '<p style="opacity: 0.3; grid-column: 1/-1; text-align: center; padding: 3rem;">NO TRANSMISSIONS FOUND IN THIS SECTOR.</p>';
            return;
        }

        items.forEach((r, i) => {
            const rankFormatted = (i + 1 < 10) ? `0${i + 1}` : `${i + 1}`;
            let ytData = getYouTubeID(r.youtube);
            const previewYT = getYouTubeID(r.preview);
            if (previewYT) ytData = previewYT;

            const ytIdAttr = ytData ? ytData.id : '';
            const ytTypeAttr = ytData ? ytData.type : 'video';

            const card = document.createElement('div');
            card.className = 'popular-card release-card-large glass';
            card.innerHTML = `
                <div class="release-cover-large">
                    <div class="cyber-laser-scanner"></div>
                    <img src="${r.image || 'assets/cover.png'}" alt="${r.title}">
                    <div class="release-type-badge">HOT #${rankFormatted}</div>
                    <div class="player-overlay">
                        <button class="play-btn"
                            data-title="${(r.title || 'POPULAR HIT').replace(/"/g, '&quot;')}"
                            data-artist="${(r.artist || 'OBSCURA RECORD').replace(/"/g, '&quot;')}"
                            data-image="${r.image || 'assets/cover.png'}"
                            data-spotify="${r.spotify || '#'}"
                            data-youtube="${r.youtube || '#'}"
                            data-preview="${r.preview || ''}"
                            data-ytid="${ytIdAttr}"
                            data-yttype="${ytTypeAttr}">
                            <i class="fas fa-play"></i>
                        </button>
                        <div class="preview-time" style="display: none;">0:30</div>
                    </div>
                </div>
                <div class="release-info-large">
                    <span class="track-id">POPULAR HIT <span class="badge">TRENDING</span></span>
                    <h4>${r.title}</h4>
                    <div class="producers-text">Artist: <span>${r.artist}</span></div>
                    <div class="release-actions">
                        ${r.spotify && r.spotify !== '#' ? `<a href="${r.spotify}" target="_blank" class="platform-link spotify" title="Spotify" onclick="event.stopPropagation()"><i class="fab fa-spotify"></i></a>` : ''}
                        ${r.apple && r.apple !== '#' ? `<a href="${r.apple}" target="_blank" class="platform-link apple" title="Apple Music" onclick="event.stopPropagation()"><i class="fab fa-apple"></i></a>` : ''}
                        ${r.youtube && r.youtube !== '#' ? `<a href="${r.youtube}" target="_blank" class="platform-link youtube" title="YouTube" onclick="event.stopPropagation()"><i class="fab fa-youtube"></i></a>` : ''}
                    </div>
                </div>
            `;

            const playBtn = card.querySelector('.play-btn');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isPlaying = playBtn.innerHTML.includes('fa-pause');
                    if (currentPlayingBtn && currentPlayingBtn !== playBtn) {
                        stopPlayback(currentPlayingBtn);
                    }

                    if (!isPlaying) {
                        currentPlayingBtn = playBtn;
                        const mp3Url = playBtn.getAttribute('data-preview');
                        const ytId = playBtn.getAttribute('data-ytid');
                        const ytType = playBtn.getAttribute('data-yttype');
                        const coverImg = card.querySelector('.release-cover-large > img');
                        
                        if (mp3Url && mp3Url !== '#' && !getYouTubeID(mp3Url)) {
                            previewAudio.src = mp3Url;
                            previewAudio.play().then(() => {
                                startUIPlayback(playBtn, card, coverImg);
                            }).catch(() => {
                                startUIPlayback(playBtn, card, coverImg);
                            });
                        } else if (ytId) {
                            playYouTubeTrack(ytId, ytType, playBtn, card, coverImg);
                        } else {
                            startUIPlayback(playBtn, card, coverImg);
                        }
                    } else {
                        stopPlayback(playBtn);
                        currentPlayingBtn = null;
                    }
                });
            }

            popularGrid.appendChild(card);

            // Entry Animation
            gsap.from(card, {
                y: 50,
                opacity: 0,
                scale: 0.9,
                duration: 1,
                delay: i * 0.1,
                ease: "expo.out",
                scrollTrigger: {
                    trigger: card,
                    start: "top 90%",
                }
            });
        });

        // --- POPULAR SLIDER LOGIC ---
        const popularControls = document.querySelector('.popular-controls');
        const btnPrev = document.querySelector('.popular-prev');
        const btnNext = document.querySelector('.popular-next');
        let popularAutoScroll = null;

        const checkPopularOverflow = () => {
            if (!popularGrid || !popularControls) return;
            if (popularGrid.scrollWidth > popularGrid.clientWidth) {
                popularControls.style.display = 'flex';
            } else {
                popularControls.style.display = 'none';
            }
        };

        // Initialize Slider Interactions
        if (btnPrev && btnNext && popularGrid) {
            btnPrev.addEventListener('click', (e) => {
                e.stopPropagation();
                popularGrid.scrollBy({ left: -400, behavior: 'smooth' });
                resetPopularAutoScroll();
            });
            btnNext.addEventListener('click', (e) => {
                e.stopPropagation();
                popularGrid.scrollBy({ left: 400, behavior: 'smooth' });
                resetPopularAutoScroll();
            });
        }

        // Auto-Scroll Engine
        const startPopularAutoScroll = () => {
            if (popularAutoScroll) clearInterval(popularAutoScroll);
            popularAutoScroll = setInterval(() => {
                if (!popularGrid) return;
                let maxScroll = popularGrid.scrollWidth - popularGrid.clientWidth;
                if (popularGrid.scrollLeft >= maxScroll - 10) {
                    popularGrid.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    popularGrid.scrollBy({ left: 400, behavior: 'smooth' });
                }
            }, 5000);
        };

        const resetPopularAutoScroll = () => {
            clearInterval(popularAutoScroll);
            setTimeout(startPopularAutoScroll, 10000); // Resume after 10s of inactivity
        };

        // Run checks after data is loaded and DOM is updated
        setTimeout(() => {
            checkPopularOverflow();
            if (popularGrid && popularGrid.scrollWidth > popularGrid.clientWidth) {
                startPopularAutoScroll();
            }
        }, 800);

        // Window resize listener
        window.addEventListener('resize', checkPopularOverflow);
    });
}

const initPortal = () => {

    const entranceScreen = document.getElementById('entrance-screen');
    const mainSite = document.getElementById('main-site');
    const cursor = document.querySelector('.cursor-outer');
    const cursorGlow = document.querySelector('.cursor-glow');

    // --- CUSTOM CURSOR LOGIC ---
    const isMobile = window.matchMedia("(hover: none) and (pointer: coarse)").matches || window.innerWidth <= 1024;

    if (!isMobile) {
        document.addEventListener('mousemove', (e) => {
            if (cursor && cursorGlow) {
                gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.1 });
                gsap.to(cursorGlow, { x: e.clientX, y: e.clientY, duration: 0.6 });
            }
        });

        document.addEventListener('mouseleave', () => {
            if (cursor && cursorGlow) {
                gsap.to([cursor, cursorGlow], { opacity: 0, duration: 0.3 });
            }
        });

        document.addEventListener('mouseenter', () => {
            if (cursor && cursorGlow) {
                gsap.to([cursor, cursorGlow], { opacity: 1, duration: 0.3 });
            }
        });
    } else if (cursor && cursorGlow) {
        cursor.style.display = 'none';
        cursorGlow.style.display = 'none';
    }

    // --- FAQ ACCORDION (DYNAMIC) ---

    // --- MODAL SYSTEM (FAQ & PRIVACY) ---
    const setupModal = (triggerId, modalId) => {
        const trigger = document.getElementById(triggerId);
        const modal = document.getElementById(modalId);
        if (!trigger || !modal) return;

        const closeBtn = modal.querySelector('.close-modal');
        const overlay = modal.querySelector('.modal-overlay');

        trigger.addEventListener('click', () => {
            playBleep(700, 'sine', 0.1);
            modal.classList.add('active');
            document.body.classList.add('no-scroll');
            document.documentElement.classList.add('no-scroll');

            // --- SMOOTH "TYPE-SIGNAL" EFFECT FOR MODAL --
            if (modal.id === 'submission-modal') {
                const modalTitle = modal.querySelector('.section-title');
                const modalDesc = modal.querySelector('.section-desc');

                if (modalTitle) {
                    const originalTitle = modalTitle.getAttribute('data-original') || modalTitle.textContent;
                    if (!modalTitle.getAttribute('data-original')) modalTitle.setAttribute('data-original', originalTitle);
                    modalTitle.textContent = "";
                    typeSignal(modalTitle, originalTitle, 40);
                }

                if (modalDesc) {
                    const originalDesc = modalDesc.getAttribute('data-original') || modalDesc.textContent;
                    if (!modalDesc.getAttribute('data-original')) modalDesc.setAttribute('data-original', originalDesc);
                    modalDesc.textContent = "";
                    setTimeout(() => typeSignal(modalDesc, originalDesc, 15), 500);
                }
            }
        });

        function typeSignal(element, text, speed) {
            let i = 0;
            const timer = setInterval(() => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                } else {
                    clearInterval(timer);
                }
            }, speed);
        }

        function initMirrorEffect(input) {
            const display = input.parentElement.querySelector('.mirror-display');
            if (!display) return;

            input.addEventListener('input', () => {
                const text = input.value;
                display.innerHTML = '';

                text.split('').forEach((char) => {
                    const span = document.createElement('span');
                    span.className = 'mirror-glyph';
                    span.textContent = char === ' ' ? '\u00A0' : char;
                    display.appendChild(span);
                });
            });
        }

        const mirrorInputs = document.querySelectorAll('.mirror-container .real-input');
        mirrorInputs.forEach(input => initMirrorEffect(input));

        [closeBtn, overlay].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    modal.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                    document.documentElement.classList.remove('no-scroll');
                });
            }
        });
    };

    setupModal('open-faq', 'faq-modal');
    setupModal('open-privacy', 'privacy-modal');
    setupModal('open-demo', 'demo-modal');
    setupModal('open-form', 'submission-modal');
    setupModal('open-form-sidebar', 'submission-modal'); // New: Sidebar trigger
    setupModal('open-contact', 'contact-modal');
    setupModal('order-ghost', 'contact-modal');
    setupModal('order-special', 'contact-modal');

    // --- SOCIAL SIDEBAR & MOBILE NAVIGATION DRAWER ---
    const navMenuTrigger = document.getElementById('nav-menu-trigger');
    const socialSidebar = document.getElementById('social-sidebar');
    const closeSidebar = document.getElementById('close-sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    if (navMenuTrigger && socialSidebar) {
        navMenuTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof playCyberSFX === 'function') playCyberSFX('click');
            socialSidebar.classList.add('active');
            if (sidebarOverlay) sidebarOverlay.classList.add('active');
            document.body.classList.add('no-scroll');
        });
    }

    if (closeSidebar && socialSidebar) {
        closeSidebar.addEventListener('click', () => {
            if (typeof playCyberSFX === 'function') playCyberSFX('click');
            socialSidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            if (socialSidebar) socialSidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    }

    const sidebarNavItems = document.querySelectorAll('.sidebar-nav .nav-item');
    sidebarNavItems.forEach(item => {
        item.addEventListener('click', () => {
            if (socialSidebar) socialSidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    });

    // --- ARTIST MODAL CLOSE LOGIC ---
    const artistModal = document.getElementById('artist-modal');
    if (artistModal) {
        const closeBtn = artistModal.querySelector('.close-modal');
        const overlay = artistModal.querySelector('.modal-overlay');
        [closeBtn, overlay].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    artistModal.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                    document.documentElement.classList.remove('no-scroll');
                });
            }
        });
    }

    // --- SUBMISSION FORM LOGIC (WITH RECAPTCHA v3) ---
    const subForm = document.getElementById('submission-form');
    const subStatus = document.getElementById('submission-status');
    const contactForm = document.getElementById('contact-form');
    const contactStatus = document.getElementById('contact-status');

    // Using the stabilized reCAPTCHA key
    const RECAPTCHA_SITE_KEY = "6LcFNKgsAAAAAEEdRhYJrwgeWzaRyMmzbgNy3swn";

    // --- MULTI-LINK DYNAMIC ENGINE ---
    const addLinkBtn = document.getElementById('add-link-btn');
    const dynamicLinksContainer = document.getElementById('dynamic-links-container');

    if (addLinkBtn && dynamicLinksContainer) {
        addLinkBtn.addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'dynamic-row';
            row.innerHTML = `
                <div class="mirror-container">
                    <input type="url" name="spotify[]" class="real-input" placeholder="https://open.spotify.com/artist/...">
                    <div class="mirror-display"></div>
                </div>
                <button type="button" class="remove-link-btn" title="Remove Link">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            dynamicLinksContainer.appendChild(row);

            // Re-init specialized effects for NEW elements
            const newInput = row.querySelector('input');

            // Mirror logic
            if (typeof initMirrorEffect === 'function') {
                initMirrorEffect(newInput);
            } else {
                // Fallback if defined inside closure
                const disp = row.querySelector('.mirror-display');
                newInput.addEventListener('input', () => {
                    disp.innerHTML = '';
                    newInput.value.split('').forEach(char => {
                        const span = document.createElement('span');
                        span.className = 'mirror-glyph';
                        span.textContent = char === ' ' ? '\u00A0' : char;
                        disp.appendChild(span);
                    });
                });
            }

            // Pulse effect
            newInput.addEventListener('keydown', () => newInput.classList.add('pulse'));
            newInput.addEventListener('keyup', () => setTimeout(() => newInput.classList.remove('pulse'), 500));
        });

        dynamicLinksContainer.addEventListener('click', (e) => {
            if (e.target.closest('.remove-link-btn')) {
                const row = e.target.closest('.dynamic-row');
                row.style.transform = 'scale(0.9) translateX(20px)';
                row.style.opacity = '0';
                setTimeout(() => row.remove(), 300);
            }
        });
    }

    if (subForm) {
        const checkBoxes = subForm.querySelectorAll('.cyber-check-input');
        const submitBtn = subForm.querySelector('button[type="submit"]');

        const updateSubmitLock = () => {
            const allBoxesChecked = Array.from(checkBoxes).every(cb => cb.checked);
            submitBtn.disabled = !allBoxesChecked;
            submitBtn.style.opacity = allBoxesChecked ? "1" : "0.3";
            submitBtn.style.cursor = allBoxesChecked ? "pointer" : "not-allowed";
            if (!allBoxesChecked) {
                submitBtn.title = "Please acknowledge all guidelines to proceed.";
            } else {
                submitBtn.title = "";
            }
        };

        checkBoxes.forEach(cb => cb.addEventListener('change', updateSubmitLock));
        updateSubmitLock(); // Initial lock state

        // --- TYPING "SYSTEM PULSE" EFFECT ---
        const typingInputs = subForm.querySelectorAll('input, textarea');
        typingInputs.forEach(input => {
            input.addEventListener('keydown', () => {
                input.classList.add('pulse');
            });
            input.addEventListener('keyup', () => {
                setTimeout(() => input.classList.remove('pulse'), 500);
            });
        });

        // --- DEMO SUBMISSION HANDLER ---
        subForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = subForm.querySelector('button');
            const originalBtnText = btn.textContent;
            btn.textContent = "VERIFYING SECURITY...";
            btn.disabled = true;

            try {
                // Bypass reCAPTCHA on local file transmission to prevent protocol blockers
                let token = "LOCAL_TRANSMISSION_BYPASS";
                if (window.location.protocol !== 'file:') {
                    if (typeof grecaptcha === 'undefined') throw new Error("Security Engine Offline.");
                    token = await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'demo_submission' });
                    if (!token) throw new Error("Security verification failed.");
                }

                btn.textContent = "SYNCHRONIZING VAULT...";

                // Capture data directly from elements
                const artistInput = subForm.querySelector('input[name="artist"]');
                const nameInput = subForm.querySelector('input[name="name"]');
                const emailInput = subForm.querySelector('input[name="email"]');
                const genreInput = subForm.querySelector('input[name="genre"]');
                const linkInput = subForm.querySelector('input[name="link"]');
                const messageInput = subForm.querySelector('textarea[name="message"]');

                // Dynamic Multi-Link Collection Logic
                const spotifyLinks = Array.from(subForm.querySelectorAll('input[name="spotify[]"]'))
                    .map(input => input.value.trim())
                    .filter(val => val !== "");

                // Formatted for Firebase (Plain string)
                const spotifyData = spotifyLinks.length > 0 ? spotifyLinks.join(' | ') : "N/A";

                // Formatted for EmailJS (Labeled list for a cleaner look)
                const formattedLinksForEmail = spotifyLinks.length > 0
                    ? spotifyLinks.map((link, i) => `🔗 [ VIEW PROFILE ${i + 1} ]: ${link}`).join('\n')
                    : "Not Provided";

                const submission = {
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    date: new Date().toLocaleString(),
                    name: nameInput?.value || "N/A",
                    artist: artistInput?.value || "N/A",
                    email: emailInput?.value || "N/A",
                    genre: genreInput?.value || "N/A",
                    link: linkInput?.value || "#",
                    spotify: spotifyData,
                    message: messageInput?.value || "No additional bio.",
                    recaptcha_token: token
                };

                const labels = {
                    LABEL_NAME: subForm.querySelector('label[data-sync="formLabelName"]')?.textContent || "Real Name",
                    LABEL_ARTIST: subForm.querySelector('label[data-sync="formLabelArtist"]')?.textContent || "Artist Name(s)",
                    LABEL_EMAIL: subForm.querySelector('label[data-sync="formLabelEmail"]')?.textContent || "Email Address",
                    LABEL_GENRE: subForm.querySelector('label[data-sync="formLabelGenre"]')?.textContent || "Primary Genre",
                    LABEL_SPOTIFY: subForm.querySelector('label[data-sync="formLabelSpotify"]')?.textContent || "Artist Presence Links",
                    LABEL_MESSAGE: subForm.querySelector('label[data-sync="formLabelMessage"]')?.textContent || "Message/Bio",
                    LABEL_DATE: submission.date
                };

                // Initialize Backend API Request
                try {
                    const emailResult = await fetch(API_BASE_URL + '/api/demo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: submission.name,
                            artist: submission.artist,
                            email: submission.email,
                            genre: submission.genre,
                            link: submission.link,
                            spotify: formattedLinksForEmail,
                            message: submission.message,
                            date: submission.date,
                            recaptcha_token: token
                        })
                    });
                    if (emailResult.ok) {
                        console.log("✅ SYSTEM: Custom Email Backend Dispatched Successfully");
                    } else {
                        console.error("❌ ERROR: Custom Email Backend Rejected Request", await emailResult.text());
                    }
                } catch (eErr) {
                    console.error("❌ ERROR: Email Transmission Node Failure", eErr);
                }

                await firebase.database().ref('siteData/submissions/demo').push(submission);

                subForm.style.display = 'none';
                if (subStatus) subStatus.style.display = 'block';

                setTimeout(() => {
                    const subModal = document.getElementById('submission-modal');
                    if (subModal) subModal.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                    document.documentElement.classList.remove('no-scroll');

                    setTimeout(() => {
                        subForm.style.display = 'flex';
                        if (subStatus) subStatus.style.display = 'none';
                        subForm.reset();

                        // Clear extra dynamic links but keep the first one baseline
                        const rows = dynamicLinksContainer?.querySelectorAll('.dynamic-row');
                        if (rows) {
                            rows.forEach((row, index) => {
                                if (index > 0) row.remove();
                            });
                        }

                        subForm.querySelectorAll('.mirror-display').forEach(d => d.innerHTML = '');
                        btn.textContent = originalBtnText;
                        btn.disabled = false;
                        updateSubmitLock();
                    }, 500);
                }, 3000);

            } catch (err) {
                console.error("System Failure:", err);
                alert("TRANSMISSION ERROR: " + err.message);
                btn.textContent = originalBtnText;
                btn.disabled = false;
            }
        });
    }

    // --- CONTACT FORM HANDLER ---
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalBtnText = btn.innerHTML;
            btn.innerHTML = "TRANSMITTING...";
            btn.disabled = true;

            try {
                if (typeof grecaptcha === 'undefined') throw new Error("Security Engine Offline.");
                const token = await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'contact_submission' });

                const formData = new FormData(contactForm);
                const data = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    message: formData.get('message'),
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    recaptcha_token: token
                };

                await firebase.database().ref('siteData/submissions/contact').push(data);

                // --- CUSTOM BACKEND CONTACT NOTIFICATION ---
                try {
                    const emailResult = await fetch(API_BASE_URL + '/api/contact', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: data.name,
                            email: data.email,
                            message: data.message,
                            recaptcha_token: token
                        })
                    });
                    if (emailResult.ok) {
                        console.log("✅ SYSTEM: Custom Contact Email Sent");
                    } else {
                        console.error("❌ ERROR: Custom Contact Email Failure", await emailResult.text());
                    }
                } catch (eErr) {
                    console.error("❌ ERROR: Contact Email Failure", eErr);
                }

                contactForm.style.display = 'none';
                if (contactStatus) contactStatus.style.display = 'block';

                setTimeout(() => {
                    const contactModal = document.getElementById('contact-modal');
                    if (contactModal) contactModal.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                    document.documentElement.classList.remove('no-scroll');

                    setTimeout(() => {
                        contactForm.style.display = 'block';
                        if (contactStatus) contactStatus.style.display = 'none';
                        contactForm.reset();
                        btn.innerHTML = originalBtnText;
                        btn.disabled = false;
                    }, 500);
                }, 3000);

            } catch (err) {
                console.error("Contact System Failure:", err);
                alert("TRANSMISSION ERROR: " + err.message);
                btn.innerHTML = originalBtnText;
                btn.disabled = false;
            }
        });
    }


    // --- FAQ ACCORDION (DYNAMIC) ---
    window.bindAccordionListeners = function (containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const faqItems = container.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            // Remove old listeners to prevent duplicates
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);

            newItem.addEventListener('click', (e) => {
                e.stopPropagation();
                container.querySelectorAll('.faq-item').forEach(other => {
                    if (other !== newItem) other.classList.remove('active');
                });
                newItem.classList.toggle('active');
            });
        });
    }

    window.bindAccordionListeners('faq-container');
    window.bindAccordionListeners('privacy-container');

    // --- CLEAN URL NAVIGATION SYSTEM ---
    const navLinks = document.querySelectorAll('.nav-links a, .nav-item, .logo-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const target = link.getAttribute('data-target') || link.getAttribute('href');

            if (target === 'reload') {
                window.location.reload();
                return;
            }

            // Only intercept internal section links
            if (target && target.startsWith('#')) {
                e.preventDefault();

                // --- MOBILE SIDEBAR AUTO-CLOSE LOGIC ---
                const sidebar = document.getElementById('social-sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                if (sidebar && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    if (overlay) overlay.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                    document.documentElement.classList.remove('no-scroll'); // Restore scroll
                }

                const targetId = target.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    const headerHeight = 80;
                    const targetPosition = targetElement.offsetTop - headerHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // --- 3D TILT EFFECT ---
    const tiltContainers = document.querySelectorAll('.glass:not(.no-tilt):not(.artist-item), .release-card, .social-card, .faq-item');
    tiltContainers.forEach(container => {
        container.addEventListener('mousemove', (e) => {
            const { left, top, width, height } = container.getBoundingClientRect();
            const x = (e.clientX - left) / width - 0.5;
            const y = (e.clientY - top) / height - 0.5;
            gsap.to(container, {
                rotateY: x * 20,
                rotateX: -y * 20,
                transformPerspective: 1200,
                ease: "power1.out",
                duration: 0.5
            });
        });
        container.addEventListener('mouseleave', () => {
            gsap.to(container, { rotateY: 0, rotateX: 0, duration: 0.8, ease: "elastic.out(1, 0.3)" });
        });
    });

    // --- SCROLL REVEAL (DATA SYNC STYLE) ---
    const sections = document.querySelectorAll('section');
    const options = { threshold: 0.1 };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                gsap.to(entry.target, {
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    duration: 0.8,
                    ease: "power2.out"
                });
            }
        });
    }, options);

    sections.forEach(section => {
        if (section.id !== 'home') {
            gsap.set(section, { opacity: 0, y: 40, filter: "blur(10px)" });
            observer.observe(section);
        }
    });

    // --- FIREBASE DISCORD SYNC (REALTIME DATABASE) ---
    const firebaseConfig = {
        apiKey: "AIzaSyCHf_R1n2Qn-q4NHAjfJt6xD_TWIRjiN1o",
        authDomain: "obscura-records.firebaseapp.com",
        databaseURL: "https://obscura-records-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "obscura-records",
        storageBucket: "obscura-records.firebasestorage.app",
        messagingSenderId: "831882873428",
        appId: "1:831882873428:web:3cf009875e160a9f8efbc1"
    };

    // Firebase Initialization
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

        // --- UNIFIED PROFILE DETAIL MODAL (WITH TOP BANNER & DISCORD SYNC) ---
        function openProfileModal(opts) {
            const modal      = document.getElementById('artist-modal');
            const mBanner    = document.getElementById('artist-modal-banner');
            const mBannerImg = document.getElementById('artist-modal-banner-img');
            const mName      = document.getElementById('artist-modal-name');
            const mStatus    = document.getElementById('artist-modal-status');
            const mBio       = document.getElementById('artist-modal-bio');
            const mImg       = document.getElementById('artist-modal-img');
            const mDecor     = document.getElementById('artist-modal-decoration');
            const mLinks     = document.getElementById('artist-modal-links');
            if (!modal) return;

            if (typeof playBleep === 'function') playBleep(700, 'sine', 0.1);

            // 1. Dynamic Profile Banner (Supports Discord Animated GIFs, Image URLs, & Banner Colors)
            const bannerUrl = (opts.bannerUrl && opts.bannerUrl.trim() !== '') ? opts.bannerUrl : '';
            const bannerColor = (opts.bannerColor && opts.bannerColor.trim() !== '') ? opts.bannerColor : '';

            if (mBanner) {
                if (bannerColor) {
                    mBanner.style.backgroundColor = bannerColor;
                    mBanner.style.background = `linear-gradient(180deg, ${bannerColor} 0%, rgba(13,11,24,0.95) 100%)`;
                } else {
                    mBanner.style.backgroundColor = '#0d0b18';
                    mBanner.style.background = '';
                }

                if (mBannerImg) {
                    if (bannerUrl) {
                        mBannerImg.style.display = 'block';
                        mBannerImg.onerror = () => {
                            if (bannerColor) {
                                mBannerImg.style.display = 'none';
                            } else {
                                mBannerImg.src = 'assets/cover.png';
                            }
                        };
                        mBannerImg.src = bannerUrl;
                    } else if (bannerColor) {
                        mBannerImg.src = '';
                        mBannerImg.style.display = 'none';
                    } else {
                        mBannerImg.src = 'assets/cover.png';
                        mBannerImg.style.display = 'block';
                    }
                }
                mBanner.style.display = 'block';
            }

            // 2. Name
            if (mName) mName.textContent = opts.name || 'PERSONNEL PROFILE';

            // 3. Status Indicator (Hidden for Partners, Dynamic for Staff)
            if (mStatus) {
                if (opts.isPartner) {
                    mStatus.style.display = 'none';
                } else {
                    mStatus.style.display = 'inline-block';
                    mStatus.textContent = (opts.status || 'OFFLINE').toUpperCase();
                    mStatus.className = `status-indicator ${opts.statusClass || 'offline'}`;
                    mStatus.style.color = '';
                    mStatus.style.borderColor = '';
                    mStatus.style.background = '';
                }
            }

            // 4. Biography
            if (mBio) mBio.textContent = opts.bio || (opts.isPartner ? 'Official record label alliance transmission.' : 'Accessing encrypted artist profile...');

            // 5. Avatar / Logo Image
            if (mImg) {
                const avatarUrl = (opts.avatarUrl && opts.avatarUrl.trim() !== '') ? opts.avatarUrl : 'assets/staff/default.png';
                mImg.style.backgroundImage = `url("${avatarUrl}")`;
                mImg.style.backgroundSize = 'cover';
                mImg.style.backgroundPosition = 'center';
                mImg.style.borderColor = opts.isPartner ? 'var(--accent-magenta)' : 'var(--accent-blue)';
                mImg.style.boxShadow = opts.isPartner ? '0 0 25px rgba(255, 0, 200, 0.4)' : '0 0 20px rgba(0, 240, 255, 0.4)';
            }

            // 6. Discord Avatar Frame / Decoration
            if (mDecor) {
                if (opts.decorationUrl) {
                    mDecor.src = opts.decorationUrl;
                    mDecor.style.display = 'block';
                } else {
                    mDecor.style.display = 'none';
                }
            }

            // 7. Social Links
            if (mLinks) {
                mLinks.innerHTML = '';
                if (opts.socials) {
                    Object.entries(opts.socials).forEach(([platform, url]) => {
                        if (!url || url.trim() === '') return;
                        let icon = 'fas fa-link';
                        const p = platform.toLowerCase();
                        if (p === 'instagram') icon = 'fab fa-instagram';
                        else if (p === 'spotify') icon = 'fab fa-spotify';
                        else if (p === 'apple') icon = 'fa-brands fa-apple';
                        else if (p === 'facebook') icon = 'fa-brands fa-facebook-f';
                        else if (p === 'youtube') icon = 'fab fa-youtube';
                        else if (p === 'tiktok') icon = 'fab fa-tiktok';
                        else if (p === 'twitter' || p === 'x') icon = 'fab fa-x-twitter';
                        else if (p === 'soundcloud') icon = 'fab fa-soundcloud';
                        else if (p === 'website' || p === 'web') icon = 'fas fa-globe';
                        mLinks.insertAdjacentHTML('beforeend', `<a href="${url}" target="_blank" class="platform-link" style="${opts.isPartner ? 'background:rgba(255,0,200,0.08); border-color:rgba(255,0,200,0.25);' : ''}"><i class="${icon}"></i></a>`);
                    });
                }
            }

            modal.classList.add('active');
            document.body.classList.add('no-scroll');
            document.documentElement.classList.add('no-scroll');
        }

        // --- DYNAMIC STAFF CARD BUILDER ---
        function createStaffCard(discordId, data, gridEl, isPartner) {
            // Build card element (identical size & style to partner cards)
            const item = document.createElement('div');
            item.className = 'artist-item glass';
            item.dataset[isPartner ? 'partnerId' : 'discordId'] = discordId;
            item.innerHTML = `
                <div class="avatar-wrapper">
                    <div class="artist-img"></div>
                    <img src="" class="avatar-decoration" alt="Frame" style="display:none;">
                </div>
                <h4>${data.name || (isPartner ? 'PARTNER' : 'STAFF')}</h4>
                <p>Status: <span class="status-indicator">LOADING...</span></p>
                <span class="artist-loc">Discord Presence</span>
            `;
            gridEl.appendChild(item);

            // Apply data
            const avatar     = item.querySelector('.artist-img');
            const decoration = item.querySelector('.avatar-decoration');
            const statusEl   = item.querySelector('.status-indicator');
            const nameEl     = item.querySelector('h4');

            const applyData = (d) => {
                if (!d) {
                    statusEl.textContent = 'OFFLINE';
                    statusEl.className = 'status-indicator offline';
                    return;
                }
                if (d.name) nameEl.textContent = d.name;
                const status = (d.status || 'offline').toLowerCase();
                statusEl.textContent = status.toUpperCase();
                statusEl.className = `status-indicator ${status}`;
                const avatarSrc = (d.avatar_url && d.avatar_url.trim() !== '') ? d.avatar_url : 'assets/staff/default.png';
                avatar.style.backgroundImage = `url("${avatarSrc}")`;
                avatar.style.backgroundSize = 'cover';
                avatar.style.backgroundPosition = 'center';

                if (d.decoration_url && d.decoration_url !== '') {
                    decoration.src = d.decoration_url;
                    decoration.style.display = 'block';
                } else {
                    decoration.style.display = 'none';
                }

                // Modal click
                item.style.cursor = 'pointer';
                item.onclick = () => {
                    openProfileModal({
                        name: d.name || nameEl.textContent,
                        status: (d.status || 'OFFLINE').toUpperCase(),
                        statusClass: status,
                        bio: d.bio || 'Accessing encrypted artist profile...',
                        avatarUrl: avatarSrc,
                        decorationUrl: d.decoration_url,
                        bannerUrl: d.banner_url || d.banner || '',
                        bannerColor: d.banner_color || d.accent_color || '',
                        socials: d.socials,
                        isPartner: false
                    });
                };
            };
            applyData(data);

            // Real-time listener for this card
            const ref = db.ref((isPartner ? 'partner_status/' : 'staff_status/') + discordId);
            ref.on('value', snap => applyData(snap.val()));
        }

        // --- DYNAMIC STAFF GRID: Render all from Firebase staff_status/ (Sorted by hierarchy order) ---
        const staffGrid = document.getElementById('staff-grid');
        if (staffGrid) {
            db.ref('staff_status').on('value', snapshot => {
                staffGrid.innerHTML = '';
                const allStaff = snapshot.val() || {};
                const sortedStaff = Object.entries(allStaff).sort((a, b) => {
                    const orderA = (a[1] && typeof a[1].order === 'number') ? a[1].order : 99;
                    const orderB = (b[1] && typeof b[1].order === 'number') ? b[1].order : 99;
                    return orderA - orderB;
                });

                sortedStaff.forEach(([id, data]) => {
                    createStaffCard(id, data, staffGrid, false);
                });
                if (sortedStaff.length === 0) {
                    staffGrid.innerHTML = '<p style="opacity:0.4; text-align:center; padding:4rem; font-family:monospace;">No staff records found.</p>';
                }
            });
        }

        // --- DYNAMIC PARTNER CARD BUILDER (100% EXACT COPY OF STAFF CARD DESIGN - NO STATUS) ---
        function createPartnerCard(partnerId, data, gridEl) {
            const item = document.createElement('div');
            item.className = 'artist-item glass';
            item.dataset.partnerId = partnerId;
            item.innerHTML = `
                <div class="avatar-wrapper">
                    <div class="artist-img"></div>
                    <img src="" class="avatar-decoration" alt="Frame" style="display:none;">
                </div>
                <h4>PARTNER</h4>
                <span class="artist-loc">Label Partner</span>
            `;
            gridEl.appendChild(item);

            const avatar  = item.querySelector('.artist-img');
            const nameEl  = item.querySelector('h4');
            const locEl   = item.querySelector('.artist-loc');

            const applyPartnerData = (d) => {
                if (!d) return;
                const name = d.name || 'LABEL PARTNER';
                const tagline = d.tagline || 'Label Partner';
                const bio = d.bio || 'Encrypted record label partnership transmission.';
                const logoUrl = (d.logo_url && d.logo_url.trim() !== '') ? d.logo_url : (d.avatar_url && d.avatar_url.trim() !== '' ? d.avatar_url : 'assets/staff/default.png');
                const bannerUrl = (d.banner_url && d.banner_url.trim() !== '') ? d.banner_url : (d.banner || '');
                const bannerColor = d.banner_color || d.accent_color || '';

                if (nameEl) nameEl.textContent = name;
                if (locEl) locEl.textContent = tagline;
                if (avatar) {
                    avatar.style.backgroundImage = `url("${logoUrl}")`;
                    avatar.style.backgroundSize = 'cover';
                    avatar.style.backgroundPosition = 'center';
                }

                item.style.cursor = 'pointer';
                item.onclick = () => {
                    openProfileModal({
                        name: name,
                        bio: bio,
                        avatarUrl: logoUrl,
                        bannerUrl: bannerUrl,
                        bannerColor: bannerColor,
                        socials: d.socials,
                        isPartner: true
                    });
                };
            };

            applyPartnerData(data);

            // Real-time Firebase listener for this partner
            const pRef = db.ref('partner_status/' + partnerId);
            pRef.on('value', snap => {
                if (snap.exists()) applyPartnerData(snap.val());
            });
        }

        // --- DYNAMIC PARTNERS GRID: Render all from Firebase partner_status/ (Sorted by hierarchy order) ---
        const partnersGrid = document.getElementById('partners-grid');
        if (partnersGrid) {
            db.ref('partner_status').on('value', snapshot => {
                partnersGrid.innerHTML = '';
                const allPartners = snapshot.val() || {};
                const sortedPartners = Object.entries(allPartners).sort((a, b) => {
                    const orderA = (a[1] && typeof a[1].order === 'number') ? a[1].order : 99;
                    const orderB = (b[1] && typeof b[1].order === 'number') ? b[1].order : 99;
                    return orderA - orderB;
                });

                sortedPartners.forEach(([id, data]) => {
                    createPartnerCard(id, data, partnersGrid);
                });
                if (sortedPartners.length === 0) {
                    partnersGrid.innerHTML = '<p style="opacity:0.4; text-align:center; padding:4rem; font-family:monospace;">No partner records found.</p>';
                }
            });
        }

        // --- 3D INTERACTIVE COSMIC TILT FOR STAFF & PARTNER CARDS ---
        document.addEventListener('mousemove', (e) => {
            const card = e.target.closest('.artist-item');
            if (!card) return;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -8;
            const rotateY = ((x - centerX) / centerX) * 8;
            card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-12px) scale3d(1.02, 1.02, 1.02)`;
        });

        document.addEventListener('mouseout', (e) => {
            const card = e.target.closest('.artist-item');
            if (card && !card.contains(e.relatedTarget)) {
                card.style.transform = '';
            }
        });

    } else {
        console.error("Firebase SDK not loaded! Check index.html scripts.");
    }

    // --- FIREBASE DYNAMIC SITE DATA (GLOBALS & RELEASES) ---
    if (typeof firebase !== 'undefined') {
        const db = firebase.database();

        // --- DEEP SPACE CONSTELLATION & STARFIELD CANVAS ENGINE ---
        let mCanvasAnimId = null;
        function initSpaceCanvas() {
            const canvas = document.getElementById('m-space-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            let width = canvas.width = window.innerWidth;
            let height = canvas.height = window.innerHeight;

            const stars = [];
            const numStars = 110;
            const colors = [
                'rgba(0, 240, 255, ',
                'rgba(183, 0, 255, ',
                'rgba(255, 255, 255, ',
                'rgba(0, 217, 255, '
            ];

            for (let i = 0; i < numStars; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    radius: Math.random() * 1.5 + 0.4,
                    baseAlpha: Math.random() * 0.6 + 0.25,
                    alpha: Math.random() * 0.6 + 0.25,
                    twinkleSpeed: Math.random() * 0.03 + 0.01,
                    twinklePhase: Math.random() * Math.PI * 2,
                    speedY: Math.random() * 0.25 + 0.08,
                    speedX: (Math.random() - 0.5) * 0.08,
                    color: colors[Math.floor(Math.random() * colors.length)]
                });
            }

            function render() {
                ctx.clearRect(0, 0, width, height);

                // Draw Constellation Lines between nearby stars
                for (let i = 0; i < stars.length; i++) {
                    for (let j = i + 1; j < stars.length; j++) {
                        const dx = stars[i].x - stars[j].x;
                        const dy = stars[i].y - stars[j].y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 85) {
                            const lineAlpha = (1 - dist / 85) * 0.12;
                            ctx.beginPath();
                            ctx.moveTo(stars[i].x, stars[i].y);
                            ctx.lineTo(stars[j].x, stars[j].y);
                            ctx.strokeStyle = `rgba(0, 240, 255, ${lineAlpha})`;
                            ctx.lineWidth = 0.6;
                            ctx.stroke();
                        }
                    }
                }

                // Render Stars with Twinkle
                stars.forEach(star => {
                    star.twinklePhase += star.twinkleSpeed;
                    star.alpha = star.baseAlpha + Math.sin(star.twinklePhase) * 0.25;
                    star.alpha = Math.max(0.1, Math.min(0.95, star.alpha));

                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                    ctx.fillStyle = `${star.color}${star.alpha})`;
                    ctx.shadowBlur = star.radius > 1.2 ? 6 : 0;
                    ctx.shadowColor = '#00f0ff';
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    star.y -= star.speedY;
                    star.x += star.speedX;

                    if (star.y < 0) {
                        star.y = height;
                        star.x = Math.random() * width;
                    }
                    if (star.x < 0) star.x = width;
                    if (star.x > width) star.x = 0;
                });

                mCanvasAnimId = requestAnimationFrame(render);
            }

            const handleResize = () => {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
            };

            window.addEventListener('resize', handleResize);

            if (mCanvasAnimId) cancelAnimationFrame(mCanvasAnimId);
            render();
        }

        // --- FLOATING ADMIN PREVIEW BANNER ENGINE ---
        function renderAdminPreviewBanner(active) {
            let banner = document.getElementById('admin-preview-floating-bar');
            if (!active) {
                document.body.classList.remove('admin-preview-active');
                if (banner) banner.style.display = 'none';
                return;
            }
            document.body.classList.add('admin-preview-active');

            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'admin-preview-floating-bar';
                banner.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    background: rgba(10, 10, 15, 0.95);
                    border-bottom: 2px solid #00f0ff;
                    box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
                    color: #fff;
                    padding: 8px 16px;
                    z-index: 999999;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-family: 'Space Grotesk', monospace, sans-serif;
                    font-size: 0.78rem;
                    backdrop-filter: blur(10px);
                    box-sizing: border-box;
                `;
                banner.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span style="display: inline-block; width: 8px; height: 8px; background: #00f0ff; border-radius: 50%; box-shadow: 0 0 8px #00f0ff;"></span>
                        <strong style="color: #00f0ff; letter-spacing: 1px;">MAINTENANCE MODE ACTIVE</strong>
                        <span style="opacity: 0.7;">| ADMIN PREVIEW BYPASS ENGAGED</span>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button id="apb-toggle-screen" style="background: rgba(0, 240, 255, 0.15); border: 1px solid #00f0ff; color: #00f0ff; padding: 4px 10px; border-radius: 3px; font-size: 0.7rem; cursor: pointer; font-family: inherit; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="fas fa-eye"></i> Toggle Lock Screen
                        </button>
                        <button id="apb-lock-site" style="background: rgba(255, 62, 62, 0.2); border: 1px solid #ff3e3e; color: #ff3e3e; padding: 4px 10px; border-radius: 3px; font-size: 0.7rem; cursor: pointer; font-family: inherit; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="fas fa-lock"></i> Exit Preview
                        </button>
                    </div>
                `;
                document.body.appendChild(banner);

                document.getElementById('apb-toggle-screen').addEventListener('click', () => {
                    const overlay = document.getElementById('maintenance-overlay');
                    if (overlay) {
                        if (overlay.style.display === 'none' || !overlay.style.display) {
                            overlay.style.display = 'flex';
                            document.body.classList.add('no-scroll', 'maintenance-active');
                            document.documentElement.classList.add('no-scroll', 'maintenance-active');
                        } else {
                            overlay.style.display = 'none';
                            document.body.classList.remove('no-scroll', 'maintenance-active');
                            document.documentElement.classList.remove('no-scroll', 'maintenance-active');
                        }
                    }
                });

                document.getElementById('apb-lock-site').addEventListener('click', () => {
                    sessionStorage.removeItem('adminBypass');
                    location.href = window.location.pathname;
                });
            } else {
                banner.style.display = 'flex';
            }
        }

        // 1. Sync Globals (Text Elements & Links)
        db.ref('siteData/globals').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // --- MAINTENANCE MODE OVERRIDE (ADMIN SITE ONLY) ---
                const maintenanceOverlay = document.getElementById('maintenance-overlay');
                
                // Retrieve root key from siteData globals or fallback to master passphrase
                const activeRootKey = (data.security && data.security.rootKey) ? data.security.rootKey : "ORC ADMINS PASS 2026";

                // URL Parameter Check - ONLY allow bypass if master key parameter is provided
                const urlParams = new URLSearchParams(window.location.search);
                const urlKey = urlParams.get('key') || urlParams.get('pass');
                if (urlKey && (urlKey === activeRootKey || urlKey === 'ORC ADMINS PASS 2026')) {
                    sessionStorage.setItem('rootAuth', 'granted');
                    sessionStorage.setItem('adminBypass', 'true');
                }

                if (maintenanceOverlay) {
                    const isMaint = data.maintenanceMode === 'Enabled' || data.maintenanceMode === true || data.maintenanceMode === 'ON';
                    
                    // Strictly check if session was initiated/authenticated from the Admin Panel
                    const isBypassed = (sessionStorage.getItem('adminBypass') === 'true' || sessionStorage.getItem('rootAuth') === 'granted');

                    if (isMaint && !isBypassed) {
                        maintenanceOverlay.style.display = 'flex';
                        document.body.classList.add('no-scroll', 'maintenance-active');
                        document.documentElement.classList.add('no-scroll', 'maintenance-active');
                        const mTitle = document.getElementById('m-title');
                        const mMsg = document.getElementById('m-msg');
                        const mTag = document.getElementById('m-status-tag');
                        if (mTitle && data.maintenanceTitle) mTitle.innerHTML = data.maintenanceTitle;
                        if (mMsg && data.maintenanceMsg) mMsg.textContent = data.maintenanceMsg;
                        if (mTag && data.maintenanceTag) mTag.textContent = data.maintenanceTag;

                        initSpaceCanvas();
                    } else {
                        maintenanceOverlay.style.display = 'none';
                        document.body.classList.remove('no-scroll', 'maintenance-active');
                        document.documentElement.classList.remove('no-scroll', 'maintenance-active');

                        if (mCanvasAnimId) cancelAnimationFrame(mCanvasAnimId);
                    }

                    // Render Floating Admin Preview Banner when Maintenance is Active but Admin is Bypassing
                    renderAdminPreviewBanner(isMaint && isBypassed);
                }

                // --- CATEGORY VISIBILITY OVERRIDE ---
                const upcomingSection = document.getElementById('upcoming');
                if (upcomingSection) {
                    if (data.showUpcoming === 'Hidden') {
                        upcomingSection.style.setProperty('display', 'none', 'important');
                    } else {
                        upcomingSection.style.setProperty('display', 'flex', 'important');
                    }
                }

                // POPULAR RELEASES VISIBILITY GATING
                const popularSection = document.getElementById('popular');
                if (data.showPopular === 'Hidden') {
                    if (popularSection) popularSection.style.setProperty('display', 'none', 'important');
                } else {
                    if (popularSection) popularSection.style.setProperty('display', 'block', 'important');
                }

                // GHOST PRODUCTION VISIBILITY GATING
                const ghostSection = document.getElementById('ghost-production');
                const navGhost = document.getElementById('nav-ghost');
                const sideNavGhost = document.getElementById('side-nav-ghost');
                
                if (data.showGhostProduction === 'Hidden') {
                    if (ghostSection) ghostSection.style.setProperty('display', 'none', 'important');
                    if (navGhost) navGhost.style.setProperty('display', 'none', 'important');
                    if (sideNavGhost) sideNavGhost.style.setProperty('display', 'none', 'important');
                } else {
                    if (ghostSection) ghostSection.style.setProperty('display', 'block', 'important');
                    if (navGhost) navGhost.style.setProperty('display', 'inline-block', 'important');
                    if (sideNavGhost) sideNavGhost.style.setProperty('display', 'flex', 'important');
                }

                const elements = document.querySelectorAll('[data-sync]');
                elements.forEach(el => {
                    const key = el.getAttribute('data-sync');
                    const syncTarget = el.getAttribute('data-sync-target') || 'html';

                    if (data[key] !== undefined) {
                        if (syncTarget === 'html') {
                            el.innerHTML = data[key];
                        } else if (syncTarget === 'text') {
                            el.textContent = data[key];
                        } else if (syncTarget === 'placeholder') {
                            el.placeholder = data[key];
                        } else if (syncTarget === 'style') {
                            el.style.cssText = data[key];
                        } else if (syncTarget === 'href') {
                            let value = data[key];
                            // Auto-redirect for Email links if prefix is missing
                            if (key.toLowerCase().includes('email') && !value.startsWith('mailto:') && value.includes('@')) {
                                value = 'mailto:' + value;
                            }
                            el.href = value;
                        }
                    }
                });
            }
        });

        // Sync Modal Dynamic Collections (FAQ & Privacy)
        function renderAccordion(containerId, items) {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';
            items.forEach(item => {
                if (!item || item._isEmpty) return;
                const html = `
                    <div class="faq-item glass">
                        <div class="faq-question">
                            <span>${item.question}</span><i class="fas fa-plus"></i>
                        </div>
                        <div class="faq-answer">
                            <p>${item.answer}</p>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', html);
            });
            window.bindAccordionListeners(containerId);
        }

        /* -- Dynamic Accordion Rendering Disabled to preserve original structure --
        db.ref('siteData/faq').on('value', snap => {
            const data = snap.val();
            if (data && Array.isArray(data)) renderAccordion('faq-container', data);
        });

        db.ref('siteData/privacy').on('value', snap => {
            const data = snap.val();
            if (data && Array.isArray(data)) renderAccordion('privacy-container', data);
        });
        */

        // 2. Sync Releases
        const releaseSlider = document.querySelector('.releases-slider');
        function renderReleases(releases) {
            if (!releaseSlider) return;
            releaseSlider.innerHTML = '';

            releases.forEach(release => {
                const badge = release.id && release.id.includes('NEW') ? "<span class='badge'>NEW</span>" : "";
                const cleanId = release.id ? release.id.replace("<span class='badge'>NEW</span>", "").trim() : "";

                // Smart Detector: Check YouTube link field AND Preview Audio field
                let ytData = getYouTubeID(release.youtube);
                const previewYT = getYouTubeID(release.preview);

                // If Preview Audio field has a YT link, use THAT instead (it's more specific)
                if (previewYT) ytData = previewYT;

                const ytIdAttr = ytData ? ytData.id : '';
                const ytTypeAttr = ytData ? ytData.type : 'video';

                const cardHtml = `
                    <div class="release-card-large glass">
                        <div class="release-cover-large">
                            <div class="cyber-laser-scanner"></div>
                            <img src="${release.image || 'assets/cover.png'}" alt="${release.title}">
                            <div class="release-type-badge">${release.type || 'SINGLE'}</div>
                            <div class="player-overlay">
                                <button class="play-btn" 
                                    data-title="${(release.title || 'UNKNOWN').replace(/"/g, '&quot;')}"
                                    data-artist="${(release.producers || 'OBSCURA RECORD').replace(/"/g, '&quot;')}"
                                    data-image="${release.image || 'assets/cover.png'}"
                                    data-spotify="${release.spotify || '#'}"
                                    data-youtube="${release.youtube || '#'}"
                                    data-preview="${release.preview || ''}" 
                                    data-ytid="${ytIdAttr}" 
                                    data-yttype="${ytTypeAttr}">
                                    <i class="fas fa-play"></i>
                                </button>
                                <div class="preview-time" style="display: none;">0:30</div>
                            </div>
                        </div>
                        <div class="release-info-large">
                            ${(cleanId || badge) ? `<span class="track-id">${cleanId} ${badge}</span>` : ''}
                            <h4>${release.title || 'UNKNOWN'}</h4>
                            <div class="producers-text">Produced by: <span>${release.producers || ''}</span></div>
                            <div class="release-actions">
                                <a href="${release.spotify || '#'}" target="_blank" class="platform-link spotify"><i class="fab fa-spotify"></i></a>
                                <a href="${release.apple || '#'}" target="_blank" class="platform-link apple"><i class="fab fa-apple"></i></a>
                                <a href="${release.youtube || '#'}" target="_blank" class="platform-link youtube"><i class="fab fa-youtube"></i></a>
                            </div>
                        </div>
                    </div>
                `;
                releaseSlider.insertAdjacentHTML('beforeend', cardHtml);
            });

            bindReleaseInteractions();
            startAutoScroll();
        }

        function bindReleaseInteractions() {
            const trackRows = document.querySelectorAll('.release-card-large');
            currentPlayingBtn = null;
            if (audioTimer) clearInterval(audioTimer);

            trackRows.forEach(row => {
                const playBtn = row.querySelector('.play-btn');
                const coverImg = row.querySelector('.release-cover-large > img');
                const cdImg = row.querySelector('.cd-label-mini img');
                const ytLink = row.querySelector('.platform-link.youtube');
                const spLink = row.querySelector('.platform-link.spotify');

                // 1. Auto URL Artwork Detector (Spotify)
                if (spLink && spLink.href && spLink.href.includes('open.spotify.com')) {
                    fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(spLink.href)}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.thumbnail_url && coverImg) {
                                coverImg.src = data.thumbnail_url;
                                coverImg.style.filter = "none";
                                if (cdImg) cdImg.src = data.thumbnail_url;
                                if (playBtn) playBtn.setAttribute('data-image', data.thumbnail_url);
                            }
                        }).catch(e => console.warn('Spotify Artwork URL parse failed:', e));
                }

                // 2. Auto URL Artwork Detector Fallback (YouTube)
                // (Runs instantly, but Spotify will overwrite it if Spotify URL exists and succeeds)
                if (ytLink && ytLink.href && (ytLink.href.includes('youtube.com/watch') || ytLink.href.includes('youtu.be/'))) {
                    try {
                        let videoId = '';
                        if (ytLink.href.includes('youtube.com/watch')) {
                            videoId = new URL(ytLink.href).searchParams.get('v');
                        } else if (ytLink.href.includes('youtu.be/')) {
                            videoId = ytLink.href.split('youtu.be/')[1].split('?')[0];
                        }
                        // Only set YouTube cover if it hasn't been set by Spotify yet (or if Spotify is still loading, Spotify will safely override)
                        if (videoId && coverImg && coverImg.src.includes('cover')) {
                            const ytThumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                            coverImg.src = ytThumb;
                            coverImg.style.filter = "none";
                            if (cdImg) cdImg.src = ytThumb;
                            if (playBtn) playBtn.setAttribute('data-image', ytThumb);
                        }
                    } catch (e) {
                        console.warn('URL Parse Error:', e);
                    }
                }

                if (playBtn) {
                    playBtn.addEventListener('click', (e) => {
                        const ytId = playBtn.getAttribute('data-ytid');
                        const ytType = playBtn.getAttribute('data-yttype');
                        const mp3Url = playBtn.getAttribute('data-preview');
                        const timeDisplay = row.querySelector('.preview-time');
                        const isPlaying = playBtn.innerHTML.includes('fa-pause');

                        if (currentPlayingBtn && currentPlayingBtn !== playBtn) {
                            stopPlayback(currentPlayingBtn);
                        }

                        if (!isPlaying) {
                            currentPlayingBtn = playBtn;
                            playbackStartOffset = -1; // Reset for relative 30s limit
                            
                            // PRIORITY 1: Direct MP3 / Snippet URL (User specified)
                            if (mp3Url && mp3Url !== '' && mp3Url !== '#' && !getYouTubeID(mp3Url)) {
                                try {
                                    previewAudio.src = mp3Url;
                                    previewAudio.play().then(() => {
                                        startUIPlayback(playBtn, row, coverImg);
                                        if (typeof handleScrollProximityAudio === 'function') handleScrollProximityAudio();
                                        if (timeDisplay) {
                                            timeDisplay.style.display = 'block';
                                            updateTimer(timeDisplay, 'mp3');
                                        }
                                    }).catch(err => {
                                        startUIPlayback(playBtn, row, coverImg);
                                    });
                                } catch (e) {
                                    startUIPlayback(playBtn, row, coverImg);
                                }
                            }
                            // PRIORITY 2: YouTube Fallback (Instant Playback)
                            else if (ytId) {
                                playYouTubeTrack(ytId, ytType, playBtn, row, coverImg);
                            } else {
                                startUIPlayback(playBtn, row, coverImg);
                            }
                        } else {
                            stopPlayback(playBtn);
                            currentPlayingBtn = null;
                        }
                    });
                }
            });
        }

        function updateTimer(display, type) {
            if (audioTimer) clearInterval(audioTimer);
            audioTimer = setInterval(() => {
                let duration = 0;
                let current = 0;

                try {
                    if (type === 'yt' && ytPlayer && ytPlayer.getCurrentTime) {
                        current = ytPlayer.getCurrentTime();
                    } else if (type === 'mp3') {
                        current = previewAudio.currentTime;
                    }

                    // On the very first valid frame, mark the start point
                    if (current > 0 && playbackStartOffset === -1) {
                        playbackStartOffset = current;
                    }

                    if (playbackStartOffset !== -1) {
                        const elapsed = current - playbackStartOffset;
                        const remaining = PREVIEW_LIMIT - elapsed;

                        // Sync floating player progress bar and elapsed counters
                        if (typeof updateFloatingPlayerProgress === 'function') {
                            updateFloatingPlayerProgress(Math.max(0, elapsed), PREVIEW_LIMIT);
                        }

                        if (!isNaN(remaining) && remaining > 0) {
                            const secs = Math.ceil(remaining);
                            display.textContent = `0:${secs.toString().padStart(2, '0')}`;

                            if (remaining <= 0.1) {
                                stopPlayback(currentPlayingBtn);
                                currentPlayingBtn = null;
                            }
                        } else if (remaining <= 0) {
                            stopPlayback(currentPlayingBtn);
                            currentPlayingBtn = null;
                        }
                    } else {
                        display.textContent = "...";
                    }
                } catch (e) { console.warn("Timer issue:", e); }
            }, 200); // Faster update for smoother countdown
        }

        function startAutoScroll() {
            if (autoScrollInterval) clearInterval(autoScrollInterval);
            const scrollStep = 390;

            autoScrollInterval = setInterval(() => {
                if (!currentPlayingBtn && releaseSlider) {
                    let maxScroll = releaseSlider.scrollWidth - releaseSlider.clientWidth;
                    // If near the end, reset. Otherwise advance.
                    if (releaseSlider.scrollLeft >= maxScroll - 10) {
                        releaseSlider.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                    } else {
                        releaseSlider.scrollBy({ left: scrollStep, behavior: 'smooth' });
                    }
                }
            }, 3500);
        }

        // Manual Scroll Navigation
        const btnPrev = document.querySelector('.slider-nav-btn.prev');
        const btnNext = document.querySelector('.slider-nav-btn.next');

        if (btnPrev && btnNext && releaseSlider) {
            btnPrev.addEventListener('click', () => {
                releaseSlider.scrollBy({ left: -390, behavior: 'smooth' });
                startAutoScroll(); // Restart interval to prevent overlap
            });
            btnNext.addEventListener('click', () => {
                releaseSlider.scrollBy({ left: 390, behavior: 'smooth' });
                startAutoScroll(); // Restart interval to prevent overlap
            });
        }

        // Bind existing static release cards immediately on load
        bindReleaseInteractions();
        startAutoScroll();

        db.ref('siteData/releases').on('value', (snapshot) => {
            let data = snapshot.val();
            let items = [];
            if (data) {
                items = Array.isArray(data) ? data : Object.values(data);
            }

            if (items.length > 0 && items[0] && items[0]._isEmpty) {
                renderReleases([]);
            } else {
                renderReleases(items);
            }
        });

        // 3. Sync Upcoming Releases
        const upcomingGrid = document.getElementById('upcoming-grid');
        let upcomingAutoScroll = null;

        function renderUpcoming(items) {
            if (!upcomingGrid) return;
            upcomingGrid.innerHTML = '';

            if (!items || items.length === 0) {
                upcomingGrid.innerHTML = '<p style="opacity:0.3; font-style:italic; grid-column: 1/-1; text-align:center;">All signals currently decrypted. New transmissions pending.</p>';
                return;
            }

            items.forEach(item => {
                const cardHtml = `
                    <div class="release-card-large glass upcoming-card">
                        <div class="upcoming-status-badge">COMING SOON</div>
                        <div class="release-cover-large">
                            <img src="${item.image || 'assets/cover.png'}" alt="${item.title}" onerror="this.src='assets/cover.png'">
                        </div>
                        <div class="release-info-large">
                            ${item.id ? `<span class="track-id">${item.id}</span>` : ''}
                            <h4>${item.title || 'FUTURE TRACK'}</h4>
                            <div class="producers-text">Produced by: <span>${item.producers || 'UNKNOWN'}</span></div>
                            ${item.date ? `<div class="upcoming-date-badge"><i class="far fa-calendar-alt"></i> ${item.date}</div>` : ''}
                        </div>
                    </div>
                `;
                upcomingGrid.insertAdjacentHTML('beforeend', cardHtml);
            });

            // Smooth Initial state
            setTimeout(() => {
                bindUpcomingControls();
                startUpcomingAutoScroll();
            }, 100);
        }

        function bindUpcomingControls() {
            const btnPrev = document.querySelector('.upcoming-prev');
            const btnNext = document.querySelector('.upcoming-next');
            if (btnPrev && btnNext) {
                btnPrev.onclick = () => {
                    const grid = document.getElementById('upcoming-grid');
                    if (grid) {
                        gsap.to(grid, { scrollLeft: grid.scrollLeft - 400, duration: 0.5, ease: "power2.out" });
                        // Brief pause auto-scroll on manual interaction
                        if (upcomingAutoScroll) {
                            clearInterval(upcomingAutoScroll);
                            setTimeout(startUpcomingAutoScroll, 2000);
                        }
                    }
                };
                btnNext.onclick = () => {
                    const grid = document.getElementById('upcoming-grid');
                    if (grid) {
                        gsap.to(grid, { scrollLeft: grid.scrollLeft + 400, duration: 0.5, ease: "power2.out" });
                        // Brief pause auto-scroll on manual interaction
                        if (upcomingAutoScroll) {
                            clearInterval(upcomingAutoScroll);
                            setTimeout(startUpcomingAutoScroll, 2000);
                        }
                    }
                };
            }
        }

        function startUpcomingAutoScroll() {
            if (upcomingAutoScroll) clearInterval(upcomingAutoScroll);
            const grid = document.getElementById('upcoming-grid');
            if (!grid) return;

            // Center if few items, scroll if many
            if (grid.scrollWidth <= grid.clientWidth + 10) {
                grid.style.justifyContent = 'center';
                return;
            } else {
                grid.style.justifyContent = 'flex-start';
            }

            upcomingAutoScroll = setInterval(() => {
                grid.scrollLeft += 1;
                if (grid.scrollLeft >= (grid.scrollWidth - grid.clientWidth - 1)) {
                    grid.scrollLeft = 0;
                }
            }, 30);
        }

        db.ref('siteData/upcoming').on('value', (snapshot) => {
            let data = snapshot.val();
            let items = [];
            if (data) {
                items = Array.isArray(data) ? data : Object.values(data);
            }
            renderUpcoming(items);
        });
    }

    // Removed initVisualizer call

    // --- GLOBAL UI SOUND EFFECTS (ON CLICK) ---
    document.addEventListener('click', (e) => {
        // Find if the clicked element is interactive
        const interactive = e.target.closest('a, button, [role="button"], .release-card, .faq-item, .nav-item, .social-icon');
        if (interactive) {
            // Randomize pitch slightly for a more "organic tech" feel
            const freq = 600 + (Math.random() * 400);
            playBleep(freq, 'sine', 0.05);
        }
    });

    function startAutoScroll() {
        if (!releaseSlider) return;
        if (autoScrollInterval) clearInterval(autoScrollInterval);

        autoScrollInterval = setInterval(() => {
            // Only scroll if nothing is currently playing
            if (!currentPlayingBtn) {
                releaseSlider.scrollLeft += 1;
                // Infinite loop reset
                if (releaseSlider.scrollLeft >= (releaseSlider.scrollWidth - releaseSlider.clientWidth - 5)) {
                    gsap.to(releaseSlider, { scrollLeft: 0, duration: 1.5, ease: "power2.inOut" });
                }
            }
        }, 40);
    }

    // --- ADVANCED GALACTIC PARTICLES & INTERACTION ---
    const pCanvas = document.getElementById('particle-bg');
    if (pCanvas) {
        const pCtx = pCanvas.getContext('2d');
        let particles = [];
        let shootingStars = [];
        const particleCount = 130;
        let mouseX = 0;
        let mouseY = 0;

        class Stardust {
            constructor() {
                this.init();
            }
            init() {
                this.x = Math.random() * window.innerWidth;
                this.y = Math.random() * window.innerHeight;
                this.size = Math.random() * 2 + 0.5;
                this.speedY = Math.random() * 0.5 + 0.1;
                this.speedX = (Math.random() - 0.5) * 0.1;
                this.opacity = Math.random() * 0.5 + 0.1;
                this.baseX = this.x;
                this.baseY = this.y;
                this.density = (Math.random() * 30) + 1;
            }
            update() {
                // Mouse Interaction (Push Effect)
                let dx = mouseX - this.x;
                let dy = mouseY - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                let forceDirectionX = dx / distance;
                let forceDirectionY = dy / distance;
                let maxDistance = 150;
                let force = (maxDistance - distance) / maxDistance;
                let directionX = forceDirectionX * force * this.density;
                let directionY = forceDirectionY * force * this.density;

                if (distance < maxDistance) {
                    this.x -= directionX;
                    this.y -= directionY;
                } else {
                    this.y += this.speedY;
                    this.x += this.speedX;
                    // Reset if out of bounds
                    if (this.y > window.innerHeight) this.y = -10;
                }
            }
            draw() {
                pCtx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`; // MONOCHROME WHITE STARS
                pCtx.beginPath();
                pCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                pCtx.fill();
            }
        }

        class ShootingStar {
            constructor() {
                this.init();
            }
            init() {
                this.x = Math.random() * window.innerWidth;
                this.y = -10;
                this.length = Math.random() * 100 + 50;
                this.speedX = Math.random() * 10 + 5;
                this.speedY = Math.random() * 10 + 5;
                this.opacity = 1;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.opacity -= 0.01;
            }
            draw() {
                pCtx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
                pCtx.lineWidth = 2;
                pCtx.beginPath();
                pCtx.moveTo(this.x, this.y);
                pCtx.lineTo(this.x - this.speedX, this.y - this.speedY);
                pCtx.stroke();
            }
        }

        function pResize() {
            const dpr = window.devicePixelRatio || 1;
            pCanvas.width = window.innerWidth * dpr;
            pCanvas.height = window.innerHeight * dpr;
            pCanvas.style.width = window.innerWidth + 'px';
            pCanvas.style.height = window.innerHeight + 'px';
            pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Stardust());
            }
        }

        function pAnimate() {
            pCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            // Random Shooting Stars
            if (Math.random() < 0.01) shootingStars.push(new ShootingStar());
            shootingStars.forEach((s, index) => {
                s.update();
                s.draw();
                if (s.opacity <= 0) shootingStars.splice(index, 1);
            });

            requestAnimationFrame(pAnimate);
        }

        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            // Parallax Galaxy Movement (Optimized: moved out of RAF to reduce overhead)
            const spaceBg = document.querySelector('.space-bg');
            if (spaceBg) {
                const moveX = (mouseX / window.innerWidth - 0.5) * 50;
                const moveY = (mouseY / window.innerHeight - 0.5) * 50;
                gsap.to(spaceBg, { x: -moveX, y: -moveY, duration: 1.5, ease: "power1.out", overwrite: "auto" });
            }
        });

        window.addEventListener('resize', pResize);
        pResize();
        pAnimate();

        // Initialize Kernel Security logic
        if (typeof initKernelSecurity === 'function') initKernelSecurity();
    }
};

/* --- DYNAMIC VISITOR CONNECTION NODE ENGINE --- */
(function () {
    async function updateVisitorNode() {
        const node = document.getElementById("visitor-connection-node");
        if (!node) return;
        try {
            // Using a slightly more lenient backup strategy
            const res = await fetch("https://ipapi.co/json/").catch(() => null);
            if (res && res.ok) {
                const data = await res.json();
                if (data && data.ip) {
                    const loc = ((data.city || "UNKNOWN") + ", " + (data.country_name || "UNKNOWN")).toUpperCase();
                    node.innerHTML = "CONNECTION FREQUENCY: " + data.ip + " (" + loc + ") | STATUS: ENCRYPTED ACCESS";
                    return;
                }
            }
            // Silent fallback if API fails
            node.innerHTML = "CONNECTION FREQUENCY: SECURE TRANSMISSION | STATUS: ENCRYPTED ACCESS";
        } catch (e) {
            node.innerHTML = "CONNECTION FREQUENCY: SECURE TRANSMISSION | STATUS: ENCRYPTED ACCESS";
        }
    }
    setTimeout(updateVisitorNode, 2500);
})();


// --- KERNEL SECURITY & DATA FLOW UTILITY (VOID v3.0) ---
const initKernelSecurity = () => {
    console.log("INITIALIZING KERNEL SECURITY ARCHITECTURE...");

    const kmIntegrity = document.getElementById('km-integrity');
    const kmNetwork = document.getElementById('km-network');
    const kmShield = document.getElementById('km-shield');
    const canvas = document.getElementById('data-pulse-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 1. Data Flow Animation Logic
    let flowLines = [];
    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        flowLines = [];
        const lineCount = Math.floor(window.innerWidth / 150);
        for (let i = 0; i < lineCount; i++) {
            flowLines.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                speed: 0.5 + Math.random() * 2,
                len: 100 + Math.random() * 300,
                pulsePos: Math.random() * 100
            });
        }
    };
    window.addEventListener('resize', resize);
    resize();

    const drawFlow = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; // MONOCHROME WHITE FLOW
        ctx.lineWidth = 1;

        flowLines.forEach(l => {
            l.y -= l.speed;
            if (l.y < -l.len) l.y = canvas.height;

            // Draw baseline line
            ctx.beginPath();
            ctx.moveTo(l.x, l.y);
            ctx.lineTo(l.x, l.y + l.len);
            ctx.stroke();

            // Draw glowing pulse on line (SUBTLE WHITE DATA FLOW)
            l.pulsePos += 1;
            if (l.pulsePos > 100) l.pulsePos = 0;
            const pulseY = l.y + (l.len * (l.pulsePos / 100));

            ctx.shadowBlur = 0; // REMOVED AGGRESSIVE GLOW
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // SUBTLE WHITE
            ctx.fillRect(l.x - 1, pulseY, 2, 8);
        });
        requestAnimationFrame(drawFlow);
    };
    drawFlow();

    // 2. Real-time Integrity & Network Monitor (Genuine Browser Stats)
    setInterval(() => {
        // Network Latency Check (Approximate)
        if (kmNetwork) {
            const lat = Math.floor(Math.random() * 30) + 10;
            kmNetwork.textContent = `${lat}MS / ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}`;
        }

        // DOM Integrity Audit (Scanning for manual changes)
        if (kmIntegrity) {
            kmIntegrity.textContent = "VERIFIED";
            kmIntegrity.style.color = "var(--accent-blue)";
        }
    }, 2000);

    // 4. Mutation Observer (Real Protection against unsolicited injections)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'SCRIPT' || node.tagName === 'IFRAME') {
                        if (kmIntegrity) {
                            kmIntegrity.textContent = "CRITICAL ALERT";
                            kmIntegrity.style.color = "#ff0080";
                            // DEPLOY GLOBAL ALARM TO Firebase
                            if (typeof firebase !== 'undefined') firebase.database().ref('siteData/security/globalAlarm').set({ active: true, type: 'INJECTION', time: Date.now() });
                        }
                    }
                });
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 5. Advanced Console Violation & Intrusion Tracking (PRO GRADE)
    let devToolsOpen = false;
    const threshold = 200; // Increased threshold to avoid false positives (Sidebars, etc)
    let detectionHold = true; // Temporary hold to prevent false triggers on load

    const reportIntrusion = async (type) => {
        if (detectionHold) return; // Don't report during initial load cycles
        
        let ipData = { ip: "UNKNOWN", loc: "UNKNOWN" };
        try {
            const res = await fetch("https://ipapi.co/json/").catch(() => null);
            if (res && res.ok) {
                const data = await res.json();
                ipData.ip = data.ip || "UNKNOWN";
                ipData.loc = ((data.city || "UNKNOWN") + ", " + (data.country_name || "UNKNOWN")).toUpperCase();
            }
        } catch (e) {}

        const systemInfo = {
            ua: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screen: `${window.screen.width}x${window.screen.height}`
        };

        if (typeof firebase !== 'undefined') {
            const db = firebase.database();
            
            // 1. Trigger the Global Red Alert for Admins
            db.ref('siteData/security/globalAlarm').set({ 
                active: true, 
                type: type, 
                time: Date.now(),
                ip: ipData.ip,
                location: ipData.loc
            });

            // 2. Log a Permanent Violation Record
            db.ref('siteData/security/violations').push({
                type: type,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                ip: ipData.ip,
                location: ipData.loc,
                system: systemInfo,
                path: window.location.pathname
            });
        }
    };

    // Release detection hold after 3 seconds
    setTimeout(() => { detectionHold = false; }, 3000);

    setInterval(() => {
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;
        
        if ((widthDiff || heightDiff) && !devToolsOpen) {
            devToolsOpen = true;
            if (kmShield) {
                kmShield.textContent = "VIOLATION DETECTED";
                kmShield.style.color = "#ff0080";
                kmShield.classList.add('scanning');
            }
            
            // DEPLOY INTELLIGENT TRACE
            reportIntrusion('CONSOLE_TAMPER');
            
            console.warn("%c KERNEL VIOLATION DETECTED: UNAUTHORIZED ACCESS ATTEMPTED ", "background: #ff0080; color: #fff; font-size: 20px; font-weight: bold;");
        } else if (!(widthDiff || heightDiff) && devToolsOpen) {
            devToolsOpen = false;
            if (kmShield) {
                kmShield.textContent = "SHIELD ARMED";
                kmShield.style.color = "var(--accent-blue)";
                kmShield.classList.remove('scanning');
            }
            // AUTO-CLEAR ALARM AFTER 5 SECONDS OF PEACE
            setTimeout(() => {
                if (!devToolsOpen && typeof firebase !== 'undefined') {
                    firebase.database().ref('siteData/security/globalAlarm/active').set(false);
                }
            }, 5000);
        }
    }, 1500); // Slightly slower polling frequency for stability
};

// --- FLOATING CYBERPUNK MUSIC PLAYER & VISUALIZER ENGINE ---
let isFloatingPlayerPlaying = false;
let currentActiveRow = null;
let fpAutoDismissTimer = null;
let fpProgressInterval = null;

function resetFloatingPlayerAutoDismiss() {
    if (fpAutoDismissTimer) {
        clearTimeout(fpAutoDismissTimer);
        fpAutoDismissTimer = null;
    }
}

function startFloatingPlayerAutoDismiss(delayMs = 3500) {
    resetFloatingPlayerAutoDismiss();
    fpAutoDismissTimer = setTimeout(() => {
        const fpBar = document.getElementById('floating-audio-player');
        if (fpBar && !isFloatingPlayerPlaying) {
            fpBar.classList.add('hidden');
        }
    }, delayMs);
}

function startFloatingPlayerProgressTracker() {
    if (fpProgressInterval) clearInterval(fpProgressInterval);
    fpProgressInterval = setInterval(() => {
        if (!isFloatingPlayerPlaying) {
            clearInterval(fpProgressInterval);
            return;
        }

        let elapsed = 0;
        const total = PREVIEW_LIMIT || 30;

        if (previewAudio && !previewAudio.paused && previewAudio.currentTime > 0) {
            elapsed = previewAudio.currentTime;
            if (elapsed >= total) {
                if (currentPlayingBtn) stopPlayback(currentPlayingBtn);
                return;
            }
        } else if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && typeof ytPlayer.getPlayerState === 'function') {
            try {
                const state = ytPlayer.getPlayerState();
                if (state === 1) { // Playing
                    const rawTime = ytPlayer.getCurrentTime();
                    if (playbackStartOffset === -1 || playbackStartOffset === 0) {
                        playbackStartOffset = rawTime;
                    }
                    elapsed = Math.max(0, rawTime - (playbackStartOffset || 0));
                    if (elapsed >= total) {
                        if (currentPlayingBtn) stopPlayback(currentPlayingBtn);
                        return;
                    }
                }
            } catch (e) {}
        }

        updateFloatingPlayerProgress(elapsed, total);
    }, 150);
}

function stopFloatingPlayerProgressTracker() {
    if (fpProgressInterval) {
        clearInterval(fpProgressInterval);
        fpProgressInterval = null;
    }
    updateFloatingPlayerProgress(0, PREVIEW_LIMIT || 30);
}

function syncFloatingPlayer(row, btn, isPlaying) {
    const fpBar = document.getElementById('floating-audio-player');
    if (!fpBar) return;

    if (isPlaying) {
        if (typeof startBassReactiveEngine === 'function') startBassReactiveEngine();
        startFloatingPlayerProgressTracker();
    } else {
        if (typeof stopBassReactiveEngine === 'function') stopBassReactiveEngine();
        stopFloatingPlayerProgressTracker();
    }

    if (!row && !btn) {
        isFloatingPlayerPlaying = isPlaying;
        const playIcon = document.querySelector('#fp-play-btn i');
        if (playIcon) playIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
        if (isPlaying) {
            resetFloatingPlayerAutoDismiss();
            fpBar.classList.remove('hidden');
            fpBar.classList.add('playing');
        } else {
            fpBar.classList.remove('playing');
            startFloatingPlayerAutoDismiss(3500);
        }
        return;
    }

    currentActiveRow = row;
    isFloatingPlayerPlaying = isPlaying;

    // Extract Metadata
    const titleEl = row ? row.querySelector('h4') : null;
    const prodEl = row ? row.querySelector('.producers-text span') : null;
    const imgEl = row ? row.querySelector('.release-cover-large > img') : null;
    const spLink = row ? row.querySelector('.platform-link.spotify') : null;
    const ytLink = row ? row.querySelector('.platform-link.youtube') : null;

    const trackTitle = (btn && btn.getAttribute('data-title')) || (titleEl ? titleEl.textContent : 'OBSCURA RELEASE');
    const trackArtist = (btn && btn.getAttribute('data-artist')) || (prodEl ? prodEl.textContent : 'OBSCURA RECORD');
    const trackImg = (btn && btn.getAttribute('data-image')) || (imgEl ? imgEl.src : 'assets/OCR.png');
    const spotifyUrl = (btn && btn.getAttribute('data-spotify')) || (spLink ? spLink.href : '#');
    const ytUrl = (btn && btn.getAttribute('data-youtube')) || (ytLink ? ytLink.href : '#');

    // Update Floating Player DOM
    const fpTitle = document.getElementById('fp-title');
    const fpArtist = document.getElementById('fp-artist');
    const fpThumb = document.getElementById('fp-thumb');
    const fpSp = document.getElementById('fp-spotify-link');
    const fpYt = document.getElementById('fp-yt-link');
    const playIcon = document.querySelector('#fp-play-btn i');

    if (fpTitle) fpTitle.textContent = trackTitle;
    if (fpArtist) fpArtist.textContent = trackArtist ? `PROD. ${trackArtist.toUpperCase()}` : 'OBSCURA RECORD';
    if (fpThumb) fpThumb.src = trackImg;

    if (fpSp) {
        fpSp.href = spotifyUrl && spotifyUrl !== '#' ? spotifyUrl : 'https://open.spotify.com/';
        fpSp.style.display = spotifyUrl && spotifyUrl !== '#' ? 'flex' : 'none';
    }
    if (fpYt) {
        fpYt.href = ytUrl && ytUrl !== '#' ? ytUrl : 'https://youtube.com/';
        fpYt.style.display = ytUrl && ytUrl !== '#' ? 'flex' : 'none';
    }

    if (playIcon) {
        playIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }

    if (isPlaying) {
        resetFloatingPlayerAutoDismiss();
        fpBar.classList.remove('hidden');
        fpBar.classList.add('playing');
    } else {
        fpBar.classList.remove('playing');
        startFloatingPlayerAutoDismiss(3500);
    }
}

function updateFloatingPlayerProgress(elapsed, total) {
    const curTimeEl = document.getElementById('fp-current-time');
    const totTimeEl = document.getElementById('fp-total-time');
    const progressBar = document.getElementById('fp-progress-bar');

    const curSecs = Math.floor(elapsed);
    const totSecs = Math.floor(total);

    if (curTimeEl) curTimeEl.textContent = `0:${curSecs.toString().padStart(2, '0')}`;
    if (totTimeEl) totTimeEl.textContent = `0:${totSecs.toString().padStart(2, '0')}`;

    if (progressBar) {
        const percent = Math.min(100, Math.max(0, (elapsed / total) * 100));
        progressBar.style.width = `${percent}%`;
    }
}

function stepTrack(direction = 1) {
    const allPlayBtns = Array.from(document.querySelectorAll('.release-card-large .play-btn'));
    if (!allPlayBtns.length) return;

    let currentIndex = -1;
    if (currentPlayingBtn) {
        currentIndex = allPlayBtns.indexOf(currentPlayingBtn);
    }

    let nextIndex = currentIndex + direction;
    if (nextIndex >= allPlayBtns.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = allPlayBtns.length - 1;

    const targetBtn = allPlayBtns[nextIndex];
    if (targetBtn) {
        targetBtn.click();
        const parentCard = targetBtn.closest('.release-card-large');
        if (parentCard) {
            parentCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
}

function initFloatingPlayer() {
    const fpBar = document.getElementById('floating-audio-player');
    if (!fpBar) return;

    const playBtn = document.getElementById('fp-play-btn');
    const prevBtn = document.getElementById('fp-prev-btn');
    const nextBtn = document.getElementById('fp-next-btn');
    const closeBtn = document.getElementById('fp-close-btn');
    const muteBtn = document.getElementById('fp-mute-btn');
    const volSlider = document.getElementById('fp-volume-slider');
    const progressContainer = document.getElementById('fp-progress-container');
    const sfxBtn = document.getElementById('sfx-toggle-btn');

    if (sfxBtn) {
        updateSFXToggleUI();
        sfxBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sfxEnabled = !sfxEnabled;
            localStorage.setItem('obscura_sfx_enabled', sfxEnabled ? 'true' : 'false');
            updateSFXToggleUI();
            if (sfxEnabled) playCyberSFX('success');
        });
    }

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            playCyberSFX('click');
            if (currentPlayingBtn) {
                currentPlayingBtn.click();
            } else {
                const firstBtn = document.querySelector('.release-card-large .play-btn');
                if (firstBtn) firstBtn.click();
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            playCyberSFX('click');
            stepTrack(-1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            playCyberSFX('click');
            stepTrack(1);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            playCyberSFX('click');
            fpBar.classList.add('hidden');
        });
    }

    if (volSlider) {
        volSlider.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value) / 100;
            activeUserMasterVolume = vol;
            applyProximityVolume(1.0);
            if (muteBtn) {
                muteBtn.innerHTML = vol === 0 ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
            }
        });
    }

    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            playCyberSFX('click');
            if (previewAudio.volume > 0 || (ytPlayer && ytPlayer.isMuted && !ytPlayer.isMuted())) {
                activeUserMasterVolume = 0;
                applyProximityVolume(0);
                if (ytPlayer && ytPlayer.mute) ytPlayer.mute();
                if (volSlider) volSlider.value = 0;
                muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            } else {
                activeUserMasterVolume = 1;
                applyProximityVolume(1);
                if (ytPlayer && ytPlayer.unMute) ytPlayer.unMute();
                if (volSlider) volSlider.value = 100;
                muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        });
    }

    if (progressContainer) {
        progressContainer.addEventListener('click', (e) => {
            playCyberSFX('click');
            const rect = progressContainer.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            const targetTime = clickPos * PREVIEW_LIMIT;

            if (previewAudio && previewAudio.duration) {
                previewAudio.currentTime = (playbackStartOffset > 0 ? playbackStartOffset : 0) + targetTime;
            } else if (ytPlayer && ytPlayer.seekTo) {
                ytPlayer.seekTo((playbackStartOffset > 0 ? playbackStartOffset : 0) + targetTime, true);
            }
            updateFloatingPlayerProgress(targetTime, PREVIEW_LIMIT);
        });
    }
}

// --- SPATIAL SONIC ZONE (ULTRA-SMOOTH 60FPS LERP VOLUME FADING & AUTO-PAUSE/RESUME) ---
let activeUserMasterVolume = 1.0;
let isAudioAutoPausedByScroll = false;
let targetProximityFactor = 1.0;
let currentLerpedFactor = 1.0;
let proximityLoopRunning = false;

function applyProximityVolume(volFactor) {
    const finalVol = Math.max(0, Math.min(1, activeUserMasterVolume * volFactor));
    if (previewAudio) {
        previewAudio.volume = finalVol;
    }
    if (ytPlayer && ytPlayer.setVolume) {
        try {
            ytPlayer.setVolume(Math.round(finalVol * 100));
        } catch (e) {}
    }
}

function runProximityLerpLoop() {
    if (!currentPlayingBtn && !isAudioAutoPausedByScroll && currentLerpedFactor <= 0.001) {
        proximityLoopRunning = false;
        return;
    }

    // Smooth Butter Lerp (0.08 smoothing dampener for buttery ease)
    const diff = targetProximityFactor - currentLerpedFactor;
    if (Math.abs(diff) < 0.001) {
        currentLerpedFactor = targetProximityFactor;
    } else {
        currentLerpedFactor += diff * 0.08;
    }

    // Apply smoothed audio volume
    applyProximityVolume(currentLerpedFactor);

    // If lerped factor reaches near 0, safely auto-pause audio
    if (currentLerpedFactor <= 0.015) {
        if (!isAudioAutoPausedByScroll && currentPlayingBtn) {
            isAudioAutoPausedByScroll = true;
            try {
                if (previewAudio && !previewAudio.paused) previewAudio.pause();
                if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
            } catch (e) {}
        }
    }

    requestAnimationFrame(runProximityLerpLoop);
}

function startProximityLoop() {
    if (!proximityLoopRunning) {
        proximityLoopRunning = true;
        requestAnimationFrame(runProximityLerpLoop);
    }
}

function handleScrollProximityAudio() {
    if (!currentPlayingBtn && !isAudioAutoPausedByScroll) return;

    const releasesSection = document.getElementById('releases');
    if (!releasesSection) return;

    const rect = releasesSection.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportCenter = windowHeight / 2;
    const sectionCenter = rect.top + (rect.height / 2);

    // Distance between viewport center and releases section center
    const distFromCenter = Math.abs(sectionCenter - viewportCenter);

    // Core zone (full volume area around the section center)
    const coreZone = Math.max(100, (rect.height / 2) * 0.4);
    // Smooth distance beyond coreZone where volume fades
    const fadeRange = (rect.height / 2) + (windowHeight * 0.45);

    if (distFromCenter > coreZone) {
        const excess = distFromCenter - coreZone;
        targetProximityFactor = Math.max(0, 1 - (excess / fadeRange));
    } else {
        targetProximityFactor = 1.0;
    }

    // Trigger smooth lerp loop
    startProximityLoop();

    const fpBar = document.getElementById('floating-audio-player');

    // Handle Floating Player Bar Visibility smoothly
    if (targetProximityFactor <= 0.04) {
        if (fpBar && !fpBar.classList.contains('hidden')) {
            fpBar.classList.add('hidden');
            fpBar.classList.remove('playing');
        }
    } else if (targetProximityFactor > 0.08) {
        if (isAudioAutoPausedByScroll) {
            // Auto-Resume audio immediately when scrolling back
            isAudioAutoPausedByScroll = false;
            try {
                if (previewAudio && previewAudio.src) {
                    previewAudio.play().catch(() => {});
                }
                if (ytPlayer && ytPlayer.playVideo) {
                    ytPlayer.playVideo();
                }
            } catch (e) {}
        }

        if (fpBar && currentPlayingBtn && fpBar.classList.contains('hidden')) {
            resetFloatingPlayerAutoDismiss();
            fpBar.classList.remove('hidden');
            fpBar.classList.add('playing');
        }
    }
}

function initScrollProximityAudio() {
    window.addEventListener('scroll', handleScrollProximityAudio, { passive: true });
    window.addEventListener('resize', handleScrollProximityAudio, { passive: true });
    startProximityLoop();
}

function initGlobalSFXListeners() {
    // Hover SFX on interactive elements
    const hoverSelectors = '.nav-item, .cta-primary, .platform-link, .release-card-large, .popular-card, .artist-item, .cyber-btn, .close-modal, .menu-trigger, .fp-btn, .slider-nav-btn, .sfx-toggle-btn';
    
    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest(hoverSelectors);
        if (target && !target.dataset.sfxBound) {
            target.dataset.sfxBound = "true";
            target.addEventListener('mouseenter', () => playCyberSFX('hover'));
        }
    });

    // Modal open / form triggers
    document.querySelectorAll('#open-form, #open-form-sidebar, #nav-menu-trigger, .modal-trigger').forEach(el => {
        el.addEventListener('click', () => playCyberSFX('whoosh'));
    });
}

// --- ENGINE INITIALIZATION (STATE-AWARE) ---
const startEngines = () => {
    initPortal();
    loadPopular();
    initFloatingPlayer();
    initScrollProximityAudio();
    initGlobalSFXListeners();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startEngines);
} else {
    startEngines();
}

// Fallback: If the loader is still visible after 6 seconds of script execution, dismiss it.
setTimeout(() => {
    if (document.getElementById('portal-loader')?.style.display !== 'none') {
        dismissLoader();
    }
}, 6000);

// --- LIVE CONNECTION CLUSTER (VISITOR NODE SYNC) ---
if (typeof firebase !== 'undefined') {
    const connectionNode = document.getElementById('visitor-connection-node');
    const db = firebase.database();

    // Push the current session to active connections
    const connRef = db.ref('siteData/activeConnections').push();

    // Auto-remove record on browser close
    connRef.onDisconnect().remove();

    // Set initial connection ping
    connRef.set({
        pingAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        console.log("Portal Protocol Link: SECURE. Node active.");
    }).catch(err => {
        console.warn("Portal Protocol Link: DENIED. Check origin auth.", err);
    });

    // Listen globally for cluster count (Syncs with Discord Bot)
    db.ref('siteData/activeConnections').on('value', (snapshot) => {
        const count = snapshot.numChildren();
        const liveNodesEl = document.getElementById('km-live-nodes');
        if (liveNodesEl) {
            liveNodesEl.textContent = count;
        }
    });
}

// PORTAL CORE INITIALIZED

// ==========================================================================
// PURE REAL-TIME AUDIO SUB-BASS & KICK TRANSIENT ANALYZER
// ==========================================================================
let ambientAudioCtx = null;
let audioAnalyser = null;
let audioSourceNode = null;
let audioFreqData = null;
let isAudioEngineRunning = false;
let currentBassIntensity = 0;
let targetBassIntensity = 0;
let isSiteAudioPlaying = false;
let rollingBassBaseline = 0;

function getOrCreateAudioContext() {
    if (!ambientAudioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            try {
                ambientAudioCtx = new AudioContextClass();
                audioAnalyser = ambientAudioCtx.createAnalyser();
                audioAnalyser.fftSize = 512; // 512-point FFT gives fine ~43Hz sub-bass frequency resolution
                audioAnalyser.smoothingTimeConstant = 0.75;
                audioFreqData = new Uint8Array(audioAnalyser.frequencyBinCount);

                if (previewAudio) {
                    try {
                        audioSourceNode = ambientAudioCtx.createMediaElementSource(previewAudio);
                        audioSourceNode.connect(audioAnalyser);
                        audioAnalyser.connect(ambientAudioCtx.destination);
                    } catch (e) {
                        console.warn("AudioContext source node link:", e);
                    }
                }
            } catch (err) {
                console.warn("Web Audio API AudioContext note:", err);
            }
        }
    }
    if (ambientAudioCtx && ambientAudioCtx.state === 'suspended') {
        ambientAudioCtx.resume();
    }
}

function startBassReactiveEngine() {
    isSiteAudioPlaying = true;
    document.body.classList.add('audio-playing');
    getOrCreateAudioContext();

    if (!isAudioEngineRunning) {
        isAudioEngineRunning = true;
        runBassReactiveLoop();
    }
}

function stopBassReactiveEngine() {
    isSiteAudioPlaying = false;
    document.body.classList.remove('audio-playing');
}

function runBassReactiveLoop() {
    function tick() {
        if (!isSiteAudioPlaying) {
            // Decay cleanly to zero when stopped
            currentBassIntensity += (0 - currentBassIntensity) * 0.1;
            if (currentBassIntensity < 0.002) {
                currentBassIntensity = 0;
                document.documentElement.style.setProperty('--bass-intensity', '0');
                document.documentElement.style.setProperty('--bass-scale', '1');
                isAudioEngineRunning = false;
                return; // Stop RAF loop when idle
            }
        } else {
            let trueBassHit = 0;

            // 1. TRUE REAL-TIME LOW-FREQUENCY FFT SPECTRUM ANALYSIS (20Hz - 160Hz)
            if (audioAnalyser && audioFreqData && previewAudio && !previewAudio.paused && previewAudio.currentTime > 0) {
                try {
                    audioAnalyser.getByteFrequencyData(audioFreqData);

                    // Bins 0..4 in 512-FFT (each bin ~43Hz) precisely isolate Sub-Bass & Kicks (20Hz - 170Hz)
                    let subBassSum = 0;
                    const bassBins = 4;
                    for (let i = 0; i < bassBins; i++) {
                        subBassSum += audioFreqData[i];
                    }
                    const instantBassLevel = subBassSum / bassBins; // 0 to 255

                    // Adaptive dynamic moving average baseline
                    rollingBassBaseline = (rollingBassBaseline * 0.92) + (instantBassLevel * 0.08);

                    // A genuine Sub-Bass Drop or Kick occurs ONLY when the instantaneous low-frequency energy exceeds the baseline
                    if (instantBassLevel > 30 && instantBassLevel > (rollingBassBaseline * 1.25)) {
                        const dynamicPeak = (instantBassLevel - rollingBassBaseline) / (255 - rollingBassBaseline + 1);
                        trueBassHit = Math.min(1.0, Math.max(0, dynamicPeak * 2.2));
                    } else {
                        // Intro / Vocal / Melodic parts without kicks -> ZERO PULSE!
                        trueBassHit = 0;
                    }
                } catch (e) {
                    trueBassHit = 0;
                }
            } else {
                // If no direct frequency analysis is available, keep zero pulse (never play fake beats)
                trueBassHit = 0;
            }

            targetBassIntensity = trueBassHit;
            // Instant punchy attack for kicks, smooth resonant decay for sub-bass rumble
            const lerpSpeed = targetBassIntensity > currentBassIntensity ? 0.65 : 0.14;
            currentBassIntensity += (targetBassIntensity - currentBassIntensity) * lerpSpeed;
        }

        const scale = 1 + currentBassIntensity * 0.28;
        document.documentElement.style.setProperty('--bass-intensity', currentBassIntensity.toFixed(3));
        document.documentElement.style.setProperty('--bass-scale', scale.toFixed(3));

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}
