// history.js

/**
 * Creates and manages the full-screen quiz history page.
 */
function initializeHistoryPage() {
    // --- 1. Avoid duplicate pages ---
    if (document.getElementById('full-history-page')) {
        return;
    }

    // --- 2. Create Page Elements ---
    const historyPage = document.createElement('div');
    historyPage.id = 'full-history-page';

    const contentContainer = document.createElement('div');
    contentContainer.id = 'history-content-container';

    // --- 3. Style the Page ---
    Object.assign(historyPage.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '9990',
        backdropFilter: 'blur(5px)' // Optional: blur the background
    });

    Object.assign(contentContainer.style, {
        backgroundColor: 'white',
        width: '90%',
        maxWidth: '600px',
        height: '80%',
        maxHeight: '700px',
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden' // Important for scrolling
    });

    // --- 4. Create Header and Close Button ---
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #e5e7eb;
    `;
    header.innerHTML = `
        <h2 style="font-size: 1.25rem; font-weight: bold;">تاریخچه آزمون‌ها</h2>
        <button id="close-history-btn" style="font-size: 1.5rem; line-height: 1; cursor: pointer; border: none; background: none;">×</button>
    `;

    // --- 5. Create Scrollable Content Area ---
    const scrollableArea = document.createElement('div');
    scrollableArea.id = 'history-scroll-area';
    scrollableArea.style.cssText = `
        overflow-y: auto;
        padding: 0.5rem;
        flex-grow: 1;
    `;

    // --- 6. Append Elements ---
    contentContainer.appendChild(header);
    contentContainer.appendChild(scrollableArea);
    historyPage.appendChild(contentContainer);
    document.body.appendChild(historyPage);


    // --- 7. History Fetching & Display Logic ---

    /**
     * Fetches and displays the detailed view of a single quiz result.
     * @param {string} resultId - The ID of the quiz result to fetch.
     */
    const showQuizDetail = async (resultId) => {
        scrollableArea.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 1rem;">در حال بارگذاری جزئیات آزمون...</p>';
        try {
            const response = await fetch(`/quiz/get_quiz_result_details/${resultId}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            let detailHtml = `
                <div style="padding: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="font-size: 1.1rem; font-weight: bold;">${data.quiz_name}</h3>
                        <button id="back-to-history-list" style="font-size: 0.9rem; color: #2563eb; cursor: pointer; border: none; background: none; text-decoration: underline;">بازگشت</button>
                    </div>
                    <p style="font-size: 0.9rem; color: #4b5563; margin-bottom: 1rem;">امتیاز نهایی: <span style="font-weight: bold;">${data.score.toFixed(1)}%</span></p>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
            `;

            data.questions.forEach((q, index) => {
                const questionNumber = index + 1;
                let numberStyle = '';

                if (q.status === 'correct') {
                    numberStyle = 'background-color: #16a34a; color: white;';
                } else if (q.status === 'incorrect') {
                    numberStyle = 'background-color: #dc2626; color: white;';
                } else { // unanswered
                    numberStyle = 'background-color: #e5e7eb; color: #374151;';
                }

                detailHtml += `
                    <div style="padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px;">
                        <div style="margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                            <span style="flex-shrink: 0; display: inline-block; width: 1.5rem; height: 1.5rem; text-align: center; line-height: 1.5rem; border-radius: 50%; font-size: 0.9rem; ${numberStyle}">
                                ${questionNumber}
                            </span>
                            <span>${q.question_text}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                `;

                q.options.forEach(option => {
                    let optionStyle = 'padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db;';
                    let indicator = '';

                    if (option === q.correct_answer) {
                        optionStyle += 'background-color: #dcfce7; border-color: #16a34a; color: #15803d; font-weight: bold;';
                        indicator = ' ✔️';
                    }

                    if (q.status === 'incorrect' && option === q.user_answer) {
                        optionStyle += 'background-color: #fee2e2; border-color: #dc2626; color: #b91c1c;';
                        indicator = ' ❌';
                    }

                    detailHtml += `<div style="${optionStyle}">${option}${indicator}</div>`;
                });

                if (q.status === 'unanswered') {
                    detailHtml += `<div style="padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db; background-color: #f3f4f6; color: #4b5563; font-style: italic;">شما به این سوال پاسخ نداده‌اید.</div>`;
                }

                detailHtml += `</div></div>`;
            });

            detailHtml += `</div></div>`;
            scrollableArea.innerHTML = detailHtml;

        } catch (error) {
            console.error('Error fetching quiz details:', error);
            scrollableArea.innerHTML = `<div style="padding: 1rem; text-align: center; color: #dc2626;">خطا در دریافت جزئیات. <button id="back-to-history-list" style="font-size: 0.9rem; color: #2563eb; text-decoration: underline;">بازگشت</button></div>`;
        }
    };

    /**
     * **CORRECTED FUNCTION**
     * Fetches the list of all past quizzes, processes it on the client-side to remove duplicates,
     * and then displays a single, clean, merged list.
     */
    const fetchAndDisplayHistory = async () => {
        scrollableArea.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 1rem;">درحال بارگذاری تاریخچه...</p>';
        try {
            const response = await fetch('/quiz/get_full_quiz_history');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            scrollableArea.innerHTML = '';

            if (data.history && data.history.length > 0) {
                
                // *** NEW LOGIC TO PROCESS AND DE-DUPLICATE HISTORY ***
                const processedHistory = [];
                const seenMultiplayerGames = new Set();

                // Sort by date to ensure consistent processing order
                data.history.sort((a, b) => new Date(b.date) - new Date(a.date));

                for (const item of data.history) {
                    if (item.type === 'single') {
                        // Single player games are always unique, add them directly.
                        processedHistory.push(item);
                    } else if (item.type === 'multiplayer') {
                        // For multiplayer games, create a unique key to identify the game event.
                        // This key must be the same regardless of who is viewing the history.
                        // We round the date to the nearest minute to handle small timing differences.
                        const gameDate = new Date(item.date);
                        gameDate.setSeconds(0, 0); // Round down to the minute
                        const roundedTime = gameDate.getTime();
                        
                        // The key consists of the quiz name and the rounded time.
                        // This reliably identifies one specific game event.
                        const gameKey = `${item.quiz_name}|${roundedTime}`;

                        // If we have not processed this specific game event yet, add it.
                        if (!seenMultiplayerGames.has(gameKey)) {
                            processedHistory.push(item);
                            seenMultiplayerGames.add(gameKey); // Mark this game as processed.
                        }
                    }
                }
                // *** END OF NEW LOGIC ***

                // Now, render the CLEAN `processedHistory` array
                processedHistory.forEach(item => {
                    const date = new Date(item.date);
                    const formattedDate = date.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
                    const itemDiv = document.createElement('div');
                    itemDiv.style.cssText = 'padding: 0.75rem; border-bottom: 1px solid #f3f4f6;';

                    if (item.type === 'single') {
                        itemDiv.style.cursor = 'pointer';
                        itemDiv.classList.add('single-player-history-item');
                        itemDiv.dataset.resultId = item.result_id;
                        itemDiv.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; pointer-events: none;">
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <span style="font-size: 1.25rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;" title="آزمون انفرادی">👤</span>
                                    <div>
                                        <p style="font-weight: bold; font-size: 0.9rem;">${item.quiz_name}</p>
                                        <p style="font-size: 0.75rem; color: #6b7280;">${formattedDate}</p>
                                    </div>
                                </div>
                                <div style="text-align: left;">
                                    <p style="font-weight: bold; color: #2563eb;">${item.score.toFixed(1)}%</p>
                                    <p style="font-size: 0.75rem; color: #9ca3af;">امتیاز</p>
                                </div>
                            </div>
                        `;
                    } else { // This is a de-duplicated multiplayer entry
                        let competitorIconHtml;
                        if (item.opponent_profile_picture) {
                            competitorIconHtml = `
                                <img src="/${item.opponent_profile_picture}" 
                                     alt="${item.opponent}" 
                                     style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #e5e7eb;"
                                     title="آزمون دونفره">
                            `;
                        } else {
                            competitorIconHtml = `
                                <span style="font-size: 1.25rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;" title="آزمون دونفره">👥</span>
                            `;
                        }

                        itemDiv.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    ${competitorIconHtml}
                                    <div>
                                        <p style="font-weight: bold; font-size: 0.9rem;">${item.quiz_name}</p>
                                        <p style="font-size: 0.75rem; color: #6b7280;">${formattedDate}</p>
                                    </div>
                                </div>
                                <div style="text-align: left;">
                                    <p style="font-size: 0.8rem;">مقابل ${item.opponent || 'حریف'}</p>
                                </div>
                            </div>
                        `;
                    }
                    scrollableArea.appendChild(itemDiv);
                });

            } else {
                scrollableArea.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 1rem;">تاریخچه‌ای یافت نشد.</p>';
            }
        } catch (error) {
            console.error('Error fetching or processing quiz history:', error);
            scrollableArea.innerHTML = '<p style="text-align: center; color: #dc2626; padding: 1rem;">خطا در دریافت اطلاعات.</p>';
        }
    };

    // --- 8. Event Listeners ---
    const closeAndCleanup = () => {
        historyPage.remove();
        const thisScript = document.querySelector('script[src="history.js"]');
        if (thisScript) thisScript.remove();
    };

    document.getElementById('close-history-btn').addEventListener('click', closeAndCleanup);

    historyPage.addEventListener('click', (event) => {
        const historyItem = event.target.closest('.single-player-history-item');
        if (historyItem && historyItem.dataset.resultId) {
            showQuizDetail(historyItem.dataset.resultId);
            return;
        }

        if (event.target.id === 'back-to-history-list') {
            fetchAndDisplayHistory();
        }
    });

    // --- 9. Initial Load ---
    fetchAndDisplayHistory();
}

// --- Run the function when the script is loaded ---
initializeHistoryPage();