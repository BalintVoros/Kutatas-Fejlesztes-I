// /assets/js/auth.js

import { signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase.js';
import { getFriendlyErrorMessage, showToast } from "./ui.js";

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

    let activeMode = 'login';

    function ensureAuthModeSwitcher() {
        if (!authModalEl || !authModalEl.querySelector('.auth-mode-switcher')) {
            const switcher = document.createElement('div');
            switcher.className = 'auth-mode-switcher';
            switcher.innerHTML = `
                <button type="button" class="auth-mode-btn active" data-auth-mode="login">Bejelentkezés</button>
                <button type="button" class="auth-mode-btn" data-auth-mode="register">Regisztráció</button>
                <button type="button" class="auth-mode-btn" data-auth-mode="reset">Jelszó reset</button>
            `;

            const modalBody = authModalEl.querySelector('.modal-body');
            if (modalBody) modalBody.insertBefore(switcher, modalBody.firstChild);

            switcher.querySelectorAll('.auth-mode-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.authMode;
                    if (mode === 'login') showLogin();
                    if (mode === 'register') showReg();
                    if (mode === 'reset') showReset();
                });
            });
        }
    }

    function setActiveMode(mode) {
        activeMode = mode;
        authModalEl.querySelectorAll('.auth-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.authMode === mode);
        });
        const titleEl = authModalEl.querySelector('.modal-title');
        if (!titleEl) return;
        if (mode === 'login') titleEl.textContent = 'Bejelentkezés';
        if (mode === 'register') titleEl.textContent = 'Regisztráció';
        if (mode === 'reset') titleEl.textContent = 'Jelszó visszaállítás';
    }

    function clearMessages() {
        if (errorMessageP) errorMessageP.textContent = '';
        if (successMessageP) successMessageP.textContent = '';
    }

    function setLoadingState(button, loadingText) {
        if (!button) return () => {};
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = loadingText;
        return () => {
            button.disabled = false;
            button.textContent = originalText;
        };
    }

    const showLogin = () => {
        if (loginView) {
            loginView.style.display = 'block';
            regView.style.display = 'none';
            resetView.style.display = 'none';
            clearMessages();
            setActiveMode('login');
        }
    };
    const showReg = () => {
        if (regView) {
            loginView.style.display = 'none';
            regView.style.display = 'block';
            resetView.style.display = 'none';
            clearMessages();
            setActiveMode('register');
        }
    };
    const showReset = () => {
        if (resetView) {
            loginView.style.display = 'none';
            regView.style.display = 'none';
            resetView.style.display = 'block';
            clearMessages();
            setActiveMode('reset');
        }
    };

    ensureAuthModeSwitcher();
    showLogin();

    if (showRegLink) showRegLink.onclick = e => { e.preventDefault(); showReg(); };
    if (showLoginLinkFromReg) showLoginLinkFromReg.onclick = e => { e.preventDefault(); showLogin(); };
    if (showResetLink) showResetLink.onclick = e => { e.preventDefault(); showReset(); };
    if (showLoginLinkFromReset) showLoginLinkFromReset.onclick = e => { e.preventDefault(); showLogin(); };

    if (regButton) regButton.onclick = () => {
        const name = document.getElementById("reg-name").value.trim();
        const email = document.getElementById("reg-email").value;
        const password = document.getElementById("reg-password").value;
        const isMember = document.getElementById("reg-is-member").checked;
        clearMessages();
        if (!name) { if (errorMessageP) errorMessageP.textContent = "A név megadása kötelező!"; return; }
        const release = setLoadingState(regButton, 'Folyamatban...');
        createUserWithEmailAndPassword(auth, email, password)
            .then(userCredential => {
                setDoc(doc(db, "users", userCredential.user.uid), { name, email: userCredential.user.email, isAdmin: false, isMember });
                if (successMessageP) successMessageP.textContent = 'Sikeres regisztráció! Bejelentkezve maradsz.';
            })
            .catch(error => { if (errorMessageP) errorMessageP.textContent = getFriendlyErrorMessage(error); })
            .finally(() => release());
    };
    if (loginButton) loginButton.onclick = () => {
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        clearMessages();
        const release = setLoadingState(loginButton, 'Beléptetés...');
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                if (successMessageP) successMessageP.textContent = 'Sikeres bejelentkezés!';
                showToast('Sikeres bejelentkezés!', 'Üdv újra', 'success');
                setTimeout(() => modalInstance.hide(), 200);
            })
            .catch(error => { if (errorMessageP) errorMessageP.textContent = getFriendlyErrorMessage(error); })
            .finally(() => release());
    };
    if (resetButton) {
        resetButton.onclick = () => {
            const email = document.getElementById('reset-email').value;
            clearMessages();
            if (!email) { if (errorMessageP) errorMessageP.textContent = "Kérjük, adja meg az e-mail címét!"; return; }
            const release = setLoadingState(resetButton, 'Küldés...');
            sendPasswordResetEmail(auth, email)
                .then(() => { if (successMessageP) successMessageP.textContent = "Ha a cím regisztrálva van, a visszaállító linket elküldtük!"; setTimeout(showLogin, 4000); })
                .catch(error => { console.error("Jelszó-visszaállítási hiba:", error); if (successMessageP) successMessageP.textContent = "Ha a cím regisztrálva van, a visszaállító linket elküldtük!"; })
                .finally(() => release());
        };
    }

    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('reg-form');
    const resetForm = document.getElementById('reset-form');

    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            if (activeMode === 'login' && loginButton) loginButton.click();
        };
    }

    if (regForm) {
        regForm.onsubmit = (e) => {
            e.preventDefault();
            if (activeMode === 'register' && regButton) regButton.click();
        };
    }

    if (resetForm) {
        resetForm.onsubmit = (e) => {
            e.preventDefault();
            if (activeMode === 'reset' && resetButton) resetButton.click();
        };
    }

    const triggerOnEnter = (selector, action) => {
        authModalEl.querySelectorAll(selector).forEach(input => {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    action();
                }
            });
        });
    };

    triggerOnEnter('#login-view input', () => {
        if (loginButton) loginButton.click();
    });

    triggerOnEnter('#registration-view input', () => {
        if (regButton) regButton.click();
    });

    triggerOnEnter('#password-reset-view input', () => {
        if (resetButton) resetButton.click();
    });
}