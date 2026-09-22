// /quiz/remedial-test.js

(function() {
    // Ensure the script doesn't run again if it's already loaded
    if (window.remedialTestLoaded) {
        return;
    }
    window.remedialTestLoaded = true;

    const mainContent = document.querySelector('main');
    let userAnswers = {}; // To store user's answers
    let testData = null; // To store the questions and test details
    let timerInterval = null; // To hold the timer interval

    /**
     * Clears the main content area and prepares it for the quiz interface.
     */
    function setupUI() {
        mainContent.innerHTML = ''; // Clear existing content

        const quizContainer = document.createElement('div');
        quizContainer.id = 'remedial-test-container';
        quizContainer.className = 'p-4 bg-white rounded-xl shadow-lg';
        
        quizContainer.innerHTML = `
            <div class="flex justify-between items-center border-b pb-3 mb-4">
                <h2 class="text-xl font-bold">آزمون رفع اشکال</h2>
                <div id="timer" class="text-lg font-bold text-red-500">30:00</div>
            </div>
            <div id="questions-area" class="space-y-6">
                <p class="text-center text-gray-500">در حال بارگذاری سوالات شما...</p>
            </div>
            <div class="mt-6 text-center">
                <button id="submit-remedial-test" class="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition" disabled>
                    ثبت و پایان آزمون
                </button>
            </div>
        `;

        mainContent.appendChild(quizContainer);
    }

    /**
     * Fetches the remedial questions from the server.
     */
    function fetchQuestions() {
        console.log("Fetching questions for Remedial Test...");
        
        fetch('/quiz/get_remedial_questions')
            .then(response => {
                // Check if the response is successful, otherwise parse the error message
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.message || 'خطای سرور'); });
                }
                return response.json();
            })
            .then(data => {
                const questionsArea = document.getElementById('questions-area');
                const submitButton = document.getElementById('submit-remedial-test');
                const timerDisplay = document.getElementById('timer');

                if (data.questions && data.questions.length > 0) {
                    testData = data;
                    displayQuestions(testData.questions);
                    startTimer(testData.duration);
                    submitButton.disabled = false;
                } else {
                    // Display a friendly message if no questions are available
                    questionsArea.innerHTML = `<p class="text-center text-gray-600 font-semibold p-4">${data.message || 'هیچ سوالی برای آزمون رفع اشکال یافت نشد.'}</p>`;
                    submitButton.style.display = 'none'; // Hide submit button
                    timerDisplay.style.display = 'none'; // Hide timer
                }
            })
            .catch(error => {
                console.error('Error fetching remedial questions:', error);
                const questionsArea = document.getElementById('questions-area');
                questionsArea.innerHTML = `<p class="text-center text-red-500 p-4">خطا در بارگذاری سوالات: ${error.message}</p>`;
                document.getElementById('submit-remedial-test').style.display = 'none';
            });
    }

    /**
     * Displays the questions on the page.
     * @param {Array} questions - An array of question objects.
     */
    function displayQuestions(questions) {
        const questionsArea = document.getElementById('questions-area');
        questionsArea.innerHTML = ''; // Clear loading message

        questions.forEach((question, index) => {
            const questionElement = document.createElement('div');
            questionElement.className = 'border-t pt-4';
            questionElement.innerHTML = `
                <p class="font-semibold mb-3">${index + 1}. ${question.text}</p>
                <div class="space-y-2 options-group" data-question-id="${question.id}">
                    ${question.options.map((option, i) => `
                        <label class="flex items-center p-3 border rounded-lg hover:bg-blue-50 cursor-pointer">
                            <input type="radio" name="question_${question.id}" value="${option}" class="ml-3">
                            <span>${option}</span>
                        </label>
                    `).join('')}
                </div>
            `;
            questionsArea.appendChild(questionElement);
        });

        // Add event listeners for answer selection
        document.querySelectorAll('.options-group input').forEach(input => {
            input.addEventListener('change', (event) => {
                const questionId = event.target.name.replace('question_', '');
                userAnswers[questionId] = event.target.value;
            });
        });
    }

    /**
     * Starts the countdown timer.
     * @param {number} duration - The duration of the quiz in seconds.
     */
    function startTimer(duration) {
        const timerElement = document.getElementById('timer');
        if (!timerElement) return;

        let timer = duration;
        timerInterval = setInterval(() => {
            let minutes = parseInt(timer / 60, 10);
            let seconds = parseInt(timer % 60, 10);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            timerElement.textContent = minutes + ":" + seconds;

            if (--timer < 0) {
                clearInterval(timerInterval);
                alert("زمان شما به پایان رسید!");
                submitTest();
            }
        }, 1000);
    }

    /**
     * Submits the test answers to the server.
     * For now, it shows an alert and redirects.
     */
    function submitTest() {
        clearInterval(timerInterval); // Stop the timer
        console.log("Submitting Remedial Test with answers:", userAnswers);
        // NOTE: To fully track results, you would create another endpoint
        // to receive these answers, similar to `submit_quiz_results`.
        alert('آزمون رفع اشکال شما با موفقیت ثبت شد!');
        window.location.href = '/quiz/';
    }

    // --- INITIALIZATION ---
    setupUI();
    fetchQuestions();

    // Add a single, delegated event listener for the submit button
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'submit-remedial-test') {
            submitTest();
        }
    });

    // Cleanup function to prevent script duplication and memory leaks
    const cleanup = () => {
        clearInterval(timerInterval);
        window.remedialTestLoaded = false;
        // Clean up the specific listener if needed, though redirecting handles this
    };
    
    // A robust way to handle cleanup when navigating away
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
        cleanup();
        return originalPushState.apply(history, args);
    };
    window.addEventListener('popstate', cleanup);
    window.addEventListener('beforeunload', cleanup);

})();