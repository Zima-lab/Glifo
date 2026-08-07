/* Glifo — SERVICE WORKER
   Rende l'app utilizzabile offline.

   IMPORTANTE: dopo aver modificato dei file, incrementare CACHE_VERSION
   (es. da glifo-v1 a glifo-v2), altrimenti i dispositivi continuano a
   usare la versione salvata in cache. */

const CACHE_VERSION = 'glifo-v21';

const ASSETS = [
  './',
  'index.html',
  'style.css',
  'data.js',
  'app.js',
  'manifest.webmanifest',
  'favicon.ico',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',

  // caratteri dell'interfaccia
  'fonts/Blacker-Pro-Text-Light-Italic.woff2',
  'fonts/Blacker-Pro-Text-Light.woff2',
  'fonts/Blacker-Pro-Text-Medium-Italic.woff2',
  'fonts/Blacker-Pro-Text-Medium.woff2',
  'fonts/Blacker-Sans-Pro-Book-Italic.woff2',
  'fonts/Blacker-Sans-Pro-Book.woff2',
  'fonts/Blacker-Sans-Pro-Extrabold-Italic.woff2',
  'fonts/Blacker-Sans-Pro-Extrabold.woff2',

  // caratteri campione del glossario
  'fonts/Futura/Futura-Medium.woff2',
  'fonts/Futura/Futura-Bold.woff2',
  'fonts/specimen/archivo-500-latin.woff2',
  'fonts/specimen/archivo-700-latin.woff2',
  'fonts/specimen/caveat-600-latin.woff2',
  'fonts/specimen/cinzel-500-latin.woff2',
  'fonts/specimen/cinzel-600-latin.woff2',
  'fonts/specimen/cormorant-garamond-500-latin.woff2',
  'fonts/specimen/cormorant-garamond-600-latin.woff2',
  'fonts/specimen/dancing-script-600-latin.woff2',
  'fonts/specimen/dm-sans-500-latin.woff2',
  'fonts/specimen/dm-sans-700-latin.woff2',
  'fonts/specimen/eb-garamond-400-latin.woff2',
  'fonts/specimen/eb-garamond-500-latin.woff2',
  'fonts/specimen/helvetica-lt-55-roman.woff2',
  'fonts/specimen/inter-400-latin.woff2',
  'fonts/specimen/inter-600-latin.woff2',
  'fonts/specimen/noto-sans-400-cyrillic.woff2',
  'fonts/specimen/noto-sans-400-greek.woff2',
  'fonts/specimen/noto-sans-400-latin.woff2',
  'fonts/specimen/playfair-display-600-latin.woff2',
  'fonts/specimen/playfair-display-700-latin.woff2',
  'fonts/specimen/pt-serif-400-latin.woff2',
  'fonts/specimen/pt-serif-700-latin.woff2',
  'fonts/specimen/roboto-slab-500-latin.woff2',
  'fonts/specimen/roboto-slab-600-latin.woff2',
  'fonts/specimen/source-sans-3-400-latin.woff2',
  'fonts/specimen/source-sans-3-600-latin.woff2',
  'fonts/specimen/unifrakturcook-700-latin.woff2',

  // caratteri campione delle schede della sezione Type
  'fonts/specimen/libre-baskerville-400-latin.woff2',
  'fonts/specimen/libre-baskerville-700-latin.woff2',
  'fonts/specimen/gfs-didot-400-latin.woff2',
  'fonts/specimen/bodoni-moda-400-latin.woff2',
  'fonts/specimen/bodoni-moda-600-latin.woff2',
  'fonts/specimen/tinos-400-latin.woff2',
  'fonts/specimen/tinos-700-latin.woff2',
  'fonts/specimen/anton-400-latin.woff2',
  'fonts/specimen/josefin-sans-400-latin.woff2',
  'fonts/specimen/josefin-sans-600-latin.woff2',
  'fonts/specimen/comic-neue-400-latin.woff2',
  'fonts/specimen/comic-neue-700-latin.woff2',

  // tavole illustrate
  'plates/anatomia.svg',
  'plates/gotiche.svg',
  'plates/punzone.svg',
  'plates/asse.svg',
  'plates/crenatura.svg',
  'plates/tipometria.svg',

  // ritratti dei designer
  'img/gutenberg.jpg',
  'img/manuzio.jpg',
  'img/garamond.png',
  'img/bodoni.jpg',
  'img/renner.png',
  'img/frutiger.jpg',
  'img/miedinger.jpg',
  'img/licko.jpg',
  'img/jenson.png',
  'img/caslon.jpg',
  'img/baskerville.jpg',
  'img/tschichold.jpg',
  'img/novarese.jpg',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      // Due accortezze, entrambe imparate a spese di una pubblicazione.
      //
      // 1. addAll fallisce in blocco se un solo file manca: qui aggiungiamo
      //    uno per uno, così un asset assente non impedisce l'installazione.
      //
      // 2. `cache: 'reload'` NON è un dettaglio. Senza, cache.add() prende
      //    i file dalla cache HTTP del browser, e GitHub Pages li serve con
      //    max-age=600: per dieci minuti dopo la pubblicazione il browser ha
      //    ancora la copia vecchia. Il risultato è una cache che si chiama
      //    glifo-v17 ma contiene i file della v15 — versione nuova di nome,
      //    contenuto vecchio, e il footer che mente. Con 'reload' ogni file
      //    viene ripreso dalla rete, saltando la cache HTTP.
      return Promise.all(ASSETS.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE_VERSION ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  // File dell'app: cache per prima, poi rete.
  event.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    }).catch(function () { return caches.match('index.html'); })
  );
});
