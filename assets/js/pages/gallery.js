// /assets/js/pages/gallery.js

import { db } from '../firebase.js';
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function initGalleryPage() {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    try {
        const q = query(collection(db, "gallery_images"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<div class="col-12 text-center"><p>Jelenleg nincsenek képek a galériában.</p></div>';
            return;
        }

        snapshot.forEach(doc => {
            const imageData = doc.data();
            const col = document.createElement('div');
            col.className = 'col-xl-3 col-lg-4 col-md-6';
            col.innerHTML = `
                <div class="gallery-item h-100">
                    <img src="${imageData.url}" class="img-fluid" alt="" style="width: 100%; height: 100%; object-fit: cover;">
                    <div class="gallery-links d-flex align-items-center justify-content-center">
                        <a href="${imageData.url}" title="${imageData.name}" class="glightbox preview-link"><i class="bi bi-arrows-angle-expand"></i></a>
                    </div>
                </div>`;
            container.appendChild(col);
        });
        
        GLightbox({ selector: '.glightbox' });

    } catch (error) {
        console.error("Hiba a galéria betöltésekor:", error);
        container.innerHTML = '<div class="col-12 text-center alert alert-danger">Hiba történt a képek betöltésekor.</div>';
    }
}