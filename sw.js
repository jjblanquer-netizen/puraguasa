// ============================================================
// PuraGuasa — Service Worker
// ------------------------------------------------------------
// Estrategia "red primero, caché como red de seguridad": esta
// app depende de Firebase para funcionar (no tiene sentido un
// modo sin conexión real), así que priorizamos ver siempre la
// última versión subida en vez de arriesgarnos a servir HTML/JS
// desactualizado desde caché. Si no hay red, cae a lo último que
// se guardó en caché para no dejar una pantalla en blanco.
//
// Sube este número cada vez que cambies archivos estáticos, para
// forzar a los navegadores a limpiar la caché antigua.
// ============================================================
const CACHE = 'puraguasa-v4';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/firebase-config.js',
  './js/gameData.js',
  './js/gameEngine.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca interceptar llamadas a Firebase: deben ir siempre a la red para
  // tener datos de la partida en tiempo real.
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('firebasedatabase.app') || url.hostname.includes('googleapis.com')) {
    return;
  }
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Red disponible: usamos siempre la respuesta fresca, y de paso
        // actualizamos la caché por si hace falta como red de seguridad.
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request)) // sin red: última versión guardada
  );
});
