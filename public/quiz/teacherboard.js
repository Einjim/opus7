// teacherboard.js
//
// NOTE (unreachable in the live app, not fixable from this file alone):
// nothing anywhere in this codebase loads teacherboard.js. profile.js has a
// "👩‍🏫 Teacherboard" footer button (id="Teacherboard-btn") but never
// attaches a click handler to it at all, and no other page links here
// either. The fixes below make this page correct and safe to load, but
// actually reaching it still requires wiring that button up in profile.js,
// which is out of scope for "fix teacherboard.js" alone.

const DEFAULT_PROFILE_PIC =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
        '<circle cx="50" cy="50" r="50" fill="#ccc"/>' +
        '<circle cx="50" cy="38" r="18" fill="#fff"/>' +
        '<path d="M20 90c0-22 60-22 60 0" fill="#fff"/>' +
        '</svg>'
    );

// BUG FIX: video course names, teacher names, categories, and descriptions
// all come from the /quiz/upload_video form with no server-side
// sanitization, and were inserted straight into innerHTML with no
// escaping -- the same class of stored-XSS bug already fixed in
// leaderboard.js/customQuizzes.js's comment rendering. A teacher account
// (or anyone able to reach the upload endpoint) could put a <script> tag in
// e.g. the course name and have it execute in every viewer's browser.
function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value === null || value === undefined ? '' : String(value);
    return div.innerHTML;
}

function loadScript(scriptName) {
    const existingScript = document.querySelector(`script[src="${scriptName}"]`);
    if (existingScript) existingScript.remove();
    const script = document.createElement('script');
    script.src = scriptName;
    document.body.appendChild(script);
}

function showTeacherboardPage() {
    // Create a style element and add CSS
    const style = document.createElement('style');
    style.textContent = `
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 100%;
            padding: 15px;
            margin: 0 auto;
        }
        .app-header {
            background-color: #4a90e2;
            color: white;
            padding: 15px;
            text-align: center;
        }
        .app-header h1 {
            margin-bottom: 10px;
        }
        .profile {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 15px;
        }
        .profile-pic {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin-bottom: 10px;
        }
        .user-info {
            text-align: center;
        }
        .user-info span {
            display: block;
        }
        .app-main {
            padding: 20px 0;
        }
        .videos-section {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .video-list {
            list-style-type: none;
        }
        .video-item {
            background-color: #fff;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .video-item h3 {
            margin-bottom: 10px;
        }
        .video-item p {
            margin-bottom: 5px;
        }
        .video-item video {
            width: 100%;
            margin: 10px 0;
        }
        .video-actions {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            margin-top: 10px;
        }
        .star-rating {
            display: flex;
            justify-content: flex-end;
            align-items: center;
        }
        .star-button {
            background: none;
            border: none;
            font-size: 1.5em;
            cursor: pointer;
            color: #ccc;
            transition: color 0.2s;
        }
        .star-button.active {
            color: gold;
        }
        .app-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: #fff;
            display: flex;
            justify-content: space-around;
            padding: 10px 0;
        }
        .nav-button {
            background-color: transparent;
            border: none;
            color: #333;
            font-size: 1.5em;
            cursor: pointer;
        }
        .nav-button.active {
            color: #4a90e2;
        }
    `;
    document.head.appendChild(style);

    // Create and set HTML content
    const teacherboardContent = `
        <div class="container">
            <header class="app-header">
                <h1>Teacherboard</h1>
                <div class="profile">
                    <img id="profile-pic" src="" alt="Profile Picture" class="profile-pic">
                    <div class="user-info">
                        <span id="user-name">User</span>
                        <span id="username">@username</span>
                    </div>
                </div>
            </header>
            
            <main class="app-main">
                <section class="videos-section">
                    <h2>Teacher Videos</h2>
                    <ul id="teacher-video-list" class="video-list">
                        <!-- Teacher videos will be populated dynamically -->
                    </ul>
                </section>
            </main>
            
            <footer class="app-footer">
                <button class="nav-button" id="home-btn">🏠</button>
                <button class="nav-button" id="leaderboard-btn">🏆</button>
                <button class="nav-button active" id="teacherboard-btn">👩‍🏫</button>
                <button class="nav-button" id="profile-btn">👤</button>
            </footer>
        </div>
    `;
    
    document.body.innerHTML = teacherboardContent;
    
    // Load the profile info
    loadProfileInfo();
    
    // Load the teacher videos
    loadTeacherVideos();
    
    // Add event listeners for navigation buttons
    document.getElementById('home-btn').addEventListener('click', showHomePage);
    // BUG FIX: loadLeaderboardScript()/loadProfileScript() used to only
    // console.log('Loading ... page') -- clicking these buttons did
    // nothing at all. leaderboard.js and profile.js both exist and both
    // self-initialize as soon as they're loaded, so wiring these up to
    // actually load them (same loadScript() pattern used throughout the
    // rest of the app) makes the buttons work.
    document.getElementById('leaderboard-btn').addEventListener('click', loadLeaderboardScript);
    document.getElementById('profile-btn').addEventListener('click', loadProfileScript);
    // BUG FIX (new): the currently-active "teacherboard-btn" tab had no
    // click handler at all, unlike every other footer nav button in the
    // sibling page-builder scripts (quiz-options.js, single-player-quiz.js,
    // game-island.js), which all wire up their own active tab too (if only
    // to refresh it). Wired to simply reload the video list.
    document.getElementById('teacherboard-btn').addEventListener('click', loadTeacherVideos);
}

function loadProfileInfo() {
    fetch('/quiz/get_profile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        // BUG FIX: the <img id="profile-pic"> only ever got a src set if
        // data.profile_picture was truthy -- a user with no profile
        // picture left it at src="" (which makes the browser re-request
        // the current page itself as an "image") instead of showing
        // something sensible. Same placeholder pattern used elsewhere.
        document.getElementById('profile-pic').src = data.profile_picture || DEFAULT_PROFILE_PIC;
        if (data.name) {
            document.getElementById('user-name').textContent = data.name;
        }
        if (data.username) {
            document.getElementById('username').textContent = `@${data.username}`;
        }
    })
    .catch(error => console.error('Error:', error));
}

function loadTeacherVideos() {
    fetch('/quiz/get_teacherboard')
        .then(response => response.json())
        .then(data => {
            const videoList = document.getElementById('teacher-video-list');
            videoList.innerHTML = '';
            data.forEach(video => {
                const listItem = document.createElement('li');
                listItem.className = 'video-item';
                // BUG FIX: course_name/teacher_name/categories/description
                // are all free-text values a teacher supplied through the
                // upload form -- see escapeHtml()'s comment above. video_url
                // is server-generated (secure_filename + a timestamp
                // prefix), but it's escaped too as cheap defense-in-depth
                // since it still ends up inside an HTML attribute.
                listItem.innerHTML = `
                    <h3>${escapeHtml(video.course_name)}</h3>
                    <p class="teacher-name">Teacher: ${escapeHtml(video.teacher_name)}</p>
                    <p class="video-meta">
                        <span class="category">Category: ${escapeHtml(video.categories)}</span>
                        <span class="year">Year: ${video.year || 'N/A'}</span>
                    </p>
                    <video src="/quiz/videos/${escapeHtml(video.video_url)}" controls data-video-id="${video.id}"></video>
                    <p class="description">${escapeHtml(video.description || '')}</p>
                    <div class="video-actions">
                        <div class="star-rating" data-video-id="${video.id}">
                            <button class="star-button" data-star="1">⭐</button>
                            <button class="star-button" data-star="2">⭐</button>
                            <button class="star-button" data-star="3">⭐</button>
                            <button class="star-button" data-star="4">⭐</button>
                            <button class="star-button" data-star="5">⭐</button>
                        </div>
                    </div>
                `;
                videoList.appendChild(listItem);
            });
            addStarFunctionality();
            addVideoWatchCharges();
        })
        .catch(error => console.error('Error loading teacher videos:', error));
}

// NEW: watching a video costs coins.
// Charges the user 100 coins the first time they press play on a given
// video (server enforces "first time" per user/video, so replays/reloads
// never charge twice -- see /quiz/watch_video). The 'play' event fires
// as soon as playback actually starts, so the video is paused immediately
// and only resumed once the charge succeeds -- if the user can't afford
// it, they see why instead of watching for free.
function addVideoWatchCharges() {
    document.querySelectorAll('#teacher-video-list video[data-video-id]').forEach(videoEl => {
        let chargePending = false;
        let charged = false;

        videoEl.addEventListener('play', function() {
            if (charged || chargePending) return;
            chargePending = true;
            videoEl.pause();

            const videoId = videoEl.getAttribute('data-video-id');
            fetch('/quiz/watch_video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ video_id: videoId })
            })
            .then(response => response.json().then(data => ({ ok: response.ok, data })))
            .then(({ ok, data }) => {
                chargePending = false;
                if (ok && data.success) {
                    charged = true;
                    if (!data.already_watched) {
                        showCoinToast(`-${data.coins_deducted} coins`);
                    }
                    videoEl.play();
                } else {
                    alert(data.error || 'Could not start video.');
                }
            })
            .catch(error => {
                console.error('Error charging for video watch:', error);
                chargePending = false;
                // Network/server error -- fail closed rather than let the
                // video play uncharged.
                alert('Could not start video. Please try again.');
            });
        });
    });
}

// Small transient "-100 coins" toast so the deduction is visible without
// blocking playback with another alert().
function showCoinToast(text) {
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #333;
        color: #fff;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.9em;
        z-index: 1000;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// BUG FIX: there is no backend endpoint anywhere in app.py to save a video
// rating -- clicking a star only ever updated the button styling in-memory
// and logged to the console, so every rating was silently lost on the next
// page load/render. There's still no real backend for this (that's a
// server-side gap, out of scope for this file), but at minimum a user's own
// rating can survive a re-render/reload by keeping it in localStorage
// instead of nowhere at all. This is explicitly a client-only stand-in:
// it does NOT aggregate other users' ratings or persist across devices/
// browsers -- an actual /quiz/rate_video endpoint plus a rating column
// would be needed for that.
function getStoredRating(videoId) {
    try {
        const ratings = JSON.parse(localStorage.getItem('teacherVideoRatings') || '{}');
        return ratings[videoId] || 0;
    } catch (error) {
        return 0;
    }
}

function storeRating(videoId, rating) {
    try {
        const ratings = JSON.parse(localStorage.getItem('teacherVideoRatings') || '{}');
        ratings[videoId] = rating;
        localStorage.setItem('teacherVideoRatings', JSON.stringify(ratings));
    } catch (error) {
        console.error('Error saving rating locally:', error);
    }
}

function addStarFunctionality() {
    const starRatings = document.querySelectorAll('.star-rating');
    starRatings.forEach(rating => {
        const videoId = rating.getAttribute('data-video-id');
        const stars = rating.querySelectorAll('.star-button');

        // Reflect any rating this user already gave this video.
        updateStars(stars, getStoredRating(videoId));

        stars.forEach((star, index) => {
            star.addEventListener('click', function() {
                const selectedRating = index + 1;
                updateStars(stars, selectedRating);
                storeRating(videoId, selectedRating);
            });

            star.addEventListener('mouseover', function() {
                updateStars(stars, index + 1);
            });

            star.addEventListener('mouseout', function() {
                updateStars(stars, getCurrentRating(stars));
            });
        });
    });
}

function updateStars(stars, count) {
    stars.forEach((star, index) => {
        star.classList.toggle('active', index < count);
    });
}

function getCurrentRating(stars) {
    return Array.from(stars).filter(star => star.classList.contains('active')).length;
}

// BUG FIX: hardcoded the production domain
// (https://konkoor.chbk.app/quiz/), so "🏠" sent you to the wrong origin
// entirely (or failed under CORS/mixed-content) on localhost, staging, or
// any custom domain -- the same fix already applied to the equivalent bug
// in singlePlayer.js/leaderboard.js/customQuizzes.js.
function showHomePage() {
    window.location.href = '/quiz/';
}

function loadLeaderboardScript() {
    loadScript('/quiz/leaderboard.js');
}

function loadProfileScript() {
    loadScript('/quiz/profile.js');
}

// Initialize the Teacherboard page
showTeacherboardPage();