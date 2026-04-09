// /assets/js/ui.js

export function showToast(message, title = 'Értesítés', type = 'success') {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl) {
        console.error('Toast element not found!');
        alert(message); 
        return;
    }
    const toastTitle = document.getElementById('toast-title');
    const toastBody = document.getElementById('toast-body');
    const toastHeader = toastEl.querySelector('.toast-header');
    toastTitle.textContent = title;
    toastBody.textContent = message;
    toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'text-white', 'text-dark');
    if (type === 'success') {
        toastHeader.classList.add('bg-success', 'text-white');
    } else if (type === 'error') {
        toastHeader.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
        toastHeader.classList.add('bg-warning', 'text-dark');
    }
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

export function getFriendlyErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email': return 'Érvénytelen e-mail cím formátum.';
        case 'auth/user-not-found': case 'auth/wrong-password': case 'auth/invalid-credential': return 'Hibás e-mail cím vagy jelszó.';
        case 'auth/email-already-in-use': return 'Ez az e-mail cím már regisztrálva van.';
        case 'auth/weak-password': return 'A jelszónak legalább 6 karakter hosszúnak kell lennie.';
        default: return 'Ismeretlen hiba történt.';
    }
}