document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signup-form');
    const signupDiv = document.getElementById('signup-page');

    // Get the dropdown selectors
    const daySelect = document.getElementById('birth-day');
    const monthSelect = document.getElementById('birth-month');
    const yearSelect = document.getElementById('birth-year');
    const birthdayInput = document.getElementById('birthday');

    // Maximum allowable year
    const MAX_YEAR = 1401;

    // Get number of days in a month for a given year in the Jalali calendar
    function getDaysInMonth(year, month) {
        const daysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
        if (month === 12) {
            return isLeapYear(year) ? 30 : 29;
        }
        return daysInMonth[month - 1];
    }

    // Check if a year is a leap year in the Jalali calendar
    function isLeapYear(year) {
        return ((year % 33) % 4) === 1;
    }

    function updateDate() {
        const day = parseInt(daySelect.value, 10);
        const month = parseInt(monthSelect.value, 10);
        const year = parseInt(yearSelect.value, 10);

        // Ensure the selected year is within the allowed range
        if (year > MAX_YEAR) {
            yearSelect.value = MAX_YEAR;
            return;
        }

        // Update day options based on selected month and year
        const daysInMonth = getDaysInMonth(year, month);
        const currentDay = day;
        
        // Clear and repopulate day options
        daySelect.innerHTML = '';
        for (let i = 1; i <= daysInMonth; i++) {
            const dayValue = i < 10 ? '0' + i : String(i);
            const option = new Option(i, dayValue);
            daySelect.add(option);
        }
        
        // Set the day value (ensure it's within range)
        if (currentDay <= daysInMonth) {
            daySelect.value = currentDay < 10 ? '0' + currentDay : String(currentDay);
        } else {
            daySelect.value = daysInMonth < 10 ? '0' + daysInMonth : String(daysInMonth);
        }

        // Update the hidden birthday input in the format your backend expects
        const finalDay = parseInt(daySelect.value, 10);
        const finalMonth = parseInt(monthSelect.value, 10);
        const finalYear = parseInt(yearSelect.value, 10);
        
        birthdayInput.value = `${finalYear} ${String(finalMonth).padStart(2, '0')} ${String(finalDay).padStart(2, '0')}`;
    }

    // Add event listeners to the dropdowns
    daySelect.addEventListener('change', updateDate);
    monthSelect.addEventListener('change', updateDate);
    yearSelect.addEventListener('change', updateDate);

    // Initialize the date picker
    updateDate();

    function redirectToAccountCreation(userId) {
        window.location.href = `/create-account/${userId}`;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const firstName = document.getElementById('first-name').value;
        const lastName = document.getElementById('last-name').value;
        const phone = document.getElementById('phone').value;
        const birthday = birthdayInput.value;

        console.log('Form submitted:', { email, firstName, lastName, phone, birthday });

        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, firstName, lastName, phone, birthday }),
            });

            if (response.ok) {
                console.log('Signup successful');
                const userData = await response.json();
                redirectToAccountCreation(userData.userId);
            } else {
                const errorData = await response.json();
                if (errorData.error === "This phone number is already verified and in use") {
                    alert("This phone number is already verified and in use. Please use a different phone number.");
                } else if (errorData.error === "This email is already verified and in use") {
                    alert("This email is already verified and in use. Please use a different email address.");
                } else {
                    alert(`Signup failed: ${errorData.error}`);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });
});