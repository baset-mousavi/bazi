// Bomb ("بمب") game: category/fuse setup, ticking bomb, explosion.
(function(){
  var Juju = window.Juju;

  Juju.registerScreen('bombSetup', document.getElementById('screen-bomb-setup'));
  Juju.registerScreen('bombPlay', document.getElementById('screen-bomb-play'));

  Juju.registerGame('bomb', {
    tileId: 'tile-bomb',
    title: '💣 بمب <span class="en-sub">(Bomb)</span>',
    setupScreen: 'bombSetup',
    showInfo: false,
    infoHtml: 'یک دسته‌بندی و طول فیوز انتخاب کن و بازی را شروع کن.<br><br>' +
      'گوشی دست به دست می‌چرخد؛ هر نفر باید سریع یک <b>کلمه‌ی مرتبط با دسته</b> بگوید و گوشی را به نفر بعدی بدهد.<br><br>' +
      'هیچ‌کس نمی‌داند بمب کِی می‌ترکد! هر کس موقع ترکیدن گوشی دستش باشد، بازنده‌ی آن دور است.'
  });

  document.getElementById('btn-bomb-back-games').addEventListener('click', Juju.goToGames);

  var BOMB_RANDOM = '🎲 تصادفی';
  var BOMB_CATEGORIES = ['حیوانات','میوه‌ها','رنگ‌ها','کشورها','شهرهای ایران','ورزش‌ها','غذاها','خواننده‌ها','فیلم‌ها','مشاغل','اسم پسر','اسم دختر','لوازم خانه','فوتبالیست‌ها'];
  var BOMB_FUSES = [
    { key:'short',  label:'کوتاه',    min:12, max:22 },
    { key:'medium', label:'متوسط',    min:25, max:45 },
    { key:'long',   label:'طولانی',   min:40, max:70 }
  ];
  var bombState = {
    category: BOMB_RANDOM,
    fuseKey: 'medium',
    timeoutHandle: null
  };

  var el = {
    categoryChips: document.getElementById('bomb-category-chips'),
    fuseChips: document.getElementById('bomb-fuse-chips'),
    card: document.getElementById('bomb-card'),
    armed: document.getElementById('bomb-armed'),
    exploded: document.getElementById('bomb-exploded'),
    categoryValue: document.getElementById('bomb-category-value')
  };

  // stop a ticking bomb if the player navigates away from the play screen
  document.addEventListener('juju:screenchange', function(e){
    if(e.detail.screen !== 'bombPlay') clearTimeout(bombState.timeoutHandle);
  });

  function renderBombCategoryChips(){
    el.categoryChips.innerHTML = '';
    var options = [BOMB_RANDOM].concat(BOMB_CATEGORIES);
    options.forEach(function(cat){
      var chip = document.createElement('div');
      chip.className = 'chip' + (cat === bombState.category ? ' active' : '');
      chip.textContent = cat;
      chip.addEventListener('click', function(){
        bombState.category = cat;
        renderBombCategoryChips();
      });
      el.categoryChips.appendChild(chip);
    });
  }

  function renderBombFuseChips(){
    el.fuseChips.innerHTML = '';
    BOMB_FUSES.forEach(function(fuse){
      var chip = document.createElement('div');
      chip.className = 'chip' + (fuse.key === bombState.fuseKey ? ' active' : '');
      chip.textContent = fuse.label;
      chip.addEventListener('click', function(){
        bombState.fuseKey = fuse.key;
        renderBombFuseChips();
      });
      el.fuseChips.appendChild(chip);
    });
  }

  function currentBombFuse(){
    var found = BOMB_FUSES.filter(function(f){ return f.key === bombState.fuseKey; })[0];
    return found || BOMB_FUSES[1];
  }

  // ---------- explosion sound (synthesized, no audio file needed) ----------
  var audioCtx = null;
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

  function playExplosionSound(){
    var ctx = getAudioCtx();
    if(!ctx) return;
    var now = ctx.currentTime;

    // noise burst -> the sharp "crack" that fades into rumble
    var bufferSize = Math.floor(ctx.sampleRate * 1.3);
    var noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++){
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.6);
    }
    var noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    var noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(4500, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(70, now + 1.1);

    var noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // sub-bass thump -> the "boom" you feel
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.45);

    var oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(1, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    // quick metallic crack layer for extra punch
    var crack = ctx.createOscillator();
    crack.type = 'square';
    crack.frequency.setValueAtTime(900, now);
    crack.frequency.exponentialRampToValueAtTime(90, now + 0.12);
    var crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.35, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    crack.connect(crackGain);
    crackGain.connect(ctx.destination);

    noise.start(now); noise.stop(now + 1.3);
    osc.start(now); osc.stop(now + 0.65);
    crack.start(now); crack.stop(now + 0.15);
  }

  function startBombRound(){
    getAudioCtx(); // unlock audio now, while we still have a user gesture

    var displayCategory = (bombState.category === BOMB_RANDOM)
      ? BOMB_CATEGORIES[Math.floor(Math.random() * BOMB_CATEGORIES.length)]
      : bombState.category;
    el.categoryValue.textContent = displayCategory;
    el.armed.style.display = '';
    el.exploded.style.display = 'none';
    el.card.classList.remove('boom');
    document.getElementById('btn-bomb-again').style.display = 'none';
    Juju.showScreen('bombPlay');

    var fuse = currentBombFuse();
    var duration = (Math.random() * (fuse.max - fuse.min) + fuse.min) * 1000;
    clearTimeout(bombState.timeoutHandle);
    bombState.timeoutHandle = setTimeout(explodeBomb, duration);
  }

  function explodeBomb(){
    el.armed.style.display = 'none';
    el.exploded.style.display = '';
    el.card.classList.add('boom');
    document.getElementById('btn-bomb-again').style.display = 'flex';
    playExplosionSound();
    if(navigator.vibrate){ navigator.vibrate([200,80,200,80,400]); }
  }

  document.getElementById('btn-bomb-start').addEventListener('click', startBombRound);
  document.getElementById('btn-bomb-again').addEventListener('click', startBombRound);
  document.getElementById('btn-bomb-back-setup').addEventListener('click', function(){
    clearTimeout(bombState.timeoutHandle);
    Juju.showScreen('bombSetup');
  });

  // ---------- INIT ----------
  renderBombCategoryChips();
  renderBombFuseChips();
})();
