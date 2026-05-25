/* ============================================================
   DBI_1 Lernhub — Verhalten (nur Logik, keine Inhalte)
   Lädt: data.json, testdata.json, sql-data.json, quiz.json
   ============================================================ */

'use strict';

const STORAGE_KEY = 'dbi_lernhub_quiz_v1';

const state = {
  data: null,
  testdata: null,
  sqldata: null,
  quizdata: null,
  view: 'home',
  activeLevel: '1',
  quizFilter: 'all',
  quizStats: { correct: 0, wrong: 0, revealed: {} },
  shuffledQuestions: []
};

/* ── LocalStorage ───────────────────────────────────────── */
function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.quizStats)); } catch(e) {}
}
function loadProgress() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state.quizStats = JSON.parse(saved);
  } catch(e) {}
}

/* ── Shuffle ────────────────────────────────────────────── */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── Init ───────────────────────────────────────────────── */
async function init() {
  try {
    const [d, t, s, q] = await Promise.all([
      fetch('data.json').then(r => r.json()),
      fetch('testdata.json').then(r => r.json()),
      fetch('sql-data.json').then(r => r.json()),
      fetch('quiz.json').then(r => r.json())
    ]);
    state.data = d;
    state.testdata = t;
    state.sqldata = s;
    state.quizdata = q;

    loadProgress();
    state.shuffledQuestions = shuffleArray(state.quizdata.questions);

    applyMeta();
    buildSidebar();
    buildHome();
    setupNav();
    setupHamburger();
    showView('home');
    setActiveNav('home');
  } catch (e) {
    document.getElementById('main').innerHTML =
      '<div class="empty-state">⚠️ Fehler beim Laden der Daten.<br>Bitte lokal über einen Server starten:<br><code>python3 -m http.server</code><br>dann http://localhost:8000 öffnen.</div>';
    console.error(e);
  }
}

function applyMeta() {
  const m = state.data.meta;
  document.title = m.title;
  document.getElementById('header-logo').textContent = m.fach;
  document.getElementById('header-title').textContent = m.title;
  document.getElementById('header-badge').textContent = m.subtitle;
  document.getElementById('home-title').innerHTML = m.fach + ' — <span>Lernhub</span>';
  document.getElementById('home-subtitle').textContent =
    'Wähle ein Thema oder starte das Quiz. Level 1 = Grundwissen, Level 3 = 1er-Niveau.';
}

/* ── Hamburger ──────────────────────────────────────────── */
function setupHamburger() {
  const btn = document.getElementById('hamburger');
  const nav = document.getElementById('mobile-nav');
  const sideBtn = document.getElementById('sidebar-toggle');
  const sideDrawer = document.getElementById('mobile-sidebar');
  const overlay = document.getElementById('overlay');
  if (!btn || !nav || !overlay) return;

  function closeAll() {
    btn.classList.remove('open');
    nav.classList.remove('open');
    overlay.classList.remove('open');
    if (sideBtn) sideBtn.classList.remove('open');
    if (sideDrawer) sideDrawer.classList.remove('open');
  }

  // Nav-Hamburger
  btn.addEventListener('click', () => {
    const isOpen = nav.classList.contains('open');
    closeAll();
    if (!isOpen) { btn.classList.add('open'); nav.classList.add('open'); overlay.classList.add('open'); }
  });

  // Sidebar-Toggle
  if (sideBtn && sideDrawer) {
    sideBtn.addEventListener('click', () => {
      const isOpen = sideDrawer.classList.contains('open');
      closeAll();
      if (!isOpen) { sideBtn.classList.add('open'); sideDrawer.classList.add('open'); overlay.classList.add('open'); }
    });
  }

  overlay.addEventListener('click', closeAll);

  // Nav-Buttons (Haupt-Nav)
  nav.querySelectorAll('.nav-btn').forEach(navBtn => {
    navBtn.addEventListener('click', () => {
      const view = navBtn.dataset.view;
      if (view === 'home') buildHome();
      if (view === 'schritte') buildSchritte();
      if (view === 'sql') buildSql();
      if (view === 'testanalyse') buildTestanalyse();
      if (view === 'quiz') buildQuiz();
      if (view === 'drills') buildDrills();
      showView(view);
      setActiveNav(view);
      setActiveSidebar(null);
      closeAll();
    });
  });

  // Browser Zurück-Button → Startseite
  window.addEventListener('popstate', () => {
    buildHome();
    showView('home');
    setActiveNav('home');
    setActiveSidebar(null);
  });
  // State pushen wenn Topic geöffnet wird (siehe openTopic)
}

function pushHistoryState() {
  history.pushState({ view: 'topic' }, '', window.location.pathname);
}

/* ── Sidebar ────────────────────────────────────────────── */
function buildSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = '';
  state.data.categories.forEach(cat => {
    const topics = state.data.topics.filter(t => t.category === cat.id);
    if (!topics.length) return;
    const catLabel = document.createElement('div');
    catLabel.className = 'sidebar-category';
    catLabel.textContent = cat.label;
    sidebar.appendChild(catLabel);
    topics.forEach(topic => {
      const item = document.createElement('div');
      item.className = 'sidebar-item cat-' + topic.category;
      item.dataset.id = topic.id;
      item.innerHTML =
        '<span class="icon">' + topic.icon + '</span>' +
        '<span class="label">' + escapeHtml(topic.title) + '</span>' +
        '<span class="cat-dot"></span>';
      item.addEventListener('click', () => openTopic(topic.id));
      sidebar.appendChild(item);
    });
  });
}

function setActiveSidebar(id) {
  document.querySelectorAll('.sidebar-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === id));
}

/* ── Navigation ─────────────────────────────────────────── */
function setupNav() {
  document.querySelectorAll('.header-nav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'home') buildHome();
      if (view === 'schritte') buildSchritte();
      if (view === 'sql') buildSql();
      if (view === 'testanalyse') buildTestanalyse();
      if (view === 'quiz') buildQuiz();
      if (view === 'drills') buildDrills();
      showView(view);
      setActiveNav(view);
      setActiveSidebar(null);
    });
  });
}

function setActiveNav(view) {
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.view === view));
}

function showView(name) {
  state.view = name;
  document.querySelectorAll('.view').forEach(v =>
    v.classList.toggle('active', v.id === 'view-' + name));
}

/* ── Home ───────────────────────────────────────────────── */
function buildHome() {
  const grid = document.getElementById('topic-grid');
  grid.innerHTML = '';
  const catLabels = {};
  state.data.categories.forEach(c => catLabels[c.id] = c.label);
  state.data.topics.forEach(topic => {
    const card = document.createElement('div');
    card.className = 'topic-card cat-' + topic.category;
    card.innerHTML =
      '<div class="card-icon">' + topic.icon + '</div>' +
      '<div class="card-title">' + escapeHtml(topic.title) + '</div>' +
      '<div class="card-relevanz">' + escapeHtml(topic.pruefungsrelevanz) + '</div>' +
      '<span class="card-cat-tag">' + escapeHtml(catLabels[topic.category] || topic.category) + '</span>';
    card.addEventListener('click', () => openTopic(topic.id));
    grid.appendChild(card);
  });
}

/* ── Topic Detail ───────────────────────────────────────── */
function openTopic(id) {
  const topic = state.data.topics.find(t => t.id === id);
  if (!topic) return;
  setActiveSidebar(id);
  setActiveNav(null);
  state.activeLevel = '1';
  document.getElementById('topic-icon').textContent = topic.icon;
  document.getElementById('topic-title').textContent = topic.title;
  document.getElementById('topic-pruefung').textContent = topic.pruefungsrelevanz;
  ['1', '2', '3'].forEach(lvl => {
    const content = document.querySelector('.level-content[data-level="' + lvl + '"]');
    const paras = topic.levels[lvl] || [];
    const badgeClass = { '1': 'l1', '2': 'l2', '3': 'l3' }[lvl];
    const badgeLabel = {
      '1': 'Level 1 — Mindestwissen für eine 4',
      '2': 'Level 2 — Standard-Prüfungswissen',
      '3': 'Level 3 — 1er-Wissen'
    }[lvl];
    const arr = Array.isArray(paras) ? paras : [paras];
    content.innerHTML =
      '<div class="level-block">' +
      '<div class="level-badge ' + badgeClass + '">' + badgeLabel + '</div>' +
      arr.map(p => '<p>' + formatText(p) + '</p>').join('') +
      '</div>';
  });
  document.querySelectorAll('.level-tab').forEach(tab => {
    tab.onclick = () => switchLevel(tab.dataset.level);
  });
  switchLevel('1');
  const bColl = document.getElementById('topic-beispiele');
  if (topic.beispiele && topic.beispiele.length) {
    bColl.innerHTML = '<h3>Beispiele</h3>' +
      topic.beispiele.map(b =>
        '<div class="beispiel-card">' +
        '<div class="b-titel">' + escapeHtml(b.titel) + '</div>' +
        (b.text ? '<div class="b-text">' + formatText(b.text) + '</div>' : '') +
        (b.code ? '<pre>' + escapeHtml(b.code) + '</pre>' : '') +
        '</div>'
      ).join('');
  } else { bColl.innerHTML = ''; }
  const fColl = document.getElementById('topic-fehler');
  if (topic.fehler && topic.fehler.length) {
    fColl.innerHTML = '<h3>Typische Fehler</h3>' +
      '<div class="fehler-list">' +
      topic.fehler.map(f => '<div class="fehler-item">' + formatText(f) + '</div>').join('') +
      '</div>';
  } else { fColl.innerHTML = ''; }
  document.getElementById('topic-cheatsheet').innerHTML = highlightCheatsheet(topic.cheatsheet);
  showView('topic');
  pushHistoryState();
  rebuildMobileSidebar();
}

function switchLevel(lvl) {
  state.activeLevel = lvl;
  document.querySelectorAll('.level-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.level === lvl));
  document.querySelectorAll('.level-content').forEach(c =>
    c.classList.toggle('active', c.dataset.level === lvl));
}

/* ── Schritte View ──────────────────────────────────────── */
function buildSchritte() {
  const schritte = state.quizdata.schritte;
  const kategorien = [...new Set(schritte.map(s => s.kategorie))];
  const filterWrap = document.getElementById('schritte-filter');
  const activeKat = filterWrap._aktiv || 'Alle';
  filterWrap._aktiv = activeKat;
  filterWrap.innerHTML = '<span class="filter-label">Kategorie:</span>' +
    ['Alle', ...kategorien].map(k =>
      '<button class="filter-btn' + (activeKat === k ? ' active' : '') +
      '" data-kat="' + k + '">' + k + '</button>'
    ).join('');
  filterWrap.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => { filterWrap._aktiv = btn.dataset.kat; buildSchritte(); };
  });
  const list = document.getElementById('schritte-list');
  const filtered = activeKat === 'Alle' ? schritte : schritte.filter(s => s.kategorie === activeKat);
  list.innerHTML = filtered.map(s =>
    '<div class="schritt-card" id="sc-' + s.id + '">' +
    '<div class="schritt-card-head">' +
    '<span class="schritt-nr">' + s.nr + '</span>' +
    '<span class="schritt-titel">' + escapeHtml(s.titel) + '</span>' +
    '<span class="schritt-kat ' + escapeHtml(s.kategorie) + '">' + escapeHtml(s.kategorie) + '</span>' +
    '<span class="schritt-arrow">▸</span>' +
    '</div>' +
    '<div class="schritt-body">' +
    '<div class="schritt-beschreibung">' + escapeHtml(s.beschreibung) + '</div>' +
    '<div class="schritt-steps">' +
    s.schritte.map((st, i) =>
      '<div class="schritt-step">' +
      '<span class="schritt-step-num">' + (i + 1) + '.</span>' +
      '<span>' + formatText(st) + '</span>' +
      '</div>'
    ).join('') +
    '</div>' +
    '<div class="schritt-merksatz">' + escapeHtml(s.merksatz) + '</div>' +
    '</div>' +
    '</div>'
  ).join('');
  bindCardToggles(list, '.schritt-card', '.schritt-card-head');
}

/* ── Mobile Sidebar Drawer ──────────────────────────────── */
function rebuildMobileSidebar() {
  const drawer = document.getElementById('mobile-sidebar');
  if (!drawer) return;
  drawer.innerHTML = '';
  const catLabels = {};
  state.data.categories.forEach(c => catLabels[c.id] = c.label);
  state.data.categories.forEach(cat => {
    const topics = state.data.topics.filter(t => t.category === cat.id);
    if (!topics.length) return;
    const catLabel = document.createElement('div');
    catLabel.className = 'sidebar-category';
    catLabel.textContent = catLabels[cat.id] || cat.id;
    drawer.appendChild(catLabel);
    topics.forEach(topic => {
      const item = document.createElement('div');
      item.className = 'sidebar-item cat-' + topic.category;
      item.dataset.id = topic.id;
      item.innerHTML =
        '<span class="icon">' + topic.icon + '</span>' +
        '<span class="label">' + escapeHtml(topic.title) + '</span>' +
        '<span class="cat-dot"></span>';
      item.addEventListener('click', () => {
        document.getElementById('mobile-sidebar').classList.remove('open');
        document.getElementById('sidebar-toggle').classList.remove('open');
        document.getElementById('overlay').classList.remove('open');
        openTopic(topic.id);
      });
      drawer.appendChild(item);
    });
  });
}


function buildSql() {
  document.getElementById('sql-title').textContent = state.sqldata.meta.title;
  document.getElementById('sql-subtitle').textContent = state.sqldata.meta.beschreibung;
  const schemaPanel = document.getElementById('sql-schemas');
  schemaPanel.innerHTML = state.sqldata.schemas.map(s =>
    '<div class="sql-card">' +
    '<div class="sql-card-head"><span class="sql-arrow">▸</span>' +
    '<span class="sql-card-title">' + escapeHtml(s.titel) + '</span>' +
    '<span class="sql-card-cat">DDL</span></div>' +
    '<div class="sql-card-body"><div class="sql-card-desc">' + escapeHtml(s.beschreibung) + '</div>' +
    '<pre class="code-block">' + escapeHtml(s.ddl) + '</pre></div></div>'
  ).join('');
  const queryPanel = document.getElementById('sql-queries');
  queryPanel.innerHTML = state.sqldata.queries.map(q =>
    '<div class="sql-card">' +
    '<div class="sql-card-head"><span class="sql-arrow">▸</span>' +
    '<span class="sql-card-title">' + escapeHtml(q.titel) + '</span>' +
    '<span class="sql-card-cat">' + escapeHtml(q.kategorie) + '</span></div>' +
    '<div class="sql-card-body"><pre class="code-block">' + escapeHtml(q.sql) + '</pre>' +
    '<div class="sql-card-erkl">' + escapeHtml(q.erklaerung) + '</div></div></div>'
  ).join('');
  document.querySelectorAll('.sql-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.sql-tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.sql-panel').forEach(p => p.classList.toggle('active', p.id === 'sql-' + tab.dataset.sqltab));
    };
  });
  document.querySelector('.sql-tab[data-sqltab="schemas"]').classList.add('active');
  document.querySelector('.sql-tab[data-sqltab="queries"]').classList.remove('active');
  document.getElementById('sql-schemas').classList.add('active');
  document.getElementById('sql-queries').classList.remove('active');
  bindCardToggles(document.getElementById('view-sql'), '.sql-card', '.sql-card-head');
}

/* ── Testanalyse View ───────────────────────────────────── */
function buildTestanalyse() {
  document.getElementById('test-title').textContent = state.testdata.meta.title;
  document.getElementById('test-subtitle').textContent = state.testdata.meta.beschreibung;
  document.getElementById('test-note').textContent = '📌 ' + state.testdata.meta.note;
  const list = document.getElementById('test-list');
  list.innerHTML = state.testdata.aufgaben.map(a =>
    '<div class="test-card">' +
    '<div class="test-card-head">' +
    '<span class="test-nr">' + a.nr + '</span>' +
    '<span class="test-thema">' + escapeHtml(a.thema) + '</span>' +
    '<span class="test-arrow">▸</span></div>' +
    '<div class="test-card-body">' +
    '<div class="test-row frage"><div class="test-row-label">Aufgabe</div><div class="test-row-text">' + escapeHtml(a.frage) + '</div></div>' +
    '<div class="test-row fehler"><div class="test-row-label">Gemachter Fehler</div><div class="test-row-text">' + escapeHtml(a.fehler) + '</div></div>' +
    '<div class="test-row regel"><div class="test-row-label">Richtige Regel</div><div class="test-row-text">' + escapeHtml(a.regel) + '</div></div>' +
    '<div class="test-row loesung"><div class="test-row-label">Lösung</div><div class="test-row-text">' + escapeHtml(a.loesung) + '</div></div>' +
    '</div></div>'
  ).join('');
  bindCardToggles(list, '.test-card', '.test-card-head');
}

/* ── Quiz View ──────────────────────────────────────────── */
function buildQuiz() {
  buildQuizFilter();
  renderQuizCards();
  updateScore();
}

function buildQuizFilter() {
  const wrap = document.getElementById('quiz-filter');
  const levels = [['all', 'Alle'], ['1', 'Level 1'], ['2', 'Level 2'], ['3', 'Level 3']];
  wrap.innerHTML = '<span class="filter-label">Level:</span>' +
    levels.map(([v, l]) =>
      '<button class="filter-btn' + (state.quizFilter === v ? ' active' : '') + '" data-level="' + v + '">' + l + '</button>'
    ).join('') +
    '<button class="btn" id="quiz-reset" style="margin-left:auto">↺ Zurücksetzen</button>';
  wrap.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => { state.quizFilter = btn.dataset.level; buildQuiz(); };
  });
  document.getElementById('quiz-reset').onclick = () => {
    state.quizStats = { correct: 0, wrong: 0, revealed: {} };
    state.shuffledQuestions = shuffleArray(state.quizdata.questions);
    saveProgress();
    buildQuiz();
  };
}

function renderQuizCards() {
  const container = document.getElementById('quiz-questions');
  const topicTitles = {};
  state.data.topics.forEach(t => topicTitles[t.id] = t.title);

  const filtered = state.shuffledQuestions.filter(q =>
    state.quizFilter === 'all' || String(q.level) === state.quizFilter);

  const shuffleInfo = document.getElementById('quiz-shuffle-info');
  if (shuffleInfo) shuffleInfo.textContent = '🔀 Fragen werden zufällig gemischt — Fortschritt wird gespeichert';

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state">Keine Fragen für diesen Filter.</div>';
    updateProgress(0);
    return;
  }

  const allAnswered = filtered.every(q =>
    state.quizStats.revealed[q.id] === 'correct' || state.quizStats.revealed[q.id] === 'wrong');

  container.innerHTML = filtered.map((q, idx) => {
    const badge = { 1: 'l1', 2: 'l2', 3: 'l3' }[q.level];
    const topicLabel = topicTitles[q.topic] || q.topic;
    const st = state.quizStats.revealed[q.id];
    const revealed = !!st;
    const cardClass = st === 'correct' ? ' correct' : st === 'wrong' ? ' wrong' : '';
    const prevQ = filtered[idx - 1];
    const divider = (state.quizFilter === 'all' && q.level === 2 && (!prevQ || prevQ.level !== 2))
      ? '<div class="quiz-divider"><span>Level 2 — Abschluss-Aufgaben</span></div>' : '';
    let actions;
    if (st === 'correct') actions = '<span class="quiz-done-tag correct">✓ Gewusst</span>';
    else if (st === 'wrong') actions = '<span class="quiz-done-tag wrong">✗ Nicht gewusst</span>';
    else if (revealed) actions =
      '<button class="btn btn-correct" data-act="correct" data-id="' + q.id + '">✓ Gewusst</button>' +
      '<button class="btn btn-wrong" data-act="wrong" data-id="' + q.id + '">✗ Nicht gewusst</button>';
    else actions = '<button class="btn btn-reveal" data-act="reveal" data-id="' + q.id + '">Antwort zeigen</button>';
    return divider +
      '<div class="quiz-card' + cardClass + '" id="qcard-' + q.id + '">' +
      '<div class="quiz-card-meta">' +
      '<span class="quiz-level-badge ' + badge + '">Level ' + q.level + '</span>' +
      '<span class="quiz-topic-tag">' + escapeHtml(topicLabel) + '</span>' +
      '</div>' +
      '<div class="quiz-question">' + escapeHtml(q.question) + '</div>' +
      '<div class="quiz-answer-reveal' + (revealed ? ' show' : '') + '" id="ans-' + q.id + '">' +
      '<h4>✓ Musterlösung</h4><p>' + escapeHtml(q.answer) + '</p>' +
      '</div>' +
      '<div class="quiz-actions" id="act-' + q.id + '">' + actions + '</div>' +
      '</div>';
  }).join('');

  container.querySelectorAll('[data-act]').forEach(btn => {
    btn.onclick = () => quizAction(btn.dataset.act, btn.dataset.id, filtered);
  });

  updateProgress(filtered.length);
  if (allAnswered) showAuswertung(filtered);
}

function quizAction(act, id, filtered) {
  if (!filtered) {
    filtered = state.shuffledQuestions.filter(q =>
      state.quizFilter === 'all' || String(q.level) === state.quizFilter);
  }
  if (act === 'reveal') {
    document.getElementById('ans-' + id).classList.add('show');
    state.quizStats.revealed[id] = 'seen';
    const actDiv = document.getElementById('act-' + id);
    actDiv.innerHTML =
      '<button class="btn btn-correct" data-act="correct" data-id="' + id + '">✓ Gewusst</button>' +
      '<button class="btn btn-wrong" data-act="wrong" data-id="' + id + '">✗ Nicht gewusst</button>';
    actDiv.querySelectorAll('[data-act]').forEach(b => {
      b.onclick = () => quizAction(b.dataset.act, b.dataset.id, filtered);
    });
    saveProgress();
    updateScore();
  } else {
    state.quizStats.revealed[id] = act;
    const card = document.getElementById('qcard-' + id);
    card.classList.remove('correct', 'wrong');
    card.classList.add(act);
    const actDiv = document.getElementById('act-' + id);
    actDiv.innerHTML = act === 'correct'
      ? '<span class="quiz-done-tag correct">✓ Gewusst</span>'
      : '<span class="quiz-done-tag wrong">✗ Nicht gewusst</span>';
    saveProgress();
    updateScore();
    updateProgress(filtered.length);
    const allDone = filtered.every(q =>
      state.quizStats.revealed[q.id] === 'correct' || state.quizStats.revealed[q.id] === 'wrong');
    if (allDone) setTimeout(() => showAuswertung(filtered), 400);
  }
}

function updateScore() {
  let correct = 0, wrong = 0;
  Object.values(state.quizStats.revealed).forEach(v => {
    if (v === 'correct') correct++;
    else if (v === 'wrong') wrong++;
  });
  const total = state.quizdata.questions.length;
  setScore('correct', correct);
  setScore('wrong', wrong);
  setScore('pending', total - Object.keys(state.quizStats.revealed).length);
}

function setScore(type, val) {
  const el = document.querySelector('[data-score="' + type + '"]');
  if (el) el.textContent = val;
}

function updateProgress(total) {
  const filtered = state.shuffledQuestions.filter(q =>
    state.quizFilter === 'all' || String(q.level) === state.quizFilter);
  const done = filtered.filter(q => state.quizStats.revealed[q.id]).length;
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  document.getElementById('quiz-progress-fill').style.width = pct + '%';
  document.getElementById('quiz-progress-meta').textContent = done + '/' + total + ' gezeigt';
}

/* ── Quiz Auswertung ────────────────────────────────────── */
function showAuswertung(filtered) {
  const correct = filtered.filter(q => state.quizStats.revealed[q.id] === 'correct').length;
  const wrong   = filtered.filter(q => state.quizStats.revealed[q.id] === 'wrong').length;
  const total   = filtered.length;
  const pct     = Math.round(correct / total * 100);
  const noten   = state.quizdata.auswertung.noten;
  const notenObj= noten.find(n => pct >= n.min) || noten[noten.length - 1];
  const icons   = { '1': '🏆', '2': '🎯', '3': '📘', '4': '✅', '5': '📖' };
  document.getElementById('overlay-icon').textContent  = icons[notenObj.note] || '🎓';
  document.getElementById('overlay-note').textContent  = notenObj.note;
  document.getElementById('overlay-note').style.color  = notenObj.farbe;
  document.getElementById('overlay-label').textContent = notenObj.label;
  document.getElementById('overlay-score').textContent = correct + ' / ' + total + ' richtig  (' + pct + '%)';
  document.getElementById('overlay-text').textContent  = notenObj.text;
  document.getElementById('overlay-breakdown').innerHTML =
    '<div class="overlay-stat"><div class="overlay-stat-num correct">' + correct + '</div><div class="overlay-stat-label">Gewusst</div></div>' +
    '<div class="overlay-stat"><div class="overlay-stat-num wrong">' + wrong + '</div><div class="overlay-stat-label">Falsch</div></div>' +
    '<div class="overlay-stat"><div class="overlay-stat-num skip">' + pct + '%</div><div class="overlay-stat-label">Score</div></div>';
  const overlay = document.getElementById('quiz-overlay');
  overlay.style.display = 'flex';
  document.getElementById('overlay-close').onclick = () => {
    overlay.style.display = 'none';
    state.quizStats = { correct: 0, wrong: 0, revealed: {} };
    state.shuffledQuestions = shuffleArray(state.quizdata.questions);
    saveProgress();
    buildQuiz();
  };
}

/* ── Drills View ────────────────────────────────────────── */
function buildDrills() {
  const list = document.getElementById('drills-list');
  list.innerHTML = state.quizdata.drills.map((d, i) =>
    '<div class="drill-card" data-i="' + i + '">' +
    '<div class="drill-q">' +
    '<span class="drill-num">' + String(i + 1).padStart(2, '0') + '</span>' +
    '<span>' + escapeHtml(d.q) + '</span>' +
    '</div>' +
    '<div class="drill-a">' + escapeHtml(d.a) + '</div>' +
    '</div>'
  ).join('');
  list.querySelectorAll('.drill-card').forEach(card => {
    card.onclick = () => {
      const ans = card.querySelector('.drill-a');
      ans.classList.toggle('show', !ans.classList.contains('show'));
      card.classList.toggle('open', !card.classList.contains('open'));
    };
  });
  const wrap = document.getElementById('checklist-wrap');
  wrap.innerHTML = state.quizdata.checklists.map(cl =>
    '<div class="checklist">' +
    '<h3>✅ ' + escapeHtml(cl.titel) + '</h3>' +
    cl.items.map(item =>
      '<div class="check-item"><div class="check-box">✓</div>' +
      '<div class="check-label">' + escapeHtml(item) + '</div></div>'
    ).join('') +
    '</div>'
  ).join('');
  wrap.querySelectorAll('.check-item').forEach(item => {
    item.onclick = () => item.classList.toggle('checked');
  });
}

/* ── Aufklapp-Helper ────────────────────────────────────── */
function bindCardToggles(scope, cardSel, headSel) {
  scope.querySelectorAll(cardSel).forEach(card => {
    const head = card.querySelector(headSel);
    head.onclick = () => card.classList.toggle('open');
  });
}

/* ── Utilities ──────────────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function formatText(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
function highlightCheatsheet(text) {
  return escapeHtml(text).replace(
    /(UNIQUE|NOT NULL|NULL|PK|FK|max=1|max=n|min=0|min=1|1:1|1:n|m:n|KEIN|IMMER|FALSCH|RICHTIG|NIEMALS|MAX|MIN|ALL|SOME|EXISTS)/g,
    '<strong>$1</strong>'
  );
}

document.addEventListener('DOMContentLoaded', init);
