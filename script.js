const API_KEY = "2ab9aa185bc7986f9e56e278d4036623"; // Place your OpenWeatherMap API Key here

const iconURL = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`;
const $ = (id) => document.getElementById(id);
const alertDiv = $("alert");

// Helper for showing alerts
function showAlert(msg) {
  alertDiv.style.display = "block";
  alertDiv.innerText = msg;
  setTimeout(() => { alertDiv.style.display = "none"; }, 2200);
}

// Main weather fetching function
async function fetchWeatherWithCoords(lat, lon, cityLabel = "") {
  try {
    $("currentWeather").innerHTML = "...";
    $("fiveDayForecast").innerHTML = "";
    $("hourlyForecast").innerHTML = "";
    $("uv").innerText = "";
    $("aqi").innerText = "";

    // Fetch: current weather, forecast, AQI (all by coordinates)
    const [wRes, forecastRes, airRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`),
      fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
    ]);
    const weather = await wRes.json();
    const forecast = await forecastRes.json();
    const air = await airRes.json();
    drawCurrentWeather(weather, cityLabel || weather.name, weather.sys.country);
    drawFiveDay(forecast);
    drawHourly(forecast);
    drawUV_AQI(air);
  } catch {
    showAlert("API error. Please try again.");
    $("currentWeather").innerHTML = "";
    $("fiveDayForecast").innerHTML = "";
    $("hourlyForecast").innerHTML = "";
    $("uv").innerText = "";
    $("aqi").innerText = "";
  }
}

// Fetch by city string
async function fetchWeather(city) {
  try {
    if (!city) throw new Error("Please enter a city!");
    $("currentWeather").innerHTML = "...";
    $("fiveDayForecast").innerHTML = "";
    $("hourlyForecast").innerHTML = "";
    $("uv").innerText = "";
    $("aqi").innerText = "";

    // Geocode city to lat/lon
    const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`);
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error("City not found.");
    const { lat, lon, name, country } = geoData[0];

    fetchWeatherWithCoords(lat, lon, name);
  } catch (e) {
    showAlert(e.message || "API error");
    $("currentWeather").innerHTML = "";
    $("fiveDayForecast").innerHTML = "";
    $("hourlyForecast").innerHTML = "";
    $("uv").innerText = "";
    $("aqi").innerText = "";
  }
}

// Draw current weather card
function drawCurrentWeather(data, city, country) {
  $("currentWeather").innerHTML = `
    <div class="info">
      <h2>${city}, ${country || ""}</h2>
      <div class="desc">${data.weather[0].description}</div>
      <div><b>${Math.round(data.main.temp)}°C</b> | Feels: ${Math.round(data.main.feels_like)}°C</div>
      <div>Humidity: ${data.main.humidity}% &middot; Wind: ${data.wind.speed} m/s</div>
      <div>Sunrise: ${new Date(data.sys.sunrise * 1000).toLocaleTimeString()} | Sunset: ${new Date(data.sys.sunset * 1000).toLocaleTimeString()}</div>
    </div>
    <img src="${iconURL(data.weather[0].icon)}" alt="Icon">
  `;
}

// Draw five day forecast
function drawFiveDay(forecast) {
  let grouped = {};
  for (let obj of forecast.list) {
    const date = obj.dt_txt.split(" ")[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(obj);
  }
  let days = Object.values(grouped).slice(0, 5);

  $("fiveDayForecast").innerHTML = days.map(dayArr => {
    const day = dayArr[3] || dayArr[0];
    const dateStr = new Date(day.dt * 1000).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
    return `
      <div class="day-card">
        <div>${dateStr}</div>
        <img src="${iconURL(day.weather[0].icon)}" alt="icon">
        <div><b>${Math.round(day.main.temp)}°C</b></div>
        <div>${day.weather[0].main}</div>
      </div>`;
  }).join("");
}

// Draw next 8 (24hr in 3hr steps) hourly forecast
function drawHourly(forecast) {
  $("hourlyForecast").innerHTML = forecast.list.slice(0, 8).map(obj => {
    const time = new Date(obj.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="hour-card">
        <div>${time}</div>
        <img src="${iconURL(obj.weather[0].icon)}" alt="icon">
        <div><b>${Math.round(obj.main.temp)}°C</b></div>
      </div>`;
  }).join("");
}

// Draw UV index and AQI
function drawUV_AQI(air) {
  if (air.list && air.list[0]) {
    const aqiVal = air.list[0].main.aqi;
    const levels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
    $("aqi").innerText = "AQI: " + aqiVal + " (" + levels[aqiVal-1] + ")";
  }
  $("uv").innerText = "UV: N/A";
}

// --- Event Listeners ---

// Manual search
$("searchBtn").onclick = () => fetchWeather($("cityInput").value.trim());
$("cityInput").addEventListener("keydown", e => { if (e.key === "Enter") $("searchBtn").click(); });

// Geolocation button and fetch
$("geoBtn").onclick = () => {
  if (!navigator.geolocation) {
    showAlert("Geolocation not supported!");
    return;
  }
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude, lon = pos.coords.longitude;
    fetchWeatherWithCoords(lat, lon);
  }, (error) => {
    if (error.code === error.PERMISSION_DENIED) {
      showAlert("Location permission denied.");
    } else {
      showAlert("Could not get your location.");
    }
  });
};

// -- Persistent and correct dark/light mode with icon --
const toggleBtn = $("themeToggle");

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  toggleBtn.textContent = "☀️";
} else {
  document.body.classList.remove("dark");
  toggleBtn.textContent = "🌙";
}

toggleBtn.onclick = () => {
  document.body.classList.toggle("dark");
  const darkMode = document.body.classList.contains("dark");
  toggleBtn.textContent = darkMode ? "☀️" : "🌙";
  localStorage.setItem("theme", darkMode ? "dark" : "light");
};

// -- No initial weather is loaded! User must search or click location --
function showGreeting() {
  const hour = new Date().getHours();
  let greeting = "";
  if (hour >= 5 && hour < 12) greeting = "Good Morning";
  else if (hour >= 12 && hour < 18) greeting = "Good Afternoon";
  else greeting = "Good Evening";

  const greetingDiv = document.getElementById('greeting');
  greetingDiv.textContent = greeting + ",";
}
showGreeting();