document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signin-form');
    const errorMessage = document.getElementById('error-message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Get remember-me checkbox value with a fallback if element doesn't exist
        const rememberCheckbox = document.getElementById('remember-me');
        const rememberMe = rememberCheckbox ? rememberCheckbox.checked : true;

        try {
            const response = await fetch('/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    username, 
                    password,
                    rememberMe 
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.redirect) {
                    window.location.href = data.redirect;
                }
            } else {
                const errorData = await response.json();
                if (errorMessage) {
                    errorMessage.style.display = 'block';
                    errorMessage.textContent = errorData.error || 'خطا در ورود به سیستم';
                } else {
                    alert(`خطا در ورود: ${errorData.error}`);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            if (errorMessage) {
                errorMessage.style.display = 'block';
                errorMessage.textContent = 'خطا در ارتباط با سرور';
            } else {
                alert('خطا در ارتباط با سرور. لطفا دوباره تلاش کنید.');
            }
        }
    });
});