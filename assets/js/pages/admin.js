// /assets/js/pages/admin.js

import { db, storage } from '../firebase.js';
import { collection, getDocs, doc, setDoc, getDoc, query, where, orderBy, deleteDoc, updateDoc, addDoc, onSnapshot, writeBatch, serverTimestamp, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { showToast } from '../ui.js';

function initializeApkAdmin() {
    const uploadInput = document.getElementById('apk-upload');
    const uploadButton = document.getElementById('apk-upload-button');
    const progressDiv = document.getElementById('apk-upload-progress');
    const progressBar = progressDiv.querySelector('.progress-bar');

    if (!uploadButton || !uploadInput) return;

    uploadButton.addEventListener('click', () => {
        const file = uploadInput.files[0];
        if (!file) {
            showToast('Kérjük, válasszon ki egy APK fájlt a feltöltéshez.', 'Hiányzó fájl', 'warning');
            return;
        }

        progressDiv.style.display = 'block';
        const filePath = `app/TCN-Vazsony.apk`; 
        const storageRef = ref(storage, filePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                const progressPercent = Math.round(progress);
                progressBar.style.width = progressPercent + '%';
                progressBar.textContent = `${progressPercent}%`;
            }, 
            (error) => {
                console.error("APK feltöltési hiba:", error);
                showToast(`Hiba az APK feltöltésekor.`, 'Hiba', 'error');
                progressDiv.style.display = 'none';
            }, 
            () => {
                showToast('APK sikeresen feltöltve!', 'Siker', 'success');
                setTimeout(() => {
                    progressDiv.style.display = 'none';
                }, 2000);
                uploadInput.value = '';
            }
        );
    });
}

export function initAdminPage(currentUser, currentUserData) {
    const loadingSpinner = document.getElementById('loading-spinner');
    const adminContent = document.getElementById('admin-content');
    const accessDenied = document.getElementById('access-denied');
    
    if (currentUser && currentUserData && currentUserData.isAdmin === true) {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (accessDenied) accessDenied.style.display = 'none';
        if (adminContent) adminContent.style.display = 'block';
        
        const calendar = initializeAdminCalendar();
        let isCalendarRendered = false;
        
        loadAllUsers();
        initializeNewsAdmin();
        initializeCourtStatusAdmin();
        initializeTournamentAdmin();
        initializeAdminDashboard();
        initializeGalleryAdmin();
        initializeDocumentsAdmin();
        initializeApkAdmin();
        
        initializeMatchesAdmin(); 

        const bookingsTab = document.getElementById('bookings-tab');
        if (bookingsTab) {
            bookingsTab.addEventListener('shown.bs.tab', () => {
                if (calendar && !isCalendarRendered) {
                    calendar.render();
                    isCalendarRendered = true;
                }
            });
        }
    } else {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (accessDenied) accessDenied.style.display = 'block';
    }
}


async function initializeMatchesAdmin() {
    const pendingBody = document.getElementById('pending-matches-table-body');
    const approvedBody = document.getElementById('approved-matches-table-body');
    if (!pendingBody || !approvedBody) return;

    const usersMap = {};
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.forEach(doc => {
            usersMap[doc.id] = doc.data().name || doc.data().email || 'Ismeretlen';
        });
    } catch (e) {
        console.error("Hiba a nevek betöltésekor:", e);
    }

    const pendingQuery = query(collection(db, "match_results"), where("status", "==", "pending"), orderBy("date", "desc"));
    onSnapshot(pendingQuery, (snapshot) => {
        pendingBody.innerHTML = '';
        if (snapshot.empty) {
            pendingBody.innerHTML = '<tr><td colspan="6" class="text-center text-success"><i class="bi bi-check-circle"></i> Nincs jóváhagyásra váró eredmény.</td></tr>';
        } else {
            snapshot.forEach(docSnap => {
                const m = docSnap.data();
                const tr = document.createElement('tr');
                const dateStr = new Date(m.date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const p1Name = usersMap[m.player1Id] || m.player1Id;
                const p2Name = usersMap[m.player2Id] || m.player2Id;
                const winnerName = usersMap[m.winnerId] || 'Ismeretlen';

                tr.innerHTML = `
                    <td>${dateStr}</td>
                    <td class="fw-bold text-primary">${p1Name}</td>
                    <td class="fw-bold text-danger">${p2Name}</td>
                    <td class="text-center fw-bold fs-5">${m.player1Sets} - ${m.player2Sets}</td>
                    <td class="text-center">${m.scoreDetails || '-'}</td>
                    <td class="text-center">
                        <div class="btn-group">
                            <button class="btn btn-sm btn-success approve-match-btn" data-id="${docSnap.id}">Elfogad</button>
                            <button class="btn btn-sm btn-danger delete-match-btn" data-id="${docSnap.id}">Elutasít</button>
                        </div>
                    </td>
                `;
                pendingBody.appendChild(tr);
            });

            pendingBody.querySelectorAll('.approve-match-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.target.dataset.id;
                    if(confirm('Biztosan elfogadod ezt az eredményt? Innentől beleszámít a statisztikába.')) {
                        await updateDoc(doc(db, "match_results", id), { status: 'approved' });
                        showToast('Eredmény jóváhagyva!', 'Siker', 'success');
                    }
                };
            });

            pendingBody.querySelectorAll('.delete-match-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.target.dataset.id;
                    if(confirm('Biztosan ELUTASÍTOD és törlöd ezt az eredményt? (Pl. mert kamu adat)')) {
                        await deleteDoc(doc(db, "match_results", id));
                        showToast('Eredmény törölve.', 'Infó', 'info');
                    }
                };
            });
        }
    });

    const approvedQuery = query(collection(db, "match_results"), where("status", "==", "approved"), orderBy("date", "desc"), limit(20));
    onSnapshot(approvedQuery, (snapshot) => {
        approvedBody.innerHTML = '';
        if (snapshot.empty) {
            approvedBody.innerHTML = '<tr><td colspan="6" class="text-center">Még nincs jóváhagyott meccs.</td></tr>';
        } else {
            snapshot.forEach(docSnap => {
                const m = docSnap.data();
                const tr = document.createElement('tr');
                const dateStr = new Date(m.date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
                
                const winnerName = usersMap[m.winnerId] || 'Ismeretlen';
                const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
                const loserName = usersMap[loserId] || 'Ismeretlen';
                
                const winnerSets = m.winnerId === m.player1Id ? m.player1Sets : m.player2Sets;
                const loserSets = m.winnerId === m.player1Id ? m.player2Sets : m.player1Sets;

                tr.innerHTML = `
                    <td>${dateStr}</td>
                    <td class="text-success fw-bold">${winnerName}</td>
                    <td>${loserName}</td>
                    <td>${winnerSets}-${loserSets}</td>
                    <td>${m.scoreDetails || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger delete-match-btn" data-id="${docSnap.id}">Törlés</button>
                    </td>
                `;
                approvedBody.appendChild(tr);
            });

            approvedBody.querySelectorAll('.delete-match-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.target.dataset.id;
                    if(confirm('Biztosan TÖRLÖD ezt a korábban elfogadott meccset? A statisztikák újra fognak számolódni!')) {
                        await deleteDoc(doc(db, "match_results", id));
                        showToast('Eredmény visszavonva és törölve.', 'Figyelem', 'warning');
                    }
                };
            });
        }
    });
}



function initializeAdminCalendar() {
    const calendarEl = document.getElementById('admin-calendar');
    if (!calendarEl) return null;

    const bookingDetailModalEl = document.getElementById('bookingDetailModal');
    const bookingDetailModal = new bootstrap.Modal(bookingDetailModalEl);

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay'
        },
        allDaySlot: false,
        slotMinTime: '08:00:00',
        slotMaxTime: '21:00:00',
        locale: 'hu',
        buttonText: { today: 'Ma', week: 'Hét', day: 'Nap' },
        events: (fetchInfo, successCallback, failureCallback) => {
            const bookingsQuery = query(collection(db, "bookings"));
            onSnapshot(bookingsQuery, (snapshot) => {
                const events = [];
                snapshot.forEach((doc) => {
                    const booking = doc.data();
                    const start = new Date(`${booking.date}T${booking.time}`);
                    const end = new Date(start.getTime() + 60 * 60 * 1000);
                    let courtName = booking.courtId === 'kis_palya' ? 'Kis Pálya' : 'Nagy Pálya';
                    events.push({
                        id: doc.id,
                        title: `${booking.playerNames} (${courtName.substring(0,4)})`,
                        start: start,
                        end: end,
                        backgroundColor: booking.status === 'pending' ? '#ffc107' : '#198754',
                        borderColor: booking.status === 'pending' ? '#ffc107' : '#198754',
                        extendedProps: { ...booking, courtName: courtName }
                    });
                });
                successCallback(events);
            }, (error) => {
                console.error("Hiba a foglalások naptárhoz való betöltésekor:", error);
                failureCallback(error);
            });
        },
        eventClick: (info) => {
            info.jsEvent.preventDefault();
            const booking = info.event.extendedProps;
            const bookingId = info.event.id;

            document.getElementById('modal-booking-name').textContent = booking.name;
            document.getElementById('modal-booking-email').textContent = booking.email;
            document.getElementById('modal-booking-time').textContent = `${booking.date}, ${booking.time}`;
            document.getElementById('modal-booking-court').textContent = booking.courtName;
            document.getElementById('modal-booking-status').innerHTML = booking.status === 'pending' ? `<span class="badge bg-warning text-dark">Függőben</span>` : `<span class="badge bg-success">Jóváhagyva</span>`;

            const phoneRow = document.getElementById('modal-phone-row');
            const phoneTd = document.getElementById('modal-booking-phone');
            if (!booking.isMemberBooking && booking.phone) {
                phoneTd.textContent = booking.phone;
                phoneRow.style.display = 'table-row';
            } else {
                phoneRow.style.display = 'none';
            }

            const footer = document.getElementById('modal-booking-footer');
            footer.innerHTML = '';

            if (booking.status === 'pending') {
                const approveBtn = document.createElement('button');
                approveBtn.className = 'btn btn-success';
                approveBtn.textContent = 'Jóváhagyás';
                approveBtn.onclick = async () => {
                    if (confirm('Biztosan jóváhagyod ezt a foglalást?')) {
                        await updateDoc(doc(db, "bookings", bookingId), { status: 'confirmed' });
                        showToast('Foglalás jóváhagyva!', 'Siker', 'success');
                        calendar.refetchEvents();
                        bookingDetailModal.hide();
                    }
                };
                footer.appendChild(approveBtn);
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger';
            deleteBtn.textContent = 'Törlés';
            deleteBtn.onclick = async () => {
                if (confirm('Biztosan törlöd ezt a foglalást?')) {
                    await deleteDoc(doc(db, "bookings", bookingId));
                    showToast('Foglalás törölve!', 'Siker', 'success');
                    calendar.refetchEvents();
                    bookingDetailModal.hide();
                }
            };
            footer.appendChild(deleteBtn);
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn-secondary';
            closeBtn.textContent = 'Bezárás';
            closeBtn.setAttribute('data-bs-dismiss', 'modal');
            footer.appendChild(closeBtn);

            bookingDetailModal.show();
        }
    });
    return calendar;
}

async function initializeAdminDashboard() {
    const statsContainer = document.getElementById('quick-stats-container');
    if (!statsContainer) return;
    try {
        const today = new Date().toISOString().split('T')[0];
        const bookingsQuery = query(collection(db, "bookings"), where("date", ">=", today));
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const activeBookingsCount = bookingsSnapshot.size;
        const usersQuery = collection(db, "users");
        const usersSnapshot = await getDocs(usersQuery);
        const usersCount = usersSnapshot.size;
        statsContainer.innerHTML = `
            <p><strong>Aktív foglalások:</strong> ${activeBookingsCount}</p>
            <p><strong>Regisztrált felhasználók:</strong> ${usersCount}</p>
        `;
        const ctx = document.getElementById('bookingsChart');
        if (ctx) {
            const bookingsByDay = { 'Hétfő': 0, 'Kedd': 0, 'Szerda': 0, 'Csütörtök': 0, 'Péntek': 0, 'Szombat': 0, 'Vasárnap': 0 };
            const dayMapping = { 0: 'Vasárnap', 1: 'Hétfő', 2: 'Kedd', 3: 'Szerda', 4: 'Csütörtök', 5: 'Péntek', 6: 'Szombat' };
            const next7Days = new Date();
            next7Days.setDate(next7Days.getDate() + 7);
            const next7DaysString = next7Days.toISOString().split('T')[0];
            const weeklyBookingsQuery = query(collection(db, "bookings"), where("date", ">=", today), where("date", "<=", next7DaysString));
            const weeklyBookingsSnapshot = await getDocs(weeklyBookingsQuery);
            weeklyBookingsSnapshot.forEach(doc => {
                const booking = doc.data();
                const dayIndex = new Date(booking.date).getDay();
                const dayName = dayMapping[dayIndex];
                if (bookingsByDay.hasOwnProperty(dayName)) {
                    bookingsByDay[dayName]++;
                }
            });
            const sortedDays = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
            const chartData = sortedDays.map(day => bookingsByDay[day]);
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sortedDays,
                    datasets: [{
                        label: 'Foglalások száma (köv. 7 nap)',
                        data: chartData,
                        backgroundColor: 'rgba(39, 167, 118, 0.6)',
                        borderColor: 'rgba(39, 167, 118, 1)',
                        borderWidth: 1
                    }]
                },
                options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } } }
            });
        }
    } catch (error) {
        console.error("Hiba az admin dashboard betöltésekor:", error);
        statsContainer.innerHTML = `<p class="text-danger">Statisztikák betöltése sikertelen.</p>`;
    }
}

function initializeCourtStatusAdmin() {
    const statusForm = document.getElementById('court-status-form');
    if (!statusForm) return;
    const nagyPalyaSelect = document.getElementById('status-nagy-palya');
    const kisPalyaSelect = document.getElementById('status-kis-palya');
    const nagyPalyaRef = doc(db, 'court_status', 'nagy_palya');
    const kisPalyaRef = doc(db, 'court_status', 'kis_palya');
    getDoc(nagyPalyaRef).then(docSnap => { if (docSnap.exists()) nagyPalyaSelect.value = docSnap.data().status; });
    getDoc(kisPalyaRef).then(docSnap => { if (docSnap.exists()) kisPalyaSelect.value = docSnap.data().status; });
    statusForm.onsubmit = async (e) => {
        e.preventDefault();
        try {
            await setDoc(nagyPalyaRef, { status: nagyPalyaSelect.value });
            await setDoc(kisPalyaRef, { status: kisPalyaSelect.value });
            showToast('Állapotok sikeresen mentve!', 'Siker', 'success');
        } catch (error) {
            console.error("Hiba az állapotok mentésekor: ", error);
            showToast('Hiba történt az állapotok mentése során.', 'Hiba', 'error');
        }
    };
}

function initializeNewsAdmin() {
    const addNewsForm = document.getElementById('add-news-form');
    if (addNewsForm) {
        document.getElementById('news-date').valueAsDate = new Date();
        addNewsForm.onsubmit = async (e) => {
            e.preventDefault();
            const title = document.getElementById('news-title').value;
            const date = document.getElementById('news-date').value;
            const content = document.getElementById('news-content').value;
            if (!title || !date || !content) return showToast('Minden mező kitöltése kötelező!', 'Hiba', 'warning');
            try {
                await addDoc(collection(db, "news"), { title, date, content });
                showToast('Hír sikeresen hozzáadva!', 'Siker', 'success');
                addNewsForm.reset();
                document.getElementById('news-date').valueAsDate = new Date();
                loadAllNewsAdmin();
            } catch (error) {
                console.error("Hiba a hír hozzáadásakor: ", error);
                showToast('Hiba történt a hír mentése során.', 'Hiba', 'error');
            }
        };
    }
    loadAllNewsAdmin();
}

async function loadAllNewsAdmin() {
    const tableBody = document.getElementById('news-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="3" class="text-center">Hírek betöltése...</td></tr>`;
    try {
        const q = query(collection(db, "news"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        tableBody.innerHTML = '';
        if (querySnapshot.empty) { tableBody.innerHTML = `<tr><td colspan="3" class="text-center">Nincsenek hírek.</td></tr>`; return; }
        querySnapshot.forEach(docSnap => {
            const news = docSnap.data();
            const row = document.createElement('tr');
            row.innerHTML = `<td>${news.date}</td><td>${news.title}</td><td><button class="btn btn-sm btn-danger" data-id="${docSnap.id}">Törlés</button></td>`;
            tableBody.appendChild(row);
        });
        tableBody.querySelectorAll('.btn-danger').forEach(button => {
            button.onclick = async (e) => {
                if (confirm('Biztosan törlöd ezt a hírt?')) { await deleteDoc(doc(db, "news", e.target.dataset.id)); loadAllNewsAdmin(); }
            };
        });
    } catch (error) {
        console.error("Hiba a hírek admin listájának betöltésekor:", error);
        tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Hiba a hírek betöltésekor.</td></tr>`;
    }
}

async function loadAllUsers() {
    const tableBody = document.getElementById("users-table-body");
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Felhasználók betöltése...</td></tr>`;
    const usersSnapshot = await getDocs(query(collection(db, "users"), orderBy("email")));
    tableBody.innerHTML = "";
    usersSnapshot.forEach(docSnap => {
        const userData = docSnap.data();
        const row = document.createElement("tr");
        row.innerHTML = `<td>${userData.email}</td><td>${userData.name || "-"}</td><td><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" ${userData.isMember ? "checked" : ""} data-uid="${docSnap.id}" data-field="isMember"></div></td><td><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" ${userData.isAdmin ? "checked" : ""} data-uid="${docSnap.id}" data-field="isAdmin"></div></td>`;
        tableBody.appendChild(row);
    });
    tableBody.querySelectorAll(".form-check-input").forEach(toggle => {
        toggle.onchange = async (event) => {
            const uid = event.target.dataset.uid;
            const field = event.target.dataset.field;
            const newValue = event.target.checked;
            const statusText = field === "isMember" ? "Klubtag" : "Admin";
            if (confirm(`Biztosan módosítod a felhasználó "${statusText}" státuszát?`)) { await updateDoc(doc(db, "users", uid), { [field]: newValue }); } else { event.target.checked = !newValue; }
        };
    });
}

function initializeTournamentAdmin() {
    const form = document.getElementById('add-tournament-form');
    loadAllTournamentsAdmin();
    if (form) {
        document.getElementById('tournament-date').valueAsDate = new Date();
        form.onsubmit = async (e) => {
            e.preventDefault();
            const title = document.getElementById('tournament-title').value.trim();
            const category = document.getElementById('tournament-category').value;
            const date = document.getElementById('tournament-date').value;
            const year = new Date(date).getFullYear();
            const description = document.getElementById('tournament-description').value.trim();
            const maxPlayers = parseInt(document.getElementById('tournament-max-players').value);
            if (!title || !date || !description || !maxPlayers || !category) {
                return showToast('Minden mező kitöltése kötelező!', 'Hiba', 'warning');
            }
            try {
                await addDoc(collection(db, "tournaments"), { title, date, category, year, description, maxPlayers, createdAt: new Date(), isClosed: false });
                showToast('Verseny sikeresen létrehozva!', 'Siker', 'success');
                form.reset();
                document.getElementById('tournament-date').valueAsDate = new Date();
            } catch (error) {
                console.error("Hiba a verseny létrehozásakor: ", error);
                showToast('Hiba történt a verseny mentése során.', 'Hiba', 'error');
            }
        };
    }
}

function loadAllTournamentsAdmin() {
    const container = document.getElementById('tournaments-admin-container');
    const yearFilter = document.getElementById('tournament-year-filter');
    const categoryFilter = document.getElementById('tournament-category-filter');
    if (!container || !yearFilter || !categoryFilter) return;
    let allTournaments = [];
    const renderFilteredTournaments = () => {
        const selectedYear = yearFilter.value;
        const selectedCategory = categoryFilter.value;
        const filtered = allTournaments.filter(t => {
            const yearMatch = (selectedYear === 'all') || (t.year.toString() === selectedYear);
            const categoryMatch = (selectedCategory === 'all') || (t.category === selectedCategory);
            return yearMatch && categoryMatch;
        });
        if (filtered.length === 0) {
            container.innerHTML = `<p class="text-center text-muted">A szűrési feltételeknek egyetlen verseny sem felel meg.</p>`;
            return;
        }
        let tournamentCardsHtml = '';
        filtered.forEach(tournament => {
            const tournamentId = tournament.id;
            const registrations = tournament.registrations || [];
            tournamentCardsHtml += `
                <div class="card mb-3">
                    <div class="card-body">
                         <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5 class="card-title">${tournament.title}</h5>
                                <h6 class="card-subtitle mb-2 text-muted">${tournament.date} | ${tournament.category}</h6>
                            </div>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-info edit-results-btn" data-tournament-id="${tournamentId}">Eredmények</button>
                                <button class="btn btn-sm btn-secondary archive-tournament-btn" data-tournament-id="${tournamentId}">Archiválás</button>
                                <button class="btn btn-sm btn-danger delete-tournament-btn" data-tournament-id="${tournamentId}">Törlés</button>
                            </div>
                        </div>
                        <div class="mt-2">Jelentkezők: ${registrations.length} / ${tournament.maxPlayers}</div>
                    </div>
                </div>`;
        });
        container.innerHTML = tournamentCardsHtml;
        addTournamentAdminEventListeners(container);
    };
    const tournamentsQuery = query(collection(db, "tournaments"), orderBy("date", "desc"));
    onSnapshot(tournamentsQuery, (snapshot) => {
        const tournamentPromises = snapshot.docs.map(async (tournamentDoc) => {
            const tournamentData = tournamentDoc.data();
            const registrationsRef = collection(db, "tournaments", tournamentDoc.id, "registrations");
            const registrationsSnap = await getDocs(registrationsRef);
            return {
                id: tournamentDoc.id,
                ...tournamentData,
                registrations: registrationsSnap.docs.map(d => d.data())
            };
        });
        Promise.all(tournamentPromises).then(tournaments => {
            allTournaments = tournaments;
            const years = ['all', ...new Set(allTournaments.map(t => t.year).filter(Boolean))].sort((a, b) => b - a);
            const categories = ['all', ...new Set(allTournaments.map(t => t.category).filter(Boolean))];
            yearFilter.innerHTML = years.map(y => `<option value="${y}">${y === 'all' ? 'Összes év' : y}</option>`).join('');
            categoryFilter.innerHTML = categories.map(c => `<option value="${c}">${c === 'all' ? 'Összes kategória' : c}</option>`).join('');
            yearFilter.onchange = renderFilteredTournaments;
            categoryFilter.onchange = renderFilteredTournaments;
            renderFilteredTournaments();
        });
    });
}
function addTournamentAdminEventListeners(container) {
    container.querySelectorAll('.delete-tournament-btn').forEach(button => {
        button.onclick = async (e) => {
            const tournamentId = e.target.dataset.tournamentId;
            if (confirm('Biztosan törlöd ezt a versenyt és az összes jelentkezést?')) {
                try {
                    const registrationsRef = collection(db, "tournaments", tournamentId, "registrations");
                    const registrationsSnap = await getDocs(registrationsRef);
                    const batch = writeBatch(db);
                    registrationsSnap.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                    await deleteDoc(doc(db, "tournaments", tournamentId));
                    showToast('Verseny sikeresen törölve.', 'Siker', 'success');
                } catch (error) {
                    console.error("Hiba a verseny törlésekor:", error);
                    showToast("Hiba történt a törlés során.", "Hiba", "error");
                }
            }
        };
    });
    container.querySelectorAll('.close-tournament-toggle').forEach(toggle => {
        toggle.onchange = async (e) => {
            const tournamentId = e.target.dataset.tournamentId;
            const isClosed = e.target.checked;
            await updateDoc(doc(db, "tournaments", tournamentId), { isClosed });
        };
    });
    container.querySelectorAll('.edit-results-btn').forEach(button => {
        button.onclick = async (e) => {
            const tournamentId = e.target.dataset.tournamentId;
            const tournamentDoc = await getDoc(doc(db, "tournaments", tournamentId));
            const results = tournamentDoc.data().results || {};
            const firstPlace = prompt("1. Helyezett:", results.first_place || "");
            if (firstPlace !== null) {
                const secondPlace = prompt("2. Helyezett:", results.second_place || "");
                const thirdPlace = prompt("3. Helyezett:", results.third_place || "");
                await updateDoc(doc(db, "tournaments", tournamentId), {
                    results: {
                        first_place: firstPlace || "",
                        second_place: secondPlace || "",
                        third_place: thirdPlace || ""
                    }
                });
                showToast('Eredmények mentve!', 'Siker', 'success');
            }
        };
    });
    container.querySelectorAll('.archive-tournament-btn').forEach(button => {
        button.onclick = async (e) => {
            const tournamentId = e.target.dataset.tournamentId;
            if (confirm('Biztosan archiválod ezt a versenyt? Ezzel átkerül az Eredmények oldalra, és többé nem lehet rá jelentkezni.')) {
                try {
                    const tournamentRef = doc(db, "tournaments", tournamentId);
                    const tournamentSnap = await getDoc(tournamentRef);
                    if (tournamentSnap.exists()) {
                        const tournamentData = tournamentSnap.data();
                        await setDoc(doc(db, "archived_tournaments", tournamentId), tournamentData);
                        await deleteDoc(tournamentRef);
                        showToast('Verseny sikeresen archiválva.', 'Siker', 'success');
                    } else {
                        showToast('A verseny nem található.', 'Hiba', 'error');
                    }
                } catch (error) {
                    console.error("Hiba a verseny archiválásakor:", error);
                    showToast("Hiba történt az archiválás során.", "Hiba", "error");
                }
            }
        };
    });
    container.querySelectorAll('.remove-player-btn').forEach(button => {
        button.onclick = async (e) => {
            const tournamentId = e.target.dataset.tournamentId;
            const regId = e.target.dataset.regId;
            if (confirm('Biztosan törlöd ezt a játékost a jelentkezők közül?')) {
                await deleteDoc(doc(db, "tournaments", tournamentId, "registrations", regId));
            }
        };
    });
    container.querySelectorAll('.add-manual-player-form').forEach(form => {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const tournamentId = e.target.dataset.tournamentId;
            const input = e.target.querySelector('input[type="text"]');
            const playerName = input.value.trim();
            if (!playerName) return;
            try {
                const regRef = doc(collection(db, "tournaments", tournamentId, "registrations"));
                await setDoc(regRef, {
                    name: playerName,
                    userId: null,
                    isMember: false,
                    timestamp: new Date()
                });
                input.value = '';
            } catch (error) {
                console.error("Hiba a manuális játékos hozzáadásakor:", error);
                showToast('Hiba történt a hozzáadás során.', 'Hiba', 'error');
            }
        };
    });
}

function initializeGalleryAdmin() {
    const uploadInput = document.getElementById('gallery-image-upload');
    const progressDiv = document.getElementById('gallery-upload-progress');
    const progressBar = progressDiv.querySelector('.progress-bar');
    if (uploadInput) {
        uploadInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length === 0) return;
            progressDiv.style.display = 'block';
            let uploadedCount = 0;
            Array.from(files).forEach(file => {
                const fileId = doc(collection(db, "id_generator")).id;
                const filePath = `gallery/${fileId}-${file.name}`;
                const storageRef = ref(storage, filePath);
                const uploadTask = uploadBytesResumable(storageRef, file);
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        progressBar.style.width = progress + '%';
                        progressBar.textContent = `${Math.round(progress)}%`;
                    },
                    (error) => {
                        console.error("Feltöltési hiba:", error);
                        showToast(`Hiba a(z) ${file.name} feltöltésekor.`, 'Hiba', 'error');
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        await setDoc(doc(db, "gallery_images", fileId), {
                            url: downloadURL,
                            path: filePath,
                            name: file.name,
                            createdAt: serverTimestamp()
                        });
                        uploadedCount++;
                        if (uploadedCount === files.length) {
                            showToast('Minden kép sikeresen feltöltve!', 'Siker', 'success');
                            progressDiv.style.display = 'none';
                            uploadInput.value = '';
                        }
                    }
                );
            });
        });
    }
    loadGalleryAdminImages();
}

function loadGalleryAdminImages() {
    const container = document.getElementById('gallery-admin-container');
    if (!container) return;
    const q = query(collection(db, "gallery_images"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p class="text-muted">Nincsenek feltöltött képek.</p>';
            return;
        }
        snapshot.forEach(doc => {
            const imageData = doc.data();
            const col = document.createElement('div');
            col.className = 'col-lg-3 col-md-4 col-sm-6';
            col.innerHTML = `
                <div class="card">
                    <img src="${imageData.url}" class="card-img-top" style="aspect-ratio: 1/1; object-fit: cover;">
                    <div class="card-footer text-center">
                        <button class="btn btn-sm btn-danger delete-gallery-image" data-id="${doc.id}" data-path="${imageData.path}">Törlés</button>
                    </div>
                </div>
            `;
            container.appendChild(col);
        });
        container.querySelectorAll('.delete-gallery-image').forEach(button => {
            button.onclick = async (e) => {
                const docId = e.target.dataset.id;
                const path = e.target.dataset.path;
                if (confirm('Biztosan törlöd ezt a képet?')) {
                    try {
                        await deleteObject(ref(storage, path));
                        await deleteDoc(doc(db, "gallery_images", docId));
                        showToast('Kép sikeresen törölve.', 'Siker', 'success');
                    } catch (error) {
                        console.error("Törlési hiba: ", error);
                        showToast('Hiba történt a kép törlésekor.', 'Hiba', 'error');
                    }
                }
            };
        });
    });
}

function initializeDocumentsAdmin() {
    const titleInput = document.getElementById('doc-title');
    const uploadInput = document.getElementById('doc-upload');
    const uploadButton = document.getElementById('doc-upload-button');
    const progressDiv = document.getElementById('doc-upload-progress');
    const progressBar = progressDiv.querySelector('.progress-bar');

    if (uploadButton) {
        uploadButton.addEventListener('click', () => {
            const file = uploadInput.files[0];
            const title = titleInput.value.trim();

            if (!file || !title) {
                showToast('Kérjük, adjon meg egy címet és válasszon ki egy fájlt.', 'Hiányzó adatok', 'warning');
                return;
            }

            progressDiv.style.display = 'block';
            const fileId = doc(collection(db, "id_generator")).id;
            const filePath = `documents/${fileId}-${file.name}`;
            const storageRef = ref(storage, filePath);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    progressBar.style.width = progress + '%';
                    progressBar.textContent = `${Math.round(progress)}%`;
                }, 
                (error) => {
                    console.error("Feltöltési hiba:", error);
                    showToast(`Hiba a(z) ${file.name} feltöltésekor.`, 'Hiba', 'error');
                    progressDiv.style.display = 'none';
                }, 
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    await setDoc(doc(db, "documents", fileId), {
                        url: downloadURL,
                        path: filePath,
                        title: title,
                        fileName: file.name,
                        createdAt: serverTimestamp()
                    });
                    
                    showToast('Dokumentum sikeresen feltöltve!', 'Siker', 'success');
                    progressDiv.style.display = 'none';
                    titleInput.value = '';
                    uploadInput.value = '';
                }
            );
        });
    }

    loadDocumentsAdmin();
}

function loadDocumentsAdmin() {
    const container = document.getElementById('documents-admin-container');
    if (!container) return;

    const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<li class="list-group-item">Nincsenek feltöltött dokumentumok.</li>';
            return;
        }
        snapshot.forEach(doc => {
            const docData = doc.data();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <span>
                    <i class="bi bi-file-earmark-text me-2"></i>
                    <a href="${docData.url}" target="_blank">${docData.title}</a>
                </span>
                <button class="btn btn-sm btn-outline-danger delete-doc-btn" data-id="${doc.id}" data-path="${docData.path}">&times;</button>
            `;
            container.appendChild(li);
        });

        container.querySelectorAll('.delete-doc-btn').forEach(button => {
            button.onclick = async (e) => {
                const docId = e.target.dataset.id;
                const path = e.target.dataset.path;
                if (confirm('Biztosan törlöd ezt a dokumentumot?')) {
                    try {
                        await deleteObject(ref(storage, path));
                        await deleteDoc(doc(db, "documents", docId));
                        showToast('Dokumentum sikeresen törölve.', 'Siker', 'success');
                    } catch (error) {
                        console.error("Törlési hiba: ", error);
                        showToast('Hiba történt a dokumentum törlésekor.', 'Hiba', 'error');
                    }
                }
            };
        });
    });
}