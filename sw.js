// sw.js — caches the app shell so the app opens and works with no network,
// once it has been opened at least once while online.
// NOTE: this does NOT touch IndexedDB (books/audio/recordings) — that data
// lives in IndexedDB regardless of the service worker and persists across
// cache updates. Bump CACHE_NAME when you change any cached file, or the
// browser will keep serving the old version from cache.
'use strict';

const CACHE_NAME = 'accentforge-shell-v3';
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/db.js',
  './js/warmup.js',
  './js/segmenter.js',
  './js/audioEngine.js',
  './js/recorder.js',
  './js/textExtractor.js',
  './js/app.js',
  './vendor/pdf.min.js',
  './vendor/pdf.worker.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Cache-first for app shell; anything not in the shell just falls through to network
  // (there shouldn't be other network requests in this app — no analytics, no CDN calls).
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
