// assets/js/weather-advisor.js

document.addEventListener('DOMContentLoaded', function() {
    const API_KEY = '01e4cac29df24cd560ee28754dee4186'; 
    const CITY = 'Nagyvázsony,HU'; // A klub helyszíne
    
    async function fetchWeatherData() {
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${CITY}&units=metric&lang=hu&appid=${API_KEY}`);
            if (!response.ok) throw new Error('Hiba az időjárás adatok lekérésekor');
            
            const data = await response.json();
            processWeatherData(data);
        } catch (error) {
            console.error("Időjárás API hiba:", error);
            document.getElementById('health-alert').innerHTML = "Jelenleg nem érhető el az élő időjárás adat.";
        }
    }

    function processWeatherData(data) {
        const temp = Math.round(data.main.temp);
        const humidity = data.main.humidity;
        const windSpeed = Math.round(data.wind.speed * 3.6); // m/s to km/h convert
        const iconCode = data.weather[0].icon;

        document.getElementById('current-temp').innerText = temp;
        document.getElementById('current-humidity').innerText = humidity;
        document.getElementById('current-wind').innerText = windSpeed;
        
        const iconEl = document.getElementById('weather-icon');
        iconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        iconEl.style.display = 'inline-block';

        calculateHealthRisk(temp, humidity);
    }

    function calculateHealthRisk(temp, humidity) {
        const alertBox = document.getElementById('health-alert');
        const detailsBox = document.getElementById('health-details');
        
        let riskLevel = "";
        let alertClass = "";
        let hydrationAdvice = "";
        let intensityAdvice = "";
        let seniorJuniorAdvice = "";

        let effectiveTemp = temp;
        if (temp > 25 && humidity > 60) {
            effectiveTemp += 2; 
        }

        if (effectiveTemp < 20 && effectiveTemp >= 15) {
            riskLevel = "Hidegebb idő van de még alkamas a játékra";
            alertClass = "alert-warning";
            hydrationAdvice = "💧 Folyadékigény: ~0.5 liter víz óránként.";
            intensityAdvice = "🏃‍♂️ Intenzitás: Bármilyen intenzitású edzés vagy meccs biztonságos.";
            seniorJuniorAdvice = "👨‍👩‍👧‍👦 Minden korosztály számára ideális körülmények.";
        } 
        else if (effectiveTemp >= 20 && effectiveTemp < 25) {
            riskLevel = "Tökéletes időjárás a játékra"
        }
        else if (effectiveTemp >= 25 && effectiveTemp < 28) {
            riskLevel = "Meleg időjárás - Mérsékelt kockázat";
            alertClass = "alert-warning";
            hydrationAdvice = "💧 Folyadékigény: ~0.75 liter víz óránként.";
            intensityAdvice = "🏃‍♂️ Intenzitás: Figyelj a pulzusodra, ne hajtsd túl magad.";
            seniorJuniorAdvice = "👴 Szeniorok (55+): Félóránként kötelező árnyékos pihenő javasolt!";
        } 
        else if (effectiveTemp >= 29 && effectiveTemp <= 32) {
            riskLevel = "Magas hőmérséklet - Kiemelt kockázat!";
            alertClass = "alert-danger";
            hydrationAdvice = "💧 Folyadékigény: 1 liter izotóniás ital óránként (az elvesztett sók pótlására).";
            intensityAdvice = "🏃‍♂️ Intenzitás: Egyéni (szingli) meccs helyett páros játék javasolt. Kerüld a sprintelést.";
            seniorJuniorAdvice = "👶 Juniorok és Szeniorok: Kifejezetten veszélyes zóna, edzés lerövidítése javasolt.";
        } 
        else if ( effectiveTemp <= 15) {
            riskLevel = "Hűvös idő - alkalmatlan a játékra";
            alertClass = "alert-info";
        }
           
        else {
            riskLevel = "EXTRÉM HŐSÉG - JÁTÉK NEM JAVASOLT!";
            alertClass = "alert-dark"; 
            hydrationAdvice = "💧 Ha mégis pályára lépsz: >1.5 liter víz/óra és folyamatos hűtés!";
            intensityAdvice = "🛑 Hőguta veszély! Csak nagyon enyhe, technikai ütögetés engedélyezett.";
            seniorJuniorAdvice = "⛔ Szeniorok és 14 év alattiak számára a szabadtéri játék tilos!";
        }

        // Megjelenítés
        alertBox.className = `alert ${alertClass} fw-bold`;
        alertBox.innerText = riskLevel;

        detailsBox.innerHTML = `
            <li class="mb-2">${hydrationAdvice}</li>
            <li class="mb-2">${intensityAdvice}</li>
            <li class="mb-2 text-danger fw-bold">${seniorJuniorAdvice}</li>
        `;
    }

    // Modul inicializálása
    fetchWeatherData();
});