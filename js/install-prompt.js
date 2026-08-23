// "Install as app" hint banner. Standalone module — works independently of
// core.js/game modules, safe to load first.
//
// Android/Chrome exposes a real native install dialog via the
// beforeinstallprompt event, so we show our own button that triggers it.
// iOS Safari has no such API (Apple restriction) — the only way to install
// there is the manual Share -> "Add to Home Screen" flow, so we just point
// the player at it.
(function(){
  var STORAGE_KEY = 'juju-install-banner-dismissed';

  var banner = document.getElementById('install-banner');
  var textEl = document.getElementById('install-banner-text');
  var actionBtn = document.getElementById('install-banner-action');
  var closeBtn = document.getElementById('install-banner-close');

  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  // GoatCounter's count.js loads async, so window.goatcounter may not exist
  // yet — retry briefly instead of dropping the event.
  function gcEvent(path, title){
    var tries = 0;
    (function attempt(){
      if(window.goatcounter && window.goatcounter.count){
        window.goatcounter.count({ path: path, title: title || path, event: true });
      } else if(tries < 20){
        tries++;
        setTimeout(attempt, 150);
      }
    })();
  }

  // proxy signal for "this is an install being used", since iOS never tells
  // us about the Add to Home Screen step itself
  if(isStandalone()){
    gcEvent('standalone-open', 'App im installierten Modus geöffnet');
  }

  if(isStandalone() || localStorage.getItem(STORAGE_KEY) === '1'){
    return;
  }

  function showBanner(){
    banner.classList.add('show');
  }

  function hideBanner(){
    banner.classList.remove('show');
  }

  closeBtn.addEventListener('click', function(){
    hideBanner();
    localStorage.setItem(STORAGE_KEY, '1');
  });

  // ---------- Android / Chrome: real native install prompt ----------
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
    textEl.textContent = 'این بازی رو می‌تونی مثل یه اپ روی گوشیت نصب کنی';
    actionBtn.style.display = '';
    showBanner();
  });

  actionBtn.addEventListener('click', function(){
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(function(){
      deferredPrompt = null;
      hideBanner();
      localStorage.setItem(STORAGE_KEY, '1');
    });
  });

  window.addEventListener('appinstalled', function(){
    gcEvent('pwa-installed', 'Über Chrome-Dialog installiert');
    localStorage.setItem(STORAGE_KEY, '1');
    hideBanner();
  });

  // ---------- iOS Safari: no API, just point at Share -> Add to Home Screen ----------
  var ua = navigator.userAgent || '';
  var isIos = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
  var isOtherIosBrowser = /crios|fxios|edgios/i.test(ua); // Chrome/Firefox/Edge on iOS use a different flow
  if(isIos && !isOtherIosBrowser){
    textEl.innerHTML = 'برای نصب روی گوشی: دکمه‌ی <b>Share 📤</b> رو بزن، بعد «Add to Home Screen» رو انتخاب کن';
    showBanner();
  }
})();
