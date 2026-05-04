// assets/js/chat-widget.js
// Globális chat widget minden weboldalra

(function() {
    const API_KEY = '01e4cac29df24cd560ee28754dee4186';
    const CITY = 'Nagyvázsony,HU';
    const QUICK_PROMPTS = [
        'Mikor lehet foglalni?',
        'Milyen az időjárás most?',
        'Hol találom a dokumentumokat?',
        'Hogyan tudok bejelentkezni?'
    ];

    // HTML struktura
    const widgetHTML = `
        <div id="chat-widget-container">
            <!-- Lebegő gomb -->
            <button id="chat-widget-toggle" aria-label="Chat megnyitása" aria-expanded="false" aria-controls="chat-widget-popup">
                <span id="chat-toggle-icon">💬</span>
            </button>

            <!-- Chat popup -->
            <div id="chat-widget-popup" class="hidden" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="chat-widget-title" aria-describedby="chat-widget-help">
                <div class="chat-widget-header">
                    <div>
                        <h3 id="chat-widget-title">🎾 TCN Asszisztens</h3>
                        <p id="chat-widget-help" class="chat-widget-helper">Kérdezz a foglalásról, az időjárásról vagy a klub menüpontjairól.</p>
                    </div>
                    <button id="chat-widget-close" aria-label="Chat bezárása">&times;</button>
                </div>
                <div id="chat-widget-messages" class="chat-widget-body" role="log" aria-live="polite" aria-relevant="additions text" aria-atomic="false">
                    <p class="bot-msg"><strong>Bot:</strong><span>Szia! Segítek foglalásban, időjárásban, dokumentumokban, profilban és általános klubinfókban.</span></p>
                    <div class="chat-widget-suggestions" aria-label="Gyors kérdések">
                        ${QUICK_PROMPTS.map(prompt => `<button type="button" class="chat-chip" data-prompt="${escapeHtml(prompt)}" aria-label="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join('')}
                    </div>
                </div>
                <div class="chat-widget-footer">
                    <input 
                        type="text" 
                        id="chat-widget-input" 
                        class="chat-widget-input" 
                        placeholder="Kérdezz a klubról..."
                        autocomplete="off"
                        aria-label="Üzenet a chat asszisztensnek"
                    >
                    <button id="chat-widget-send" class="chat-widget-send-btn" aria-label="Üzenet küldése">Küldés</button>
                </div>
            </div>
        </div>
    `;

    // CSS stílus
    const widgetCSS = `
        #chat-widget-container {
            position: fixed;
            bottom: 18px;
            right: 18px;
            font-family: var(--font-default, Arial, sans-serif);
            z-index: 9998;
        }

        #chat-widget-toggle {
            width: 62px;
            height: 62px;
            border-radius: 50%;
            background: linear-gradient(135deg, #19b37a, #12845a);
            color: #fff;
            border: none;
            font-size: 26px;
            cursor: pointer;
            box-shadow: 0 18px 36px rgba(25, 179, 122, 0.28);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255,255,255,0.18);
        }

        #chat-widget-toggle:hover {
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 24px 48px rgba(25, 179, 122, 0.34);
        }

        #chat-widget-toggle:focus-visible,
        #chat-widget-close:focus-visible,
        .chat-chip:focus-visible,
        .chat-widget-input:focus-visible,
        .chat-widget-send-btn:focus-visible {
            outline: 3px solid rgba(59, 130, 246, 0.9);
            outline-offset: 2px;
        }

        #chat-widget-toggle:active {
            transform: scale(0.95);
        }

        #chat-widget-popup {
            position: absolute;
            bottom: 88px;
            right: 0;
            width: min(390px, calc(100vw - 36px));
            height: min(560px, 72vh);
            background: rgba(255,255,255,0.92);
            backdrop-filter: blur(18px);
            border-radius: 24px;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 28px 80px rgba(15, 23, 42, 0.18);
            display: flex;
            flex-direction: column;
            transition: opacity 0.3s ease, visibility 0.3s ease;
            opacity: 1;
            visibility: visible;
            overflow: hidden;
        }

        #chat-widget-popup.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .chat-widget-header {
            background: linear-gradient(135deg, #19b37a, #12845a);
            color: #fff;
            padding: 18px 18px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.14);
        }

        .chat-widget-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 0.01em;
        }

        .chat-widget-helper {
            margin: 4px 0 0;
            font-size: 12px;
            line-height: 1.35;
            color: rgba(255,255,255,0.88);
        }

        #chat-widget-close {
            background: transparent;
            border: none;
            color: white;
            font-size: 26px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }

        #chat-widget-close:hover {
            transform: rotate(90deg);
        }

        .chat-widget-body {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            background:
                radial-gradient(circle at top left, rgba(25, 179, 122, 0.08), transparent 30%),
                linear-gradient(180deg, rgba(248,250,252,0.98), rgba(255,255,255,0.96));
        }

        .chat-widget-body::-webkit-scrollbar {
            width: 10px;
        }

        .chat-widget-body::-webkit-scrollbar-thumb {
            background: rgba(100, 116, 139, 0.34);
            border-radius: 999px;
            border: 2px solid rgba(255,255,255,0.8);
        }

        .chat-widget-body p {
            margin: 10px 0;
            font-size: 14px;
            line-height: 1.5;
        }

        .chat-widget-body p:first-child {
            margin-top: 0;
        }

        .chat-widget-body .user-msg {
            text-align: right;
            margin: 12px 0;
        }

        .chat-widget-body .user-msg strong {
            display: inline-block;
            background: linear-gradient(135deg, #1d4ed8, #2563eb);
            color: #fff;
            padding: 4px 8px;
            border-radius: 999px;
            font-size: 12px;
            margin-right: 4px;
        }

        .chat-widget-body .user-msg span {
            display: inline-block;
            background: #e8f4ff;
            padding: 10px 12px;
            border-radius: 16px 16px 6px 16px;
            max-width: 85%;
            word-wrap: break-word;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.08);
        }

        .chat-widget-body .bot-msg {
            text-align: left;
            margin: 12px 0;
        }

        .chat-widget-body .bot-msg strong {
            display: inline-block;
            background: linear-gradient(135deg, #19b37a, #12845a);
            color: #fff;
            padding: 4px 8px;
            border-radius: 999px;
            font-size: 12px;
            margin-right: 4px;
        }

        .chat-widget-body .bot-msg span {
            display: inline-block;
            background: #f8fafc;
            padding: 10px 12px;
            border-radius: 16px 16px 16px 6px;
            max-width: 85%;
            word-wrap: break-word;
            border: 1px solid rgba(15,23,42,0.06);
        }

        .chat-widget-body .typing-indicator {
            color: #64748b;
            font-style: italic;
            font-size: 12px;
        }

        .chat-widget-suggestions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 14px;
        }

        .chat-chip {
            border: 1px solid rgba(25,179,122,0.18);
            background: rgba(25,179,122,0.08);
            color: #0f6b49;
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .chat-chip:hover {
            background: rgba(25,179,122,0.14);
            transform: translateY(-1px);
        }

        .chat-widget-footer {
            display: flex;
            gap: 8px;
            padding: 12px;
            border-top: 1px solid rgba(15, 23, 42, 0.08);
            background: rgba(255,255,255,0.96);
        }

        .chat-widget-input {
            flex: 1;
            padding: 11px 14px;
            border: 1px solid rgba(15,23,42,0.12);
            border-radius: 14px;
            font-size: 14px;
            font-family: inherit;
            transition: border-color 0.2s;
            background: #fff;
        }

        .chat-widget-input:focus {
            outline: none;
            border-color: rgba(25,179,122,0.65);
            box-shadow: 0 0 0 4px rgba(25, 179, 122, 0.12);
        }

        .chat-widget-send-btn {
            padding: 10px 16px;
            background: linear-gradient(135deg, #19b37a, #12845a);
            color: #fff;
            border: none;
            border-radius: 14px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            transition: background 0.2s;
            box-shadow: 0 10px 22px rgba(25, 179, 122, 0.22);
        }

        .chat-widget-send-btn:hover {
            background: linear-gradient(135deg, #12845a, #0f6b49);
        }

        .chat-widget-send-btn:active {
            transform: scale(0.98);
        }

        .chat-widget-send-btn:disabled,
        .chat-widget-input:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }

        @media (prefers-reduced-motion: reduce) {
            #chat-widget-toggle,
            #chat-widget-close,
            .chat-chip,
            .chat-widget-send-btn,
            #chat-widget-popup {
                transition: none !important;
            }

            #chat-widget-toggle:hover,
            #chat-widget-close:hover,
            .chat-chip:hover,
            .chat-widget-send-btn:hover {
                transform: none !important;
            }
        }

        /* Responsive */
        @media (max-width: 480px) {
            #chat-widget-popup {
                width: calc(100vw - 20px);
                height: 72vh;
                bottom: 78px;
                right: 10px;
                left: 10px;
            }

            #chat-widget-toggle {
                width: 58px;
                height: 58px;
                font-size: 25px;
            }
        }
    `;

    // Widget inicializálása
    function initChatWidget() {
        // Ellenőrzés, hogy már létezik-e a widget
        if (document.getElementById('chat-widget-container')) {
            return;
        }

        // CSS hozzáadása a head-hez
        const styleTag = document.createElement('style');
        styleTag.textContent = widgetCSS;
        document.head.appendChild(styleTag);

        // HTML injektálása a body végéhez
        const container = document.createElement('div');
        container.innerHTML = widgetHTML;
        document.body.appendChild(container.firstElementChild);

        // Event listenerek
        const toggle = document.getElementById('chat-widget-toggle');
        const close = document.getElementById('chat-widget-close');
        const popup = document.getElementById('chat-widget-popup');
        const sendBtn = document.getElementById('chat-widget-send');
        const input = document.getElementById('chat-widget-input');
        const messagesDiv = document.getElementById('chat-widget-messages');
        const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        let weatherCache = null;
        let lastFocusedElement = null;

        const scrollToBottom = () => {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        };

        const getFocusableElements = () => Array.from(popup.querySelectorAll(focusableSelector)).filter(el => !el.disabled && el.offsetParent !== null);

        const setPopupState = (isOpen) => {
            popup.classList.toggle('hidden', !isOpen);
            popup.setAttribute('aria-hidden', String(!isOpen));
            toggle.setAttribute('aria-expanded', String(isOpen));

            if (isOpen) {
                lastFocusedElement = document.activeElement;
                input.focus();
            } else if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
                lastFocusedElement.focus();
            } else {
                toggle.focus();
            }
        };

        const appendMessage = (className, sender, text, useHtml = false) => {
            const msgDiv = document.createElement('p');
            msgDiv.className = className;
            if (useHtml) {
                msgDiv.innerHTML = `<strong>${sender}:</strong><span>${text}</span>`;
            } else {
                msgDiv.innerHTML = `<strong>${sender}:</strong><span>${escapeHtml(text)}</span>`;
            }
            messagesDiv.appendChild(msgDiv);
            scrollToBottom();
            return msgDiv;
        };

        const setSendingState = (isSending) => {
            sendBtn.disabled = isSending;
            input.disabled = isSending;
            sendBtn.textContent = isSending ? 'Küldés...' : 'Küldés';
        };

        const getWeatherQuickReply = () => {
            const weather = window.TCNWeather || {};
            if (weather.temp === undefined) {
                return null;
            }

            const parts = [
                `Most ${weather.temp}°C van Nagyvázsonyban.`,
                `Páratartalom: ${weather.humidity}%, szél: ${weather.windSpeed} km/h.`
            ];

            if (weather.riskLevel) {
                parts.push(`Értékelés: ${weather.riskLevel}.`);
            }

            return parts.join(' ');
        };

        const buildWeatherReply = async () => {
            const local = getWeatherQuickReply();
            if (local) return local;

            if (weatherCache) {
                return formatWeatherReply(weatherCache);
            }

            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(CITY)}&units=metric&lang=hu&appid=${API_KEY}`);
            if (!response.ok) {
                throw new Error('Weather fetch failed');
            }

            const data = await response.json();
            weatherCache = data;
            return formatWeatherReply(data);
        };

        const formatWeatherReply = (data) => {
            const temp = Math.round(data.main.temp);
            const humidity = data.main.humidity;
            const windSpeed = Math.round(data.wind.speed * 3.6);
            const effectiveTemp = (temp >= 26 && humidity >= 65) ? temp + 2 : temp;

            let verdict = 'közepes';
            let recommendation = 'Rövid bemelegítés után vállalható.';

            if (effectiveTemp <= 8) {
                verdict = 'nem ideális';
                recommendation = 'Túl hideg a játékhoz.';
            } else if (effectiveTemp <= 14) {
                verdict = 'vállalható';
                recommendation = 'Edzésre még jó, de meccshez kissé hűvös.';
            } else if (effectiveTemp <= 23) {
                verdict = 'optimális';
                recommendation = 'Ez a legjobb tartomány teniszezéshez.';
            } else if (effectiveTemp <= 27) {
                verdict = 'meleg';
                recommendation = 'Jó, de több folyadék és szünet kell.';
            } else if (effectiveTemp <= 31) {
                verdict = 'forró';
                recommendation = 'Csak rövidebb, óvatos játék ajánlott.';
            } else {
                verdict = 'extrém';
                recommendation = 'A játék nem javasolt.';
            }

            return `Most ${temp}°C van Nagyvázsonyban, a páratartalom ${humidity}%, a szél ${windSpeed} km/h. A játék szempontjából ez ${verdict} idő: ${recommendation}`;
        };

        const getLocalReply = (message) => {
            const text = message.toLowerCase();

            if (/(időjárás|weather|hőmérséklet|szél|páratartalom)/.test(text)) {
                return buildWeatherReply();
            }

            if (/(foglal|reservation|booking)/.test(text)) {
                return 'A foglaláshoz válaszd ki a napot és az időpontot a Foglalás oldalon. Bejelentkezés után több nap is megjelenik, és a szabad időpontokra kattintva tudsz foglalni.';
            }

            if (/(bejelentkez|login|belép)/.test(text)) {
                return 'A jobb felső sarokban a Bejelentkezés gombbal tudsz belépni. Ha nincs fiókod, ott regisztrálni is tudsz.';
            }

            if (/(dokument|szabály|házirend|info)/.test(text)) {
                return 'A dokumentumok a Dokumentumok menüben találhatók. Ott általában a szabályzatok, tájékoztatók és fontos klubanyagok vannak.';
            }

            if (/(kapcsolat|telefon|email|elérhet)/.test(text)) {
                return 'A kapcsolat oldalon találod az elérhetőségeket. Ha megírod, mit keresel, segítek gyorsan megtalálni.';
            }

            if (/(profil|foglalásaim|saját foglalás)/.test(text)) {
                return 'Bejelentkezés után a Profil és a Foglalásaim menüben látod a saját adataidat és foglalásaidat.';
            }

            if (/(galéria|képek|fotó|versenykepek)/.test(text)) {
                return 'A klub képei a Galéria / Versenyképek menüpontban vannak.';
            }

            return null;
        };

        const sendPrompt = (prompt) => {
            input.value = prompt;
            sendMessage();
        };

        const handlePopupKeydown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setPopupState(false);
                return;
            }

            if (event.key !== 'Tab' || popup.classList.contains('hidden')) return;

            const focusables = getFocusableElements();
            if (!focusables.length) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        // Toggle popup
        toggle.addEventListener('click', () => {
            setPopupState(popup.classList.contains('hidden'));
        });

        // Close popup
        close.addEventListener('click', () => {
            setPopupState(false);
        });

        popup.addEventListener('keydown', handlePopupKeydown);

        messagesDiv.addEventListener('click', (event) => {
            const chip = event.target.closest('.chat-chip');
            if (!chip) return;
            sendPrompt(chip.dataset.prompt || chip.textContent || '');
        });

        // Üzenet küldése
        async function sendMessage() {
            const message = input.value.trim();
            if (!message) return;

            // Felhasználó üzenetének megjelenítése
            appendMessage('user-msg', 'Te', message);
            input.value = '';

            // Gépelés indikátor
            const typingDiv = document.createElement('p');
            typingDiv.className = 'bot-msg typing-indicator';
            typingDiv.setAttribute('role', 'status');
            typingDiv.setAttribute('aria-live', 'polite');
            typingDiv.textContent = '⏳ A bot gondolkodik...';
            messagesDiv.appendChild(typingDiv);
            scrollToBottom();

            setSendingState(true);

            try {
                const localReply = getLocalReply(message);
                if (localReply && typeof localReply.then !== 'function') {
                    typingDiv.remove();
                    appendMessage('bot-msg', 'Bot', localReply);
                    return;
                }

                if (localReply && typeof localReply.then === 'function') {
                    const reply = await localReply;
                    typingDiv.remove();
                    appendMessage('bot-msg', 'Bot', reply);
                    return;
                }

                // Cloud Function hívása
                const [{ functions }, { httpsCallable }] = await Promise.all([
                    import('/assets/js/firebase.js'),
                    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js')
                ]);
                const askBotFunction = httpsCallable(functions, 'askTennisBot');
                const result = await askBotFunction({ message });

                // Gépelés indikátor eltávolítása
                typingDiv.remove();

                // Bot válasz megjelenítése
                appendMessage('bot-msg', 'Bot', result.data.reply);
            } catch (error) {
                console.error("Chat hiba:", error);
                typingDiv.remove();
                const fallback = getLocalReply(message) || 'Nem sikerült elérni az asszisztenst. Próbáld újra később, vagy kérdezz rá egy konkrét menüpontra.';
                appendMessage('bot-msg', 'Bot', fallback);
            } finally {
                setSendingState(false);
                scrollToBottom();
            }
        }

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Helper: HTML escape
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    // DOMContentLoaded amikor init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatWidget);
    } else {
        initChatWidget();
    }
})();
