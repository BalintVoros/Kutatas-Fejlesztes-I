// /assets/js/pages/tournaments.js

import { db, auth } from '../firebase.js';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showToast } from '../ui.js';

export function initTournamentsPage(currentUser, currentUserData) {
    const container = document.getElementById('tournaments-container');
    if (!container) return;

    try {
        const tournamentsQuery = query(collection(db, "tournaments"), orderBy("date", "desc"));
        
        onSnapshot(tournamentsQuery, (snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = `<div class="col-12 text-center"><p>Jelenleg nincsenek meghirdetett versenyek.</p></div>`;
                return;
            }

            container.innerHTML = ''; 
            snapshot.forEach((tournamentDoc) => {
                const tournament = tournamentDoc.data();
                const tournamentId = tournamentDoc.id;

                const card = document.createElement('div');
                card.className = 'col-lg-10';
                card.id = `tournament-card-${tournamentId}`;
                card.innerHTML = `<div class="card mb-4 tournament-card"><div class="card-body text-center"><div class="spinner-border" role="status"></div></div></div>`;
                container.appendChild(card);

                const registrationsRef = collection(db, "tournaments", tournamentId, "registrations");
                onSnapshot(query(registrationsRef, orderBy("timestamp", "asc")), (registrationsSnap) => {
                    const registrations = registrationsSnap.docs.map(d => ({...d.data(), regId: d.id}));
                    const targetCard = document.getElementById(`tournament-card-${tournamentId}`);
                    if (!targetCard) return;

                    let userIsRegistered = false;
                    if (currentUser) {
                        userIsRegistered = registrations.some(reg => reg.regId === currentUser.uid);
                    }
                    
                    const isFull = registrations.length >= tournament.maxPlayers;
                    const isClosed = tournament.isClosed ?? false;

                    const descriptionHtml = tournament.description.split('\n').map(p => `<p>${p}</p>`).join('');
                    const playersHtml = registrations.map((reg, index) => `<li>${index + 1}. ${reg.name} ${reg.isMember ? '<span class="badge bg-success ms-2">Tag</span>' : ''}</li>`).join('');

                    let buttonHtml = '';
                    if (!isClosed && tournament.results && tournament.results.first_place) {
                        buttonHtml = `<button class="btn btn-secondary w-100" disabled>Verseny lezárult</button>`;
                    } else if (currentUser) {
                        if (isClosed) {
                             buttonHtml = `<button class="btn btn-secondary w-100" disabled>Jelentkezés lezárva</button>`;
                        } else if (userIsRegistered) {
                            buttonHtml = `<button class="btn btn-warning w-100" data-tournament-id="${tournamentId}" data-action="cancel">Jelentkezés lemondása</button>`;
                        } else if (isFull) {
                            buttonHtml = `<button class="btn btn-secondary w-100" disabled>Betelt</button>`;
                        } else {
                            buttonHtml = `<button class="btn btn-primary w-100" data-tournament-id="${tournamentId}" data-action="register">Jelentkezem!</button>`;
                        }
                    } else {
                        buttonHtml = `<p class="text-center">A jelentkezéshez <a href="#" data-bs-toggle="modal" data-bs-target="#authModal">jelentkezz be</a>!</p>`;
                    }

                    targetCard.innerHTML = `
                        <div class="card mb-4 tournament-card">
                            <div class="card-header">
                                <h3 class="card-title mb-0">${tournament.title}</h3>
                                <p class="card-subtitle text-muted">${tournament.date}</p>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-7">
                                        <h5>Verseny leírása</h5>
                                        <div class="card-text">${descriptionHtml}</div>
                                    </div>
                                    <div class="col-md-5">
                                        <h5>Jelentkezők (${registrations.length} / ${tournament.maxPlayers})</h5>
                                        <ul class="list-unstyled">${playersHtml || '<li>Még nincsenek jelentkezők.</li>'}</ul>
                                        <div class="mt-3">${buttonHtml}</div>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                    
                    targetCard.querySelector('button[data-tournament-id]')?.addEventListener('click', async (e) => {
                        const tournamentId = e.target.dataset.tournamentId;
                        const action = e.target.dataset.action;

                        if (action === 'register') {
                            if (confirm('Biztosan jelentkezel a versenyre?')) {
                                const regRef = doc(db, "tournaments", tournamentId, "registrations", currentUser.uid);
                                await setDoc(regRef, {
                                    userId: currentUser.uid,
                                    name: currentUserData.name,
                                    email: currentUser.email,
                                    isMember: currentUserData.isMember || false,
                                    timestamp: new Date()
                                });
                                showToast('Sikeresen jelentkeztél!', 'Siker', 'success');
                            }
                        } else if (action === 'cancel') {
                            if (confirm('Biztosan lemondod a jelentkezésed?')) {
                                const regRef = doc(db, "tournaments", tournamentId, "registrations", currentUser.uid);
                                await deleteDoc(regRef);
                                showToast('Jelentkezésedet töröltük.', 'Siker', 'success');
                            }
                        }
                    });
                });
            });
        });
    } catch (error) {
        console.error("Hiba a versenyek betöltésekor: ", error);
        container.innerHTML = `<div class="col-12 text-center"><div class="alert alert-danger">Hiba történt a versenyek betöltése közben.</div></div>`;
    }
}