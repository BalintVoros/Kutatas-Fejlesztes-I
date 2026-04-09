// /assets/js/pages/documents.js

import { db } from '../firebase.js';
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function initDocumentsPage() {
    const container = document.getElementById('documents-container');
    if (!container) return;

    try {
        const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = '<div class="col-12 text-center"><p>Jelenleg nincsenek feltöltött dokumentumok.</p></div>';
            return;
        }
        
        container.innerHTML = ''; // Spinner eltávolítása
        snapshot.forEach(doc => {
            const docData = doc.data();
            const col = document.createElement('div');
            col.className = 'col-xl-4 col-md-6';
            col.innerHTML = `
                <div class="service-item position-relative">
                    <i class="bi bi-file-earmark-text"></i>
                    <h4><a href="${docData.url}" target="_blank" class="stretched-link">${docData.title}</a></h4>
                    <p>Kattintson ide a letöltéséhez.</p>
                </div>
            `;
            container.appendChild(col);
        });

    } catch (error) {
        console.error("Hiba a dokumentumok betöltésekor:", error);
        container.innerHTML = '<div class="col-12 text-center alert alert-danger">Hiba történt a dokumentumok betöltésekor.</div>';
    }
}