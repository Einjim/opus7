// leaderboard.js
//
// NOTE (unreachable in the live app, not fixable from this file alone):
// nothing currently loads leaderboard.js. teacherboard.js's "🏆 Leaderboard"
// footer button calls loadLeaderboardScript(), which is a stub that only
// does console.log('Loading Leaderboard page') -- it never actually loads
// this file. profile.js has its own "🏆 Leaderboard" button
// (id="leaderboard-btn") with no click handler attached to it at all. Both
// of those are bugs in their own files, out of scope here, but they're why
// none of the fixes below are currently reachable by a real user yet.
//
// NOTE (duplicate code, not fixed here -- would require a larger refactor
// out of scope for this file): showChatPage/loadMessages/sendMessage below
// are a complete, independent reimplementation of the same one-on-one chat
// already built into messaging.js and game.js's chat panel. All three will
// drift further apart every time one of them gets fixed and the others
// don't (this file is a good example: it's the only one of the three that
// was missing message escaping until this fix).
//
// NOTE: this file, like singlePlayer.js, has no matching CSS anywhere in
// the project -- styles.css defines no .leaderboard-table, .message,
// .sent, or .received rules, so even with the bugs below fixed, the
// leaderboard table and the "sent vs. received" chat bubble styling will
// render as plain, unstyled HTML. Not fixed here since it was never styled
// in the first place and adding a full stylesheet is out of scope for a
// bug fix.

// BUG FIX: values from the server (usernames, first/last names typed in at
// signup with no server-side sanitization, and DM text) were previously
// inserted straight into innerHTML with no escaping anywhere in this file.
// A user who put e.g. <script>...</script> in their first name, or sent it
// as a chat message, could run arbitrary JS in every other viewer's
// browser (stored XSS) -- flagged for the DM-text case specifically in the
// original bug list, but the same unescaped-innerHTML pattern was present
// for every user-supplied field the leaderboard/chat views render.
function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value === null || value === undefined ? '' : String(value);
    return div.innerHTML;
}

// BUG FIX: getCurrentUserId() used to be a hardcoded `return 1;` placeholder
// ("Replace this with actual implementation"), so the sent/received chat
// bubble styling (and any future "is this my message" check) was correct
// only for whoever happened to have user id 1, and wrong for every other
// user. The backend already has a real endpoint for this
// (/quiz/get_user_id); fetched and cached here instead.
let currentUserId = null;

async function fetchCurrentUserId() {
    if (currentUserId !== null) return currentUserId;
    try {
        const response = await fetch('/quiz/get_user_id');
        const data = await response.json();
        if (data.success) {
            currentUserId = data.user_id;
        }
    } catch (error) {
        console.error('Error fetching current user id:', error);
    }
    return currentUserId;
}

// BUG FIX: getCurrentUserId() is called synchronously from inside
// displayMessages() (a plain, non-async function), so it can't itself
// await a fetch. Keeping it as a synchronous read of the cached value,
// and making sure fetchCurrentUserId() has already been awaited before
// any chat is opened (see showLeaderboardPage() below) instead of
// hardcoding a placeholder.
function getCurrentUserId() {
    return currentUserId;
}

// Function to fetch leaderboard data from the server
async function fetchLeaderboardData() {
    try {
        const response = await fetch('/quiz/get_leaderboard');
        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        return [];
    }
}

// Function to create and display the leaderboard
function displayLeaderboard(users) {
    const leaderboardContent = `
        <div class="container">
            <h2>Leaderboard</h2>
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>Profile Picture</th>
                        <th>User ID</th>
                        <th>Username</th>
                        <th>Name</th>
                        <th>Last Name</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>
                                ${user.profile_picture ? 
                                  `<img src="${escapeHtml(user.profile_picture)}" alt="${escapeHtml(user.username)}'s profile" width="50" height="50">` : 
                                  `<span style="font-size: 50px;">👤</span>`
                                }
                            </td>
                            <td>${user.id}</td>
                            <td>${escapeHtml(user.username)}</td>
                            <td>${escapeHtml(user.first_name)}</td>
                            <td>${escapeHtml(user.last_name)}</td>
                            <td><button class="chat-btn" data-userid="${user.id}">Message</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <button id="back-btn">Back</button>
        </div>
    `;
    document.body.innerHTML = leaderboardContent;
    // BUG FIX: this called showHomePage(), a function this file never
    // defines itself -- it only happens to exist if leaderboard.js was
    // loaded alongside another script that defines a global showHomePage()
    // (e.g. teacherboard.js does, scripts.js does). Loaded on its own (as
    // it is right now, via the showLeaderboardPage() call at the bottom of
    // this file), clicking "Back" threw "showHomePage is not defined" and
    // did nothing. Navigates directly instead, the same way the other
    // self-contained page-builder scripts in this app do, so it doesn't
    // depend on an external global that may or may not exist. Also uses a
    // relative path rather than a hardcoded production domain, matching
    // the fix already applied to the equivalent issue in singlePlayer.js/
    // customQuizzes.js/teacherboard.js.
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '/quiz/';
    });

    // Add event listeners to chat buttons
    document.querySelectorAll('.chat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-userid');
            showChatPage(userId);
        });
    });
}

// Function to show the leaderboard page
async function showLeaderboardPage() {
    // BUG FIX: stop any chat-polling interval left over from a chat that
    // was open before navigating back here (see showChatPage()'s fix
    // below) -- otherwise it keeps firing loadMessages() against a
    // #chat-messages element that no longer exists once this replaces
    // document.body.
    stopChatPolling();

    // Make sure the real user id is loaded before any chat can be opened
    // from this page (see getCurrentUserId()'s fix above).
    await fetchCurrentUserId();

    const users = await fetchLeaderboardData();
    displayLeaderboard(users);
}

// BUG FIX: showChatPage() used to start a new `setInterval(...,5000)` every
// single time it ran, with nothing ever clearing a previous one. Opening a
// second chat (or reopening the same one) left every prior interval still
// running in the background, each on its own 5-second tick calling
// loadMessages(theirOwnOtherUserId) and overwriting the CURRENTLY visible
// #chat-messages element (IDs aren't scoped, so whichever chat is on
// screen "wins" each tick) -- in practice this could interleave or
// overwrite one conversation with another's messages a few seconds later,
// and kept accumulating a growing number of concurrent pollers for as long
// as the page stayed open. Tracked in one module-level variable and
// cleared before starting a new one, the same pattern already used for
// two-player-quiz.js/game.js's chat and lobby polling.
let chatPollingIntervalId = null;

function stopChatPolling() {
    if (chatPollingIntervalId) {
        clearInterval(chatPollingIntervalId);
        chatPollingIntervalId = null;
    }
}

// Function to show the chat page
async function showChatPage(otherUserId) {
    stopChatPolling();

    const chatContent = `
        <div class="container">
            <h2>Chat</h2>
            <div id="chat-messages"></div>
            <input type="text" id="message-input" placeholder="Type your message...">
            <button id="send-btn">Send</button>
            <button id="back-to-leaderboard-btn">Back to Leaderboard</button>
        </div>
    `;
    document.body.innerHTML = chatContent;

    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const backBtn = document.getElementById('back-to-leaderboard-btn');

    // Load existing messages
    await loadMessages(otherUserId);

    // Send message
    sendBtn.addEventListener('click', async () => {
        const message = messageInput.value.trim();
        if (message) {
            await sendMessage(otherUserId, message);
            messageInput.value = '';
            await loadMessages(otherUserId);
        }
    });

    // Back to leaderboard
    backBtn.addEventListener('click', showLeaderboardPage);

    // Set up periodic message loading
    chatPollingIntervalId = setInterval(() => loadMessages(otherUserId), 5000);
}

// Function to load messages
async function loadMessages(otherUserId) {
    try {
        const response = await fetch(`/quiz/get_messages/${otherUserId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch messages');
        }
        const data = await response.json();
        if (data.success) {
            displayMessages(data.messages);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Function to display messages
function displayMessages(messages) {
    const chatMessages = document.getElementById('chat-messages');
    // BUG FIX: guard against a stale poll tick firing after the chat page
    // has already been navigated away from (e.g. right before
    // stopChatPolling() clears it) -- without this, .innerHTML on null
    // threw, which loadMessages()'s catch then logged as a misleading
    // "Error loading messages".
    if (!chatMessages) return;
    chatMessages.innerHTML = messages.map(msg => `
        <div class="message ${msg.sender_id === getCurrentUserId() ? 'sent' : 'received'}">
            <p>${escapeHtml(msg.message)}</p>
            <small>${new Date(msg.timestamp).toLocaleString()}</small>
        </div>
    `).join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to send a message
async function sendMessage(receiverId, message) {
    try {
        const response = await fetch('/quiz/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ receiver_id: receiverId, message: message }),
        });
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        // BUG FIX (new): failures (e.g. insufficient coins, a 403 from the
        // backend) were only ever logged to the console -- the message
        // input was still cleared by the caller regardless, so the user
        // had no way to tell their message didn't actually send. A minimal
        // visible signal is enough here without redesigning the chat UI.
        alert('Message could not be sent. Please try again.');
    }
}

// Call the showLeaderboardPage function to start the application
showLeaderboardPage();