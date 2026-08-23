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
    card: document.getElementById('guess-card'),
    cardCategory: document.getElementById('guess-card-category'),
    cardWord: document.getElementById('guess-card-word'),
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
  var TILT_THRESHOLD = 30;
  var TILT_RESET_ZONE = TILT_THRESHOLD * 0.5;
  var STABILITY_WINDOW_MS = 1500;   // phone must sit still this long before we trust "neutral"
  var STABILITY_TOLERANCE = 4;      // degrees of wobble still considered "still"
  var CALIBRATION_TIMEOUT_MS = 4000; // safety net if the phone never settles (or has no sensor)
  var orientationBaseline = null;
  var stabilityBuffer = [];
  var calibrationDeadline = 0;
  var onCalibrated = null;
  var awaitingNeutral = false;
  var orientationActive = false;

  // beta/gamma are always relative to the DEVICE, not the screen. In
  // portrait, "tilt forward/back" is beta. Once the screen is rotated to
  // landscape (which is exactly what this game forces), that same physical
  // motion shows up on gamma instead, with a sign that depends on which way
  // the rotation went — this is the standard remap for that.
  function getScreenAngle(){
    if(screen.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle;
    if(typeof window.orientation === 'number') return window.orientation;
    return 0;
  }

  function getTiltReading(e){
    var angle = getScreenAngle();
    if(angle === 90) return -e.gamma;
    if(angle === -90 || angle === 270) return e.gamma;
    if(angle === 180) return -e.beta;
    return e.beta;
  }

  function tryLockBaseline(value){
    var now = Date.now();
    stabilityBuffer.push({ t: now, value: value });
    // Keep at least one entry old enough to still span the window — trimming
    // down to "<= window" before checking would make the span requirement
    // nearly impossible to ever satisfy.
    while(stabilityBuffer.length > 1 && now - stabilityBuffer[1].t >= STABILITY_WINDOW_MS){
      stabilityBuffer.shift();
    }
    var spanned = (now - stabilityBuffer[0].t) >= STABILITY_WINDOW_MS;
    var pastDeadline = now >= calibrationDeadline;

    if(spanned){
      var values = stabilityBuffer.map(function(p){ return p.value; });
      var range = Math.max.apply(null, values) - Math.min.apply(null, values);
      if(range <= STABILITY_TOLERANCE || pastDeadline){
        orientationBaseline = values.reduce(function(s,v){ return s+v; }, 0) / values.length;
      }
    } else if(pastDeadline){
      // never got a clean stable window (no sensor, denied permission, etc.) — use whatever we have
      orientationBaseline = value;
    }

    if(orientationBaseline !== null && onCalibrated){
      var cb = onCalibrated;
      onCalibrated = null;
      cb();
    }
  }

  function handleOrientation(e){
    var value = getTiltReading(e);
    if(value === null || value === undefined) return;

    if(orientationBaseline === null){
      tryLockBaseline(value);
      return;
    }
    var delta = value - orientationBaseline;

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

  function attachOrientation(onReady){
    orientationBaseline = null;
    stabilityBuffer = [];
    calibrationDeadline = Date.now() + CALIBRATION_TIMEOUT_MS;
    onCalibrated = onReady || null;
    awaitingNeutral = false;
    orientationActive = true;
    window.addEventListener('deviceorientation', handleOrientation);
  }

  function detachOrientation(){
    orientationActive = false;
    onCalibrated = null;
    window.removeEventListener('deviceorientation', handleOrientation);
  }

  // ---------- force landscape ----------
  // screen.orientation.lock() only works while the page is fullscreen, and
  // only on browsers that support it at all (no iOS Safari) — so this is
  // best-effort. The CSS orientation:portrait fallback (rotate-hint) still
  // covers everyone this doesn't work for.
  function requestLandscape(){
    var docEl = document.documentElement;
    var requestFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    var fsPromise = Promise.resolve();
    if(requestFs && !document.fullscreenElement){
      try{ fsPromise = requestFs.call(docEl).catch(function(){}); }catch(e){}
    }
    return fsPromise.then(function(){
      if(screen.orientation && screen.orientation.lock){
        return screen.orientation.lock('landscape').catch(function(){});
      }
    }).catch(function(){});
  }

  function releaseLandscape(){
    try{ if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); }catch(e){}
    if(document.fullscreenElement){
      var exitFs = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
      if(exitFs){ try{ exitFs.call(document).catch(function(){}); }catch(e){} }
    }
  }

  document.addEventListener('juju:screenchange', function(e){
    if(e.detail.screen !== 'guessPlay' && orientationActive){
      detachOrientation();
    }
    if(e.detail.screen !== 'guessPlay'){
      clearInterval(state.timerHandle);
      stopBackgroundMusic();
    }
    if(e.detail.screen !== 'guessPlay' && e.detail.screen !== 'guessCountdown'){
      releaseLandscape();
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

  // Persian-flavored modal scale ("Hijaz" / Phrygian-dominant — root, b2, 3,
  // 4, 5, b6, b7), rooted at D3. Fully synthesized, no samples or licensed
  // audio — a santur-like plucked motif over a low drone, plus a daf/tombak-
  // style dom/tak percussion pattern.
  var SCALE_SEMITONES = [0,1,4,5,7,8,10];
  var ROOT_FREQ = 146.83; // D3

  function scaleFreq(degree, octave){
    var idx = ((degree % SCALE_SEMITONES.length) + SCALE_SEMITONES.length) % SCALE_SEMITONES.length;
    return ROOT_FREQ * Math.pow(2, (SCALE_SEMITONES[idx] + 12*(octave||0)) / 12);
  }

  function pluckNote(ctx, freq, when, level){
    var osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq * 4;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(level, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.5);
    osc.connect(filter); filter.connect(g); g.connect(ctx.destination);
    osc.start(when); osc.stop(when + 0.55);
  }

  function percHit(ctx, kind, when){
    if(kind === 'dom'){ // low resonant thump
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, when);
      osc.frequency.exponentialRampToValueAtTime(45, when + 0.15);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.16, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.22);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(when); osc.stop(when + 0.22);
    } else { // crisp "tak" — filtered noise burst
      var bufSize = Math.floor(ctx.sampleRate * 0.05);
      var buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for(var i=0;i<bufSize;i++){ data[i] = (Math.random()*2-1) * Math.pow(1 - i/bufSize, 2); }
      var noise = ctx.createBufferSource();
      noise.buffer = buf;
      var filt = ctx.createBiquadFilter();
      filt.type = 'highpass';
      filt.frequency.value = 2500;
      var g2 = ctx.createGain();
      g2.gain.value = 0.07;
      noise.connect(filt); filt.connect(g2); g2.connect(ctx.destination);
      noise.start(when);
    }
  }

  function startBackgroundMusic(){
    if(musicMuted || music) return;
    var ctx = getAudioCtx();
    if(!ctx) return;

    // low drone: root + fifth, with a slow breathing volume swell
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
    osc1.frequency.value = scaleFreq(0, -1); // D2
    var osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = scaleFreq(4, -1); // A2, fifth above
    osc1.connect(masterGain);
    osc2.connect(masterGain);
    osc1.start();
    osc2.start();

    // repeating santur-like melodic phrase, one octave above the drone
    var MELODY_PATTERN = [0,2,1,3,2,4,3,2];
    var melodyStep = 0;
    var melodyHandle = setInterval(function(){
      var degree = MELODY_PATTERN[melodyStep % MELODY_PATTERN.length];
      melodyStep++;
      pluckNote(ctx, scaleFreq(degree, 1), ctx.currentTime, 0.06);
    }, 450);

    // daf/tombak-style dom/tak rhythm, twice the melody's speed
    var PERC_PATTERN = ['dom','tak','tak','dom','tak','dom','tak','tak'];
    var percStep = 0;
    var percHandle = setInterval(function(){
      var kind = PERC_PATTERN[percStep % PERC_PATTERN.length];
      percStep++;
      percHit(ctx, kind, ctx.currentTime);
    }, 225);

    music = { osc1: osc1, osc2: osc2, lfo: lfo, melodyHandle: melodyHandle, percHandle: percHandle };
  }

  function stopBackgroundMusic(){
    if(!music) return;
    try{ music.osc1.stop(); }catch(e){}
    try{ music.osc2.stop(); }catch(e){}
    try{ music.lfo.stop(); }catch(e){}
    clearInterval(music.melodyHandle);
    clearInterval(music.percHandle);
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
    requestLandscape();
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
    el.card.classList.add('is-calibrating');
    Juju.showScreen('guessPlay');
    attachOrientation(function(){
      el.card.classList.remove('is-calibrating');
      nextWord();
      startTimer();
      startBackgroundMusic();
    });
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
    getAudioCtx();
    requestLandscape();
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
