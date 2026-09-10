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

    const FIREBASE_DB_URL = "https://submission-code-and-mail-sys-default-rtdb.asia-southeast1.firebasedatabase.app";

    let isCodeValid = false;
    let verifiedCodeData = null;
    let codeCheckTimeout = null;
    // Client-side cache to eliminate redundant Firebase read requests
    const verificationCache = {};

    // Restrict release date to today or later
    if (releaseDateInput) {
        const today = new Date().toISOString().split('T')[0];
        releaseDateInput.min = today;
    }

    // --- Acceptance Code Real-Time Verification (Heavily Optimized) ---
    async function verifyAcceptanceCode(codeVal) {
        const cleanCode = (codeVal || '').toUpperCase().trim();

        if (!cleanCode) {
            isCodeValid = false;
            verifiedCodeData = null;
            verifiedCodeCard.style.display = 'none';
            codeErrorBox.style.display = 'none';
            codeUsedBox.style.display = 'none';
            codeCheckingSpinner.style.display = 'none';
            return;
        }

        // Optimization: Do NOT query database until code is long enough to be an actual code
        if (cleanCode.length < 10) {
            isCodeValid = false;
            verifiedCodeData = null;
            verifiedCodeCard.style.display = 'none';
            codeErrorBox.style.display = 'none';
            codeUsedBox.style.display = 'none';
            codeCheckingSpinner.style.display = 'none';
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
        }
    }

    function handleVerificationResult(data) {
        if (!data || data.notFound) {
            // Code not found in database
            isCodeValid = false;
            verifiedCodeData = null;
            verifiedCodeCard.style.display = 'none';
            codeUsedBox.style.display = 'none';
            codeErrorBox.style.display = 'flex';
            return;
        }

        if (data.status === 'used') {
            // Code has already been consumed
            isCodeValid = false;
            verifiedCodeData = null;
            verifiedCodeCard.style.display = 'none';
            codeErrorBox.style.display = 'none';
            codeUsedBox.style.display = 'flex';
            return;
        }

        if (data.status === 'active') {
            // Code is valid and active!
            isCodeValid = true;
            verifiedCodeData = data;
            codeErrorBox.style.display = 'none';
            codeUsedBox.style.display = 'none';

            verifiedArtist.textContent = data.artistName || 'N/A';
            verifiedRealName.textContent = data.realName || 'N/A';
            verifiedDate.textContent = data.acceptedDate || 'Recently Approved';
            verifiedCodeCard.style.display = 'block';

            // Automatically assist the artist by pre-filling or syncing fields if empty
            const realNameInput = document.getElementById('realName');
            const mainArtistInput = document.getElementById('mainArtist');
            if (realNameInput && !realNameInput.value && data.realName) {
                realNameInput.value = data.realName;
            }
            if (mainArtistInput && !mainArtistInput.value && data.artistName) {
                mainArtistInput.value = data.artistName;
            }
        } else {
            isCodeValid = false;
            verifiedCodeData = null;
            verifiedCodeCard.style.display = 'none';
            codeUsedBox.style.display = 'none';
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
                    <label class="collab-field-label">Real Name</label>
                    <input type="text" class="collab-field-input collab-realname" placeholder="e.g. Dennis Coles">
                </div>
                <div class="collab-field">
                    <label class="collab-field-label">Contribution / Role</label>
                    <input type="text" class="collab-field-input collab-role" placeholder="e.g. Vocals, Lyrics, Mixing, Producer">
                </div>
                <div class="collab-field">
                    <label class="collab-field-label">Spotify Profile Link</label>
                    <input type="text" class="collab-field-input collab-spotify" placeholder="https://open.spotify.com/artist/...">
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
                isCodeValid = false;
                verifiedCodeData = null;
                verifiedCodeCard.style.display = 'none';
                codeErrorBox.style.display = 'none';
                codeUsedBox.style.display = 'none';
            }
        });
    }

    // --- Submit Another Response Link ---
    if (submitAnotherLink) {
        submitAnotherLink.addEventListener('click', () => {
            form.reset();
            collaboratorsList.innerHTML = '';
            updateCollabsVisibility();
            isCodeValid = false;
            verifiedCodeData = null;
            verifiedCodeCard.style.display = 'none';
            codeErrorBox.style.display = 'none';
            codeUsedBox.style.display = 'none';
            confirmationCard.classList.remove('active');
            form.style.display = 'block';
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
            const mainArtistSpotify = document.getElementById('mainArtistSpotify').value.trim();
            const songTitle = document.getElementById('songTitle').value.trim();
            const email = document.getElementById('email').value.trim();
            const genre = document.getElementById('genre').value.trim();
            const releaseDate = document.getElementById('releaseDate').value;
            const driveLink = document.getElementById('driveLink').value.trim();
            const notes = document.getElementById('notes').value.trim();

            if (!acceptanceCode) {
                alert('Please enter your unique Acceptance Code.');
                acceptanceCodeInput.focus();
                return;
            }

            if (!isCodeValid) {
                alert('Your Acceptance Code is not verified. Please check the code or contact our team.');
                acceptanceCodeInput.focus();
                return;
            }

            if (!realName || !mainArtist || !songTitle || !email || !driveLink || !genre || !releaseDate) {
                alert('Please fill in all required questions marked with an asterisk (*).');
                return;
            }

            // Google drive advice check
            if (!driveLink.toLowerCase().includes('drive.google.com')) {
                const proceed = confirm('Your audio & artwork link does not appear to be a Google Drive link. Do you want to submit anyway?');
                if (!proceed) return;
            }

            // Collect collaborators
            const collabBoxes = collaboratorsList.querySelectorAll('.collaborator-box');
            const collaborators = [];
            collabBoxes.forEach(box => {
                const artist = box.querySelector('.collab-artist')?.value.trim();
                const real = box.querySelector('.collab-realname')?.value.trim();
                const role = box.querySelector('.collab-role')?.value.trim();
                const spotify = box.querySelector('.collab-spotify')?.value.trim();

                if (artist || real || role || spotify) {
                    collaborators.push({
                        artistName: artist || 'N/A',
                        realName: real || 'N/A',
                        role: role || 'Collaborator',
                        spotifyLink: spotify || ''
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
                    mainArtistSpotify,
                    email,
                    genre,
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

                // If testing locally via file:/// protocol and serverless API cannot be reached directly:
                // Archive directly to Firebase so local testing works 100% end-to-end!
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
                    if (displaySubId) displaySubId.textContent = finalSubId;
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
