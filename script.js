/* 
    OBSCURA RECORDS | THE IGNITION SEQUENCE (OS v2.0.6)
*/

// Force scroll to top on reload (Robust method)
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

window.onload = () => {
    window.scrollTo(0, 0);
};

// --- YouTube Background Audio Controller (Global Scope for Callback Security) ---
let ytPlayer = null;
let isYTApiReady = false;
let currentPlayingBtn = null;
let audioTimer = null;
let previewAudio = new Audio();

window.onYouTubeIframeAPIReady = function() {
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
    } catch(e) { console.error("YT Setup Fail:", e); }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        if (currentPlayingBtn) {
            stopPlayback(currentPlayingBtn);
            currentPlayingBtn = null;
        }
    }
}

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
    btn.innerHTML = '<i class="fas fa-pause"></i>';
    row.classList.add('active-track');
    gsap.to(btn, { scale: 1.1, boxShadow: '0 0 20px #00f0ff', repeat: -1, yoyo: true, duration: 0.8 });
    if (img) gsap.to(img, { scale: 1.15, duration: 20, ease: "linear", repeat: -1, yoyo: true });
}

function stopPlayback(btn) {
    if (!btn) return;
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
    if (ytPlayer && ytPlayer.stopVideo) {
        try { ytPlayer.stopVideo(); } catch(e){}
    }
    
    if (timeDisplay) {
        timeDisplay.style.display = 'none';
        if (audioTimer) clearInterval(audioTimer);
    }
}

document.addEventListener('DOMContentLoaded', () => {

    const entranceScreen = document.getElementById('entrance-screen');
    const mainSite = document.getElementById('main-site');
    const cursor = document.querySelector('.cursor-outer');
    const cursorGlow = document.querySelector('.cursor-glow');

    // --- CUSTOM CURSOR LOGIC ---
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

    // --- THE AUTOMATIC SPLASH SEQUENCE (ENARMA STYLE) ---
    const runIgnition = () => {
        if (!entranceScreen || !mainSite) return;
        const tl = gsap.timeline();

        // 1. Black Initial Pause
        tl.to({}, { duration: 0.8 }); 

        // 2. High-End Sharp Cinematic Reveal
        tl.fromTo(".splash-logo", 
            { 
                opacity: 0, 
                scale: 1.05,
                filter: "brightness(0) blur(4px)", 
            }, 
            { 
                duration: 2.8, 
                opacity: 1, 
                scale: 1, 
                filter: "brightness(1) blur(0px)", 
                ease: "power3.out", // Sharp but smooth transition
                onStart: () => {
                    const logo = document.querySelector('.splash-logo');
                    if (logo) logo.style.animation = "splashPulse 4s ease-in-out infinite";
                }
            }
        );

        // 3. Pause for Brand Impact
        tl.to({}, { duration: 1.5 });

        // 4. Choreographed Pure White Glitch Sequence (No Colors)
        const glitchDisp = document.getElementById('glitch-disp');
        const glitchTurb = document.getElementById('glitch-turbulence');

        // Set initial filter state (Using only displacement, no channel offsets)
        tl.set(".splash-logo", { filter: "url(#glitch-filter)" });

        // Step-by-step glitch "impacts" (Consistent, Pure White Pattern)
        const addGlitchStep = (scale, clipInset, dx = 0) => {
            tl.to(".splash-logo", {
                duration: 0.05,
                x: dx,
                skewX: dx * 0.8,
                onUpdate: () => {
                    if (glitchDisp) glitchDisp.setAttribute('scale', scale);
                    const logo = document.querySelector('.splash-logo');
                    if (logo) logo.style.clipPath = clipInset;
                }
            });
        };

        // Unique Choreographed Sequence (Plays the same every time - No Colors)
        addGlitchStep(40, "inset(12% 0 75% 0)", 10);
        addGlitchStep(60, "inset(45% 0 25% 0)", -15);
        addGlitchStep(0, "none", 0); // Brief snap back
        tl.to({}, { duration: 0.06 });
        addGlitchStep(100, "inset(75% 0 5% 0)", 25);
        addGlitchStep(30, "inset(15% 0 65% 0)", -8);
        addGlitchStep(120, "none", 0); // Heavy displacement
        addGlitchStep(10, "none", 4);
        
        // Final "Patta" Critical Error Impact
        tl.to(".splash-logo", {
            duration: 0.12,
            x: 40,
            skewX: 50,
            filter: "url(#glitch-filter) brightness(8)", // Intense white flare
            onUpdate: () => {
                if (glitchDisp) glitchDisp.setAttribute('scale', 180);
                if (glitchTurb) glitchTurb.setAttribute('baseFrequency', "0.15 0.02");
                const logo = document.querySelector('.splash-logo');
                if (logo) logo.style.clipPath = "inset(50% 0 45% 0)";
            }
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
            duration: 1.8,
            opacity: 0,
            filter: "blur(60px)",
            ease: "expo.inOut",
            onStart: () => {
                gsap.set(mainSite, { visibility: 'visible', opacity: 1 });
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

    runIgnition();

    // --- MODAL SYSTEM (FAQ & PRIVACY) ---
    const setupModal = (triggerId, modalId) => {
        const trigger = document.getElementById(triggerId);
        const modal = document.getElementById(modalId);
        if (!trigger || !modal) return;

        const closeBtn = modal.querySelector('.close-modal');
        const overlay = modal.querySelector('.modal-overlay');

        trigger.addEventListener('click', () => {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        [closeBtn, overlay].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    modal.classList.remove('active');
                    document.body.style.overflow = 'auto';
                });
            }
        });
    };

    setupModal('open-faq', 'faq-modal');
    setupModal('open-privacy', 'privacy-modal');
    setupModal('open-demo', 'demo-modal');
    setupModal('open-contact', 'contact-modal');

    // --- FAQ ACCORDION (DYNAMIC) ---
    window.bindAccordionListeners = function(containerId) {
        const container = document.getElementById(containerId);
        if(!container) return;
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

    // --- 3D TILT EFFECT ---
    const tiltContainers = document.querySelectorAll('.glass, .release-card, .social-card, .faq-item');
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
        apiKey: "AI8SjFSqSJ6DYAcBJrNGN76hEhcij5vtyJK5G819CvV7Fm",
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
        console.log("Firebase initialized successfully targeting Realtime Database.");

        const staffItems = document.querySelectorAll('.artist-item[data-discord-id]');
        console.log(`Found ${staffItems.length} staff members to sync.`);

        staffItems.forEach(item => {
            const discordId = item.getAttribute('data-discord-id');
            const nameLabel = item.querySelector('h4').textContent;
            const statusIndicator = item.querySelector('.status-indicator');
            const avatar = item.querySelector('.artist-img');

            // Listen for Real-Time updates
            const staffRef = db.ref('staff_status/' + discordId);
            staffRef.on('value', (snapshot) => {
                const data = snapshot.val();
                console.log(`Syncing update for ${nameLabel} (${discordId}):`, data);
                
                if (data) {
                    // --- Update Name (Live) ---
                    if (data.name) {
                        item.querySelector('h4').textContent = data.name;
                    }

                    const status = (data.status || 'offline').toLowerCase();
                    statusIndicator.textContent = status.toUpperCase();
                    statusIndicator.className = `status-indicator ${status}`;
                    
                    if (data.avatar_url) {
                        avatar.style.backgroundImage = `url(${data.avatar_url})`;
                        avatar.style.backgroundSize = 'cover';
                    }

                    // --- Discord Avatar Decoration (Frame) ---
                    const decoration = item.querySelector('.avatar-decoration');
                    if (data.decoration_url && data.decoration_url !== "") {
                        decoration.src = data.decoration_url;
                        decoration.style.display = 'block';
                    } else {
                        decoration.style.display = 'none';
                    }
                } else {
                    console.warn(`No status data found for ${nameLabel}`);
                    statusIndicator.textContent = "OFFLINE";
                    statusIndicator.className = "status-indicator offline";
                }
            }, (error) => {
                console.error(`Firebase Sync Error for ${nameLabel}:`, error);
            });
        });
    } else {
        console.error("Firebase SDK not loaded! Check index.html scripts.");
    }

    // --- FIREBASE DYNAMIC SITE DATA (GLOBALS & RELEASES) ---
    if (typeof firebase !== 'undefined') {
        const db = firebase.database();

        // 1. Sync Globals (Text Elements & Links)
        db.ref('siteData/globals').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const elements = document.querySelectorAll('[data-sync]');
                elements.forEach(el => {
                    const key = el.getAttribute('data-sync');
                    const syncTarget = el.getAttribute('data-sync-target') || 'html';
                    
                    if (data[key] !== undefined) {
                        if (syncTarget === 'html') {
                            el.innerHTML = data[key];
                        } else if (syncTarget === 'text') {
                            el.textContent = data[key];
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
                            <span class="track-id">${cleanId} ${badge}</span>
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
                                } catch(e) { console.error("MP3 Fail:", e); }
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
                                } catch(e) { console.warn("YT Delay..."); }

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
                    if (type === 'yt' && ytPlayer && ytPlayer.getDuration) {
                        duration = ytPlayer.getDuration();
                        current = ytPlayer.getCurrentTime();
                    } else if (type === 'mp3') {
                        duration = previewAudio.duration;
                        current = previewAudio.currentTime;
                    }

                    const remaining = duration - current;
                    if (!isNaN(remaining) && remaining > 0 && duration > 0) {
                        const mins = Math.floor(remaining / 60);
                        const secs = Math.floor(remaining % 60);
                        display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                        
                        if (remaining <= 0.3) {
                            stopPlayback(currentPlayingBtn);
                            currentPlayingBtn = null;
                        }
                    } else {
                        display.textContent = "...";
                    }
                } catch(e) {}
            }, 500);
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
            // Firebase returns null when the array/node is completely empty
            if (!data) {
                data = [];
            }
            
            if (Array.isArray(data)) {
                if (data[0] && data[0]._isEmpty) {
                    renderReleases([]);
                } else {
                    renderReleases(data);
                }
            }
        });
    }
    // --- SOCIAL MENU TOGGLE ---
    const menuTrigger = document.getElementById('nav-menu-trigger');
    const socialPanel = document.getElementById('social-panel');

    if (menuTrigger && socialPanel) {
        menuTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            socialPanel.classList.toggle('active');
        });

        // Close menu when clicking anywhere else
        window.addEventListener('click', (e) => {
            if (socialPanel.classList.contains('active')) {
                socialPanel.classList.remove('active');
            }
        });
        
        // Prevent panel from closing when clicking inside it
        socialPanel.addEventListener('click', (e) => {
            e.stopPropagation();
        });
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
                this.x = Math.random() * pCanvas.width;
                this.y = Math.random() * pCanvas.height;
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
                    if (this.y > pCanvas.height) this.y = -10;
                }
            }
            draw() {
                pCtx.fillStyle = `rgba(0, 240, 255, ${this.opacity})`;
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
                this.x = Math.random() * pCanvas.width;
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
            pCanvas.width = window.innerWidth;
            pCanvas.height = window.innerHeight;
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Stardust());
            }
        }

        function pAnimate() {
            pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
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
    }
});
