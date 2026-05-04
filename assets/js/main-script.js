import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { auth, db, storage } from './firebase.js';
import { initializeCommonElements, setupAuthModal } from './auth.js';

console.log('main-script.js loaded successfully');

async function initializeApkDownloadLink() {
    const apkLink = document.getElementById('apk-download-link');
    if (!apkLink) {
        console.log('APK link element not found on this page');
        return;
    }

    console.log('APK link element found, fetching download URL...');

    try {
        const apkRef = ref(storage, 'app/TCN-Vazsony.apk'); 
        const url = await getDownloadURL(apkRef);

        apkLink.href = url;
        apkLink.style.display = 'inline-block';
        console.log('APK download URL loaded successfully');

    } catch (error) {
        console.error('APK download URL fetch failed:', error);
        apkLink.style.display = 'inline-block';
        apkLink.href = 'https://storage.googleapis.com/tcnweboldal.firebasestorage.app/app/TCN-Vazsony.apk';
        console.log('APK link set to fallback direct bucket URL');
    }
}



document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        let currentUser = user;
        let currentUserData = null;

        if (user) {
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            currentUserData = userDocSnap.exists() ? userDocSnap.data() : {};
        }

        initializeCommonElements(currentUser, currentUserData);
        setupAuthModal();
        initializeApkDownloadLink();
        console.log('Main initialization complete - user:', user?.email || 'anonymous');
        console.log('DOMContentLoaded event triggered');

        if (document.getElementById('documents-page')) { 
            const { initDocumentsPage } = await import('./pages/documents.js');
            initDocumentsPage();
        }
        if (document.querySelector('.admin-container')) {
            const { initAdminPage } = await import('./pages/admin.js');
            initAdminPage(currentUser, currentUserData);
        }
        if (document.getElementById('booking')) {
            const { initBookingPage } = await import('./pages/booking.js');
            initBookingPage(currentUser, currentUserData);
        }
        if (document.getElementById('gallery-page')) {
            const { initGalleryPage } = await import('./pages/gallery.js');
            initGalleryPage();
        }
        if (document.getElementById('results-page')) {
            const { initResultsPage } = await import('./pages/results.js');
            initResultsPage();
        }
        if (document.getElementById('tournaments-section')) {
            const { initTournamentsPage } = await import('./pages/tournaments.js');
            initTournamentsPage(currentUser, currentUserData);
        }
        if (document.getElementById('profile-page') || document.getElementById('my-bookings-page')) {
            const { initUserProfilePages } = await import('./pages/user-profile.js');
            initUserProfilePages(currentUser, currentUserData);
        }
        if (document.getElementById('news-section') || document.getElementById('court-status-section') || document.getElementById('hero-court-status-container')) {
            const { initStaticPages } = await import('./pages/static-pages.js');
            initStaticPages();
        }
    });
});