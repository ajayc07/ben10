(function () {
  'use strict';

  var DATA = (typeof BEN10_DATA !== 'undefined') ? BEN10_DATA : [];

  var gameHub = document.getElementById('gameHub');
  var gameScreen = document.getElementById('gameScreen');
  var gameBack = document.getElementById('gameBack');
  var gameScoreEl = document.getElementById('gameScore');
  var gameContent = document.getElementById('gameContent');
  var gameFeedback = document.getElementById('gameFeedback');

  if (!gameHub || !gameScreen) return;

  var score = 0;
  var activeTimers = [];
  var PRAISE = ['Yay!', 'Awesome!', 'You got it!', 'Super!', 'Great job!', 'Woohoo!'];

  function setGameTimeout(fn, ms) {
    var id = setTimeout(fn, ms);
    activeTimers.push(id);
    return id;
  }

  function clearGameTimers() {
    activeTimers.forEach(function (id) { clearTimeout(id); });
    activeTimers = [];
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function speak(text) {
    if (window.Ben10Speak) { window.Ben10Speak(text); return; }
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.pitch = 1.3; u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch (err) { /* speech not available */ }
  }

  function playCorrect() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      [523.25, 659.25, 783.99].forEach(function (freq, i) {
        var osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.09;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.26);
      });
      setTimeout(function () { ctx.close(); }, 500);
    } catch (err) { /* audio not available */ }
  }

  function playWrong() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
      osc.onended = function () { ctx.close(); };
    } catch (err) { /* audio not available */ }
  }

  function updateScore() {
    gameScoreEl.textContent = '⭐ ' + score;
  }

  function showFeedback(good, text) {
    gameFeedback.classList.remove('show-good', 'show-bad');
    void gameFeedback.offsetWidth;
    gameFeedback.textContent = text;
    gameFeedback.classList.add(good ? 'show-good' : 'show-bad');
  }

  function handleCorrect() {
    score++;
    updateScore();
    playCorrect();
    showFeedback(true, PRAISE[randInt(0, PRAISE.length - 1)]);
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
  }

  function handleWrong() {
    playWrong();
    showFeedback(false, 'Try again!');
    if (navigator.vibrate) navigator.vibrate(60);
  }

  /* ================= Count the Aliens ================= */
  function countChoices(n) {
    var pool = [];
    [-2, -1, 1, 2].forEach(function (d) {
      var v = n + d;
      if (v >= 1 && v <= 20 && pool.indexOf(v) === -1) pool.push(v);
    });
    pool = shuffle(pool).slice(0, 2);
    while (pool.length < 2) {
      var v2 = randInt(1, 20);
      if (v2 !== n && pool.indexOf(v2) === -1) pool.push(v2);
    }
    return shuffle([n].concat(pool));
  }

  function nextCountRound() {
    clearGameTimers();
    var alien = DATA[randInt(0, DATA.length - 1)];
    var n = randInt(1, 20);
    var counted = 0;

    var tilesHtml = '';
    for (var i = 0; i < n; i++) {
      tilesHtml += '<div class="count-tile"><img src="' + alien.imageUrl + '" alt="' + alien.name + '"></div>';
    }
    var choicesHtml = countChoices(n).map(function (v) {
      return '<button class="choice-btn" data-value="' + v + '">' + v + '</button>';
    }).join('');

    gameContent.innerHTML =
      '<p class="game-prompt">Tap each alien, then pick how many there are!</p>' +
      '<div class="count-stage" id="countStage">' + tilesHtml + '</div>' +
      '<div class="choice-row" id="countChoices">' + choicesHtml + '</div>';

    document.getElementById('countStage').addEventListener('click', function (e) {
      var tile = e.target.closest('.count-tile');
      if (!tile || tile.classList.contains('counted')) return;
      counted++;
      tile.classList.add('counted');
      speak(String(counted));
    });

    document.getElementById('countChoices').addEventListener('click', function (e) {
      var btn = e.target.closest('.choice-btn');
      if (!btn) return;
      var val = parseInt(btn.dataset.value, 10);
      if (val === n) {
        btn.classList.add('correct');
        handleCorrect();
        setGameTimeout(nextCountRound, 1300);
      } else {
        btn.classList.add('wrong');
        handleWrong();
        setGameTimeout(function () { btn.classList.remove('wrong'); }, 400);
      }
    });
  }

  /* ================= Letter Match ================= */
  /* Pure letter-shape matching (no reading/spelling needed) — tap the
     letter tile that matches the big target letter. A matching alien
     is shown afterwards as a fun reward, not as part of the puzzle. */
  var LETTER_POOL = Array.from(new Set(DATA.map(function (a) { return a.name.charAt(0).toUpperCase(); })));

  function alienStartingWith(letter) {
    var matches = DATA.filter(function (a) { return a.name.charAt(0).toUpperCase() === letter; });
    return matches[randInt(0, matches.length - 1)];
  }

  function showLetterReward(letter, alien) {
    var reward = document.createElement('div');
    reward.className = 'letter-reward';
    reward.innerHTML =
      '<img src="' + alien.imageUrl + '" alt="' + alien.name + '">' +
      '<p>' + letter + ' is for ' + alien.name + '!</p>';
    gameContent.appendChild(reward);
    speak(letter + ' is for ' + alien.name + '!');
  }

  function nextLetterRound() {
    clearGameTimers();
    var target = LETTER_POOL[randInt(0, LETTER_POOL.length - 1)];
    var distractors = shuffle(LETTER_POOL.filter(function (l) { return l !== target; })).slice(0, 3);
    var options = shuffle([target].concat(distractors));

    var choicesHtml = options.map(function (l) {
      return '<button class="choice-btn" data-letter="' + l + '">' + l + '</button>';
    }).join('');

    gameContent.innerHTML =
      '<p class="game-prompt">Find the matching letter!</p>' +
      '<div class="big-letter" id="bigLetter">' + target + '</div>' +
      '<div class="choice-row" id="letterChoices">' + choicesHtml + '</div>';

    document.getElementById('bigLetter').addEventListener('click', function () {
      speak('Find the letter ' + target);
    });
    setGameTimeout(function () { speak('Find the letter ' + target); }, 300);

    document.getElementById('letterChoices').addEventListener('click', function (e) {
      var btn = e.target.closest('.choice-btn');
      if (!btn) return;
      if (btn.dataset.letter === target) {
        btn.classList.add('correct');
        handleCorrect();
        setGameTimeout(function () { showLetterReward(target, alienStartingWith(target)); }, 250);
        setGameTimeout(nextLetterRound, 2200);
      } else {
        btn.classList.add('wrong');
        handleWrong();
        setGameTimeout(function () { btn.classList.remove('wrong'); }, 400);
      }
    });
  }

  /* ================= Memory Match ================= */
  var MEMORY_PAIRS = 6;
  var memoryFirst = null;
  var memoryLock = false;
  var memoryMatched = 0;

  function startMemoryGame() {
    memoryFirst = null;
    memoryLock = false;
    memoryMatched = 0;

    var chosen = shuffle(DATA.slice()).slice(0, MEMORY_PAIRS);
    var deck = shuffle(chosen.concat(chosen));

    var cardsHtml = deck.map(function (a) {
      return '<div class="memory-card" data-id="' + a.id + '">' +
        '<div class="memory-card-inner">' +
          '<div class="memory-face back">🛸</div>' +
          '<div class="memory-face front"><img src="' + a.imageUrl + '" alt="' + a.name + '"></div>' +
        '</div>' +
      '</div>';
    }).join('');

    gameContent.innerHTML =
      '<p class="game-prompt">Find the matching pairs!</p>' +
      '<div class="memory-grid" id="memoryGrid">' + cardsHtml + '</div>' +
      '<p class="game-prompt" id="memoryProgress" style="font-size:16px;opacity:.8;">Pairs found: 0 / ' + MEMORY_PAIRS + '</p>';

    document.getElementById('memoryGrid').addEventListener('click', onMemoryCardClick);
  }

  function onMemoryCardClick(e) {
    var card = e.target.closest('.memory-card');
    if (!card || memoryLock) return;
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;

    card.classList.add('flipped');

    if (!memoryFirst) {
      memoryFirst = card;
      return;
    }

    var second = card;
    memoryLock = true;

    if (memoryFirst.dataset.id === second.dataset.id) {
      memoryFirst.classList.add('matched');
      second.classList.add('matched');
      memoryMatched++;
      var progressEl = document.getElementById('memoryProgress');
      if (progressEl) progressEl.textContent = 'Pairs found: ' + memoryMatched + ' / ' + MEMORY_PAIRS;
      handleCorrect();
      memoryFirst = null;
      memoryLock = false;
      if (memoryMatched === MEMORY_PAIRS) {
        setGameTimeout(function () { showFeedback(true, 'You found them all!'); speak('You found them all!'); }, 300);
      }
    } else {
      playWrong();
      setGameTimeout(function () {
        memoryFirst.classList.remove('flipped');
        second.classList.remove('flipped');
        memoryFirst = null;
        memoryLock = false;
      }, 800);
    }
  }

  /* ================= Spot the Odd One ================= */
  var ODD_GRID_SIZE = 6;

  function nextOddRound() {
    clearGameTimers();
    var two = shuffle(DATA.slice()).slice(0, 2);
    var base = two[0], odd = two[1];
    var oddIndex = randInt(0, ODD_GRID_SIZE - 1);

    var tilesHtml = '';
    for (var i = 0; i < ODD_GRID_SIZE; i++) {
      var a = (i === oddIndex) ? odd : base;
      tilesHtml += '<button class="odd-tile" data-odd="' + (i === oddIndex ? '1' : '0') + '"><img src="' + a.imageUrl + '" alt="' + a.name + '"></button>';
    }

    gameContent.innerHTML =
      '<p class="game-prompt">Which alien is different?</p>' +
      '<div class="odd-grid" id="oddGrid">' + tilesHtml + '</div>';

    document.getElementById('oddGrid').addEventListener('click', function (e) {
      var btn = e.target.closest('.odd-tile');
      if (!btn) return;
      if (btn.dataset.odd === '1') {
        btn.classList.add('correct');
        handleCorrect();
        setGameTimeout(nextOddRound, 1300);
      } else {
        btn.classList.add('wrong');
        handleWrong();
        setGameTimeout(function () { btn.classList.remove('wrong'); }, 400);
      }
    });
  }

  /* ================= Hub / navigation ================= */
  function startGame(key) {
    clearGameTimers();
    score = 0;
    updateScore();
    gameHub.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    gameContent.innerHTML = '';

    if (key === 'count') nextCountRound();
    else if (key === 'letter') nextLetterRound();
    else if (key === 'memory') startMemoryGame();
    else if (key === 'odd') nextOddRound();
  }

  function backToHub() {
    clearGameTimers();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    gameScreen.classList.add('hidden');
    gameHub.classList.remove('hidden');
    gameContent.innerHTML = '';
  }

  gameHub.addEventListener('click', function (e) {
    var card = e.target.closest('.game-card');
    if (!card) return;
    startGame(card.dataset.game);
  });

  gameBack.addEventListener('click', backToHub);

  window.Ben10Games = {
    onShow: function () {
      if (gameScreen.classList.contains('hidden')) return;
      backToHub();
    }
  };
})();
