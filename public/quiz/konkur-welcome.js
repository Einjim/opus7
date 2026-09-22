function initializeKonkurWelcomePage(konkurName) {
  // Create main container
  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gray-50 font-vazir text-right flex flex-col';

  // Main Content
  const main = document.createElement('main');
  main.className = 'flex-grow flex items-center justify-center p-4';
  main.innerHTML = `
    <div id="welcome-page" class="text-center">
      <h2 id="welcome-message" class="text-3xl font-bold mb-6 text-blue-700">به ${konkurName} خوش آمدید!</h2>
      <button id="continue-btn" class="bg-blue-500 text-white px-8 py-4 rounded-xl text-xl font-bold hover:bg-blue-600 transition shadow-md">
        ادامه
      </button>
    </div>

    <div id="instruction-page" class="text-center hidden">
      <div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
        <h2 class="text-2xl font-bold mb-6 text-green-700">شما ۱۰ دقیقه وقت دارید تا به سوالات پاسخ دهید</h2>
        <p class="text-gray-700 mb-4">لطفاً با دقت و تمرکز به سوالات پاسخ دهید. موفق باشید!</p>
        <button id="start-quiz-btn" class="bg-green-500 text-white px-8 py-4 rounded-xl text-xl font-bold hover:bg-green-600 transition shadow-md">
          برای شروع کلیک کنید
        </button>
      </div>
    </div>

    <div id="quiz-page" class="hidden w-full">
      <!-- Quiz questions will be loaded here -->
    </div>
  `;

  // Append main to container and container to body
  container.appendChild(main);
  document.body.appendChild(container);

  // Event Listeners
  const continueBtn = document.getElementById('continue-btn');
  const instructionPage = document.getElementById('instruction-page');
  const welcomePage = document.getElementById('welcome-page');
  const startQuizBtn = document.getElementById('start-quiz-btn');
  const quizPage = document.getElementById('quiz-page');

  continueBtn.addEventListener('click', () => {
    welcomePage.classList.add('hidden');
    instructionPage.classList.remove('hidden');
  });

  startQuizBtn.addEventListener('click', () => {
    fetch('/quiz/start_quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quiz: konkurName }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.questions && data.questions.length > 0) {
        localStorage.setItem('currentQuizName', konkurName);
        localStorage.setItem('currentQuiz', JSON.stringify(data.questions));
        localStorage.setItem('totalQuestions', data.questions.length);
        
        const startTime = new Date();
        localStorage.setItem('quizStartTime', startTime.toISOString());
        localStorage.setItem('userAnswers', JSON.stringify({}));
        
        const countdownDuration = 10 * 60 * 1000; // 10 minutes
        const endTime = new Date(startTime.getTime() + countdownDuration);
        localStorage.setItem('quizEndTime', endTime.toISOString());
        
        instructionPage.classList.add('hidden');
        quizPage.classList.remove('hidden');
        displayQuiz(data.questions);
      }
    })
    .catch(error => {
      console.error("Error starting quiz:", error);
      quizPage.innerHTML = '<p class="text-center text-red-500">متاسفیم، مشکلی در بارگیری آزمون پیش آمد.</p>';
    });
  });

  function displayQuiz(questions) {
    let currentQuestionIndex = 0;
    // Load answers from localStorage to persist selections between questions
    let userAnswers = JSON.parse(localStorage.getItem('userAnswers')) || {};
    let chatHistory = []; // Stores chat history for the quiz session

    function addMessageToChat(message, sender, container) {
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        
        let classes = 'p-2 rounded-lg mb-2 max-w-[85%] break-words w-fit';
        if (sender === 'user') {
            classes += ' bg-blue-100 text-blue-900 self-end ml-auto';
        } else {
            classes += ' bg-gray-200 text-gray-800 self-start mr-auto';
        }
        messageEl.className = classes;
        
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }

    function sendMessageToAI() {
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');
        const userMessage = chatInput.value.trim();

        if (!userMessage) return;

        const currentQuestionData = questions[currentQuestionIndex];
        const questionText = currentQuestionData.question;
        let options = [];
        if (typeof currentQuestionData.option === 'string') {
            try {
                options = JSON.parse(currentQuestionData.option);
            } catch (e) {
                options = currentQuestionData.option.split(',').map(opt => opt.trim());
            }
        } else if (Array.isArray(currentQuestionData.option)) {
            options = currentQuestionData.option;
        }
        const optionsText = options.map((opt, index) => `گزینه ${index + 1}: ${opt}`).join('\n');

        const prompt = `با توجه به سوال و گزینه های زیر:
سوال: "${questionText}"
گزینه ها:
${optionsText}

به این سوال کاربر پاسخ بده (مستقیم راهنمایی کن و به شماره گزینه اشاره نکن):
"${userMessage}"`;

        addMessageToChat(userMessage, 'user', chatMessages);
        chatHistory.push({ sender: 'user', message: userMessage });
        chatInput.value = '';

        const thinkingEl = document.createElement('div');
        thinkingEl.textContent = '...درحال نوشتن';
        thinkingEl.className = 'p-2 rounded-lg mb-2 max-w-[85%] break-words w-fit bg-gray-200 text-gray-500 self-start mr-auto animate-pulse';
        chatMessages.appendChild(thinkingEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        fetch('/quiz/ai/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt }),
        })
        .then(response => response.json())
        .then(data => {
            chatMessages.removeChild(thinkingEl);
            if (data.ai_response) {
                const aiMessage = data.ai_response;
                addMessageToChat(aiMessage, 'ai', chatMessages);
                chatHistory.push({ sender: 'ai', message: aiMessage });
            } else {
                addMessageToChat('متاسفانه مشکلی پیش آمد. لطفا دوباره تلاش کنید.', 'ai', chatMessages);
            }
        })
        .catch(error => {
            console.error('AI Chat Error:', error);
            chatMessages.removeChild(thinkingEl);
            addMessageToChat('خطا در ارتباط با سرور.', 'ai', chatMessages);
        });
    }

    function showQuestion() {
      const question = questions[currentQuestionIndex];
      let options = [];
      
      if (typeof question.option === 'string') {
        try {
          options = JSON.parse(question.option);
        } catch (error) {
          options = question.option.split(',').map(opt => opt.trim());
        }
      } else if (Array.isArray(question.option)) {
        options = question.option;
      }

      quizPage.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-3xl mx-auto">
          <h2 class="text-xl font-bold mb-4 text-blue-700">سوال ${currentQuestionIndex + 1}</h2>
          ${question.image ? `<img src="${question.image}" alt="Question Image" class="mb-4 rounded-xl max-h-48 mx-auto">` : ''}
          <p class="text-gray-700 mb-6">${question.question}</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${options.map((option, index) => `
              <label class="flex items-center p-3 bg-gray-100 rounded-xl hover:bg-gray-200 cursor-pointer transition duration-200">
                <input type="radio" name="answer" value="${index}" class="ml-3" ${userAnswers[question.id] === option ? 'checked' : ''}>
                <span class="flex-1">${option}</span>
                ${question[`option_${index+1}_image`] ? 
                  `<img src="${question[`option_${index+1}_image`]}" alt="Option Image" class="mr-3 max-h-16">` : 
                  ''}
              </label>
            `).join('')}
          </div>
          
          <div id="ai-chat-section" class="mt-8 border-t-2 border-gray-200 pt-4">
              <h3 id="toggle-chat-btn" class="text-lg font-bold text-purple-700 flex items-center justify-between gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition">
                  <span class="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M12 8V4H8"/><rect x="4" y="12" width="16" height="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 18v-2a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v2"/></svg>
                      راهنمای هوش مصنوعی
                  </span>
                  <svg id="chat-toggle-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 transition-transform"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </h3>
              <div id="chat-body" class="hidden">
                <div id="chat-messages" class="h-48 overflow-y-auto p-3 bg-gray-50 rounded-lg mb-3 border flex flex-col space-y-2"></div>
                <div class="flex gap-2">
                    <input type="text" id="chat-input" class="flex-grow border rounded-lg p-2 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition" placeholder="سوال خود را بپرسید...">
                    <button id="send-chat-btn" class="bg-purple-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-600 transition shadow">ارسال</button>
                </div>
              </div>
          </div>

          <div class="flex justify-between mt-8">
            ${currentQuestionIndex > 0 ? 
              `<button id="prev-question" class="bg-gray-500 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-gray-600 transition shadow-md">قبلی</button>` : 
              `<div></div>`}
            <button id="next-question" class="bg-blue-500 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-blue-600 transition shadow-md">
              ${currentQuestionIndex === questions.length - 1 ? 'پایان' : 'بعدی'}
            </button>
          </div>
        </div>
      `;

      const chatMessagesContainer = document.getElementById('chat-messages');
      chatMessagesContainer.innerHTML = '';
      chatHistory.forEach(chat => addMessageToChat(chat.message, chat.sender, chatMessagesContainer));

      const toggleChatBtn = document.getElementById('toggle-chat-btn');
      const chatBody = document.getElementById('chat-body');
      const chatToggleIcon = document.getElementById('chat-toggle-icon');

      toggleChatBtn.addEventListener('click', () => {
          chatBody.classList.toggle('hidden');
          const isHidden = chatBody.classList.contains('hidden');
          chatToggleIcon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
      });

      const sendChatBtn = document.getElementById('send-chat-btn');
      const chatInput = document.getElementById('chat-input');
      
      sendChatBtn.addEventListener('click', sendMessageToAI);
      chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          sendMessageToAI();
        }
      });
      
      const nextButton = document.getElementById('next-question');
      const prevButton = document.getElementById('prev-question');
      const radioButtons = document.querySelectorAll('input[name="answer"]');
      
      // --- MODIFICATION: Logic for selecting and unselecting answers ---
      radioButtons.forEach(radio => {
        radio.addEventListener('click', (e) => {
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
          
          // Save the updated state to localStorage
          localStorage.setItem('userAnswers', JSON.stringify(userAnswers));
        });
      });
      // --- END MODIFICATION ---

      if (prevButton) {
        prevButton.addEventListener('click', () => {
          if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showQuestion();
          }
        });
      }

      nextButton.addEventListener('click', () => {
        if (currentQuestionIndex === questions.length - 1) {
          submitQuiz();
        } else {
          currentQuestionIndex++;
          showQuestion();
        }
      });
    }

    function submitQuiz() {
      const startTime = localStorage.getItem('quizStartTime');
      const endTime = new Date();
      const duration = endTime - new Date(startTime);
      const quizName = localStorage.getItem('currentQuizName');
      const totalQuestions = parseInt(localStorage.getItem('totalQuestions'));

      const allQuestionIds = questions.map(q => q.id);

      // Mistake-review video: figure out the user's single MOST COMMON
      // mistake -- the question_tag that shows up most often among
      // questions they answered incorrectly. `questions` already holds
      // each question's `correct_option` and `question_tag` from
      // /quiz/start_quiz, so this is computed entirely client-side without
      // waiting on the server response. Unanswered questions are left out
      // on purpose (the user never made a "mistake" on those, they just
      // skipped them).
      function getMostCommonWrongTag() {
        const tagCounts = {};
        questions.forEach(q => {
          const userAns = userAnswers[q.id];
          if (userAns !== undefined && userAns !== q.correct_option && q.question_tag) {
            tagCounts[q.question_tag] = (tagCounts[q.question_tag] || 0) + 1;
          }
        });
        let bestTag = null;
        let bestCount = 0;
        Object.entries(tagCounts).forEach(([tag, count]) => {
          if (count > bestCount) {
            bestTag = tag;
            bestCount = count;
          }
        });
        return bestTag;
      }

      // Accepts either a plain URL string or a {url, title} object in the
      // database, and always returns a {url, title} pair -- falling back to
      // the mistake's tag name as the title if the DB entry doesn't specify
      // one (e.g. while the database is still being filled in).
      function normalizeReviewVideo(entry, fallbackTitle) {
        if (typeof entry === 'string') return { url: entry, title: fallbackTitle };
        return { url: entry.url, title: entry.title || fallbackTitle };
      }

      Promise.all([
        fetch('/quiz/submit_quiz_results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quizName: quizName,
            category: "all",
            userAnswers: userAnswers,
            startTime: startTime,
            duration: duration,
            totalQuestions: totalQuestions,
            allQuestionIds: allQuestionIds
          }),
        }).then(response => response.json()),
        // Video "database": a static tag -> [video URLs] lookup table.
        // Falls back to an empty object so a missing/broken file just
        // means no review videos show up, instead of breaking the results
        // page.
        fetch('/static/tag_videos.json').then(response => response.json()).catch(() => ({}))
      ])
      .then(([data, videoDb]) => {
        const mostCommonTag = getMostCommonWrongTag();
        // Database (filled in later) is tag -> array of videos; take up to
        // the first 3 as "ویدیو ۱ / ۲ / ۳" for that mistake. Each entry is
        // normalized to {url, title} so every video can show what it's
        // actually about, not just its position in the list.
        const reviewVideos = (mostCommonTag && Array.isArray(videoDb[mostCommonTag]))
          ? videoDb[mostCommonTag].slice(0, 3).map(v => normalizeReviewVideo(v, mostCommonTag))
          : [];

        quizPage.innerHTML = `
          <div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
            <h2 class="text-2xl font-bold mb-6 text-green-700">نتیجه آزمون</h2>
            <p class="text-gray-700 mb-4 text-xl">امتیاز شما: ${data.score}%</p>
            <div class="text-right mx-auto w-fit space-y-2 my-6">
                <p class="text-gray-700">تعداد کل سوالات: ${totalQuestions}</p>
                <p class="text-green-600">پاسخ‌های صحیح: ${data.correctCount}</p>
                <p class="text-red-600">پاسخ‌های غلط: ${data.incorrectCount}</p>
                <p class="text-yellow-600">بدون پاسخ: ${data.unansweredCount}</p>
            </div>
            ${reviewVideos.length > 0 ? `
            <div id="mistake-review-section" class="text-right mt-2 mb-6">
              <button id="mistake-review-toggle-btn" class="w-full bg-indigo-500 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-indigo-600 transition shadow-md">
                🎥 رفع اشکال و نقاط ضعف
              </button>
              <div id="mistake-review-panel" class="hidden mt-3">
                <div class="border rounded-xl p-3">
                  <div class="flex justify-between items-center mb-2">
                    <button id="review-prev-btn" class="text-indigo-600 font-bold px-2 py-1 disabled:opacity-30 disabled:cursor-not-allowed">‹ قبلی</button>
                    <span id="review-video-counter" class="text-sm text-gray-500"></span>
                    <button id="review-next-btn" class="text-indigo-600 font-bold px-2 py-1 disabled:opacity-30 disabled:cursor-not-allowed">بعدی ›</button>
                  </div>
                  <p id="review-video-title" class="font-bold text-gray-700 mb-2"></p>
                  <video id="review-video-player" class="w-full rounded-lg" controls preload="none"></video>
                </div>
              </div>
            </div>` : ''}
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

        // The button reveals a small carousel (one video at a time, with
        // its own title and a "ویدیو X از Y" counter) instead of dumping
        // all 3 players on the page at once. Nothing loads/plays until the
        // user actually opens it (preload="none").
        const mistakeToggleBtn = document.getElementById('mistake-review-toggle-btn');
        if (mistakeToggleBtn) {
          let reviewIndex = 0;
          const player = document.getElementById('review-video-player');
          const titleEl = document.getElementById('review-video-title');
          const counterEl = document.getElementById('review-video-counter');
          const prevBtn = document.getElementById('review-prev-btn');
          const nextBtn = document.getElementById('review-next-btn');

          function showReviewVideo(index) {
            reviewIndex = index;
            const video = reviewVideos[reviewIndex];
            player.pause();
            player.src = video.url;
            titleEl.textContent = video.title;
            counterEl.textContent = `ویدیو ${reviewIndex + 1} از ${reviewVideos.length}`;
            prevBtn.disabled = reviewIndex === 0;
            nextBtn.disabled = reviewIndex === reviewVideos.length - 1;
          }

          prevBtn.addEventListener('click', () => {
            if (reviewIndex > 0) showReviewVideo(reviewIndex - 1);
          });
          nextBtn.addEventListener('click', () => {
            if (reviewIndex < reviewVideos.length - 1) showReviewVideo(reviewIndex + 1);
          });

          mistakeToggleBtn.addEventListener('click', () => {
            document.getElementById('mistake-review-panel').classList.toggle('hidden');
          });

          showReviewVideo(0);
        }

        document.getElementById('back-to-home').addEventListener('click', () => {
          window.location.href = '/quiz/';
        });

        // Opens the same full-screen quiz-history viewer used elsewhere in
        // the app (history.js), so users can see their past quiz results
        // -- including the one they just took -- right from this results
        // screen instead of having to go back home and open the profile
        // drawer first.
        document.getElementById('view-history-btn').addEventListener('click', () => {
          if (document.getElementById('full-history-page')) return;
          const historyScript = document.createElement('script');
          // NOTE: history.js's own close button removes itself afterward by
          // looking for `script[src="history.js"]` (see history.js), matching
          // the relative form profilePic.js already uses elsewhere -- an
          // absolute '/quiz/history.js' src here would load fine but wouldn't
          // match that selector, leaving a stray <script> tag behind after
          // closing. Using the same relative path keeps that cleanup working.
          historyScript.src = 'history.js';
          document.body.appendChild(historyScript);
        });
      })
      .catch(error => console.error('Error submitting quiz:', error));
    }

    showQuestion();
  }
}