// /quiz/progress-test.js

(function() {
    // Ensure the script doesn't run again if it's already loaded
    if (window.progressTestLoaded) {
        return;
    }
    window.progressTestLoaded = true;

    const mainContent = document.querySelector('main');
    let userAnswers = {}; // To store user's answers { questionId: answer }
    let testData = null; // To store the questions and test details
    let startTime = null; // To store the start time of the test
    let timerInterval = null; // To hold the timer interval

    /**
     * Clears the main content area and prepares it for the quiz interface.
     */
    function setupUI() {
        mainContent.innerHTML = ''; // Clear existing content

        const quizContainer = document.createElement('div');
        quizContainer.id = 'progress-test-container';
        quizContainer.className = 'p-4 bg-white rounded-xl shadow-lg';
        
        quizContainer.innerHTML = `
            <div class="flex justify-between items-center border-b pb-3 mb-4">
                <h2 class="text-xl font-bold">آزمون پیشرفت</h2>
                <div id="timer" class="text-lg font-bold text-red-500">--:--</div>
            </div>
            <div id="questions-area" class="space-y-6">
                <p class="text-center text-gray-500">در حال بارگذاری سوالات...</p>
            </div>
            <div class="mt-6 text-center">
                <button id="submit-progress-test" class="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition">
                    ثبت و پایان آزمون
                </button>
            </div>
        `;

        mainContent.appendChild(quizContainer);
    }

    /**
     * Fetches the progress test questions from the server.
     */
    function fetchQuestions() {
        console.log("Fetching questions for Progress Test...");
        const questionsArea = document.getElementById('questions-area');
        
        fetch('/quiz/get_progress_test_questions')
            .then(response => {
                if (!response.ok) {
                    // Get the error message from the server's JSON response
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'خطا در بارگذاری سوالات.');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.questions && data.questions.length > 0) {
                    testData = data;
                    startTime = new Date().toISOString(); // Record the start time
                    displayQuestions(testData.questions);
                    startTimer(testData.duration);
                } else {
                    questionsArea.innerHTML = `<p class="text-center text-red-500">سوالی برای آزمون پیشرفت یافت نشد.</p>`;
                    document.getElementById('submit-progress-test').style.display = 'none';
                    document.getElementById('timer').style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error fetching progress test questions:', error);
                questionsArea.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
                document.getElementById('submit-progress-test').style.display = 'none';
                document.getElementById('timer').style.display = 'none';
            });
    }

    /**
     * Displays the questions on the page.
     * @param {Array} questions - An array of question objects.
     */
    function displayQuestions(questions) {
        const questionsArea = document.getElementById('questions-area');
        questionsArea.innerHTML = ''; // Clear the loading message

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

        // Add event listeners to handle answer selection
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
        let timer = duration;
        
        timerInterval = setInterval(() => {
            let minutes = parseInt(timer / 60, 10);
            let seconds = parseInt(timer % 60, 10);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            timerElement.textContent = minutes + ":" + seconds;

            if (--timer < 0) {
                clearInterval(timerInterval);
                alert("زمان شما به پایان رسید! آزمون به صورت خودکار ثبت می‌شود.");
                submitTest();
            }
        }, 1000);
    }

    /**
     * Submits the test answers to the server.
     */
    function submitTest() {
        clearInterval(timerInterval); // Stop the timer

        const submitButton = document.getElementById('submit-progress-test');
        submitButton.disabled = true;
        submitButton.textContent = 'در حال ثبت...';
        
        const payload = {
            quizName: testData.quizName,
            category: testData.category,
            userAnswers: userAnswers,
            startTime: startTime,
            totalQuestions: testData.questions.length,
            duration: (new Date() - new Date(startTime)) // duration in ms
        };

        fetch('/quiz/submit_quiz_results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            alert('آزمون پیشرفت شما با موفقیت ثبت شد!');
            window.location.href = '/quiz/'; 
        })
        .catch(error => {
            console.error('Error submitting test:', error);
            alert('خطا در ثبت آزمون. لطفا دوباره تلاش کنید.');
            submitButton.disabled = false;
            submitButton.textContent = 'ثبت و پایان آزمون';
        });
    }

    // Initialize the quiz
    setupUI();
    fetchQuestions();

    document.getElementById('submit-progress-test').addEventListener('click', submitTest);

    // Cleanup flag on unload
    window.addEventListener('beforeunload', () => {
        window.progressTestLoaded = false;
    });

})();