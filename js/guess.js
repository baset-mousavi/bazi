// "حدس بزن" (Guess it): forehead word-guessing game. Phone held screen-out
// against the forehead; teammates give clues; tilt down = correct, tilt up
// = skip. Falls back to on-screen buttons wherever motion sensors aren't
// available or permission is denied.
(function(){
  var Juju = window.Juju;

  Juju.registerScreen('guessSetup', document.getElementById('screen-guess-setup'));
  Juju.registerScreen('guessCountdown', document.getElementById('screen-guess-countdown'));
  Juju.registerScreen('guessPlay', document.getElementById('screen-guess-play'));
  Juju.registerScreen('guessResults', document.getElementById('screen-guess-results'));

  Juju.registerGame('guess', {
    tileId: 'tile-guess',
    title: '🤔 حدس بزن <span class="en-sub">(Guess it)</span>',
    setupScreen: 'guessSetup',
    infoHtml: 'گوشی رو روی پیشونیت بگیر، صفحه رو به بقیه.<br><br>' +
      'بقیه باید با <b>توضیح دادن</b> کمکت کنن کلمه‌ای که رو صفحه‌ست رو حدس بزنی، بدون اینکه خود کلمه رو بگن.<br><br>' +
      'حدس زدی؟ گوشی رو به سمت پایین بچرخون. رد کردن کلمه؟ به سمت بالا بچرخون. دکمه‌های روی صفحه هم همیشه کار می‌کنن.'
  });

  document.getElementById('btn-guess-back-games').addEventListener('click', Juju.goToGames);

  // ---------- word bank ----------
  var WORD_BANK = {
    general: [
      'پیتزا','دوچرخه','هواپیما','دریا','کوه','مدرسه','دکتر','معلم','گیتار','توپ فوتبال',
      'عینک آفتابی','چتر','ساعت','کتاب','تلفن همراه','یخچال','جارو برقی','آینه','کفش','کلاه',
      'ماهی','پروانه','عنکبوت','مورچه','صندلی چرخدار','بادکنک','آتش‌بازی','جشن تولد','عروسی',
      'دانشگاه','بیمارستان','فرودگاه','ایستگاه قطار','رستوران','کافه','سینما','باشگاه ورزشی',
      'استخر','پارک','باغ وحش','کتابخانه','موزه','برج ایفل','پل خواجو','هرم مصر','صحرا','جنگل',
      'رودخانه','آبشار','غار','آتشفشان','رنگین‌کمان','برف','باران','رعد و برق','زلزله',
      'دندان‌پزشک','آرایشگر','نجار','نقاش','خیاط','کشاورز','خلبان','آشپز','وکیل','پلیس','آتش‌نشان'
    ],
    celebrities: [
      'حافظ','مولانا','فردوسی','سعدی','خیام','گوگوش','داریوش اقبالی','ابی','معین',
      'شادمهر عقیلی','مرتضی پاشایی','رضا عطاران','محمدرضا گلزار','بهرام رادان','نیکی کریمی',
      'گلشیفته فراهانی','مهناز افشار','پرویز پرستویی','عزت‌الله انتظامی','علی دایی',
      'کریم انصاری‌فرد','حسین رضازاده','کیانوش رستمی','سعید معروف','ابن‌سینا','زکریای رازی',
      'چارلی چاپلین','آلبرت انیشتین','مایکل جکسون','لیونل مسی','کریستیانو رونالدو'
    ],
    movies: [
      'جدایی نادر از سیمین','اخراجی‌ها','مارمولک','پایتخت','شهرزاد','نون خ','متری شیش و نیم',
      'برادران لیلا','ابد و یک روز','بادیگارد','قصه‌های مجید','تایتانیک','هری پاتر',
      'ارباب حلقه‌ها','بازی تاج و تخت','فرندز','شرک','مرد عنکبوتی','بتمن','آواتار','جوکر',
      'پدرخوانده','فارست گامپ'
    ]
  };

  var CATEGORIES = [
    { key:'general',     label:'عمومی' },
    { key:'celebrities', label:'افراد مشهور' },
    { key:'movies',      label:'فیلم و سریال' },
    { key:'mixed',       label:'🎲 ترکیبی' }
  ];

  var TIMER_OPTIONS = [30,45,60,90];

  function wordsForCategory(key){
    if(key === 'mixed'){
      return WORD_BANK.general.concat(WORD_BANK.celebrities, WORD_BANK.movies);
    }
    return WORD_BANK[key];
  }

  function categoryLabel(key){
    var found = CATEGORIES.filter(function(c){ return c.key === key; })[0];
    return found ? found.label : key;
  }

  // ---------- STATE ----------
  var state = {
    category: 'general',
    roundSeconds: 45,
    deck: [],
    deckPos: 0,
    currentWord: null,
    results: [], // { word, correct }
    timerRemaining: 0,
    timerHandle: null,
    flashTimeout: null
  };

  // ---------- ELEMENTS ----------
  var el = {
    categoryChips: document.getElementById('guess-category-chips'),
    timerChips: document.getElementById('guess-timer-chips'),
    btnStart: document.getElementById('btn-guess-start'),

    countdownNum: document.getElementById('guess-countdown-num'),

    playScreen: document.getElementById('screen-guess-play'),
    score: document.getElementById('guess-score'),
    clock: document.getElementById('guess-clock'),
    cardCategory: document.getElementById('guess-card-category'),
    cardWord: document.getElementById('guess-card-word'),
    btnCorrect: document.getElementById('btn-guess-correct'),
    btnSkip: document.getElementById('btn-guess-skip'),
    btnMute: document.getElementById('btn-guess-mute'),

    resultsHeading: document.getElementById('guess-results-heading'),
    resultList: document.getElementById('guess-result-list')
  };

  // ---------- setup: category + timer chips ----------
  function renderCategoryChips(){
    el.categoryChips.innerHTML = '';
    CATEGORIES.forEach(function(cat){
      var chip = document.createElement('div');
      chip.className = 'chip' + (cat.key === state.category ? ' active' : '');
      chip.textContent = cat.label;
      chip.addEventListener('click', function(){
        state.category = cat.key;
        renderCategoryChips();
      });
      el.categoryChips.appendChild(chip);
    });
  }

  function renderTimerChips(){
    el.timerChips.innerHTML = '';
    TIMER_OPTIONS.forEach(function(sec){
      var chip = document.createElement('div');
      chip.className = 'chip' + (sec === state.roundSeconds ? ' active' : '');
      chip.textContent = Juju.toFa(sec) + ' ثانیه';
      chip.addEventListener('click', function(){
        state.roundSeconds = sec;
        renderTimerChips();
      });
      el.timerChips.appendChild(chip);
    });
  }

  // ---------- deck ----------
  function buildDeck(){
    var words = wordsForCategory(state.category);
    var order = Juju.shuffledIndices(words.length);
    state.deck = order.map(function(i){ return words[i]; });
    state.deckPos = 0;
  }

  function nextWord(){
    if(state.deckPos >= state.deck.length){
      buildDeck(); // reshuffle and keep going if a round outlasts the word pool
    }
    state.currentWord = state.deck[state.deckPos++];
    el.cardWord.textContent = state.currentWord;
    el.cardCategory.textContent = categoryLabel(state.category);
  }

  // ---------- motion (tilt to answer) ----------
  // Calibrated once per round, not per word — otherwise the neutral point
  // drifts to wherever the phone happens to be right after a tilt, and the
  // gesture stops registering. A tilt only counts once the phone has swung
  // back through the neutral zone since the last one, so play is naturally
  // alternating: tilt down, back to center, tilt down again (or up to skip).
  var TILT_THRESHOLD = 35;
  var TILT_RESET_ZONE = TILT_THRESHOLD * 0.5;
  var orientationBaseline = null;
  var awaitingNeutral = false;
  var orientationActive = false;

  function handleOrientation(e){
    if(e.beta === null || e.beta === undefined) return;
    if(orientationBaseline === null){ orientationBaseline = e.beta; return; }
    var delta = e.beta - orientationBaseline;

    if(awaitingNeutral){
      if(Math.abs(delta) < TILT_RESET_ZONE) awaitingNeutral = false;
      return;
    }

    if(delta > TILT_THRESHOLD){
      awaitingNeutral = true;
      resolveWord(true);
    } else if(delta < -TILT_THRESHOLD){
      awaitingNeutral = true;
      resolveWord(false);
    }
  }

  function requestMotionPermission(){
    if(typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'){
      return DeviceOrientationEvent.requestPermission().then(function(res){ return res === 'granted'; }).catch(function(){ return false; });
    }
    return Promise.resolve(true);
  }

  function attachOrientation(){
    orientationBaseline = null;
    awaitingNeutral = false;
    orientationActive = true;
    window.addEventListener('deviceorientation', handleOrientation);
  }

  function detachOrientation(){
    orientationActive = false;
    window.removeEventListener('deviceorientation', handleOrientation);
  }

  document.addEventListener('juju:screenchange', function(e){
    if(e.detail.screen !== 'guessPlay' && orientationActive){
      detachOrientation();
    }
    if(e.detail.screen !== 'guessPlay'){
      clearInterval(state.timerHandle);
      stopBackgroundMusic();
    }
  });

  // ---------- background music (synthesized — no audio file, same approach as bomb.js's explosion sound) ----------
  var MUSIC_MUTED_KEY = 'juju-guess-music-muted';
  var musicMuted = localStorage.getItem(MUSIC_MUTED_KEY) === '1';
  var audioCtx = null;
  var music = null; // { osc1, osc2, lfo, tickHandle }

  function getAudioCtx(){
    if(!audioCtx){
      try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e){ audioCtx = null; }
    }
    if(audioCtx && audioCtx.state === 'suspended'){
      try{ audioCtx.resume(); }catch(e){}
    }
    return audioCtx;
  }

  function startBackgroundMusic(){
    if(musicMuted || music) return;
    var ctx = getAudioCtx();
    if(!ctx) return;

    // soft two-note drone (root + fifth) with a slow breathing volume swell
    var masterGain = ctx.createGain();
    masterGain.gain.value = 0.05;
    masterGain.connect(ctx.destination);

    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    lfo.start();

    var osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = 110; // A2
    var osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 110 * 1.5; // fifth above
    osc1.connect(masterGain);
    osc2.connect(masterGain);
    osc1.start();
    osc2.start();

    // gentle clock-tick pulse underneath, fitting a timed guessing game
    var tickHandle = setInterval(function(){
      var now = ctx.currentTime;
      var tOsc = ctx.createOscillator();
      tOsc.type = 'sine';
      tOsc.frequency.setValueAtTime(1200, now);
      var tGain = ctx.createGain();
      tGain.gain.setValueAtTime(0.05, now);
      tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      tOsc.connect(tGain); tGain.connect(ctx.destination);
      tOsc.start(now); tOsc.stop(now + 0.06);
    }, 600);

    music = { osc1: osc1, osc2: osc2, lfo: lfo, tickHandle: tickHandle };
  }

  function stopBackgroundMusic(){
    if(!music) return;
    try{ music.osc1.stop(); }catch(e){}
    try{ music.osc2.stop(); }catch(e){}
    try{ music.lfo.stop(); }catch(e){}
    clearInterval(music.tickHandle);
    music = null;
  }

  function updateMuteButton(){
    el.btnMute.textContent = musicMuted ? '🔇' : '🔊';
  }
  updateMuteButton();

  el.btnMute.addEventListener('click', function(){
    musicMuted = !musicMuted;
    localStorage.setItem(MUSIC_MUTED_KEY, musicMuted ? '1' : '0');
    updateMuteButton();
    if(musicMuted){
      stopBackgroundMusic();
    } else {
      startBackgroundMusic();
    }
  });

  // ---------- play flow ----------
  el.btnStart.addEventListener('click', function(){
    getAudioCtx(); // unlock audio now, while we still have a user gesture (Safari requirement)
    requestMotionPermission().then(function(){
      state.results = [];
      buildDeck();
      Juju.showScreen('guessCountdown');
      runCountdown(3);
    });
  });

  function runCountdown(n){
    if(n <= 0){
      startPlayRound();
      return;
    }
    el.countdownNum.textContent = Juju.toFa(n);
    setTimeout(function(){ runCountdown(n-1); }, 700);
  }

  function startPlayRound(){
    el.score.textContent = '✅ ۰';
    state.timerRemaining = state.roundSeconds;
    renderClock();
    nextWord();
    Juju.showScreen('guessPlay');
    attachOrientation();
    startTimer();
    startBackgroundMusic();
  }

  function renderClock(){
    var m = Math.floor(state.timerRemaining/60);
    var s = state.timerRemaining%60;
    el.clock.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  function startTimer(){
    clearInterval(state.timerHandle);
    state.timerHandle = setInterval(function(){
      if(state.timerRemaining > 0){
        state.timerRemaining--;
        renderClock();
      } else {
        endRound();
      }
    }, 1000);
  }

  function resolveWord(correct){
    state.results.push({ word: state.currentWord, correct: correct });

    el.playScreen.classList.remove('flash-correct','flash-skip');
    void el.playScreen.offsetWidth; // restart animation/transition cleanly
    el.playScreen.classList.add(correct ? 'flash-correct' : 'flash-skip');

    if(correct){
      var scoreCount = state.results.filter(function(r){ return r.correct; }).length;
      el.score.textContent = '✅ ' + Juju.toFa(scoreCount);
    }
    if(navigator.vibrate){ navigator.vibrate(correct ? 60 : [40,40,40]); }

    clearTimeout(state.flashTimeout);
    state.flashTimeout = setTimeout(function(){
      el.playScreen.classList.remove('flash-correct','flash-skip');
      nextWord();
    }, 320);
  }

  el.btnCorrect.addEventListener('click', function(){ resolveWord(true); });
  el.btnSkip.addEventListener('click', function(){ resolveWord(false); });

  document.getElementById('btn-guess-end-early').addEventListener('click', function(){
    endRound();
  });

  function endRound(){
    clearInterval(state.timerHandle);
    detachOrientation();
    stopBackgroundMusic();
    showResults();
  }

  // ---------- results ----------
  function showResults(){
    var correctCount = state.results.filter(function(r){ return r.correct; }).length;
    el.resultsHeading.textContent = Juju.toFa(correctCount) + ' از ' + Juju.toFa(state.results.length) + ' تا درست';
    el.resultList.innerHTML = '';
    state.results.forEach(function(r){
      var row = document.createElement('div');
      row.className = 'guess-result-row ' + (r.correct ? 'is-correct' : 'is-skipped');
      row.innerHTML = '<span>' + Juju.escapeHtml(r.word) + '</span><span class="tag">' + (r.correct ? '✅' : '⏭️') + '</span>';
      el.resultList.appendChild(row);
    });
    Juju.showScreen('guessResults');
  }

  document.getElementById('btn-guess-play-again').addEventListener('click', function(){
    state.results = [];
    buildDeck();
    Juju.showScreen('guessCountdown');
    runCountdown(3);
  });

  document.getElementById('btn-guess-back-setup').addEventListener('click', function(){
    Juju.showScreen('guessSetup');
  });

  // ---------- INIT ----------
  renderCategoryChips();
  renderTimerChips();
})();
