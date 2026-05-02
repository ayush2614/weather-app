exports.handler = async function (event) {
  const place = event.queryStringParameters.city;
  const API_KEY = process.env.OPENWEATHER_API_KEY;

  if (!place) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Place name is required" })
    };
  }

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "API key is missing on server" })
    };
  }

  try {
    let geoData = [];

    let geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(place)}&limit=5&appid=${API_KEY}`;
    let geoRes = await fetch(geoUrl);
    geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(place + ",IN")}&limit=5&appid=${API_KEY}`;
      geoRes = await fetch(geoUrl);
      geoData = await geoRes.json();
    }

    if (!geoData || geoData.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Location not found" })
      };
    }

    const location = geoData.find(loc => loc.country === "IN") || geoData[0];
    const { lat, lon } = location;

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    weatherData.name = location.name;
    weatherData.sys = {
      ...weatherData.sys,
      country: location.country
    };

    return {
      statusCode: weatherRes.status,
      body: JSON.stringify(weatherData)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error" })
    };
  }
};