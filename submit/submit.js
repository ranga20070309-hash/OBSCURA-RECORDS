document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('submissionForm');
    const submitBtn = document.getElementById('submitBtn');
    const clearFormBtn = document.getElementById('clearFormBtn');
    const addCollabBtn = document.getElementById('addCollabBtn');
    const collaboratorsList = document.getElementById('collaboratorsList');
    const noCollabsMsg = document.getElementById('noCollabsMsg');
    const confirmationCard = document.getElementById('confirmationCard');
    const displaySubId = document.getElementById('displaySubId');
    const submitAnotherLink = document.getElementById('submitAnotherLink');
    const releaseDateInput = document.getElementById('releaseDate');

    // Code Verification Elements
    const acceptanceCodeInput = document.getElementById('acceptanceCode');
    const codeCheckingSpinner = document.getElementById('codeCheckingSpinner');
    const verifiedCodeCard = document.getElementById('verifiedCodeCard');
    const verifiedArtist = document.getElementById('verifiedArtist');
    const verifiedRealName = document.getElementById('verifiedRealName');
    const verifiedDate = document.getElementById('verifiedDate');
    const codeErrorBox = document.getElementById('codeErrorBox');
    const codeUsedBox = document.getElementById('codeUsedBox');

    // Interactive Liquid & Rain Elements
    const waterCanvas = document.getElementById('waterCanvas');
    const waterCtx = waterCanvas ? waterCanvas.getContext('2d') : null;
    const waterProgressPercent = document.getElementById('waterProgressPercent');
    const rainCanvas = document.getElementById('rainCanvas');

    const FIREBASE_DB_URL = "https://submission-code-and-mail-sys-default-rtdb.asia-southeast1.firebasedatabase.app";

    let isCodeValid = false;
    let verifiedCodeData = null;
    let codeCheckTimeout = null;
    // Client-side cache to eliminate redundant Firebase read requests
    const verificationCache = {};

    // Restrict release date to minimum 4 days in advance
    let minReleaseDateStr = '';
    if (releaseDateInput) {
        const minDateObj = new Date();
        minDateObj.setDate(minDateObj.getDate() + 4);
        const yyyy = minDateObj.getFullYear();
        const mm = String(minDateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(minDateObj.getDate()).padStart(2, '0');
        minReleaseDateStr = `${yyyy}-${mm}-${dd}`;
        releaseDateInput.min = minReleaseDateStr;
    }

    // =========================================================================
    // SUPER REALISTIC LIQUID SIMULATION & HARMONIC FLUID DYNAMICS (60 FPS)
    // =========================================================================
    let targetWaterPct = 22; // Baseline starting depth: 22% (clearly visible immediately)
    let currentWaterPct = 22;
    let waterSpringVelocity = 0;
    let fluidTime = 0;
    let isWaterDraining = false;

    // 3D Refractive Micro-bubble particle system
    let fluidBubbles = [];
    const BUBBLE_COUNT = 45;

    // Surface ripple pop rings for bursting bubbles
    let popRings = [];

    function resizeWaterCanvas() {
        if (!waterCanvas) return;
        waterCanvas.width = window.innerWidth;
        waterCanvas.height = window.innerHeight;
    }

    function initFluidBubbles() {
        fluidBubbles = [];
        const w = waterCanvas ? waterCanvas.width : window.innerWidth;
        const h = waterCanvas ? waterCanvas.height : window.innerHeight;
        for (let i = 0; i < BUBBLE_COUNT; i++) {
            fluidBubbles.push({
                x: Math.random() * w,
                y: h - Math.random() * (h * 0.7),
                radius: 1.2 + Math.random() * 3.8,
                speedY: 0.7 + Math.random() * 1.5,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.018 + Math.random() * 0.03,
                wobbleAmp: 0.7 + Math.random() * 1.4,
                opacity: 0.25 + Math.random() * 0.55
            });
        }
    }

    // Render harmonic wave curve path across canvas width
    function drawWavePath(ctx, W, baseY, amp1, freq1, amp2, freq2, amp3, freq3, phase, time) {
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        const step = 5;
        for (let x = 0; x <= W; x += step) {
            const y = baseY 
                + Math.sin(x * freq1 + time * 1.6 + phase) * amp1
                + Math.cos(x * freq2 - time * 1.1 + phase * 1.4) * amp2
                + Math.sin(x * freq3 + time * 0.7 + phase * 0.7) * amp3;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(W, waterCanvas.height);
        ctx.lineTo(0, waterCanvas.height);
        ctx.closePath();
    }

    function renderFluidFrame() {
        if (!waterCanvas || !waterCtx) return;

        const W = waterCanvas.width;
        const H = waterCanvas.height;
        waterCtx.clearRect(0, 0, W, H);

        fluidTime += 0.022;

        // --- 1. Damped Spring Physics for Liquid Level Movement ---
        if (isWaterDraining) {
            currentWaterPct += (0 - currentWaterPct) * 0.055;
            if (currentWaterPct < 0.1) currentWaterPct = 0;
        } else {
            const diff = targetWaterPct - currentWaterPct;
            waterSpringVelocity += diff * 0.035;
            waterSpringVelocity *= 0.85; // Damping
            currentWaterPct += waterSpringVelocity;
        }

        // Update floating badge percentage text
        if (waterProgressPercent) {
            waterProgressPercent.textContent = `${Math.max(0, Math.round(currentWaterPct))}%`;
        }

        // If completely drained, keep loop alive but skip drawing fluid
        if (currentWaterPct <= 0.2) {
            requestAnimationFrame(renderFluidFrame);
            return;
        }

        const isRed = document.body.classList.contains('theme-alert-red');
        const fluidHeight = (currentWaterPct / 100) * H;
        const baseY = H - fluidHeight;

        // --- 2. Layer A: Deep Oceanic Background Wave ---
        const bgGrad = waterCtx.createLinearGradient(0, baseY - 20, 0, H);
        if (!isRed) {
            bgGrad.addColorStop(0, 'rgba(0, 110, 160, 0.16)');
            bgGrad.addColorStop(0.35, 'rgba(0, 70, 130, 0.22)');
            bgGrad.addColorStop(1, 'rgba(2, 6, 16, 0.90)');
        } else {
            bgGrad.addColorStop(0, 'rgba(180, 20, 50, 0.20)');
            bgGrad.addColorStop(0.35, 'rgba(130, 12, 45, 0.26)');
            bgGrad.addColorStop(1, 'rgba(18, 2, 8, 0.92)');
        }

        drawWavePath(waterCtx, W, baseY + 6, 16, 0.0045, 10, 0.009, 5, 0.018, 0, fluidTime);
        waterCtx.fillStyle = bgGrad;
        waterCtx.fill();

        // --- 3. Layer B: Volumetric Underwater Caustic Light Rays (God Rays) ---
        waterCtx.save();
        const rayCount = 6;
        for (let r = 0; r < rayCount; r++) {
            const rayOffset = (r / rayCount) * W;
            const rayOsc = Math.sin(fluidTime * 0.85 + r * 1.4);
            const startX = rayOffset + rayOsc * 35;
            const endX = startX + 75 + rayOsc * 50;
            const rayAlpha = 0.012 + 0.010 * Math.sin(fluidTime * 1.2 + r * 2.1);

            const rayGrad = waterCtx.createLinearGradient(startX, baseY, endX, H);
            if (!isRed) {
                rayGrad.addColorStop(0, `rgba(0, 220, 240, ${rayAlpha * 1.2})`);
                rayGrad.addColorStop(0.55, `rgba(0, 150, 210, ${rayAlpha * 0.7})`);
                rayGrad.addColorStop(1, 'transparent');
            } else {
                rayGrad.addColorStop(0, `rgba(240, 50, 80, ${rayAlpha * 1.2})`);
                rayGrad.addColorStop(0.55, `rgba(190, 20, 55, ${rayAlpha * 0.7})`);
                rayGrad.addColorStop(1, 'transparent');
            }

            waterCtx.beginPath();
            waterCtx.moveTo(startX, baseY + 3);
            waterCtx.lineTo(startX + 32, baseY + 3);
            waterCtx.lineTo(endX + 70, H);
            waterCtx.lineTo(endX - 25, H);
            waterCtx.closePath();
            waterCtx.fillStyle = rayGrad;
            waterCtx.fill();
        }
        waterCtx.restore();

        // --- 4. Layer C: Mid-Liquid Body Wave ---
        const midGrad = waterCtx.createLinearGradient(0, baseY, 0, H);
        if (!isRed) {
            midGrad.addColorStop(0, 'rgba(0, 140, 190, 0.18)');
            midGrad.addColorStop(0.45, 'rgba(0, 85, 145, 0.24)');
            midGrad.addColorStop(1, 'rgba(1, 8, 20, 0.92)');
        } else {
            midGrad.addColorStop(0, 'rgba(190, 30, 60, 0.22)');
            midGrad.addColorStop(0.45, 'rgba(140, 14, 45, 0.28)');
            midGrad.addColorStop(1, 'rgba(20, 3, 8, 0.94)');
        }

        drawWavePath(waterCtx, W, baseY + 2, 12, 0.0065, 8, 0.013, 4, 0.026, 2.1, fluidTime);
        waterCtx.fillStyle = midGrad;
        waterCtx.fill();

        // --- 5. Layer D: Foreground Fluid Surface Wave ---
        const fgGrad = waterCtx.createLinearGradient(0, baseY - 5, 0, H);
        if (!isRed) {
            fgGrad.addColorStop(0, 'rgba(0, 160, 210, 0.22)');
            fgGrad.addColorStop(0.3, 'rgba(0, 110, 170, 0.18)');
            fgGrad.addColorStop(1, 'rgba(1, 6, 16, 0.88)');
        } else {
            fgGrad.addColorStop(0, 'rgba(210, 40, 70, 0.26)');
            fgGrad.addColorStop(0.3, 'rgba(160, 20, 50, 0.20)');
            fgGrad.addColorStop(1, 'rgba(16, 2, 7, 0.90)');
        }

        drawWavePath(waterCtx, W, baseY, 8, 0.0085, 5, 0.017, 3, 0.034, 4.3, fluidTime);
        waterCtx.fillStyle = fgGrad;
        waterCtx.fill();

        // --- 6. Layer E: Specular Surface Crest Line (Glistening Caustic Waterline) ---
        waterCtx.beginPath();
        const lineStep = 4;
        for (let x = 0; x <= W; x += lineStep) {
            const y = baseY 
                + Math.sin(x * 0.0085 + fluidTime * 1.6 + 4.3) * 8
                + Math.cos(x * 0.017 - fluidTime * 1.1 + 4.3 * 1.4) * 5
                + Math.sin(x * 0.034 + fluidTime * 0.7 + 4.3 * 0.7) * 3;
            if (x === 0) waterCtx.moveTo(x, y);
            else waterCtx.lineTo(x, y);
        }

        waterCtx.save();
        waterCtx.lineWidth = 1.6;
        if (!isRed) {
            waterCtx.strokeStyle = 'rgba(0, 200, 235, 0.55)';
            waterCtx.shadowColor = 'rgba(0, 180, 220, 0.40)';
            waterCtx.shadowBlur = 6;
        } else {
            waterCtx.strokeStyle = 'rgba(230, 60, 90, 0.60)';
            waterCtx.shadowColor = 'rgba(220, 30, 60, 0.45)';
            waterCtx.shadowBlur = 6;
        }
        waterCtx.stroke();
        waterCtx.restore();

        // --- 7. Layer F: Specular Sparkle Glints Traveling on Wave Crest ---
        const glintCount = 7;
        for (let g = 0; g < glintCount; g++) {
            const gx = ((g + 0.5) / glintCount) * W + Math.sin(fluidTime * 0.9 + g * 2) * 45;
            const gy = baseY 
                + Math.sin(gx * 0.0085 + fluidTime * 1.6 + 4.3) * 8
                + Math.cos(gx * 0.017 - fluidTime * 1.1 + 4.3 * 1.4) * 5
                + Math.sin(gx * 0.034 + fluidTime * 0.7 + 4.3 * 0.7) * 3;
            const glintAlpha = Math.max(0, Math.sin(fluidTime * 2.5 + g * 1.8));
            if (glintAlpha > 0.15) {
                waterCtx.save();
                waterCtx.beginPath();
                waterCtx.arc(gx, gy, 1.2 + glintAlpha * 1.0, 0, Math.PI * 2);
                waterCtx.fillStyle = isRed ? `rgba(255, 180, 200, ${glintAlpha * 0.5})` : `rgba(200, 245, 255, ${glintAlpha * 0.5})`;
                waterCtx.shadowColor = isRed ? 'rgba(255, 51, 85, 0.5)' : 'rgba(0, 240, 255, 0.5)';
                waterCtx.shadowBlur = 6;
                waterCtx.fill();
                waterCtx.restore();
            }
        }

        // --- 8. Layer G: Surface Burst Ripple Rings ---
        for (let i = popRings.length - 1; i >= 0; i--) {
            const pr = popRings[i];
            pr.radius += 0.45;
            pr.opacity -= 0.024;
            if (pr.opacity <= 0 || pr.radius >= pr.maxRadius) {
                popRings.splice(i, 1);
                continue;
            }
            waterCtx.beginPath();
            waterCtx.ellipse(pr.x, pr.y, pr.radius * 2, pr.radius * 0.65, 0, 0, Math.PI * 2);
            waterCtx.strokeStyle = isRed 
                ? `rgba(255, 120, 150, ${pr.opacity * 0.65})` 
                : `rgba(180, 240, 255, ${pr.opacity * 0.65})`;
            waterCtx.lineWidth = 1.1;
            waterCtx.stroke();
        }

        // --- 9. Layer H: Rising 3D Spherical Micro-Bubbles with Refraction ---
        for (let i = 0; i < fluidBubbles.length; i++) {
            const b = fluidBubbles[i];
            b.wobble += b.wobbleSpeed;
            b.x += Math.sin(b.wobble) * b.wobbleAmp;
            b.y -= b.speedY;

            // When bubble reaches the water surface, burst into ripple ring
            if (b.y <= baseY) {
                if (Math.random() < 0.6) {
                    popRings.push({
                        x: b.x,
                        y: baseY,
                        radius: 1.5,
                        maxRadius: 8 + Math.random() * 8,
                        opacity: 0.45
                    });
                }
                b.y = H + 8 + Math.random() * 25;
                b.x = Math.random() * W;
            }

            // Only draw if submerged
            if (b.y > baseY) {
                waterCtx.beginPath();
                waterCtx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);

                const bGrad = waterCtx.createRadialGradient(
                    b.x - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.08,
                    b.x, b.y, b.radius
                );
                if (!isRed) {
                    bGrad.addColorStop(0, `rgba(255, 255, 255, ${b.opacity * 0.8})`);
                    bGrad.addColorStop(0.35, `rgba(160, 220, 240, ${b.opacity * 0.45})`);
                    bGrad.addColorStop(1, `rgba(0, 140, 200, ${b.opacity * 0.08})`);
                } else {
                    bGrad.addColorStop(0, `rgba(255, 255, 255, ${b.opacity * 0.8})`);
                    bGrad.addColorStop(0.35, `rgba(240, 150, 175, ${b.opacity * 0.45})`);
                    bGrad.addColorStop(1, `rgba(180, 20, 50, ${b.opacity * 0.08})`);
                }
                waterCtx.fillStyle = bGrad;
                waterCtx.fill();
            }
        }

        // --- 10. Layer I: Full Submersion Ambient Wash (When 100% Filled) ---
        if (currentWaterPct >= 96) {
            const submersionAlpha = Math.min(0.08, ((currentWaterPct - 96) / 4) * 0.08);
            waterCtx.fillStyle = isRed ? `rgba(180, 20, 50, ${submersionAlpha})` : `rgba(0, 130, 180, ${submersionAlpha})`;
            waterCtx.fillRect(0, 0, W, H);
        }

        requestAnimationFrame(renderFluidFrame);
    }

    resizeWaterCanvas();
    initFluidBubbles();
    renderFluidFrame();

    function updateWaterLevel(draining = false) {
        if (draining) {
            isWaterDraining = true;
            return;
        }
        isWaterDraining = false;

        const requiredChecks = [
            isCodeValid,
            (document.getElementById('realName')?.value || '').trim().length > 1,
            (document.getElementById('mainArtist')?.value || '').trim().length > 1,
            (document.getElementById('email')?.value || '').trim().includes('@'),
            (document.getElementById('city')?.value || '').trim().length > 1,
            (document.getElementById('country')?.value || '').trim().length > 1,
            (document.getElementById('songTitle')?.value || '').trim().length > 1,
            (document.getElementById('genre')?.value || '').trim().length > 1,
            (document.getElementById('language')?.value || '').trim() !== '',
            (document.getElementById('mainArtistSpotify')?.value || '').trim().length > 4,
            (document.getElementById('releaseDate')?.value || '') >= (minReleaseDateStr || '1970-01-01'),
            (document.getElementById('driveLink')?.value || '').trim().length > 8
        ];

        let passedCount = 0;
        requiredChecks.forEach(p => { if (p) passedCount++; });

        const bonusChecks = [
            (document.getElementById('mainArtistApple')?.value || '').trim().length > 4,
            (collaboratorsList?.querySelectorAll('.collaborator-box').length || 0) > 0,
            (document.getElementById('notes')?.value || '').trim().length > 2
        ];
        let bonusCount = 0;
        bonusChecks.forEach(b => { if (b) bonusCount++; });

        // Form questions fill water progressively up to 90%
        // Base hydration is 20% on load; questions add up to 70% (20% + 70% = 90%)
        const questionsProgress = (passedCount / requiredChecks.length) * 70;
        const formQuestionsPct = 20 + questionsProgress; // 20% -> 90%

        // The final confirmation tick provides the remaining 10% hydration!
        const confirmBox = document.getElementById('confirmAccuracyCheckbox');
        const isConfirmed = confirmBox && confirmBox.checked;
        const confirmBonus = isConfirmed ? 10 : 0;

        // If all questions are passed (90%) AND the user checked the tick (+10%), it reaches full 100%!
        let calculatedPct = formQuestionsPct + confirmBonus;
        if (passedCount === requiredChecks.length && isConfirmed) {
            calculatedPct = 100;
        }

        targetWaterPct = Math.min(100, Math.round(calculatedPct));
    }

    // Initial baseline water level
    updateWaterLevel();

    // =========================================================================
    // ATMOSPHERIC REALISTIC RAIN SYSTEM (3D PARALLAX & IMPACT SPLASHES)
    // =========================================================================
    let rainAnimationId = null;
    let rainDrops = [];
    let rainSplashes = [];

    class RealisticRainDrop {
        constructor(W, H) {
            this.reset(W, H, true);
        }
        reset(W, H, randomY = false) {
            this.layer = Math.random(); // 0 to 1 for depth
            this.x = Math.random() * (W + 120) - 60;
            this.y = randomY ? Math.random() * H : -30 - Math.random() * 50;

            if (this.layer < 0.4) {
                // Background drops (distant, faint, slower)
                this.speed = 14 + Math.random() * 6;
                this.length = 12 + Math.random() * 10;
                this.opacity = 0.12 + Math.random() * 0.2;
                this.width = 1.0;
            } else if (this.layer < 0.8) {
                // Midground drops
                this.speed = 20 + Math.random() * 8;
                this.length = 18 + Math.random() * 16;
                this.opacity = 0.25 + Math.random() * 0.25;
                this.width = 1.4;
            } else {
                // Foreground drops (fast, long, crisp)
                this.speed = 28 + Math.random() * 10;
                this.length = 26 + Math.random() * 22;
                this.opacity = 0.45 + Math.random() * 0.4;
                this.width = 1.8;
            }
            this.driftX = 1.6 + Math.random() * 0.8; // Wind sway
        }
        update(W, H) {
            this.y += this.speed;
            this.x += this.driftX;

            // Ground collision triggers splash
            if (this.y >= H - 12) {
                if (Math.random() < 0.45) {
                    rainSplashes.push({
                        x: this.x,
                        y: H - 8 - Math.random() * 10,
                        radiusX: 2,
                        radiusY: 0.8,
                        maxRadius: 6 + Math.random() * 10,
                        alpha: 0.75,
                        decay: 0.04 + Math.random() * 0.03
                    });
                }
                this.reset(W, H, false);
            }
        }
        draw(ctx, isRed) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.driftX * 1.5, this.y + this.length);
            ctx.strokeStyle = isRed
                ? `rgba(255, 75, 105, ${this.opacity})`
                : `rgba(180, 240, 255, ${this.opacity})`;
            ctx.lineWidth = this.width;
            ctx.stroke();
        }
    }

    function startRain() {
        if (!rainCanvas) return;
        const rainCtx = rainCanvas.getContext('2d');
        if (!rainCtx) return;

        rainCanvas.width = window.innerWidth;
        rainCanvas.height = window.innerHeight;
        rainCanvas.classList.add('active');

        rainDrops = [];
        rainSplashes = [];
        const count = 180;
        for (let i = 0; i < count; i++) {
            rainDrops.push(new RealisticRainDrop(rainCanvas.width, rainCanvas.height));
        }

        function animateRainLoop() {
            rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
            const isRed = document.body.classList.contains('theme-alert-red');
            const W = rainCanvas.width;
            const H = rainCanvas.height;

            // Draw raindrops
            for (let i = 0; i < rainDrops.length; i++) {
                rainDrops[i].update(W, H);
                rainDrops[i].draw(rainCtx, isRed);
            }

            // Draw splash ripples at ground
            for (let i = rainSplashes.length - 1; i >= 0; i--) {
                const s = rainSplashes[i];
                s.radiusX += 1.1;
                s.radiusY += 0.45;
                s.alpha -= s.decay;

                if (s.alpha <= 0) {
                    rainSplashes.splice(i, 1);
                    continue;
                }

                rainCtx.beginPath();
                rainCtx.ellipse(s.x, s.y, s.radiusX, s.radiusY, 0, 0, Math.PI * 2);
                rainCtx.strokeStyle = isRed
                    ? `rgba(255, 90, 120, ${s.alpha * 0.5})`
                    : `rgba(160, 235, 255, ${s.alpha * 0.6})`;
                rainCtx.lineWidth = 1.2;
                rainCtx.stroke();
            }

            // Soft ground atmospheric mist
            const mistGrad = rainCtx.createLinearGradient(0, H - 70, 0, H);
            if (!isRed) {
                mistGrad.addColorStop(0, 'transparent');
                mistGrad.addColorStop(1, 'rgba(0, 220, 255, 0.08)');
            } else {
                mistGrad.addColorStop(0, 'transparent');
                mistGrad.addColorStop(1, 'rgba(255, 45, 75, 0.09)');
            }
            rainCtx.fillStyle = mistGrad;
            rainCtx.fillRect(0, H - 70, W, 70);

            rainAnimationId = requestAnimationFrame(animateRainLoop);
        }

        cancelAnimationFrame(rainAnimationId);
        animateRainLoop();
    }

    function stopRain() {
        if (!rainCanvas) return;
        rainCanvas.classList.remove('active');
        cancelAnimationFrame(rainAnimationId);
        const rainCtx = rainCanvas.getContext('2d');
        if (rainCtx) rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
    }

    window.addEventListener('resize', () => {
        resizeWaterCanvas();
        if (rainCanvas && rainCanvas.classList.contains('active')) {
            rainCanvas.width = window.innerWidth;
            rainCanvas.height = window.innerHeight;
        }
    });

    // --- Acceptance Code Real-Time Verification (Heavily Optimized) ---
    async function verifyAcceptanceCode(codeVal) {
        const cleanCode = (codeVal || '').toUpperCase().trim();

        if (!cleanCode) {
            isCodeValid = false;
            verifiedCodeData = null;
            document.body.classList.remove('theme-alert-red');
            verifiedCodeCard.style.display = 'none';
            codeErrorBox.style.display = 'none';
            codeUsedBox.style.display = 'none';
            codeCheckingSpinner.style.display = 'none';
            updateWaterLevel();
            return;
        }

        // Check local memory cache first (0 network calls, 0 Firebase read units consumed)
        if (verificationCache[cleanCode]) {
            handleVerificationResult(verificationCache[cleanCode]);
            return;
        }

        codeCheckingSpinner.style.display = 'inline-block';

        try {
            const url = `${FIREBASE_DB_URL}/accepted_codes/${encodeURIComponent(cleanCode)}.json`;
            const res = await fetch(url);
            const data = await res.json();

            codeCheckingSpinner.style.display = 'none';

            // Store in local cache to prevent re-querying
            verificationCache[cleanCode] = data || { notFound: true };

            handleVerificationResult(verificationCache[cleanCode]);

        } catch (err) {
            console.error('Code verification network error:', err);
            codeCheckingSpinner.style.display = 'none';
            isCodeValid = false;
            document.body.classList.add('theme-alert-red');
            if (codeErrorBox) {
                codeErrorBox.style.display = 'flex';
            }
            updateWaterLevel();
        }
    }

    function handleVerificationResult(data) {
        if (!data || data.notFound) {
            // Code not found in database -> TRIGGER RED ALERT
            isCodeValid = false;
            verifiedCodeData = null;
            document.body.classList.add('theme-alert-red');
            verifiedCodeCard.style.display = 'none';
            codeUsedBox.style.display = 'none';
            if (codeErrorBox) {
                const errSpan = codeErrorBox.querySelector('span');
                if (errSpan) errSpan.textContent = 'This acceptance code is not recognized by the demo accepted list. Please contact our team.';
                codeErrorBox.style.display = 'flex';
            }
            updateWaterLevel();
            return;
        }

        if (data.status === 'used') {
            // Code has already been consumed / expired -> TRIGGER RED ALERT
            isCodeValid = false;
            verifiedCodeData = data;
            document.body.classList.add('theme-alert-red');
            codeErrorBox.style.display = 'none';
            codeUsedBox.style.display = 'none';

            // Show card in USED state (Red / Warning)
            verifiedCodeCard.style.display = 'block';
            verifiedCodeCard.style.borderColor = 'rgba(255, 51, 85, 0.45)';
            verifiedCodeCard.style.background = 'rgba(30, 8, 14, 0.85)';

            const headerIcon = document.getElementById('verifiedHeaderIcon');
            const headerText = document.getElementById('verifiedHeaderText');
            const statusBadge = document.getElementById('verifiedStatusBadge');
            const verifiedNote = document.getElementById('verifiedNote');

            if (headerIcon) {
                headerIcon.className = 'fas fa-times-circle';
                headerIcon.style.color = '#ff3355';
            }
            if (headerText) {
                headerText.textContent = 'Acceptance Code Already Used';
                headerText.style.color = '#ff3355';
            }
            if (statusBadge) {
                statusBadge.className = 'verified-status-badge used';
                statusBadge.textContent = '● Code Already Used';
            }

            verifiedArtist.textContent = data.artistName || 'N/A';
            verifiedRealName.textContent = data.realName || 'N/A';
            verifiedDate.textContent = data.acceptedDate || 'N/A';

            if (verifiedNote) {
                verifiedNote.innerHTML = '<span style="color: #fca5a5; font-weight: 500;">This unique single-use acceptance code has already been redeemed for a release submission and cannot be submitted again. If you believe this is an error, please contact our team.</span>';
            }
            updateWaterLevel();
            return;
        }

        if (data.status === 'active') {
            // Code is valid and active - READY TO USE! Reset from Red Alert to normal theme
            isCodeValid = true;
            verifiedCodeData = data;
            document.body.classList.remove('theme-alert-red');
            codeErrorBox.style.display = 'none';
            codeUsedBox.style.display = 'none';

            // Show card in ACTIVE state (Cyan / Emerald)
            verifiedCodeCard.style.display = 'block';
            verifiedCodeCard.style.borderColor = 'rgba(0, 240, 255, 0.35)';
            verifiedCodeCard.style.background = 'rgba(0, 240, 255, 0.05)';

            const headerIcon = document.getElementById('verifiedHeaderIcon');
            const headerText = document.getElementById('verifiedHeaderText');
            const statusBadge = document.getElementById('verifiedStatusBadge');
            const verifiedNote = document.getElementById('verifiedNote');

            if (headerIcon) {
                headerIcon.className = 'fas fa-check-circle';
                headerIcon.style.color = '#34d399';
            }
            if (headerText) {
                headerText.textContent = 'Acceptance Code Verified';
                headerText.style.color = '#34d399';
            }
            if (statusBadge) {
                statusBadge.className = 'verified-status-badge active';
                statusBadge.textContent = '● Ready to Use';
            }

            verifiedArtist.textContent = data.artistName || 'N/A';
            verifiedRealName.textContent = data.realName || 'N/A';
            verifiedDate.textContent = data.acceptedDate || 'Recently Approved';

            if (verifiedNote) {
                verifiedNote.innerHTML = 'Your demo submission has been verified in the OBSCURA REC LLC approved list. Please complete your track details below.';
            }

            // Automatically pre-fill fields if empty
            const realNameInput = document.getElementById('realName');
            const mainArtistInput = document.getElementById('mainArtist');
            if (realNameInput && !realNameInput.value && data.realName) {
                realNameInput.value = data.realName;
            }
            if (mainArtistInput && !mainArtistInput.value && data.artistName) {
                mainArtistInput.value = data.artistName;
            }
            updateWaterLevel();
        } else {
            isCodeValid = false;
            verifiedCodeData = null;
            document.body.classList.remove('theme-alert-red');
            verifiedCodeCard.style.display = 'none';
            codeUsedBox.style.display = 'none';
            updateWaterLevel();
        }
    }

    if (acceptanceCodeInput) {
        acceptanceCodeInput.addEventListener('input', () => {
            clearTimeout(codeCheckTimeout);
            codeCheckTimeout = setTimeout(() => {
                verifyAcceptanceCode(acceptanceCodeInput.value);
            }, 400);
        });

        acceptanceCodeInput.addEventListener('blur', () => {
            clearTimeout(codeCheckTimeout);
            verifyAcceptanceCode(acceptanceCodeInput.value);
        });
    }

    // Real-time Water Filling on Form Changes
    if (form) {
        form.addEventListener('input', () => updateWaterLevel());
        form.addEventListener('change', () => updateWaterLevel());
    }

    const confirmAccuracyCheckbox = document.getElementById('confirmAccuracyCheckbox');
    if (confirmAccuracyCheckbox) {
        confirmAccuracyCheckbox.addEventListener('click', () => updateWaterLevel());
        confirmAccuracyCheckbox.addEventListener('change', () => updateWaterLevel());
    }

    // =========================================================================
    // SEARCHABLE GLOBAL LANGUAGE SELECTOR (120+ LANGUAGES WITH REAL-TIME SEARCH)
    // =========================================================================
    const GLOBAL_LANGUAGES = [
        "Instrumental / No Lyrics",
        "English",
        "Sinhala",
        "Spanish",
        "Japanese",
        "Hindi",
        "Korean",
        "French",
        "German",
        "Portuguese",
        "Italian",
        "Russian",
        "Chinese (Mandarin)",
        "Chinese (Cantonese)",
        "Arabic",
        "Tamil",
        "Bengali",
        "Turkish",
        "Dutch",
        "Swedish",
        "Polish",
        "Indonesian",
        "Tagalog / Filipino",
        "Thai",
        "Vietnamese",
        "Ukrainian",
        "Greek",
        "Hebrew",
        "Persian / Farsi",
        "Urdu",
        "Punjabi",
        "Marathi",
        "Telugu",
        "Malayalam",
        "Kannada",
        "Gujarati",
        "Nepali",
        "Afrikaans",
        "Albanian",
        "Amharic",
        "Armenian",
        "Assamese",
        "Azerbaijani",
        "Basque",
        "Belarusian",
        "Bosnian",
        "Bulgarian",
        "Burmese",
        "Catalan",
        "Cebuano",
        "Croatian",
        "Czech",
        "Danish",
        "Esperanto",
        "Estonian",
        "Faroese",
        "Fijian",
        "Finnish",
        "Galician",
        "Georgian",
        "Haitian Creole",
        "Hausa",
        "Hawaiian",
        "Hmong",
        "Hungarian",
        "Icelandic",
        "Igbo",
        "Irish",
        "Javanese",
        "Kazakh",
        "Khmer",
        "Kurdish",
        "Kyrgyz",
        "Lao",
        "Latin",
        "Latvian",
        "Lithuanian",
        "Luxembourgish",
        "Macedonian",
        "Malagasy",
        "Malay",
        "Maltese",
        "Maori",
        "Mongolian",
        "Norwegian",
        "Odia",
        "Pashto",
        "Romanian",
        "Samoan",
        "Scottish Gaelic",
        "Serbian",
        "Shona",
        "Sindhi",
        "Slovak",
        "Slovenian",
        "Somali",
        "Sundanese",
        "Swahili",
        "Tajik",
        "Tibetan",
        "Tigrinya",
        "Tongan",
        "Turkmen",
        "Uzbek",
        "Welsh",
        "Xhosa",
        "Yiddish",
        "Yoruba",
        "Zulu",
        "Other / Not Listed"
    ];

    function initSearchableLanguageSelector() {
        const wrapper = document.getElementById('langSelectorWrapper');
        const triggerBox = document.getElementById('langTriggerBox');
        const searchToggleBtn = document.getElementById('langSearchToggleBtn');
        const dropdownPanel = document.getElementById('langDropdownPanel');
        const searchInput = document.getElementById('langSearchInput');
        const searchClearBtn = document.getElementById('langSearchClearBtn');
        const optionsList = document.getElementById('langOptionsList');
        const nativeSelect = document.getElementById('language');
        const selectedDisplay = document.getElementById('selectedLangDisplay');

        if (!wrapper || !triggerBox || !dropdownPanel || !optionsList || !nativeSelect) return;

        // 1. Populate native hidden select options
        nativeSelect.innerHTML = '<option value="" disabled selected>Select release language...</option>';
        GLOBAL_LANGUAGES.forEach(lang => {
            const opt = document.createElement('option');
            opt.value = lang;
            opt.textContent = lang;
            nativeSelect.appendChild(opt);
        });

        // 2. Render options list in dropdown panel
        function renderOptions(filterText = '') {
            const cleanFilter = filterText.toLowerCase().trim();
            optionsList.innerHTML = '';

            const filtered = GLOBAL_LANGUAGES.filter(lang => 
                lang.toLowerCase().includes(cleanFilter)
            );

            if (filtered.length === 0) {
                const emptyEl = document.createElement('div');
                emptyEl.style.padding = '16px 12px';
                emptyEl.style.textAlign = 'center';
                emptyEl.style.color = '#94a3b8';
                emptyEl.style.fontSize = '13px';
                emptyEl.innerHTML = `<i class="fas fa-search" style="opacity: 0.5; margin-right: 6px;"></i> No languages found matching "<strong>${filterText}</strong>"`;
                optionsList.appendChild(emptyEl);
                return;
            }

            filtered.forEach(lang => {
                const item = document.createElement('div');
                item.className = 'lang-option-item';
                if (nativeSelect.value === lang) {
                    item.classList.add('selected');
                }

                if (cleanFilter) {
                    const idx = lang.toLowerCase().indexOf(cleanFilter);
                    const before = lang.substring(0, idx);
                    const match = lang.substring(idx, idx + cleanFilter.length);
                    const after = lang.substring(idx + cleanFilter.length);
                    item.innerHTML = `<span>${before}<strong style="color: #00f0ff; text-decoration: underline;">${match}</strong>${after}</span>`;
                } else {
                    item.innerHTML = `<span>${lang}</span>`;
                }

                if (nativeSelect.value === lang) {
                    item.innerHTML += '<i class="fas fa-check" style="font-size: 11px;"></i>';
                }

                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectLanguage(lang);
                });

                optionsList.appendChild(item);
            });
        }

        function selectLanguage(lang) {
            nativeSelect.value = lang;
            if (selectedDisplay) {
                selectedDisplay.textContent = lang;
                selectedDisplay.classList.remove('selected-lang-placeholder');
            }
            triggerBox.classList.add('has-value');

            closeDropdown();

            // Fire input & change events on native select to trigger real-time water update & form validation
            nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            nativeSelect.dispatchEvent(new Event('input', { bubbles: true }));
            updateWaterLevel();
        }

        function openDropdown() {
            dropdownPanel.style.display = 'block';
            triggerBox.classList.add('open');
            triggerBox.setAttribute('aria-expanded', 'true');
            const card = document.getElementById('languageQuestionCard');
            if (card) {
                card.classList.add('dropdown-open');
                card.style.zIndex = '99999';
            }
            renderOptions(searchInput.value);
            setTimeout(() => {
                searchInput.focus();
            }, 50);
        }

        function closeDropdown() {
            dropdownPanel.style.display = 'none';
            triggerBox.classList.remove('open');
            triggerBox.setAttribute('aria-expanded', 'false');
            const card = document.getElementById('languageQuestionCard');
            if (card) {
                card.classList.remove('dropdown-open');
                card.style.zIndex = '';
            }
        }

        function toggleDropdown(e) {
            if (e) e.stopPropagation();
            if (dropdownPanel.style.display === 'none' || dropdownPanel.style.display === '') {
                openDropdown();
            } else {
                closeDropdown();
            }
        }

        triggerBox.addEventListener('click', (e) => {
            toggleDropdown(e);
        });

        triggerBox.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDropdown(e);
            } else if (e.key === 'Escape') {
                closeDropdown();
            }
        });

        if (searchToggleBtn) {
            searchToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDropdown();
            });
        }

        // Search Input filtering
        searchInput.addEventListener('input', () => {
            const val = searchInput.value;
            searchClearBtn.style.display = val.length > 0 ? 'block' : 'none';
            renderOptions(val);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeDropdown();
                triggerBox.focus();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const firstItem = optionsList.querySelector('.lang-option-item');
                if (firstItem) {
                    firstItem.click();
                }
            }
        });

        // Clear search button
        searchClearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            searchInput.value = '';
            searchClearBtn.style.display = 'none';
            renderOptions('');
            searchInput.focus();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                closeDropdown();
            }
        });

        // Initial render of options
        renderOptions('');
    }

    // Initialize Searchable Language Selector
    initSearchableLanguageSelector();

    // --- Dynamic Collaborators Logic ---
    function updateCollabsVisibility() {
        const boxes = collaboratorsList.querySelectorAll('.collaborator-box');
        if (boxes.length === 0) {
            noCollabsMsg.style.display = 'block';
        } else {
            noCollabsMsg.style.display = 'none';
        }

        boxes.forEach((box, i) => {
            const numEl = box.querySelector('.collab-number');
            if (numEl) numEl.textContent = `Collaborator ${i + 1}`;
        });
        updateWaterLevel();
    }

    function addCollaborator() {
        const box = document.createElement('div');
        box.className = 'collaborator-box';
        box.innerHTML = `
            <div class="collab-box-header">
                <span class="collab-number">Collaborator</span>
                <button type="button" class="remove-collab-link" title="Remove collaborator">
                    <i class="fas fa-trash-alt"></i> Remove
                </button>
            </div>
            <div class="collab-fields-grid">
                <div class="collab-field">
                    <label class="collab-field-label">Artist Name (Stage Name)</label>
                    <input type="text" class="collab-field-input collab-artist" placeholder="e.g. Ghostface" required>
                </div>
                <div class="collab-field">
                    <label class="collab-field-label">Legal Real Name</label>
                    <input type="text" class="collab-field-input collab-realname" placeholder="e.g. Dennis Coles">
                </div>
                <div class="collab-field" style="grid-column: 1 / -1;">
                    <label class="collab-field-label">Contribution / Role</label>
                    <input type="text" class="collab-field-input collab-role" placeholder="e.g. Featured Artist, Producer, Remixer, Vocals">
                </div>
                <div class="collab-field">
                    <label class="collab-field-label">Spotify Profile Link</label>
                    <input type="text" class="collab-field-input collab-spotify" placeholder="https://open.spotify.com/artist/...">
                </div>
                <div class="collab-field">
                    <label class="collab-field-label">Apple Music Profile Link</label>
                    <input type="text" class="collab-field-input collab-apple" placeholder="https://music.apple.com/artist/...">
                </div>
            </div>
        `;

        const removeBtn = box.querySelector('.remove-collab-link');
        removeBtn.addEventListener('click', () => {
            box.remove();
            updateCollabsVisibility();
        });

        collaboratorsList.appendChild(box);
        updateCollabsVisibility();

        const artistInput = box.querySelector('.collab-artist');
        if (artistInput) artistInput.focus();
    }

    if (addCollabBtn) {
        addCollabBtn.addEventListener('click', addCollaborator);
    }

    // --- Clear Form Button ---
    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the form? All entered answers will be erased.')) {
                form.reset();
                collaboratorsList.innerHTML = '';
                updateCollabsVisibility();
                const selectedDisplay = document.getElementById('selectedLangDisplay');
                if (selectedDisplay) {
                    selectedDisplay.textContent = 'Select or search release language...';
                    selectedDisplay.classList.add('selected-lang-placeholder');
                }
                document.getElementById('langTriggerBox')?.classList.remove('has-value');
                isCodeValid = false;
                verifiedCodeData = null;
                document.body.classList.remove('theme-alert-red');
                verifiedCodeCard.style.display = 'none';
                codeErrorBox.style.display = 'none';
                codeUsedBox.style.display = 'none';
                updateWaterLevel();
            }
        });
    }

    // --- Submit Another Response Link ---
    if (submitAnotherLink) {
        submitAnotherLink.addEventListener('click', () => {
            stopRain();
            document.body.classList.remove('theme-alert-red');
            form.reset();
            collaboratorsList.innerHTML = '';
            updateCollabsVisibility();
            const selectedDisplay = document.getElementById('selectedLangDisplay');
            if (selectedDisplay) {
                selectedDisplay.textContent = 'Select or search release language...';
                selectedDisplay.classList.add('selected-lang-placeholder');
            }
            document.getElementById('langTriggerBox')?.classList.remove('has-value');
            isCodeValid = false;
            verifiedCodeData = null;
            verifiedCodeCard.style.display = 'none';
            codeErrorBox.style.display = 'none';
            codeUsedBox.style.display = 'none';
            confirmationCard.classList.remove('active');
            form.style.display = 'block';
            updateWaterLevel();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- Form Submit Handler ---
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const acceptanceCode = (acceptanceCodeInput?.value || '').toUpperCase().trim();
            const realName = document.getElementById('realName').value.trim();
            const mainArtist = document.getElementById('mainArtist').value.trim();
            const email = document.getElementById('email').value.trim();
            const city = document.getElementById('city').value.trim();
            const country = document.getElementById('country').value.trim();
            const songTitle = document.getElementById('songTitle').value.trim();
            const genre = document.getElementById('genre').value.trim();
            const language = document.getElementById('language').value.trim();
            const mainArtistSpotify = document.getElementById('mainArtistSpotify').value.trim();
            const mainArtistApple = document.getElementById('mainArtistApple').value.trim();
            const releaseDate = document.getElementById('releaseDate').value;
            const driveLink = document.getElementById('driveLink').value.trim();
            const notes = document.getElementById('notes').value.trim();

            const codeCard = document.getElementById('codeCard') || (acceptanceCodeInput ? acceptanceCodeInput.closest('.form-card') : null);

            if (!acceptanceCode) {
                document.body.classList.add('theme-alert-red');
                if (codeErrorBox) {
                    const errSpan = codeErrorBox.querySelector('span');
                    if (errSpan) errSpan.textContent = 'An Acceptance Code is strictly required to submit your dossier.';
                    codeErrorBox.style.display = 'flex';
                }
                if (codeCard) {
                    codeCard.classList.remove('input-error-shake');
                    void codeCard.offsetWidth;
                    codeCard.classList.add('input-error-shake');
                    codeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                acceptanceCodeInput?.focus();
                alert('Submission blocked: Please enter your unique Acceptance Code provided in your official OBSCURA REC LLC acceptance email.');
                return;
            }

            if (!isCodeValid) {
                document.body.classList.add('theme-alert-red');
                if (codeCard) {
                    codeCard.classList.remove('input-error-shake');
                    void codeCard.offsetWidth;
                    codeCard.classList.add('input-error-shake');
                    codeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                acceptanceCodeInput?.focus();
                alert('Submission blocked: Your Acceptance Code has not been verified or has already been used. A valid, active acceptance code is required.');
                return;
            }

            if (!realName || !mainArtist || !email || !city || !country || !songTitle || !genre || !language || !mainArtistSpotify || !releaseDate || !driveLink) {
                alert('Please fill in all required questions marked with an asterisk (*).');
                return;
            }

            if (minReleaseDateStr && releaseDate < minReleaseDateStr) {
                alert(`Requested release date must be at least 4 days in advance (${minReleaseDateStr} or later) to allow digital store ingestion and delivery.`);
                document.getElementById('releaseDate').focus();
                return;
            }

            // Google drive advice check
            if (!driveLink.toLowerCase().includes('drive.google.com')) {
                const proceed = confirm('Your audio & artwork link does not appear to be a Google Drive link. Do you want to submit anyway?');
                if (!proceed) return;
            }

            // Final Release Confirmation Checkbox
            const confirmCheckbox = document.getElementById('confirmAccuracyCheckbox');
            const confirmCard = document.getElementById('confirmReviewCard');
            if (!confirmCheckbox || !confirmCheckbox.checked) {
                if (confirmCard) {
                    confirmCard.classList.remove('input-error-shake');
                    void confirmCard.offsetWidth;
                    confirmCard.classList.add('input-error-shake');
                    confirmCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                alert('Please check the Final Submission Confirmation box to confirm that your release details are accurate before submitting.');
                return;
            }

            // Collect collaborators
            const collabBoxes = collaboratorsList.querySelectorAll('.collaborator-box');
            const collaborators = [];
            collabBoxes.forEach(box => {
                const artist = box.querySelector('.collab-artist')?.value.trim();
                const real = box.querySelector('.collab-realname')?.value.trim();
                const role = box.querySelector('.collab-role')?.value.trim();
                const spotify = box.querySelector('.collab-spotify')?.value.trim();
                const apple = box.querySelector('.collab-apple')?.value.trim();

                if (artist || real || role || spotify || apple) {
                    collaborators.push({
                        artistName: artist || 'N/A',
                        realName: real || 'N/A',
                        role: role || 'Collaborator',
                        spotifyLink: spotify || '',
                        appleLink: apple || ''
                    });
                }
            });

            // Generate unique submission ID
            const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
            const submissionId = `OBS-SUB-${Date.now().toString().slice(-4)}-${randomCode}`;

            // Button loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            try {
                const isLocalFile = window.location.protocol === 'file:';
                const apiUrl = isLocalFile ? 'https://obscurarecord.com/api/submission' : '/api/submission';
                let submissionSuccess = false;
                let finalSubId = submissionId;

                const payload = {
                    acceptanceCode,
                    songTitle,
                    realName,
                    mainArtist,
                    email,
                    city,
                    country,
                    genre,
                    language,
                    mainArtistSpotify,
                    mainArtistApple,
                    releaseDate,
                    driveLink,
                    collaborators,
                    notes,
                    submissionId
                };

                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            submissionSuccess = true;
                            if (result.submissionId) finalSubId = result.submissionId;
                        }
                    }
                } catch (netErr) {
                    console.warn('Network submission API unavailable, evaluating local fallback...', netErr);
                }

                // Local file fallback for offline/direct testing
                if (!submissionSuccess && isLocalFile) {
                    try {
                        const subRecord = {
                            ...payload,
                            submittedAt: Date.now()
                        };

                        // 1. Save submission record
                        await fetch(`${FIREBASE_DB_URL}/submissions/${encodeURIComponent(submissionId)}.json`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(subRecord)
                        });

                        // 2. Mark code as used
                        await fetch(`${FIREBASE_DB_URL}/accepted_codes/${encodeURIComponent(acceptanceCode)}.json`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                status: 'used',
                                usedAt: Date.now(),
                                submissionId: submissionId
                            })
                        });

                        submissionSuccess = true;
                    } catch (fbErr) {
                        console.error('Local fallback Firebase save error:', fbErr);
                    }
                }

                if (submissionSuccess) {
                    // Invalidate and update local cache so re-entering the code IMMEDIATELY shows Code Already Used!
                    verificationCache[cleanCode] = {
                        ...verifiedCodeData,
                        status: 'used',
                        usedAt: Date.now(),
                        submissionId: finalSubId
                    };

                    if (displaySubId) displaySubId.textContent = finalSubId;

                    // 1. Smoothly drain water down to 0%
                    updateWaterLevel(true);

                    // 2. Start ambient cyber rain over the screen
                    startRain();

                    form.style.display = 'none';
                    confirmationCard.classList.add('active');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    alert('Submission could not be completed. Please ensure your acceptance code is valid and you have an active internet connection.');
                }
            } catch (err) {
                console.error('Submission request error:', err);
                alert('An error occurred while connecting to the submission system. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
            }
        });
    }
});
