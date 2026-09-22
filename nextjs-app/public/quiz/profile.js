// BUG FIX: this file's top-level `const`/`function` declarations used to sit
// directly in the shared global (script) scope. loadScript() in
// quiz-options.js/single-player-quiz.js/two-player-quiz.js/scripts.js
// navigates to the profile tab by injecting this file as a fresh <script>
// tag and later removing that tag -- but removing the <script> node does
// NOT erase the `const DEFAULT_PROFILE_PIC` lexical binding it already
// created. So the moment a user left the profile page and came back to it
// a second time, the second injection re-parsed the same
// `const DEFAULT_PROFILE_PIC` in the same scope and threw "Uncaught
// SyntaxError: Identifier 'DEFAULT_PROFILE_PIC' has already been declared",
// which aborts the whole script before a single line of it runs. Wrapping
// everything in an IIFE gives each load of this file its own fresh
// function scope, same fix already used in quiz-options.js/
// single-player-quiz.js/remedial-test.js/progress-test.js/multiPlayer.js.
(function() {

// Function to load Chart.js
function loadChartJs() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Function to show the profile page
function showProfilePage() {
    const profilePageContent = `
        <div class="container">
            <header>
                <div class="profile">
                    <img src="" alt="Profile Picture" class="profile-pic" id="header-profile-pic">
                    <span id="header-username"></span>
                </div>
                <div class="coins">
                    <span id="user-coins"></span>
                    <img src="coins-icon.png" alt="Coins">
                    <span>🥇</span>
                </div>
            </header>
            
            <main class="profile-main">
                <div class="profile-card">
                    <div class="profile-header">
                        <img src="" alt="Profile Picture" class="profile-pic-large" id="main-profile-pic">
                        <h2 id="user-name"></h2>
                    </div>
                    <div class="profile-stats">
                        <div class="stat">
                            <span class="stat-value" id="user-rank">-</span>
                            <span class="stat-label">Rank</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value" id="user-quizzes">-</span>
                            <span class="stat-label">Quizzes</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value" id="user-avg-score">-</span>
                            <span class="stat-label">Average Score</span>
                        </div>
                    </div>
                </div>
                
                <button id="results-btn" class="results-button">Show Last 10 Results</button>
                <button id="chart-btn" class="chart-button">Show Score Chart</button>
                
                <div class="weakness-strength">
                    <h3>Latest Quiz Performance</h3>
                    <div id="latest-quiz-result">Loading...</div>
                </div>
                
                <div id="quiz-results" class="quiz-results" style="display: none;"></div>
                <div id="chartContainer" style="display: none; width: 100%; height: 300px;">
                    <canvas id="scoreChart"></canvas>
                </div>
                <div id="chartMessage"></div>
            </main>
            
            <footer>
                <button class="nav-button" id="home-btn">🏠 Home</button>
                <button class="nav-button" id="leaderboard-btn">🏆 Leaderboard</button>
                <button class="nav-button" id="Teacherboard-btn">👩‍🏫 Teacherboard</button>
                <button class="nav-button active" id="profile-btn">👤 Profile</button>
            </footer>
        </div>
    `;
    
    document.body.innerHTML = profilePageContent;

    // Add event listeners
    document.getElementById('home-btn').addEventListener('click', loadHomeScript);
    document.getElementById('results-btn').addEventListener('click', toggleQuizResults);
    document.getElementById('chart-btn').addEventListener('click', toggleScoreChart);
    // BUG FIX: these two footer buttons never had a listener attached at all,
    // so clicking "Leaderboard" or "Teacherboard" from the profile page did
    // nothing. Wired up the same way home-btn already worked.
    document.getElementById('leaderboard-btn').addEventListener('click', loadLeaderboardScript);
    document.getElementById('Teacherboard-btn').addEventListener('click', loadTeacherboardScript);

    // Fetch and display user profile
    fetchUserProfile();

    // Fetch and display the latest quiz result
    fetchLatestQuizResult();

    // Add mobile-friendly styles
    const style = document.createElement('style');
    style.textContent = `
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f0f0f0;
        }
        .container {
            max-width: 100%;
            padding: 10px;
        }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #ffffff;
            padding: 10px;
            border-radius: 10px;
            margin-bottom: 15px;
        }
        .profile-pic {
            width: 40px;
            height: 40px;
            border-radius: 50%;
        }
        .profile-main {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .profile-card, .weakness-strength, .quiz-results {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 20px;
        }
        .profile-header {
            margin-bottom: 20px;
            text-align: center;
        }
        .profile-pic-large {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            margin-bottom: 10px;
        }
        .profile-stats {
            display: flex;
            justify-content: space-around;
        }
        .stat {
            display: flex;
            flex-direction: column;
        }
        .stat-value {
            font-size: 1.2em;
            font-weight: bold;
        }
        .stat-label {
            font-size: 0.8em;
            color: #666;
        }
        .weakness-strength h3 {
            margin-top: 0;
        }
        footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-around;
            background-color: #ffffff;
            padding: 10px;
            box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
        }
        .nav-button {
            background: none;
            border: none;
            font-size: 1em;
            cursor: pointer;
        }
        .nav-button.active {
            color: #007bff;
        }
        .results-button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 10px 0;
            align-self: center;
        }
        .quiz-results {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 20px;
            margin-top: 15px;
        }
        .quiz-result-item {
            border-bottom: 1px solid #eee;
            padding: 10px 0;
        }
        .quiz-result-item:last-child {
            border-bottom: none;
        }
        .answer-details {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
        }
        .answer-section {
            flex: 1;
            margin: 0 5px;
        }
        .answer-section h5 {
            margin-top: 0;
            margin-bottom: 5px;
        }
        .answer-section ul {
            list-style-type: none;
            padding-left: 0;
            margin: 0;
        }
        .answer-section li {
            font-size: 0.9em;
            margin-bottom: 2px;
        }
    `;
    document.head.appendChild(style);
}

// BUG FIX: 'default-profile-pic.png' is not a real file anywhere in this
// app (not in static/, not at the app root), so every user without a
// profile picture got a permanently broken <img>. Replaced with a
// self-contained inline SVG placeholder that always renders and needs no
// network request.
const DEFAULT_PROFILE_PIC =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
        '<circle cx="50" cy="50" r="50" fill="#ccc"/>' +
        '<circle cx="50" cy="38" r="18" fill="#fff"/>' +
        '<path d="M20 90c0-22 60-22 60 0" fill="#fff"/>' +
        '</svg>'
    );

// Function to fetch user profile
function fetchUserProfile() {
    fetch('/quiz/get_profile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Error fetching profile:', data.error);
        } else {
            updateProfileUI(data);
            // BUG FIX: rank/quizzes/avg-score used to be hardcoded to '8' /
            // '50' / '66.81' for every single user. Compute them from real
            // data instead.
            updateProfileStats(data.username);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// Function to update the UI with user profile data
function updateProfileUI(profileData) {
    document.getElementById('header-profile-pic').src = profileData.profile_picture || DEFAULT_PROFILE_PIC;
    document.getElementById('main-profile-pic').src = profileData.profile_picture || DEFAULT_PROFILE_PIC;
    document.getElementById('header-username').textContent = profileData.username;
    document.getElementById('user-name').textContent = profileData.name;
    document.getElementById('user-coins').textContent = profileData.coins;
}

// BUG FIX (new): rank/quizzes/avg-score were hardcoded to '8' / '50' /
// '66.81' for every user regardless of who was logged in. There's no single
// backend endpoint that returns all three, so this derives them from the
// two endpoints that do exist:
//  - "Quizzes" / "Average Score" come from /quiz/get_last_ten_quiz_results.
//    Note this endpoint only ever returns the most recent 10 results, so
//    these numbers are "out of your last 10", not a lifetime total -- there
//    is no "total quizzes taken" endpoint to query for a true total.
//  - "Rank" is the user's 1-based position in /quiz/get_leaderboard, the
//    same coins-based ranking already used on the real Leaderboard page.
function updateProfileStats(username) {
    fetch('/quiz/get_last_ten_quiz_results')
        .then(response => response.json())
        .then(data => {
            const results = Array.isArray(data) ? data : [];
            document.getElementById('user-quizzes').textContent = results.length;
            if (results.length > 0) {
                const avg = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
                document.getElementById('user-avg-score').textContent = avg.toFixed(2);
            } else {
                document.getElementById('user-avg-score').textContent = '-';
            }
        })
        .catch(error => {
            console.error('Error fetching quiz results for stats:', error);
            document.getElementById('user-quizzes').textContent = '-';
            document.getElementById('user-avg-score').textContent = '-';
        });

    fetch('/quiz/get_leaderboard')
        .then(response => response.json())
        .then(leaderboard => {
            const list = Array.isArray(leaderboard) ? leaderboard : [];
            const position = list.findIndex(u => u.username === username);
            document.getElementById('user-rank').textContent = position === -1 ? '-' : String(position + 1);
        })
        .catch(error => {
            console.error('Error fetching leaderboard for rank:', error);
            document.getElementById('user-rank').textContent = '-';
        });
}

// BUG FIX: this used to hardcode the production domain
// (https://konkoor.chbk.app/quiz/scripts.js) to load the next script, so it
// broke (wrong origin / CORS) on localhost, staging, or any custom domain.
// Every other page in this app loads scripts with a path relative to the
// current origin (e.g. loadScript('/quiz/profile.js') in quiz-options.js) --
// this now does the same, and is reused below for the leaderboard/
// teacherboard buttons too.
function loadScript(scriptName, onLoaded) {
    const existingScript = document.querySelector(`script[src="${scriptName}"]`);
    if (existingScript) {
        existingScript.remove();
    }
    const script = document.createElement('script');
    script.src = scriptName;
    if (onLoaded) {
        script.onload = onLoaded;
    }
    document.body.appendChild(script);
}

// Function to load the home script (scripts.js)
function loadHomeScript() {
    loadScript('/quiz/scripts.js', () => {
        if (typeof showHomePage === 'function') {
            showHomePage();
        }
    });
}

// BUG FIX (new): previously had no handler at all -- clicking "Leaderboard"
// in the footer did nothing.
function loadLeaderboardScript() {
    loadScript('/quiz/leaderboard.js', () => {
        if (typeof showLeaderboardPage === 'function') {
            showLeaderboardPage();
        }
    });
}

// BUG FIX (new): previously had no handler at all -- clicking "Teacherboard"
// in the footer did nothing.
function loadTeacherboardScript() {
    loadScript('/quiz/teacherboard.js', () => {
        if (typeof showTeacherboardPage === 'function') {
            showTeacherboardPage();
        }
    });
}

// Function to fetch the latest quiz result
function fetchLatestQuizResult() {
    fetch('/quiz/get_latest_quiz_result')
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                document.getElementById('latest-quiz-result').innerHTML = data.message;
            } else {
                const strengthsWeaknesses = analyzeQuizResult(data);
                displayQuizResult(data, strengthsWeaknesses);
            }
        })
        .catch(error => {
            console.error('Error fetching quiz result:', error);
            document.getElementById('latest-quiz-result').innerHTML = 'Error fetching quiz result';
        });
}

// BUG FIX: /quiz/get_latest_quiz_result returns correct_answers,
// incorrect_answers and unanswered_questions as plain integers, not objects
// with a .count property. Reading result.correct_answers.count returned
// undefined on both sides of every comparison ("undefined > undefined" is
// always false), so this silently marked accuracy and time management as
// weaknesses for every single user no matter how well they actually did.
function analyzeQuizResult(result) {
    const strengths = [];
    const weaknesses = [];

    if (result.score >= 80) {
        strengths.push('Overall performance');
    } else if (result.score < 60) {
        weaknesses.push('Overall performance');
    }

    if (result.correct_answers > result.incorrect_answers) {
        strengths.push('Accuracy');
    } else {
        weaknesses.push('Accuracy');
    }

    if (result.unanswered_questions === 0) {
        strengths.push('Time management');
    } else if (result.unanswered_questions > 2) {
        weaknesses.push('Time management');
    }

    return { strengths, weaknesses };
}

// Function to display the quiz result with strengths and weaknesses
function displayQuizResult(result, strengthsWeaknesses) {
    const resultHTML = `
        <h4>${result.quiz_name}</h4>
        <p>Category: ${result.category}</p>
        <p>Score: ${result.score}%</p>
        <div class="strengths-weaknesses">
            <div class="strengths">
                <h5>Strengths:</h5>
                <ul>
                    ${strengthsWeaknesses.strengths.map(s => `<li>${s}</li>`).join('')}
                </ul>
            </div>
            <div class="weaknesses">
                <h5>Areas for Improvement:</h5>
                <ul>
                    ${strengthsWeaknesses.weaknesses.map(w => `<li>${w}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    document.getElementById('latest-quiz-result').innerHTML = resultHTML;
}

// Function to toggle the display of quiz results
function toggleQuizResults() {
    const resultsDiv = document.getElementById('quiz-results');
    if (resultsDiv.style.display === 'none') {
        fetchQuizResults();
        resultsDiv.style.display = 'block';
    } else {
        resultsDiv.style.display = 'none';
    }
}

// Function to fetch the last 10 quiz results
function fetchQuizResults() {
    return fetch('/quiz/get_last_ten_quiz_results')
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                document.getElementById('quiz-results').innerHTML = data.message;
                return null;
            } else {
                displayQuizResults(data);
                return data;
            }
        })
        .catch(error => {
            console.error('Error fetching quiz results:', error);
            document.getElementById('quiz-results').innerHTML = 'Error fetching quiz results';
            return null;
        });
}

// BUG FIX: /quiz/get_last_ten_quiz_results returns correct_answers,
// incorrect_answers and unanswered_questions as plain integers -- there is
// no .count property and no question_tags array anywhere in the response.
// The old code called `.count.question_tags.map(...)` on all three, which
// threw a TypeError on every single result. Since that throw happened
// inside fetchQuizResults()'s .then(), it was swallowed by its .catch(),
// so clicking "Show Last 10 Results" always rendered
// "Error fetching quiz results" instead of any actual data.
function displayQuizResults(results) {
    const resultsHTML = results.map(result => `
        <div class="quiz-result-item">
            <h4>${result.quiz_name}</h4>
            <p>Category: ${result.category}</p>
            <p>Score: ${result.score}%</p>
            <p>Total Questions: ${result.total_questions}</p>
            <div class="answer-details">
                <div class="answer-section">
                    <h5>Correct Answers: ${result.correct_answers}</h5>
                </div>
                <div class="answer-section">
                    <h5>Incorrect Answers: ${result.incorrect_answers}</h5>
                </div>
                <div class="answer-section">
                    <h5>Unanswered Questions: ${result.unanswered_questions}</h5>
                </div>
            </div>
            <p>Date: ${new Date(result.start_time).toLocaleString()}</p>
            <p>Duration: ${result.duration} seconds</p>
        </div>
    `).join('');

    document.getElementById('quiz-results').innerHTML = resultsHTML;
}

// Function to toggle the display of the score chart
function toggleScoreChart() {
    const chartContainer = document.getElementById('chartContainer');
    if (chartContainer.style.display === 'none') {
        fetchQuizResults()
            .then(data => {
                if (data && data.length > 0) {
                    displayScoreChart(data);
                    chartContainer.style.display = 'block';
                } else {
                    console.log('No data available to display chart');
                    document.getElementById('chartMessage').innerHTML = 'No data available to display chart';
                }
            })
            .catch(error => {
                console.error('Error displaying score chart:', error);
                document.getElementById('chartMessage').innerHTML = 'Error displaying score chart';
            });
    } else {
        chartContainer.style.display = 'none';
    }
}

// Function to display the score chart
function displayScoreChart(results) {
    const ctx = document.getElementById('scoreChart').getContext('2d');
    // Reverse the order of results
    const reversedResults = results.slice().reverse();
    const labels = reversedResults.map(result => result.quiz_name);
    const scores = reversedResults.map(result => result.score);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quiz Scores',
                data: scores,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                },
                x: {
                    ticks: {
                        maxRotation: 90,
                        minRotation: 90
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Initialize the profile page when the script is loaded
loadChartJs().then(() => {
    showProfilePage();
}).catch(error => {
    console.error('Failed to load Chart.js', error);
});

})();