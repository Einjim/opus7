// --- UNIFIED AND IMPROVED SCRIPT ---
//
// NOTE (dead/duplicate code, not fixed here since it's outside this file):
// index.html's own "شروع آزمون چندنفره" button (multiplayer-btn, wired in
// scripts.js) loads a completely different, older multiplayer
// implementation -- /quiz/multiPlayer.js -- not this file. This
// two-player-quiz.js + game.js pair is only ever reached via
// quiz-options.js's "آزمون دو نفره کنکور" button. The two implementations
// have diverged; multiPlayer.js is effectively a dead/duplicate parallel
// codepath for the same feature.

// MODIFICATION: Utility function to load other scripts, needed for the back button.
function loadScript(scriptName) {
  const existingScript = document.querySelector(`script[src="${scriptName}"]`);
  if (existingScript) existingScript.remove();
  
  const script = document.createElement('script');
  script.src = scriptName;
  document.body.appendChild(script);
}

// MODIFICATION: This new function ensures the drawer and its listeners are on the page.
function setupPageInfrastructure() {
    // Check if the drawer already exists to prevent adding it multiple times.
    if (document.getElementById('profile-drawer')) {
        return; 
    }

    // HTML for the profile drawer and the full-screen image viewer.
    //
    // BUG FIX: "ویرایش پروفایل" was a plain href="#" with no id and no
    // click handler at all -- a dead link, the same class of bug already
    // fixed in quiz-options.js/single-player-quiz.js/game-island.js (which
    // give this same anchor id="drawer-edit-profile" and wire it to
    // loadScript('/quiz/profile.js')). In practice this whole template is
    // rarely inserted at all -- every page that currently loads this script
    // (quiz-options.js, or index.html) already has its own #profile-drawer,
    // so the early-return above skips this block almost every time. It's
    // fixed anyway so it's correct if that guard is ever the one that
    // actually fires.
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

    // Add the drawer and modal to the page.
    document.body.insertAdjacentHTML('beforeend', drawerAndModalHTML);

    // Set up all the event listeners for the drawer and modal.
    const drawer = document.getElementById('profile-drawer');
    const openDrawerBtn = document.getElementById('profile-header-button');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const imageModal = document.getElementById('image-viewer-modal');
    const fullViewImage = document.getElementById('full-view-image');
    const drawerProfilePic = document.getElementById('drawer-profile-pic');
    const drawerEditProfile = document.getElementById('drawer-edit-profile');

    if (openDrawerBtn) openDrawerBtn.addEventListener('click', () => drawer.classList.add('is-open'));
    if(closeDrawerBtn) closeDrawerBtn.addEventListener('click', () => drawer.classList.remove('is-open'));
    if(drawerOverlay) drawerOverlay.addEventListener('click', () => drawer.classList.remove('is-open'));
    
    if(drawerProfilePic) drawerProfilePic.addEventListener('click', () => {
        fullViewImage.src = drawerProfilePic.src;
        imageModal.classList.add('is-visible');
    });
    
    if(imageModal) imageModal.addEventListener('click', () => imageModal.classList.remove('is-visible'));

    // BUG FIX (new): wire up the edit-profile link created above.
    if (drawerEditProfile) drawerEditProfile.addEventListener('click', (event) => {
        event.preventDefault();
        loadScript('/quiz/profile.js');
    });
}


/**
 * Fetches profile data, caches it, and updates both the header and the profile drawer.
 */
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

        // MODIFICATION: Select all elements that need updating, including the new drawer elements.
        const profilePic = document.getElementById('profile-pic');
        const drawerProfilePic = document.getElementById('drawer-profile-pic');
        const userName = document.getElementById('user-name');
        const drawerUserName = document.getElementById('drawer-user-name');
        const usernameSpan = document.getElementById('username');
        const drawerUsername = document.getElementById('drawer-username');
        const streaksCountElement = document.getElementById('streaks-count');
        const coinsCount = document.getElementById('coins-count');
        const hpCount = document.getElementById('hp-count');

        // Update profile picture in both header and drawer
        if (data.profile_picture) {
            if (profilePic) profilePic.src = data.profile_picture;
            if (drawerProfilePic) drawerProfilePic.src = data.profile_picture;
        }

        // Update user name in both header and drawer
        if (data.name) {
            if (userName) userName.textContent = data.name;
            if (drawerUserName) drawerUserName.textContent = data.name;
        }

        // Update username in both header and drawer
        if (data.username) {
            if (usernameSpan) usernameSpan.textContent = data.username;
            if (drawerUsername) drawerUsername.textContent = data.username;
        }
        
        // Update streaks with color logic
        if (streaksCountElement && data.streaks !== undefined) {
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

        // Update coins and HP
        if (coinsCount && data.coins !== undefined) coinsCount.textContent = data.coins;
        if (hpCount && data.hp !== undefined) hpCount.textContent = data.hp;
    })
    .catch(error => console.error('Error fetching profile:', error));
}


function fetchAndDisplayOpenRooms() {
    fetch('/quiz/get_open_rooms')
        .then(response => response.json())
        .then(openRooms => {
            // MODIFICATION: Added a flex container for the title and the new back button.
            const mainContentHTML = `
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold text-green-700">آزمون دو نفره کنکور</h2>
                    <button id="back-to-options-btn" title="بازگشت" class="text-gray-600 hover:text-blue-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-7 h-7">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="space-y-4">
                    <button id="create-private-game"
                        class="w-full bg-blue-500 text-white rounded-xl py-3 text-lg font-bold hover:bg-blue-600 transition shadow-md">
                        ایجاد بازی خصوصی
                    </button>
                    <h3 class="text-lg font-bold mb-3">اتاق های باز</h3>
                    <div id="open-rooms-container" class="space-y-2">
                        ${generateOpenRoomButtons(openRooms)}
                    </div>
                </div>
            `;

            const mainElement = document.querySelector('main');
            if (mainElement) {
                mainElement.innerHTML = mainContentHTML;
            } else {
                console.error('<main> element not found. Could not display rooms.');
                return;
            }

            // BUG FIX: this used to call loadProfileInfo() here too, which
            // means every single 5-second lobby poll (fetchAndDisplayOpenRooms
            // is itself on a setInterval) ALSO fired a fresh POST to
            // /quiz/get_profile forever while the user just sat on the lobby
            // screen -- a steady stream of redundant network requests that
            // serve no purpose (coins/HP practically never change while
            // browsing open rooms). Profile info is now loaded once, at
            // startup, by the "APPLICATION START" call at the bottom of this
            // file, not on every poll tick.

            // MODIFICATION: Add event listener for the new back button.
            document.getElementById('back-to-options-btn').addEventListener('click', () => {
                if (window.openRoomsIntervalId) {
                    clearInterval(window.openRoomsIntervalId); // Stop polling for rooms
                }
                loadScript('/quiz/quiz-options.js'); // Go back to the options page
            });
            
            document.getElementById('create-private-game').addEventListener('click', () => {
                if (window.openRoomsIntervalId) {
                    clearInterval(window.openRoomsIntervalId);
                }
                showSinglePlayerPage();
            });
            attachOpenRoomButtonListeners();
        })
        .catch(error => console.error('Error fetching open rooms:', error));
}

// ---- (The rest of your functions remain the same) ----

// Function to show the main multiplayer game lobby page
function showBackgammonPage() {
    // BUG FIX: if an old polling interval from a previous visit to this page
    // was somehow still running (e.g. this function is called again, as it
    // is from the waiting-room "cancel" button and from
    // showSinglePlayerPage()'s back button), starting a second
    // setInterval here without clearing the first would leak an
    // ever-growing number of concurrent /quiz/get_open_rooms pollers, each
    // re-rendering <main> on its own 5-second tick. Clear any existing one
    // first.
    if (window.openRoomsIntervalId) {
        clearInterval(window.openRoomsIntervalId);
    }
    fetchAndDisplayOpenRooms();
    const intervalId = setInterval(fetchAndDisplayOpenRooms, 5000);
    window.openRoomsIntervalId = intervalId;
}

function generateOpenRoomButtons(openRooms) {
    if (!openRooms || openRooms.length === 0) {
        return `<p class="text-center text-gray-500">هیچ اتاق بازی در حال حاضر وجود ندارد.</p>`;
    }
    return openRooms.map(room => `
        <button class="bg-green-500 text-white rounded-xl py-3 px-6 text-lg font-bold hover:bg-green-600 transition shadow-md w-full open-room-button" 
            data-room-id="${room.roomid}" 
            data-quiz-name="${room.quizname}">
            ${room.quizname}
        </button>
    `).join('');
}

function attachOpenRoomButtonListeners() {
    document.querySelectorAll('.open-room-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const roomId = event.currentTarget.dataset.roomId;
            const quizName = event.currentTarget.dataset.quizName;
            confirmJoinRoom(roomId, quizName);
        });
    });
}

function confirmJoinRoom(roomId, quizName) {
    // BUG FIX: this confirm() dialog was hardcoded in English ("You are
    // joining the ... OK? Cancel.") in an otherwise entirely Persian UI.
    if (confirm(`شما در حال پیوستن به آزمون «${quizName}» هستید. ادامه می‌دهید؟`)) {
        if (window.openRoomsIntervalId) {
            clearInterval(window.openRoomsIntervalId);
        }
        joinOpenRoom(roomId);
    }
}

function joinOpenRoom(roomId) {
    fetch('/quiz/join_room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(data.message);
            loadGamePage(roomId);
        } else {
            console.error(data.message);
            alert("پیوستن به اتاق ناموفق بود. لطفا دوباره تلاش کنید.");
            // BUG FIX: confirmJoinRoom() above already stopped the open-rooms
            // polling interval before attempting to join (in case the join
            // succeeded and the page was about to navigate away). If the
            // join actually FAILS, the user stays on this same lobby screen,
            // but the room list was left permanently frozen -- polling was
            // never restarted. Rebuild the lobby (which also restarts
            // polling) so the room the user just failed to join disappears
            // and the list starts refreshing again.
            showBackgammonPage();
        }
    })
    .catch(error => {
        console.error('Error joining room:', error);
        alert("An error occurred while joining the room. Please try again.");
        // Same fix as above: restart polling after a network-level failure too.
        showBackgammonPage();
    });
}

function showSinglePlayerPage() {
    fetch('/quiz/get_single_player_quizzes')
        .then(response => response.json())
        .then(quizzes => {
            // MODIFICATION: Also adding a back button here for consistent navigation.
            const singlePlayerPageContent = `
                <div class="flex justify-between items-center mb-4">
                     <h2 class="text-2xl font-bold">آزمون های کنکور</h2>
                     <button id="back-to-lobby-btn" title="بازگشت" class="text-gray-600 hover:text-blue-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-7 h-7">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="space-y-2">
                    ${generateQuizButtons(quizzes)}
                </div>
            `;
            
            const mainElement = document.querySelector('main');
            if (mainElement) {
                mainElement.innerHTML = singlePlayerPageContent;
            } else {
                 console.error('<main> element not found. Could not display quizzes.');
                return;
            }
            
            // MODIFICATION: Event listener for the back button on this page.
            document.getElementById('back-to-lobby-btn').addEventListener('click', showBackgammonPage);

            const quizButtons = document.querySelectorAll('.quiz-button');
            quizButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const quizName = button.dataset.quiz;
                    sendQuizSelection(quizName);
                });
            });
        })
        .catch(error => console.error('Error fetching quizzes:', error));
}

function generateQuizButtons(quizzes) {
    return quizzes.map(quiz => `
        <button class="w-full bg-blue-500 text-white rounded-xl py-3 text-lg font-bold hover:bg-blue-600 transition shadow-md quiz-button" 
            data-quiz="${quiz}">
            ${quiz}
        </button>
    `).join('');
}

function sendQuizSelection(quizName) {
    fetch('/quiz/quiz_selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_name: quizName })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        showWaitingPage(data.room_id);
    })
    .catch(error => console.error('Error sending quiz selection:', error));
}

function showWaitingPage(roomId) {
    // BUG FIX: this page used to have no cancel/back option at all -- if no
    // one ever joined the room, the user was stuck staring at "در انتظار
    // کاربر دیگر..." forever, with checkForJoiner()'s 5-second poll running
    // indefinitely and no way back to the lobby short of a full page reload.
    // A cancel button is added that stops the poll and returns to the lobby.
    const waitingPageContent = `
        <div class="min-h-screen bg-blue-500 font-vazir flex flex-col items-center justify-center gap-6">
            <div class="text-center text-white text-2xl font-bold">
                در انتظار کاربر دیگر...
            </div>
            <button id="cancel-waiting-btn" class="bg-white text-blue-600 rounded-xl py-2 px-6 text-lg font-bold hover:bg-gray-100 transition shadow-md">
                انصراف
            </button>
        </div>
    `;
    document.body.innerHTML = waitingPageContent;

    document.getElementById('cancel-waiting-btn').addEventListener('click', () => {
        if (window.waitingForJoinerIntervalId) {
            clearInterval(window.waitingForJoinerIntervalId);
        }
        // Actually close the room on the backend (see app.py's
        // /quiz/cancel_room route) so it stops showing up in other users'
        // open-rooms list -- previously this only stopped local polling and
        // left the room open in the database. Best-effort: return to the
        // lobby regardless of the outcome (e.g. if someone joined in the
        // instant before this request, the room can no longer be cancelled,
        // but the user shouldn't be stuck on this screen either way).
        fetch(`/quiz/cancel_room/${roomId}`, { method: 'POST' })
            .catch(error => console.error('Error closing room:', error))
            .finally(() => {
                loadScript('/quiz/quiz-options.js');
            });
    });

    checkForJoiner(roomId);
}

function checkForJoiner(roomId) {
    // BUG FIX: the interval id used to be kept only in a local variable
    // (`checkInterval`), unreachable from anywhere outside this function --
    // including the new cancel button above, which needs to be able to stop
    // this poll. Stored on `window` the same way the lobby's own polling
    // interval already is (window.openRoomsIntervalId).
    if (window.waitingForJoinerIntervalId) {
        clearInterval(window.waitingForJoinerIntervalId);
    }
    window.waitingForJoinerIntervalId = setInterval(() => {
        fetch(`/quiz/check_joiner/${roomId}`)
            .then(response => response.json())
            .then(data => {
                if (data.has_joiner) {
                    clearInterval(window.waitingForJoinerIntervalId);
                    loadGamePage(roomId);
                }
            })
            .catch(error => {
                console.error('Error checking for joiner:', error);
                clearInterval(window.waitingForJoinerIntervalId);
            });
    }, 5000);
}

function loadGamePage(roomId) {
    document.body.innerHTML = ''; // Clear body for the game script
    const script = document.createElement('script');
    script.src = '/quiz/game.js';
    script.onload = function() {
        if (typeof initializeGame === 'function') {
            initializeGame(roomId);
        } else {
            console.error('initializeGame function not found in game.js');
            document.body.innerHTML = '<div>Error: Game could not be initialized.</div>';
        }
    };
    script.onerror = function() {
        console.error('Failed to load game.js');
        document.body.innerHTML = '<div>Error: Failed to load game resources.</div>';
    };
    document.body.appendChild(script);
}


// --- APPLICATION START ---
// MODIFICATION: Call the new setup function to ensure UI elements are ready.
setupPageInfrastructure();
loadProfileInfo();
showBackgammonPage();