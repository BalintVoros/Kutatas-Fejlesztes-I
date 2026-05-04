// /assets/js/pages/booking.js

import { db, functions } from '../firebase.js';
import { collection, query, where, onSnapshot, getDocs, doc, writeBatch, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { showToast } from '../ui.js';

export function initBookingPage(currentUser, currentUserData) {
    const courtSelector = document.getElementById('court-selector');
    const daySelectorWrapper = document.getElementById('day-selector-wrapper');
    const daySelectorDropdown = document.getElementById('day-selector-dropdown');
    const bookingDayTitle = document.getElementById('booking-day-title');
    const slotsContainer = document.getElementById('time-slots-container');
    const bookingModalEl = document.getElementById('bookingModal');
    const bookingModal = bookingModalEl ? new bootstrap.Modal(bookingModalEl) : null;
    const confirmBookingButton = document.getElementById('confirm-booking-button');
    
    let selectedCourt = 'nagy_palya';
    const toLocalISOString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    let selectedDate = toLocalISOString(new Date());

    let courtStatuses = {};
    let unsubscribeBookingsListener = null;

    const statusRef = collection(db, 'court_status');
    onSnapshot(statusRef, (snapshot) => {
        snapshot.forEach(doc => {
            courtStatuses[doc.id] = doc.data();
            const statusData = doc.data();
            const statusBadgeEl = document.getElementById(`${doc.id}_status_badge`);
            if (statusBadgeEl) {
                let color = 'secondary';
                const positiveStatuses = ["Játékra alkalmas", "Játékra alkalmas locsolni kell", "Falazásra alkalmas"];
                if (positiveStatuses.includes(statusData.status)) { color = 'success'; }
                else if (statusData.status === 'Karbantartás alatt') { color = 'warning'; }
                else if (statusData.status === 'Eső miatt nem lehet') { color = 'danger'; }
                statusBadgeEl.innerHTML = `<span class="badge bg-${color}">${statusData.status}</span>`;
            }
        });
    });

    if (courtSelector) {
        courtSelector.querySelectorAll('.court-choice button').forEach(button => {
            button.onclick = () => {
                courtSelector.querySelectorAll('.court-choice button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                selectedCourt = button.dataset.court;
                renderTimeSlots();
            };
        });
    }

    if (daySelectorDropdown) {
        daySelectorDropdown.onchange = (event) => {
            selectedDate = event.target.value;
            setupBookingsListener(selectedDate);
        };
    }

    function setupBookingsListener(date) {
        if (unsubscribeBookingsListener) {
            unsubscribeBookingsListener();
        }
        const bookingsQuery = query(collection(db, "bookings"), where("date", "==", date));
        unsubscribeBookingsListener = onSnapshot(bookingsQuery, () => {
            renderTimeSlots();
        }, (error) => {
            console.error("Hiba a valós idejű foglalás figyelőben:", error);
            slotsContainer.innerHTML = `<div class="alert alert-danger">Hiba történt a foglalások betöltése közben.</div>`;
        });
    }

    function renderDaySelectors() {
        if (!daySelectorDropdown || !daySelectorWrapper) return;
        if (!currentUser) { daySelectorWrapper.style.display = 'none'; return; }
        daySelectorWrapper.style.display = 'block';
        daySelectorDropdown.innerHTML = '';
        const dayNames = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];
        for (let i = 0; i < 8; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateString = toLocalISOString(date);
            const option = document.createElement('option');
            option.value = dateString;
            let buttonText = `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}, ${dayNames[date.getDay()]}`;
            if (i === 0) buttonText = `Ma (${buttonText})`;
            if (i === 1) buttonText = `Holnap (${buttonText})`;
            option.textContent = buttonText;
            if (dateString === selectedDate) option.selected = true;
            daySelectorDropdown.appendChild(option);
        }
    }
    
    async function renderTimeSlots() {
        if (!slotsContainer || !bookingDayTitle) return;
        const currentCourtStatus = courtStatuses[selectedCourt]?.status;
        const availableStatuses = ["Játékra alkalmas", "Játékra alkalmas locsolni kell", "Falazásra alkalmas"];
        if (currentCourtStatus && !availableStatuses.includes(currentCourtStatus)) {
            const courtName = selectedCourt === 'nagy_palya' ? 'Nagy Pálya' : 'Kis Pálya';
            bookingDayTitle.textContent = `${courtName} - Nem foglalható`;
            slotsContainer.innerHTML = `
                <div class="alert alert-warning text-center mt-4">
                    <h4>A pálya jelenleg nem foglalható.</h4>
                    <p class="mb-0">A pálya állapota: <strong>${currentCourtStatus}</strong></p>
                </div>`;
            return;
        }
        if (!currentUser) {
            bookingDayTitle.textContent = "Jelentkezz be a foglaláshoz";
            slotsContainer.innerHTML = `<div class="alert alert-info text-center">A szabad időpontok megtekintéséhez és a foglaláshoz, kérjük, jelentkezz be!<br><br><button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#authModal">Bejelentkezés / Regisztráció</button></div>`;
            return;
        }
        const selectedDateObj = new Date(selectedDate.replace(/-/g, '/'));
        let title = selectedDateObj.toLocaleDateString('hu-HU', { weekday: 'long', month: 'long', day: 'numeric' });
        const now = new Date();
        const todayString = toLocalISOString(now);
        const currentHour = now.getHours();
        if (selectedDate === todayString) title = `Mai nap - ${title}`;
        bookingDayTitle.textContent = title;
        slotsContainer.innerHTML = `<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
        try {
            const qAll = query(collection(db, "bookings"), where("date", "==", selectedDate));
            const querySnapshot = await getDocs(qAll);
            const allBookingsForDay = querySnapshot.docs.map(d => d.data());
            const filteredBookings = allBookingsForDay.filter(booking => {
                if (selectedCourt === 'nagy_palya') {
                    return booking.courtId === 'nagy_palya' || !booking.courtId;
                } else {
                    return booking.courtId === 'kis_palya';
                }
            });
            const bookedSlots = filteredBookings.map(data => {
                const hour = data.time ? parseInt(data.time.split(':')[0]) : data.hour;
                return { hour, userId: data.userId, playerNames: data.playerNames, status: data.status };
            });
            slotsContainer.innerHTML = '';
            for (let hour = 8; hour < 21; hour++) {
                const slotDiv = document.createElement('div');
                slotDiv.className = 'time-slot';
                const timeText = document.createElement('div');
                timeText.textContent = `${hour}:00 - ${hour + 1}:00`;
                slotDiv.appendChild(timeText);
                const bookingInfo = bookedSlots.find(slot => slot.hour === hour);
                const isPast = selectedDate === todayString && hour < currentHour;
                if (isPast) {
                    slotDiv.classList.add('past');
                    slotDiv.title = "Ez az időpont már elmúlt.";
                    slotDiv.onclick = () => showToast('Ez az időpont már elmúlt, nem foglalható.', 'Hiba', 'warning');
                } else if (bookingInfo) {
                    if (bookingInfo.status === 'pending') {
                        slotDiv.classList.add('pending');
                        const nameDisplay = document.createElement('div');
                        nameDisplay.className = 'player-name-display';
                        nameDisplay.textContent = 'Jóváhagyásra vár';
                        slotDiv.appendChild(nameDisplay);
                        slotDiv.title = "Ez az időpont adminisztrátori jóváhagyásra vár.";
                    } else {
                        slotDiv.classList.add('booked');
                        const nameDisplay = document.createElement('div');
                        nameDisplay.className = 'player-name-display';
                        nameDisplay.textContent = bookingInfo.playerNames || 'Foglalt';
                        slotDiv.appendChild(nameDisplay);
                        slotDiv.title = "Ez az időpont már foglalt.";
                    }
                    if (currentUser && bookingInfo.userId === currentUser.uid) {
                        slotDiv.classList.add('yours');
                        slotDiv.title = "Ez a te foglalásod. Kattints a törléshez!";
                        slotDiv.onclick = () => handleCancellation(hour, selectedDate);
                    }
                } else {
                    slotDiv.title = "Kattints a foglaláshoz";
                    slotDiv.onclick = () => openBookingModal(hour, selectedDate, bookedSlots);
                }
                slotsContainer.appendChild(slotDiv);
            }
        } catch (error) {
            console.error("Hiba az időpontok betöltésekor:", error);
            slotsContainer.innerHTML = `<div class="alert alert-danger">Hiba történt a foglalások betöltése közben.</div>`;
        }
    }
    
    async function openBookingModal(hour, date, bookedSlots) {
        const phoneField = document.getElementById('phone-number-field');
        const timeSpan = document.getElementById('booking-modal-time');
        const namesInput = document.getElementById('player-names');
        const durationSelect = document.getElementById('booking-duration');
        const durationWarning = document.getElementById('duration-warning');
        const weatherSummary = document.getElementById('booking-weather-summary');
        if (currentUserData.isMember) phoneField.style.display = 'none'; else phoneField.style.display = 'block';
        timeSpan.textContent = `${date}, ${hour}:00`;
        namesInput.value = currentUserData.name || '';
        durationSelect.value = '1';
        durationWarning.style.display = 'none';

        const weather = window.TCNWeather || {};
        if (weatherSummary) {
            if (weather.temp !== undefined && weather.humidity !== undefined && weather.windSpeed !== undefined) {
                const riskText = weather.riskLevel || 'Friss időjárás-adatok';
                weatherSummary.className = `alert ${weather.alertClass || 'alert-info'} weather-alert booking-weather-summary mb-3`;
                weatherSummary.innerHTML = `
                    <div class="booking-weather-summary-top">
                        <div class="booking-weather-summary-title">Időjárás a foglaláshoz</div>
                        <div class="booking-weather-summary-temp">${weather.temp}°C</div>
                    </div>
                    <div class="booking-weather-summary-meta">
                        <span class="booking-weather-chip">Páratartalom: ${weather.humidity}%</span>
                        <span class="booking-weather-chip">Szél: ${weather.windSpeed} km/h</span>
                        <span class="booking-weather-chip booking-weather-chip-soft">${riskText}</span>
                    </div>
                `;
            } else {
                weatherSummary.className = 'alert alert-secondary weather-alert booking-weather-summary mb-3';
                weatherSummary.textContent = 'Az időjárás adatai jelenleg nem érhetők el.';
            }
        }

        const nextHourIsBooked = bookedSlots.some(slot => slot.hour === hour + 1);
        if (hour === 20 || nextHourIsBooked) {
            durationSelect.querySelector('option[value="2"]').disabled = true;
            durationWarning.style.display = 'block';
        } else {
            durationSelect.querySelector('option[value="2"]').disabled = false;
        }
        confirmBookingButton.dataset.hour = hour;
        confirmBookingButton.dataset.date = date;
        if (bookingModal) bookingModal.show();
    }
    
    async function handleBookingConfirm() {
        const hour = parseInt(confirmBookingButton.dataset.hour);
        const date = confirmBookingButton.dataset.date;
        const playerNames = document.getElementById('player-names').value.trim();
        const duration = parseInt(document.getElementById('booking-duration').value);
        const phone = document.getElementById('phone-number').value.trim();
        if (!playerNames) return showToast("Kérjük, adja meg a játékos(ok) nevét!", "Hiányzó adat", "warning");
        const playersArray = playerNames.split(',').map(name => name.trim()).filter(name => name);
        if (playersArray.length > 4) return showToast("Maximum 4 játékos nevét adhatja meg!", "Hiba", "warning");
        const isMember = currentUserData?.isMember === true;
        if (!isMember && !phone) return showToast("Vendégként a telefonszám megadása kötelező!", "Hiányzó adat", "warning");
        const bookingStatus = isMember ? 'confirmed' : 'pending';
        const batch = writeBatch(db);
        for (let i = 0; i < duration; i++) {
            const currentHour = hour + i;
            const timeString = `${currentHour.toString().padStart(2, '0')}:00`;
            const bookingRef = doc(collection(db, "bookings"));
            const bookingData = {
                name: currentUserData?.name || 'Ismeretlen',
                email: currentUser.email,
                userId: currentUser.uid,
                phone,
                date,
                time: timeString,
                hour: currentHour,
                courtId: selectedCourt,
                playersCount: playersArray.length,
                playerNames,
                isMemberBooking: isMember,
                status: bookingStatus
            };
            batch.set(bookingRef, bookingData);
        }
        try {
            await batch.commit();

            const courtName = selectedCourt === 'nagy_palya' ? 'Nagy Pálya' : 'Kis Pálya';
            const startTimeString = `${hour.toString().padStart(2, '0')}:00`;
            const sendEmail = httpsCallable(functions, 'sendBookingConfirmationEmail');
            
            try {
                await sendEmail({
                    userName: currentUserData.name || 'Ismeretlen',
                    userEmail: currentUser.email,
                    bookingDate: date,
                    bookingTime: startTimeString,
                    bookingCourt: courtName,
                    isMember: isMember,
                    duration: duration,
                    phone: phone 
                });
                console.log("A visszaigazoló e-mail kérés sikeresen elküldve.");
            } catch (error) {
                console.error("Hiba a visszaigazoló e-mail küldésekor:", error);
            }

            if (bookingModal) bookingModal.hide();
            if (isMember) {
                showToast(`Sikeres foglalás ${duration} órára! A részleteket e-mailben is elküldtük.`, 'Siker', 'success');
            } else {
                showToast(`Foglalási kérelmedet rögzítettük ${duration} órára! Hamarosan küldünk egy tájékoztató e-mailt.`, 'Kérelem fogadva', 'success');
            }
        } catch (error) {
            console.error("Hiba a foglalás során: ", error);
            showToast("Hiba történt a foglalás közben. Kérjük, próbálja újra.", "Hiba", "error");
        }
    }

    async function handleCancellation(hour, date) {
        if (confirm(`Biztosan törölni szeretnéd a ${date}, ${hour}:00 órai foglalásodat?`)) {
            const timeString = `${hour.toString().padStart(2, '0')}:00`;
            const q = query(collection(db, "bookings"), where("date", "==", date), where("time", "==", timeString), where("courtId", "==", selectedCourt), where("userId", "==", currentUser.uid));
            try {
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    await deleteDoc(doc(db, "bookings", querySnapshot.docs[0].id));
                    showToast('Foglalás sikeresen törölve.', 'Siker', 'success');
                } else {
                    showToast("A foglalás nem található!", 'Hiba', 'error');
                }
            } catch (error) {
                console.error("Hiba a törlés közben: ", error);
                showToast("Hiba történt a törlés közben.", 'Hiba', 'error');
            }
        }
    }
    
    if (confirmBookingButton) confirmBookingButton.onclick = handleBookingConfirm;
    
    if (daySelectorDropdown) {
        renderDaySelectors();
        setupBookingsListener(selectedDate);
    }
}