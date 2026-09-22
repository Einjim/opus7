// --- Global State ---
let questions = [];
let quizName = '';
let profilesData = {};
let currentUserId = null;
let otherUserId = null; // ID of the other player in the room
let userAnswers = {};
let currentQuestionIndex = 0;
let timerInterval = null;
let messageInterval = null; // For polling chat messages

// BUG FIX (new): the roomId is needed for the deterministic shuffle below
// (so both players in the same room land on the same question/option
// order) but it was never actually stored anywhere after initializeGame()
// received it as a parameter.
let currentRoomId = null;

// BUG FIX (new): guards against double-submission. startQuiz() previously
// had nothing stopping a user from double-clicking "برای شروع کلیک کنید"
// before the first /quiz/start_quiz response came back, which fired two
// concurrent quiz starts (and therefore two independent startTimer()
// intervals, only one of which the UI could ever reflect -- the other kept
// running invisibly in the background against a detached timer element).
// submitQuiz() had the equivalent problem: on the last question, clicking
// "پایان آزمون" again before the first /quiz/submit_quiz_results response
// arrived (the quiz page is only hidden inside that response's .then())
// fired a second, duplicate results submission. Both are guarded below.
let quizStarting = false;
let quizSubmitting = false;

// --- Deterministic per-room shuffling ---
//
// BUG FIX (the big one): /quiz/start_quiz shuffles both the question order
// and each question's option order fresh, server-side, on every single
// request. Since both players in a "shared" room each call this endpoint
// independently from their own browser, they were never actually seeing
// the same question in the same position, or the same options in the same
// order -- the two-player quiz wasn't actually shared at all. There is no
// backend/session state that stores one canonical shuffle per room, so
// fixing this from game.js alone means *not trusting* whatever order the
// server happened to return this time, and instead deterministically
// re-deriving the same order on both clients from something they already
// both know: the shared roomId. Sorting first (by id, then alphabetically)
// undoes the server's own randomization so both clients start from an
// identical baseline, then a seeded shuffle (seeded from roomId, so it's
// identical for both players in this room, but different from room to
// room) reorders everything the same way on both screens. Answers are
// still graded by comparing option *text*, not position, so reordering
// options here is always safe.

function hashStringToSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // force 32-bit
    }
    return hash >>> 0; // unsigned
}

function seededRandom(seed) {
    // mulberry32 -- small, fast, deterministic PRNG.
    let state = seed;
    return function () {
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function seededShuffle(array, seedString) {
    const rand = seededRandom(hashStringToSeed(seedString));
    const result = array.slice();
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function synchronizeQuestionsForRoom(rawQuestions, roomId) {
    const normalized = rawQuestions.slice().sort((a, b) => a.id - b.id);
    const orderedQuestions = seededShuffle(normalized, `room-${roomId}-question-order`);
    return orderedQuestions.map(q => {
        const options = parseOptions(q.option).slice().sort();
        const shuffledOptions = seededShuffle(options, `room-${roomId}-question-${q.id}-options`);
        return { ...q, option: JSON.stringify(shuffledOptions) };
    });
}

// --- Main Initialization Function ---
// This should be called with the room ID, e.g., window.initializeGame('some-room-id');
function initializeGame(roomId) {
    currentRoomId = roomId;

    // Fetch initial game and user data
    Promise.all([
        fetch(`/quiz/get_game_info/${roomId}`).then(response => response.json()),
        fetch('/quiz/get_user_id').then(response => response.json())
    ])
    .then(([gameData, userData]) => {
        // Set global state from fetched data
        quizName = gameData.quiz_name || 'Quiz';
        profilesData = { creator: gameData.creator, joiner: gameData.joiner };
        currentUserId = userData.success ? userData.user_id : null;

        // *** NEW: Determine the other user's ID for chat ***
        if (currentUserId && profilesData.creator && profilesData.joiner) {
            otherUserId = currentUserId === profilesData.creator.id ? profilesData.joiner.id : profilesData.creator.id;
        }

        // Render the application shell
        renderAppShell();
    })
    .catch(error => {
        console.error('Error loading game:', error);
        document.body.innerHTML = `<div class="h-screen flex items-center justify-center bg-gray-100 text-red-600 font-bold">Error loading game. Please try again.</div>`;
    });
}

// --- UI Rendering ---

/**
 * Renders the main HTML structure for the single-page application.
 */
function renderAppShell() {
    document.body.className = 'bg-gray-50 font-sans text-gray-800';
    document.body.innerHTML = `
        <div id="app-container" class="min-h-screen flex flex-col">
            <!-- Welcome Page -->
            <div id="welcome-page" class="flex-grow flex items-center justify-center p-4">
                <div class="text-center">
                    <h2 class="text-3xl font-bold mb-6 text-blue-700">به ${quizName} خوش آمدید!</h2>
                    <button id="continue-btn" class="bg-blue-500 text-white px-8 py-4 rounded-xl text-xl font-bold hover:bg-blue-600 transition shadow-md">
                        ادامه
                    </button>
                </div>
            </div>

            <!-- Instruction Page -->
            <div id="instruction-page" class="hidden flex-grow flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
                    <h2 class="text-2xl font-bold mb-6 text-green-700">شما ۱۰ دقیقه وقت دارید تا به سوالات پاسخ دهید</h2>
                    <p class="text-gray-700 mb-4">لطفاً با دقت و تمرکز به سوالات پاسخ دهید. موفق باشید!</p>
                    <button id="start-quiz-btn" class="bg-green-500 text-white px-8 py-4 rounded-xl text-xl font-bold hover:bg-green-600 transition shadow-md">
                        برای شروع کلیک کنید
                    </button>
                </div>
            </div>

            <!-- Quiz Page -->
            <div id="quiz-page" class="hidden flex-grow flex-col">
                <header id="quiz-header" class="w-full p-4 bg-white shadow-md"></header>
                <main id="question-container" class="flex-grow p-4 md:p-6"></main>
            </div>
            
            <!-- Results Page -->
            <div id="results-page" class="hidden flex-grow flex items-center justify-center p-4"></div>

            <!-- Error Page -->
             <div id="error-page" class="hidden flex-grow flex items-center justify-center p-4"></div>
        </div>
    `;

    document.getElementById('continue-btn').addEventListener('click', showInstructionPage);
    document.getElementById('start-quiz-btn').addEventListener('click', startQuiz);
}

/**
 * Creates the HTML for the header with player profiles and the timer.
 */
function createHeaderHTML() {
    const creator = profilesData.creator || {};
    const joiner = profilesData.joiner || {};

    const getProfileImage = (profile) => {
        if (profile.profile_picture) {
            return `<img src="${profile.profile_picture}" alt="User" class="w-12 h-12 rounded-full border-2 border-gray-300">`;
        }
        return `<div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-2xl">👤</div>`;
    };

    return `
        <div class="max-w-4xl mx-auto flex justify-between items-center">
            <div class="flex items-center gap-3">
                ${getProfileImage(creator)}
                <div class="text-sm text-left">
                    <p class="font-bold">${creator.first_name || ''} ${creator.last_name || ''}</p>
                    <p class="text-gray-500">@${creator.username || 'creator'}</p>
                </div>
            </div>
            <div id="timer" class="text-2xl font-bold text-red-500">10:00</div>
            <div class="flex items-center gap-3 flex-row-reverse">
                ${getProfileImage(joiner)}
                 <div class="text-sm text-right">
                    <p class="font-bold">${joiner.first_name || ''} ${joiner.last_name || ''}</p>
                    <p class="text-gray-500">@${joiner.username || 'joiner'}</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders a single question card, now with the player-to-player chat section.
 */
function showQuestion() {
    if (currentQuestionIndex >= questions.length) {
        submitQuiz();
        return;
    }

    // BUG FIX: navigating between questions (prev/next) rebuilds
    // #question-container's innerHTML from scratch, which destroys the
    // #chat-body/#chat-messages elements from whichever question was
    // showing before. If the chat panel had been opened on that previous
    // question, startMessagePolling() had already kicked off a 5-second
    // setInterval -- and nothing ever stopped it. That interval kept
    // running in the background on every subsequent question (silently
    // re-populating a *new*, freshly-hidden #chat-messages div each time),
    // even though the chat toggle visually reset to "closed". Explicitly
    // stopping the poll (and resetting the toggle icon) whenever a new
    // question is rendered prevents this orphaned background polling.
    stopMessagePolling();

    const question = questions[currentQuestionIndex];
    let options = parseOptions(question.option);

    const questionContainer = document.getElementById('question-container');
    questionContainer.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-3xl mx-auto">
            <h2 class="text-xl font-bold mb-4 text-blue-700">سوال ${currentQuestionIndex + 1} از ${questions.length}</h2>
            ${question.image ? `<img src="${question.image}" alt="Question Image" class="mb-4 rounded-xl max-h-60 mx-auto">` : ''}
            <p class="text-gray-700 mb-6 text-lg">${question.question || 'No question text available'}</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${options.map((option, index) => `
                    <label class="flex items-center p-3 bg-gray-100 rounded-xl hover:bg-blue-100 border-2 border-transparent has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 cursor-pointer transition duration-200">
                        <input type="radio" name="answer" value="${index}" class="ml-3" ${userAnswers[question.id] === option ? 'checked' : ''}>
                        <span class="flex-1">${option}</span>
                    </label>
                `).join('')}
            </div>
          
            <!-- Player-to-Player Chat Section -->
            <div id="player-chat-section" class="mt-8 border-t-2 border-gray-200 pt-4">
                <h3 id="toggle-chat-btn" class="text-lg font-bold text-teal-700 flex items-center justify-between gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition">
                    <span class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        چت با حریف
                    </span>
                    <svg id="chat-toggle-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 transition-transform"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </h3>
                <div id="chat-body" class="hidden mt-2">
                    <div id="chat-messages" class="h-48 overflow-y-auto p-3 bg-gray-50 rounded-lg mb-3 border flex flex-col space-y-2"></div>
                    <div class="flex gap-2">
                        <input type="text" id="chat-input" class="flex-grow border rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition" placeholder="پیام خود را بنویسید...">
                        <button id="send-chat-btn" class="bg-teal-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-teal-600 transition shadow">ارسال</button>
                    </div>
                </div>
            </div>

            <!-- Navigation Buttons -->
            <div class="flex justify-between mt-8">
                <button id="prev-question" class="bg-gray-500 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-gray-600 transition shadow-md ${currentQuestionIndex === 0 ? 'invisible' : ''}">قبلی</button>
                <button id="next-question" class="bg-blue-500 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-blue-600 transition shadow-md">
                    ${currentQuestionIndex === questions.length - 1 ? 'پایان آزمون' : 'بعدی'}
                </button>
            </div>
        </div>
    `;

    attachQuestionEventListeners();
}


// --- Event Handlers and Logic ---

function showInstructionPage() {
    playNotificationSound();
    if ('vibrate' in navigator) navigator.vibrate(200);
    document.getElementById('welcome-page').classList.add('hidden');
    document.getElementById('instruction-page').classList.remove('hidden');
}

function startQuiz() {
    // BUG FIX: guard against double-clicking "برای شروع کلیک کنید" before
    // the first /quiz/start_quiz request resolves. Without this, two
    // concurrent calls could each set up their own startTimer() interval
    // (the first one left dangling, invisibly ticking against a detached
    // #timer element forever) and could each independently call
    // submitQuiz() later when their own captured end time elapsed.
    if (quizStarting) return;
    quizStarting = true;
    document.getElementById('start-quiz-btn').disabled = true;

    fetch('/quiz/start_quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz: quizName }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.questions && data.questions.length > 0) {
            // BUG FIX: see synchronizeQuestionsForRoom() above -- reorders
            // both the questions and each question's options the same way
            // for every client in this room, instead of trusting the
            // server's own independent-per-request random.shuffle().
            questions = synchronizeQuestionsForRoom(data.questions, currentRoomId);
            userAnswers = {};
            currentQuestionIndex = 0;
            const startTime = new Date();
            const quizDuration = 10 * 60 * 1000;
            const endTime = new Date(startTime.getTime() + quizDuration);
            localStorage.setItem('quizStartTime', startTime.toISOString());
            localStorage.setItem('quizEndTime', endTime.toISOString());
            document.getElementById('instruction-page').classList.add('hidden');
            document.getElementById('quiz-header').innerHTML = createHeaderHTML();
            document.getElementById('quiz-page').classList.remove('hidden');
            document.getElementById('quiz-page').classList.add('flex');
            showQuestion();
            startTimer();
        } else {
            showError(`متاسفانه، هیچ سوالی برای آزمون '${quizName}' یافت نشد.`);
            quizStarting = false;
            const btn = document.getElementById('start-quiz-btn');
            if (btn) btn.disabled = false;
        }
    })
    .catch(error => {
        console.error("Error starting quiz:", error);
        showError('متاسفیم، مشکلی در بارگیری آزمون پیش آمد.');
        quizStarting = false;
        const btn = document.getElementById('start-quiz-btn');
        if (btn) btn.disabled = false;
    });
}

function attachQuestionEventListeners() {
    document.getElementById('prev-question').addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showQuestion();
        }
    });

    document.getElementById('next-question').addEventListener('click', () => {
        currentQuestionIndex++;
        showQuestion();
    });

    // MODIFIED: Logic to allow selecting and unselecting answers
    document.querySelectorAll('input[name="answer"]').forEach(radio => {
        radio.addEventListener('click', (e) => {
            const question = questions[currentQuestionIndex];
            const options = parseOptions(question.option);
            const selectedOptionValue = options[parseInt(e.target.value)];

            // If the user clicks the currently selected answer again
            if (userAnswers[question.id] === selectedOptionValue) {
                // Deselect the radio button
                e.target.checked = false;
                // Remove the answer from our state
                delete userAnswers[question.id];
            } else {
                // Otherwise, it's a new selection
                userAnswers[question.id] = selectedOptionValue;
            }
        });
    });

    // Player Chat
    document.getElementById('toggle-chat-btn').addEventListener('click', toggleChat);
    document.getElementById('send-chat-btn').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendChatMessage();
        }
    });
}

function submitQuiz() {
    // BUG FIX: guard against submitQuiz() being re-entered. It used to be
    // reachable twice in a row: clicking "پایان آزمون" hides the quiz page
    // only inside the /quiz/submit_quiz_results response's .then() callback
    // (not immediately), so a second click on the same still-visible button
    // before that response arrived incremented currentQuestionIndex past
    // questions.length again and called submitQuiz() a second time --
    // firing two separate POSTs and inserting two rows into quiz_results
    // for what the user experienced as a single submission.
    if (quizSubmitting) return;
    quizSubmitting = true;

    clearInterval(timerInterval);
    stopMessagePolling(); // Stop chat polling on submission
    const startTime = localStorage.getItem('quizStartTime');
    const endTime = new Date();
    // BUG FIX: if quizStartTime was ever missing from localStorage (e.g. it
    // was cleared by something else running in this origin), `new
    // Date(null)` is an Invalid Date and the subtraction below produced
    // NaN, which was then sent to the backend as the duration. Fall back to
    // "just started now" (duration 0) instead of sending NaN.
    const parsedStartTime = startTime ? new Date(startTime) : endTime;
    const duration = isNaN(parsedStartTime.getTime()) ? 0 : (endTime - parsedStartTime);

    // MODIFIED: Get all question IDs to identify unanswered questions
    const allQuestionIds = questions.map(q => q.id);

    fetch('/quiz/submit_quiz_results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quizName: quizName,
            category: "all",
            userAnswers: userAnswers,
            startTime: startTime,
            duration: duration,
            totalQuestions: questions.length,
            allQuestionIds: allQuestionIds // MODIFIED: Send all question IDs
        }),
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('quiz-page').classList.add('hidden');
        const resultsPage = document.getElementById('results-page');
        // MODIFIED: Display detailed results
        resultsPage.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
                <h2 class="text-3xl font-bold mb-4 text-green-700">آزمون به پایان رسید!</h2>
                <p class="text-gray-800 mb-2 text-xl">امتیاز شما: <span class="font-bold text-2xl">${data.score}%</span></p>
                <div class="text-right mx-auto w-fit space-y-2 my-6 text-lg">
                    <p class="text-gray-700">تعداد کل سوالات: ${questions.length}</p>
                    <p class="text-green-600">پاسخ‌های صحیح: ${data.correctCount}</p>
                    <p class="text-red-600">پاسخ‌های غلط: ${data.incorrectCount}</p>
                    <p class="text-yellow-600">بدون پاسخ: ${data.unansweredCount}</p>
                </div>
                <div class="flex flex-col gap-3 mt-2">
                    <button id="view-history-btn" class="bg-purple-500 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-purple-600 transition shadow-md">
                        مشاهده تاریخچه آزمون‌ها
                    </button>
                    <button id="back-to-home" class="bg-blue-500 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-blue-600 transition shadow-md">
                        بازگشت به صفحه اصلی
                    </button>
                </div>
            </div>
        `;
        resultsPage.classList.remove('hidden');
        document.getElementById('back-to-home').addEventListener('click', () => window.location.href = '/quiz/');

        // Opens the same full-screen quiz-history viewer used elsewhere in
        // the app (history.js). Relative src matches profilePic.js's
        // convention so history.js's own close button can find and remove
        // its <script> tag afterward (it looks for script[src="history.js"]).
        document.getElementById('view-history-btn').addEventListener('click', () => {
            if (document.getElementById('full-history-page')) return;
            const historyScript = document.createElement('script');
            historyScript.src = 'history.js';
            document.body.appendChild(historyScript);
        });
    })
    .catch(error => {
        console.error('Error submitting quiz:', error);
        showError('خطا در ارسال نتایج. لطفا دوباره تلاش کنید.');
        // Allow a retry: if submission genuinely failed (network error), the
        // user is stuck on the error page's "بازگشت به صفحه اصلی" button
        // anyway, but don't leave the guard permanently latched in case
        // showError() or a future retry path needs to call submitQuiz() again.
        quizSubmitting = false;
    });
}

// --- Player Chat Functions ---

function toggleChat() {
    const chatBody = document.getElementById('chat-body');
    const chatIcon = document.getElementById('chat-toggle-icon');
    const isHidden = chatBody.classList.toggle('hidden');
    chatIcon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';

    if (!isHidden) { // Chat was just opened
        loadMessages(); // Load immediately
        startMessagePolling();
    } else { // Chat was just closed
        stopMessagePolling();
    }
}

function startMessagePolling() {
    stopMessagePolling(); // Ensure no multiple intervals are running
    if (otherUserId) {
        messageInterval = setInterval(loadMessages, 5000); // Poll every 5 seconds
    }
}

function stopMessagePolling() {
    clearInterval(messageInterval);
    messageInterval = null;
}

function loadMessages() {
    if (!otherUserId) return;
    fetch(`/quiz/get_messages/${otherUserId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayMessages(data.messages);
            } else {
                console.error('Failed to load messages:', data.error);
            }
        })
        .catch(error => console.error('Error fetching messages:', error));
}

function displayMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return; // BUG FIX: guard in case a stray poll tick fires after navigation
    container.innerHTML = ''; // Clear previous messages
    messages.forEach(message => {
        const messageEl = document.createElement('div');
        messageEl.textContent = message.message;
        let classes = 'p-2 rounded-lg mb-2 max-w-[85%] break-words w-fit';
        // Style message based on who sent it
        if (message.sender_id === currentUserId) {
            classes += ' bg-blue-100 text-blue-900 self-end ml-auto'; // Current user's message
        } else {
            classes += ' bg-gray-200 text-gray-800 self-start mr-auto'; // Other user's message
        }
        messageEl.className = classes;
        container.appendChild(messageEl);
    });
    container.scrollTop = container.scrollHeight; // Scroll to the bottom
}

function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();

    if (message && otherUserId) {
        fetch('/quiz/send_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                receiver_id: otherUserId,
                message: message
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                chatInput.value = '';
                loadMessages(); // Immediately refresh chat to show the sent message
            } else {
                console.error('Failed to send message:', data.error);
                // Optionally show an error to the user in the chat window
            }
        })
        .catch(error => console.error('Error sending message:', error));
    }
}

// --- Utility Functions ---

function startTimer() {
    const endTime = new Date(localStorage.getItem('quizEndTime'));
    const timerElement = document.getElementById('timer');
    timerInterval = setInterval(() => {
        const remainingTime = endTime - new Date();
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            timerElement.textContent = "00:00";
            submitQuiz();
            return;
        }
        const minutes = Math.floor((remainingTime / 1000 / 60) % 60).toString().padStart(2, '0');
        const seconds = Math.floor((remainingTime / 1000) % 60).toString().padStart(2, '0');
        timerElement.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

function parseOptions(optionData) {
    if (typeof optionData === 'string') {
        try {
            return JSON.parse(optionData);
        } catch (error) {
            return optionData.split(',').map(opt => opt.trim());
        }
    }
    return Array.isArray(optionData) ? optionData : [];
}

function playNotificationSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
    // BUG FIX: the AudioContext created above was never closed, leaking a
    // live audio node graph. Close it once the short beep has finished.
    setTimeout(() => {
        if (audioContext.state !== 'closed') audioContext.close();
    }, 300);
}

function showError(message) {
    document.getElementById('welcome-page')?.classList.add('hidden');
    document.getElementById('instruction-page')?.classList.add('hidden');
    document.getElementById('quiz-page')?.classList.add('hidden');
    const errorPage = document.getElementById('error-page');
    errorPage.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
            <h2 class="text-2xl font-bold mb-6 text-red-700">خطا</h2>
            <p class="text-gray-700 mb-4">${message}</p>
            <button id="back-to-home-error" class="bg-blue-500 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-blue-600 transition shadow-md">
              بازگشت به صفحه اصلی
            </button>
        </div>
    `;
    errorPage.classList.remove('hidden');
    document.getElementById('back-to-home-error').addEventListener('click', () => window.location.href = '/quiz/');
}

// Expose the main function to be called from your HTML
window.initializeGame = initializeGame;