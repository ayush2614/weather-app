const cityInput = document.getElementById('city');
const searchBtn = document.getElementById('searchBtn');
const statusEl = document.getElementById('status');

const resultSection = document.getElementById('result');
const cityNameEl = document.getElementById('cityName');
const descEl = document.getElementById('desc');
const tempEl = document.getElementById('temp');
const iconEl = document.getElementById('icon');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const localTimeEl = document.getElementById('localTime');
const placeInfoEl = document.getElementById('placeInfo');

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#ffbaba' : '';
}

function showResult() {
  resultSection.classList.remove('hidden');
}

function hideResult() {
  resultSection.classList.add('hidden');
}

function formatTime(tsSeconds, tzOffsetSeconds) {
  const d = new Date((tsSeconds + tzOffsetSeconds) * 1000);
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function cityLocalTime(tzOffsetSeconds) {
  const nowUtcSec = Math.floor(Date.now() / 1000);
  return formatTime(nowUtcSec, tzOffsetSeconds);
}

function iconUrl(iconCode) {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

function setWeatherTheme(mainWeather) {
  if (!mainWeather) return;

  const weather = mainWeather.toLowerCase();
  resultSection.style.color = '#ffffff';

  if (weather.includes('clear')) {
    resultSection.style.background =
      'linear-gradient(135deg, #f97316, #facc15)';
  } else if (weather.includes('cloud')) {
    resultSection.style.background =
      'linear-gradient(135deg, #475569, #94a3b8)';
  } else if (weather.includes('rain') || weather.includes('drizzle')) {
    resultSection.style.background =
      'linear-gradient(135deg, #0284c7, #1e3a8a)';
  } else if (weather.includes('snow')) {
    resultSection.style.background =
      'linear-gradient(135deg, #bae6fd, #e0f2fe)';
    resultSection.style.color = '#0f172a';
  } else if (weather.includes('thunder')) {
    resultSection.style.background =
      'linear-gradient(135deg, #4c1d95, #020617)';
  } else if (
    weather.includes('mist') ||
    weather.includes('fog') ||
    weather.includes('haze') ||
    weather.includes('smoke')
  ) {
    resultSection.style.background =
      'linear-gradient(135deg, #334155, #64748b)';
  } else {
    resultSection.style.background =
      'linear-gradient(135deg, #1e293b, #0f172a)';
  }
}

async function fetchPlaceInfo(placeName) {
  try {
    placeInfoEl.textContent = 'Loading place info...';

    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(placeName)}`;
    const res = await fetch(url);

    if (!res.ok) {
      placeInfoEl.textContent = 'No extra information found for this place.';
      return;
    }

    const data = await res.json();
    placeInfoEl.textContent = data.extract || 'No extra information found for this place.';
  } catch (error) {
    placeInfoEl.textContent = 'Unable to load place information.';
  }
}

async function fetchWeather(city) {
  setStatus('Loading…');
  hideResult();

  const url = `/.netlify/functions/weather?city=${encodeURIComponent(city)}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Location not found');
  }

  return data;
}

function renderWeather(data) {
  const { name, sys, weather, main, wind, timezone } = data;
  const w = weather && weather[0];

  setWeatherTheme(w ? w.main : '');
  fetchPlaceInfo(name);

  cityNameEl.textContent = `${name}, ${sys && sys.country ? sys.country : ''}`;

  descEl.textContent = w
    ? (w.description || '').replace(/\b\w/g, s => s.toUpperCase())
    : '';

  tempEl.textContent = main ? Math.round(main.temp) : '—';
  iconEl.src = w ? iconUrl(w.icon) : '';
  iconEl.alt = w ? w.description : 'weather';

  humidityEl.textContent = main ? main.humidity : '—';
  windEl.textContent = wind ? `${wind.speed} m/s` : '—';

  sunriseEl.textContent =
    sys && sys.sunrise ? formatTime(sys.sunrise, timezone) : '—';

  sunsetEl.textContent =
    sys && sys.sunset ? formatTime(sys.sunset, timezone) : '—';

  localTimeEl.textContent = cityLocalTime(timezone);

  showResult();
  setStatus('Weather loaded.');
}

async function doSearch() {
  const q = cityInput.value.trim();

  if (!q) {
    setStatus('Please enter a city, town, or village.', true);
    return;
  }

  try {
    const data = await fetchWeather(q);
    renderWeather(data);
  } catch (err) {
    console.error(err);
    hideResult();
    setStatus(err.message || 'Failed to fetch weather.', true);
  }


searchBtn.addEventListener('click', doSearch);

cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    doSearch();
  }
});