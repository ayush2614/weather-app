let map;
let marker;
let selectedLocation = null;
let searchTimer;

const input = document.getElementById("locationInput");
const suggestionsBox = document.getElementById("suggestions");
const errorBox = document.getElementById("error");

window.addEventListener("load", () => {
  map = L.map("map").setView([28.6139, 77.2090], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  input.addEventListener("input", handleInput);

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      searchWeather();
    }
  });
});

async function handleInput() {
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

async function getSuggestions(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&countrycodes=in`;

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
    errorBox.textContent = "Location suggestion failed.";
  }
}

async function searchWeather() {
  const query = input.value.trim();
  errorBox.textContent = "";

  if (query === "") {
    errorBox.textContent = "Please enter location name.";
    return;
  }

  try {
    let location = selectedLocation;

    if (!location) {
      location = await findLocation(query);
    }

    if (!location) {
      errorBox.textContent = "Location not found. Try: village, district, state";
      return;
    }

    const lat = Number(location.lat);
    const lon = Number(location.lon);

    await getWeather(lat, lon, location);
    updateMap(lat, lon, location.display_name);

  } catch (err) {
    console.log(err);
    errorBox.textContent = "Search failed. Check internet or try another location.";
  }
}

async function findLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1&countrycodes=in`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

async function getWeather(lat, lon, location) {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=auto`;

  const response = await fetch(weatherUrl);
  const data = await response.json();

  const current = data.current;

  document.getElementById("weatherCard").classList.remove("hidden");
  document.getElementById("forecastBox").classList.remove("hidden");

  document.getElementById("placeName").textContent = getShortPlaceName(location);
  document.getElementById("placeDetails").textContent = location.display_name;

  document.getElementById("temperature").textContent =
    `${Math.round(current.temperature_2m)}°C`;

  document.getElementById("condition").textContent =
    `Condition: ${getWeatherCondition(current.weather_code)}`;

  document.getElementById("humidity").textContent =
    `💧 Humidity: ${current.relative_humidity_2m}%`;

  document.getElementById("wind").textContent =
    `💨 Wind Speed: ${current.wind_speed_10m} km/h`;

  document.getElementById("rain").textContent =
    `🌧️ Rain: ${current.precipitation} mm`;

  showForecast(data.daily);
}

function showForecast(daily) {
  const forecastList = document.getElementById("forecastList");
  forecastList.innerHTML = "";

  for (let i = 0; i < daily.time.length; i++) {
    const card = document.createElement("div");
    card.className = "forecast-card";

    const date = new Date(daily.time[i]);
    const dayName = date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });

    card.innerHTML = `
      <h3>${dayName}</h3>
      <p>${getWeatherCondition(daily.weather_code[i])}</p>
      <p>🌡️ ${Math.round(daily.temperature_2m_min[i])}°C - ${Math.round(daily.temperature_2m_max[i])}°C</p>
      <p>🌧️ ${daily.precipitation_sum[i]} mm</p>
    `;

    forecastList.appendChild(card);
  }
}

function updateMap(lat, lon, name) {
  map.setView([lat, lon], 12);

  if (marker) {
    marker.remove();
  }

  marker = L.marker([lat, lon]).addTo(map);
  marker.bindPopup(`<b>${name}</b>`).openPopup();

  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}

function useMyLocation() {
  errorBox.textContent = "";

  if (!navigator.geolocation) {
    errorBox.textContent = "Your browser does not support location.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async function (position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      const location = await reverseLocation(lat, lon);

      input.value = location.display_name;
      selectedLocation = location;

      await getWeather(lat, lon, location);
      updateMap(lat, lon, location.display_name);
    },
    function () {
      errorBox.textContent = "Location permission denied.";
    }
  );
}

async function reverseLocation(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;

  const response = await fetch(url);
  return await response.json();
}

function getShortPlaceName(location) {
  const address = location.address || {};

  return (
    address.village ||
    address.town ||
    address.city ||
    address.county ||
    address.state ||
    location.name ||
    "Selected Location"
  );
}

function getWeatherCondition(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Moderate showers",
    82: "Heavy showers",
    95: "Thunderstorm"
  };

  return conditions[code] || "Unknown weather";
}