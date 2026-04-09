// /assets/js/pages/user-profile.js

import { db, auth } from '../firebase.js';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showToast } from '../ui.js';

let globalCurrentUser = null;
let allUsers = [];
let matchHistory = [];
let performanceChartInstance = null;


async function initializeMyBookingsPage(currentUser) {
    const upcomingBody = document.getElementById('upcoming-bookings-body');
    const pastBody = document.getElementById('past-bookings-body');
    if (!upcomingBody || !pastBody) return;

    try {
        const q = query(collection(db, "bookings"), where("userId", "==", currentUser.uid), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const upcomingHtml = []; const pastHtml = [];
        const todayString = new Date().toISOString().split('T')[0];

        querySnapshot.forEach(docSnap => {
            const booking = docSnap.data();
            let courtName = booking.courtId === 'nagy_palya' ? 'Nagy Pálya' : 'Kis Pálya';
            if (booking.date >= todayString) {
                let statusBadge = booking.status === 'pending' ? `<span class='badge bg-warning text-dark'>Függőben</span>` : `<span class='badge bg-success'>Jóváhagyva</span>`;
                upcomingHtml.push(`<tr><td>${booking.date}</td><td>${booking.time}</td><td>${courtName}</td><td>${statusBadge}</td><td><button class="btn btn-sm btn-outline-danger cancel-booking-btn" data-id="${docSnap.id}">Lemondás</button></td></tr>`);
            } else {
                 let statusBadge = booking.status === 'confirmed' ? `<span class='badge bg-secondary'>Lezárult</span>` : `<span class='badge bg-light text-dark'>Elutasítva/Törölve</span>`;
                pastHtml.push(`<tr><td>${booking.date}</td><td>${booking.time}</td><td>${courtName}</td><td>${statusBadge}</td></tr>`);
            }
        });

        upcomingBody.innerHTML = upcomingHtml.length > 0 ? upcomingHtml.join('') : `<tr><td colspan="5" class="text-center">Nincs foglalás.</td></tr>`;
        pastBody.innerHTML = pastHtml.length > 0 ? pastHtml.join('') : `<tr><td colspan="4" class="text-center">Nincs foglalás.</td></tr>`;

        upcomingBody.querySelectorAll('.cancel-booking-btn').forEach(button => {
            button.onclick = async (e) => {
                if (confirm('Biztosan lemondod?')) {
                    await deleteDoc(doc(db, "bookings", e.target.dataset.id));
                    initializeMyBookingsPage(currentUser);
                }
            };
        });
    } catch (error) { console.error(error); }
}

function initializeProfilePage(currentUser, currentUserData) {
    globalCurrentUser = currentUser;
    document.getElementById('profile-content').style.display = 'block';
    document.getElementById('loading-spinner').style.display = 'none';
    
    document.getElementById('profile-email').value = currentUser.email;
    document.getElementById('profile-name').value = currentUserData?.name || '';
    
    document.getElementById('profile-form').onsubmit = async (e) => {
        e.preventDefault();
        const newName = document.getElementById('profile-name').value.trim();
        if (!newName) return;
        try {
            await updateDoc(doc(db, "users", currentUser.uid), { name: newName });
            showToast('Profil frissítve!', 'Siker', 'success');
        } catch (error) { console.error(error); }
    };

    setupScoreSelects();
    loadUsersAndMatches();
}

export function initUserProfilePages(currentUser, currentUserData) {
    if (!currentUser) return window.location.href = '/';
    if (document.getElementById('profile-page')) initializeProfilePage(currentUser, currentUserData);
    if (document.getElementById('my-bookings-page')) initializeMyBookingsPage(currentUser);
}


async function loadUsersAndMatches() {
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const oppSelect = document.getElementById('opponent-select');
        const predictSelect = document.getElementById('predict-opponent-select');
        
        if(oppSelect) oppSelect.innerHTML = '<option value="">Válassz ellenfelet...</option>';
        if(predictSelect) predictSelect.innerHTML = '<option value="">Válassz ellenfelet a jósláshoz...</option>';

        usersSnap.forEach(docSnap => {
            const u = docSnap.data();
            if (docSnap.id !== globalCurrentUser.uid) {
                const name = u.name || u.email;
                if(oppSelect) oppSelect.innerHTML += `<option value="${docSnap.id}">${name}</option>`;
                if(predictSelect) predictSelect.innerHTML += `<option value="${docSnap.id}">${name}</option>`;
            }
        });

        const matchForm = document.getElementById('match-result-form');
        if (matchForm) {
            matchForm.onsubmit = async (e) => {
                e.preventDefault();
                const oppId = oppSelect.value;
                if (!oppId) return alert('Válassz ellenfelet!');

                const getVal = (id) => {
                    const el = document.getElementById(id);
                    return el.value === "" ? null : parseInt(el.value);
                };

                const s1m = getVal('my-s1'), s1o = getVal('opp-s1');
                const s2m = getVal('my-s2'), s2o = getVal('opp-s2');
                const s3m = getVal('my-s3'), s3o = getVal('opp-s3');

                // Validátor: Tenisz szett szabályai (6:0-6:4, 7:5, 7:6)
                const isSetValid = (a, b) => {
                    if (a === null || b === null) return false;
                    if ((a === 6 && b <= 4) || (b === 6 && a <= 4)) return true;
                    if ((a === 7 && (b === 5 || b === 6)) || (b === 7 && (a === 5 || a === 6))) return true;
                    return false;
                };

                if (!isSetValid(s1m, s1o) || !isSetValid(s2m, s2o)) {
                    return alert('Az első két szett eredménye nem szabályos tenisz játszma!');
                }

                let mySets = (s1m > s1o ? 1 : 0) + (s2m > s2o ? 1 : 0);
                let oppSets = (s1m < s1o ? 1 : 0) + (s2m < s2o ? 1 : 0);

                if (mySets === 1 && oppSets === 1) {
                    if (!isSetValid(s3m, s3o)) return alert('A döntő szett eredménye érvénytelen!');
                    s3m > s3o ? mySets++ : oppSets++;
                } else if (s3m !== null || s3o !== null) {
                    return alert('A meccs már eldőlt az első két szettben, ne töltsd ki a harmadikat!');
                }

                const scoreStr = s3m !== null ? `${s1m}:${s1o}, ${s2m}:${s2o}, ${s3m}:${s3o}` : `${s1m}:${s1o}, ${s2m}:${s2o}`;
                
                try {
                    await addDoc(collection(db, "match_results"), {
                        player1Id: globalCurrentUser.uid,
                        player2Id: oppId,
                        player1Sets: mySets,
                        player2Sets: oppSets,
                        scoreDetails: scoreStr,
                        winnerId: mySets > oppSets ? globalCurrentUser.uid : oppId,
                        status: 'pending', 
                        date: new Date().toISOString(),
                        timestamp: serverTimestamp()
                    });
                    showToast('Eredmény elküldve jóváhagyásra!', 'Siker', 'success');
                    matchForm.reset();
                    setupScoreSelects(); // Visszaállítás alaphelyzetbe
                } catch (err) { console.error(err); alert('Hiba a mentéskor.'); }
            };
        }
        await fetchMatchHistory();
    } catch (error) { console.error(error); }
}

async function fetchMatchHistory() {
    matchHistory = [];
    try {
        const q1 = query(collection(db, "match_results"), where("player1Id", "==", globalCurrentUser.uid), where("status", "==", "approved"));
        const q2 = query(collection(db, "match_results"), where("player2Id", "==", globalCurrentUser.uid), where("status", "==", "approved"));
        
        const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        s1.forEach(d => matchHistory.push(d.data()));
        s2.forEach(d => matchHistory.push(d.data()));

        matchHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        updateChartData();
        runPrediction();
    } catch (error) { console.error(error); }
}


function setupScoreSelects() {
    const selects = document.querySelectorAll('.score-select');
    selects.forEach(select => {
        const isS3 = select.id.includes('s3');
        select.innerHTML = isS3 ? '<option value="">-</option>' : '';
        for (let i = 0; i <= 6; i++) {
            let opt = document.createElement('option');
            opt.value = i; opt.innerHTML = i;
            select.appendChild(opt);
        }
    });

    const pairs = [['my-s1', 'opp-s1'], ['my-s2', 'opp-s2'], ['my-s3', 'opp-s3']];
    pairs.forEach(([id1, id2]) => {
        const s1 = document.getElementById(id1), s2 = document.getElementById(id2);
        const update = () => {
            [s1, s2].forEach((el, idx) => {
                const other = idx === 0 ? s2 : s1;
                const otherVal = parseInt(other.value);
                const hasSeven = el.querySelector('option[value="7"]');
                if ((otherVal === 5 || otherVal === 6) && !hasSeven) {
                    let opt = document.createElement('option');
                    opt.value = 7; opt.innerHTML = 7;
                    el.appendChild(opt);
                } else if (hasSeven && otherVal < 5) {
                    hasSeven.remove();
                }
            });
        };
        s1.addEventListener('change', update);
        s2.addEventListener('change', update);
    });
}

function updateChartData() {
    let currentScore = 1200;
    let labels = ['Kezdés'];
    let dataPoints = [currentScore];

    matchHistory.forEach(match => {
        currentScore += (match.winnerId === globalCurrentUser.uid) ? 20 : -10;
        const d = new Date(match.date);
        labels.push(`${d.getMonth()+1}.${d.getDate()}.`);
        dataPoints.push(currentScore);
    });

    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    if (performanceChartInstance) performanceChartInstance.destroy();

    performanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Forma Index', 
                data: dataPoints,
                borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderWidth: 3, tension: 0.4, fill: true, pointRadius: 5
            }]
        }
    });
}

export function runPrediction() {
    const opponentId = document.getElementById('predict-opponent-select')?.value;
    if (!opponentId) return updateProgressBars(50, 50);

    const recentMatches = matchHistory.slice(-5);
    const recentWins = recentMatches.filter(m => m.winnerId === globalCurrentUser.uid).length;
    const recentForm = recentMatches.length > 0 ? (recentWins / recentMatches.length) : 0.5;

    const h2hMatches = matchHistory.filter(m => m.player1Id === opponentId || m.player2Id === opponentId);
    const h2hWins = h2hMatches.filter(m => m.winnerId === globalCurrentUser.uid).length;
    const h2hWinRate = h2hMatches.length > 0 ? (h2hWins / h2hMatches.length) : 0.5;

    let finalWinProb = (h2hWinRate * 0.6) + (recentForm * 0.4) + 0.02;
    finalWinProb = Math.max(0.05, Math.min(0.95, finalWinProb));

    updateProgressBars(Math.round(finalWinProb * 100), 100 - Math.round(finalWinProb * 100));
}

function updateProgressBars(win, lose) {
    const winBar = document.getElementById('win-prob-bar');
    const loseBar = document.getElementById('lose-prob-bar');
    if (winBar && loseBar) {
        winBar.style.width = win + '%'; winBar.innerText = win + '% Győzelem';
        loseBar.style.width = lose + '%'; loseBar.innerText = lose + '% Vereség';
    }
}

window.runPrediction = runPrediction;