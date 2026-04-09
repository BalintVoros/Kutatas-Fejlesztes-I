// /assets/js/pages/results.js

import { db } from '../firebase.js';
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function initResultsPage() {
    const container = document.getElementById('results-container');
    const filterContainer = document.getElementById('results-filter-buttons');
    if (!container || !filterContainer) return;

    try {
        const q = query(collection(db, "archived_tournaments"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const allResults = [];
        querySnapshot.forEach(doc => {
            allResults.push({ id: doc.id, ...doc.data() });
        });

        if (allResults.length === 0) {
            container.innerHTML = '<div class="alert alert-info text-center">Nincsenek archivált versenyeredmények.</div>';
            filterContainer.innerHTML = '';
            return;
        }
        
        const categories = ['Összes', ...new Set(allResults.map(r => r.category).filter(Boolean))];
        filterContainer.innerHTML = categories.map(cat => 
            `<button class="btn btn-outline-primary m-1" data-category="${cat}">${cat}</button>`
        ).join('');

        const renderResults = (filterCategory) => {
            const filtered = (filterCategory === 'Összes') 
                ? allResults 
                : allResults.filter(r => r.category === filterCategory);

            if (filtered.length === 0) {
                container.innerHTML = '<div class="alert alert-info text-center">Nincsenek a választott kategóriában eredmények.</div>';
                return;
            }

            let resultsHtml = '<div class="accordion" id="resultsAccordion">';
            filtered.forEach((tournament, index) => {
                if (tournament.results && tournament.results.first_place) {
                    resultsHtml += `
                        <div class="accordion-item">
                            <h2 class="accordion-header" id="heading-${tournament.id}">
                                <button class="accordion-button ${index > 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${tournament.id}" aria-expanded="${index === 0 ? 'true' : 'false'}" aria-controls="collapse-${tournament.id}">
                                    <strong>${tournament.title}</strong> - <span class="ms-2">${tournament.date}</span>
                                </button>
                            </h2>
                            <div id="collapse-${tournament.id}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" aria-labelledby="heading-${tournament.id}">
                                <div class="accordion-body">
                                    <ul class="list-group list-group-flush">
                                        <li class="list-group-item">🥇 <strong>1. Hely:</strong> ${tournament.results.first_place}</li>
                                        <li class="list-group-item">🥈 <strong>2. Hely:</strong> ${tournament.results.second_place || '-'}</li>
                                        <li class="list-group-item">🥉 <strong>3. Hely:</strong> ${tournament.results.third_place || '-'}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>`;
                }
            });
            resultsHtml += '</div>';
            container.innerHTML = resultsHtml;
        };
        
        filterContainer.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                filterContainer.querySelectorAll('button').forEach(btn => btn.classList.replace('btn-primary', 'btn-outline-primary'));
                button.classList.replace('btn-outline-primary', 'btn-primary');
                renderResults(button.dataset.category);
            });
        });
        
        filterContainer.querySelector('button[data-category="Összes"]').classList.replace('btn-outline-primary', 'btn-primary');
        renderResults('Összes');

    } catch (error) {
        console.error("Hiba az eredmények betöltésekor: ", error);
        container.innerHTML = '<div class="alert alert-danger">Hiba történt az eredmények betöltése közben.</div>';
    }
}