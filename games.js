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

  /* Names whatever he actually tapped, then re-asks the question, so a
     wrong guess always tells him what he touched instead of just "no". */
  function speakOopsThenRepeat(wrongLabel, repeatText) {
    speak('Oops, that’s ' + wrongLabel + '!');
    setGameTimeout(function () { speak(repeatText); }, 1500);
  }

  /* ================= Count the Aliens ================= */
  /* Numeral choices must stay within what he can actually read (1-10) —
     counting objects aloud past 10 is fine, but a numeral answer he
     can't recognize would make the multiple-choice unsolvable. */
  var COUNT_MAX = 10;

  function countChoices(n) {
    var pool = [];
    [-2, -1, 1, 2].forEach(function (d) {
      var v = n + d;
      if (v >= 1 && v <= COUNT_MAX && pool.indexOf(v) === -1) pool.push(v);
    });
    pool = shuffle(pool).slice(0, 2);
    while (pool.length < 2) {
      var v2 = randInt(1, COUNT_MAX);
      if (v2 !== n && pool.indexOf(v2) === -1) pool.push(v2);
    }
    return shuffle([n].concat(pool));
  }

  function nextCountRound() {
    clearGameTimers();
    var alien = DATA[randInt(0, DATA.length - 1)];
    var n = randInt(1, COUNT_MAX);
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

    var askPhrase = 'How many aliens are there?';
    setGameTimeout(function () { speak(askPhrase); }, 300);

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
        clearGameTimers();
        btn.classList.add('correct');
        handleCorrect();
        setGameTimeout(nextCountRound, 1300);
      } else {
        btn.classList.add('wrong');
        handleWrong();
        setGameTimeout(function () { btn.classList.remove('wrong'); }, 400);
        speakOopsThenRepeat(val, askPhrase);
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

    /* Question is the capital he already knows; choices are the matching
       lowercase letters — this is how he starts learning lowercase, by
       anchoring each one to the capital form he can already recognize.
       Uses choice-btn-lc instead of the display font, which only has
       true uppercase glyphs (a typed lowercase "a" renders as a small
       "A" in it). */
    var choicesHtml = options.map(function (l) {
      return '<button class="choice-btn choice-btn-lc" data-letter="' + l + '">' + l.toLowerCase() + '</button>';
    }).join('');

    gameContent.innerHTML =
      '<p class="game-prompt">Find the matching letter!</p>' +
      '<div class="big-symbol" id="bigLetter">' + target + '</div>' +
      '<div class="choice-row" id="letterChoices">' + choicesHtml + '</div>';

    var askPhrase = 'Find the letter ' + target;
    document.getElementById('bigLetter').addEventListener('click', function () {
      speak(askPhrase);
    });
    setGameTimeout(function () { speak(askPhrase); }, 300);

    document.getElementById('letterChoices').addEventListener('click', function (e) {
      var btn = e.target.closest('.choice-btn');
      if (!btn) return;
      if (btn.dataset.letter === target) {
        clearGameTimers();
        btn.classList.add('correct');
        handleCorrect();
        setGameTimeout(function () { showLetterReward(target, alienStartingWith(target)); }, 250);
        setGameTimeout(nextLetterRound, 2200);
      } else {
        btn.classList.add('wrong');
        handleWrong();
        setGameTimeout(function () { btn.classList.remove('wrong'); }, 400);
        speakOopsThenRepeat(btn.dataset.letter, askPhrase);
      }
    });
  }

  /* ================= Letter Sounds (phonics recognition) ================= */
  /* Says the alien's name AND its starting letter up front — asking him
     to work out the letter from the sound alone was too hard, so this
     is now a listen-and-find match: hear "Rath starts with W, find W!",
     then tap W among the choices. The alien link still gets reinforced
     by repetition, just without requiring him to infer it himself. */
  function nextSoundRound() {
    clearGameTimers();
    var alien = DATA[randInt(0, DATA.length - 1)];
    var target = alien.name.charAt(0).toUpperCase();
    var distractors = shuffle(LETTER_POOL.filter(function (l) { return l !== target; })).slice(0, 3);
    var options = shuffle([target].concat(distractors));

    var choicesHtml = options.map(function (l) {
      return '<button class="choice-btn" data-letter="' + l + '">' + l + '</button>';
    }).join('');

    gameContent.innerHTML =
      '<p class="game-prompt">Listen, then tap the letter it starts with!</p>' +
      '<div class="sound-alien" id="soundAlien">' +
        '<img src="' + alien.imageUrl + '" alt="' + alien.name + '">' +
        '<span class="sound-replay" aria-label="Play sound again">🔊</span>' +
      '</div>' +
      '<div class="choice-row" id="soundChoices">' + choicesHtml + '</div>';

    var askPhrase = alien.name + ' starts with ' + target + '. Find ' + target + '!';
    document.getElementById('soundAlien').addEventListener('click', function () {
      speak(askPhrase);
    });
    setGameTimeout(function () { speak(askPhrase); }, 300);

    document.getElementById('soundChoices').addEventListener('click', function (e) {
      var btn = e.target.closest('.choice-btn');
      if (!btn) return;

      if (btn.dataset.letter === target) {
        clearGameTimers();
        btn.classList.add('correct');
        handleCorrect();
        setGameTimeout(function () { speak('Yes! ' + target + '!'); }, 150);
        setGameTimeout(nextSoundRound, 2200);
      } else {
        btn.classList.add('wrong');
        handleWrong();
        setGameTimeout(function () { btn.classList.remove('wrong'); }, 400);
        speakOopsThenRepeat(btn.dataset.letter, askPhrase);
      }
    });
  }

  /* ================= Number Recognize (10-20) ================= */
  /* He already recognizes numerals 1-10; this drills the next range he
     hasn't learned yet, the same shape-matching way as Letter Match. */
  var NUMBER_MIN = 10;
  var NUMBER_MAX = 20;

  function showNumberReward(n) {
    var alien = DATA[randInt(0, DATA.length - 1)];
    var tilesHtml = '';
    for (var i = 0; i < n; i++) {
      tilesHtml += '<div class="count-tile"><img src="' + alien.imageUrl + '" alt="' + alien.name + '"></div>';
    }
    var reward = document.createElement('div');
    reward.className = 'number-reward';
    reward.innerHTML = '<div class="count-stage">' + tilesHtml + '</div><p>' + n + ' aliens!</p>';
    gameContent.appendChild(reward);
    speak(n + ' aliens!');
  }

  function nextNumberRound() {
    clearGameTimers();
    var target = randInt(NUMBER_MIN, NUMBER_MAX);
    var pool = [];
    for (var v = NUMBER_MIN; v <= NUMBER_MAX; v++) { if (v !== target) pool.push(v); }
    var options = shuffle([target].concat(shuffle(pool).slice(0, 3)));

    var choicesHtml = options.map(function (v) {
      return '<button class="choice-btn" data-value="' + v + '">' + v + '</button>';
    }).join('');

    gameContent.innerHTML =
      '<p class="game-prompt">Listen, then tap the number!</p>' +
      '<div class="big-symbol" id="bigNumber" aria-label="Play the number">🔊</div>' +
      '<div class="choice-row" id="numberChoices">' + choicesHtml + '</div>';

    var askPhrase = 'Find the number ' + target;
    document.getElementById('bigNumber').addEventListener('click', function () {
      speak(askPhrase);
    });
    setGameTimeout(function () { speak(askPhrase); }, 300);

    document.getElementById('numberChoices').addEventListener('click', function (e) {
      var btn = e.target.closest('.choice-btn');
      if (!btn) return;
      var val = parseInt(btn.dataset.value, 10);
      if (val === target) {
        clearGameTimers();
        btn.classList.add('correct');
        handleCorrect();
        setGameTimeout(function () { showNumberReward(target); }, 250);
        setGameTimeout(nextNumberRound, 2400);
      } else {
        btn.classList.add('wrong');
        handleWrong();
        setGameTimeout(function () { btn.classList.remove('wrong'); }, 400);
        speakOopsThenRepeat(val, askPhrase);
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
      clearGameTimers();
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
      var firstAlien = DATA.find(function (a) { return a.id === memoryFirst.dataset.id; });
      var secondAlien = DATA.find(function (a) { return a.id === second.dataset.id; });
      if (firstAlien && secondAlien) {
        speak('Oops, ' + firstAlien.name + ' and ' + secondAlien.name + ' don’t match!');
        setGameTimeout(function () { speak('Find the matching pairs!'); }, 1500);
      }
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
      tilesHtml += '<button class="odd-tile" data-odd="' + (i === oddIndex ? '1' : '0') + '" data-name="' + a.name + '"><img src="' + a.imageUrl + '" alt="' + a.name + '"></button>';
    }

    gameContent.innerHTML =
      '<p class="game-prompt">Which alien is different?</p>' +
      '<div class="odd-grid" id="oddGrid">' + tilesHtml + '</div>';

    var askPhrase = 'Which one is different?';
    setGameTimeout(function () { speak(askPhrase); }, 300);

    document.getElementById('oddGrid').addEventListener('click', function (e) {
      var btn = e.target.closest('.odd-tile');
      if (!btn) return;
      if (btn.dataset.odd === '1') {
        clearGameTimers();
        btn.classList.add('correct');
        handleCorrect();
        setGameTimeout(nextOddRound, 1300);
      } else {
        btn.classList.add('wrong');
        handleWrong();
        setGameTimeout(function () { btn.classList.remove('wrong'); }, 400);
        speakOopsThenRepeat(btn.dataset.name, askPhrase);
      }
    });
  }

  /* ================= More or Less ================= */
  /* Two groups side by side; he taps the one with MORE (or LESS). Sizes
     always differ by at least 2 so the answer can be seen at a glance
     as well as counted, and stay within 1-10 like Count the Aliens. */
  var COMPARE_MAX = 10;

  function compareGroupHtml(side, alien, n) {
    var tiles = '';
    for (var i = 0; i < n; i++) {
      tiles += '<div class="count-tile"><img src="' + alien.imageUrl + '" alt="' + alien.name + '"></div>';
    }
    return '<button class="compare-group" data-side="' + side + '">' +
      '<div class="compare-tiles">' + tiles + '</div>' +
      '<span class="compare-count">' + n + '</span>' +
    '</button>';
  }

  function nextCompareRound() {
    clearGameTimers();
    var wantMore = Math.random() < 0.5;
    var word = wantMore ? 'more' : 'less';
    var counts = { left: randInt(1, COMPARE_MAX), right: 0 };
    do { counts.right = randInt(1, COMPARE_MAX); } while (Math.abs(counts.left - counts.right) < 2);
    var answer = (counts.left > counts.right) === wantMore ? 'left' : 'right';
    var aliens = shuffle(DATA.slice()).slice(0, 2);

    gameContent.innerHTML =
      '<p class="game-prompt">Which side has <span class="compare-word ' + word + '">' + word.toUpperCase() + '</span>?</p>' +
      '<div class="compare-row" id="compareRow">' +
        compareGroupHtml('left', aliens[0], counts.left) +
        '<span class="compare-vs">VS</span>' +
        compareGroupHtml('right', aliens[1], counts.right) +
      '</div>';

    var askPhrase = 'Which side has ' + word + ' aliens?';
    setGameTimeout(function () { speak(askPhrase); }, 300);

    var row = document.getElementById('compareRow');
    row.addEventListener('click', function (e) {
      var btn = e.target.closest('.compare-group');
      if (!btn || row.classList.contains('revealed')) return;
      var side = btn.dataset.side;
      var other = side === 'left' ? 'right' : 'left';
      if (side === answer) {
        clearGameTimers();
        row.classList.add('revealed');
        btn.classList.add('correct');
        handleCorrect();
        setGameTimeout(function () {
          speak('Yes! ' + counts[side] + ' is ' + word + ' than ' + counts[other] + '!');
        }, 150);
        setGameTimeout(nextCompareRound, 2600);
      } else {
        btn.classList.add('wrong');
        handleWrong();
        setGameTimeout(function () { btn.classList.remove('wrong'); }, 400);
        speak('Oops, that side has ' + counts[side] + '. That’s ' + (wantMore ? 'less' : 'more') + '!');
        setGameTimeout(function () { speak(askPhrase); }, 2000);
      }
    });
  }

  /* ================= Shared arrow + OK controls ================= */
  /* Arrow Quest, Omnitrix Dial and Find It! all use the same D-pad:
     keyboard arrows plus Enter/Space as "OK", mirrored by on-screen
     buttons (which also make them playable on a touch screen). Every
     press lights up its on-screen twin so he links the key, the arrow
     symbol and the word. */
  var HINT_MS = 7000;
  var DIRS = {
    up:    { dx: 0,  dy: -1, arrow: '⬆', label: 'UP' },
    left:  { dx: -1, dy: 0,  arrow: '⬅', label: 'LEFT' },
    ok:    { dx: 0,  dy: 0,  arrow: '✔', label: 'OK' },
    right: { dx: 1,  dy: 0,  arrow: '➡', label: 'RIGHT' },
    down:  { dx: 0,  dy: 1,  arrow: '⬇', label: 'DOWN' }
  };
  var KEY_TO_DIR = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    Enter: 'ok', ' ': 'ok'
  };
  var keyAction = null; // current game's handler: 'up' | 'down' | 'left' | 'right' | 'ok'
  var hintTimer = null;

  document.addEventListener('keydown', function (e) {
    var dir = KEY_TO_DIR[e.key];
    if (!dir || !keyAction) return;
    // Panel hidden (switched to Explore) — leave the keys alone.
    if (gameScreen.offsetParent === null) return;
    e.preventDefault();
    if (e.repeat) return; // one press = one step, so he has to press again
    flashDpadBtn(dir, 'pressed');
    keyAction(dir);
  });

  function dpadHtml(keys) {
    return '<div class="dpad" id="dpad">' + keys.map(function (k) {
      return '<button class="dpad-btn dpad-' + k + '" data-dir="' + k + '" aria-label="' + DIRS[k].label + '">' +
        '<span class="dpad-arrow">' + DIRS[k].arrow + '</span>' +
        '<span class="dpad-label">' + DIRS[k].label + '</span>' +
      '</button>';
    }).join('') + '</div>';
  }

  /* Call after rendering a dpadHtml(); `action` receives each press. */
  function useControls(action) {
    keyAction = action;
    // A still-focused button would also react to Enter/Space.
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    document.getElementById('dpad').addEventListener('click', function (e) {
      var btn = e.target.closest('.dpad-btn');
      if (!btn || !keyAction) return;
      btn.blur();
      flashDpadBtn(btn.dataset.dir, 'pressed');
      keyAction(btn.dataset.dir);
    });
  }

  function stopControls() {
    keyAction = null;
    hintTimer = null;
  }

  function flashDpadBtn(dir, cls) {
    var btn = gameContent.querySelector('.dpad-btn[data-dir="' + dir + '"]');
    if (!btn) return;
    btn.classList.remove('pressed', 'hint');
    void btn.offsetWidth;
    btn.classList.add(cls);
  }

  /* After HINT_MS without a press, flash the button he needs next
     (from `nextDir()`) and say it. Call again on every press to reset. */
  function scheduleHint(nextDir) {
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setGameTimeout(function () {
      if (!keyAction) return;
      var dir = nextDir();
      flashDpadBtn(dir, 'hint');
      speak(dir === 'ok' ? 'Press OK!' : 'Try the ' + dir + ' arrow!');
      scheduleHint(nextDir);
    }, HINT_MS);
  }

  function stepToward(x, y, tx, ty) {
    if (tx > x) return 'right';
    if (tx < x) return 'left';
    if (ty > y) return 'down';
    if (ty < y) return 'up';
    return 'ok';
  }

  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
    playWrong();
    speak('Oops, that’s the wall!');
  }

  /* ================= Arrow Quest ================= */
  /* Move an alien around a grid with the arrows to reach the Omnitrix.
     Every move is spoken ("up!"). First rounds put the target in a
     straight line (one direction to learn at a time). */
  var ARROW_SIZE = 5;
  var ARROW_STRAIGHT_ROUNDS = 4;
  var arrowState = null;
  var arrowRounds = 0;

  function placeArrowPlayer() {
    var s = arrowState;
    s.player.style.transform = 'translate(' + (s.x * 100) + '%, ' + (s.y * 100) + '%)';
  }

  function arrowHintDir() {
    var s = arrowState;
    return stepToward(s.x, s.y, s.tx, s.ty);
  }

  function arrowMove(dir) {
    var s = arrowState;
    if (s.done || dir === 'ok') return;
    var d = DIRS[dir];
    var nx = s.x + d.dx, ny = s.y + d.dy;
    scheduleHint(arrowHintDir);

    if (nx < 0 || ny < 0 || nx >= ARROW_SIZE || ny >= ARROW_SIZE) {
      bump(s.player);
      return;
    }

    s.x = nx; s.y = ny;
    placeArrowPlayer();

    if (s.x === s.tx && s.y === s.ty) {
      s.done = true;
      clearGameTimers();
      document.getElementById('arrowTarget').classList.add('reached');
      handleCorrect();
      speak('You made it!');
      arrowRounds++;
      setGameTimeout(nextArrowRound, 1800);
    } else {
      speak(dir);
    }
  }

  function nextArrowRound() {
    clearGameTimers();
    var alien = DATA[randInt(0, DATA.length - 1)];
    var x = randInt(0, ARROW_SIZE - 1), y = randInt(0, ARROW_SIZE - 1);
    var tx, ty;
    do {
      if (arrowRounds < ARROW_STRAIGHT_ROUNDS) {
        // Same row or same column, so only one arrow is needed.
        if (Math.random() < 0.5) { tx = randInt(0, ARROW_SIZE - 1); ty = y; }
        else { tx = x; ty = randInt(0, ARROW_SIZE - 1); }
      } else {
        tx = randInt(0, ARROW_SIZE - 1); ty = randInt(0, ARROW_SIZE - 1);
      }
    } while (Math.abs(tx - x) + Math.abs(ty - y) < 2);

    var cells = '';
    for (var i = 0; i < ARROW_SIZE * ARROW_SIZE; i++) cells += '<div class="arrow-cell"></div>';

    gameContent.innerHTML =
      '<p class="game-prompt">Use the arrow keys to reach the Omnitrix!</p>' +
      '<div class="arrow-board" id="arrowBoard" style="--n:' + ARROW_SIZE + '">' +
        cells +
        '<div class="arrow-target" id="arrowTarget" style="transform:translate(' + (tx * 100) + '%, ' + (ty * 100) + '%)"><span></span></div>' +
        '<div class="arrow-player" id="arrowPlayer"><img src="' + alien.imageUrl + '" alt="' + alien.name + '"></div>' +
      '</div>' +
      dpadHtml(['up', 'left', 'right', 'down']);

    arrowState = {
      x: x, y: y, tx: tx, ty: ty, done: false,
      player: document.getElementById('arrowPlayer')
    };
    placeArrowPlayer();
    useControls(arrowMove);

    setGameTimeout(function () { speak('Help ' + alien.name + ' get to the Omnitrix!'); }, 300);
    scheduleHint(arrowHintDir);
  }

  /* ================= Omnitrix Dial ================= */
  /* Just like Ben's watch: turn the dial with LEFT / RIGHT until the
     alien shown on top is in the middle, then press OK to transform.
     Only two arrows plus OK, so it's the gentle intro to "select". */
  var DIAL_POOL = 6;
  var dialState = null;

  function dialAt(offset) {
    var s = dialState;
    var n = s.aliens.length;
    return s.aliens[((s.index + offset) % n + n) % n];
  }

  function renderDial(turn) {
    var html = '';
    for (var off = -2; off <= 2; off++) {
      var a = dialAt(off);
      html += '<div class="dial-slot dial-pos' + off + '"><img src="' + a.imageUrl + '" alt="' + a.name + '"></div>';
    }
    var track = document.getElementById('dialTrack');
    track.innerHTML = html;
    track.classList.remove('turn-left', 'turn-right');
    if (turn) {
      void track.offsetWidth;
      track.classList.add('turn-' + turn);
    }
  }

  /* Shortest way round the dial to the target. */
  function dialHintDir() {
    var s = dialState;
    var n = s.aliens.length;
    var fwd = ((s.target - s.index) % n + n) % n;
    if (fwd === 0) return 'ok';
    return fwd <= n - fwd ? 'right' : 'left';
  }

  function dialPress(dir) {
    var s = dialState;
    if (s.done) return;
    scheduleHint(dialHintDir);

    if (dir === 'up' || dir === 'down') {
      speak('Use left and right to turn the dial!');
      return;
    }
    if (dir === 'left' || dir === 'right') {
      s.index += dir === 'right' ? 1 : -1;
      renderDial(dir);
      speak(dialAt(0).name);
      return;
    }

    var picked = dialAt(0);
    var want = s.aliens[s.target];
    if (picked === want) {
      s.done = true;
      clearGameTimers();
      document.getElementById('dialFace').classList.add('transform');
      handleCorrect();
      speak('It’s hero time! ' + want.name + '!');
      setGameTimeout(nextDialRound, 2200);
    } else {
      handleWrong();
      speakOopsThenRepeat(picked.name, 'Find ' + want.name + '!');
    }
  }

  function nextDialRound() {
    clearGameTimers();
    var aliens = shuffle(DATA.slice()).slice(0, DIAL_POOL);
    var target = randInt(1, DIAL_POOL - 1); // never already in the middle
    dialState = { aliens: aliens, index: 0, target: target, done: false };
    var want = aliens[target];

    gameContent.innerHTML =
      '<p class="game-prompt">Turn the dial and press OK!</p>' +
      '<div class="dial-want" id="dialWant">' +
        '<img src="' + want.imageUrl + '" alt="' + want.name + '">' +
        '<span>' + want.name + '</span>' +
      '</div>' +
      '<div class="dial-face" id="dialFace">' +
        '<div class="dial-track" id="dialTrack"></div>' +
      '</div>' +
      dpadHtml(['up', 'left', 'ok', 'right', 'down']);

    renderDial(null);
    useControls(dialPress);

    var askPhrase = 'Find ' + want.name + '!';
    document.getElementById('dialWant').addEventListener('click', function () { speak(askPhrase); });
    setGameTimeout(function () { speak(askPhrase); }, 300);
    scheduleHint(dialHintDir);
  }

  /* ================= Find It! ================= */
  /* A 3x3 grid of letters or numbers (alternating rounds). Move the
     yellow box with the arrows, press OK on the one that was asked for.
     Uses symbols he already knows so the new skill is the steering. */
  var FIND_SIZE = 3;
  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  var NUMBERS_1_20 = Array.from({ length: 20 }, function (_, i) { return String(i + 1); });
  var findState = null;
  var findRounds = 0;

  function placeFindCursor() {
    var s = findState;
    s.cells.forEach(function (c, i) {
      c.classList.toggle('cursor', i === s.y * FIND_SIZE + s.x);
    });
  }

  function findHintDir() {
    var s = findState;
    return stepToward(s.x, s.y, s.tpos % FIND_SIZE, Math.floor(s.tpos / FIND_SIZE));
  }

  function findPress(dir) {
    var s = findState;
    if (s.done) return;
    scheduleHint(findHintDir);

    if (dir !== 'ok') {
      var d = DIRS[dir];
      var nx = s.x + d.dx, ny = s.y + d.dy;
      if (nx < 0 || ny < 0 || nx >= FIND_SIZE || ny >= FIND_SIZE) {
        bump(document.getElementById('findGrid'));
        return;
      }
      s.x = nx; s.y = ny;
      placeFindCursor();
      speak(dir);
      return;
    }

    var pos = s.y * FIND_SIZE + s.x;
    var cell = s.cells[pos];
    if (pos === s.tpos) {
      s.done = true;
      clearGameTimers();
      cell.classList.add('correct');
      handleCorrect();
      setGameTimeout(function () { speak('Yes! ' + s.items[pos] + '!'); }, 150);
      findRounds++;
      setGameTimeout(nextFindRound, 1800);
    } else {
      cell.classList.remove('wrong');
      void cell.offsetWidth;
      cell.classList.add('wrong');
      handleWrong();
      setGameTimeout(function () { cell.classList.remove('wrong'); }, 400);
      speakOopsThenRepeat(s.items[pos], s.askPhrase);
    }
  }

  function nextFindRound() {
    clearGameTimers();
    var numbers = findRounds % 2 === 1;
    var items = shuffle(numbers ? NUMBERS_1_20 : ALPHABET).slice(0, FIND_SIZE * FIND_SIZE);
    var center = Math.floor(FIND_SIZE * FIND_SIZE / 2);
    var tpos;
    do { tpos = randInt(0, items.length - 1); } while (tpos === center);
    var target = items[tpos];
    var askPhrase = 'Find ' + (numbers ? 'the number ' : 'the letter ') + target + '!';

    gameContent.innerHTML =
      '<p class="game-prompt">Move the yellow box and press OK!</p>' +
      '<div class="big-symbol" id="findTarget">' + target + '</div>' +
      '<div class="find-grid" id="findGrid" style="--n:' + FIND_SIZE + '">' +
        items.map(function (v) { return '<div class="find-cell">' + v + '</div>'; }).join('') +
      '</div>' +
      dpadHtml(['up', 'left', 'ok', 'right', 'down']);

    findState = {
      items: items, tpos: tpos, askPhrase: askPhrase, done: false,
      x: center % FIND_SIZE, y: Math.floor(center / FIND_SIZE),
      cells: Array.prototype.slice.call(gameContent.querySelectorAll('.find-cell'))
    };
    placeFindCursor();
    useControls(findPress);

    document.getElementById('findTarget').addEventListener('click', function () { speak(askPhrase); });
    setGameTimeout(function () { speak(askPhrase); }, 300);
    scheduleHint(findHintDir);
  }

  /* ================= Hub / navigation ================= */
  function startGame(key) {
    clearGameTimers();
    stopControls();
    score = 0;
    updateScore();
    gameHub.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    gameContent.innerHTML = '';

    if (key === 'count') nextCountRound();
    else if (key === 'letter') nextLetterRound();
    else if (key === 'sound') nextSoundRound();
    else if (key === 'number') nextNumberRound();
    else if (key === 'memory') startMemoryGame();
    else if (key === 'odd') nextOddRound();
    else if (key === 'compare') nextCompareRound();
    else if (key === 'arrow') { arrowRounds = 0; nextArrowRound(); }
    else if (key === 'dial') nextDialRound();
    else if (key === 'find') { findRounds = 0; nextFindRound(); }
  }

  function backToHub() {
    clearGameTimers();
    stopControls();
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
