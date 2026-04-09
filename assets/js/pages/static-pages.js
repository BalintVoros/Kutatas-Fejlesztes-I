// /assets/js/pages/static-pages.js

import { db } from '../firebase.js';
import { collection, query, orderBy, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- PÁLYA ÁLLAPOT MEGJELENÍTÉSE (KEZDŐLAP) ---
function initializeCourtStatusDisplay() {
    const statusContainer = document.getElementById('court-status-container');
    if (!statusContainer) return;
    const statusRef = collection(db, 'court_status');
    onSnapshot(statusRef, (snapshot) => {
        let statuses = { 'nagy_palya': { status: 'Ismeretlen', color: 'secondary' }, 'kis_palya': { status: 'Ismeretlen', color: 'secondary' } };
        snapshot.forEach(doc => {
            const data = doc.data();
            let color = 'secondary';
            const positiveStatus = ["Játékra alkalmas", "Játékra alkalmas locsolni kell", "Falazásra alkalmas"];
            if (positiveStatus.includes(data.status)) { color = 'success'; }
            else if (data.status === 'Karbantartás alatt') { color = 'warning'; }
            else if (data.status === 'Eső miatt nem lehet') { color = 'danger'; }
            statuses[doc.id] = { status: data.status, color: color };
        });
        statusContainer.innerHTML = `<div class="col-md-5"><div class="status-card"><h4>Nagy Pálya</h4><span class="badge bg-${statuses.nagy_palya.color}">${statuses.nagy_palya.status}</span></div></div><div class="col-md-5"><div class="status-card"><h4>Kis Pálya</h4><span class="badge bg-${statuses.kis_palya.color}">${statuses.kis_palya.status}</span></div></div>`;
    });
}

// --- HÍREK OLDAL LOGIKÁJA ---
async function initializeNewsPage() {
    const newsContainer = document.getElementById('news-container');
    if (!newsContainer) return;
    try {
        const q = query(collection(db, "news"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        newsContainer.innerHTML = '';
        if (querySnapshot.empty) {
            newsContainer.innerHTML = `<div class="col-12 text-center"><p>Jelenleg nincsenek friss hírek.</p></div>`;
            return;
        }
        querySnapshot.forEach(doc => {
            const newsItem = doc.data();
            const newsCard = document.createElement('div');
            newsCard.className = 'col-lg-8';
            const contentParagraphs = newsItem.content.split('\n').map(p => `<p>${p}</p>`).join('');
            newsCard.innerHTML = `<div class="card mb-4 news-card-custom"><div class="card-body"><h3 class="card-title">${newsItem.title}</h3><p class="card-subtitle mb-2 text-muted">${newsItem.date}</p><div class="card-text">${contentParagraphs}</div></div></div>`;
            newsContainer.appendChild(newsCard);
        });
    } catch (error) {
        console.error("Hiba a hírek betöltésekor: ", error);
        newsContainer.innerHTML = `<div class="col-12 text-center"><div class="alert alert-danger">Hiba történt a hírek betöltése közben.</div></div>`;
    }
}

export function initStaticPages() {
    if (document.getElementById('court-status-section')) {
        initializeCourtStatusDisplay();
    }
    if (document.getElementById('news-section')) {
        initializeNewsPage();
    }
}