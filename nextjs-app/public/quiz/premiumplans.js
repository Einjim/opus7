function createPremiumPlansPage() {
    // Clear existing content
    document.body.innerHTML = '';
  
    // Add required styles
    const style = document.createElement('style');
    style.textContent = `
      .back-button {
        position: fixed;
        top: 1rem;
        right: 1rem;
        background-color: #4c6ef5;
        color: white;
        border: none;
        border-radius: 0.5rem;
        padding: 0.5rem 1rem;
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 10;
      }
  
      .back-button:hover {
        background-color: #4559c9;
      }
  
      .content-wrapper {
        padding-top: 4rem;
        height: 100vh;
        overflow-y: auto;
      }
  
      .plans-container {
        padding: 2rem;
        width: 100%;
        max-width: 900px;
        margin: 0 auto;
        padding-bottom: 4rem;
      }
  
      .plans-title {
        font-size: 2.5rem;
        font-weight: bold;
        margin-bottom: 2rem;
        color: #4c6ef5;
        text-align: center;
      }
  
      .plans-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 2rem;
      }
  
      .plan-card {
        background-color: white;
        border-radius: 0.75rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        transition: transform 0.2s ease-in-out;
      }
  
      .plan-card:hover {
        transform: translateY(-5px);
      }
  
      .plan-header {
        background-color: #4c6ef5;
        color: white;
        padding: 1.5rem;
        text-align: center;
      }
  
      .plan-title {
        font-size: 1.5rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
      }
  
      .plan-price {
        font-size: 1.25rem;
      }
  
      .plan-features {
        padding: 1.25rem;
      }
  
      .plan-features ul {
        list-style: none;
        padding: 0;
        margin-bottom: 1rem;
      }
  
      .plan-features li {
        font-size: 1rem;
        color: #2d3748;
        margin-bottom: 0.5rem;
      }
  
      .plan-button {
        display: block;
        width: 100%;
        padding: 1rem;
        background-color: #38a169;
        color: white;
        text-align: center;
        text-decoration: none;
        font-weight: bold;
        border-radius: 0.75rem;
        transition: background-color 0.2s ease-in-out;
      }
  
      .plan-button:hover {
        background-color: #2f855a;
      }
  
      .payment-channel-button {
        width: 100%;
        padding: 0.75rem;
        margin: 0.5rem 0;
        border: none;
        border-radius: 0.5rem;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
  
      .telegram-button {
        background-color: #0088cc;
        color: white;
      }
  
      .telegram-button:hover {
        background-color: #006699;
      }
  
      .whatsapp-button {
        background-color: #25D366;
        color: white;
      }
  
      .whatsapp-button:hover {
        background-color: #128C7E;
      }
  
      @media (max-width: 640px) {
        .plans-container {
          padding: 1rem;
        }
        
        .plans-title {
          font-size: 2rem;
        }
      }
    `;
    document.head.appendChild(style);
  
    // Create main container
    const container = document.createElement('div');
    container.className = 'min-h-screen bg-gray-50 font-vazir text-right';
  
    // Add back button
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5"/>
        <path d="M12 19l-7-7 7-7"/>
      </svg>
      بازگشت
    `;
  
    // Create content wrapper for scrolling
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';
  
    // Create main content
    const main = document.createElement('main');
    main.className = 'p-4 space-y-6';
    main.innerHTML = `
      <div class="plans-container">
        <h2 class="plans-title">پلن‌های پرمیوم</h2>
  
        <div class="plans-grid">
          <div class="plan-card">
            <div class="plan-header">
              <h3 class="plan-title">پایه</h3>
              <p class="plan-price">۹۹,۰۰۰ تومان / ماه</p>
            </div>
            <div class="plan-features">
              <ul>
                <li>دسترسی به آزمون‌های دلخواه</li>
                <li>حذف تبلیغات</li>
                <li>پشتیبانی اولویت‌دار</li>
              </ul>
              <a href="#" class="plan-button">خرید پلن پایه</a>
            </div>
          </div>
  
          <div class="plan-card">
            <div class="plan-header">
              <h3 class="plan-title">استاندارد</h3>
              <p class="plan-price">۱۹۹,۰۰۰ تومان / ماه</p>
            </div>
            <div class="plan-features">
              <ul>
                <li>همه ویژگی‌های پلن پایه</li>
                <li>امکان ساخت آزمون</li>
                <li>تحلیل عملکرد پیشرفته</li>
              </ul>
              <a href="#" class="plan-button">خرید پلن استاندارد</a>
            </div>
          </div>
  
          <div class="plan-card">
            <div class="plan-header">
              <h3 class="plan-title">ویژه</h3>
              <p class="plan-price">۲۹۹,۰۰۰ تومان / ماه</p>
            </div>
            <div class="plan-features">
              <ul>
                <li>همه ویژگی‌های پلن استاندارد</li>
                <li>دسترسی به منتور اختصاصی</li>
                <li>مشاوره تحصیلی</li>
              </ul>
              <a href="#" class="plan-button">خرید پلن ویژه</a>
            </div>
          </div>
        </div>
      </div>
    `;
  
    // Append all elements
    contentWrapper.appendChild(main);
    container.appendChild(backButton);
    container.appendChild(contentWrapper);
    document.body.appendChild(container);
  
    // Add event listeners
    backButton.addEventListener('click', () => {
      loadScript('/quiz/quiz-options.js');
    });
  
    // Add event listeners for purchase buttons
    const purchaseButtons = document.querySelectorAll('.plan-button');
    purchaseButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        Swal.fire({
          title: 'خرید پلن',
          text: 'آیا مطمئن هستید که می‌خواهید این پلن را خریداری کنید؟',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'بله، خرید کن',
          cancelButtonText: 'انصراف',
          reverseButtons: true
        }).then((result) => {
          if (result.isConfirmed) {
            showPaymentChannels();
          }
        });
      });
    });
  }
  
  // Function to show payment channel options
  function showPaymentChannels() {
    Swal.fire({
      title: 'انتخاب روش پرداخت',
      html: `
        <button class="payment-channel-button telegram-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.145.118.181.344.203.483.023.139.039.424.026.621z"/>
          </svg>
          خرید از طریق تلگرام
        </button>
        <button class="payment-channel-button whatsapp-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.643 19.049c-1.421 0-2.775-.408-3.937-1.175l-4.389 1.175 1.195-4.344c-.833-1.205-1.324-2.656-1.324-4.23 0-4.066 3.321-7.352 7.455-7.352 4.133 0 7.452 3.286 7.452 7.352 0 4.066-3.319 7.352-7.452 7.352zm4.547-5.823c-.219-.112-1.297-.641-1.497-.713-.201-.073-.347-.107-.494.112-.147.222-.571.713-.699.859-.128.146-.257.164-.476.055-.22-.112-.927-.342-1.767-1.09-.654-.583-1.095-1.303-1.222-1.524-.128-.222-.014-.342.096-.452.099-.102.219-.265.329-.397.108-.132.145-.227.219-.38.073-.153.036-.285-.019-.397-.055-.112-.494-1.19-.678-1.633-.176-.43-.358-.371-.493-.371-.128 0-.274-.019-.421-.019-.146 0-.385.055-.586.277-.201.223-.768.752-.768 1.634 0 .882.641 1.734.73 1.853.089.118 1.248 1.909 3.027 2.677 1.779.768 1.779.51 2.098.478.32-.031 1.296-.53 1.477-1.041.183-.511.183-.946.128-1.038-.054-.092-.201-.147-.421-.258z"/>
          </svg>
          خرید از طریق واتساپ
        </button>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'بستن',
    }).then(() => {
      // Handle dialog close
    });
  
    // Add event listeners for payment channel buttons
    const telegramButton = document.querySelector('.telegram-button');
    const whatsappButton = document.querySelector('.whatsapp-button');
  
    telegramButton.addEventListener('click', () => {
      window.open('https://t.me/your_telegram_bot', '_blank');
    });
  
    whatsappButton.addEventListener('click', () => {
      window.open('https://wa.me/your_whatsapp_number', '_blank');
    });
  }
  
  // Function to load other scripts (from the quiz options page)
  function loadScript(scriptName) {
    const existingScript = document.querySelector(`script[src="${scriptName}"]`);
    if (existingScript) {
      existingScript.remove();
    }
    
    const script = document.createElement('script');
    script.src = scriptName;
    document.body.appendChild(script);
  }
  
  // Initialize the page
  createPremiumPlansPage();