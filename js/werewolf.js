// "گرگ کیه؟" (Werewolf): role assignment + swipe-reveal (same mechanic as
// the imposter game), then a fully interactive, voice-narrated night/day
// cycle — the app plays the moderator: it announces each role's turn out
// loud (Persian text-to-speech), lets that role pick target(s) from an
// on-screen list of players, tracks who's alive, and crosses out
// eliminated players round after round until one side wins.
(function(){
  var Juju = window.Juju;

  Juju.registerScreen('werewolfSetup', document.getElementById('screen-werewolf-setup'));
  Juju.registerScreen('werewolfReveal', document.getElementById('screen-werewolf-reveal'));
  Juju.registerScreen('werewolfNight', document.getElementById('screen-werewolf-night'));

  Juju.registerGame('werewolf', {
    tileId: 'tile-werewolf',
    title: '🐺 گرگ کیه؟ <span class="en-sub">(Werewolf)</span>',
    setupScreen: 'werewolfSetup',
    infoHtml: 'هر بازیکن یک نقش مخفی داره: <b>گرگینه</b> یا <b>دهاتی</b>، به‌علاوه‌ی نقش‌های ویژه‌ای که انتخاب می‌کنی.<br><br>' +
      'بعد از دیدن نقش‌ها، یک صدا به فارسی راهنماییتون می‌کنه: هر شب هر نقش به نوبت بیدار می‌شه و از روی صفحه یک بازیکن رو انتخاب می‌کنه.<br><br>' +
      'روزها همه با هم گفتگو می‌کنن و رأی می‌دن کی از بازی بیرون بره. حذف‌شده‌ها روی لیست بازیکن‌ها خط می‌خورن تا یک طرف ببره.'
  });

  document.getElementById('btn-werewolf-back-games').addEventListener('click', function(){
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    Juju.goToGames();
  });

  // ---------- roles ----------
  var ROLES = [
    { key:'werewolf', label:'گرگینه', icon:'🐺', always:true, team:'wolf',
      revealWord:'گرگینه هستی 🐺', revealHint:'شب‌ها با بقیه گرگینه‌ها یک نفر رو شکار کن' },
    { key:'seer', label:'غیب‌گو', icon:'🔮', sub:'هر شب نقش یک نفر رو می‌بینه', team:'village',
      revealWord:'غیب‌گو هستی 🔮', revealHint:'هر شب می‌تونی نقش یک بازیکن رو ببینی' },
    { key:'witch', label:'ساحره', icon:'🧪', sub:'می‌تونه قربانی رو نجات بده یا یکی رو مسموم کنه', team:'village',
      revealWord:'ساحره هستی 🧪', revealHint:'هر شب می‌تونی قربانی گرگینه‌ها رو نجات بدی یا یک نفر رو مسموم کنی' },
    { key:'cupid', label:'کوپید', icon:'💘', sub:'فقط شب اول: دو نفر رو عاشق هم می‌کنه', team:'village',
      revealWord:'کوپیدی 💘', revealHint:'فقط شب اول: دو نفر رو به عنوان عاشق‌ها به هم وصل کن. اگه یکی بمیره، اون یکی هم می‌میره' },
    { key:'hunter', label:'شکارچی', icon:'🏹', sub:'اگه کشته بشه، یک نفر دیگه رو با خودش می‌بره', team:'village',
      revealWord:'شکارچی هستی 🏹', revealHint:'اگه کشته بشی، می‌تونی یک نفر دیگه رو هم با خودت ببری' },
    { key:'villager', label:'دهاتی', icon:'👤', always:true, filler:true, team:'village',
      revealWord:'دهاتی هستی 👤', revealHint:'شب‌ها بخواب. روزها با بقیه گفتگو کن و گرگینه رو پیدا کن' }
  ];
  var OPTIONAL_ROLES = ROLES.filter(function(r){ return !r.always; });
  var NIGHT_ORDER = ['cupid','werewolf','seer','witch']; // hunter has no active night step

  function roleByKey(key){
    return ROLES.filter(function(r){ return r.key === key; })[0];
  }

  function wakeInstruction(roleKey){
    return {
      cupid: 'دو نفر رو به عنوان عاشق‌های هم انتخاب کن.',
      werewolf: 'یک نفر رو برای شکار انتخاب کنید.',
      seer: 'یک نفر رو انتخاب کن تا نقشش رو ببینی.',
      witch: 'می‌تونی قربانی امشب رو نجات بدی، یکی رو مسموم کنی، یا کاری نکنی.'
    }[roleKey] || '';
  }

  function pickerTitle(purpose){
    return {
      cupid: 'دو نفر رو به عنوان عاشق انتخاب کن',
      'wolf-kill': 'یک نفر رو برای شکار انتخاب کنید',
      'seer-check': 'یک نفر رو انتخاب کن',
      'witch-poison': 'کی رو مسموم می‌کنی؟',
      'day-vote': 'کی رو بیرون می‌کنید؟'
    }[purpose] || 'انتخاب کن';
  }

  // ---------- STATE ----------
  var state = {
    players: 8,
    wolves: 2,
    activeRoles: {},
    roles: [],          // assigned for the whole game: [{ name, roleKey, img }]
    revealOrder: [],
    currentReveal: 0,

    alive: [],           // bool per player index
    lovers: null,        // [idxA, idxB] or null
    isFirstNight: true,
    nightVictim: null,
    witchSaved: false,
    witchPoisonTarget: null,
    seerTarget: null,
    lastVoteDeaths: [],

    steps: [],
    stepIndex: 0,
    pickSelection: []
  };
  OPTIONAL_ROLES.forEach(function(r){ state.activeRoles[r.key] = false; });

  function maxWolves(players){
    return Math.max(1, Math.floor(players/4));
  }
  function activeOptionalCount(){
    return OPTIONAL_ROLES.filter(function(r){ return state.activeRoles[r.key]; }).length;
  }
  function freeSlots(){
    return state.players - state.wolves - activeOptionalCount();
  }
  function clampRoles(){
    for(var i=OPTIONAL_ROLES.length-1; i>=0 && freeSlots() < 0; i--){
      state.activeRoles[OPTIONAL_ROLES[i].key] = false;
    }
  }

  // ---------- ELEMENTS ----------
  var el = {
    valPlayers: document.getElementById('ww-val-players'),
    valWolves: document.getElementById('ww-val-wolves'),
    roleList: document.getElementById('ww-role-list'),
    slotsNote: document.getElementById('ww-slots-note'),
    btnStart: document.getElementById('btn-werewolf-start'),

    revealPlayerName: document.getElementById('ww-reveal-player-name'),
    progressDots: document.getElementById('ww-progress-dots'),
    revealCard: document.getElementById('ww-reveal-card'),
    cardBack: document.getElementById('ww-card-back'),
    cardFront: document.getElementById('ww-card-front'),
    cardFrontImg: document.querySelector('#ww-card-front .card-front-img'),
    roleWord: document.getElementById('ww-role-word'),
    roleHint: document.getElementById('ww-role-hint'),
    btnNextPlayer: document.getElementById('btn-ww-next-player'),

    playerStrip: document.getElementById('ww-player-strip'),
    btnMute: document.getElementById('btn-ww-mute'),
    narrationPanel: document.getElementById('ww-narration-panel'),
    nightIcon: document.getElementById('ww-night-icon'),
    nightTitle: document.getElementById('ww-night-title'),
    nightText: document.getElementById('ww-night-text'),
    pickerPanel: document.getElementById('ww-picker-panel'),
    pickerTitleEl: document.getElementById('ww-picker-title'),
    pickerGrid: document.getElementById('ww-picker-grid'),
    witchChoice: document.getElementById('ww-witch-choice'),
    btnNext: document.getElementById('btn-ww-night-next'),
    btnConfirm: document.getElementById('btn-ww-confirm-pick'),
    nightDayActions: document.getElementById('ww-night-day-actions'),
    btnNextNight: document.getElementById('btn-ww-next-night')
  };

  // ---------- voice (Persian text-to-speech) ----------
  var VOICE_MUTED_KEY = 'juju-ww-voice-muted';
  var voiceMuted = localStorage.getItem(VOICE_MUTED_KEY) === '1';

  function speak(text){
    if(voiceMuted || !('speechSynthesis' in window)) return;
    try{
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'fa-IR';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }catch(e){}
  }

  function updateMuteButton(){
    el.btnMute.textContent = voiceMuted ? '🔇' : '🔊';
  }
  updateMuteButton();

  el.btnMute.addEventListener('click', function(){
    voiceMuted = !voiceMuted;
    localStorage.setItem(VOICE_MUTED_KEY, voiceMuted ? '1' : '0');
    updateMuteButton();
    if(voiceMuted && window.speechSynthesis) window.speechSynthesis.cancel();
  });

  document.addEventListener('juju:screenchange', function(e){
    if(e.detail.screen !== 'werewolfNight' && window.speechSynthesis){
      window.speechSynthesis.cancel();
    }
  });

  // ---------- setup rendering ----------
  function renderPlayersVal(){
    el.valPlayers.textContent = state.players;
    if(state.wolves > maxWolves(state.players)) state.wolves = maxWolves(state.players);
    el.valWolves.textContent = state.wolves;
    clampRoles();
    renderRoleList();
  }

  document.getElementById('btn-ww-players-minus').addEventListener('click', function(){
    if(state.players > 5){ state.players--; renderPlayersVal(); }
  });
  document.getElementById('btn-ww-players-plus').addEventListener('click', function(){
    if(state.players < 20){ state.players++; renderPlayersVal(); }
  });
  document.getElementById('btn-ww-wolves-minus').addEventListener('click', function(){
    if(state.wolves > 1){ state.wolves--; renderPlayersVal(); }
  });
  document.getElementById('btn-ww-wolves-plus').addEventListener('click', function(){
    if(state.wolves < maxWolves(state.players) && freeSlots() > 0){ state.wolves++; renderPlayersVal(); }
  });

  function renderRoleList(){
    el.roleList.innerHTML = '';
    var slots = freeSlots();
    OPTIONAL_ROLES.forEach(function(role){
      var isOn = state.activeRoles[role.key];
      var canEnable = isOn || slots > 0;

      var row = document.createElement('div');
      row.className = 'row ww-role-row' + (canEnable ? '' : ' is-disabled');

      var left = document.createElement('div');
      left.innerHTML =
        '<div class="row-left"><span class="row-icon">' + role.icon + '</span><span class="row-label">' + role.label + '</span></div>' +
        '<div class="sub">' + role.sub + '</div>';

      var toggle = document.createElement('div');
      toggle.className = 'toggle' + (isOn ? ' on' : '');
      toggle.innerHTML = '<div class="dot"></div>';
      toggle.addEventListener('click', function(){
        if(!isOn && freeSlots() <= 0) return;
        state.activeRoles[role.key] = !isOn;
        renderRoleList();
      });

      row.appendChild(left);
      row.appendChild(toggle);
      el.roleList.appendChild(row);
    });

    var villagerCount = Math.max(0, freeSlots());
    el.slotsNote.textContent = 'گرگینه: ' + Juju.toFa(state.wolves) + ' · دهاتی: ' + Juju.toFa(villagerCount) +
      (freeSlots() <= 0 ? ' · جایی برای نقش بیشتر نیست' : '');
  }

  // ---------- role assignment ----------
  var PLAYER_IMAGES = ['Spieler1.png','Spieler2.png','Spieler3.png','Spieler4.png','Spieler5.png','Spieler6.png','Spieler7.png','Spieler8.png'];

  function assignPlayerImages(count){
    var pool = [];
    while(pool.length < count){
      var batch = PLAYER_IMAGES.slice();
      var order = Juju.shuffledIndices(batch.length);
      for(var i=0;i<order.length;i++) pool.push(batch[order[i]]);
    }
    return pool.slice(0, count);
  }

  function buildRoleDeck(){
    var deck = [];
    for(var w=0; w<state.wolves; w++) deck.push('werewolf');
    OPTIONAL_ROLES.forEach(function(role){
      if(state.activeRoles[role.key]) deck.push(role.key);
    });
    while(deck.length < state.players) deck.push('villager');
    return deck;
  }

  function assignRoles(){
    var deck = buildRoleDeck();
    var order = Juju.shuffledIndices(deck.length);
    var images = assignPlayerImages(state.players);
    state.roles = order.map(function(deckIdx, i){
      return { name:'بازیکن ' + Juju.toFa(i+1), roleKey: deck[deckIdx], img: images[i] };
    });
  }

  // ---------- START GAME ----------
  el.btnStart.addEventListener('click', function(){
    assignRoles();
    state.alive = state.roles.map(function(){ return true; });
    state.lovers = null;
    state.isFirstNight = true;
    state.revealOrder = Juju.shuffledIndices(state.roles.length);
    state.currentReveal = 0;
    startRevealFlow();
  });

  // ---------- REVEAL FLOW (same swipe mechanic as imposter.js) ----------
  function startRevealFlow(){
    renderProgressDots();
    showCurrentReveal();
    Juju.showScreen('werewolfReveal');
  }

  function renderProgressDots(){
    el.progressDots.innerHTML = '';
    for(var i=0;i<state.roles.length;i++){
      var dot = document.createElement('span');
      if(i < state.currentReveal) dot.className = 'done';
      else if(i === state.currentReveal) dot.className = 'current';
      el.progressDots.appendChild(dot);
    }
  }

  function currentEntry(){
    var idx = state.revealOrder[state.currentReveal];
    return state.roles[idx];
  }

  var revealedThisTurn = false;

  function resetCardPosition(){
    el.cardFront.classList.remove('snap-back');
    el.cardFront.style.transform = '';
  }

  function showCurrentReveal(){
    var entry = currentEntry();
    var role = roleByKey(entry.roleKey);
    el.revealPlayerName.textContent = entry.name;
    el.btnNextPlayer.disabled = true;
    el.btnNextPlayer.textContent = (state.currentReveal === state.roles.length-1) ? 'شروع شب' : 'بازیکن بعدی';

    revealedThisTurn = false;
    resetCardPosition();
    el.cardFrontImg.src = entry.img;

    el.cardBack.classList.remove('is-village','is-wolf','is-special');
    el.cardBack.classList.add(role.team === 'wolf' ? 'is-wolf' : (role.always ? 'is-village' : 'is-special'));

    el.roleWord.textContent = role.revealWord;
    el.roleHint.textContent = role.revealHint;
  }

  var drag = { active:false, startX:0, pointerId:null };
  var CARD_REVEAL_THRESHOLD = 90;

  el.cardFront.addEventListener('pointerdown', function(e){
    drag.active = true;
    drag.startX = e.clientX;
    drag.pointerId = e.pointerId;
    el.cardFront.classList.remove('snap-back');
    try{ el.cardFront.setPointerCapture(e.pointerId); }catch(err){}
  });

  el.cardFront.addEventListener('pointermove', function(e){
    if(!drag.active) return;
    var dx = e.clientX - drag.startX;
    if(dx < 0) dx = 0;
    var maxDx = el.revealCard.offsetWidth;
    if(dx > maxDx) dx = maxDx;
    var rotate = Math.min(dx / 14, 16);
    el.cardFront.style.transform = 'translateX(' + dx + 'px) rotate(' + rotate + 'deg)';
    if(!revealedThisTurn && dx > CARD_REVEAL_THRESHOLD){
      revealedThisTurn = true;
      el.btnNextPlayer.disabled = false;
    }
  });

  function endDrag(){
    if(!drag.active) return;
    drag.active = false;
    el.cardFront.classList.add('snap-back');
    el.cardFront.style.transform = 'translateX(0px) rotate(0deg)';
    if(drag.pointerId !== null){
      try{ el.cardFront.releasePointerCapture(drag.pointerId); }catch(err){}
    }
    drag.pointerId = null;
  }
  el.cardFront.addEventListener('pointerup', endDrag);
  el.cardFront.addEventListener('pointercancel', endDrag);

  el.btnNextPlayer.addEventListener('click', function(){
    if(el.btnNextPlayer.disabled) return;
    state.currentReveal++;
    if(state.currentReveal >= state.roles.length){
      startNightGuide();
    } else {
      renderProgressDots();
      showCurrentReveal();
    }
  });

  // ---------- player strip (alive/dead) ----------
  function renderPlayerStrip(){
    el.playerStrip.innerHTML = '';
    state.roles.forEach(function(r, i){
      var chip = document.createElement('div');
      chip.className = 'ww-player-chip' + (state.alive[i] ? '' : ' is-dead');
      chip.textContent = Juju.toFa(i+1);
      el.playerStrip.appendChild(chip);
    });
  }

  // ---------- death resolution ----------
  function killPlayer(idx, deaths){
    if(!state.alive[idx]) return;
    state.alive[idx] = false;
    deaths.push(idx);
    if(state.lovers && (state.lovers[0] === idx || state.lovers[1] === idx)){
      var partner = state.lovers[0] === idx ? state.lovers[1] : state.lovers[0];
      killPlayer(partner, deaths);
    }
  }

  function checkWinCondition(){
    var wolves = 0, others = 0;
    state.roles.forEach(function(r, i){
      if(!state.alive[i]) return;
      if(r.roleKey === 'werewolf') wolves++; else others++;
    });
    if(wolves === 0) return 'village';
    if(wolves >= others) return 'wolves';
    return null;
  }

  // ---------- NIGHT / DAY GUIDE ----------
  function buildNightSteps(){
    var steps = [{ type:'sleep-all' }];
    if(state.isFirstNight && state.activeRoles.cupid){
      steps.push({ type:'wake', role:'cupid' });
      steps.push({ type:'pick', role:'cupid', count:2, purpose:'cupid' });
      steps.push({ type:'sleep', role:'cupid' });
    }
    steps.push({ type:'wake', role:'werewolf' });
    steps.push({ type:'pick', role:'werewolf', count:1, purpose:'wolf-kill' });
    steps.push({ type:'sleep', role:'werewolf' });
    if(state.activeRoles.seer){
      steps.push({ type:'wake', role:'seer' });
      steps.push({ type:'pick', role:'seer', count:1, purpose:'seer-check' });
      steps.push({ type:'seer-result' });
      steps.push({ type:'sleep', role:'seer' });
    }
    if(state.activeRoles.witch){
      steps.push({ type:'wake', role:'witch' });
      steps.push({ type:'witch-choice' });
      steps.push({ type:'sleep', role:'witch' });
    }
    steps.push({ type:'day-announce' });
    steps.push({ type:'day-vote' });
    steps.push({ type:'day-result' });
    return steps;
  }

  function startNightGuide(){
    state.nightVictim = null;
    state.witchSaved = false;
    state.witchPoisonTarget = null;
    state.seerTarget = null;
    state.steps = buildNightSteps();
    state.stepIndex = 0;
    Juju.showScreen('werewolfNight');
    showStep();
  }

  function showNarration(icon, title, text, isDay){
    el.narrationPanel.style.display = '';
    el.nightIcon.textContent = icon;
    el.nightTitle.textContent = title;
    el.nightTitle.className = isDay ? 'ww-day-heading' : '';
    el.nightText.textContent = text;
  }

  function showStep(){
    var step = state.steps[state.stepIndex];
    if(!step) return;

    el.narrationPanel.style.display = 'none';
    el.pickerPanel.style.display = 'none';
    el.witchChoice.style.display = 'none';
    el.btnNext.style.display = 'none';
    el.btnConfirm.style.display = 'none';
    el.nightDayActions.style.display = 'none';
    el.btnNextNight.style.display = '';

    renderPlayerStrip();

    if(step.type === 'sleep-all'){
      var t0 = 'بازی شروع می‌شه. همه چشماشونو ببندن و بخوابن.';
      showNarration('🌙', 'همه چشماشونو ببندن', t0);
      speak(t0);
      el.btnNext.style.display = ''; el.btnNext.textContent = 'بعدی';

    } else if(step.type === 'wake'){
      var role = roleByKey(step.role);
      var instr = wakeInstruction(step.role);
      showNarration(role.icon, role.label + ' بیدار شه', instr);
      speak(role.label + '، بیدار شو. ' + instr);
      el.btnNext.style.display = ''; el.btnNext.textContent = 'بعدی';

    } else if(step.type === 'pick'){
      showPicker(pickerTitle(step.purpose), step.count, step.purpose);

    } else if(step.type === 'seer-result'){
      var seenRole = roleByKey(state.roles[state.seerTarget].roleKey);
      showNarration('🔮', 'نتیجه', 'بازیکن ' + Juju.toFa(state.seerTarget+1) + ': ' + seenRole.label);
      el.btnNext.style.display = ''; el.btnNext.textContent = 'باشه، بخوابه';

    } else if(step.type === 'witch-choice'){
      showNarration('🧪', 'ساحره', wakeInstruction('witch'));
      speak('ساحره، بیدار شو. ' + wakeInstruction('witch'));
      el.witchChoice.style.display = 'flex';

    } else if(step.type === 'sleep'){
      var role2 = roleByKey(step.role);
      var t2 = role2.label + '، چشماتو ببند و بخواب.';
      showNarration(role2.icon, role2.label + ' بخوابه', t2);
      speak(t2);
      el.btnNext.style.display = ''; el.btnNext.textContent = 'بعدی';

    } else if(step.type === 'day-announce'){
      resolveNightDeaths();

    } else if(step.type === 'day-vote'){
      speak('روز شد. با هم گفتگو کنید و رأی بدید کی از بازی بیرون بره.');
      showPicker('با هم گفتگو کنید؛ کی رو بیرون می‌کنید؟', 1, 'day-vote');

    } else if(step.type === 'day-result'){
      resolveDayVote();
    }
  }

  function advanceStep(){
    state.stepIndex++;
    showStep();
  }

  el.btnNext.addEventListener('click', advanceStep);

  document.getElementById('btn-ww-witch-save').addEventListener('click', function(){
    state.witchSaved = true;
    advanceStep();
  });
  document.getElementById('btn-ww-witch-skip').addEventListener('click', function(){
    advanceStep();
  });
  document.getElementById('btn-ww-witch-poison').addEventListener('click', function(){
    el.witchChoice.style.display = 'none';
    showPicker('کی رو مسموم می‌کنی؟', 1, 'witch-poison');
  });

  // ---------- picker (used by cupid/wolf-kill/seer/witch-poison/day-vote) ----------
  var currentPickPurpose = null;
  var currentPickCount = 1;

  function showPicker(title, count, purpose){
    currentPickPurpose = purpose;
    currentPickCount = count;
    state.pickSelection = [];
    el.pickerTitleEl.textContent = title;
    el.pickerPanel.style.display = '';
    el.btnConfirm.style.display = '';
    el.btnConfirm.disabled = true;
    renderPickerGrid();
  }

  function renderPickerGrid(){
    el.pickerGrid.innerHTML = '';
    state.roles.forEach(function(r, i){
      if(!state.alive[i]) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ww-picker-btn' + (state.pickSelection.indexOf(i) !== -1 ? ' selected' : '');
      btn.innerHTML = '<span class="row-icon">👤</span><span>بازیکن ' + Juju.toFa(i+1) + '</span>';
      btn.addEventListener('click', function(){
        var pos = state.pickSelection.indexOf(i);
        if(pos !== -1){
          state.pickSelection.splice(pos,1);
        } else {
          if(state.pickSelection.length >= currentPickCount) state.pickSelection.shift();
          state.pickSelection.push(i);
        }
        el.btnConfirm.disabled = state.pickSelection.length !== currentPickCount;
        renderPickerGrid();
      });
      el.pickerGrid.appendChild(btn);
    });
  }

  function confirmPick(){
    var selected = state.pickSelection.slice();
    el.pickerPanel.style.display = 'none';
    el.btnConfirm.style.display = 'none';

    if(currentPickPurpose === 'cupid'){
      state.lovers = selected;
    } else if(currentPickPurpose === 'wolf-kill'){
      state.nightVictim = selected[0];
    } else if(currentPickPurpose === 'seer-check'){
      state.seerTarget = selected[0];
    } else if(currentPickPurpose === 'witch-poison'){
      state.witchPoisonTarget = selected[0];
    } else if(currentPickPurpose === 'day-vote'){
      var deaths = [];
      killPlayer(selected[0], deaths);
      state.lastVoteDeaths = deaths;
    }
    advanceStep();
  }

  el.btnConfirm.addEventListener('click', function(){
    if(el.btnConfirm.disabled) return;
    confirmPick();
  });

  // ---------- day resolution ----------
  function resolveNightDeaths(){
    var deaths = [];
    if(state.nightVictim !== null && !state.witchSaved){
      killPlayer(state.nightVictim, deaths);
    }
    if(state.witchPoisonTarget !== null){
      killPlayer(state.witchPoisonTarget, deaths);
    }
    var text = deaths.length === 0
      ? 'دیشب هیچ‌کس نمرد. همه امن بودن.'
      : 'دیشب ' + deaths.map(function(i){ return 'بازیکن ' + Juju.toFa(i+1); }).join(' و ') +
        (deaths.length === 1 ? ' کشته شد.' : ' کشته شدن.');
    showNarration('☀️', 'روز شد', text, true);
    speak('روز شد. ' + text);
    renderPlayerStrip();

    var winner = checkWinCondition();
    if(winner){ showGameOver(winner); return; }
    el.btnNext.style.display = ''; el.btnNext.textContent = 'بعدی';
  }

  function resolveDayVote(){
    var deaths = state.lastVoteDeaths || [];
    var text = deaths.length === 0 ? 'کسی بیرون نرفت.' :
      'بازیکن ' + Juju.toFa(deaths[0]+1) + ' با رأی جمع از بازی بیرون رفت.' +
      (deaths.length > 1 ? ' چون عاشق بود، بازیکن ' + Juju.toFa(deaths[1]+1) + ' هم رفت.' : '');
    showNarration('🗳️', 'نتیجه رأی‌گیری', text, true);
    speak(text);
    renderPlayerStrip();

    var winner = checkWinCondition();
    if(winner){ showGameOver(winner); return; }
    el.nightDayActions.style.display = 'flex';
  }

  function showGameOver(winner){
    var text = winner === 'village' ? 'دهاتی‌ها بردن! 🎉' : 'گرگینه‌ها بردن! 🐺';
    showNarration(winner === 'village' ? '🎉' : '🐺', 'بازی تموم شد', text, true);
    speak('بازی تموم شد. ' + text);
    el.nightDayActions.style.display = 'flex';
    el.btnNextNight.style.display = 'none';
  }

  document.getElementById('btn-ww-next-night').addEventListener('click', function(){
    state.isFirstNight = false;
    startNightGuide();
  });

  document.getElementById('btn-ww-night-back').addEventListener('click', function(){
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    Juju.showScreen('werewolfSetup');
  });

  // ---------- INIT ----------
  renderPlayersVal();
})();
