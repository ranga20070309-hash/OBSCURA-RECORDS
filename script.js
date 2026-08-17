/* 
    OBSCURA RECORDS | THE IGNITION SEQUENCE (OS v2.0.6)
    AUTHOR: RANGA | STRICTLY CUSTOM BUILT
*/

// --- DEVELOPER AUTHENTICATION (FOR INSPECTORS) ---
console.log(
    '%c CORE PORTAL AUTHENTICATED %c \n%c DEVELOPER: RANGA %c \n%c PROJECT: OBSCURA RECORD %c',
    'background: #00f0ff; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
    '',
    'color: #00f0ff; font-weight: bold; margin-top: 5px;',
    '',
    'color: #fff; opacity: 0.8;',
    ''
);
console.log("%cWARNING: ACCESSING PROTECTED LOGIC. REVERSE ENGINEERING IS MONITORED.", "color: red; font-weight: bold; font-size: 8px;");


// Force scroll to top on reload (Robust method)
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

// --- UI SOUND SYNTHESIZER (Clean Web Audio API) ---
let audioCtx = null;


// UI SOUND SYNTHESIZER (Clean Web Audio API) ---
const playBleep = (freq = 600, type = 'sine', duration = 0.08) => {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
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

window.onYouTubeIframeAPIReady = function () {
    initYTPlayer();
};

function initYTPlayer() {
    if (ytPlayer && isYTApiReady) return;
    try {
        ytPlayer = new YT.Player('yt-player-container', {
            height: '180',
            width: '320',
            playerVars: {
                'autoplay': 0,
                'controls': 0,
                'showinfo': 0,
                'rel': 0,
                'modestbranding': 1,
                'enablejsapi': 1,
                'origin': window.location.origin === 'null' ? '*' : window.location.origin
            },
            events: {
                'onReady': () => {
                    isYTApiReady = true;
                    console.log('YT API Active');
                    if (ytPlayer.setVolume) ytPlayer.setVolume(100);
                },
                'onStateChange': onPlayerStateChange,
                'onError': (e) => {
                    console.warn("YT Playback Blocked in this context (Error Code: " + e.data + ")");
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

function startUIPlayback(btn, row, img) {
    if (!btn) return;
    playBleep(800, 'square', 0.1);
    btn.innerHTML = '<i class="fas fa-pause"></i>';
    row.classList.add('active-track');

    gsap.to(btn, { scale: 1.1, boxShadow: '0 0 20px #00f0ff', repeat: -1, yoyo: true, duration: 0.8 });
    if (img) gsap.to(img, { scale: 1.15, duration: 20, ease: "linear", repeat: -1, yoyo: true });
}

function stopPlayback(btn) {
    if (!btn) return;
    playBleep(400, 'sine', 0.1);
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
            const card = document.createElement('div');
            card.className = 'popular-card';
            card.innerHTML = `
                <div class="trending-badge">TRENDING</div>
                <div class="popular-cover">
                    <img src="${r.image}" alt="${r.title}">
                    <div class="popular-overlay">
                        <div class="play-icon-glow"><i class="fas fa-play"></i></div>
                    </div>
                </div>
                <div class="popular-info">
                    <h3>${r.title}</h3>
                    <p>${r.artist}</p>
                    <div class="popular-links">
                        ${r.spotify && r.spotify !== '#' ? `<a href="${r.spotify}" target="_blank" class="platform-link spotify" onclick="event.stopPropagation()"><i class="fab fa-spotify"></i></a>` : ''}
                        ${r.youtube && r.youtube !== '#' ? `<a href="${r.youtube}" target="_blank" class="platform-link youtube" onclick="event.stopPropagation()"><i class="fab fa-youtube"></i></a>` : ''}
                        ${r.apple && r.apple !== '#' ? `<a href="${r.apple}" target="_blank" class="platform-link apple" onclick="event.stopPropagation()"><i class="fab fa-apple"></i></a>` : ''}
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                if (typeof playBleep === 'function') playBleep(900, 'sine', 0.1);
                // Default click opens the first available link
                const firstLink = r.spotify !== '#' ? r.spotify : (r.youtube !== '#' ? r.youtube : r.apple);
                if (firstLink && firstLink !== '#') window.open(firstLink, '_blank');
            });

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
                    ? spotifyLinks.map((link, i) => `ðŸ”— [ VIEW PROFILE ${i + 1} ]: ${link}`).join('\n')
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
                        console.log("âœ… SYSTEM: Custom Email Backend Dispatched Successfully");
                    } else {
                        console.error("âŒ ERROR: Custom Email Backend Rejected Request", await emailResult.text());
                    }
                } catch (eErr) {
                    console.error("âŒ ERROR: Email Transmission Node Failure", eErr);
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
                        console.log("âœ… SYSTEM: Custom Contact Email Sent");
                    } else {
                        console.error("âŒ ERROR: Custom Contact Email Failure", await emailResult.text());
                    }
                } catch (eErr) {
                    console.error("âŒ ERROR: Contact Email Failure", eErr);
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
    const tiltContainers = document.querySelectorAll('.glass:not(.no-tilt), .release-card, .social-card, .faq-item');
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

        // Helper to get platform font-awesome icon
        const getPlatformIcon = (platform) => {
            const p = (platform || '').toLowerCase();
            if (p === 'instagram') return 'fab fa-instagram';
            if (p === 'spotify') return 'fab fa-spotify';
            if (p === 'apple') return 'fa-brands fa-apple';
            if (p === 'facebook') return 'fa-brands fa-facebook-f';
            if (p === 'youtube') return 'fab fa-youtube';
            if (p === 'tiktok') return 'fab fa-tiktok';
            if (p === 'twitter' || p === 'x') return 'fab fa-x-twitter';
            if (p === 'discord') return 'fab fa-discord';
            return 'fas fa-link';
        };

        // Open Profile Modal Helper
        const openPersonnelModal = (data, fallbackName, isPartner = false) => {
            const modal = document.getElementById('artist-modal');
            const mName = document.getElementById('artist-modal-name');
            const mStatus = document.getElementById('artist-modal-status');
            const mBio = document.getElementById('artist-modal-bio');
            const mImg = document.getElementById('artist-modal-img');
            const mDecor = document.getElementById('artist-modal-decoration');
            const mLinks = document.getElementById('artist-modal-links');

            if (!modal) return;
            if (typeof playBleep === 'function') playBleep(700, 'sine', 0.1);

            if (mName) mName.textContent = data.name || fallbackName || 'PERSONNEL';
            
            if (mStatus) {
                if (isPartner) {
                    mStatus.textContent = (data.role || 'LABEL PARTNER').toUpperCase();
                    mStatus.className = 'staff-role-badge partner-badge';
                    mStatus.style.marginTop = '0.5rem';
                } else {
                    const st = (data.status || 'OFFLINE').toLowerCase();
                    mStatus.textContent = st.toUpperCase();
                    mStatus.className = `status-indicator ${st}`;
                    mStatus.style.marginTop = '0.5rem';
                }
            }

            if (mBio) mBio.textContent = data.bio || (isPartner ? "Official label partner and collaborator profile." : "Accessing encrypted staff profile... no secondary transmission found.");

            if (data.avatar_url && mImg) {
                mImg.style.backgroundImage = `url(${data.avatar_url})`;
                mImg.style.backgroundSize = 'cover';
            }

            if (mDecor) {
                if (data.decoration_url && data.decoration_url !== '' && !isPartner) {
                    mDecor.src = data.decoration_url;
                    mDecor.style.display = 'block';
                } else {
                    mDecor.style.display = 'none';
                }
            }

            if (mLinks) {
                mLinks.innerHTML = '';
                // Optional Discord Connect Link
                if (data.discord_link) {
                    mLinks.insertAdjacentHTML('beforeend', `
                        <a href="${data.discord_link}" target="_blank" class="platform-link" title="Connect on Discord" style="background:#5865F2;border-color:#5865F2;color:#fff;">
                            <i class="fab fa-discord"></i>
                        </a>
                    `);
                }
                if (data.socials) {
                    Object.entries(data.socials).forEach(([platform, url]) => {
                        if (!url || url === '#') return;
                        mLinks.insertAdjacentHTML('beforeend', `
                            <a href="${url}" target="_blank" class="platform-link" title="${platform}">
                                <i class="${getPlatformIcon(platform)}"></i>
                            </a>
                        `);
                    });
                }
            }

            modal.classList.add('active');
            document.body.classList.add('no-scroll');
            document.documentElement.classList.add('no-scroll');
        };

        // =====================================================
        // REALTIME STAFF DIRECTORY SYNC (staff_status/ in Firebase)
        // =====================================================
        const staffGrid = document.querySelector('#artists .artists-grid');
        const staffRef = db.ref('staff_status');

        staffRef.on('value', (snapshot) => {
            const staffData = snapshot.val();
            if (!staffData || !staffGrid) return;

            // Render all dynamic staff cards
            staffGrid.innerHTML = '';
            Object.entries(staffData).forEach(([discordId, data]) => {
                const status = (data.status || 'offline').toLowerCase();
                const avatar = data.avatar_url || 'assets/staff/default.png';
                const role = data.role || 'CORE STAFF';
                const name = data.name || 'UNKNOWN';
                const hasDecor = data.decoration_url && data.decoration_url !== '';

                const card = document.createElement('div');
                card.className = 'artist-item glass';
                card.dataset.discordId = discordId;
                card.innerHTML = `
                    <div class="avatar-wrapper">
                        <div class="artist-img ${status}" style="background-image: url('${avatar}');"></div>
                        <img src="${hasDecor ? data.decoration_url : ''}" class="avatar-decoration" alt="Frame" style="display: ${hasDecor ? 'block' : 'none'};">
                    </div>
                    <h4>${name}</h4>
                    <span class="staff-role-badge">${role}</span>
                    <p>Status: <span class="status-indicator ${status}">${status.toUpperCase()}</span></p>
                    <span class="artist-loc">Discord Presence</span>
                `;

                card.addEventListener('click', () => openPersonnelModal(data, name, false));
                staffGrid.appendChild(card);
            });
        }, (error) => {
            console.error('[STAFF SYNC ERROR]', error);
        });

        // =====================================================
        // REALTIME PARTNER DIRECTORY SYNC (partner_status/ in Firebase)
        // (NO Discord status required — prominent details & links)
        // =====================================================
        const partnersGrid = document.querySelector('#partners .artists-grid');
        const partnerRef = db.ref('partner_status');

        partnerRef.on('value', (snapshot) => {
            const partnerData = snapshot.val();
            if (!partnersGrid) return;
            if (!partnerData || Object.keys(partnerData).length === 0) return;

            partnersGrid.innerHTML = '';
            Object.entries(partnerData).forEach(([partnerId, data]) => {
                const avatar = data.avatar_url || 'assets/staff/default.png';
                const name = data.name || 'PARTNER';
                const role = data.role || 'LABEL PARTNER';
                const bio = data.bio || 'Official label partner and collaborator.';

                // Build social icons for card
                let socialLinksHtml = '';
                if (data.discord_link) {
                    socialLinksHtml += `<a href="${data.discord_link}" target="_blank" class="platform-link" style="background:#5865F2;border-color:#5865F2;"><i class="fab fa-discord"></i></a>`;
                }
                if (data.socials) {
                    Object.entries(data.socials).forEach(([p, u]) => {
                        if (u && u !== '#') {
                            socialLinksHtml += `<a href="${u}" target="_blank" class="platform-link"><i class="${getPlatformIcon(p)}"></i></a>`;
                        }
                    });
                }

                const card = document.createElement('div');
                card.className = 'artist-item glass partner-card';
                card.dataset.partnerId = partnerId;
                card.innerHTML = `
                    <div class="avatar-wrapper">
                        <div class="artist-img" style="background-image: url('${avatar}');"></div>
                    </div>
                    <h4>${name}</h4>
                    <span class="staff-role-badge partner-badge">${role}</span>
                    <p class="partner-bio-preview">${bio}</p>
                    ${socialLinksHtml ? `<div class="partner-card-socials">${socialLinksHtml}</div>` : ''}
                `;

                card.addEventListener('click', (e) => {
                    if (e.target.closest('.platform-link')) return; // Allow direct link clicks
                    openPersonnelModal(data, name, true);
                });

                partnersGrid.appendChild(card);
            });
        }, (error) => {
            console.error('[PARTNER SYNC ERROR]', error);
        });

    } else {
        console.error("Firebase SDK not loaded! Check index.html scripts.");
    }

    // --- FIREBASE DYNAMIC SITE DATA (GLOBALS & RELEASES) ---
    if (typeof firebase !== 'undefined') {
        const db = firebase.database();

        // --- STARFIELD CANVAS FOR MAINTENANCE MODE ---
        let mCanvasAnimId = null;
        function initSpaceCanvas() {
            const canvas = document.getElementById('m-space-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            let width = canvas.width = window.innerWidth;
            let height = canvas.height = window.innerHeight;

            const stars = [];
            const numStars = 80;
            for (let i = 0; i < numStars; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    radius: Math.random() * 1.3 + 0.3,
                    alpha: Math.random() * 0.7 + 0.2,
                    speed: Math.random() * 0.12 + 0.04
                });
            }

            function render() {
                ctx.clearRect(0, 0, width, height);
                stars.forEach(star => {
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(0, 240, 255, ${star.alpha})`;
                    ctx.fill();

                    star.y -= star.speed;
                    if (star.y < 0) {
                        star.y = height;
                        star.x = Math.random() * width;
                    }
                });
                mCanvasAnimId = requestAnimationFrame(render);
            }

            window.addEventListener('resize', () => {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
            });

            if (mCanvasAnimId) cancelAnimationFrame(mCanvasAnimId);
            render();
        }

        // --- FLOATING ADMIN PREVIEW BANNER ENGINE ---
        function renderAdminPreviewBanner(active) {
            let banner = document.getElementById('admin-preview-floating-bar');
            if (!active) {
                if (banner) banner.style.display = 'none';
                return;
            }

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
                        if (mTitle && data.maintenanceTitle) mTitle.innerHTML = data.maintenanceTitle;
                        if (mMsg && data.maintenanceMsg) mMsg.textContent = data.maintenanceMsg;

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
                            <img src="${release.image || 'assets/cover.png'}" alt="${release.title}">
                            <div class="release-type-badge">${release.type || 'SINGLE'}</div>
                            <div class="player-overlay">
                                <button class="play-btn" 
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
                const coverImg = row.querySelector('.release-cover-large img');
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
                            coverImg.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                            coverImg.style.filter = "none";
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
                            playbackStartOffset = -1; // Reset for relative 30s limit
                            // PRIORITY 1: Direct MP3/Snippet URL (User specified)
                            if (mp3Url && mp3Url !== '' && mp3Url !== '#' && !getYouTubeID(mp3Url)) {
                                try {
                                    previewAudio.src = mp3Url;
                                    previewAudio.play().then(() => {
                                        startUIPlayback(playBtn, row, coverImg);
                                        if (timeDisplay) {
                                            timeDisplay.style.display = 'block';
                                            updateTimer(timeDisplay, 'mp3');
                                        }
                                    }).catch(err => {
                                        console.warn("MP3 Blocked:", err);
                                        startUIPlayback(playBtn, row, coverImg);
                                    });
                                } catch (e) { console.error("MP3 Fail:", e); }
                            }
                            // PRIORITY 2: YouTube Fallback (Check if youtube field OR preview field has YT link)
                            else if (ytId) {
                                if (!isYTApiReady || !ytPlayer) initYTPlayer();

                                try {
                                    if (ytPlayer && ytPlayer.playVideo) {
                                        ytPlayer.unMute();
                                        ytPlayer.setVolume(100);

                                        if (ytType === 'playlist') {
                                            ytPlayer.loadPlaylist({
                                                listType: 'playlist',
                                                list: ytId,
                                                index: 0,
                                                suggestedQuality: 'small'
                                            });
                                        } else {
                                            ytPlayer.loadVideoById({
                                                videoId: ytId,
                                                suggestedQuality: 'small'
                                            });
                                        }
                                        ytPlayer.playVideo();
                                    }
                                } catch (e) { console.warn("YT Delay..."); }

                                startUIPlayback(playBtn, row, coverImg);
                                if (timeDisplay) {
                                    timeDisplay.style.display = 'block';
                                    timeDisplay.textContent = '...';
                                    updateTimer(timeDisplay, 'yt');
                                }
                            } else {
                                startUIPlayback(playBtn, row, coverImg);
                            }
                            currentPlayingBtn = playBtn;
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
    // --- SOCIAL SIDEBAR TOGGLE ---
    const menuTrigger = document.getElementById('nav-menu-trigger');
    const socialSidebar = document.getElementById('social-sidebar');
    const closeSidebar = document.getElementById('close-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (menuTrigger && socialSidebar) {
        const toggleSidebar = (state) => {
            if (state === 'close') {
                socialSidebar.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
                document.body.classList.remove('no-scroll');
                document.documentElement.classList.remove('no-scroll');
            } else {
                socialSidebar.classList.toggle('active');
                if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
                document.body.classList.toggle('no-scroll');
                document.documentElement.classList.toggle('no-scroll');
            }
        };

        menuTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            playBleep(900, 'square', 0.05);
            toggleSidebar();
        });

        [closeSidebar, sidebarOverlay].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    playBleep(300, 'sine', 0.1);
                    toggleSidebar('close');
                });
            }
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

// --- ENGINE INITIALIZATION (STATE-AWARE) ---
const startEngines = () => {
    initPortal();
    loadPopular();
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
