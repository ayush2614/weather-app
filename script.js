let map;
let marker;
let selectedLocation = null;
let searchTimer;

const input = document.getElementById("locationInput");
const suggestionsBox = document.getElementById("suggestions");
const errorBox = document.getElementById("error");

window.addEventListener("load", () => {

  // Map init
  map = L.map("map").setView([28.6139, 77.2090], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  // Button events
  document.getElementById("searchBtn").addEventListener("click", searchWeather);
  document.getElementById("locationBtn").addEventListener("click", useMyLocation);

  // Input typing
  input.addEventListener("input", handleInput);

  // Enter key support
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      searchWeather();
    }
  });
});

// 🔍 Handle typing suggestions
function handleInput() {
  const query = input.value.trim();
  selectedLocation = null;

  if (query.length < 3) {
    suggestionsBox.innerHTML = "";
    return;
  }

  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    getSuggestions(query);
  }, 500);
}

// 📍 Get suggestions (village + city)
async function getSuggestions(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6`;

    const response = await fetch(url);
    const data = await response.json();

    suggestionsBox.innerHTML = "";

    if (!data || data.length === 0) {
      suggestionsBox.innerHTML = `<div class="suggestion-item">No location found</div>`;
      return;
    }

    data.forEach((place) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = place.display_name;

      div.addEventListener("click", () => {
        selectedLocation = place;
        input.value = place.display_name;
        suggestionsBox.innerHTML = "";
        searchWeather();
      });

      suggestionsBox.appendChild(div);
    });

  } catch (err) {
    errorBox.textContent = "Suggestion error";
  }
}

// 🔎 Search main function
async function searchWeather() {
  const query = input.value.trim();
  errorBox.textContent = "";

  if (query === "") {
    errorBox.textContent = "Enter location name";
    return;
  }

  try {
    let location = selectedLocation;

    if (!location) {
      location = await findLocation(query);
    }

    if (!location) {
      errorBox.textContent = "Location not found";
      return;
    }

    const lat = Number(location.lat);
    const lon = Number(location.lon);

    await getWeather(lat, lon, location);
    updateMap(lat, lon, location.display_name);

  } catch (err) {
    console.log(err);
    errorBox.textContent = "Search failed";
  }
}

// 📍 Fallback search
async function findLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data || data.length === 0) return null;

  return data[0];
}

// 🌦 Weather API
async function getWeather(lat, lon, location) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`;

  const res = await fetch(url);
  const data = await res.json();

  const current = data.current;

  document.getElementById("weatherCard").classList.remove("hidden");
  document.getElementById("forecastBox").classList.remove("hidden");

  document.getElementById("placeName").textContent =
    location.display_name.split(",")[0];

  document.getElementById("placeDetails").textContent =
    location.display_name;

  document.getElementById("temperature").textContent =
    `${Math.round(current.temperature_2m)}°C`;

  document.getElementById("condition").textContent =
    getCondition(current.weather_code);

  document.getElementById("humidity").textContent =
    `Humidity: ${current.relative_humidity_2m}%`;

  document.getElementById("wind").textContent =
    `Wind: ${current.wind_speed_10m} km/h`;

  document.getElementById("rain").textContent =
    `Rain: ${current.precipitation} mm`;

  showForecast(data.daily);
}

// 📅 Forecast
function showForecast(daily) {
  const box = document.getElementById("forecastList");
  box.innerHTML = "";

  for (let i = 0; i < daily.time.length; i++) {
    const card = document.createElement("div");
    card.className = "forecast-card";

    const date = new Date(daily.time[i]);

    card.innerHTML = `
      <h3>${date.toDateString().slice(0, 10)}</h3>
      <p>${getCondition(daily.weather_code[i])}</p>
      <p>${Math.round(daily.temperature_2m_min[i])}°C - ${Math.round(daily.temperature_2m_max[i])}°C</p>
    `;

    box.appendChild(card);
  }
}

// 🗺 Map update
function updateMap(lat, lon, name) {
  map.setView([lat, lon], 12);

  if (marker) marker.remove();

  marker = L.marker([lat, lon]).addTo(map);
  marker.bindPopup(name).openPopup();

  setTimeout(() => map.invalidateSize(), 300);
}

// 📍 My Location
function useMyLocation() {
  if (!navigator.geolocation) {
    errorBox.textContent = "Location not supported";
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    const location = await reverseLocation(lat, lon);

    input.value = location.display_name;
    selectedLocation = location;

    await getWeather(lat, lon, location);
    updateMap(lat, lon, location.display_name);
  });
}

// 🔄 Reverse location
async function reverseLocation(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

  const res = await fetch(url);
  return await res.json();
}

// 🌤 Weather condition
function getCondition(code) {
  const map = {
    0: "Clear",
    1: "Sunny",
    2: "Cloudy",
    3: "Overcast",
    61: "Rain",
    63: "Heavy Rain",
    80: "Showers",
    95: "Thunderstorm"
  };

  return map[code] || "Weather";
}