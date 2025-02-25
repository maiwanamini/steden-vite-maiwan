import './style.css';
import Swiper from 'swiper';
import { Navigation, Pagination, EffectFade, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

const API_KEY = '2f63c69349e7fc2d40d4114d3120017c';
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

async function fetchWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}&units=metric`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    const weatherCondition = data.weather[0].main;
    const emoji = weatherIcons[weatherCondition] || '❓';
    return `${emoji} ${data.main.temp.toFixed(1)}°C`;
  } catch (error) {
    console.error(`Error fetching weather for ${city.name}:`, error);
    return '⚠️ Weer niet beschikbaar';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const slides = document.querySelectorAll('.swiper-slide');
  slides.forEach(async (slide, index) => {
    const city = cities[index];
    if (city) {
      const caption = slide.querySelector('.slide-caption');
      const weatherInfo = await fetchWeather(city);
      caption.textContent = `${city.name}, ${weatherInfo}`;
    }
  });
});

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

document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.swiper-button-next, .swiper-button-prev');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      button.classList.add('clicked');
      setTimeout(() => {
        button.classList.remove('clicked');
      }, 300);
    });
  });
});
