// This script, quiz-options.js, dynamically creates the quiz selection page.
// It now includes a back button and full profile drawer functionality.
//
// BUG FIX: this file's top-level `const`/`function` declarations used to sit
// directly in the shared global (script) scope. loadScript() (see below,
// and in scripts.js/premiumplans.js/single-player-quiz.js/two-player-quiz.js)
// navigates by injecting this file as a fresh <script> tag and later
// removing that tag -- but removing the <script> node does NOT erase the
// `const DEFAULT_PROFILE_PIC` lexical binding it already created. So the
// moment a user left this page and came back to it (quiz-options -> single
// player quiz -> back -> quiz-options again), the second injection
// re-parsed the same `const DEFAULT_PROFILE_PIC` in the same scope and
// threw "Uncaught SyntaxError: Identifier 'DEFAULT_PROFILE_PIC' has already
// been declared", which aborts the whole script before a single line of it
// runs. Wrapping everything in an IIFE gives each load of this file its own
// fresh function scope, same fix already used in single-player-quiz.js/
// remedial-test.js/progress-test.js/multiPlayer.js.
(function() {

// Create and append the main structure for the quiz options page
function createQuizOptionsPage() {
  // Clear existing content and set up the basic page structure
  document.body.innerHTML = '';
  document.head.innerHTML = `
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>انتخاب آزمون | کوییزینو</title>
      <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/font-face.css" rel="stylesheet" type="text/css" />
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
          /* Custom font and base styles */
          body { font-family: 'Vazir', sans-serif; }
          /* Styles for the Drawer, ensuring it works on this dynamic page */
          .drawer { visibility: hidden; opacity: 0; transition: visibility 0s 0.3s, opacity 0.3s ease-in-out; }
          .drawer.is-open { visibility: visible; opacity: 1; transition: opacity 0.3s ease-in-out; }
          .drawer-panel { transform: translateX(100%); transition: transform 0.3s ease-in-out; }
          .drawer.is-open .drawer-panel { transform: translateX(0); }
          /* Styles for the full-screen image modal */
          .image-modal { visibility: hidden; opacity: 0; transition: opacity 0.3s ease-in-out; }
          .image-modal.is-visible { visibility: visible; opacity: 1; }
      </style>
  `;

  // **CORRECTION START**
  // Create and append the SweetAlert2 script tag programmatically to ensure it executes.
  //
  // BUG FIX: this used to just insert the <script> tag with no way to know
  // when (or whether) it actually finished downloading. If the user clicked
  // "آزمون دلخواه" / "ساخت آزمون کنکور" before the CDN request completed
  // (very plausible on a slow connection, since those buttons are already
  // clickable the instant the page renders), showPremiumDialog() called
  // Swal.fire(...) while `Swal` was still undefined and threw a
  // ReferenceError, silently killing the dialog. window.__sweetAlertReady
  // is now tracked so showPremiumDialog() can wait for it instead.
  window.__sweetAlertReady = false;
  const sweetAlertScript = document.createElement('script');
  sweetAlertScript.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
  sweetAlertScript.onload = () => { window.__sweetAlertReady = true; };
  document.head.appendChild(sweetAlertScript);
  // **CORRECTION END**


  // Create main container
  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gray-50 font-vazir text-right';

  // Header structure, identical to the main page for consistency
  const header = document.createElement('header');
  header.className = 'flex justify-between items-center p-4 bg-white shadow-sm';
  header.innerHTML = `
      <div id="profile-header-button" class="flex items-center gap-2 cursor-pointer">
          <div class="relative w-10 h-10 rounded-full overflow-hidden">
              <img id="profile-pic" src="" alt="Profile" class="object-cover" width="40" height="40">
          </div>
          <div>
              <h2 id="user-name" class="text-sm font-bold"></h2>
              <span id="username" class="text-xs text-blue-500"></span>
          </div>
      </div>
      <div class="flex items-center gap-4">
          <div class="flex items-center gap-1" title="Streaks">
              <span id="streaks-count" class="font-bold">0</span>
              <span class="text-xl">🔥</span>
          </div>
          <div class="flex items-center gap-1" title="Coins">
              <span id="coins-count" class="font-bold text-amber-500">0</span>
              <span class="text-xl">🪙</span>
          </div>
          <div class="flex items-center gap-1" title="Health">
              <span id="hp-count" class="font-bold text-red-500">0</span>
              <span class="text-xl">❤️</span>
          </div>
      </div>
  `;

  // Main content with a new Back button next to the title
  const main = document.createElement('main');
  main.className = 'p-4 space-y-6';
  main.innerHTML = `
      <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold">انتخاب نوع آزمون</h2>
          <button id="back-btn" title="بازگشت" class="text-gray-600 hover:text-blue-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-7 h-7">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
          </button>
      </div>
      <div class="space-y-4">
          <button id="single-player-quiz" class="w-full bg-blue-500 text-white rounded-xl py-3 text-lg font-bold hover:bg-blue-600 transition">
              آزمون تک نفره کنکور
          </button>
          <button id="two-player-quiz" class="w-full bg-green-500 text-white rounded-xl py-3 text-lg font-bold hover:bg-green-600 transition">
              آزمون دو نفره کنکور
          </button>
          <button id="custom-quiz" class="w-full bg-yellow-500 text-white rounded-xl py-3 text-lg font-bold hover:bg-yellow-600 transition flex items-center justify-center">
              <span>آزمون دلخواه</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-lock mr-2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </button>
          <button id="create-quiz" class="w-full bg-purple-500 text-white rounded-xl py-3 text-lg font-bold hover:bg-purple-600 transition flex items-center justify-center">
              <span>ساخت آزمون کنکور</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-lock mr-2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </button>
      </div>
  `;

  // Footer navigation, identical to the main page
  const footer = document.createElement('footer');
  footer.className = 'fixed bottom-0 left-0 right-0 bg-white border-t';
  footer.innerHTML = `
      <nav class="flex justify-around p-3">
          <button class="flex flex-col items-center gap-1 text-gray-500" data-tab="home">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span class="text-xs">خانه</span>
          </button>
          <button class="flex flex-col items-center gap-1 text-gray-500" data-tab="game-island">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
              <span class="text-xs">جزیره بازی</span>
          </button>
          <button class="flex flex-col items-center gap-1 text-gray-500" data-tab="education">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              <span class="text-xs">آموزش</span>
          </button>
          <button class="flex flex-col items-center gap-1 text-gray-500" data-tab="ranking">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
              <span class="text-xs">رتبه‌بندی</span>
          </button>
          <button class="flex flex-col items-center gap-1 text-gray-500" data-tab="profile">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span class="text-xs">پروفایل</span>
          </button>
      </nav>
  `;

  // Add the Profile Drawer and Image Modal HTML to the page
  const drawerAndModalHTML = `
    <div id="profile-drawer" class="drawer fixed inset-0 z-50">
        <div id="drawer-overlay" class="absolute inset-0 bg-black/50"></div>
        <div class="drawer-panel absolute top-0 right-0 h-full w-72 bg-white shadow-xl p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold">پروفایل کاربری</h2>
                <button id="close-drawer-btn" class="text-gray-500 hover:text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="space-y-4">
                 <div class="flex flex-col items-center space-y-2 border-b pb-4">
                    <div class="relative w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500 cursor-pointer">
                        <img id="drawer-profile-pic" src="" alt="Profile" class="object-cover w-full h-full">
                    </div>
                    <h3 id="drawer-user-name" class="text-lg font-bold"></h3>
                    <p id="drawer-username" class="text-sm text-gray-500"></p>
                </div>
                <nav class="space-y-2" id="drawer-nav-links">
                    <a href="#" id="drawer-edit-profile" class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition"><span>✏️</span><span>ویرایش پروفایل</span></a>
                    <a href="#" class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition"><span>⚙️</span><span>تنظیمات</span></a>
                    <a href="#" class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition text-red-500"><span>🚪</span><span>خروج از حساب</span></a>
                </nav>
            </div>
        </div>
    </div>
    <div id="image-viewer-modal" class="image-modal fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 cursor-pointer">
        <img id="full-view-image" src="" alt="Full view profile picture" class="max-w-full max-h-full rounded-lg shadow-xl">
    </div>
  `;
  
  // Append all elements
  container.appendChild(header);
  container.appendChild(main);
  container.appendChild(footer);
  container.insertAdjacentHTML('beforeend', drawerAndModalHTML); // Safely add the drawer/modal HTML
  document.body.appendChild(container);

  // Load data and set up interactions
  populateHeaderAndDrawerFromSession();
  setupEventListeners();
}

// BUG FIX: 'default-profile-pic.png'-style problem -- neither <img> here
// ever had a fallback, so a user with no profile_picture got a permanently
// broken image icon (or, worse, an empty src="" that makes the browser
// re-request the current page as an "image"). Same self-contained inline
// SVG placeholder used in the fixed profile.js.
const DEFAULT_PROFILE_PIC =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
        '<circle cx="50" cy="50" r="50" fill="#ccc"/>' +
        '<circle cx="50" cy="38" r="18" fill="#fff"/>' +
        '<path d="M20 90c0-22 60-22 60 0" fill="#fff"/>' +
        '</svg>'
    );

// Populate header and drawer with user data from session storage
//
// BUG FIX: this used to only ever read sessionStorage and, if
// 'userProfileData' wasn't there yet, just console.error'd and left the
// header/drawer permanently blank -- there was no way to recover. Every
// comparable page (scripts.js, education.js, two-player-quiz.js) falls back
// to fetching /quiz/get_profile directly when the cache is empty; this now
// does the same instead of giving up.
function populateHeaderAndDrawerFromSession() {
    const userDataString = sessionStorage.getItem('userProfileData');
    if (userDataString) {
        applyProfileData(JSON.parse(userDataString));
        return;
    }

    fetch('/quiz/get_profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error fetching profile:', data.error);
                return;
            }
            sessionStorage.setItem('userProfileData', JSON.stringify(data));
            applyProfileData(data);
        })
        .catch(error => console.error('Error fetching profile:', error));
}

function applyProfileData(data) {
        // Populate profile pictures in header and drawer (falls back to a
        // placeholder instead of being left blank/broken).
        document.getElementById('profile-pic').src = data.profile_picture || DEFAULT_PROFILE_PIC;
        document.getElementById('drawer-profile-pic').src = data.profile_picture || DEFAULT_PROFILE_PIC;

        // Populate names in header and drawer
        if (data.name) {
            document.getElementById('user-name').textContent = data.name;
            document.getElementById('drawer-user-name').textContent = data.name;
        }
        // Populate usernames in header and drawer
        if (data.username) {
            document.getElementById('username').textContent = data.username;
            document.getElementById('drawer-username').textContent = data.username;
        }
        
        // Populate coins and HP
        if (data.coins !== undefined) document.getElementById('coins-count').textContent = data.coins;
        if (data.hp !== undefined) document.getElementById('hp-count').textContent = data.hp;

        // Populate streaks and set color dynamically
        if (data.streaks !== undefined) {
            const streaksCountElement = document.getElementById('streaks-count');
            const streaks = data.streaks;
            streaksCountElement.textContent = streaks;

            const colorClasses = ['text-gray-500', 'text-orange-500', 'text-amber-500', 'text-lime-500', 'text-green-500', 'text-cyan-500', 'text-blue-500', 'text-purple-500'];
            streaksCountElement.classList.remove(...colorClasses);

            if (streaks === 0) streaksCountElement.classList.add('text-gray-500');
            else if (streaks <= 9) streaksCountElement.classList.add('text-orange-500');
            else if (streaks <= 24) streaksCountElement.classList.add('text-amber-500');
            else if (streaks <= 49) streaksCountElement.classList.add('text-lime-500');
            else if (streaks <= 74) streaksCountElement.classList.add('text-green-500');
            else if (streaks <= 99) streaksCountElement.classList.add('text-cyan-500');
            else if (streaks <= 199) streaksCountElement.classList.add('text-blue-500');
            else streaksCountElement.classList.add('text-purple-500');
        }
}

// Set up all event listeners for the page
function setupEventListeners() {
    // Back button to return to the home page
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '/quiz/';
    });

    // Drawer functionality
    const drawer = document.getElementById('profile-drawer');
    const openDrawerBtn = document.getElementById('profile-header-button');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const drawerOverlay = document.getElementById('drawer-overlay');

    openDrawerBtn.addEventListener('click', () => drawer.classList.add('is-open'));
    closeDrawerBtn.addEventListener('click', () => drawer.classList.remove('is-open'));
    drawerOverlay.addEventListener('click', () => drawer.classList.remove('is-open'));

    // Image viewer modal functionality
    const imageModal = document.getElementById('image-viewer-modal');
    const fullViewImage = document.getElementById('full-view-image');
    const drawerProfilePic = document.getElementById('drawer-profile-pic');

    drawerProfilePic.addEventListener('click', () => {
        fullViewImage.src = drawerProfilePic.src;
        imageModal.classList.add('is-visible');
    });
    imageModal.addEventListener('click', () => imageModal.classList.remove('is-visible'));

    // Premium features dialog
    const showPremiumDialog = () => {
        // BUG FIX: guard against Swal not being loaded yet (see the
        // sweetAlertScript.onload fix above) instead of letting this throw.
        if (typeof Swal === 'undefined' || !window.__sweetAlertReady) {
            setTimeout(showPremiumDialog, 100);
            return;
        }
        Swal.fire({
            title: 'ویژگی پرمیوم',
            text: "برای فعال سازی این قابلیت نیاز به اکانت پرمیموم دارید. برای مشاهده گزینه ی مشاهده را کلیک کنید",
            icon: 'info',
            confirmButtonText: 'مشاهده',
            cancelButtonText: 'بستن',
            showCancelButton: true,
            reverseButtons: true,
        }).then((result) => {
            if (result.isConfirmed) loadScript('/quiz/premiumplans.js');
        });
    };
    document.getElementById('custom-quiz').addEventListener('click', showPremiumDialog);
    document.getElementById('create-quiz').addEventListener('click', showPremiumDialog);
  
    // Quiz button event listeners
    document.getElementById('single-player-quiz').addEventListener('click', () => loadScript('/quiz/single-player-quiz.js'));
    document.getElementById('two-player-quiz').addEventListener('click', () => loadScript('/quiz/two-player-quiz.js'));

    // BUG FIX: "ویرایش پروفایل" (edit profile) was an href="#" with no
    // click handler at all -- a dead link. Wired it to the real profile
    // page, which already exists and works.
    // NOTE: "تنظیمات" (settings) and "خروج از حساب" (logout) are left
    // unwired on purpose rather than faked: there is no settings page
    // anywhere in this app, and app.py has no /logout route to actually
    // clear the (HttpOnly) session cookie, so neither can be made to work
    // from this file alone.
    document.getElementById('drawer-edit-profile').addEventListener('click', (event) => {
        event.preventDefault();
        loadScript('/quiz/profile.js');
    });

    // Footer navigation
    //
    // BUG FIX: three of these five tabs were broken, each in a different way:
    //  - 'game-island' loaded '/quiz/game-island.js' as a <script> -- but
    //    that file is actually raw HTML (starts with <!DOCTYPE html>), not
    //    JavaScript, so the browser throws a syntax error and nothing
    //    happens.
    //  - 'ranking' loaded '/quiz/ranking.js', which doesn't exist anywhere
    //    in this project at all (only ranking.html does) -- a guaranteed
    //    404 that fails silently.
    //  - 'education' loaded '/quiz/education.js' via loadScript(), which IS
    //    real JS, but its entire body is wrapped in
    //    `document.addEventListener('DOMContentLoaded', ...)`. That event
    //    already fired long before this page was dynamically injected, so
    //    the listener is registered but never runs -- clicking "آموزش" did
    //    nothing at all.
    // scripts.js (the home page) already does this correctly by using a
    // real page navigation to the static .html file for all three, and only
    // uses loadScript() for 'profile' (profile.js isn't DOMContentLoaded-
    // gated, so dynamic injection works fine for it). Matched that here.
    document.querySelectorAll('footer button').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switch(tabName) {
                case 'home': window.location.href = '/quiz/'; break;
                case 'game-island': window.location.href = '/quiz/game-island.html'; break;
                case 'education': window.location.href = '/quiz/education.html'; break;
                case 'ranking': window.location.href = '/quiz/ranking.html'; break;
                case 'profile': loadScript('/quiz/profile.js'); break;
            }
        });
    });
}

// Utility function to load other scripts
function loadScript(scriptName) {
  const existingScript = document.querySelector(`script[src="${scriptName}"]`);
  if (existingScript) existingScript.remove();
  
  const script = document.createElement('script');
  script.src = scriptName;
  document.body.appendChild(script);
}

// Initialize the page on script load
createQuizOptionsPage();

})();