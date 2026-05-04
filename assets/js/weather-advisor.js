// assets/js/weather-advisor.js

document.addEventListener('DOMContentLoaded', function() {
    const API_KEY = '01e4cac29df24cd560ee28754dee4186';
    const CITY = 'Nagyvázsony,HU';

    const tempEl = document.getElementById('current-temp');
    const humidityEl = document.getElementById('current-humidity');
    const windEl = document.getElementById('current-wind');
    const iconEl = document.getElementById('weather-icon');
    const alertEl = document.getElementById('health-alert');
    const detailsEl = document.getElementById('health-details');

    window.TCNWeather = window.TCNWeather || {};

    async function fetchWeatherData() {
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${CITY}&units=metric&lang=hu&appid=${API_KEY}`);
            if (!response.ok) throw new Error('Hiba az időjárás adatok lekérésekor');

            const data = await response.json();
            processWeatherData(data);
        } catch (error) {
            console.error('Időjárás API hiba:', error);
            alertEl.innerHTML = 'Jelenleg nem érhető el az élő időjárás adat.';
        }
    }

    function processWeatherData(data) {
        const temp = Math.round(data.main.temp);
        const humidity = data.main.humidity;
        const windSpeed = Math.round(data.wind.speed * 3.6);
        const iconCode = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

        window.TCNWeather = {
            temp,
            humidity,
            windSpeed,
            iconUrl,
            updatedAt: new Date().toISOString(),
        };

        if (tempEl) tempEl.innerText = temp;
        if (humidityEl) humidityEl.innerText = humidity;
        if (windEl) windEl.innerText = windSpeed;
        if (iconEl) {
            iconEl.src = iconUrl;
            iconEl.style.display = 'inline-block';
        }

        calculateHealthRisk(temp, humidity, windSpeed);
    }

    function calculateHealthRisk(temp, humidity, windSpeed) {
        let riskLevel = '';
        let alertClass = '';
        let hydrationAdvice = '';
        let intensityAdvice = '';
        let seniorJuniorAdvice = '';
        let rangeAdvice = '';
        let windAdvice = '';
        let comfortNote = '';

        let effectiveTemp = temp;
        if (temp >= 26 && humidity >= 65) {
            effectiveTemp += 2;
        } else if (temp >= 30 && humidity >= 70) {
            effectiveTemp += 3;
        } else if (temp <= 12 && windSpeed >= 20) {
            effectiveTemp -= 1;
        }

        if (effectiveTemp <= 8) {
            riskLevel = 'Túl hideg a játékhoz';
            alertClass = 'alert-dark';
            rangeAdvice = 'Ajánlott tartomány: 17-23°C, 40-65% páratartalom, 0-20 km/h szél.';
            hydrationAdvice = '💧 Folyadék: kisebb mennyiség, de ne hagyd ki a bemelegítést.';
            intensityAdvice = '🏃‍♂️ Intenzitás: csak rövid, könnyű mozgás.';
            seniorJuniorAdvice = '⛔ Gyerekeknek és szenioroknak nem ideális.';
            windAdvice = '🌬️ Hideg szélben a hőérzet tovább romlik.';
            comfortNote = 'A labda kontrollja és az izmok bemelegedése ilyenkor gyengébb.';
        } else if (effectiveTemp <= 14) {
            riskLevel = 'Hűvös, de még vállalható';
            alertClass = 'alert-info';
            rangeAdvice = 'Ajánlott tartomány: 17-23°C, 40-65% páratartalom, 0-20 km/h szél.';
            hydrationAdvice = '💧 Folyadék: mérsékelt, de rendszeres pótlás.';
            intensityAdvice = '🏃‍♂️ Intenzitás: bemelegítés után rövidebb szettek.';
            seniorJuniorAdvice = '⚠️ Melegítés nélkül ne kezdj játékba.';
            windAdvice = '🌬️ 20 km/h felett a szél már érezhetően zavarhat.';
            comfortNote = 'Jó választás lehet edzésre, de meccshez még kissé hűvös.';
        } else if (effectiveTemp <= 23) {
            riskLevel = 'Optimális időjárás a játékra';
            alertClass = 'alert-success';
            rangeAdvice = 'Optimális tartomány: 17-23°C, 40-65% páratartalom, 0-20 km/h szél.';
            hydrationAdvice = '💧 Folyadék: kb. 0.5-0.7 l/óra.';
            intensityAdvice = '🏃‍♂️ Intenzitás: meccshez és edzéshez is ideális.';
            seniorJuniorAdvice = '✅ A legtöbb korosztálynak ez a legjobb tartomány.';
            windAdvice = '🌬️ Enyhe szél még segítheti is a hűtést.';
            comfortNote = 'Ebben a tartományban általában a legjobb a reakcióidő és az állóképesség.';
        } else if (effectiveTemp <= 27) {
            riskLevel = 'Meleg, de még jó játékra';
            alertClass = 'alert-warning';
            rangeAdvice = 'Még elfogadható, de 28°C felett már nő a hőterhelés.';
            hydrationAdvice = '💧 Folyadék: kb. 0.75 l/óra.';
            intensityAdvice = '🏃‍♂️ Intenzitás: rövidebb szettek, több szünet javasolt.';
            seniorJuniorAdvice = '👴 Szenioroknak és gyerekeknek több pihenő ajánlott.';
            windAdvice = '🌬️ Gyenge szél enyhítheti a meleget, de a páratartalom emeli a terhelést.';
            comfortNote = 'A magasabb páratartalom miatt a hőérzet a mért értéknél melegebb lehet.';
        } else if (effectiveTemp <= 31) {
            riskLevel = 'Magas hőterhelés - fokozott óvatosság';
            alertClass = 'alert-danger';
            rangeAdvice = 'Kockázatos tartomány: 28°C felett, főleg 70% fölötti páratartalomnál.';
            hydrationAdvice = '💧 Folyadék: kb. 1 l/óra, lehetőleg izotóniás itallal.';
            intensityAdvice = '🏃‍♂️ Intenzitás: rövidített játék, gyakori szünetek.';
            seniorJuniorAdvice = '👶👴 Junioroknak és szenioroknak különösen megterhelő lehet.';
            windAdvice = '🌬️ Ilyen hőben a gyenge szél nem elég a hőleadáshoz.';
            comfortNote = 'A teljesítmény gyakran csökken, a kiszáradás kockázata nő.';
        } else {
            riskLevel = 'Extrém hőség - játék nem javasolt!';
            alertClass = 'alert-dark';
            rangeAdvice = 'Kerüld a játékot 32°C felett, különösen magas páratartalom mellett.';
            hydrationAdvice = '💧 Csak sürgős esetben: >1.5 l/óra + folyamatos hűtés.';
            intensityAdvice = '🛑 Hőguta veszély: játékot halaszd el.';
            seniorJuniorAdvice = '⛔ Junioroknak és szenioroknak nem javasolt.';
            windAdvice = '🌬️ A szél ilyenkor sem kompenzálja a túl nagy hőterhelést.';
            comfortNote = 'A statisztikusan legmagasabb kockázatú játékfeltételek közé tartozik.';
        }

        window.TCNWeather.riskLevel = riskLevel;
        window.TCNWeather.alertClass = alertClass;
        window.TCNWeather.details = [rangeAdvice, hydrationAdvice, intensityAdvice, seniorJuniorAdvice, windAdvice, comfortNote];

        if (alertEl) {
            alertEl.className = `alert ${alertClass} fw-bold weather-alert`;
            alertEl.innerText = riskLevel;
        }

        if (detailsEl) {
            detailsEl.innerHTML = `
                <li class="mb-2 fw-bold">${rangeAdvice}</li>
                <li class="mb-2">${hydrationAdvice}</li>
                <li class="mb-2">${intensityAdvice}</li>
                <li class="mb-2 text-danger fw-bold">${seniorJuniorAdvice}</li>
                <li class="mb-2">${windAdvice}</li>
                <li class="mb-0 text-muted">${comfortNote}</li>
            `;
        }
    }

    fetchWeatherData();
});