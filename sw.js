// Bumping CACHE_NAME invalidates all previously cached files on next visit.
var CACHE_NAME = 'juju-games-v2';

var PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.json',
  'css/base.css',
  'css/imposter.css',
  'css/bomb.css',
  'js/install-prompt.js',
  'js/core.js',
  'js/imposter.js',
  'js/bomb.js',
  'Logo.png',
  'jasus_cover.jpg',
  'bomb_cover.jpg',
  'bomb.jpg',
  'heuschrecke.jpg',
  'Spieler1.png',
  'Spieler2.png',
  'Spieler3.png',
  'Spieler4.png',
  'Spieler5.png',
  'Spieler6.png',
  'Spieler7.png',
  'Spieler8.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){ return n !== CACHE_NAME; }).map(function(n){ return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

// cache-first for our own files, network-first (no caching) for everything else (e.g. Google Fonts)
self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin){
    return;
  }
  event.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        return res;
      }).catch(function(){
        return cached;
      });
    })
  );
});
