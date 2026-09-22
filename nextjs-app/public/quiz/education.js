// This is the script file for the education page.
//
// BUG FIX (the big one): this entire file used to be wrapped in a single
// document.addEventListener('DOMContentLoaded', ...) block. That's correct
// when education.html loads this via its own <script src="education.js">
// tag (the normal, current path), but it silently breaks if this file is
// ever loaded dynamically *after* the page has already finished loading --
// which is exactly what quiz-options.js's and single-player-quiz.js's
// footer "آموزش" button used to do via loadScript('/quiz/education.js')
// before those two files were fixed to navigate to education.html
// directly instead. DOMContentLoaded had already fired long before that
// dynamic <script> tag was injected, so the listener registered here never
// ran at all -- none of the profile info, drawer, footer nav, help modal,
// or category cards worked. Rather than rely on every future caller
// remembering to navigate instead of loadScript(), this now runs
// immediately if the document has already finished loading, and only
// waits for DOMContentLoaded if it genuinely hasn't fired yet -- so this
// file behaves correctly either way it's loaded.

const DEFAULT_PROFILE_PIC =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
        '<circle cx="50" cy="50" r="50" fill="#ccc"/>' +
        '<circle cx="50" cy="38" r="18" fill="#fff"/>' +
        '<path d="M20 90c0-22 60-22 60 0" fill="#fff"/>' +
        '</svg>'
    );

// Same absolute-path loadScript() utility used throughout the rest of the
// app (quiz-options.js, single-player-quiz.js, game-island.js, etc.).
function loadScript(scriptName) {
    const existingScript = document.querySelector(`script[src="${scriptName}"]`);
    if (existingScript) existingScript.remove();
    const script = document.createElement('script');
    script.src = scriptName;
    document.body.appendChild(script);
}

function initEducationPage() {

    // ---DRAWER AND MODAL ELEMENTS---
    const profileDrawer = document.getElementById('profile-drawer');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const profileHeaderBtn = document.getElementById('profile-header-button');
    const imageViewerModal = document.getElementById('image-viewer-modal');
    const fullViewImage = document.getElementById('full-view-image');
    const drawerProfilePic = document.getElementById('drawer-profile-pic');


    // Function to fetch and display user's profile information
    function loadProfileInfo() {
        const cachedData = sessionStorage.getItem('userProfileData');
        if (cachedData) {
            updateUI(JSON.parse(cachedData));
            return;
        }

        fetch('/quiz/get_profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            // BUG FIX: this never used to check whether the request actually
            // succeeded. On a 401 (session expired / not logged in),
            // /quiz/get_profile returns {"error": "..."} -- an object with
            // none of the fields updateUI() checks for (profile_picture,
            // name, username, streaks, coins, hp), so every "if (data.x)"
            // below silently did nothing and the header just stayed blank
            // forever instead of sending the user to sign in.
            if (!ok || data.error) {
                window.location.href = '/signin';
                return;
            }
            sessionStorage.setItem('userProfileData', JSON.stringify(data));
            updateUI(data);
        })
        .catch(error => console.error('Error fetching profile:', error));
    }

    // Function to update all UI elements with user data (Header and Drawer)
    function updateUI(data) {
        // BUG FIX: profile-pic/drawer-profile-pic only ever got a src set
        // when data.profile_picture was truthy -- a user with none left
        // both <img> tags at src="" (which makes the browser re-request
        // the current page itself as an "image") instead of showing
        // anything sensible. Same inline-SVG placeholder used everywhere
        // else in the app now covers that case.
        document.getElementById('profile-pic').src = data.profile_picture || DEFAULT_PROFILE_PIC;
        document.getElementById('drawer-profile-pic').src = data.profile_picture || DEFAULT_PROFILE_PIC;

        // Update user names (header and drawer)
        if (data.name) {
            document.getElementById('user-name').textContent = data.name;
            document.getElementById('drawer-user-name').textContent = data.name;
        }

        // Update usernames (header and drawer)
        if (data.username) {
            document.getElementById('username').textContent = data.username;
            document.getElementById('drawer-username').textContent = data.username;
        }

        // Update header stats
        if (data.streaks !== undefined) {
            const streaksCountElement = document.getElementById('streaks-count');
            streaksCountElement.textContent = data.streaks;
            
            const colorClasses = ['text-gray-500', 'text-orange-500', 'text-amber-500', 'text-lime-500', 'text-green-500', 'text-cyan-500', 'text-blue-500', 'text-purple-500'];
            streaksCountElement.classList.remove(...colorClasses);

            if (data.streaks === 0) streaksCountElement.classList.add('text-gray-500');
            else if (data.streaks <= 9) streaksCountElement.classList.add('text-orange-500');
            else if (data.streaks <= 24) streaksCountElement.classList.add('text-amber-500');
            else if (data.streaks <= 49) streaksCountElement.classList.add('text-lime-500');
            else if (data.streaks <= 74) streaksCountElement.classList.add('text-green-500');
            else if (data.streaks <= 99) streaksCountElement.classList.add('text-cyan-500');
            else if (data.streaks <= 199) streaksCountElement.classList.add('text-blue-500');
            else streaksCountElement.classList.add('text-purple-500');
        }

        if (data.coins !== undefined) {
            document.getElementById('coins-count').textContent = data.coins;
        }

        if (data.hp !== undefined) {
            document.getElementById('hp-count').textContent = data.hp;
        }
    }
    
    // ---DRAWER AND MODAL EVENT LISTENERS---

    // Open drawer when header profile button is clicked
    if (profileHeaderBtn) {
        profileHeaderBtn.addEventListener('click', () => {
            if (profileDrawer) profileDrawer.classList.add('is-open');
        });
    }

    // Close drawer when the close button is clicked
    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', () => {
            if (profileDrawer) profileDrawer.classList.remove('is-open');
        });
    }

    // Close drawer when the overlay is clicked
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', () => {
            if (profileDrawer) profileDrawer.classList.remove('is-open');
        });
    }

    // Open full-screen image modal when drawer profile picture is clicked
    if (drawerProfilePic) {
        drawerProfilePic.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevents the drawer from closing
            if (imageViewerModal && this.src) {
                fullViewImage.src = this.src;
                imageViewerModal.classList.add('is-visible');
            }
        });
    }
    
    // Close the image modal when it's clicked
    if (imageViewerModal) {
        imageViewerModal.addEventListener('click', () => {
            imageViewerModal.classList.remove('is-visible');
        });
    }

    // BUG FIX (new): "ویرایش پروفایل" in the drawer is a plain href="#" with
    // no id and no click handler anywhere -- a dead link, the same class of
    // bug already fixed in quiz-options.js/single-player-quiz.js/
    // game-island.js/userprofile.js (all of which give this same link an
    // id to hook into). education.html doesn't give it one, so it's
    // selected here by its position in the drawer's nav instead (first
    // link = edit profile, per the drawer's markup order). This is more
    // fragile than an id -- if education.html's drawer links are ever
    // reordered, this needs to be updated to match.
    const drawerEditProfileLink = profileDrawer
        ? profileDrawer.querySelector('nav a')
        : null;
    if (drawerEditProfileLink) {
        drawerEditProfileLink.addEventListener('click', (event) => {
            event.preventDefault();
            loadScript('/quiz/profile.js');
        });
    }
    // "تنظیمات" and "خروج از حساب" are intentionally left unwired: there's
    // no settings page and no /logout route anywhere in app.py to clear
    // the session cookie from, same as every other page in this app.

    // ---HELP MODAL LOGIC---
    const helpButton = document.getElementById('help-button');
    const helpModal = document.getElementById('help-modal');
    const closeHelpModalBtn = document.getElementById('close-help-modal');

    if (helpButton && helpModal) {
        helpButton.addEventListener('click', () => {
            helpModal.classList.remove('hidden'); // Show modal
        });
    }

    if (closeHelpModalBtn && helpModal) {
        closeHelpModalBtn.addEventListener('click', () => {
            helpModal.classList.add('hidden'); // Hide modal
        });
    }
    
    // Also hide modal if user clicks on the dark background
    if (helpModal) {
        helpModal.addEventListener('click', function(event) {
            if (event.target === helpModal) {
                helpModal.classList.add('hidden');
            }
        });
    }


    // ---PAGE-SPECIFIC LOGIC---

    // Load profile information when the page loads
    loadProfileInfo();

    // Handle footer navigation
    const tabs = document.querySelectorAll('footer button');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switch(tabName) {
                case 'home':
                    window.location.href = '/quiz/';
                    break;
                case 'game-island':
                    window.location.href = '/quiz/game-island.html';
                    break;
                case 'education':
                    // Do nothing, already on this page.
                    break;
                case 'ranking':
                    window.location.href = '/quiz/ranking.html';
                    break;
                case 'profile':
                    // BUG FIX: this used to just open the profile drawer --
                    // a small popup -- while every other page's footer
                    // "profile" tab (quiz-options.js, single-player-quiz.js,
                    // game-island.js, userprofile.js, science.js) navigates
                    // to the real, dedicated profile page (stats, quiz
                    // history, score chart). The same icon in the same
                    // footer position did two different things depending on
                    // which page you were on. Matched to the rest of the
                    // app; the header's own profile button still opens the
                    // drawer, unchanged.
                    loadScript('/quiz/profile.js');
                    break;
            }
        });
    });

    // Handle clicks on education category cards
    //
    // BUG FIX (critical): this used to do
    // `window.location.href = \`${subject}.js\`` -- navigating the whole
    // browser tab to a relative URL ending in ".js". That's not "open this
    // subject's page"; it sends the browser to fetch e.g. /quiz/math.js as
    // the document itself, which just displays (or downloads) the raw
    // JavaScript source text -- the script is never executed, so none of
    // its console.log/alert ever ran, and the entire education page
    // (header, footer, drawer, help modal) was destroyed just to show
    // plain text. Every other page-builder script in this app loads a
    // target script by injecting it as an actual <script> tag
    // (loadScript()); this now does the same, so the subject script
    // actually runs instead of being displayed as text.
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const subject = this.getAttribute('data-subject');
            if (subject) {
                loadScript(`/quiz/${subject}.js`);
            }
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEducationPage);
} else {
    initEducationPage();
}