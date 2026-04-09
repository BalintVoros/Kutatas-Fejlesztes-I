// /assets/js/auth.js

import { signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase.js';
import { getFriendlyErrorMessage } from "./ui.js";

export function initializeCommonElements(currentUser, currentUserData) {
    const navLoginButton = document.getElementById('nav-login-button');
    const navUserInfo = document.getElementById('nav-user-info');
    const logoutButton = document.getElementById('logout-button');
    
    if (navLoginButton && navUserInfo) {
        if (currentUser) {
            navLoginButton.style.display = 'none';
            navUserInfo.style.display = 'block';
            const userName = currentUserData?.name ? currentUserData.name.split(' ')[0] : currentUser.email.split('@')[0];
            navUserInfo.querySelector('a > span').textContent = `Szia, ${userName}`;
        } else {
            navLoginButton.style.display = 'block';
            navUserInfo.style.display = 'none';
        }
    }
    if (logoutButton) {
        logoutButton.onclick = (e) => { 
            e.preventDefault(); 
            signOut(auth).then(() => { 
                if (window.location.pathname.includes('/admin') || window.location.pathname.includes('/profil') || window.location.pathname.includes('/foglalasaim')) { 
                    window.location.href = '/'; 
                } else { 
                    window.location.reload(); 
                } 
            }); 
        };
    }
}

export function setupAuthModal() {
    const authModalEl = document.getElementById('authModal');
    if (!authModalEl) return;
    
    const modalInstance = bootstrap.Modal.getInstance(authModalEl) || new bootstrap.Modal(authModalEl);
    const loginView = document.getElementById('login-view');
    const regView = document.getElementById('registration-view');
    const resetView = document.getElementById('password-reset-view');
    const showRegLink = document.getElementById('show-reg-view');
    const showLoginLinkFromReg = document.getElementById('show-login-view-from-reg');
    const showResetLink = document.getElementById('show-reset-view');
    const showLoginLinkFromReset = document.getElementById('show-login-view-from-reset');
    const regButton = document.getElementById('reg-button');
    const loginButton = document.getElementById('login-button');
    const resetButton = document.getElementById('reset-button');
    const errorMessageP = document.getElementById('error-message');
    const successMessageP = document.getElementById('success-message');

    const showLogin = () => { if (loginView) { loginView.style.display = 'block'; regView.style.display = 'none'; resetView.style.display = 'none'; errorMessageP.textContent = ''; successMessageP.textContent = ''; } };
    const showReg = () => { if (regView) { loginView.style.display = 'none'; regView.style.display = 'block'; resetView.style.display = 'none'; errorMessageP.textContent = ''; successMessageP.textContent = ''; } };
    const showReset = () => { if (resetView) { loginView.style.display = 'none'; regView.style.display = 'none'; resetView.style.display = 'block'; errorMessageP.textContent = ''; successMessageP.textContent = ''; } };

    if (showRegLink) showRegLink.onclick = e => { e.preventDefault(); showReg(); };
    if (showLoginLinkFromReg) showLoginLinkFromReg.onclick = e => { e.preventDefault(); showLogin(); };
    if (showResetLink) showResetLink.onclick = e => { e.preventDefault(); showReset(); };
    if (showLoginLinkFromReset) showLoginLinkFromReset.onclick = e => { e.preventDefault(); showLogin(); };

    if (regButton) regButton.onclick = () => {
        const name = document.getElementById("reg-name").value.trim();
        const email = document.getElementById("reg-email").value;
        const password = document.getElementById("reg-password").value;
        const isMember = document.getElementById("reg-is-member").checked;
        if (errorMessageP) errorMessageP.textContent = "";
        if (!name) { if (errorMessageP) errorMessageP.textContent = "A név megadása kötelező!"; return; }
        createUserWithEmailAndPassword(auth, email, password)
            .then(userCredential => {
                setDoc(doc(db, "users", userCredential.user.uid), { name, email: userCredential.user.email, isAdmin: false, isMember });
            })
            .catch(error => { if (errorMessageP) errorMessageP.textContent = getFriendlyErrorMessage(error); });
    };
    if (loginButton) loginButton.onclick = () => {
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        if (errorMessageP) errorMessageP.textContent = "";
        signInWithEmailAndPassword(auth, email, password)
            .then(() => { modalInstance.hide(); })
            .catch(error => { if (errorMessageP) errorMessageP.textContent = getFriendlyErrorMessage(error); });
    };
    if (resetButton) {
        resetButton.onclick = () => {
            const email = document.getElementById('reset-email').value;
            if (errorMessageP) errorMessageP.textContent = "";
            if (successMessageP) successMessageP.textContent = "";
            if (!email) { if (errorMessageP) errorMessageP.textContent = "Kérjük, adja meg az e-mail címét!"; return; }
            sendPasswordResetEmail(auth, email)
                .then(() => { if (successMessageP) successMessageP.textContent = "Ha a cím regisztrálva van, a visszaállító linket elküldtük!"; setTimeout(showLogin, 4000); })
                .catch(error => { console.error("Jelszó-visszaállítási hiba:", error); if (successMessageP) successMessageP.textContent = "Ha a cím regisztrálva van, a visszaállító linket elküldtük!"; });
        };
    }
}