// biology.js
//
// RESTYLE: this file used to render everything with raw inline `style="..."`
// attributes and English copy ("Back", "Question 1", "Submit", "Your Score:
// X%", ...) -- no Tailwind, no Vazir font, no header/footer/profile drawer,
// completely inconsistent with the rest of the app (compare to
// single-player-quiz.js, the "آزمون تک نفره" page). Rebuilt from scratch on
// that same page shell (header with profile/streak/coins/HP, footer nav,
// profile drawer, image modal) and on konkur-welcome.js's Tailwind quiz-
// taking flow (welcome -> instructions -> question cards -> results), so
// this page now looks and behaves like every other quiz page in the app.
// The underlying logic (fetch by category, start_quiz, submit_quiz_results,
// localStorage keys) is unchanged from before -- only the markup/styling and
// a couple of small, closely-related fixes noted below.
//
// BUG FIX: like single-player-quiz.js/remedial-test.js/progress-test.js/
// multiPlayer.js, this file is loaded by loadScript() (a <script> tag swap,
// not a full page reload) from the home page's "زیست" button. Its old
// top-level `const BIOLOGY_CATEGORY = ...` sat directly in the shared
// global scope, so re-injecting this file (e.g. double-clicking the "زیست"
// button before the first click's DOM swap finishes) would throw "Identifier
// has already been declared" and abort the whole script before anything
// rendered. Wrapped in an IIFE, same fix already used on those other pages.
(function() {

const BIOLOGY_CATEGORY = 'Biology';

// BUG FIX: neither <img id="profile-pic"> nor <img id="drawer-profile-pic">
// had a fallback before, so a user with no profile picture got a broken
// image icon. Same self-contained inline SVG placeholder used everywhere
// else in the app (profile.js, quiz-options.js, single-player-quiz.js).
const DEFAULT_PROFILE_PIC =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
        '<circle cx="50" cy="50" r="50" fill="#ccc"/>' +
        '<circle cx="50" cy="38" r="18" fill="#fff"/>' +
        '<path d="M20 90c0-22 60-22 60 0" fill="#fff"/>' +
        '</svg>'
    );

let biologyQuizStarting = false;
let biologyCheckTimeInterval = null;
let biologySubmitting = false;

// Build the quiz-selection page: header (profile/streak/coins/HP), title,
// back button, quiz-button grid, footer nav, profile drawer, image modal --
// identical shell to single-player-quiz.js / science.js.
function showBiologyPage() {
    document.body.innerHTML = '';
    document.head.innerHTML = `
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>زیست | کوییزینو</title>
        <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/font-face.css" rel="stylesheet" type="text/css" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { font-family: 'Vazir', sans-serif; }
            .drawer { visibility: hidden; opacity: 0; transition: visibility 0s 0.3s, opacity 0.3s ease-in-out; }
            .drawer.is-open { visibility: visible; opacity: 1; transition: opacity 0.3s ease-in-out; }
            .drawer-panel { transform: translateX(100%); transition: transform 0.3s ease-in-out; }
            .drawer.is-open .drawer-panel { transform: translateX(0); }
            .image-modal { visibility: hidden; opacity: 0; transition: opacity 0.3s ease-in-out; }
            .image-modal.is-visible { visibility: visible; opacity: 1; }
        </style>
    `;

    const container = document.createElement('div');
    container.className = 'min-h-screen bg-gray-50 font-vazir text-right';

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

    const main = document.createElement('main');
    main.className = 'p-4 space-y-6';
    main.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-blue-700">آزمون‌های زیست 🧬</h2>
            <button id="back-btn" title="بازگشت" class="text-gray-600 hover:text-blue-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-7 h-7">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
            </button>
        </div>
        <div id="quiz-buttons" class="grid grid-cols-2 gap-4">
            <div class="w-full bg-gray-200 animate-pulse rounded-xl h-[60px]"></div>
            <div class="w-full bg-gray-200 animate-pulse rounded-xl h-[60px]"></div>
        </div>
    `;

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
                    <nav class="space-y-2">
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

    container.appendChild(header);
    container.appendChild(main);
    container.appendChild(footer);
    container.insertAdjacentHTML('beforeend', drawerAndModalHTML);
    document.body.appendChild(container);

    populateBiologyHeaderAndDrawer();
    fetchBiologyQuizzes();
    setupBiologyPageEventListeners();
}

// Populate header + drawer from cached session data, falling back to
// /quiz/get_profile if the cache is empty (same pattern as every other
// page-builder script in this app).
function populateBiologyHeaderAndDrawer() {
    const userDataString = sessionStorage.getItem('userProfileData');
    if (userDataString) {
        applyBiologyProfileData(JSON.parse(userDataString));
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
            applyBiologyProfileData(data);
        })
        .catch(error => console.error('Error fetching profile:', error));
}

function applyBiologyProfileData(data) {
    document.getElementById('profile-pic').src = data.profile_picture || DEFAULT_PROFILE_PIC;
    document.getElementById('drawer-profile-pic').src = data.profile_picture || DEFAULT_PROFILE_PIC;
    if (data.name) {
        document.getElementById('user-name').textContent = data.name;
        document.getElementById('drawer-user-name').textContent = data.name;
    }
    if (data.username) {
        document.getElementById('username').textContent = data.username;
        document.getElementById('drawer-username').textContent = data.username;
    }
    if (data.coins !== undefined) document.getElementById('coins-count').textContent = data.coins;
    if (data.hp !== undefined) document.getElementById('hp-count').textContent = data.hp;

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

// Fetch this subject's quizzes (same /quiz/get_quizzes_by_category endpoint
// as before) and render them as the same styled button grid used across the
// app, instead of the old bare unstyled <button>s.
function fetchBiologyQuizzes() {
    fetch(`/quiz/get_quizzes_by_category/${encodeURIComponent(BIOLOGY_CATEGORY)}`)
        .then(response => response.json())
        .then(quizzes => {
            const quizButtonsContainer = document.getElementById('quiz-buttons');
            if (quizzes.length > 0) {
                quizButtonsContainer.innerHTML = quizzes.map(quiz => `
                    <button
                        class="biology-quiz-btn bg-blue-500 text-white rounded-xl py-3 text-lg font-bold hover:bg-blue-600 transition shadow-md flex items-center justify-center"
                        data-quiz="${quiz}">
                        ${quiz}
                    </button>
                `).join('');
            } else {
                quizButtonsContainer.innerHTML = `<p class="col-span-2 text-center text-gray-500">در حال حاضر آزمونی برای زیست وجود ندارد.</p>`;
            }
            setupBiologyQuizButtonListeners();
        })
        .catch(error => {
            console.error('Error fetching quizzes:', error);
            document.getElementById('quiz-buttons').innerHTML = `<p class="col-span-2 text-center text-red-500">خطا در بارگذاری آزمون‌ها.</p>`;
        });
}

function setupBiologyQuizButtonListeners() {
    document.querySelectorAll('.biology-quiz-btn').forEach(button => {
        button.addEventListener('click', () => {
            loadBiologyQuizFlow(button.dataset.quiz);
        });
    });
}

function setupBiologyPageEventListeners() {
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '/quiz/';
    });

    const drawer = document.getElementById('profile-drawer');
    document.getElementById('profile-header-button').addEventListener('click', () => drawer.classList.add('is-open'));
    document.getElementById('close-drawer-btn').addEventListener('click', () => drawer.classList.remove('is-open'));
    document.getElementById('drawer-overlay').addEventListener('click', () => drawer.classList.remove('is-open'));

    const imageModal = document.getElementById('image-viewer-modal');
    const fullViewImage = document.getElementById('full-view-image');
    const drawerProfilePic = document.getElementById('drawer-profile-pic');
    drawerProfilePic.addEventListener('click', () => {
        fullViewImage.src = drawerProfilePic.src;
        imageModal.classList.add('is-visible');
    });
    imageModal.addEventListener('click', () => imageModal.classList.remove('is-visible'));

    document.getElementById('drawer-edit-profile').addEventListener('click', (event) => {
        event.preventDefault();
        loadScript('/quiz/profile.js');
    });
    // "تنظیمات" and "خروج از حساب" intentionally left unwired, same as every
    // other page's drawer: there's no settings page and no /logout route
    // anywhere in app.py to clear the session cookie from.

    document.querySelectorAll('footer button').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switch (tabName) {
                case 'home': window.location.href = '/quiz/'; break;
                case 'game-island': window.location.href = '/quiz/game-island.html'; break;
                case 'education': window.location.href = '/quiz/education.html'; break;
                case 'ranking': window.location.href = '/quiz/ranking.html'; break;
                case 'profile': loadScript('/quiz/profile.js'); break;
            }
        });
    });
}

// --- Quiz-taking flow: welcome -> instructions -> questions -> results,
// styled like konkur-welcome.js (Tailwind cards, Persian copy) instead of
// the old plain/English "Welcome to X Quiz!" / "Tap to start" / "Question 1"
// screens. Same start_quiz / submit_quiz_results calls and localStorage keys
// as before, so nothing about how quizzes are recorded has changed --
// Biology is still sent on both calls, unlike konkur-welcome.js's own
// flow (which hardcodes category "all" and isn't used here for that reason).

function loadBiologyQuizFlow(quizName) {
    document.body.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'min-h-screen bg-gray-50 font-vazir text-right flex flex-col';

    const main = document.createElement('main');
    main.className = 'flex-grow flex items-center justify-center p-4';
    main.innerHTML = `
        <div id="biology-welcome-page" class="text-center">
            <h2 class="text-3xl font-bold mb-6 text-blue-700">به آزمون ${quizName} خوش آمدید!</h2>
            <button id="biology-continue-btn" class="bg-blue-500 text-white px-8 py-4 rounded-xl text-xl font-bold hover:bg-blue-600 transition shadow-md">
                ادامه
            </button>
        </div>

        <div id="biology-instruction-page" class="text-center hidden">
            <div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
                <h2 class="text-2xl font-bold mb-6 text-green-700">شما ۱۰ دقیقه وقت دارید تا به سوالات پاسخ دهید</h2>
                <p class="text-gray-700 mb-4">لطفاً با دقت و تمرکز به سوالات پاسخ دهید. موفق باشید!</p>
                <button id="biology-start-quiz-btn" class="bg-green-500 text-white px-8 py-4 rounded-xl text-xl font-bold hover:bg-green-600 transition shadow-md">
                    برای شروع کلیک کنید
                </button>
            </div>
        </div>

        <div id="biology-quiz-page" class="hidden w-full"></div>
    `;

    container.appendChild(main);
    document.body.appendChild(container);

    const welcomePage = document.getElementById('biology-welcome-page');
    const instructionPage = document.getElementById('biology-instruction-page');
    const startQuizBtn = document.getElementById('biology-start-quiz-btn');
    const quizPage = document.getElementById('biology-quiz-page');

    document.getElementById('biology-continue-btn').addEventListener('click', () => {
        welcomePage.classList.add('hidden');
        instructionPage.classList.remove('hidden');
    });

    startQuizBtn.addEventListener('click', () => {
        // BUG FIX (new, same class of guard already used elsewhere in this
        // app): stops a double-click on "برای شروع کلیک کنید" from firing
        // two concurrent /quiz/start_quiz requests / timers.
        if (biologyQuizStarting) return;
        biologyQuizStarting = true;
        startQuizBtn.disabled = true;

        fetch('/quiz/start_quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quiz: quizName, category: BIOLOGY_CATEGORY }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.questions && data.questions.length > 0) {
                    localStorage.setItem('currentQuizName', quizName);
                    localStorage.setItem('currentQuizCategory', BIOLOGY_CATEGORY);
                    localStorage.setItem('currentQuiz', JSON.stringify(data.questions));
                    // allQuestionIds is required by /quiz/submit_quiz_results;
                    // captured here right after start_quiz succeeds.
                    localStorage.setItem('allQuestionIds', JSON.stringify(data.questions.map(q => q.id)));
                    localStorage.setItem('totalQuestions', data.questions.length);
                    localStorage.setItem('userAnswers', JSON.stringify({}));

                    const startTime = new Date();
                    localStorage.setItem('quizStartTime', startTime.toISOString());
                    const countdownDuration = 10 * 60 * 1000;
                    localStorage.setItem('quizEndTime', new Date(startTime.getTime() + countdownDuration).toISOString());

                    instructionPage.classList.add('hidden');
                    quizPage.classList.remove('hidden');
                    displayBiologyQuiz(data.questions, quizPage);
                } else {
                    instructionPage.innerHTML = `
                        <div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
                            <p class="text-gray-500 mb-4">در حال حاضر سوالی برای این آزمون یافت نشد.</p>
                            <button id="biology-no-questions-back" class="bg-blue-500 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-blue-600 transition shadow-md">بازگشت</button>
                        </div>
                    `;
                    document.getElementById('biology-no-questions-back').addEventListener('click', showBiologyPage);
                }
            })
            .catch(error => {
                console.error('Error starting quiz:', error);
                instructionPage.innerHTML = `<p class="text-center text-red-500">متاسفیم، مشکلی در بارگیری آزمون پیش آمد.</p>`;
            });
    });
}

function displayBiologyQuiz(questions, quizPage) {
    let currentIndex = 0;
    let userAnswers = JSON.parse(localStorage.getItem('userAnswers')) || {};

    function formatRemaining() {
        const remainingMs = new Date(localStorage.getItem('quizEndTime')) - new Date();
        const minutes = Math.max(0, Math.floor(remainingMs / 60000));
        const seconds = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // BUG FIX (kept from the previous version): the interval id is stored at
    // module scope (not a local variable) so it can be cleared from
    // submitBiologyQuiz() on early completion too -- otherwise it could
    // still fire showBiologyTimeOverPage() a few seconds later and
    // silently replace the results screen the user is already looking at.
    biologyCheckTimeInterval = setInterval(() => {
        const remainingMs = new Date(localStorage.getItem('quizEndTime')) - new Date();
        if (remainingMs <= 0) {
            clearInterval(biologyCheckTimeInterval);
            biologyCheckTimeInterval = null;
            showBiologyTimeOverPage();
            return;
        }
        const timerEl = document.getElementById('biology-timer');
        if (timerEl) timerEl.textContent = formatRemaining();
    }, 1000);

    function showQuestion() {
        const question = questions[currentIndex];
        let options = [];
        if (typeof question.option === 'string') {
            try { options = JSON.parse(question.option); }
            catch (e) { options = question.option.split(',').map(opt => opt.trim()); }
        } else if (Array.isArray(question.option)) {
            options = question.option;
        }

        quizPage.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-3xl mx-auto">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-blue-700">سوال ${currentIndex + 1} از ${questions.length}</h2>
                    <span id="biology-timer" class="text-sm font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg">${formatRemaining()}</span>
                </div>
                ${question.image ? `<img src="${question.image}" alt="Question Image" class="mb-4 rounded-xl max-h-48 mx-auto">` : ''}
                <p class="text-gray-700 mb-6">${question.question}</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${options.map((option, index) => `
                        <label class="flex items-center p-3 bg-gray-100 rounded-xl hover:bg-gray-200 cursor-pointer transition duration-200">
                            <input type="radio" name="biology-answer" value="${index}" class="ml-3" ${userAnswers[question.id] === option ? 'checked' : ''}>
                            <span class="flex-1">${option}</span>
                            ${question[`option_${index + 1}_image`] ? `<img src="${question[`option_${index + 1}_image`]}" alt="Option Image" class="mr-3 max-h-16">` : ''}
                        </label>
                    `).join('')}
                </div>
                <div class="flex justify-between mt-8">
                    ${currentIndex > 0 ? `<button id="biology-prev-question" class="bg-gray-500 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-gray-600 transition shadow-md">قبلی</button>` : `<div></div>`}
                    <button id="biology-next-question" class="bg-blue-500 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-blue-600 transition shadow-md">
                        ${currentIndex === questions.length - 1 ? 'پایان آزمون' : 'بعدی'}
                    </button>
                </div>
            </div>
        `;

        document.querySelectorAll('input[name="biology-answer"]').forEach(radio => {
            radio.addEventListener('click', (e) => {
                const selectedOption = options[parseInt(e.target.value)];
                if (userAnswers[question.id] === selectedOption) {
                    e.target.checked = false;
                    delete userAnswers[question.id];
                } else {
                    userAnswers[question.id] = selectedOption;
                }
                localStorage.setItem('userAnswers', JSON.stringify(userAnswers));
            });
        });

        const prevBtn = document.getElementById('biology-prev-question');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentIndex--;
                showQuestion();
            });
        }

        document.getElementById('biology-next-question').addEventListener('click', () => {
            if (currentIndex === questions.length - 1) {
                submitBiologyQuiz(questions, quizPage);
            } else {
                currentIndex++;
                showQuestion();
            }
        });
    }

    showQuestion();
}

function showBiologyTimeOverPage() {
    document.body.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'min-h-screen bg-gray-50 font-vazir text-right flex items-center justify-center p-4';
    container.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
            <h2 class="text-2xl font-bold mb-4 text-red-600">زمان آزمون به پایان رسید</h2>
            <p class="text-gray-700 mb-6">متاسفانه زمان پاسخ‌گویی به سوالات تمام شد.</p>
            <button id="biology-time-over-home" class="bg-blue-500 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-blue-600 transition shadow-md">
                بازگشت به صفحه اصلی
            </button>
        </div>
    `;
    document.body.appendChild(container);
    document.getElementById('biology-time-over-home').addEventListener('click', () => {
        window.location.href = '/quiz/';
    });
}

function submitBiologyQuiz(questions, quizPage) {
    if (biologyCheckTimeInterval) {
        clearInterval(biologyCheckTimeInterval);
        biologyCheckTimeInterval = null;
    }
    // BUG FIX (kept from the previous version): guards against the "پایان
    // آزمون" button being double-clicked, which could otherwise fire two
    // concurrent /quiz/submit_quiz_results requests for one attempt.
    if (biologySubmitting) return;
    biologySubmitting = true;

    const quizName = localStorage.getItem('currentQuizName');
    const userAnswers = JSON.parse(localStorage.getItem('userAnswers') || '{}');
    const startTime = localStorage.getItem('quizStartTime');
    const duration = new Date() - new Date(startTime);
    const totalQuestions = parseInt(localStorage.getItem('totalQuestions'));
    const allQuestionIds = questions.map(q => q.id);

    fetch('/quiz/submit_quiz_results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quizName: quizName,
            category: BIOLOGY_CATEGORY,
            userAnswers: userAnswers,
            startTime: startTime,
            duration: duration,
            totalQuestions: totalQuestions,
            allQuestionIds: allQuestionIds
        }),
    })
        .then(response => response.json())
        .then(data => {
            quizPage.innerHTML = `
                <div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
                    <h2 class="text-2xl font-bold mb-6 text-green-700">نتیجه آزمون</h2>
                    <p class="text-gray-700 mb-4 text-xl">امتیاز شما: ${data.score}%</p>
                    <div class="text-right mx-auto w-fit space-y-2 my-6">
                        <p class="text-gray-700">تعداد کل سوالات: ${totalQuestions}</p>
                        <p class="text-green-600">پاسخ‌های صحیح: ${data.correctCount}</p>
                        <p class="text-red-600">پاسخ‌های غلط: ${data.incorrectCount}</p>
                        <p class="text-yellow-600">بدون پاسخ: ${data.unansweredCount}</p>
                    </div>
                    <button id="biology-back-to-home" class="bg-blue-500 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-blue-600 transition shadow-md">
                        بازگشت به صفحه اصلی
                    </button>
                </div>
            `;
            document.getElementById('biology-back-to-home').addEventListener('click', () => {
                window.location.href = '/quiz/';
            });
        })
        .catch(error => {
            console.error('Error submitting quiz results:', error);
            biologySubmitting = false;
        });
}

// Small local utility, same as single-player-quiz.js/science.js's own
// loadScript(), for the drawer's "ویرایش پروفایل" link and the footer's
// "پروفایل" tab.
function loadScript(scriptName) {
    const existingScript = document.querySelector(`script[src="${scriptName}"]`);
    if (existingScript) existingScript.remove();
    const script = document.createElement('script');
    script.src = scriptName;
    document.body.appendChild(script);
}

showBiologyPage();

})();