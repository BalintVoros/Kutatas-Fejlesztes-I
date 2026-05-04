import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { defineString } from "firebase-functions/params";
import { logger } from "firebase-functions";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { GoogleGenerativeAI } from "@google/generative-ai"; 
const GEMINI_API_KEY = defineString("GEMINI_API_KEY"); 
const OPENWEATHER_API_KEY = defineString("OPENWEATHER_API_KEY");  

export const sendBookingConfirmationEmail = onCall({ region: "europe-west1" }, async (request) => {
    logger.info("sendBookingConfirmationEmail (v2) függvény meghívva, adatok:", request.data);
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: GMAIL_EMAIL.value(), pass: GMAIL_PASS.value() },
        });
        const data = request.data;
        const { userEmail, userName, bookingDate, bookingTime, bookingCourt, isMember, duration, phone } = data;
        const adminEmail = "vorosbalint.vrs@gmail.com";
        const phoneNumber = "+36703321755";
        let adminHtml = `<h3>Új pályafoglalás érkezett!</h3><p><strong>Név:</strong> ${userName}</p><p><strong>E-mail:</strong> ${userEmail}</p>`;
        if (!isMember && phone) {
            adminHtml += `<p><strong>Telefonszám:</strong> ${phone}</p>`;
        }
        adminHtml += `<p><strong>Dátum:</strong> ${bookingDate}</p><p><strong>Időpont:</strong> ${bookingTime} (${duration} óra)</p><p><strong>Pálya:</strong> ${bookingCourt}</p><p><strong>Státusz:</strong> ${isMember ? 'Klubtag' : 'Vendég (jóváhagyásra vár)'}</p>`;
        const adminMailOptions = {
            from: `TCN Vázsony Foglalás <${GMAIL_EMAIL.value()}>`,
            to: adminEmail,
            subject: `Új foglalás: ${userName} - ${bookingDate}`,
            html: adminHtml,
        };
        let userMailSubject = isMember ? `Sikeres foglalás a TCN Vázsony pályáira` : `Foglalási kérelmedet fogadtuk`;
        let userMailHtml;
        if (isMember) {
            userMailHtml = `<h3>Kedves ${userName}!</h3><p>Sikeresen lefoglaltad a teniszpályát. A foglalásod adatai:</p><ul><li><strong>Dátum:</strong> ${bookingDate}</li><li><strong>Időpont:</strong> ${bookingTime} (${duration} óra)</li><li><strong>Pálya:</strong> ${bookingCourt}</li></ul><p>Jó játékot kívánunk!</p><p>Üdvözlettel,<br>A TCN Vázsony Csapata</p>`;
        } else {
            userMailHtml = `<h3>Kedves ${userName}!</h3><p>Foglalási kérelmedet sikeresen rögzítettük. A foglalásod adatai:</p><ul><li><strong>Dátum:</strong> ${bookingDate}</li><li><strong>Időpont:</strong> ${bookingTime} (${duration} óra)</li><li><strong>Pálya:</strong> ${bookingCourt}</li></ul><p><strong>Fontos:</strong> Mivel vendégként foglalsz, a foglalásod véglegesítéséhez kérjük, vedd fel velünk a kapcsolatot a <strong>${phoneNumber}</strong> telefonszámon!</p><p>A foglalásod csak a telefonos egyeztetés után válik érvényessé.</p><p>Üdvözlettel,<br>A TCN Vázsony Csapata</p>`;
        }
        const userMailOptions = {
            from: `TCN Vázsony <${GMAIL_EMAIL.value()}>`,
            to: userEmail,
            subject: userMailSubject,
            html: userMailHtml,
        };
        await transporter.sendMail(adminMailOptions);
        logger.info(`Admin e-mail sikeresen elküldve (${adminEmail})`);
        await transporter.sendMail(userMailOptions);
        logger.info(`Felhasználói e-mail sikeresen elküldve (${userEmail})`);
        return { success: true, message: "E-mailek sikeresen elküldve." };
    } catch (error) {
        logger.error("Hiba a sendBookingConfirmationEmail függvény futása közben:", error);
        throw new HttpsError("internal", "Hiba történt az e-mail küldése során.", error.message);
    }
});

export const sendApprovalEmail = onDocumentUpdated("bookings/{bookingId}", async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    if (beforeData.status !== 'pending' || afterData.status !== 'confirmed') {
        logger.info(`Státusz nem változott pending-ről confirmed-re, e-mail küldés kihagyva. Booking ID: ${event.params.bookingId}`);
        return null;
    }
    if (afterData.isMemberBooking) {
        logger.info(`Klubtag foglalás, jóváhagyó e-mail küldés kihagyva. Booking ID: ${event.params.bookingId}`);
        return null;
    }
    logger.info(`Jóváhagyó e-mail küldése folyamatban... Booking ID: ${event.params.bookingId}`);
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: GMAIL_EMAIL.value(), pass: GMAIL_PASS.value() },
        });
        const mailOptions = {
            from: `TCN Vázsony <${GMAIL_EMAIL.value()}>`,
            to: afterData.email,
            subject: 'Foglalásod jóváhagyva!',
            html: `<h3>Kedves ${afterData.name}!</h3><p>Örömmel értesítünk, hogy a pályafoglalásodat jóváhagytuk. A foglalásod végleges.</p><h4>A foglalás adatai:</h4><ul><li><strong>Dátum:</strong> ${afterData.date}</li><li><strong>Időpont:</strong> ${afterData.time}</li><li><strong>Pálya:</strong> ${afterData.courtId === 'nagy_palya' ? 'Nagy Pálya' : 'Kis Pálya'}</li></ul><p>Jó játékot kívánunk!</p><p>Üdvözlettel,<br>A TCN Vázsony Csapata</p>`
        };
        await transporter.sendMail(mailOptions);
        logger.info(`Jóváhagyó e-mail sikeresen elküldve. Címzett: ${afterData.email}`);
        return null;
    } catch (error) {
        logger.error(`Hiba a jóváhagyó e-mail küldése közben. Booking ID: ${event.params.bookingId}`, error);
        return null;
    }
});

/**
 * E-mailt küld a felhasználónak és az adminnak, ha egy foglalást töröltek.
 */
export const sendCancellationEmail = onDocumentDeleted("bookings/{bookingId}", async (event) => {
    const deletedData = event.data.data();
    logger.info(`Törlési értesítő küldése folyamatban... Booking ID: ${event.params.bookingId}`);
    
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: GMAIL_EMAIL.value(), pass: GMAIL_PASS.value() },
        });

        const userEmail = deletedData.email;
        const userName = deletedData.name;
        const adminEmail = "vorosbalint.vrs@gmail.com";

        const userMailOptions = {
            from: `TCN Vázsony <${GMAIL_EMAIL.value()}>`,
            to: userEmail,
            subject: 'Foglalásod sikeresen törölve',
            html: `
                <h3>Kedves ${userName}!</h3>
                <p>Értesítünk, hogy a(z) <strong>${deletedData.date} ${deletedData.time}</strong> időpontra szóló foglalásodat sikeresen töröltük a rendszerünkből.</p>
                <p>Üdvözlettel,<br>A TCN Vázsony Csapata</p>
            `
        };

        const adminMailOptions = {
            from: `TCN Vázsony Foglalás <${GMAIL_EMAIL.value()}>`,
            to: adminEmail,
            subject: `Törölt foglalás - Felszabadult időpont: ${deletedData.date}`,
            html: `
                <h3>Egy foglalást töröltek, egy időpont felszabadult!</h3>
                <h4>A törölt foglalás adatai:</h4>
                <ul>
                    <li><strong>Név:</strong> ${userName}</li>
                    <li><strong>E-mail:</strong> ${userEmail}</li>
                    <li><strong>Dátum:</strong> ${deletedData.date}</li>
                    <li><strong>Időpont:</strong> ${deletedData.time}</li>
                    <li><strong>Pálya:</strong> ${deletedData.courtId === 'nagy_palya' ? 'Nagy Pálya' : 'Kis Pálya'}</li>
                </ul>
            `
        };

        await transporter.sendMail(userMailOptions);
        logger.info(`Törlési értesítő sikeresen elküldve. Címzett: ${userEmail}`);
        await transporter.sendMail(adminMailOptions);
        logger.info(`Admin értesítő a törlésről sikeresen elküldve. Címzett: ${adminEmail}`);
        
        return null;

    } catch (error) {
        logger.error(`Hiba a törlési értesítő e-mail küldése közben. Booking ID: ${event.params.bookingId}`, error);
        return null;
    }
});


export const askTennisBot = onCall({ region: "europe-west1" }, async (request) => {
    const userMessage = (request.data?.message || "").trim();

    if (!userMessage) {
        throw new HttpsError("invalid-argument", "Hiányzó üzenet.");
    }

    const defaultNoAnswer = "Sajnos erre a kérdésre nem tudok válaszolni, kérlek keress minket az teniszclubnagyvazsony@gmail.com címen!";
    const pricingReply = "Árakkal és pénzügyekkel kapcsolatban weboldalunkon nem adunk tájékoztatást. Kérlek, hívd az ügyfélszolgálatunkat telefonon, ahol kollégáink készséggel segítenek!";

    const normalize = (text) => text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const getFallbackReply = (message) => {
        const msg = normalize(message);

        if (/\b(ar|arak|penz|koltseg|dij|berleti)\b/.test(msg)) {
            return pricingReply;
        }
        if (/(nyitvatart|mikor van nyitva|meddig vagytok nyitva|nyitva tartas)/.test(msg)) {
            return "A klub nyitvatartása minden nap 07:00 - 21:00.";
        }
        if (/(palyafoglal|hogyan foglal|foglalas menete|foglalni)/.test(msg)) {
            return "Foglalni a weboldal \"Foglalás\" menüpontjában lehet.";
        }
        if (/(palya|boritas|salak|nagy palya|kis palya)/.test(msg)) {
            return "A klubban kiváló minőségű salakos pályák vannak: Nagy Pálya és Kis Pálya.";
        }
        if (/(alkalmazas|android app|mobil app)/.test(msg)) {
            return "Az android alkalmazást a weboldalon az \"Alkalmazás\" menüpont alatt éred el. Az appban foglalás, eredmények és dokumentumok is elérhetők.";
        }
        if (/(eredmeny|verseny eredmeny|kategori)/.test(msg)) {
            return "A versenyeredmények az Eredmények oldalon találhatók: Felnőtt férfi, Felnőtt női, Páros és Labaszüreti kupa kategóriákban.";
        }
        if (/(email|e-mail|elerhetoseg|kapcsolat)/.test(msg)) {
            return "A klub e-mail címe: teniszclubnagyvazsony@gmail.com";
        }
        if (/(palya allapot|karbantart|lezaras)/.test(msg)) {
            return "A pálya állapotáról és karbantartásáról a weboldal \"Pálya állapota\" menüpontjában találsz friss információkat.";
        }
        if (/(edzesi tipp|kezdo|tanacs)/.test(msg)) {
            return "Kezdőknek: fókuszálj az ütő helyes fogására és a lábmunkára, és mindig nézd a labdát.";
        }

        return defaultNoAnswer;
    };

    const clubKnowledgeBase = `
        Te a TCN Vázsony teniszklub barátságos, intelligens asszisztense vagy.
        Szigorú szabály: KIZÁRÓLAG a következő információk alapján válaszolhatsz. 
        Ha a válasz nincs benne ebben a listában, válaszold ezt: "Sajnos erre a kérdésre nem tudok válaszolni, kérlek keress minket az teniszclubnagyvazsony@gmail.com címen!"
        
        KIVÉTELES SZABÁLY (PÉNZÜGYEK ÉS ÁRAK):
        Szigorúan tilos bármilyen pénzügyi információt, árat, vagy bérleti díjat közölnöd! Ha a felhasználó árakról, bérleti díjakról vagy pénzről kérdez, KÖTELEZŐ a következő választ adnod:
        "Árakkal és pénzügyekkel kapcsolatban weboldalunkon nem adunk tájékoztatást. Kérlek, hívd az ügyfélszolgálatunkat telefonon, ahol kollégáink készséggel segítenek!"

        Tudásbázis:
        - Klub neve: TCN Vázsony (Nagyvázsony).
        - Nyitvatartás: Minden nap 07:00 - 21:00.
        - Pályaborítás: Kiváló minőségű salakos pályák (firNagy Pálya és Kis Pálya).
        - Pályafoglalás menete: Foglalni a weboldal "Foglalás" menüpontjában lehet.
        - Edzési tipp (kezdőknek): Fókuszálj az ütő helyes fogására és a lábmunkára. Mindig nézd a labdát!
        - Verseny eredmények az eredményeken belül van feltüntetve. 4 kategóriában vannak eredmények: Felnőtt férfi, Felnőtt női, Páros , Labaszüreti kupa 
        - Az android alkalmazást a weboldalon lehet elérni az alkalmazások menüpont alatt. Az alkalmazásban lehetőség van foglalni, eredményeket nézni, és dokumentumokat elérni.
        - A klub e-mail címe: teniszclubnagyvazsony@gmail.com
        - A pálya állapotáról és karbantartásáról a weboldalon lehet tájékozódni a "Pálya állapota" menüpont alatt. Itt friss információkat találhatsz a pályák aktuális állapotáról, karbantartási munkákról és esetleges lezárásokról. Kérjük, mindig ellenőrizd ezt a menüpontot, mielőtt pályafoglalást végzel vagy a klubba látogatsz!
        - Szia vagy köszönésre: Szia! Miben segíthetek a TCN Vázsony teniszklubbal kapcsolatban?
        - Eredmény predikcióra: Ha volt már eredményed akkor a profil menüpontban láthatod,hogy milyen esélyeid  vannak!
        - Hőmérsékletre vonatkozó tanácsokat a főoldalon találhatod meg!
        




    `;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const modelCandidates = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

    let lastError = null;
    for (const modelName of modelCandidates) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: clubKnowledgeBase
            });

            const result = await model.generateContent(userMessage);
            return { reply: result.response.text() };
        } catch (error) {
            lastError = error;
            logger.warn(`Gemini model hiba (${modelName})`, error);
        }
    }

    logger.error("Gemini API Hiba: fallback választ adunk", lastError);
    return { reply: getFallbackReply(userMessage) };
});


export const getSafeWeather = onCall({ region: "europe-west1" }, async (request) => {
    const city = 'Nagyvazsony,HU'; 
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=hu&appid=${OPENWEATHER_API_KEY.value()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Hálózati hiba az OpenWeather felé');
        
        const weatherData = await response.json();
        return weatherData; 
    } catch (error) {
        logger.error("Időjárás hiba a szerveren:", error);
        throw new HttpsError('internal', 'Nem sikerült lekérni az időjárást.');
    }
});