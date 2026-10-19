// =====================================================================
// MinVa — lecture hors connexion des sites d'organisations
// Toujours le réseau d'abord (le site reste à jour) ; si la connexion
// coupe, on montre la dernière version vue. Seules les données PUBLIQUES
// sont gardées : jamais les données privées des consoles.
// =====================================================================
var CACHE = 'minva-sites-v2';
var PUBLIC_SUPABASE = /\.supabase\.co\/(rest\/v1\/(organisations_publiques|actualites|projets|documents_publics|evenements_publics|dons_publics|depenses|produits|matchs|sondages_publics|dons_bilan)\b|storage\/v1\/object\/public\/)/;
var BIBLIOTHEQUES = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)\//;
var PAGES_PRIVEES = /\/(admin\.html|affiche\.html)/;

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (c) { return c.indexOf('minva-sites-') === 0 && c !== CACHE; }).map(function (c) { return caches.delete(c); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var url = r.url;
  var memeSite = url.indexOf(self.location.origin) === 0;
  // Les consoles (admin) ne passent jamais par le cache
  if (memeSite && PAGES_PRIVEES.test(url)) return;
  if (r.headers.get('Authorization') && /\.supabase\.co\//.test(url) && !PUBLIC_SUPABASE.test(url)) return;
  if (!(memeSite || PUBLIC_SUPABASE.test(url) || BIBLIOTHEQUES.test(url))) return;
  e.respondWith(
    fetch(r).then(function (rep) {
      if (rep && (rep.ok || rep.type === 'opaque')) {
        var copie = rep.clone();
        caches.open(CACHE).then(function (c) { c.put(r, copie); });
      }
      return rep;
    }).catch(function () {
      return caches.match(r, { ignoreVary: true }).then(function (m) { return m || Response.error(); });
    })
  );
});
