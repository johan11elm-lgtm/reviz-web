// -------------------------------------------------------
// Réviz — Service Worker (cache offline)
// -------------------------------------------------------
// v6 : plus de HTML en cache pour un script/style/police/image (Vercel répond index.html en
// 200 pour un fichier haché disparu : le chunk manquant restait figé) ; seuls les /assets/
// hachés restent cache-first, le reste (moteur du pantin…) passe par le réseau d'abord.
// v5 : /ingest (relais PostHog) jamais intercepté ; purge ce qu'un SW
// précédent aurait pu mettre en cache sous /ingest.
// v4 : nouvelle icône (mascotte 3D, 8 octobre 2026) — force le rechargement des icônes.
// v3 : purge les mascottes PNG pré-détourage et adopte
// stale-while-revalidate pour les images non-hashées.
const CACHE_NAME = 'reviz-v6';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon-32.png',
  '/favicon-64.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
];

// Une réponse ne va au cache que si elle est valide ET du bon type : pour un script, un style,
// une police ou une image, une page HTML n'est jamais la bonne réponse (c'est la réécriture
// vers index.html d'un fichier disparu), la mémoriser figerait l'erreur.
function peutEtreMisEnCache(request, response) {
  if (!response.ok) return false;
  if (['script', 'style', 'font', 'image'].includes(request.destination) || new URL(request.url).pathname.startsWith('/assets/')) {
    return !(response.headers.get('content-type') || '').includes('text/html');
  }
  return true;
}

// Install: cache le shell de l'app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: nettoie les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first pour les pages, cache-first pour les assets statiques
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter les appels API, PostHog (/ingest) ou Firebase
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/ingest/') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('anthropic.com')
  ) {
    return;
  }

  // Bundles Vite hashés (/assets/xxx-<hash>.js|css|woff2) : contenu immuable
  // → cache-first strict, jamais périmé par construction.
  const isHashedAsset = url.pathname.startsWith('/assets/');
  if (isHashedAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (peutEtreMisEnCache(request, response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Scripts, styles et polices non hachés (moteur du pantin /pantin/moteur/*.js…) : réseau
  // d'abord, pour que le moteur reste au diapason de l'app ; le cache ne sert qu'hors ligne.
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'font') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (peutEtreMisEnCache(request, response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Images non-hashées (mascottes, icônes) : stale-while-revalidate —
  // réponse instantanée depuis le cache, rafraîchie en arrière-plan pour
  // qu'une mise à jour d'asset finisse par arriver aux utilisateurs.
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const refresh = fetch(request)
          .then((response) => {
            if (peutEtreMisEnCache(request, response)) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || refresh;
      })
    );
    return;
  }

  // Pages HTML : network-first avec fallback cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/') || caches.match(request))
    );
    return;
  }
});
