// This is the main script file for general page logic.

document.addEventListener('DOMContentLoaded', function() {
    
    // Function to fetch and display the user's profile information
    function loadProfileInfo() {
        fetch('/quiz/get_profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            sessionStorage.setItem('userProfileData', JSON.stringify(data));

            // Update profile pictures
            if (data.profile_picture) {
                document.getElementById('profile-pic').src = data.profile_picture;
                document.getElementById('drawer-profile-pic').src = data.profile_picture;
            } else {
                console.error('Profile picture not found');
            }

            // Update user names
            if (data.name) {
                document.getElementById('user-name').textContent = data.name;
                document.getElementById('drawer-user-name').textContent = data.name;
            } else {
                console.error('User name not found');
            }

            // Update usernames
            if (data.username) {
                document.getElementById('username').textContent = data.username;
                document.getElementById('drawer-username').textContent = data.username;
            } else {
                console.error('Username not found');
            }

            // Update streaks, coins, and HP
            if (data.streaks !== undefined) {
                const streaksCountElement = document.getElementById('streaks-count');
                const streaks = data.streaks;

                // Update the text content
                streaksCountElement.textContent = streaks;

                // ==> MODIFIED: Logic to change color based on streak count
                // First, remove any existing color classes to avoid conflicts
                const colorClasses = ['text-gray-500', 'text-orange-500', 'text-amber-500', 'text-lime-500', 'text-green-500', 'text-cyan-500', 'text-blue-500', 'text-purple-500'];
                streaksCountElement.classList.remove(...colorClasses);

                // Now, add the correct color class based on the value
                if (streaks === 0) {
                    streaksCountElement.classList.add('text-gray-500'); // Gray for 0
                } else if (streaks >= 1 && streaks <= 9) {
                    streaksCountElement.classList.add('text-orange-500'); // Orange for 1-9
                } else if (streaks >= 10 && streaks <= 24) {
                    streaksCountElement.classList.add('text-amber-500'); // Amber for 10-24
                } else if (streaks >= 25 && streaks <= 49) {
                    streaksCountElement.classList.add('text-lime-500'); // Lime for 25-49
                } else if (streaks >= 50 && streaks <= 74) {
                    streaksCountElement.classList.add('text-green-500'); // Green for 50-74
                } else if (streaks >= 75 && streaks <= 99) {
                    streaksCountElement.classList.add('text-cyan-500'); // Cyan for 75-99
                } else if (streaks >= 100 && streaks <= 199) {
                    streaksCountElement.classList.add('text-blue-500'); // Blue for 100-199
                } else { // 200+
                    streaksCountElement.classList.add('text-purple-500'); // Purple for 200+
                }
                
            } else {
                console.error('Streaks not found');
            }

            if (data.coins !== undefined) {
                document.getElementById('coins-count').textContent = data.coins;
            } else {
                console.error('Coins not found');
            }

            if (data.hp !== undefined) {
                document.getElementById('hp-count').textContent = data.hp;
            } else {
                console.error('HP not found');
            }
        })
        .catch(error => console.error('Error fetching profile:', error));
    }

    // Function to load scripts dynamically
    function loadScript(scriptName) {
        const existingScript = document.querySelector(`script[src="${scriptName}"]`);
        if (existingScript) {
            existingScript.remove();
        }
        
        const script = document.createElement('script');
        script.src = scriptName;
        document.body.appendChild(script);
    }

    // Load profile information on page load
    loadProfileInfo();

    // Handle footer navigation
    const tabs = document.querySelectorAll('footer button');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active states
            tabs.forEach(t => {
                t.classList.remove('text-blue-500');
                t.classList.add('text-gray-500');
            });
            this.classList.remove('text-gray-500');
            this.classList.add('text-blue-500');

            // Handle navigation
            const tabName = this.getAttribute('data-tab');
            switch(tabName) {
                case 'home':
                    window.location.href = '/quiz/';
                    break;
                case 'game-island':
                    window.location.href = '/quiz/game-island.html';
                    break;
                case 'education':
                    window.location.href = '/quiz/education.html';
                    break;
                case 'ranking':
                    window.location.href = '/quiz/ranking.html';
                    break;
                case 'profile':
                    loadScript('/quiz/profile.js');
                    break;
            }
        });
    });

    // Handle subject category buttons
    const subjectButtons = {
        'math-btn': 'math',
        'biology-btn': 'biology',
        'chemistry-btn': 'chemistry',
        'physics-btn': 'physics'
    };

    Object.entries(subjectButtons).forEach(([buttonId, subject]) => {
        document.getElementById(buttonId)?.addEventListener('click', () => {
            loadScript(`/quiz/${subject}.js`);
        });
    });

    // Handle multiplayer button
    document.getElementById('multiplayer-btn')?.addEventListener('click', () => {
        loadScript('/quiz/multiPlayer.js');
    });

    // Handle start quiz button
    document.getElementById('start-quiz-btn')?.addEventListener('click', () => {
        loadScript('/quiz/quiz-options.js');
    });

    // Handle "Progress Test" button
    document.getElementById('progress-test-btn')?.addEventListener('click', () => {
        loadScript('/quiz/progress-test.js');
    });

    // Handle "Remedial Test" button
    document.getElementById('remedial-test-btn')?.addEventListener('click', () => {
        loadScript('/quiz/remedial-test.js');
    });
});