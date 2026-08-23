// Bumping CACHE_NAME invalidates all previously cached files on next visit.
var CACHE_NAME = 'juju-games-v6';

var IMAGE_EXT = /\.(png|jpg|jpeg|gif|webp)$/i;

var PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.json',
  'css/base.css',
  'css/imposter.css',
  'css/bomb.css',
  'css/guess.css',
  'css/werewolf.css',
  'js/install-prompt.js',
  'js/core.js',
  'js/imposter.js',
  'js/bomb.js',
  'js/guess.js',
  'js/werewolf.js',
  'Logo.png',
  'jasus_cover.jpg',
  'bomb_cover.jpg',
  'guess_cover.jpg',
  'werwolf_cover.png',
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

self.addEventListener('fetch', function(event){
  var req = event.request;
  var url = new URL(req.url);
  if(req.method !== 'GET' || url.origin !== self.location.origin){
    return;
  }

  // Images almost never change once published, so cache-first (instant,
  // works offline) is safe and saves bandwidth.
  if(IMAGE_EXT.test(url.pathname)){
    event.respondWith(
      caches.match(req).then(function(cached){
        if(cached) return cached;
        return fetch(req).then(function(res){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
          return res;
        });
      })
    );
    return;
  }

  // App shell (html/css/js/manifest) changes over time, so always try the
  // network first — a stale cached copy here would silently hide every
  // future update (that's what happened before this file existed with
  // this strategy). Cache is only a fallback for offline play.
  event.respondWith(
    fetch(req).then(function(res){
      var copy = res.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
      return res;
    }).catch(function(){
      return caches.match(req);
    })
  );
});
