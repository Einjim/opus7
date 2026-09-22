// /quiz/MultiPlayerQuiz.js

(function() {
    'use strict';

    // --- STATE MANAGEMENT ---
    // Stores data for the current session, like answers and start time.
    const quizState = {
        userAnswers: {},
        startTime: null,
        quizData: null,
    };

    /**
     * Helper function to prevent XSS attacks by escaping HTML characters.
     * @param {string} str The string to escape.
     * @returns {string} The sanitized string.
     */
    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    /**
     * Renders the final results page after the quiz is submitted.
     * This function CLEARS the page and builds the results view.
     * @param {object} resultData The results data from the backend.
     */
    function renderResultsPage(resultData) {
        document.body.innerHTML = ''; // Clear the quiz interface
        document.body.className = 'bg-gray-100';

        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen';

        resultsContainer.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center transform transition-all duration-500 scale-95 opacity-0">
                <h1 class="text-2xl font-bold text-gray-800 mb-2">خسته نباشید!</h1>
                <p class="text-gray-600 mb-6">نتایج آزمون شما:</p>

                <div class="space-y-4 text-lg">
                    <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <span class="font-semibold">امتیاز نهایی:</span>
                        <span class="font-bold text-blue-600">${resultData.score}%</span>
                    </div>
                    <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <span class="font-semibold">پاسخ‌های صحیح:</span>
                        <span class="font-bold text-green-600">${resultData.correctCount}</span>
                    </div>
                    <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <span class="font-semibold">پاسخ‌های غلط:</span>
                        <span class="font-bold text-red-600">${resultData.incorrectCount}</span>
                    </div>
                    <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <span class="font-semibold">بدون پاسخ:</span>
                        <span class="font-bold text-yellow-600">${resultData.unansweredCount}</span>
                    </div>
                </div>

                <button id="view-history-btn" class="w-full bg-purple-500 text-white rounded-lg py-3 font-bold mt-8 hover:bg-purple-600 transition">مشاهده تاریخچه آزمون‌ها</button>
                <button id="back-to-home" class="w-full bg-blue-500 text-white rounded-lg py-3 font-bold mt-3 hover:bg-blue-600 transition">بازگشت به صفحه اصلی</button>
            </div>
        `;
        document.body.appendChild(resultsContainer);

        // Animate results appearance
        setTimeout(() => {
            const content = resultsContainer.querySelector('.bg-white');
            content.classList.remove('scale-95', 'opacity-0');
        }, 100);

        document.getElementById('back-to-home').addEventListener('click', () => {
            window.location.reload();
        });

        // Opens the same full-screen quiz-history viewer used elsewhere in
        // the app (history.js), so users can see their past quiz results
        // -- including the game they just finished -- right from this
        // results screen.
        document.getElementById('view-history-btn').addEventListener('click', () => {
            if (document.getElementById('full-history-page')) return;
            const historyScript = document.createElement('script');
            // NOTE: matches the relative src profilePic.js uses, since
            // history.js's own close button removes itself afterward via
            // `script[src="history.js"]` -- an absolute path here would load
            // fine but wouldn't match that selector, leaving a stray
            // <script> tag behind after closing.
            historyScript.src = 'history.js';
            document.body.appendChild(historyScript);
        });
    }

    /**
     * Handles the submission of the quiz.
     */
    function handleQuizSubmit() {
        const submitButton = document.getElementById('submit-quiz-btn');
        const duration = new Date() - quizState.startTime;
        submitButton.disabled = true;
        submitButton.textContent = 'در حال ثبت...';

        const resultsPayload = {
            quizName: quizState.quizData.quiz,
            category: quizState.quizData.category || 'General',
            userAnswers: quizState.userAnswers,
            startTime: quizState.startTime.toISOString(),
            totalQuestions: quizState.quizData.questions.length,
            duration: duration
        };

        fetch('/quiz/submit_quiz_results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultsPayload)
        })
        .then(response => {
            if (!response.ok) return response.json().then(err => Promise.reject(err));
            return response.json();
        })
        .then(renderResultsPage)
        .catch(error => {
            console.error('Error submitting quiz:', error);
            alert('خطا در ثبت آزمون: ' + (error.error || ''));
            submitButton.disabled = false;
            submitButton.textContent = 'ثبت نهایی و مشاهده نتیجه';
        });
    }

    /**
     * Handles a user clicking on a quiz option.
     * @param {Event} e The click event.
     */
    function handleOptionClick(e) {
        const selectedOptionEl = e.target.closest('.quiz-option');
        if (selectedOptionEl) {
            const questionId = selectedOptionEl.dataset.questionId;
            const optionText = selectedOptionEl.dataset.optionText;

            quizState.userAnswers[questionId] = optionText;

            const optionsContainer = selectedOptionEl.parentElement;
            optionsContainer.querySelectorAll('.quiz-option').forEach(opt => {
                opt.classList.remove('bg-blue-500', 'text-white', 'border-blue-600');
                opt.classList.add('hover:bg-blue-100');
            });
            selectedOptionEl.classList.add('bg-blue-500', 'text-white', 'border-blue-600');
            selectedOptionEl.classList.remove('hover:bg-blue-100');
        }
    }


    /**
     * Renders the entire quiz interface on the page.
     * @param {object} quizData The quiz data fetched from the backend.
     */
    function renderQuizInterface(quizData) {
        if (!quizData || !quizData.questions || quizData.questions.length === 0) {
            alert('متاسفانه سوالی برای این آزمون یافت نشد.');
            return;
        }

        quizState.quizData = quizData;
        quizState.startTime = new Date();
        quizState.userAnswers = {};

        document.body.innerHTML = '';
        document.body.className = 'bg-gray-100';

        const quizContainer = document.createElement('main');
        quizContainer.className = 'container mx-auto p-4 md:p-8';
        quizContainer.innerHTML = `
            <header class="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h1 class="text-3xl font-bold text-gray-800 text-center">${escapeHTML(quizData.quiz)}</h1>
                <p class="text-center text-gray-500 mt-2">لطفا به سوالات زیر پاسخ دهید. موفق باشید!</p>
            </header>
            <div id="questions-wrapper"></div>
        `;

        const questionsWrapper = quizContainer.querySelector('#questions-wrapper');

        quizData.questions.forEach((question, index) => {
            const questionElement = document.createElement('section');
            questionElement.className = 'bg-white p-6 rounded-lg shadow-md mb-4';
            questionElement.id = `question-${question.id}`;

            const options = JSON.parse(question.option);
            const optionsHtml = options.map(optionText => `
                <div class="quiz-option p-3 border rounded-lg mt-2 cursor-pointer hover:bg-blue-100 hover:border-blue-400 transition"
                     data-question-id="${question.id}"
                     data-option-text="${escapeHTML(optionText)}">
                    ${escapeHTML(optionText)}
                </div>`).join('');

            questionElement.innerHTML = `
                <h2 class="text-xl font-semibold text-gray-800 mb-4">
                    <span class="bg-blue-500 text-white rounded-full px-3 py-1 text-sm mr-2 ml-2">${index + 1}</span>
                    ${escapeHTML(question.question)}
                </h2>
                <div class="options-container space-y-2">${optionsHtml}</div>
            `;
            questionsWrapper.appendChild(questionElement);
        });

        const submitButton = document.createElement('button');
        submitButton.id = 'submit-quiz-btn';
        submitButton.className = 'w-full bg-green-500 text-white rounded-lg py-3.5 font-bold text-lg hover:bg-green-600 transition duration-200 mt-8';
        submitButton.textContent = 'ثبت نهایی و مشاهده نتیجه';
        quizContainer.appendChild(submitButton);

        document.body.appendChild(quizContainer);

        quizContainer.addEventListener('click', handleOptionClick);
        submitButton.addEventListener('click', handleQuizSubmit);
    }

    /**
     * Handles the user clicking the button to join a scheduled quiz.
     * @param {Event} event The click event.
     */
    function handleJoinQuizClick(event) {
        const button = event.target.closest('.join-scheduled-quiz-btn');
        if (button) {
            const quizName = button.dataset.quizName;

            button.disabled = true;
            button.textContent = 'در حال آماده‌سازی...';

            fetch(`/quiz/get_last_ten_quiz_results`, {credentials: 'include'})
            .then(res => res.json())
            .then(results => {
                const hasTaken = results.some && results.some(r => r.quiz_name === quizName);
                if(hasTaken) {
                    if(!confirm("شما قبلا در این آزمون شرکت کرده‌اید. آیا مایل به شرکت مجدد هستید؟")) {
                        button.disabled = false;
                        button.textContent = 'شروع آزمون';
                        return;
                    }
                }

                fetch('/quiz/start_quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quiz: quizName })
                })
                .then(response => {
                    if (!response.ok) return response.json().then(err => { throw new Error(err.message || 'Quiz could not be started.') });
                    return response.json();
                })
                .then(quizData => {
                    const modal = document.getElementById('multiplayer-modal');
                    if (modal) modal.remove();
                    renderQuizInterface(quizData);
                })
                .catch(error => {
                    console.error('Error joining quiz:', error);
                    alert(`خطا: ${error.message}`);
                    button.disabled = false;
                    button.textContent = 'شروع آزمون';
                });
            })
            .catch(error => {
                 console.error("Could not verify previous attempts:", error);
                 handleJoinQuizClick(event);
            });
        }
    }


    /**
     * Creates and displays the initial modal to show available quizzes.
     */
    function initializeQuizLobby() {
        if (document.getElementById('multiplayer-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'multiplayer-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4';
        
        // ==> MODIFIED: Added a close button to the modal header
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto transform transition-all duration-300 ease-out scale-95 opacity-0">
                <div class="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 class="text-2xl font-bold text-gray-800">انتخاب آزمون</h2>
                    <button id="close-multiplayer-modal" class="text-gray-500 hover:text-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div id="quizzes-container" class="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                   <!-- Quiz cards will be injected here -->
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const modalContent = modal.querySelector('.bg-white');
        setTimeout(() => modalContent.classList.remove('scale-95', 'opacity-0'), 10);

        fetchAndDisplayQuizzes(modal);
        
        // ==> ADDED: Event listener for the close button
        modal.querySelector('#close-multiplayer-modal').addEventListener('click', () => {
            modal.remove();
        });

        // ==> ADDED: Event listener to close modal on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'multiplayer-modal') {
                modal.remove();
            }
        });
        
        // Add listener for join buttons inside the modal
        modal.addEventListener('click', handleJoinQuizClick);
    }

    /**
     * Fetches quiz data from the server and populates the modal.
     * @param {HTMLElement} modal The modal element to populate.
     */
    function fetchAndDisplayQuizzes(modal) {
        const quizzesContainer = modal.querySelector('#quizzes-container');
        quizzesContainer.innerHTML = `<p class="text-gray-500 text-center">در حال بارگذاری آزمون‌های فعال...</p>`;

        fetch('/quiz/get_scheduled_quizzes')
            .then(res => {
                if (!res.ok) return Promise.reject('Failed to load quizzes');
                return res.json();
            })
            .then(quizzes => {
                quizzesContainer.innerHTML = ''; 

                if (!quizzes || quizzes.length === 0) {
                     quizzesContainer.innerHTML = `<p class="text-center text-gray-500 py-4">در حال حاضر آزمون فعالی وجود ندارد.</p>`;
                     return;
                }
                
                quizzes.forEach(quiz => {
                    quizzesContainer.appendChild(createQuizCard(quiz));
                });
            })
            .catch(error => {
                console.error('Error fetching quizzes:', error);
                quizzesContainer.innerHTML = `<p class="text-red-500 text-center">خطا در بارگذاری آزمون‌ها.</p>`;
            });
    }

    /**
     * Creates an HTML element for a single quiz card in the lobby.
     * @param {object} quiz The quiz data object.
     * @returns {HTMLElement} The created div element.
     */
    function createQuizCard(quiz) {
        const element = document.createElement('div');
        element.className = 'bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-3';
        const startTime = new Date(quiz.start_time).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(quiz.end_time).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
        const quizDate = new Date(quiz.start_time).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' });

        element.innerHTML = `
            <div>
                <h3 class="font-bold text-lg text-gray-800">${escapeHTML(quiz.quiz_name)}</h3>
                <p class="text-sm text-gray-600 mt-1">${escapeHTML(quiz.description)}</p>
            </div>
            <div class="flex justify-between items-center text-sm text-gray-500 pt-2 border-t border-gray-200">
                <span>📅 ${quizDate}</span>
                <span>⏰ ${startTime} تا ${endTime}</span>
            </div>
            <button data-quiz-name="${escapeHTML(quiz.quiz_name)}" class="join-scheduled-quiz-btn w-full bg-blue-500 text-white rounded-lg py-2.5 font-bold hover:bg-blue-600 transition duration-200">
                شروع آزمون
            </button>
        `;
        return element;
    }


    // --- SCRIPT EXECUTION ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeQuizLobby);
    } else {
        initializeQuizLobby();
    }

})();