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
    let location = null;

    // Multiple smart search attempts
    const searchQueries = [
      place,
      `${place}, India`,
      `${place}, Uttar Pradesh, India`,
      `${place}, Bihar, India`,
      `${place}, Delhi, India`
    ];

    for (const query of searchQueries) {
      const geoUrl =
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}` +
        `&format=json&limit=1&addressdetails=1`;

      const geoRes = await fetch(geoUrl, {
        headers: {
          "User-Agent": "mausam-aaj-ka-weather-app"
        }
      });

      const geoData = await geoRes.json();

      if (geoData && geoData.length > 0) {
        location = geoData[0];
        break;
      }
    }

    // Fallback: OpenWeather geocoding
    if (!location) {
      const openGeoUrl =
        `https://api.openweathermap.org/geo/1.0/direct?` +
        `q=${encodeURIComponent(place + ",IN")}&limit=5&appid=${API_KEY}`;

      const openGeoRes = await fetch(openGeoUrl);
      const openGeoData = await openGeoRes.json();

      if (openGeoData && openGeoData.length > 0) {
        const loc = openGeoData[0];

        location = {
          lat: loc.lat,
          lon: loc.lon,
          display_name: `${loc.name}, ${loc.state || ""}, ${loc.country || ""}`,
          address: {
            village: loc.name,
            state: loc.state,
            country_code: loc.country
          }
        };
      }
    }

    if (!location) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Location not found. Try village + district name."
        })
      };
    }

    const lat = location.lat;
    const lon = location.lon;

    const weatherUrl =
      `https://api.openweathermap.org/data/2.5/weather?` +
      `lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;

    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    const address = location.address || {};

    weatherData.name =
      address.village ||
      address.town ||
      address.city ||
      address.county ||
      location.display_name.split(",")[0];

    weatherData.sys = {
      ...weatherData.sys,
      country: address.country_code
        ? address.country_code.toUpperCase()
        : weatherData.sys?.country || "IN"
    };

    weatherData.place_full_name = location.display_name;

    return {
      statusCode: 200,
      body: JSON.stringify(weatherData)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error" })
    };
  }
};