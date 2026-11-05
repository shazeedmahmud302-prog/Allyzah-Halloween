const CACHE_NAME = "allyzah-halloween-offline-v1";
const APP_SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./style.css", "./flappy.css", "./games.css", "./fruit.css", "./puzzle.css", "./candy.css",
  "./script.js", "./flappy.js", "./fruit.js", "./puzzle.js", "./candy.js", "./games-menu.js",
  "./chores.css", "./chores.js", "./preview.jpg",
  "./icons/witch-icon-192.png", "./icons/witch-icon-512.png", "./icons/witch-apple-touch.png",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png",
  "./assets/music/halloween-song.mp3",
  "./assets/photos/allyzah.jpg", "./assets/photos/allyzah-witch.png",
  "./assets/photos/couple-puzzle-1.jpg", "./assets/photos/couple-puzzle-2.jpg",
  "./assets/photos/shazeee.png", "./assets/photos/shazeee-batman.png",
  "./assets/voices/Aray ko.m4a", "./assets/voices/Ayoko na.m4a", "./assets/voices/Bebe naman 2.m4a",
  "./assets/voices/Bebe naman.m4a", "./assets/voices/Just give me a reason.m4a",
  "./assets/voices/Kunin mo na ako.m4a", "./assets/voices/No mommy no.m4a",
  "./assets/voices/Sakit naman.m4a", "./assets/voices/Shibal saekkiya.m4a", "./assets/voices/Yamete kudasai.m4a"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("allyzah-halloween-offline-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(async () => {
          const offlinePage = await caches.match(request);
          return offlinePage || caches.match("./index.html");
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
