(function () {
  'use strict';

  var STAT_DEFS = [
    { key: 'intelligence', label: 'Smarts',   icon: '🧠', a: '#3ec6ff', b: '#1a7fd1' },
    { key: 'strength',     label: 'Strength', icon: '💪', a: '#ff5d8f', b: '#d1206a' },
    { key: 'speed',        label: 'Speed',    icon: '⚡', a: '#ffe14d', b: '#e0a800' },
    { key: 'durability',   label: 'Tough',    icon: '🛡️', a: '#b27dff', b: '#7a3fe0' },
    { key: 'power',        label: 'Power',    icon: '🔥', a: '#39ff6a', b: '#0a7a35' },
    { key: 'combat',       label: 'Combat',   icon: '🥊', a: '#ff9f1c', b: '#c96f00' }
  ];

  var cardContainer = document.getElementById('cardContainer');
  var alienCount = document.getElementById('alienCount');
  var modeToggle = document.getElementById('modeToggle');
  var explorePanel = document.getElementById('explorePanel');
  var gamesPanel = document.getElementById('gamesPanel');
  var modalOverlay = document.getElementById('modalOverlay');
  var modalCard = document.getElementById('modalCard');
  var modalClose = document.getElementById('modalClose');
  var modalImg = document.getElementById('modalImg');
  var modalName = document.getElementById('modalName');
  var modalSpecies = document.getElementById('modalSpecies');
  var modalPrev = document.getElementById('modalPrev');
  var modalNext = document.getElementById('modalNext');
  var statList = document.getElementById('statList');
  var particlesEl = document.getElementById('particles');
  var heroTime = document.getElementById('heroTime');
  var flashOverlay = document.getElementById('flashOverlay');

  var DATA = (typeof BEN10_DATA !== 'undefined') ? BEN10_DATA : [];
  var RENDERED = []; // [{ alien, card }] in DOM order, for swipe/arrow navigation

  function buildCard(alien, index) {
    var card = document.createElement('article');
    card.className = 'alien-card';
    card.style.setProperty('--i', index);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'View ' + alien.name);
    card.dataset.id = alien.id;
    card.dataset.name = alien.name.toLowerCase();
    card.dataset.species = alien.species.toLowerCase();

    var miniStats = [
      { icon: '💪', v: alien.strength },
      { icon: '⚡', v: alien.speed },
      { icon: '🔥', v: alien.power }
    ].map(function (s) {
      return '<span>' + s.icon + ' ' + s.v + '</span>';
    }).join('');

    card.innerHTML =
      '<div class="thumb-wrap"><img src="' + alien.imageUrl + '" alt="' + alien.name + '" loading="lazy"></div>' +
      '<div class="card-body">' +
        '<h3 class="alien-name">' + alien.name + '</h3>' +
        '<p class="alien-species">' + alien.species + '</p>' +
        '<div class="mini-stats">' + miniStats + '</div>' +
      '</div>';

    card.addEventListener('click', function () { selectCard(card, alien); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectCard(card, alien);
      }
    });

    return card;
  }

  function selectCard(card, alien) {
    card.classList.remove('charging');
    void card.offsetWidth;
    card.classList.add('charging');
    card.addEventListener('animationend', function handler() {
      card.classList.remove('charging');
      card.removeEventListener('animationend', handler);
    });

    if (navigator.vibrate) navigator.vibrate([25, 30, 60]);

    openModal(alien, card);
  }

  function renderCards() {
    var frag = document.createDocumentFragment();
    DATA.forEach(function (alien, i) {
      var card = buildCard(alien, i);
      RENDERED.push({ alien: alien, card: card });
      frag.appendChild(card);
    });
    cardContainer.appendChild(frag);
  }

  function getVisibleList() {
    return RENDERED;
  }

  /* ---------------- Mode toggle (Explore / Games) ---------------- */
  modeToggle.addEventListener('click', function (e) {
    var btn = e.target.closest('.toggle-btn');
    if (!btn) return;
    var mode = btn.dataset.mode;

    modeToggle.querySelectorAll('.toggle-btn').forEach(function (b) {
      var active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    modeToggle.classList.toggle('second-active', mode === 'games');

    explorePanel.classList.toggle('hidden', mode !== 'explore');
    gamesPanel.classList.toggle('hidden', mode !== 'games');

    if (mode === 'games' && window.Ben10Games) window.Ben10Games.onShow();
  });

  /* ---------------- Full screen ---------------- */
  var fullscreenBtn = document.getElementById('fullscreenBtn');

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function requestFullscreen(el) {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  }

  function exitFullscreen() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  }

  fullscreenBtn.addEventListener('click', function () {
    if (isFullscreen()) exitFullscreen();
    else requestFullscreen(document.documentElement);
  });

  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (evt) {
    document.addEventListener(evt, function () {
      fullscreenBtn.classList.toggle('active', isFullscreen());
      fullscreenBtn.textContent = isFullscreen() ? '⛝' : '⛶';
    });
  });

  /* ---------------- Transformation modal ---------------- */
  var lastFocused = null;

  function spawnParticles() {
    particlesEl.innerHTML = '';
    var n = 14;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('span');
      p.className = 'particle';
      var angle = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      var dist = 70 + Math.random() * 50;
      p.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      p.style.setProperty('--dy', (Math.sin(angle) * dist).toFixed(1) + 'px');
      p.style.animationDelay = (Math.random() * 120) + 'ms';
      particlesEl.appendChild(p);
    }
  }

  function buildStats(alien) {
    statList.innerHTML = STAT_DEFS.map(function (def) {
      return (
        '<div class="stat-row">' +
          '<span class="stat-label">' + def.icon + ' ' + def.label + '</span>' +
          '<span class="stat-track"><span class="stat-fill" data-target="' + alien[def.key] + '" ' +
            'style="--bar-color-a:' + def.a + ';--bar-color-b:' + def.b + '"></span></span>' +
          '<span class="stat-value">' + alien[def.key] + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function animateStats() {
    var fills = statList.querySelectorAll('.stat-fill');
    fills.forEach(function (fill, i) {
      var target = fill.dataset.target;
      setTimeout(function () {
        fill.style.width = target + '%';
      }, 300 + i * 90);
    });
  }

  /* Drop a real Omnitrix transformation sound at this path and it will be used
     automatically; if it's missing or fails to load, a synthesized tone plays instead. */
  var TRANSFORM_SOUND_SRC = 'audio/omnitrix-select.mp3';
  var transformAudioEl = new Audio(TRANSFORM_SOUND_SRC);
  transformAudioEl.preload = 'auto';
  var customAudioFailed = false;
  transformAudioEl.addEventListener('error', function () { customAudioFailed = true; });

  function playSynthPowerUp() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      osc.onended = function () { ctx.close(); };
    } catch (err) { /* audio not available, ignore */ }
  }

  function playPowerUpSound() {
    if (!customAudioFailed) {
      try {
        transformAudioEl.currentTime = 0;
        var playPromise = transformAudioEl.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch(function () { playSynthPowerUp(); });
        }
        return;
      } catch (err) { /* fall through to synth */ }
    }
    playSynthPowerUp();
  }

  /* ---------------- Voice (auto-picked, no UI) ---------------- */
  function englishVoices() {
    if (!('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
  }

  function getSelectedVoice() {
    var voices = englishVoices();
    if (!voices.length) return null;
    var enUS = voices.find(function (v) { return /en-US/i.test(v.lang); });
    return enUS || voices[0];
  }

  function speakAlienName(name) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(name);
      utter.pitch = 1.3;
      utter.rate = 0.95;
      utter.volume = 1;
      var voice = getSelectedVoice();
      if (voice) utter.voice = voice;
      window.speechSynthesis.speak(utter);
    } catch (err) { /* speech not available, ignore */ }
  }

  var currentAlienId = null;

  function revealAlien(alien, cardEl, dirClass) {
    currentAlienId = alien.id;

    var originRect = (cardEl || modalCard).getBoundingClientRect();
    var ox = ((originRect.left + originRect.width / 2) / window.innerWidth * 100).toFixed(1) + '%';
    var oy = ((originRect.top + originRect.height / 2) / window.innerHeight * 100).toFixed(1) + '%';
    flashOverlay.style.setProperty('--ox', ox);
    flashOverlay.style.setProperty('--oy', oy);

    modalImg.src = alien.imageUrl;
    modalImg.alt = alien.name;
    modalImg.classList.remove('landed', 'dir-next', 'dir-prev');
    void modalImg.offsetWidth;
    if (dirClass) modalImg.classList.add(dirClass);
    modalImg.classList.add('landed');

    modalName.textContent = alien.name;
    modalName.style.animation = 'none';
    void modalName.offsetWidth;
    modalName.style.animation = '';

    modalSpecies.textContent = alien.species;
    buildStats(alien);

    heroTime.style.animation = 'none';
    void heroTime.offsetWidth;
    heroTime.style.animation = '';

    flashOverlay.classList.remove('active');
    void flashOverlay.offsetWidth;
    flashOverlay.classList.add('active');

    playPowerUpSound();
    setTimeout(function () { speakAlienName(alien.name); }, 300);

    spawnParticles();
    animateStats();
  }

  function navigate(direction) {
    var list = getVisibleList();
    if (list.length < 2) return;
    var idx = list.findIndex(function (item) { return item.alien.id === currentAlienId; });
    if (idx === -1) idx = 0;
    var nextIdx = (idx + direction + list.length) % list.length;
    var next = list[nextIdx];
    if (navigator.vibrate) navigator.vibrate(20);
    revealAlien(next.alien, next.card, direction > 0 ? 'dir-next' : 'dir-prev');
  }

  function openModal(alien, cardEl) {
    lastFocused = document.activeElement;
    revealAlien(alien, cardEl);

    modalOverlay.classList.remove('hidden');
    requestAnimationFrame(function () {
      modalOverlay.classList.add('open');
    });

    document.addEventListener('keydown', onKeydown);
  }

  function closeModal() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    modalOverlay.classList.remove('open');
    setTimeout(function () {
      modalOverlay.classList.add('hidden');
      statList.querySelectorAll('.stat-fill').forEach(function (f) { f.style.width = '0%'; });
      modalImg.classList.remove('landed', 'dir-next', 'dir-prev');
    }, 300);
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused) lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') closeModal();
    else if (e.key === 'ArrowRight') navigate(1);
    else if (e.key === 'ArrowLeft') navigate(-1);
  }

  /* ---------------- Swipe gesture (mobile) ---------------- */
  var touchStartX = 0, touchStartY = 0, touchActive = false;
  var SWIPE_THRESHOLD = 45;
  var SWIPE_RESTRAINT = 90;

  modalOverlay.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchActive = true;
  }, { passive: true });

  modalOverlay.addEventListener('touchend', function (e) {
    if (!touchActive) return;
    touchActive = false;
    var touch = e.changedTouches[0];
    var dx = touch.clientX - touchStartX;
    var dy = touch.clientY - touchStartY;
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dy) <= SWIPE_RESTRAINT) {
      navigate(dx < 0 ? 1 : -1);
    }
  }, { passive: true });

  modalPrev.addEventListener('click', function (e) { e.stopPropagation(); navigate(-1); });
  modalNext.addEventListener('click', function (e) { e.stopPropagation(); navigate(1); });

  modalName.addEventListener('click', function () {
    speakAlienName(modalName.textContent);
  });

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });
  modalCard.addEventListener('click', function (e) { e.stopPropagation(); });

  /* ---------------- Init ---------------- */
  renderCards();
  alienCount.textContent = DATA.length + ' Aliens Unlocked!';

  window.Ben10Speak = speakAlienName;
})();
