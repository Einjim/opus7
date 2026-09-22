document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-account-form');
    const profilePictureInput = document.getElementById('profile-picture');
    const profilePicturePreview = document.getElementById('profile-picture-preview');
    const profilePicturePlaceholder = document.querySelector('.profile-picture-container .placeholder');
    const profilePictureContainer = document.querySelector('.profile-picture-container');
    const errorMessage = document.getElementById('error-message');
    
    profilePictureContainer.addEventListener('click', () => {
        profilePictureInput.click();
    });

    profilePictureInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePicturePreview.src = e.target.result;
                profilePicturePreview.style.display = 'block';
                profilePicturePlaceholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const userId = document.getElementById('user-id').value;
        const profilePicture = profilePictureInput.files[0];

        if (password !== confirmPassword) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'رمزهای عبور مطابقت ندارند';
            return;
        }

        // Hide error message on new submission
        errorMessage.style.display = 'none';

        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('username', username);
        formData.append('password', password);
        if (profilePicture) {
            formData.append('profile_picture', profilePicture);
        }

        try {
            const response = await fetch('/create-account', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                console.log('Account created successfully');
                const data = await response.json();
                // The user is now signed in server-side (session cookie set),
                // so send them straight into the app instead of a dead '/welcome' route.
                window.location.href = data.redirect || '/quiz_app';
            } else {
                const errorData = await response.json();
                errorMessage.style.display = 'block';
                errorMessage.textContent = errorData.error || 'خطا در ایجاد حساب کاربری';
            }
        } catch (error) {
            console.error('Error:', error);
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'خطا در ارتباط با سرور';
        }
    });

    // The back button logic is no longer needed here as it's a standard link in the HTML.
});