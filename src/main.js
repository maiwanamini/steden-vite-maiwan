import './style.css';
import Swiper from 'swiper';
import { Navigation, Pagination, EffectFade, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

const API_KEY = import.meta.env.VITE_API_KEY;

const cities = [
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'Tokyo', lat: 35.6895, lon: 139.6917 },
  { name: 'Kaapstad', lat: -33.9249, lon: 18.4241 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 }
];

const weatherIcons = {
  'Clear': '☀️',
  'Clouds': '☁️',
  'Rain': '🌧️',
  'Thunderstorm': '⛈️',
  'Drizzle': '🌦️',
  'Snow': '❄️',
  'Mist': '🌫️',
  'Fog': '🌫️',
  'Haze': '🌫️'
};

const weatherCache = new Map();

async function fetchWeather(city) {
  if (!API_KEY) {
    console.error('API key ontbreekt!');
    return '⚠️ API key ontbreekt';
  }

  if (weatherCache.has(city.name)) {
    return weatherCache.get(city.name);
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);

    if (!response.ok) throw new Error('Weerdata ophalen mislukt');

    const data = await response.json();
    const weatherCondition = data.weather[0].main;
    const emoji = weatherIcons[weatherCondition] || '❓';
    const weatherInfo = `${emoji} ${data.main.temp.toFixed(1)}°C`;

    weatherCache.set(city.name, weatherInfo);
    return weatherInfo;
  } catch (error) {
    console.error(`Fout bij ophalen van weer voor ${city.name}:`, error);
    return '⚠️ Weer niet beschikbaar';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const slides = document.querySelectorAll('.swiper-slide');

  try {
    const weatherPromises = cities.map(fetchWeather);
    const weatherResults = await Promise.all(weatherPromises);

    slides.forEach((slide, index) => {
      const weatherDiv = slide.querySelector('.weather-info');
      if (weatherDiv) {
        weatherDiv.textContent = weatherResults[index];
      }
    });
  } catch (error) {
    console.error('Fout bij het verwerken van de weerdata:', error);
  }

  const swiper = new Swiper('.swiper', {
    modules: [Navigation, Pagination, EffectFade, Autoplay],
    loop: true,
    slidesPerView: 1,
    effect: 'fade',
    fadeEffect: { crossFade: true },
    autoplay: {
      delay: 4000,
      disableOnInteraction: false,
    },
    speed: 1000,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    allowTouchMove: true,
  });

  const buttons = document.querySelectorAll('.swiper-button-next, .swiper-button-prev');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      button.classList.add('clicked');
      setTimeout(() => button.classList.remove('clicked'), 300);
    });
  });
});
