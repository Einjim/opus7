// This script handles the profile drawer, the full-screen image viewer,
// and ensures all profile pictures are styled as circles.

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Element Selectors ---
    const openDrawerButton = document.getElementById('profile-header-button');
    const profileDrawer = document.getElementById('profile-drawer');
    const closeDrawerButton = document.getElementById('close-drawer-btn');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const headerProfilePic = document.getElementById('header-profile-pic');
    const drawerProfilePic = document.getElementById('drawer-profile-pic');
    const imageViewerModal = document.getElementById('image-viewer-modal');
    const fullViewImage = document.getElementById('full-view-image');
    const quizHistoryBtn = document.getElementById('quiz-history-btn');

    // --- 2. Styling Functions ---
    const makeImageCircular = (imgElement) => {
        if (imgElement) {
            imgElement.style.borderRadius = '50%';
            imgElement.style.objectFit = 'cover';
            imgElement.style.aspectRatio = '1 / 1';
        }
    };

    makeImageCircular(headerProfilePic);
    makeImageCircular(drawerProfilePic);
    makeImageCircular(fullViewImage);

    // --- 3. Core Functions ---

    // Drawer Controls
    const openDrawer = () => profileDrawer?.classList.add('is-open');
    const closeDrawer = () => profileDrawer?.classList.remove('is-open');

    // Image Viewer Controls
    const openImageViewer = (event) => {
        event.stopPropagation();
        const imageSource = event.currentTarget.src;
        if (imageSource && fullViewImage && imageViewerModal) {
            fullViewImage.src = imageSource;
            imageViewerModal.classList.add('is-visible');
        }
    };
    const closeImageViewer = () => imageViewerModal?.classList.remove('is-visible');

    /**
     * Loads and executes the history.js script to show the full-screen history page.
     */
    const openHistoryPage = (event) => {
        event.preventDefault(); // Prevent any default link behavior

        // Prevent opening multiple history pages
        if (document.getElementById('full-history-page')) {
            return;
        }

        // Create a <script> element to load the history module
        const script = document.createElement('script');
        script.src = 'history.js'; // Ensure this path is correct

        // Add an ID to the script so it can remove itself upon closing
        script.id = 'history-script-loader';

        document.body.appendChild(script);

        // Close the profile drawer for a better user experience
        closeDrawer();
    };

    // --- 4. Event Listeners ---
    openDrawerButton?.addEventListener('click', openDrawer);
    closeDrawerButton?.addEventListener('click', closeDrawer);
    drawerOverlay?.addEventListener('click', closeDrawer);
    drawerProfilePic?.addEventListener('click', openImageViewer);
    imageViewerModal?.addEventListener('click', closeImageViewer);

    // Attach the new function to the history button
    quizHistoryBtn?.addEventListener('click', openHistoryPage);

    // NOTE: The complex event listener for quizHistoryContainer is no longer needed in this file.
});