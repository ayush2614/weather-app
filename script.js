const cityInput = document.getElementById("city");
const searchBtn = document.getElementById("searchBtn");
const result = document.getElementById("result");
const statusEl = document.getElementById("status");

const cityName = document.getElementById("cityName");
const desc = document.getElementById("desc");
const temp = document.getElementById("temp");
const icon = document.getElementById("icon");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const sunrise = document.getElementById("sunrise");
const sunset = document.getElementById("sunset");
const localTime = document.getElementById("localTime");

function setWeatherEffect(weather) {
  document.body.classList.remove("rain", "sun", "cloud");

  if (weather.includes("rain")) {
    document.body.classList.add("rain");
  } else if (weather.includes("clear")) {
    document.body.classList.add("sun");
  } else {
    document.body.classList.add("cloud");
  }
}

async function getWeather() {
  const city = cityInput.value.trim();

  if (!city) {
    statusEl.innerText = "Please enter city or village";
    return;
  }

  try {
    statusEl.innerText = "Loading...";
    result.classList.add("hidden");

    const url = `/.netlify/functions/weather?city=${encodeURIComponent(city)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      statusEl.innerText = data.message || "Location not found";
      return;
    }

    const w = data.weather[0];

    setWeatherEffect(w.main.toLowerCase());

    cityName.innerText = `${data.name}, ${data.sys?.country || ""}`;
    desc.innerText = w.description;
    temp.innerText = Math.round(data.main.temp);
    icon.src = `https://openweathermap.org/img/wn/${w.icon}@2x.png`;

    humidity.innerText = data.main.humidity;
    wind.innerText = data.wind.speed + " m/s";

    sunrise.innerText = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
    sunset.innerText = new Date(data.sys.sunset * 1000).toLocaleTimeString();
    localTime.innerText = new Date().toLocaleTimeString();

    result.classList.remove("hidden");
    statusEl.innerText = "Weather loaded.";
  } catch (error) {
    console.log(error);
    statusEl.innerText = "Search not working. Check Netlify function.";
  }
}

searchBtn.addEventListener("click", getWeather);

cityInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    getWeather();
  }
});