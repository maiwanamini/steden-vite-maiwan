import './style.css'
import Swiper from 'swiper'
import { Navigation, Pagination, EffectFade, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'

// THREE.js importeren
import * as THREE from 'three'
// OrbitControls importeren zodat de gebruiker de aarde kan roteren
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// API-key voor de weerdata (zorg dat deze in je .env staat)
const API_KEY = import.meta.env.VITE_API_KEY

const cities = [
  { name: 'New York', lat: 40.7128, lon: -74.006 },
  { name: 'Tokyo', lat: 35.6895, lon: 139.6917 },
  { name: 'Kaapstad', lat: -33.9249, lon: 18.4241 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 },
]

const weatherIcons = {
  Clear: '☀️',
  Clouds: '☁️',
  Rain: '🌧️',
  Thunderstorm: '⛈️',
  Drizzle: '🌦️',
  Snow: '❄️',
  Mist: '🌫️',
  Fog: '🌫️',
  Haze: '🌫️',
}

const weatherCache = {}

// Haal weerdata op voor een stad
async function fetchWeather(city) {
  if (!API_KEY) {
    console.error('API key is missing!')
    return '⚠️ API key ontbreekt'
  }
  if (weatherCache[city.name]) {
    return weatherCache[city.name]
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}&units=metric`
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Weerdata ophalen mislukt')
    const data = await response.json()
    const weatherCondition = data.weather[0].main
    const emoji = weatherIcons[weatherCondition] || '❓'
    const weatherInfo = `${emoji} ${data.main.temp.toFixed(1)}°C`
    weatherCache[city.name] = weatherInfo
    return weatherInfo
  } catch (error) {
    console.error(`Error fetching weather for ${city.name}:`, error)
    return '⚠️ Weer niet beschikbaar'
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const slides = document.querySelectorAll('.swiper-slide')
  await Promise.all(
    Array.from(slides).map(async (slide, index) => {
      const city = cities[index]
      if (city) {
        const caption = slide.querySelector('.slide-caption')
        const weatherInfo = await fetchWeather(city)
        caption.textContent = `${city.name}, ${weatherInfo}`
      }
    })
  )

  // Initialiseer de slider (variabele toewijzing verwijderd, zodat er geen ongebruikte variabele is)
  new Swiper('.swiper', {
    modules: [Navigation, Pagination, EffectFade, Autoplay],
    loop: true,
    slidesPerView: 1,
    effect: 'fade',
    fadeEffect: { crossFade: true },
    autoplay: { delay: 4000, disableOnInteraction: false },
    speed: 1000,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    pagination: { el: '.swiper-pagination', clickable: true },
    allowTouchMove: true,
  })

  const buttons = document.querySelectorAll(
    '.swiper-button-next, .swiper-button-prev'
  )
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.add('clicked')
      setTimeout(() => button.classList.remove('clicked'), 300)
    })
  })

  // Initialiseer de 3D-aardbol
  init3DEarth()
})

// Variabelen voor Three.js
let scene,
  camera,
  renderer,
  earthMesh,
  controls,
  earthMaterial,
  directionalLight,
  cloudMesh
let markers = [] // Array voor marker-objecten

function init3DEarth() {
  const container = document.getElementById('earth-container')
  if (!container) return

  // Scene en camera
  scene = new THREE.Scene()
  const fov = 45
  const aspect = container.clientWidth / container.clientHeight
  const near = 0.1
  const far = 1000
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
  camera.position.z = 3

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.3

  // Belichting: Zwakke ambient en sterke directional light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
  scene.add(ambientLight)
  directionalLight = new THREE.DirectionalLight(0xffffff, 1.2)
  directionalLight.position.set(-5, 2, 5)
  scene.add(directionalLight)

  // Laad de dag- en nachttexturen
  const textureLoader = new THREE.TextureLoader()
  const dayTexture = textureLoader.load('../public/8k_earth_daymap.jpg')
  const nightTexture = textureLoader.load('../public/8k_earth_nightmap.jpg')

  // ShaderMaterial voor dag/nacht-blending
  earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture },
      lightDirection: { value: directionalLight.position.clone().normalize() },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main(){
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D dayTexture;
      uniform sampler2D nightTexture;
      uniform vec3 lightDirection;
      varying vec2 vUv;
      varying vec3 vNormal;
      void main(){
        float intensity = dot(vNormal, normalize(lightDirection));
        float factor = smoothstep(-0.1, 0.1, intensity);
        vec4 dayColor = texture2D(dayTexture, vUv);
        vec4 nightColor = texture2D(nightTexture, vUv);
        gl_FragColor = mix(nightColor, dayColor, factor);
      }
    `,
  })

  // Maak de aarde
  const geometry = new THREE.SphereGeometry(1, 32, 32)
  earthMesh = new THREE.Mesh(geometry, earthMaterial)
  scene.add(earthMesh)

  // Voeg cloud layer toe: een bol iets groter dan de aarde
  const cloudGeometry = new THREE.SphereGeometry(1.02, 32, 32)
  const cloudTexture = textureLoader.load('../public/8k_earth_clouds.jpg') // Zorg dat dit bestand bestaat
  const cloudMaterial = new THREE.MeshPhongMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 1.0, // Basiswaarde, we passen dit dynamisch aan
    depthWrite: false,
  })
  cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial)
  // Voeg de cloud layer als kind van de aarde toe zodat hij mee roteert
  earthMesh.add(cloudMesh)

  // Voeg de markers toe
  addCityMarkers()

  // Maak en voeg de tooltip toe
  createTooltip()

  // Eventlistener voor tooltip (hover)
  container.addEventListener('mousemove', onMouseMove)

  animate()
}

// Converteer latitude en longitude naar een 3D-positie op de bol
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  return new THREE.Vector3(x, y, z)
}

// Gebruik jouw PNG-icoon voor de locatie-icon texture
const locationIconTexture = new THREE.TextureLoader().load(
  '../public/location-icon.png'
)

function addCityMarker(city) {
  const spriteMaterial = new THREE.SpriteMaterial({
    map: locationIconTexture,
    transparent: true,
    opacity: 1, // Marker volledig opaque
  })
  const marker = new THREE.Sprite(spriteMaterial)
  // Zorg dat de onderkant van de sprite op de locatie zit
  marker.center.set(0.5, 0)
  // Maak de marker kleiner
  marker.scale.set(0.15, 0.15, 1)

  const offset = 0.05
  const pos = latLonToVector3(city.lat, city.lon, 1 + offset)
  marker.position.copy(pos)

  marker.userData = {
    cityName: city.name,
    weatherInfo: weatherCache[city.name] || 'Laden...',
  }

  earthMesh.add(marker)
  markers.push(marker)
}

function addCityMarkers() {
  cities.forEach((city) => addCityMarker(city))
}

let raycaster = new THREE.Raycaster()
let mouse = new THREE.Vector2()
let tooltip

function createTooltip() {
  tooltip = document.createElement('div')
  tooltip.className = 'tooltip'
  document.body.appendChild(tooltip)
}

function updateTooltipForMarker(marker, rect) {
  const { cityName, weatherInfo } = marker.userData
  const markerPos = new THREE.Vector3()
  markerPos.setFromMatrixPosition(marker.matrixWorld)
  markerPos.project(camera)

  const screenX = (markerPos.x * 0.5 + 0.5) * rect.width
  const screenY = (-markerPos.y * 0.5 + 0.5) * rect.height

  tooltip.innerHTML = `${cityName}: ${weatherInfo}`
  tooltip.style.display = 'block'

  const tooltipHeight = tooltip.offsetHeight
  const offsetX = 10
  const offsetY = -tooltipHeight / 2

  const scrollLeft = window.scrollX || window.pageXOffset
  const scrollTop = window.scrollY || window.pageYOffset
  tooltip.style.left = rect.left + scrollLeft + screenX + offsetX + 'px'
  tooltip.style.top = rect.top + scrollTop + screenY + offsetY + 'px'
}

function onMouseMove(event) {
  const container = document.getElementById('earth-container')
  const rect = container.getBoundingClientRect()

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(markers, true)

  if (intersects.length > 0) {
    const marker = intersects[0].object
    updateTooltipForMarker(marker, rect)
  } else {
    tooltip.style.display = 'none'
  }
}

function animate() {
  requestAnimationFrame(animate)
  // Update de zonpositie uniform voor de shader
  earthMaterial.uniforms.lightDirection.value
    .copy(directionalLight.position)
    .normalize()

  // Update cloud opacity op basis van camera-afstand:
  // Als de camera ver weg is (afstand >= fadeStart), dan opacity = 0.5 (lichte wolken)
  // Als de camera dichtbij is (afstand <= fadeEnd), dan opacity = 0 (wolken verdwijnen)
  const cameraDistance = camera.position.length()
  const fadeStart = 3
  const fadeEnd = 1
  const targetOpacity =
    0.5 * THREE.MathUtils.smoothstep(cameraDistance, fadeEnd, fadeStart)
  cloudMesh.material.opacity = THREE.MathUtils.lerp(
    cloudMesh.material.opacity,
    targetOpacity,
    0.1
  )

  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  const container = document.getElementById('earth-container')
  if (!container || !camera || !renderer) return
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
})
