const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const suggestionsBox = document.getElementById("suggestions");

const statusBox = document.getElementById("status");
const statusText = document.getElementById("statusText");
const spinner = document.getElementById("spinner");
const weatherCard = document.getElementById("weatherCard");

const placeName = document.getElementById("placeName");
const dateTime = document.getElementById("dateTime");
const weatherIcon = document.getElementById("weatherIcon");
const temperature = document.getElementById("temperature");
const weatherDesc = document.getElementById("weatherDesc");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const precip = document.getElementById("precip");
const forecastRow = document.getElementById("forecastRow");
const updatedAt = document.getElementById("updatedAt");

const WEATHER_CODES = {
  0: ["☀️", "Clear sky"],
  1: ["🌤️", "Mainly clear"],
  2: ["⛅", "Partly cloudy"],
  3: ["☁️", "Overcast"],
  45: ["🌫️", "Fog"],
  48: ["🌫️", "Freezing fog"],
  51: ["🌦️", "Light drizzle"],
  53: ["🌦️", "Drizzle"],
  55: ["🌧️", "Dense drizzle"],
  61: ["🌧️", "Light rain"],
  63: ["🌧️", "Rain"],
  65: ["🌧️", "Heavy rain"],
  71: ["🌨️", "Light snow"],
  73: ["🌨️", "Snow"],
  75: ["❄️", "Heavy snow"],
  80: ["🌦️", "Rain showers"],
  81: ["🌧️", "Rain showers"],
  82: ["⛈️", "Violent rain showers"],
  95: ["⛈️", "Thunderstorm"],
  96: ["⛈️", "Thunderstorm with hail"],
  99: ["⛈️", "Severe thunderstorm"],
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || ["🌡️", "Unknown"];
}

function showLoading(message = "Fetching weather data...") {
  weatherCard.style.display = "none";
  statusBox.style.display = "block";
  statusBox.classList.remove("error");
  spinner.style.display = "block";
  statusText.textContent = message;
}

function showError(message) {
  weatherCard.style.display = "none";
  statusBox.style.display = "block";
  statusBox.classList.add("error");
  spinner.style.display = "none";
  statusText.textContent = message;
}

function showWeather() {
  statusBox.style.display = "none";
  weatherCard.style.display = "block";
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => reject(new Error("Location access was denied or unavailable.")),
      { timeout: 10000 },
    );
  });
}

async function geocodeCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not reach the geocoding service.");
  }

  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(
      `No results found for "${name}". Try a different spelling.`,
    );
  }

  return data.results;
}

async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weathercode,wind_speed_10m,is_day",
    daily: "weathercode,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: 6,
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not reach the weather service.");
  }

  return response.json();
}

function renderWeather(locationLabel, data) {
  const current = data.current;
  const isDay = current.is_day === 1;

  document.body.classList.toggle("night", !isDay);

  const [icon, description] = getWeatherInfo(current.weathercode);

  placeName.textContent = locationLabel;
  dateTime.textContent = new Date(current.time).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  weatherIcon.textContent = icon;
  temperature.textContent = `${Math.round(current.temperature_2m)}°C`;
  weatherDesc.textContent = description;
  feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;

  humidity.textContent = `${current.relative_humidity_2m}%`;
  wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  precip.textContent = `${current.precipitation} mm`;

  forecastRow.innerHTML = "";
  const days = data.daily.time;

  for (let i = 1; i < Math.min(days.length, 6); i++) {
    const [dayIcon] = getWeatherInfo(data.daily.weathercode[i]);
    const max = Math.round(data.daily.temperature_2m_max[i]);
    const min = Math.round(data.daily.temperature_2m_min[i]);
    const label = new Date(days[i]).toLocaleDateString(undefined, {
      weekday: "short",
    });

    const dayBox = document.createElement("div");
    dayBox.className = "day-box";
    dayBox.innerHTML = `
        <div class="day-name">${label}</div>
        <div class="day-icon">${dayIcon}</div>
        <div class="day-temp"><span class="max">${max}°</span> <span class="min">${min}°</span></div>
      `;
    forecastRow.appendChild(dayBox);
  }

  updatedAt.textContent = `Last updated ${new Date().toLocaleTimeString()}`;
  showWeather();
}

async function loadWeatherByCity(cityName) {
  try {
    showLoading(`Looking up "${cityName}"...`);

    const results = await geocodeCity(cityName);
    const place = results[0];

    showLoading(`Fetching weather for ${place.name}...`);
    const data = await fetchWeather(place.latitude, place.longitude);

    const label = [place.name, place.admin1, place.country]
      .filter(Boolean)
      .join(", ");
    renderWeather(label, data);
  } catch (err) {
    showError(err.message || "Something went wrong. Please try again.");
  }
}

async function loadWeatherByLocation() {
  try {
    showLoading("Getting your location...");
    const coords = await getCurrentPosition();

    showLoading("Fetching weather for your location...");
    const data = await fetchWeather(coords.latitude, coords.longitude);

    renderWeather("Your location", data);
  } catch (err) {
    showError(err.message || "Could not get weather for your location.");
  }
}

let debounceTimer = null;

cityInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const query = cityInput.value.trim();

  if (query.length < 2) {
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = "";
    return;
  }

  debounceTimer = setTimeout(async () => {
    try {
      const results = await geocodeCity(query);
      renderSuggestions(results);
    } catch (err) {
      suggestionsBox.style.display = "none";
    }
  }, 400);
});

function renderSuggestions(results) {
  suggestionsBox.innerHTML = "";
  results.forEach((place) => {
    const label = [place.name, place.admin1, place.country]
      .filter(Boolean)
      .join(", ");
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.textContent = label;
    item.addEventListener("click", () => {
      cityInput.value = place.name;
      suggestionsBox.style.display = "none";
      loadWeatherByCoords(place);
    });
    suggestionsBox.appendChild(item);
  });
  suggestionsBox.style.display = results.length ? "block" : "none";
}

async function loadWeatherByCoords(place) {
  try {
    showLoading(`Fetching weather for ${place.name}...`);
    const data = await fetchWeather(place.latitude, place.longitude);
    const label = [place.name, place.admin1, place.country]
      .filter(Boolean)
      .join(", ");
    renderWeather(label, data);
  } catch (err) {
    showError(err.message || "Something went wrong. Please try again.");
  }
}

searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  suggestionsBox.style.display = "none";
  if (city) loadWeatherByCity(city);
});

cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const city = cityInput.value.trim();
    suggestionsBox.style.display = "none";
    if (city) loadWeatherByCity(city);
  }
});

locationBtn.addEventListener("click", loadWeatherByLocation);

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-row") && !e.target.closest(".suggestions")) {
    suggestionsBox.style.display = "none";
  }
});

showLoading;
