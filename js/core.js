// Shared shell: screen navigation, game registry, info modal, small utilities.
// Each game module (js/imposter.js, js/bomb.js) registers its own screens and
// itself via window.Juju.registerScreen / registerGame — core.js has no
// knowledge of individual games beyond that registry.
window.Juju = (function(){
  var games = {};
  var activeGame = null;

  var el = {
    screens: {
      home: document.getElementById('screen-home'),
      games: document.getElementById('screen-games')
    },
    appChrome: document.getElementById('app-chrome'),
    gameTitleText: document.getElementById('game-title-text'),
    btnInfo: document.getElementById('btn-info')
  };
  el.btnInfo.style.display = 'none';

  function registerScreen(name, elem){
    el.screens[name] = elem;
  }

  function showScreen(name){
    Object.keys(el.screens).forEach(function(k){
      el.screens[k].classList.toggle('active', k === name);
    });
    el.appChrome.style.display = (name === 'home') ? 'none' : 'block';
    updateInfoButtonVisibility(name);
    document.dispatchEvent(new CustomEvent('juju:screenchange', { detail: { screen: name } }));
    window.scrollTo(0,0);
  }

  // the info button only makes sense on a game's own setup/settings screen
  function updateInfoButtonVisibility(screenName){
    var g = activeGame && games[activeGame];
    el.btnInfo.style.display = (g && g.infoHtml && screenName === g.setupScreen) ? '' : 'none';
  }

  function setActiveGame(id, titleHtml){
    activeGame = id;
    el.gameTitleText.innerHTML = titleHtml;
  }

  function goToGames(){
    setActiveGame(null, '🎮 بازی‌ها');
    showScreen('games');
  }

  // opts: { tileId, title, setupScreen, infoHtml }
  function registerGame(id, opts){
    games[id] = opts;
    var tile = document.getElementById(opts.tileId);
    if(tile){
      tile.addEventListener('click', function(){
        setActiveGame(id, opts.title);
        showScreen(opts.setupScreen);
      });
    }
  }

  // ---------- shared utilities ----------
  function escapeHtml(s){
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function shuffledIndices(n){
    var arr = [];
    for(var i=0;i<n;i++) arr.push(i);
    for(var j=arr.length-1;j>0;j--){
      var k = Math.floor(Math.random()*(j+1));
      var tmp = arr[j]; arr[j]=arr[k]; arr[k]=tmp;
    }
    return arr;
  }

  var faDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  function toFa(n){
    return String(n).replace(/[0-9]/g, function(d){ return faDigits[+d]; });
  }

  // ---------- navigation ----------
  document.getElementById('btn-enter-games').addEventListener('click', goToGames);
  document.getElementById('header-logo').addEventListener('click', goToGames);

  // ---------- info / how-to-play modal ----------
  var infoModal = document.getElementById('info-modal');
  var infoModalText = document.getElementById('info-modal-text');
  el.btnInfo.addEventListener('click', function(){
    var g = games[activeGame];
    infoModalText.innerHTML = (g && g.infoHtml) || '';
    infoModal.classList.add('open');
  });
  document.getElementById('info-modal-close').addEventListener('click', function(){
    infoModal.classList.remove('open');
  });
  infoModal.addEventListener('click', function(e){
    if(e.target === infoModal) infoModal.classList.remove('open');
  });

  return {
    el: el,
    registerScreen: registerScreen,
    showScreen: showScreen,
    setActiveGame: setActiveGame,
    goToGames: goToGames,
    registerGame: registerGame,
    escapeHtml: escapeHtml,
    shuffledIndices: shuffledIndices,
    toFa: toFa,
    getActiveGame: function(){ return activeGame; }
  };
})();
