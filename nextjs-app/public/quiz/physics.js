// physics.js
//
// BUG FIX (the big one): this file used to be a 2-line placeholder
// ("Content for Physics education will go here. console.log('Welcome to
// Physics education!')") -- clicking "فیزیک" (Physics) from scripts.js's
// home page or education.js's category cards did nothing but log to the
// console. This is now a real quiz engine, modeled on art.js/sport.js's
// working fetch -> button list -> quiz flow, filtered to its own category.
//
// NAMING FIX: every function and the quiz-button CSS class below are
// prefixed with "Physics"/"physics" so this file can never collide with
// math.js/biology.js/chemistry.js's copies of the same pattern -- see
// math.js's matching comment for why that collision risk is real (these
// are all loaded via loadScript(), a <script> tag swap, not a full page
// reload).

const PHYSICS_CATEGORY = 'Physics';

function showPhysicsPage() {
    fetch(`/quiz/get_quizzes_by_category/${encodeURIComponent(PHYSICS_CATEGORY)}`)
        .then(response => response.json())
        .then(quizzes => {
            const pageContent = `
                <div class="container" style="position: relative; height: 100vh; display: flex; align-items: center; justify-content: center;">
                    <header style="position: absolute; top: 10px; left: 10px;">
                        <button id="back-btn" style="margin-bottom: 20px;">Back</button>
                    </header>
                    <main style="display: flex; flex-direction: column; align-items: center;">
                        <h2 style="margin-bottom: 20px;">Physics Quizzes</h2>
                        <div class="physics-quiz-buttons" style="display: flex; flex-direction: column; align-items: center;">
                            ${quizzes.length > 0 ? generatePhysicsQuizButtons(quizzes) : '<p>در حال حاضر آزمونی برای فیزیک وجود ندارد.</p>'}
                        </div>
                    </main>
                </div>
            `;

            document.body.innerHTML = pageContent;
            // BUG FIX: art.js/sport.js hardcoded the production domain
            // (https://konkoor.chbk.app/quiz/) here, so "Back" broke on
            // localhost/staging/any other domain. Relative path instead,
            // matching every other fixed page in this app.
            document.getElementById('back-btn').addEventListener('click', () => {
                window.location.href = '/quiz/';
            });
        })
        .catch(error => console.error('Error fetching quizzes:', error));
}

function generatePhysicsQuizButtons(quizzes) {
    return quizzes.map(quiz => `
        <button class="physics-quiz-button" data-quiz="${quiz}" style="margin: 5px;">${quiz}</button>
    `).join('');
}

function handlePhysicsQuizButtonClick(event) {
    const button = event.target;
    if (!button.classList.contains('physics-quiz-button')) return;

    const quizName = button.getAttribute('data-quiz');
    localStorage.setItem('currentQuizName', quizName);
    localStorage.setItem('currentQuizCategory', PHYSICS_CATEGORY);

    const bluePage = document.createElement('div');
    bluePage.className = 'blue-page';

    bluePage.innerHTML = `
        <header style="position: absolute; top: 10px; left: 10px;">
            <button id="back-btn-blue" style="margin-bottom: 20px;">Back</button>
        </header>
        <h1>Welcome to ${quizName} Quiz!</h1>
    `;

    document.body.innerHTML = '';
    document.body.appendChild(bluePage);

    // BUG FIX: art.js/sport.js never called stopPropagation() on this
    // button's click, but bluePage itself has its own click listener
    // (attached right below) that starts the quiz on ANY click inside it.
    // Click events bubble, so clicking "Back" here also fired the quiz
    // start fetch every time -- the same bug already found and fixed in
    // singlePlayer.js's equivalent code.
    document.getElementById('back-btn-blue').addEventListener('click', (event) => {
        event.stopPropagation();
        showPhysicsPage();
    });

    bluePage.addEventListener('click', () => {
        fetch('/quiz/start_quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ quiz: quizName, category: PHYSICS_CATEGORY }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.questions && data.questions.length > 0) {
                localStorage.setItem('currentQuiz', JSON.stringify(data.questions));
                // BUG FIX: /quiz/submit_quiz_results requires an
                // 'allQuestionIds' field in its request body (the backend
                // rejects the submission with a 400 "Missing required
                // fields" otherwise) -- art.js/sport.js never captured or
                // sent this at all, so finishing either quiz always failed
                // to save results. The IDs are available right here in the
                // /quiz/start_quiz response.
                localStorage.setItem('allQuestionIds', JSON.stringify(data.questions.map(q => q.id)));

                bluePage.innerHTML = `
                    <header style="position: absolute; top: 10px; left: 10px;">
                        <button id="back-btn-welcome" style="margin-bottom: 20px;">Back</button>
                    </header>
                    <h1>You have 10 minutes to complete the quiz</h1>
                    <p id="start-button" style="cursor: pointer;">Tap to start</p>
                    <p>${data.message}</p>
                `;

                document.getElementById('back-btn-welcome').addEventListener('click', (event) => {
                    // Same missing-stopPropagation issue as back-btn-blue above.
                    event.stopPropagation();
                    const backToWelcomePage = document.createElement('div');
                    backToWelcomePage.className = 'blue-page';
                    backToWelcomePage.innerHTML = `
                        <header style="position: absolute; top: 10px; left: 10px;">
                            <button id="back-btn-blue" style="margin-bottom: 20px;">Back</button>
                        </header>
                        <h1>Welcome to ${quizName} Quiz!</h1>
                    `;
                    document.body.innerHTML = '';
                    document.body.appendChild(backToWelcomePage);
                    document.getElementById('back-btn-blue').addEventListener('click', (event) => {
                        event.stopPropagation();
                        showPhysicsPage();
                    });
                });

                document.getElementById('start-button').addEventListener('click', (event) => {
                    // BUG FIX (new): guard against double-clicking "Tap to
                    // start" before the countdown/first question render
                    // finishes, which used to be able to set up two
                    // concurrent checkTimeInterval timers.
                    if (physicsQuizStarting) return;
                    physicsQuizStarting = true;
                    event.stopPropagation();

                    const startTime = new Date();
                    localStorage.setItem('quizStartTime', startTime.toISOString());
                    localStorage.setItem('userAnswers', JSON.stringify({}));
                    localStorage.setItem('totalQuestions', data.questions.length);

                    const countdownDuration = 10 * 60 * 1000;
                    const endTime = new Date(startTime.getTime() + countdownDuration);
                    localStorage.setItem('quizEndTime', endTime.toISOString());

                    // BUG FIX: the interval id used to be a plain local
                    // variable, unreachable from showPhysicsQuizCompleted()
                    // below. If the user finished the quiz early (before
                    // time ran out), this timer kept running in the
                    // background and could still fire showPhysicsTimeOverPage()
                    // afterwards, silently replacing the results screen the
                    // user was already looking at. Stored at module scope so
                    // it can be cleared on early completion too.
                    physicsCheckTimeInterval = setInterval(() => {
                        const currentTime = new Date();
                        if (currentTime >= new Date(localStorage.getItem('quizEndTime'))) {
                            clearInterval(physicsCheckTimeInterval);
                            showPhysicsTimeOverPage();
                        }
                    }, 1000);

                    showPhysicsQuestion(0);
                });
            } else {
                bluePage.innerHTML = `
                    <header style="position: absolute; top: 10px; left: 10px;">
                        <button id="back-btn-blue" style="margin-bottom: 20px;">Back</button>
                    </header>
                    <h1>No Physics questions available for ${quizName}</h1>
                `;
                document.getElementById('back-btn-blue').addEventListener('click', (event) => {
                    event.stopPropagation();
                    showPhysicsPage();
                });
            }
        })
        .catch(error => console.error('Error:', error));
    });
}

let physicsQuizStarting = false;
let physicsCheckTimeInterval = null;
let physicsSubmitting = false;

function showPhysicsQuestion(index) {
    const questions = JSON.parse(localStorage.getItem('currentQuiz'));
    if (index < questions.length) {
        const question = questions[index];
        const options = JSON.parse(question.option);

        const questionPage = document.createElement('div');
        questionPage.className = 'question-page';
        questionPage.style = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
        `;
        questionPage.innerHTML = `
            <h1>Question ${index + 1}</h1>
            <h2>${question.question}</h2>
            ${question.image ? `<img src="${question.image}" alt="Question Image" style="max-width: 100%; height: auto;">` : ''}
            <div class="options" style="margin-top: 20px; display: flex; flex-direction: column; align-items: flex-start;">
                ${options.map((option, i) => `
                    <label style="margin: 5px; padding: 10px; display: flex; align-items: center;">
                        <input type="checkbox" name="option" value="${i}" style="appearance: none; -webkit-appearance: none; width: 20px; height: 20px; border: 2px solid #333; border-radius: 50%; margin-right: 10px; position: relative;" onclick="togglePhysicsOption(this)">
                        <span style="margin-left: 5px;">${String.fromCharCode(65 + i)}. ${option}</span>
                    </label>
                `).join('')}
            </div>
            <div class="navigation-buttons" style="display: flex; justify-content: space-between; width: 100%; padding: 20px;">
                <button id="prev-question" style="padding: 10px;">Previous</button>
                <button id="next-question" style="padding: 10px;">${index === questions.length - 1 ? 'Submit' : 'Next'}</button>
            </div>
        `;

        document.body.innerHTML = '';
        document.body.appendChild(questionPage);

        document.getElementById('prev-question').addEventListener('click', () => {
            if (index > 0) {
                showPhysicsQuestion(index - 1);
            }
        });

        document.getElementById('next-question').addEventListener('click', () => {
            const selectedOption = document.querySelector('input[name="option"]:checked');
            if (selectedOption) {
                const userAnswers = JSON.parse(localStorage.getItem('userAnswers') || '{}');
                userAnswers[question.id] = options[selectedOption.value];
                localStorage.setItem('userAnswers', JSON.stringify(userAnswers));
            }
            if (index === questions.length - 1) {
                showPhysicsQuizCompleted();
            } else {
                showPhysicsQuestion(index + 1);
            }
        });
    } else {
        showPhysicsQuizCompleted();
    }
}

function togglePhysicsOption(checkbox) {
    const options = document.querySelectorAll('input[name="option"]');
    options.forEach(option => {
        if (option !== checkbox) {
            option.checked = false;
            option.style.backgroundColor = 'transparent';
        }
    });
    checkbox.style.backgroundColor = checkbox.checked ? '#333' : 'transparent';
}

function showPhysicsQuizCompleted() {
    // BUG FIX: stop the 10-minute timer now -- see physicsCheckTimeInterval's
    // comment above. Without this, finishing early could still trigger
    // showPhysicsTimeOverPage() a few seconds/minutes later and silently
    // replace this results screen.
    if (physicsCheckTimeInterval) {
        clearInterval(physicsCheckTimeInterval);
        physicsCheckTimeInterval = null;
    }
    // BUG FIX (new): guard against the "Submit" button being double-clicked
    // (or the timer and a manual submit racing each other), which used to
    // be able to fire two concurrent /quiz/submit_quiz_results POSTs for a
    // single quiz attempt.
    if (physicsSubmitting) return;
    physicsSubmitting = true;

    const completedPage = document.createElement('div');
    completedPage.className = 'completed-page';

    const quizName = localStorage.getItem('currentQuizName');
    const userAnswers = JSON.parse(localStorage.getItem('userAnswers') || '{}');
    const startTime = localStorage.getItem('quizStartTime');
    const endTime = new Date();
    const duration = endTime - new Date(startTime);
    const totalQuestions = parseInt(localStorage.getItem('totalQuestions'));

    submitPhysicsQuizResults(quizName, userAnswers, startTime, duration, totalQuestions)
        .then(data => {
            completedPage.innerHTML = `
                <div style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    font-size: 24px;
                    font-weight: bold;
                ">
                    Your Score: ${data.score}%
                </div>
                <button id="back-to-home" style="
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                ">Back to Home</button>
            `;

            document.body.innerHTML = '';
            document.body.appendChild(completedPage);

            document.getElementById('back-to-home').addEventListener('click', () => {
                window.location.href = '/quiz/';
            });
        })
        .catch(error => console.error('Error submitting quiz results:', error));
}

function showPhysicsTimeOverPage() {
    const timeOverPageContent = `
        <div class="container" style="position: relative; height: 100vh; display: flex; align-items: center; justify-content: center;">
            <header style="position: absolute; top: 10px; left: 10px;">
                <button id="back-btn-time-over" style="margin-bottom: 20px;">Back to Home</button>
            </header>
            <main style="display: flex; flex-direction: column; align-items: center;">
                <h1>Sorry, the time is over</h1>
                <p>Click to return to the home page.</p>
            </main>
        </div>
    `;

    document.body.innerHTML = timeOverPageContent;

    document.getElementById('back-btn-time-over').addEventListener('click', () => {
        window.location.href = '/quiz/';
    });
}

function submitPhysicsQuizResults(quizName, userAnswers, startTime, duration, totalQuestions) {
    const category = localStorage.getItem('currentQuizCategory') || PHYSICS_CATEGORY;
    // BUG FIX (see handlePhysicsQuizButtonClick above): allQuestionIds is a
    // required field on the backend; it's now always populated right after
    // /quiz/start_quiz succeeds, so this read should never fall back to [].
    const allQuestionIds = JSON.parse(localStorage.getItem('allQuestionIds') || '[]');

    return fetch('/quiz/submit_quiz_results', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            quizName: quizName,
            category: category,
            userAnswers: userAnswers,
            startTime: startTime,
            duration: duration,
            totalQuestions: totalQuestions,
            allQuestionIds: allQuestionIds
        }),
    })
    .then(response => response.json())
    .then(data => {
        return data;
    });
}

showPhysicsPage();

document.addEventListener('click', handlePhysicsQuizButtonClick);