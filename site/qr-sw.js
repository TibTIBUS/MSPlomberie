// Offline copy of qr.html for Sébastien's home-screen shortcut.
// build.py replaces the two placeholders with the exact versioned files of the
// built page, so any change (e.g. the real Google review link) gives a new cache.
'use strict';
const CACHE = 'msp-qr-2958ee818341';
const FILES = ["qr.html", "qr.webmanifest", "assets/icon-192.png", "assets/icon-512.png", "assets/favicon.svg", "assets/apple-touch-icon.png", "styles.css?v=c59b3f159848", "config.js?v=1efd4814095f", "app.js?v=9d522c663a56", "assets/avis-google.svg?v=36a0d8b8394c"];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('msp-qr-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Network first, so an updated code is shown as soon as there is signal;
// the cached copy is used on site visits without a connection.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
        return response;
      })
      .catch(() => caches.match(request, {ignoreSearch: request.mode === 'navigate'}))
  );
});
