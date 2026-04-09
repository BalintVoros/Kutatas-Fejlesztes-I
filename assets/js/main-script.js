import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { auth, db } from './firebase.js';
import { initializeCommonElements, setupAuthModal } from './auth.js';

async function initializeApkDownloadLink() {
    const apkLink = document.getElementById('apk-download-link');
    if (!apkLink) return;

    try {
        const storage = getStorage();
        const apkRef = ref(storage, 'app/TCN-Vazsony.apk'); 
        
        const url = await getDownloadURL(apkRef);

        apkLink.href = url;
        apkLink.style.display = 'inline-block';

    } catch (error) {
        if (error.code === 'storage/object-not-found') {
            console.log("Nincs APK fájl feltöltve a 'app/TCN-Vazsony.apk' helyre.");
        } else {
            console.error("Hiba az APK letöltési link betöltésekor:", error);
        }
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
        if (document.getElementById('news-section') || document.getElementById('court-status-section')) {
            const { initStaticPages } = await import('./pages/static-pages.js');
            initStaticPages();
        }
    });
});