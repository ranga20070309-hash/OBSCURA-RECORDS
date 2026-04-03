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

document.addEventListener('DOMContentLoaded', () => {

    const ignitionBtn = document.getElementById('grant-access');
    const entranceScreen = document.getElementById('entrance-screen');
    const mainSite = document.getElementById('main-site');
    const statusMsg = document.querySelector('.status-msg');
    const cursor = document.querySelector('.cursor-outer');
    const cursorGlow = document.querySelector('.cursor-glow');


    // --- CUSTOM CURSOR ---
    document.addEventListener('mousemove', (e) => {
        gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.1 });
        gsap.to(cursorGlow, { x: e.clientX, y: e.clientY, duration: 0.6 });
    });

    // --- THE IGNITION SEQUENCE ---
    ignitionBtn.addEventListener('click', () => {
        const tl = gsap.timeline();

        // 1. Initiation Phase
        tl.to(statusMsg, { duration: 0.2, textContent: "INITIALIZING CORE...", color: "#fff" });
        tl.to(".core-ring.outer", { duration: 0.5, rotation: "+=360", scale: 0.8, ease: "power2.in" });
        tl.to(".core-ring.middle", { duration: 0.5, rotation: "-=360", scale: 1.2, ease: "power2.in" }, "-=0.5");
        
        // 2. Critical Mass Phase
        tl.to(entranceScreen, { duration: 0.1, backgroundColor: "#fff", opacity: 0.8, repeat: 5, yoyo: true });
        tl.to(ignitionBtn, { duration: 0.2, scale: 0, opacity: 0 });
        
        // 3. Supernova Blast
        tl.to(entranceScreen, {
            duration: 1.5,
            scale: 5,
            filter: "brightness(5) blur(100px)",
            opacity: 0,
            ease: "expo.inOut",
            onStart: () => {
                gsap.set(mainSite, { visibility: 'visible', opacity: 1 });
            }
        });

        tl.set(entranceScreen, { display: 'none' });

        // 4. Materialization Phase (Main Site)
        
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
    });

    // --- 3D TILT EFFECT ---
    const tiltContainers = document.querySelectorAll('.glass, .release-card, .social-card');
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
                    const status = (data.status || 'offline').toLowerCase();
                    statusIndicator.textContent = status.toUpperCase();
                    statusIndicator.className = `status-indicator ${status}`;
                    
                    if (data.avatar_url) {
                        avatar.style.backgroundImage = `url(${data.avatar_url})`;
                        avatar.style.backgroundSize = 'cover';
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

    // Audio Sim
    const playBtn = document.querySelector('.play-btn');
    let isPlaying = false;
    playBtn.addEventListener('click', () => {
        isPlaying = !isPlaying;
        playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        if (isPlaying) {
            gsap.to(playBtn, { scale: 1.2, boxShadow: '0 0 40px #00f0ff', repeat: -1, yoyo: true, duration: 0.5 });
            gsap.to('.release-cover img', { scale: 1.1, duration: 10, ease: "linear", repeat: -1 });
        } else {
            gsap.killTweensOf([playBtn, '.release-cover img']);
            gsap.to(playBtn, { scale: 1, boxShadow: '0 0 20px #00f0ff' });
        }
    });
});
