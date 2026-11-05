const CACHE_NAME = "allyzah-halloween-offline-v3";
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

async function serveCachedRange(request) {
  const cached = await caches.match(new Request(request.url), { ignoreSearch: true });
  if (!cached) return fetch(request);

  const range = request.headers.get("range") || "";
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  const data = await cached.arrayBuffer();
  const size = data.byteLength;
  if (!match || size === 0) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  let end = match[2] && match[1] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (start >= size || end < start) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  return new Response(data.slice(start, end + 1), {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Type": cached.headers.get("Content-Type") || "application/octet-stream"
    }
  });
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.headers.has("range")) {
    event.respondWith(serveCachedRange(request));
    return;
  }

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
