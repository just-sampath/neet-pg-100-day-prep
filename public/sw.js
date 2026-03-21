const OFFLINE_CACHE = "beside-you-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode !== "navigate") {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      return (await cache.match(OFFLINE_URL)) ?? Response.error();
    }),
  );
});
