/* Service worker — кешира приложението за офлайн работа.
   ВАЖНО: index.html се взима "мрежа първо" (network-first), за да се
   показва веднага новата версия, когато има интернет. Иконите и т.н.
   се взимат "кеш първо" за бързина. Данните за масите са в localStorage. */
var CACHE = "masi-v3";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Дали заявката е за HTML страницата (навигация)
function isHTML(req) {
  return req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") !== -1;
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  if (isHTML(req)) {
    // Мрежа първо: винаги пробва да вземе новата версия онлайн
    e.respondWith(
      fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { try { c.put("./index.html", copy); } catch (err) {} });
        return resp;
      }).catch(function () {
        return caches.match("./index.html").then(function (m) { return m || caches.match("./"); });
      })
    );
    return;
  }

  // Останалото (икони, manifest): кеш първо, после мрежа
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { try { c.put(req, copy); } catch (err) {} });
        return resp;
      });
    })
  );
});
