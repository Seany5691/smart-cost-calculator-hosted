// Basic Service Worker for PWA
// This is a minimal service worker that just makes the app installable
// No caching or offline functionality

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Just pass through all requests to the network
  // No caching for basic PWA
  event.respondWith(fetch(event.request));
});
