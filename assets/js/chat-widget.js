// assets/js/chat-widget.js
// Globális chat widget minden weboldalra

(function() {
    // HTML struktura
    const widgetHTML = `
        <div id="chat-widget-container">
            <!-- Lebegő gomb -->
            <button id="chat-widget-toggle" aria-label="Chat megnyitása">
                <span id="chat-toggle-icon">💬</span>
            </button>

            <!-- Chat popup -->
            <div id="chat-widget-popup" class="hidden">
                <div class="chat-widget-header">
                    <h3>🎾 TCN Asszisztens</h3>
                    <button id="chat-widget-close" aria-label="Chat bezárása">&times;</button>
                </div>
                <div id="chat-widget-messages" class="chat-widget-body">
                    <p><strong>Bot:</strong> Szia! Én a teniszklub AI asszisztense vagyok. Miben segíthetek?</p>
                </div>
                <div class="chat-widget-footer">
                    <input 
                        type="text" 
                        id="chat-widget-input" 
                        class="chat-widget-input" 
                        placeholder="Kérdezz a klubról..."
                        autocomplete="off"
                    >
                    <button id="chat-widget-send" class="chat-widget-send-btn">Küldés</button>
                </div>
            </div>
        </div>
    `;

    // CSS stílus
    const widgetCSS = `
        #chat-widget-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            font-family: Arial, sans-serif;
            z-index: 9999;
        }

        #chat-widget-toggle {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            border: none;
            font-size: 28px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #chat-widget-toggle:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        #chat-widget-toggle:active {
            transform: scale(0.95);
        }

        #chat-widget-popup {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 380px;
            height: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
            display: flex;
            flex-direction: column;
            transition: opacity 0.3s ease, visibility 0.3s ease;
            opacity: 1;
            visibility: visible;
        }

        #chat-widget-popup.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .chat-widget-header {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 16px;
            border-radius: 12px 12px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .chat-widget-header h3 {
            margin: 0;
            font-size: 18px;
        }

        #chat-widget-close {
            background: transparent;
            border: none;
            color: white;
            font-size: 24px;
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
            background-color: #f8f9fa;
        }

        .chat-widget-body p {
            margin: 8px 0;
            font-size: 14px;
            line-height: 1.4;
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
            background: #007bff;
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            margin-right: 4px;
        }

        .chat-widget-body .user-msg span {
            display: inline-block;
            background: #e3f2fd;
            padding: 8px 12px;
            border-radius: 6px;
            max-width: 85%;
            word-wrap: break-word;
        }

        .chat-widget-body .bot-msg {
            text-align: left;
            margin: 12px 0;
        }

        .chat-widget-body .bot-msg strong {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            margin-right: 4px;
        }

        .chat-widget-body .bot-msg span {
            display: inline-block;
            background: #f0f0f0;
            padding: 8px 12px;
            border-radius: 6px;
            max-width: 85%;
            word-wrap: break-word;
        }

        .chat-widget-body .typing-indicator {
            color: #666;
            font-style: italic;
            font-size: 12px;
        }

        .chat-widget-footer {
            display: flex;
            gap: 8px;
            padding: 12px;
            border-top: 1px solid #ddd;
            background: white;
            border-radius: 0 0 12px 12px;
        }

        .chat-widget-input {
            flex: 1;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            font-family: Arial, sans-serif;
            transition: border-color 0.2s;
        }

        .chat-widget-input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .chat-widget-send-btn {
            padding: 10px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            transition: background 0.2s;
        }

        .chat-widget-send-btn:hover {
            background: #0056b3;
        }

        .chat-widget-send-btn:active {
            transform: scale(0.98);
        }

        /* Responsive */
        @media (max-width: 480px) {
            #chat-widget-popup {
                width: calc(100vw - 24px);
                height: 70vh;
                bottom: 70px;
                right: 12px;
                left: 12px;
            }

            #chat-widget-toggle {
                width: 56px;
                height: 56px;
                font-size: 26px;
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

        // Toggle popup
        toggle.addEventListener('click', () => {
            popup.classList.toggle('hidden');
            if (!popup.classList.contains('hidden')) {
                input.focus();
            }
        });

        // Close popup
        close.addEventListener('click', () => {
            popup.classList.add('hidden');
        });

        // Üzenet küldése
        async function sendMessage() {
            const message = input.value.trim();
            if (!message) return;

            // Felhasználó üzenetének megjelenítése
            const messagesDiv = document.getElementById('chat-widget-messages');
            const userMsgDiv = document.createElement('p');
            userMsgDiv.className = 'user-msg';
            userMsgDiv.innerHTML = `<strong>Te:</strong><span>${escapeHtml(message)}</span>`;
            messagesDiv.appendChild(userMsgDiv);
            input.value = '';

            // Gépelés indikátor
            const typingDiv = document.createElement('p');
            typingDiv.className = 'bot-msg typing-indicator';
            typingDiv.textContent = '⏳ A bot gondolkodik...';
            messagesDiv.appendChild(typingDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            try {
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
                const botMsgDiv = document.createElement('p');
                botMsgDiv.className = 'bot-msg';
                botMsgDiv.innerHTML = `<strong>Bot:</strong><span>${escapeHtml(result.data.reply)}</span>`;
                messagesDiv.appendChild(botMsgDiv);
            } catch (error) {
                console.error("Chat hiba:", error);
                typingDiv.remove();
                const errorDiv = document.createElement('p');
                errorDiv.className = 'bot-msg';
                errorDiv.innerHTML = `<strong>Hiba:</strong><span>Nem sikerült elérni az asszisztenst. Próbáld újra később.</span>`;
                messagesDiv.appendChild(errorDiv);
            }

            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
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
