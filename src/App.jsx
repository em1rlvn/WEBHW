import { useState } from 'react';
import './App.css';

function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getWeatherIcon = (code) => {
    if (code === 0) return 'wi wi-day-sunny';
    if (code === 1 || code === 2 || code === 3) return 'wi wi-day-cloudy';
    if (code === 45 || code === 48) return 'wi wi-fog';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 86)) return 'wi wi-rain';
    if (code >= 71 && code <= 77) return 'wi wi-snow';
    if (code >= 95) return 'wi wi-thunderstorm';
    return 'wi wi-cloud';
  };

  const checkWeather = async (cityName) => {
    console.log('Checking weather for:', cityName);
    if (!cityName || !cityName.trim()) return;
    setLoading(true);
    setError('');
    setWeather(null);

    try {
      const isCyrillic = /[\u0400-\u04FF]/.test(cityName);
      const preferredLang = isCyrillic ? 'ru' : 'en';
      console.log('Preferred lang:', preferredLang);

      async function geocodeOpenMeteo(name, lang) {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=${lang}`
        );
        return res.ok ? res.json() : null;
      }

      let geoData = await geocodeOpenMeteo(cityName, preferredLang);
      console.log('Geo data:', geoData);

      if (!geoData || !geoData.results || geoData.results.length === 0) {
        const otherLang = preferredLang === 'ru' ? 'en' : 'ru';
        geoData = await geocodeOpenMeteo(cityName, otherLang);
        console.log('Geo data fallback:', geoData);
      }

      if (!geoData || !geoData.results || geoData.results.length === 0) {
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`
          );
          const nomData = await nomRes.json();
          console.log('Nominatim data:', nomData);
          if (nomData && nomData.length > 0) {
            const first = nomData[0];
            const latitude = parseFloat(first.lat);
            const longitude = parseFloat(first.lon);
            const name = first.display_name || cityName;
            geoData = { results: [{ latitude, longitude, name }] };
          }
        } catch (e) {
          console.warn('Nominatim fallback failed', e);
        }
      }

      if (!geoData || !geoData.results || geoData.results.length === 0) {
        setError('Invalid city name');
        return;
      }

      const { latitude, longitude, name, country } = geoData.results[0];
      console.log('Coords:', latitude, longitude);

      const weatherResp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m&temperature_unit=celsius&windspeed_unit=kmh&timezone=auto`
      );
      const weatherData = await weatherResp.json();
      console.log('Weather data:', weatherData);

      if (!weatherData || !weatherData.current_weather) {
        setError('Error fetching weather');
        return;
      }

      const cw = weatherData.current_weather;

      let humidityText = '--';
      if (weatherData.hourly && weatherData.hourly.time && weatherData.hourly.relativehumidity_2m) {
        const times = weatherData.hourly.time;
        const humidities = weatherData.hourly.relativehumidity_2m;
        const idx = times.indexOf(cw.time);
        if (idx !== -1 && humidities[idx] !== undefined) {
          humidityText = humidities[idx] + '%';
        }
      }

      console.log('Setting weather:', { city: `${name}${country ? ', ' + country : ''}`, temp: Math.round(cw.temperature) + '°C', wind: cw.windspeed + ' km/h', humidity: humidityText, icon: getWeatherIcon(cw.weathercode) });
      setWeather({
        city: `${name}${country ? ', ' + country : ''}`,
        temp: Math.round(cw.temperature) + '°C',
        wind: cw.windspeed + ' km/h',
        humidity: humidityText,
        icon: getWeatherIcon(cw.weathercode)
      });
    } catch (err) {
      console.error('Error:', err);
      setError('Error fetching weather');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    checkWeather(city);
    setCity('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="container">
      <div className="search-box">
        <i className="fa-solid fa-location-dot"></i>
        <input
          type="text"
          placeholder="Enter your location"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button onClick={handleSearch}>
          <i className="fa-solid fa-magnifying-glass"></i>
        </button>
      </div>
      {error && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}
      {weather && (
        <div className="weather">
          <div className="weather-image">
            <i className={weather.icon}></i>
          </div>
          <h1 className="temp">{weather.temp}</h1>
          <h2 className="city">{weather.city}</h2>
          <div className="details">
            <div className="col">
              <i className="wi wi-humidity"></i>
              <div>
                <p className="humidity">{weather.humidity}</p>
                <p>Humidity</p>
              </div>
            </div>
            <div className="col">
              <i className="wi wi-strong-wind"></i>
              <div>
                <p className="wind">{weather.wind}</p>
                <p>Wind Speed</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {loading && <p>Loading...</p>}
    </div>
  );
}

export default App;
