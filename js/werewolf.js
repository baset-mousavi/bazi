// "گرگ کیه؟" (Werewolf): role assignment + swipe-reveal (same mechanic as
// the imposter game), plus a compact first-night guide that walks through
// whichever special roles were selected. Villager and Werewolf always play;
// everything else is opt-in per game, capped by player count.
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
      'شب‌ها همه چشماشونو می‌بندن و به ترتیب، هر نقش (طبق راهنمای داخل بازی) چشماشو باز می‌کنه و کارش رو انجام می‌ده.<br><br>' +
      'روزها همه با هم گفتگو می‌کنن و رأی می‌دن کی گرگینه‌ست. اگه همه‌ی گرگینه‌ها حذف بشن دهاتی‌ها می‌برن، اگه گرگینه‌ها به تعداد دهاتی‌ها یا بیشتر برسن، گرگینه‌ها می‌برن.'
  });

  document.getElementById('btn-werewolf-back-games').addEventListener('click', Juju.goToGames);

  // ---------- roles ----------
  // "order" also doubles as the first-night wake-up order (villager/hunter
  // have no active night step, so they're skipped when building the guide).
  var ROLES = [
    { key:'werewolf', label:'گرگینه', icon:'🐺', always:true, team:'wolf',
      revealWord:'گرگینه هستی 🐺', revealHint:'شب‌ها با بقیه گرگینه‌ها یک نفر رو شکار کن',
      night:{ title:'گرگینه‌ها', text:'گرگینه‌ها چشماشونو باز کنن، همدیگه رو بشناسن و یک نفر رو برای شکار انتخاب کنن.' } },
    { key:'seer', label:'غیب‌گو', icon:'🔮', sub:'هر شب نقش یک نفر رو می‌بینه', team:'village',
      revealWord:'غیب‌گو هستی 🔮', revealHint:'هر شب می‌تونی نقش یک بازیکن رو ببینی',
      night:{ title:'غیب‌گو', text:'غیب‌گو چشماشو باز کنه و به یک نفر اشاره کنه تا نقشش رو بفهمه.' } },
    { key:'witch', label:'جادوگر', icon:'🧪', sub:'یک معجون درمان و یک معجون سم، هرکدوم یک‌بار', team:'village',
      revealWord:'جادوگر هستی 🧪', revealHint:'یک معجون درمان و یک معجون سم داری؛ هرکدوم فقط یک‌بار',
      night:{ title:'جادوگر', text:'جادوگر چشماشو باز کنه؛ می‌تونه قربانی گرگینه‌ها رو نجات بده یا یک نفر رو مسموم کنه.' } },
    { key:'bodyguard', label:'محافظ', icon:'🛡️', sub:'هر شب یک نفر رو از حمله محافظت می‌کنه', team:'village',
      revealWord:'محافظ هستی 🛡️', revealHint:'هر شب یک نفر رو از حمله‌ی گرگینه‌ها محافظت کن (نه همون نفر پشت سر هم)',
      night:{ title:'محافظ', text:'محافظ چشماشو باز کنه و یک نفر رو برای محافظت امشب انتخاب کنه.' } },
    { key:'cupid', label:'کوپید', icon:'💘', sub:'فقط شب اول: دو نفر رو عاشق هم می‌کنه', team:'village',
      revealWord:'کوپیدی 💘', revealHint:'فقط شب اول: دو نفر رو به عنوان عاشق‌ها به هم وصل کن. اگه یکی بمیره، اون یکی هم می‌میره',
      night:{ title:'کوپید', text:'کوپید چشماشو باز کنه و دو نفر رو به عنوان عاشق‌ها به هم وصل کنه.', firstNightOnly:true } },
    { key:'hunter', label:'شکارچی', icon:'🏹', sub:'اگه کشته بشه، یک نفر دیگه رو با خودش می‌بره', team:'village',
      revealWord:'شکارچی هستی 🏹', revealHint:'اگه کشته بشی، می‌تونی یک نفر دیگه رو هم با خودت ببری' },
    { key:'villager', label:'دهاتی', icon:'👤', always:true, filler:true, team:'village',
      revealWord:'دهاتی هستی 👤', revealHint:'شب‌ها بخواب. روزها با بقیه گفتگو کن و گرگینه رو پیدا کن' }
  ];
  var OPTIONAL_ROLES = ROLES.filter(function(r){ return !r.always; });
  var NIGHT_ORDER = ['cupid','werewolf','seer','witch','bodyguard'];

  function roleByKey(key){
    return ROLES.filter(function(r){ return r.key === key; })[0];
  }

  // ---------- STATE ----------
  var state = {
    players: 8,
    wolves: 2,
    activeRoles: {}, // key -> bool, for OPTIONAL_ROLES only
    names: [],
    roles: [],       // assigned this game: [{ name, roleKey, img }]
    revealOrder: [],
    currentReveal: 0,
    nightSteps: [],
    nightStep: 0,
    isFirstNight: true
  };
  OPTIONAL_ROLES.forEach(function(r){ state.activeRoles[r.key] = false; });

  function maxWolves(players){
    return Math.max(1, Math.floor(players/4));
  }

  function activeOptionalCount(){
    return OPTIONAL_ROLES.filter(function(r){ return state.activeRoles[r.key]; }).length;
  }

  // players not covered by wolves + selected special roles become plain villagers
  function freeSlots(){
    return state.players - state.wolves - activeOptionalCount();
  }

  // if players/wolves shrink below what's currently selected, drop roles
  // (last-added-first) until it fits again
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

    nightIcon: document.getElementById('ww-night-icon'),
    nightTitle: document.getElementById('ww-night-title'),
    nightText: document.getElementById('ww-night-text'),
    btnNightNext: document.getElementById('btn-ww-night-next'),
    nightDayActions: document.getElementById('ww-night-day-actions')
  };

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
        if(!isOn && freeSlots() <= 0) return; // no room left
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
      return {
        name: 'بازیکن ' + Juju.toFa(i+1),
        roleKey: deck[deckIdx],
        img: images[i]
      };
    });
  }

  // ---------- START GAME ----------
  el.btnStart.addEventListener('click', function(){
    assignRoles();
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
      state.isFirstNight = true;
      startNightGuide();
    } else {
      renderProgressDots();
      showCurrentReveal();
    }
  });

  // ---------- NIGHT GUIDE ----------
  function buildNightSteps(){
    var steps = [{ type:'intro' }];
    NIGHT_ORDER.forEach(function(key){
      var role = roleByKey(key);
      if(key !== 'werewolf' && !state.activeRoles[key]) return;
      if(role.night && role.night.firstNightOnly && !state.isFirstNight) return;
      steps.push({ type:'role', role: key });
    });
    steps.push({ type:'day' });
    return steps;
  }

  function startNightGuide(){
    state.nightSteps = buildNightSteps();
    state.nightStep = 0;
    showNightStep();
    Juju.showScreen('werewolfNight');
  }

  function showNightStep(){
    var step = state.nightSteps[state.nightStep];
    el.nightDayActions.style.display = 'none';
    el.btnNightNext.style.display = '';

    if(step.type === 'intro'){
      el.nightIcon.textContent = '🌙';
      el.nightTitle.textContent = 'همه چشماشونو ببندن';
      el.nightText.textContent = 'شب شد. همه‌ی بازیکن‌ها چشماشونو می‌بندن تا نقش‌های ویژه به نوبت بیدار بشن.';
      el.btnNightNext.textContent = 'بعدی';
    } else if(step.type === 'role'){
      var role = roleByKey(step.role);
      el.nightIcon.textContent = role.icon;
      el.nightTitle.textContent = role.label + ' بیدار شه';
      el.nightText.textContent = role.night.text;
      el.btnNightNext.textContent = 'کارش تموم شد، بخوابه';
    } else { // day
      el.nightIcon.textContent = '☀️';
      el.nightTitle.textContent = 'روز شد';
      el.nightText.textContent = 'همه چشماشونو باز کنن. حالا با هم گفتگو کنید و رأی بدید کی گرگینه‌ست.';
      el.btnNightNext.style.display = 'none';
      el.nightDayActions.style.display = 'flex';
    }
  }

  el.btnNightNext.addEventListener('click', function(){
    state.nightStep++;
    showNightStep();
  });

  document.getElementById('btn-ww-next-night').addEventListener('click', function(){
    state.isFirstNight = false;
    startNightGuide();
  });

  document.getElementById('btn-ww-night-back').addEventListener('click', function(){
    Juju.showScreen('werewolfSetup');
  });

  // ---------- INIT ----------
  renderPlayersVal();
})();
