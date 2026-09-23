/* Glifo — LOGICA
   Vanilla JS, nessuna dipendenza. I contenuti stanno in data.js.
   Struttura:
     1. Stato e persistenza (localStorage)
     2. Utilità (traduzione, DOM, mescolamento)
     3. Icone
     4. Navigazione
     5. Render delle sette viste
     6. Quiz
     7. Avvio */

(function () {
  'use strict';

  /* ============ 1. STATO ============ */

  const STORE_KEY = 'glifo-profile';

  const defaults = {
    viewedClass: {}, viewedEvent: {}, viewedDesigner: {}, viewedTerm: {}, viewedTechnique: {}, viewedTypeface: {},
    bestFont: 0, bestHistory: 0, bestTerms: 0, bestTechnique: 0, xp: 0,
  };

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { saved = {}; }

  const state = {
    lang: localStorage.getItem('glifo-lang') || 'it',
    theme: localStorage.getItem('glifo-theme') || 'light',
    section: 'home',
    open: { class: {}, event: {}, designer: {}, term: {}, technique: {} },
    typeface: null,           // id del carattere aperto nella sezione Type
    ptTarget: null,           // n della casella da aprire nella tavola periodica
    flash: null,              // chiave della voce raggiunta dalla ricerca
    hbOpen: false,            // prontuario aperto o chiuso
    hbQuery: '',              // testo digitato nella ricerca del prontuario
    hbTarget: null,           // id della voce da evidenziare arrivandoci da un modello
    profile: Object.assign({}, defaults, saved),
    // quiz
    exMode: 'menu',           // menu | quiz
    quizType: null,           // font | history | terms | technique
    questions: [], qIndex: 0, qScore: 0, qSelected: null, qFinished: false,
    qChoices: [],             // opzioni della domanda corrente, generate una sola volta
  };

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.profile)); } catch (e) {}
  }
  function addXp(n) { state.profile.xp += n; persist(); renderXp(); }

  /* ============ 2. UTILITÀ ============ */

  // Traduce una chiave dell'oggetto UI nella lingua corrente
  function t(key) {
    const entry = UI[key];
    return entry ? (entry[state.lang] || entry.it) : key;
  }
  // Traduce un oggetto {it,en,de}. Se riceve una stringa la restituisce
  // com'è: alcuni campi (anni, luoghi) sono uguali in tutte le lingue.
  function tr(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    return v[state.lang] || v.it || '';
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function $(id) { return document.getElementById(id); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // Iniziali per il monogramma dei designer senza ritratto
  function initials(name) {
    return name.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2);
  }

  /* ============ 3. ICONE ============
     Tratto monocromo che eredita il colore del testo, stile SF Symbols. */

  const ICONS = {
    home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/>',
    book: '<path d="M4 5.5C4 5 5 4.5 7 4.5c2.5 0 4 .8 5 1.5v13c-1-.7-2.5-1.5-5-1.5-2 0-3 .5-3 1V5.5Z"/><path d="M20 5.5c0-.5-1-1-3-1-2.5 0-4 .8-5 1.5v13c1-.7 2.5-1.5 5-1.5 2 0 3 .5 3 1V5.5Z"/>',
    glyph: '<path d="M7 19V7.5C7 5.6 8.6 4 10.5 4S14 5.6 14 7.5V19"/><path d="M7 12.5h7"/><path d="M17 9v10"/>',
    press: '<rect x="4" y="4" width="16" height="6" rx="1"/><path d="M8 10v3h8v-3"/><rect x="6" y="13" width="12" height="7" rx="1"/>',
    type: '<path d="M5 7V5h14v2"/><path d="M12 5v14"/><path d="M9 19h6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.5 2"/>',
    people: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="17" cy="9.5" r="2.3"/><path d="M15.5 19c.2-2 1.7-3.6 3.7-4"/>',
    cap: '<path d="M12 5 2 9.5l10 4.5 10-4.5L12 5Z"/><path d="M6 12v4.5c0 1 2.7 2 6 2s6-1 6-2V12"/>',
    person: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c0-3.5 3-6 7-6s7 2.5 7 6"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.6"/><path d="M15.6 15.6 20.8 20.8"/>',
    close: '<path d="M6 6 18 18"/><path d="M18 6 6 18"/>',
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  /* ============ 4. NAVIGAZIONE ============ */

  const SECTIONS = [
    { key: 'home',      icon: 'home',   label: 'navHome' },
    { key: 'glossary',  icon: 'book',   label: 'navGlossary' },
    { key: 'terms',     icon: 'glyph',  label: 'navTerms' },
    { key: 'technique', icon: 'press',  label: 'navTechnique' },
    { key: 'type',      icon: 'type',   label: 'navType' },
    { key: 'history',   icon: 'clock',  label: 'navHistory' },
    { key: 'designers', icon: 'people', label: 'navDesigners' },
    { key: 'exercises', icon: 'cap',    label: 'navExercises' },
    { key: 'profile',   icon: 'person', label: 'navProfile' },
  ];

  // In basso su mobile ci stanno cinque voci: le altre restano raggiungibili
  // dalle card della home e dalla barra laterale su schermi larghi.
  const TABBAR = ['home', 'type', 'glossary', 'exercises', 'profile'];

  function goto(section) {
    state.section = section;
    // Uscendo dagli esercizi si torna sempre al menu: evita di rientrare
    // a metà di un quiz senza contesto.
    if (section !== 'exercises') state.exMode = 'menu';
    if (section !== 'type') state.typeface = null;
    render();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function renderNav() {
    const sidebar = $('sidebar');
    const tabbar = $('tabbar');
    clear(sidebar); clear(tabbar);

    SECTIONS.forEach(function (s) {
      const active = s.key === state.section;

      const side = el('button', 'nav-item' + (active ? ' active' : ''));
      side.type = 'button';
      side.innerHTML = icon(s.icon) + '<span>' + t(s.label) + '</span>';
      side.addEventListener('click', function () { goto(s.key); });
      sidebar.appendChild(side);

      if (TABBAR.indexOf(s.key) === -1) return;
      const tab = el('button', 'tab' + (active ? ' active' : ''));
      tab.type = 'button';
      tab.innerHTML = icon(s.icon) + '<span>' + t(s.label) + '</span>';
      tab.addEventListener('click', function () { goto(s.key); });
      tabbar.appendChild(tab);
    });
  }

  /* ============ 4bis. RICERCA ============
     Una sola barra per tutte le sezioni. Cerca sempre in tutte e tre le
     lingue, non solo in quella scelta: chi studia tipografia incontra i
     termini in inglese nei manuali e in tedesco nelle fonderie, e deve
     poterli scrivere così come li ha letti. Scegliendo un risultato l'app
     cambia sezione, apre la voce e la porta sotto gli occhi. */

  const SEARCH_MAX = 10;      // oltre la decina la tendina smette di essere una scorciatoia
  const FUZZY_MIN = 4;        // sotto le quattro lettere il refuso tollerato dà troppi falsi

  /* Toglie diacritici e differenze di apostrofo: «Ličko» si trova scrivendo
     «licko», «Grundlinie» scrivendo «grundlinie», «für» scrivendo «fur».
     La ß tedesca diventa «ss», come nella grafia alternativa ufficiale. */
  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ß/g, 'ss')
      .replace(/[’‘‛]/g, "'")
      .replace(/[“”«»„]/g, '"')
      .replace(/[–—−]/g, '-');
  }

  /* Distanza di Levenshtein limitata a 1: vero se le due parole coincidono
     o differiscono per una sola lettera aggiunta, tolta o cambiata.
     Serve a perdonare «Frutiguer», «Tschicold», «Novarrese». */
  function lev1(a, b) {
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < la && j < lb) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (la > lb) i++;
      else if (lb > la) j++;
      else { i++; j++; }
    }
    return edits + (la - i) + (lb - j) <= 1;
  }

  // Tutte le varianti di un campo trilingue, per costruire il testo cercabile
  function allLangs(v) {
    if (v == null) return [];
    if (typeof v === 'string') return [v];
    return [v.it, v.en, v.de].filter(Boolean);
  }

  /* L'indice si costruisce una volta sola, alla prima battuta, e non dipende
     dalla lingua: dentro ci sono già tutte e tre. Sono poco più di duecento
     voci, scorrerle a ogni tasto costa meno di un millesimo di secondo. */
  var searchIndex = null;

  function buildIndex() {
    const ix = [];

    function add(kind, id, src, titles, meta, body) {
      const tit = norm(titles.join(' '));
      ix.push({
        kind: kind, id: id, src: src,
        tit: tit,
        // Il titolo ridotto a parole separate da spazi, con una spaziatura
        // anche ai due capi: così « bodoni » riconosce la parola intera e non
        // si confonde con « bodoniana », e « non-latine » resta cercabile
        // scrivendo « latine ».
        titw: ' ' + tit.replace(/[^0-9a-z]+/g, ' ').trim() + ' ',
        meta: norm(meta.join(' ')),
        hay: norm(body.join(' ')),
      });
    }

    CLASSIFICATIONS.forEach(function (c) {
      add('class', c.id, c, allLangs(c.name),
          [c.era, c.novarese, c.examples], allLangs(c.desc));
    });
    TERMS.forEach(function (x) {
      add('term', x.id, x, allLangs(x.term), [x.letter], allLangs(x.def));
    });
    TECHNIQUES.forEach(function (x) {
      add('technique', x.id, x, allLangs(x.term), [], allLangs(x.def));
    });
    TYPEFACES.forEach(function (tf) {
      add('typeface', tf.id, tf, [tf.name],
          [tf.year, tf.designer, tf.foundry],
          allLangs(tf.desc).concat(allLangs(tf.recognize), allLangs(tf.where)));
    });
    // Le cento caselle della tavola. Quelle che hanno già una scheda completa
    // non si indicizzano due volte: ci pensa la voce TYPEFACES qui sopra.
    PERIODIC.forEach(function (x) {
      if (x.ref && TYPEFACES.some(function (tf) { return tf.id === x.ref; })) return;
      add('periodic', String(x.n), x, [x.name, x.sym],
          [x.year, x.by, x.house], allLangs(x.note));
    });
    TIMELINE.forEach(function (ev) {
      add('event', String(ev.year), ev, allLangs(ev.title),
          [String(ev.year)], allLangs(ev.desc));
    });
    DESIGNERS.forEach(function (d) {
      add('designer', d.id, d, [d.name],
          [tr(d.years), d.years, d.place && allLangs(d.place).join(' ')].filter(Boolean),
          allLangs(d.bio).concat(allLangs(d.knownFor)));
    });

    return ix;
  }

  /* I risultati in ordine di pertinenza, in sei gradini:
       0  parola intera nel titolo  — «Bodoni» trova il carattere Bodoni
       1  inizio di parola nel titolo — e solo dopo la classe «Bodoniana»
       2  in qualche punto del titolo
       3  nei dati di scheda: anno, autore, fonderia, luogo
       4  nel corpo della voce
       5  refuso perdonato sul titolo
     A parità di gradino resta l'ordine dell'indice, che è quello delle
     sezioni: glossario, anatomia, tecnica, caratteri, storia, designer. */
  function searchRank(q) {
    const nq = norm(q).trim();
    if (!nq) return [];
    if (!searchIndex) searchIndex = buildIndex();

    const nqw = nq.replace(/[^0-9a-z]+/g, ' ').trim();
    const hits = [];

    searchIndex.forEach(function (e) {
      let s = -1;
      if (nqw && e.titw.indexOf(' ' + nqw + ' ') > -1) s = 0;
      else if (nqw && e.titw.indexOf(' ' + nqw) > -1) s = 1;
      else if (e.tit.indexOf(nq) > -1) s = 2;
      else if (e.meta.indexOf(nq) > -1) s = 3;
      else if (e.hay.indexOf(nq) > -1) s = 4;
      else if (nq.length >= FUZZY_MIN && e.titw.split(' ').some(function (w) {
        return w.length >= 3 && lev1(w, nq);
      })) s = 5;
      if (s > -1) hits.push({ e: e, s: s });
    });

    hits.sort(function (a, b) { return a.s - b.s; });
    return hits.slice(0, SEARCH_MAX).map(function (h) { return h.e; });
  }

  /* Come si presenta una voce nella tendina. Il sottotitolo porta i nomi
     nelle altre due lingue dove esistono — è il modo più rapido di capire
     che «Grundlinie» e «Linea di base» sono la stessa voce — e i dati di
     scheda dove il nome è uno solo, come per i caratteri. */
  function otherLangs(obj) {
    return ['it', 'en', 'de']
      .filter(function (l) { return l !== state.lang && obj[l]; })
      .map(function (l) { return obj[l]; })
      .join('  ·  ');
  }

  function searchView(e) {
    const x = e.src;
    switch (e.kind) {
      case 'class': return {
        name: tr(x.name), sub: x.era + (x.examples ? '  ·  ' + x.examples : ''),
        where: t('navGlossary'), mark: 'Aa', font: x.font, bg: CLASS_COLORS[x.id] };
      case 'term': return {
        name: tr(x.term), sub: otherLangs(x.term),
        where: t('navTerms'), mark: x.letter, font: "'EB Garamond', serif" };
      case 'technique': return {
        name: tr(x.term), sub: otherLangs(x.term),
        where: t('navTechnique'), ic: 'press' };
      case 'typeface': return {
        name: x.name, sub: [x.year, x.designer].filter(Boolean).join('  ·  '),
        where: t('navType'), mark: x.glyphA, font: x.font, bg: classColor(x) };
      case 'periodic': return {
        name: x.name, sub: [x.year, x.by].filter(function (v) { return v && v !== '—'; }).join('  ·  '),
        where: t('navType'), mark: x.sym, font: x.font,
        bg: CLASS_COLORS[x.cls] || CLASS_COLOR_FALLBACK };
      case 'event': return {
        name: tr(x.title), sub: String(x.year), where: t('navHistory'), ic: 'clock' };
      case 'designer': return {
        name: x.name, sub: tr(x.knownFor), where: t('navDesigners'), mark: initials(x.name) };
    }
    return { name: '', sub: '', where: '' };
  }

  /* ---- stato della tendina ---- */
  var searchHits = [];
  var searchActive = -1;

  function searchNodes() {
    return Array.prototype.slice.call($('searchList').querySelectorAll('.search-item'));
  }

  function closeSearch() {
    const list = $('searchList');
    list.hidden = true;
    clear(list);
    searchHits = [];
    searchActive = -1;
    const inp = $('searchInput');
    inp.setAttribute('aria-expanded', 'false');
    inp.removeAttribute('aria-activedescendant');
  }

  function renderSearch() {
    const inp = $('searchInput');
    const list = $('searchList');
    const q = inp.value.trim();

    $('searchClear').hidden = inp.value.length === 0;

    if (!q) return closeSearch();

    searchHits = searchRank(q);
    searchActive = -1;
    clear(list);

    if (!searchHits.length) {
      // Un vicolo cieco senza spiegazione fa credere che l'app sia vuota:
      // meglio dire che cosa si può cercare.
      const box = el('div', 'search-none');
      box.appendChild(el('p', 'search-none-t', t('searchEmpty') + ' « ' + q + ' »'));
      box.appendChild(el('p', 'search-none-h', t('searchEmptyHint')));
      list.appendChild(box);
      list.hidden = false;
      inp.setAttribute('aria-expanded', 'true');
      return;
    }

    searchHits.forEach(function (e, i) {
      const v = searchView(e);
      const row = el('button', 'search-item');
      row.type = 'button';
      row.id = 'search-hit-' + i;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');

      const mark = el('span', 'search-mark' + (v.bg ? ' is-tinted' : ''));
      if (v.bg) mark.style.background = v.bg;
      if (v.ic) {
        mark.innerHTML = icon(v.ic);
      } else {
        mark.textContent = v.mark || '·';
        if (v.font) mark.style.fontFamily = v.font;
        // I simboli a due lettere e le iniziali non stanno nel quadratino
        // alla stessa misura di una lettera sola: si stringono.
        if ((v.mark || '').length > 1) mark.style.fontSize = 'var(--fs-sm)';
      }
      row.appendChild(mark);

      const texts = el('div', 'search-texts');
      texts.appendChild(el('span', 'search-name', v.name));
      if (v.sub) texts.appendChild(el('span', 'search-sub', v.sub));
      row.appendChild(texts);

      row.appendChild(el('span', 'search-where', v.where));

      // mousedown e non click: il campo perde il fuoco prima del click e la
      // tendina si chiuderebbe sotto il dito.
      row.addEventListener('mousedown', function (ev) { ev.preventDefault(); openResult(e); });
      row.addEventListener('click', function (ev) { ev.preventDefault(); openResult(e); });
      list.appendChild(row);
    });

    list.hidden = false;
    inp.setAttribute('aria-expanded', 'true');
  }

  function moveSearch(delta) {
    const nodes = searchNodes();
    if (!nodes.length) return;
    // −1 vuol dire «nessuna selezione»: dall'ultima riga si torna lì, così
    // con le frecce si può sempre rientrare nel campo di testo.
    searchActive += delta;
    if (searchActive < -1) searchActive = nodes.length - 1;
    if (searchActive >= nodes.length) searchActive = -1;
    nodes.forEach(function (n, i) {
      const on = i === searchActive;
      n.classList.toggle('is-on', on);
      n.setAttribute('aria-selected', String(on));
    });
    const inp = $('searchInput');
    if (searchActive >= 0) {
      inp.setAttribute('aria-activedescendant', nodes[searchActive].id);
      nodes[searchActive].scrollIntoView({ block: 'nearest' });
    } else {
      inp.removeAttribute('aria-activedescendant');
    }
  }

  /* Porta l'utente alla voce: cambia sezione, la apre e la segna da
     illuminare. Il campo si svuota — la ricerca ha fatto il suo lavoro e
     lasciare la query lì confonderebbe con un filtro sempre attivo. */
  function openResult(e) {
    const id = e.id;
    switch (e.kind) {
      case 'class':
        state.open.class[id] = true; markViewed('viewedClass', id);
        jumpTo('glossary', 'class:' + id); break;
      case 'term':
        state.open.term[id] = true; markViewed('viewedTerm', id);
        jumpTo('terms', 'term:' + id); break;
      case 'technique':
        state.open.technique[id] = true; markViewed('viewedTechnique', id);
        jumpTo('technique', 'technique:' + id); break;
      case 'event':
        state.open.event[id] = true; markViewed('viewedEvent', id);
        jumpTo('history', 'event:' + id); break;
      case 'designer':
        state.open.designer[id] = true; markViewed('viewedDesigner', id);
        jumpTo('designers', 'designer:' + id); break;
      case 'typeface':
        state.typeface = id; markViewed('viewedTypeface', id);
        jumpTo('type', null); break;
      case 'periodic':
        // Se la scheda completa esiste si va su quella, altrimenti si apre
        // il fumetto della casella nella tavola.
        if (e.src.ref && TYPEFACES.some(function (tf) { return tf.id === e.src.ref; })) {
          state.typeface = e.src.ref; markViewed('viewedTypeface', e.src.ref);
        } else {
          state.typeface = null; state.ptTarget = e.src.n;
        }
        jumpTo('type', null); break;
    }
  }

  function jumpTo(section, key) {
    $('searchInput').value = '';
    closeSearch();
    $('searchClear').hidden = true;
    state.section = section;
    state.exMode = 'menu';
    state.flash = key;
    render();
    if (!key) window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* Il seguito del salto, eseguito dopo che la vista è stata disegnata:
     senza, si cercherebbe nel DOM un nodo che non esiste ancora. */
  function afterRender() {
    if (state.ptTarget != null) {
      const n = state.ptTarget;
      state.ptTarget = null;
      const cell = ptCells[n];
      if (cell) {
        requestAnimationFrame(function () {
          cell.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
          cell.click();
        });
      }
    }

    if (state.flash) {
      const key = state.flash;
      state.flash = null;
      requestAnimationFrame(function () {
        const node = document.querySelector('[data-key="' + key + '"]');
        if (!node) return;
        node.scrollIntoView({ block: 'center', behavior: 'smooth' });
        node.classList.remove('is-flash');
        void node.offsetWidth;      // riavvia l'animazione anche sulla stessa voce
        node.classList.add('is-flash');
      });
    }
  }

  // Le stringhe della barra cambiano con la lingua, il resto no
  function applySearchStrings() {
    const inp = $('searchInput');
    inp.placeholder = t('searchPlaceholder');
    inp.setAttribute('aria-label', t('searchAria'));
    $('searchClear').setAttribute('aria-label', t('searchClearAria'));
    $('searchIcon').innerHTML = icon('search');
    $('searchClear').innerHTML = icon('close');
  }

  /* La colonna laterale è appiccicata sotto la barra superiore, e per sapere
     dove cominciare deve conoscerne l'altezza. Il valore in style.css è
     giusto per l'italiano a corpo normale, ma il tedesco è più lungo e chi
     ingrandisce il testo dal sistema sposta tutto: qui si misura davvero e
     si riscrive la variabile, così la navigazione non finisce mai sotto la
     ricerca né lascia una striscia vuota. */
  function syncTopbarHeight() {
    const bar = document.querySelector('.topbar');
    if (!bar) return;
    const h = Math.round(bar.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty('--topbar-h', h + 'px');
  }

  function initSearch() {
    const inp = $('searchInput');

    inp.addEventListener('input', renderSearch);
    inp.addEventListener('focus', function () { if (inp.value.trim()) renderSearch(); });

    inp.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { inp.value = ''; closeSearch(); $('searchClear').hidden = true; return; }
      if ($('searchList').hidden || !searchHits.length) return;
      if (ev.key === 'ArrowDown') { ev.preventDefault(); moveSearch(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); moveSearch(-1); }
      else if (ev.key === 'Enter') {
        // Invio senza selezione apre il primo risultato: è quasi sempre
        // quello che si stava cercando, e risparmia una freccia.
        ev.preventDefault();
        openResult(searchHits[searchActive >= 0 ? searchActive : 0]);
      }
    });

    $('searchClear').addEventListener('click', function () {
      inp.value = '';
      closeSearch();
      $('searchClear').hidden = true;
      inp.focus();
    });

    // Un clic fuori chiude la tendina ma non svuota il campo
    document.addEventListener('click', function (ev) {
      const wrap = document.querySelector('.search-wrap');
      if (wrap && !wrap.contains(ev.target)) closeSearch();
    });

    // Il carattere dell'interfaccia arriva dopo il primo disegno e cambia
    // l'altezza della barra: si rimisura quando è pronto.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(syncTopbarHeight).catch(function () {});
    }
    window.addEventListener('resize', syncTopbarHeight);

    // ⌘K / Ctrl+K come in tutte le app da tastiera, e « / » come nei browser
    document.addEventListener('keydown', function (ev) {
      const tag = (ev.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea';
      if ((ev.key === 'k' || ev.key === 'K') && (ev.metaKey || ev.ctrlKey)) {
        ev.preventDefault(); inp.focus(); inp.select();
      } else if (ev.key === '/' && !typing && !ev.metaKey && !ev.ctrlKey) {
        ev.preventDefault(); inp.focus();
      }
    });
  }

  /* ============ 5. VISTE ============ */

  function renderXp() {
    $('xpChip').textContent = state.profile.xp + ' XP';
  }

  function counts() {
    return {
      cls: Object.keys(state.profile.viewedClass).length,
      ev: Object.keys(state.profile.viewedEvent).length,
      des: Object.keys(state.profile.viewedDesigner).length,
      ter: Object.keys(state.profile.viewedTerm).length,
      tec: Object.keys(state.profile.viewedTechnique).length,
      typ: Object.keys(state.profile.viewedTypeface).length,
    };
  }

  function markViewed(bucket, id) {
    if (state.profile[bucket][id]) return;
    state.profile[bucket][id] = true;
    persist();
    addXp(2);
  }

  /* ---- Home ---- */
  function renderHome() {
    $('heroKicker').textContent = t('heroKicker');
    $('heroTitle').textContent = t('heroTitle');

    // Citazione del giorno: stabile per tutta la giornata, cambia a mezzanotte
    const day = Math.floor(Date.now() / 86400000) % QUOTES.length;
    $('heroQuote').textContent = '“' + QUOTES[day].text + '”';
    $('heroAuthor').textContent = '— ' + QUOTES[day].author + ', ' + tr(QUOTES[day].role);

    const cards = [
      { glyph: 'Aa', font: "'EB Garamond', serif", color: 'var(--accent1)',
        title: t('navGlossary'), desc: t('glossaryIntro'), n: CLASSIFICATIONS.length, go: 'glossary' },
      { glyph: 'g', font: "'Playfair Display', serif", color: 'var(--accent3)',
        title: t('navTerms'), desc: t('termsIntro'), n: TERMS.length, go: 'terms' },
      { glyph: '¶', font: "'PT Serif', serif", color: 'var(--accent2-dark)',
        title: t('navTechnique'), desc: t('techniqueIntro'), n: TECHNIQUES.length, go: 'technique' },
      { glyph: 'Aa', font: "'Inter', sans-serif", color: 'var(--accent1)',
        title: t('navType'), desc: t('typeIntro'), n: TYPEFACES.length, go: 'type' },
      { glyph: '1501', font: "'Blacker Pro Text', serif", color: 'var(--accent4)',
        title: t('navHistory'), desc: t('historyIntro'), n: TIMELINE.length, go: 'history' },
      { glyph: '&', font: "'Cormorant Garamond', serif", color: 'var(--accent1)',
        title: t('navDesigners'), desc: t('designersIntro'), n: DESIGNERS.length, go: 'designers' },
    ];

    const grid = $('homeCards');
    clear(grid);
    cards.forEach(function (c) {
      const tile = el('button', 'tile');
      tile.type = 'button';

      const g = el('span', 'tile-glyph', c.glyph);
      g.style.fontFamily = c.font;
      g.style.color = c.color;
      if (c.glyph.length > 2) g.style.fontSize = '58px';

      tile.appendChild(g);
      tile.appendChild(el('span', 'tile-title', c.title));
      tile.appendChild(el('span', 'tile-desc', c.desc.length > 88 ? c.desc.slice(0, 88) + '…' : c.desc));
      tile.appendChild(el('span', 'tile-meta', c.n + ' ' + (state.lang === 'de' ? 'Einträge' : state.lang === 'en' ? 'entries' : 'voci')));
      tile.addEventListener('click', function () { goto(c.go); });
      grid.appendChild(tile);
    });

    $('progressTitle').textContent = t('progressTitle');
    const n = counts();
    const stats = [
      { v: n.cls + '/' + CLASSIFICATIONS.length, l: t('statClassifications'), c: 'var(--accent1)' },
      { v: n.ter + '/' + TERMS.length, l: t('statTerms'), c: 'var(--accent3)' },
      { v: n.tec + '/' + TECHNIQUES.length, l: t('statTechniques'), c: 'var(--accent2-dark)' },
      { v: n.typ + '/' + TYPEFACES.length, l: t('statTypefaces'), c: 'var(--accent1)' },
      { v: n.ev + '/' + TIMELINE.length, l: t('statTimeline'), c: 'var(--accent4)' },
      { v: n.des + '/' + DESIGNERS.length, l: t('statDesigners'), c: 'var(--accent1)' },
    ];
    const box = $('progressStats');
    clear(box);
    stats.forEach(function (s) {
      const wrap = el('div');
      const v = el('div', 'stat-value', s.v);
      v.style.color = s.c;
      wrap.appendChild(v);
      wrap.appendChild(el('div', 'stat-label', s.l));
      box.appendChild(wrap);
    });
  }

  /* ---- Voce a fisarmonica, condivisa da glossario, anatomia e tecnica ---- */
  function accordionItem(opts) {
    const item = el('div', 'item' + (opts.open ? ' open' : ''));
    // La chiave serve alla ricerca per ritrovare la voce nel DOM dopo il
    // salto da una sezione all'altra.
    if (opts.key) item.dataset.key = opts.key;

    const head = el('button', 'item-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(opts.open));

    if (opts.specimen) {
      // La casella del campione è larga 56px: un glifo solo ci sta comodo,
      // "123" o "XIV" no. Sopra i due caratteri si scala il corpo invece di
      // allargare la casella, o l'intera lista si disallineerebbe.
      const long = String(opts.specimen).length > 2;
      const spec = el('span', 'item-specimen' + (long ? ' item-specimen-sm' : ''), opts.specimen);
      if (opts.font) spec.style.fontFamily = opts.font;
      head.appendChild(spec);
    }

    const main = el('div', 'item-main');
    if (opts.tags) {
      const tags = el('div', 'lang-tags');
      opts.tags.forEach(function (x) { tags.appendChild(el('span', 'lang-tag', x)); });
      main.appendChild(tags);
    }
    main.appendChild(el('span', 'item-name', opts.name));
    if (opts.sub) main.appendChild(el('span', 'item-sub', opts.sub));

    head.appendChild(main);
    head.appendChild(el('span', 'item-chev', opts.open ? '−' : '+'));
    head.addEventListener('click', opts.onToggle);
    item.appendChild(head);

    if (opts.open) {
      const body = el('div', 'item-body');
      body.appendChild(el('p', 'item-desc', opts.desc));
      if (opts.extra) body.appendChild(opts.extra);
      if (opts.plate) {
        const f = plateFig(opts.plate, true);
        if (f) body.appendChild(f);
      }
      item.appendChild(body);
    }
    return item;
  }

  // Le tavole hanno un fondo di carta proprio: funzionano su entrambi i temi
  // senza doverle ridisegnare, come una figura incollata in un libro.
  function plateFig(key, compact) {
    const pl = PLATES[key];
    if (!pl) return null;
    const fig = el('figure', 'plate' + (compact ? ' plate-compact' : ''));
    const img = document.createElement('img');
    img.src = pl.src;
    img.alt = tr(pl.title);
    img.loading = 'lazy';
    fig.appendChild(img);
    const cap = el('figcaption', 'plate-cap');
    // Le figure delle correzioni ottiche si numerano a parte: « Fig. 3 »,
    // le tavole d'insieme restano « Tavola IV ».
    cap.appendChild(el('span', 'plate-n', pl.fig ? t('figLabel') + ' ' + pl.fig : t('plateLabel') + ' ' + pl.n));
    cap.appendChild(document.createTextNode(' — ' + tr(pl.cap)));
    fig.appendChild(cap);
    return fig;
  }

  function langTags(obj) {
    return ['it', 'en', 'de'].map(function (l) { return l.toUpperCase() + ' ' + obj[l]; });
  }

  /* ---- Glossario ---- */
  function renderGlossary() {
    $('glossaryTitle').textContent = t('navGlossary');
    $('glossaryIntro').textContent = t('glossaryIntro');
    $('glossaryNote').textContent = t('glossaryNote');

    const list = $('glossaryList');
    clear(list);

    CLASSIFICATIONS.forEach(function (c) {
      const open = !!state.open.class[c.id];

      let extra = null;
      if (open) {
        extra = el('div');
        const sbox = el('div', 'specimen-box');
        const word = el('div', 'specimen-word', c.sample || tr(SAMPLE_WORD));
        word.style.fontFamily = c.font;
        const alpha = el('div', 'specimen-alphabet', 'ABCDEFGHIJ abcdefghij 0123456789');
        alpha.style.fontFamily = c.font;
        sbox.appendChild(word);
        sbox.appendChild(alpha);
        extra.appendChild(sbox);

        if (c.examples) {
          const ex = el('p', 'item-examples');
          ex.appendChild(el('span', 'examples-label', t('exampleLabel') + ': '));
          ex.appendChild(document.createTextNode(c.examples));
          extra.appendChild(ex);
        }
      }

      list.appendChild(accordionItem({
        key: 'class:' + c.id,
        open: open, specimen: 'Aa', font: c.font, plate: c.plate,
        tags: langTags(c.name), name: tr(c.name),
        sub: t('eraLabel') + ' · ' + c.era + (c.novarese ? '  ·  ' + t('novareseLabel') + ': ' + c.novarese : ''),
        desc: tr(c.desc), extra: extra,
        onToggle: function () {
          state.open.class[c.id] = !open;
          if (!open) markViewed('viewedClass', c.id);
          render();
        },
      }));
    });
  }

  /* ---- Anatomia ---- */
  function renderTerms() {
    $('termsTitle').textContent = t('navTerms');
    $('termsIntro').textContent = t('termsIntro');

    const list = $('termsList');
    clear(list);

    /* Tre gruppi: le linee su cui la lettera è costruita, le parti di cui è
       fatta, e i segni che stanno nella tavola del carattere senza essere
       lettere. Fino alla v29 la lista era piatta e il campo "group" nei dati
       non veniva usato: con i segni la sezione arriva a sessanta voci, e
       senza intestazioni si scorreva alla cieca. */
    const groups = [
      { key: 'linee', label: {it:'Linee di costruzione', en:'Construction lines', de:'Konstruktionslinien'} },
      { key: 'parti', label: {it:'Parti della lettera', en:'Parts of the letter', de:'Teile des Buchstabens'} },
      { key: 'segni', label: {it:'Segni e convenzioni', en:'Signs and conventions', de:'Zeichen und Konventionen'} },
    ];

    groups.forEach(function (g) {
      const items = TERMS.filter(function (x) { return x.group === g.key; });
      if (!items.length) return;
      list.appendChild(el('h2', 'group-head', tr(g.label)));
      items.forEach(function (term) {
        const open = !!state.open.term[term.id];
        list.appendChild(accordionItem({
          key: 'term:' + term.id,
          open: open, specimen: term.letter, font: "'EB Garamond', serif", plate: term.plate,
          tags: langTags(term.term), name: tr(term.term), desc: tr(term.def),
          onToggle: function () {
            state.open.term[term.id] = !open;
            if (!open) markViewed('viewedTerm', term.id);
            render();
          },
        }));
      });
    });
  }

  /* ---- Tecnica ---- */
  function renderTechnique() {
    $('techniqueTitle').textContent = t('navTechnique');
    $('techniqueIntro').textContent = t('techniqueIntro');

    const list = $('techniqueList');
    clear(list);

    const groups = [
      { key: 'stampa', label: {it:'Tecnologie di stampa', en:'Printing technologies', de:'Drucktechniken'} },
      { key: 'composizione', label: {it:'Parametri di composizione', en:'Typesetting parameters', de:'Satzparameter'} },
      { key: 'ottica', label: {it:'Correzioni ottiche e percezione', en:'Optical corrections and perception', de:'Optische Korrekturen und Wahrnehmung'} },
    ];

    groups.forEach(function (g) {
      list.appendChild(el('h2', 'group-head', tr(g.label)));
      TECHNIQUES.filter(function (x) { return x.group === g.key; }).forEach(function (x) {
        const open = !!state.open.technique[x.id];
        list.appendChild(accordionItem({
          key: 'technique:' + x.id,
          open: open, tags: langTags(x.term), name: tr(x.term), desc: tr(x.def), plate: x.plate,
          onToggle: function () {
            state.open.technique[x.id] = !open;
            if (!open) markViewed('viewedTechnique', x.id);
            render();
          },
        }));
      });
    });
  }


  /* ---- Type: schede-specimen e carta d'identità ---- */

  // Il colore della scheda viene dalla classificazione, non dal singolo
  // carattere: due neogrottesche avranno sempre lo stesso fondo.
  function classColor(tf) {
    return (tf.cls && CLASS_COLORS[tf.cls]) || CLASS_COLOR_FALLBACK;
  }
  function className(tf) {
    const c = tf.cls && CLASSIFICATIONS.find(function (x) { return x.id === tf.cls; });
    return c ? tr(c.name) : '';
  }

  // L'alfabeto della scheda, nelle quattro righe del modello a stampa
  const SPECIMEN_ROWS = [
    'abcdefghijklmnopqrstuvwxyz',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '1234567890',
    '.,;:?!“”$€-&~%*+−×/=)]}#',
  ];

  // Le quattro famiglie Vox, nell'ordine in cui si leggono: dalle classiche
  // alle calligrafiche. Danno la legenda della griglia e, nella tavola
  // periodica, l'ordine e i raggruppamenti delle colonne.
  const FAMILIES = [
    {ids: ['umanista','garalda','transizionale'],
     lb: {it:'Classiche', en:'Classicals', de:'Klassische'}},
    {ids: ['didone','meccana'],
     lb: {it:'Moderne', en:'Moderns', de:'Moderne'}},
    {ids: ['grottesca','neogrottesca','geometrica','umanisticalineare'],
     lb: {it:'Lineari', en:'Lineals', de:'Lineare'}},
    {ids: ['incisa','scritta','manuale','gotica','nonlatine'],
     lb: {it:'Calligrafiche', en:'Calligraphics', de:'Kalligrafische'}},
  ];

  function typeCard(tf, onClick) {
    const card = el('button', 'tcard');
    card.type = 'button';
    card.style.background = classColor(tf);

    // Le due lettere grandi, in diagonale: sono il segno distintivo del carattere
    const a = el('span', 'tcard-glyph tcard-a', tf.glyphA);
    const b = el('span', 'tcard-glyph tcard-b', tf.glyphB);
    a.style.fontFamily = tf.font; b.style.fontFamily = tf.font;
    card.appendChild(a); card.appendChild(b);

    const cn = className(tf);
    if (cn) card.appendChild(el('span', 'tcard-cls', cn));

    const box = el('div', 'tcard-spec');
    const nm = el('div', 'tcard-name', tf.name);
    nm.style.fontFamily = tf.font;
    box.appendChild(nm);
    SPECIMEN_ROWS.forEach(function (row) {
      const r = el('div', 'tcard-row', row);
      r.style.fontFamily = tf.font;
      box.appendChild(r);
    });
    card.appendChild(box);

    card.addEventListener('click', onClick);
    return card;
  }

  /* ---------- TAVOLA PERIODICA ----------
     Cento caselle disposte come gli elementi: le colonne sono le
     quattordici classi Vox, raggruppate nelle quattro famiglie; dentro
     ogni colonna si scende in ordine di data. La casella porta il numero
     cronologico, il simbolo, il nome e l'anno — e si compone nel carattere
     vero solo quando quel carattere è davvero nella cartella: un campione
     falso insegnerebbe una forma sbagliata. */

  // L'ordine delle colonne è quello delle famiglie: classiche, moderne,
  // lineari, calligrafiche. Coincide con la legenda sotto la tavola.
  const PT_COLS = FAMILIES.reduce(function (acc, f) { return acc.concat(f.ids); }, []);

  function renderPeriodic(host) {
    clear(host);

    host.appendChild(el('h2', 'pt-title', t('periodicTitle')));
    host.appendChild(el('p', 'pt-intro', t('periodicIntro')));

    // La tavola scorre in orizzontale sui telefoni: comprimerla a quattordici
    // colonne su 360 px la renderebbe illeggibile.
    const scroll = el('div', 'pt-scroll');
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', t('periodicTitle'));
    scroll.tabIndex = 0;

    const table = el('div', 'pt-table');

    // Prima riga: la fascia delle quattro famiglie Vox, che nella tavola
    // vera corrisponde ai blocchi. Dice a colpo d'occhio dove finisce un
    // gruppo e comincia il successivo.
    let at = 1;
    FAMILIES.forEach(function (f) {
      const band = el('div', 'pt-band', tr(f.lb));
      band.style.gridColumn = at + ' / span ' + f.ids.length;
      band.style.gridRow = '1';
      band.style.background = 'linear-gradient(90deg,' +
        f.ids.map(function (i) { return CLASS_COLORS[i]; }).join(',') + ')';
      table.appendChild(band);
      at += f.ids.length;
    });

    // Seconda riga: il nome breve della classe, con un filetto del suo colore.
    PT_COLS.forEach(function (cls, ci) {
      const h = el('div', 'pt-head', tr(CLASS_SHORT[cls]) || className({cls: cls}));
      h.title = className({cls: cls});
      h.style.borderBottomColor = CLASS_COLORS[cls];
      h.style.gridColumn = String(ci + 1);
      h.style.gridRow = '2';
      table.appendChild(h);
    });

    // Le caselle, colonna per colonna, in ordine di numero cronologico
    const cells = {};
    PT_COLS.forEach(function (cls, ci) {
      PERIODIC
        .filter(function (x) { return x.cls === cls; })
        .sort(function (a, b) { return a.n - b.n; })
        .forEach(function (x, ri) {
          const c = ptCell(x);
          c.style.gridColumn = String(ci + 1);
          c.style.gridRow = String(ri + 3);
          cells[x.n] = c;
          table.appendChild(c);
        });
    });

    scroll.appendChild(table);
    host.appendChild(scroll);
    ptCells = cells;
    ptScroller = scroll;
    // La tavola scorre in orizzontale: il fumetto deve seguire la casella
    scroll.addEventListener('scroll', placePtPop, { passive: true });

    // Chiavi di lettura: senza, il numero e il ° restano enigmi
    const keys = el('p', 'pt-keys');
    keys.appendChild(el('span', null, t('periodicNumKey')));
    keys.appendChild(el('span', null, t('periodicSubKey')));
    host.appendChild(keys);

    // Il pannello di lettura è un fumetto ancorato alla casella: si apre
    // col primo clic e si chiude col secondo, come una voce di dizionario
    // che si consulta e si richiude senza perdere il segno.
    const pop = el('div', 'pt-pop');
    pop.hidden = true;
    pop.setAttribute('role', 'dialog');
    host.appendChild(pop);
    ptOpen = null;

    function ptCell(x) {
      const b = el('button', 'pt-cell');
      b.type = 'button';
      b.style.background = CLASS_COLORS[x.cls] || CLASS_COLOR_FALLBACK;
      b.setAttribute('aria-label', x.n + '. ' + x.name + ', ' + x.year);

      b.appendChild(el('span', 'pt-n', String(x.n)));
      const sym = el('span', 'pt-sym', x.sym);
      // Il simbolo si compone nel carattere solo se il campione è autentico
      // o un revival dichiarato; altrimenti resta nel carattere dell'app.
      if (x.font) sym.style.fontFamily = x.font;
      if (x.sub) sym.appendChild(el('sup', 'pt-sub-mark', '°'));
      b.appendChild(sym);
      b.appendChild(el('span', 'pt-name', x.name));
      b.appendChild(el('span', 'pt-year', x.year));

      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        // Secondo clic sulla stessa casella: si richiude
        if (ptOpen && ptOpen.n === x.n) return closePtPop(true);
        Object.keys(cells).forEach(function (k) { cells[k].classList.remove('is-on'); });
        b.classList.add('is-on');
        openPtPop(host, scroll, pop, b, x);
        markViewed('viewedTypeface', 'pt-' + x.n);
      });
      return b;
    }
  }

  /* Il fumetto della tavola: uno solo alla volta, ancorato alla casella.
     Lo teniamo in una variabile di modulo perché va chiuso anche da fuori —
     tasto Esc, clic altrove, cambio di vista. */
  var ptOpen = null;

  /* Le caselle dell'ultima tavola disegnata, indicizzate per numero: servono
     alla ricerca, che deve poter aprire una casella senza che l'utente la
     cerchi a occhio dentro cento riquadri. */
  var ptCells = {};
  var ptScroller = null;

  function closePtPop(refocus) {
    if (!ptOpen) return;
    const cell = ptOpen.cell;
    ptOpen.pop.hidden = true;
    cell.classList.remove('is-on');
    cell.setAttribute('aria-expanded', 'false');
    ptOpen = null;
    // Chi naviga da tastiera deve ritrovarsi sulla casella da cui è partito,
    // non in cima alla pagina.
    if (refocus === true) cell.focus();
  }

  function openPtPop(host, scroll, pop, cell, x) {
    ptDetail(pop, x, closePtPop);
    pop.hidden = false;
    cell.setAttribute('aria-expanded', 'true');
    ptOpen = { n: x.n, pop: pop, cell: cell, host: host, scroll: scroll };
    placePtPop();
    pop.focus();
  }

  // Posiziona il fumetto sotto la casella, o sopra se sotto non ci sta.
  // Le coordinate sono relative a .periodic, non allo scroller: dentro lo
  // scroller il fumetto verrebbe tagliato dall'overflow.
  function placePtPop() {
    if (!ptOpen) return;
    const pop = ptOpen.pop, host = ptOpen.host, cell = ptOpen.cell;

    const room = host.clientWidth;
    const w = Math.min(340, room - 8);
    pop.style.width = w + 'px';

    const hr = host.getBoundingClientRect();
    const cr = cell.getBoundingClientRect();
    const h = pop.offsetHeight;

    // Sotto la casella se c'è spazio nella finestra, altrimenti sopra
    const below = cr.bottom + 10 + h <= window.innerHeight || cr.top - 10 - h < 0;
    const top = below ? (cr.bottom - hr.top + 10) : (cr.top - hr.top - h - 10);
    pop.classList.toggle('is-above', !below);

    // Centrato sulla casella, ma senza uscire dai bordi della sezione
    const mid = cr.left + cr.width / 2 - hr.left;
    const left = Math.max(4, Math.min(mid - w / 2, room - w - 4));
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';

    // La punta insegue la casella anche quando il fumetto è stato spostato
    pop.style.setProperty('--pt-arrow', (mid - left) + 'px');
  }

  // Un solo giro di ascoltatori per tutta la vita della pagina: il fumetto
  // viene ricreato a ogni render, ma questi restano validi perché guardano
  // sempre ptOpen.
  document.addEventListener('click', function () { closePtPop(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePtPop(true);
  });
  window.addEventListener('resize', placePtPop);
  window.addEventListener('scroll', placePtPop, { passive: true });

  function ptDetail(panel, x, onClose) {
    clear(panel);
    panel.tabIndex = -1;
    // Un clic dentro il fumetto non lo deve chiudere
    panel.onclick = function (ev) { ev.stopPropagation(); };

    const shut = el('button', 'pt-p-shut', '×');
    shut.type = 'button';
    shut.setAttribute('aria-label', t('periodicClose'));
    shut.addEventListener('click', function () { onClose(true); });
    panel.appendChild(shut);

    const head = el('div', 'pt-p-head');
    head.style.background = CLASS_COLORS[x.cls] || CLASS_COLOR_FALLBACK;
    const badge = el('span', 'pt-p-sym', x.sym);
    if (x.font) badge.style.fontFamily = x.font;
    head.appendChild(badge);
    const ttl = el('div', 'pt-p-titles');
    ttl.appendChild(el('h3', 'pt-p-name', x.name));
    ttl.appendChild(el('p', 'pt-p-num', String(x.n) + ' / 100'));
    head.appendChild(ttl);
    panel.appendChild(head);

    const dl = el('dl', 'pt-p-meta');
    [[t('periodicYear'), x.year],
     [t('periodicBy'), x.by],
     [t('periodicHouse'), x.house],
     [t('periodicCls'), className(x)]].forEach(function (row) {
      if (!row[1] || row[1] === '—') return;
      dl.appendChild(el('dt', null, row[0]));
      dl.appendChild(el('dd', null, row[1]));
    });
    panel.appendChild(dl);

    panel.appendChild(el('p', 'pt-p-note', tr(x.note)));

    // Se la scheda completa esiste, la tavola diventa un indice
    if (x.ref && TYPEFACES.some(function (tf) { return tf.id === x.ref; })) {
      const go = el('button', 'pt-p-go', t('periodicOpenCard') + ' →');
      go.type = 'button';
      go.addEventListener('click', function () {
        state.typeface = x.ref;
        markViewed('viewedTypeface', x.ref);
        render();
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
      panel.appendChild(go);
    } else {
      panel.appendChild(el('p', 'pt-p-nocard', t('periodicNoCard')));
    }

    // La nota sul sostituto va in fondo: è un avvertimento, non il contenuto
    if (x.sub) {
      const n = el('p', 'pt-p-sub');
      n.appendChild(el('span', 'pt-p-sub-lb', t('periodicSubNote')));
      n.appendChild(document.createTextNode(' ' + x.sub));
      panel.appendChild(n);
    }
  }

  /* ---------- PRONTUARIO DEI CARATTERI ----------
     Sta in fondo alla sezione Type, chiuso di default: sono sessantuno
     voci, e aperte allungherebbero la pagina oltre ogni ragionevolezza
     per chi è venuto a guardare le tavole. Il pulsante dichiara quante
     sono, così si sa cosa si sta per aprire.

     La ricerca filtra su tutto il testo della voce, non solo sul nome:
     cercando « Nebiolo » escono i caratteri torinesi, cercando « Granjon »
     escono anche quelli che lo hanno come prototipo senza portarne il
     nome. È il modo in cui si cerca davvero in un prontuario.

     Il filtro non passa da render(): riscrivere sessantuno schede a ogni
     tasto premuto fa scattare la tastiera su telefono. Si nascondono e si
     mostrano le schede già in pagina, che è istantaneo. */

  // Da un nome citato fra i modelli alla voce del prontuario, se c'è.
  // Il confronto ignora maiuscole e spazi ai bordi: nei manuali lo stesso
  // carattere compare come « Gill Sans », « Gill Sans Pro », « Gill Sans MT ».
  function handbookByName(name) {
    const n = name.trim().toLowerCase();
    if (!n) return null;
    return HANDBOOK.find(function (h) {
      const hn = h.name.toLowerCase();
      return hn === n || n.indexOf(hn) === 0;
    }) || null;
  }

  function renderHandbook(host) {
    clear(host);

    // Il pulsante: dice cosa apre e quante voci contiene, perché aprire
    // sessantuno schede senza preavviso è sgradevole.
    const btn = el('button', 'hb-toggle');
    btn.type = 'button';
    btn.setAttribute('aria-expanded', state.hbOpen ? 'true' : 'false');
    btn.setAttribute('aria-controls', 'hbBody');
    btn.innerHTML = icon('book') +
      '<span class="hb-toggle-label">' + t('hbTitle') + '</span>' +
      '<span class="hb-toggle-n">' + HANDBOOK.length + ' ' + t('hbEntries') + '</span>' +
      '<span class="hb-toggle-sign" aria-hidden="true">' + (state.hbOpen ? '−' : '+') + '</span>';
    btn.addEventListener('click', function () {
      state.hbOpen = !state.hbOpen;
      if (!state.hbOpen) { state.hbQuery = ''; state.hbTarget = null; }
      renderHandbook(host);
      if (state.hbOpen) {
        const b = $('hbBody');
        if (b) b.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });
    host.appendChild(btn);

    const body = el('div', 'hb-body');
    body.id = 'hbBody';
    if (!state.hbOpen) { body.hidden = true; host.appendChild(body); return; }

    body.appendChild(el('p', 'hb-intro', t('hbIntro')));

    // Ricerca
    const tools = el('div', 'hb-tools');
    const lab = el('label', 'sr-only', t('hbSearch'));
    lab.htmlFor = 'hbSearch';
    const inp = el('input', 'hb-search');
    inp.type = 'search';
    inp.id = 'hbSearch';
    inp.placeholder = t('hbSearch');
    inp.value = state.hbQuery;
    inp.autocomplete = 'off';
    const count = el('p', 'hb-count');
    count.setAttribute('role', 'status');
    tools.appendChild(lab); tools.appendChild(inp); tools.appendChild(count);
    body.appendChild(tools);

    const list = el('div', 'hb-list');

    HANDBOOK.forEach(function (h) {
      const card = el('article', 'hb-card');
      card.id = 'hb-' + h.id;
      // Tutto il testo della voce, per la ricerca: nome, fonderia,
      // disegnatore, anni, prototipo e nota.
      card.dataset.hay = [h.name, h.house, h.by || '', h.years, h.model || '',
        tr(h.note)].join(' ').toLowerCase();
      if (state.hbTarget === h.id) card.classList.add('hb-target');

      const head = el('div', 'hb-head');
      const dot = el('span', 'hb-dot');
      dot.style.background = h.cls ? CLASS_COLORS[h.cls] : CLASS_COLOR_FALLBACK;
      if (!h.cls) dot.title = t('hbNoClass');
      else {
        const cl = CLASSIFICATIONS.find(function (c) { return c.id === h.cls; });
        dot.title = tr(CLASS_SHORT[h.cls]) || (cl ? tr(cl.name) : h.cls);
      }
      head.appendChild(dot);
      head.appendChild(el('h4', 'hb-name', h.name));
      head.appendChild(el('span', 'hb-house', h.house));
      card.appendChild(head);

      const meta = el('p', 'hb-meta');
      meta.textContent = (h.by || t('hbUnknown')) + ' · ' + h.years;
      card.appendChild(meta);

      if (h.model) {
        const m = el('p', 'hb-model');
        m.appendChild(el('span', 'hb-lab', t('hbModel')));
        m.appendChild(document.createTextNode(' ' + h.model));
        card.appendChild(m);
      }

      card.appendChild(el('p', 'hb-note', tr(h.note)));

      const foot = el('p', 'hb-foot');
      if (h.variants && h.variants !== 'D>—') {
        foot.appendChild(el('span', 'hb-var', t('hbVariants') + ' ' + h.variants));
      }
      // Dove la scheda esiste già, si va lì invece di raccontarlo due volte.
      if (h.ref) {
        const link = el('button', 'hb-card-link');
        link.type = 'button';
        link.textContent = t('hbSeeCard') + ' →';
        link.addEventListener('click', function () {
          state.typeface = h.ref;
          render();
          window.scrollTo({ top: 0, behavior: 'auto' });
        });
        foot.appendChild(link);
      }
      if (foot.children.length) card.appendChild(foot);

      list.appendChild(card);
    });

    body.appendChild(list);

    const none = el('p', 'hb-none', t('hbNoResults'));
    none.hidden = true;
    body.appendChild(none);

    const notes = el('div', 'hb-notes');
    [t('hbNoteKeys'), t('hbNoteSource')].forEach(function (n) {
      notes.appendChild(el('p', null, n));
    });
    body.appendChild(notes);

    host.appendChild(body);

    // Il filtro agisce sulle schede già in pagina: nessun ridisegno, e
    // quindi nessuna perdita di fuoco mentre si digita.
    function filter() {
      const q = inp.value.trim().toLowerCase();
      state.hbQuery = inp.value;
      let n = 0;
      const cards = list.querySelectorAll('.hb-card');
      cards.forEach(function (c) {
        const hit = !q || c.dataset.hay.indexOf(q) > -1;
        c.hidden = !hit;
        if (hit) n++;
      });
      none.hidden = n > 0;
      count.textContent = q ? n + ' ' + t('hbFound') : '';
    }
    inp.addEventListener('input', filter);
    if (state.hbQuery) filter();

    // Arrivando da un modello della tavola, si va dritti alla voce.
    if (state.hbTarget) {
      const target = $('hb-' + state.hbTarget);
      if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      state.hbTarget = null;
    }
  }

  /* ---------- TAVOLA DI RICONOSCIMENTO ----------
     Non è una tabella ma una sequenza di schede, una per gruppo, e la
     ragione è di misura: i campioni vanno visti larghi, e una cella di
     tabella su 360 px li strozzerebbe. Ogni scheda ha tre fasce — le
     lettere-spia in corpo grande, i cinque parametri, i campioni composti
     nella stessa pangramma — e si legge da sinistra a destra come una
     dimostrazione: questo è il parametro, questo è il carattere, guarda
     se torna.

     La pangramma è la stessa per tutti e per tutte le lingue, e deve
     restarlo: cambiandola per lingua le righe non si confronterebbero più
     fra loro, che è l'unica cosa che questa tavola sa fare. */
  function renderRecognition(host) {
    clear(host);

    host.appendChild(el('h2', 'rec-title', t('recogTitle')));
    host.appendChild(el('p', 'rec-intro', t('recogIntro')));
    host.appendChild(el('p', 'rec-keyswhy', t('recogKeysWhy')));

    RECOGNITION.forEach(function (g) {
      const tint = CLASS_COLORS[g.cls] || CLASS_COLOR_FALLBACK;

      const card = el('section', 'rec-card');
      card.style.setProperty('--rec-tint', tint);

      // Testata: numerazione di Rossi, nome del gruppo, pastiglia di classe
      const head = el('div', 'rec-head');
      if (g.num && g.num !== '—') head.appendChild(el('span', 'rec-num', g.num));
      head.appendChild(el('h3', 'rec-name', tr(g.name)));
      const cl = CLASSIFICATIONS.find(function (c) { return c.id === g.cls; });
      const badge = el('span', 'rec-badge',
        tr(CLASS_SHORT[g.cls]) || (cl ? tr(cl.name) : g.cls));
      badge.style.background = tint;
      head.appendChild(badge);
      card.appendChild(head);

      // Le lettere-spia, in corpo grande e nel primo campione del gruppo:
      // se il gruppo non ne ha, restano nel carattere dell'interfaccia
      // invece di mentire su una forma.
      const keys = el('div', 'rec-keys');
      keys.setAttribute('aria-label', t('recogKeys'));
      if (g.spec.length) keys.style.fontFamily = g.spec[0].font;
      g.keys.split('').forEach(function (ch) {
        keys.appendChild(el('span', 'rec-key', ch));
      });
      card.appendChild(keys);

      // I cinque parametri. Dove il gruppo non ne prevede uno la voce
      // sparisce del tutto: una riga « — » suggerirebbe che il parametro
      // esiste e non lo si conosce, che è un'altra cosa.
      const pars = el('dl', 'rec-pars');
      [['recogSerif', 'serif'], ['recogContrast', 'contrast'],
       ['recogAxis', 'axis'], ['recogBar', 'bar'],
       ['recogTerm', 'term']].forEach(function (p) {
        const v = g.par[p[1]];
        if (!v) return;
        pars.appendChild(el('dt', null, t(p[0])));
        pars.appendChild(el('dd', null, typeof v === 'string' ? v : tr(v)));
      });
      card.appendChild(pars);

      card.appendChild(el('p', 'rec-desc', tr(g.desc)));

      // I modelli storici, uno per uno. Quelli che hanno una voce nel
      // prontuario diventano pulsanti: senza, restavano nomi che non
      // portavano da nessuna parte. Gli altri restano testo, perché un
      // finto collegamento che non apre nulla è peggio di nessuno.
      const mod = el('p', 'rec-models');
      mod.appendChild(el('span', 'rec-label', t('recogModels')));
      mod.appendChild(document.createTextNode(' '));
      g.models.split(',').forEach(function (raw, i) {
        if (i) mod.appendChild(document.createTextNode(', '));
        const name = raw.trim();
        const entry = handbookByName(name);
        if (!entry) { mod.appendChild(document.createTextNode(name)); return; }
        const b = el('button', 'rec-model-link');
        b.type = 'button';
        b.textContent = name;
        b.title = t('hbTitle');
        b.addEventListener('click', function () {
          state.hbOpen = true;
          state.hbQuery = '';
          state.hbTarget = entry.id;
          renderHandbook($('typeHandbook'));
        });
        mod.appendChild(b);
      });
      card.appendChild(mod);

      // I campioni: nome a sinistra, pangramma a destra nella famiglia
      // dichiarata. Il nome del carattere è composto nell'interfaccia,
      // non nel campione: serve a leggerlo, non a mostrarlo.
      const specs = el('div', 'rec-specs');
      if (!g.spec.length) {
        specs.appendChild(el('p', 'rec-nospec', t('recogNoSpec')));
      } else {
        g.spec.forEach(function (s) {
          const row = el('div', 'rec-spec');

          const lab = el('div', 'rec-spec-name');
          lab.appendChild(el('strong', null, s.name));
          if (s.sub) {
            lab.appendChild(el('span', 'rec-spec-sub',
              t('recogSubFor') + ' ' + s.sub));
          }
          row.appendChild(lab);

          const line = el('div', 'rec-spec-line', PANGRAM);
          line.style.fontFamily = s.font;
          row.appendChild(line);

          specs.appendChild(row);
        });
      }
      card.appendChild(specs);

      host.appendChild(card);
    });

    const notes = el('div', 'rec-notes');
    [t('recogNoteRossi'), t('recogNote')].forEach(function (n) {
      notes.appendChild(el('p', null, n));
    });
    host.appendChild(notes);
  }

  /* ---------- CONCORDANZA DELLE CLASSIFICAZIONI ----------
     Segue la tavola periodica come una chiave di lettura: la tavola dice
     dove sta un carattere, questa tabella dice come chiamano quel posto i
     sei sistemi che si incontrano nei manuali, in ordine di data: Thibaudeau
     1921, Vox 1954, Novarese 1957, BS 2961:1967, Bringhurst 1992, Rossi
     2017. Letta da sinistra a destra, una riga è anche la storia di come
     quella classe è stata via via nominata. Le righe sono le stesse
     quattordici classi, nello stesso ordine e con la stessa tinta delle
     colonne della tavola: chi ha appena guardato la tavola ritrova qui i
     colori e non deve reimparare nulla.

     È una tabella vera — <table>, con <th scope> — e non una griglia di
     <div>: qui i dati sono tabulari sul serio, e uno screen reader deve
     poter annunciare « riga Didone, colonna Novarese, Neoclassiche ». */
  /* ---- Le proposte di classificazione ----
     Una lista cronologica, non una tabella: le righe non si confrontano
     fra loro colonna per colonna, si scorrono. Le sei che l'app usa
     davvero portano un segno e una pastiglia, così la domanda « perché
     proprio queste? » trova risposta prima di essere posta. */
  function renderProposals(host) {
    clear(host);

    host.appendChild(el('h2', 'sys-title', t('propTitle')));
    host.appendChild(el('p', 'sys-intro', t('propIntro')));

    const ul = el('ol', 'prop-list');
    CLASS_PROPOSALS.forEach(function (p) {
      const li = el('li', 'prop-item' + (p.used ? ' prop-used' : ''));

      const yr = el('span', 'prop-year', p.year);
      li.appendChild(yr);

      const main = el('div', 'prop-main');
      main.appendChild(el('span', 'prop-by', p.by));
      main.appendChild(el('span', 'prop-title', p.title));
      if (p.alt) main.appendChild(el('span', 'prop-alt', p.alt));
      if (p.note) main.appendChild(el('span', 'prop-note', tr(p.note)));
      if (p.used) {
        const badge = el('span', 'prop-badge', t('propUsed'));
        main.appendChild(badge);
      }
      li.appendChild(main);
      ul.appendChild(li);
    });
    host.appendChild(ul);

    host.appendChild(el('p', 'prop-source', t('propNote')));
  }

  function renderSystems(host) {
    clear(host);

    host.appendChild(el('h2', 'sys-title', t('systemsTitle')));
    host.appendChild(el('p', 'sys-intro', t('systemsIntro')));

    // Nove colonne non stanno in 360 px: si scorre, come la tavola.
    const scroll = el('div', 'sys-scroll');
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', t('systemsTitle'));
    scroll.tabIndex = 0;

    const table = el('table', 'sys-table');
    const cap = el('caption', 'sr-only', t('systemsTitle'));
    table.appendChild(cap);

    const thead = el('thead');
    const hr = el('tr');
    ['systemsColClass', 'systemsColThi', 'systemsColVox', 'systemsColNov',
     'systemsColBs', 'systemsColBri', 'systemsColRos', 'systemsColEra',
     'systemsColEx'].forEach(function (k) {
      const th = el('th', null, t(k));
      th.scope = 'col';
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    const tb = el('tbody');
    CLASS_SYSTEMS.forEach(function (s) {
      const cl = CLASSIFICATIONS.find(function (c) { return c.id === s.cls; });
      const tr_ = el('tr');

      // Prima cella: il nome della classe, con la pastiglia del suo colore.
      // È la stessa tinta della colonna nella tavola qui sopra.
      const th = el('th', 'sys-cls');
      th.scope = 'row';
      const sw = el('span', 'sys-sw');
      sw.style.background = CLASS_COLORS[s.cls] || CLASS_COLOR_FALLBACK;
      th.appendChild(sw);
      th.appendChild(document.createTextNode(
        tr(CLASS_SHORT[s.cls]) || (cl ? tr(cl.name) : s.cls)));
      tr_.appendChild(th);

      // Ogni sistema copre una porzione diversa del campo: dove non prevede
      // nulla la cella porta una lineetta, e le note sotto la tabella
      // spiegano perché. Inventare un nome sarebbe peggio di lasciarla vuota.
      ['thi', 'vox', 'nov', 'bs', 'bri', 'ros'].forEach(function (k) {
        const td = el('td', 'sys-src');
        const v = s[k];
        if (v) { td.textContent = typeof v === 'string' ? v : tr(v); }
        else { td.textContent = '—'; td.className = 'sys-src sys-none'; }
        tr_.appendChild(td);
      });

      tr_.appendChild(el('td', 'sys-era', tr(s.era)));
      tr_.appendChild(el('td', 'sys-ex', cl && cl.examples ? cl.examples : ''));

      tb.appendChild(tr_);
    });
    table.appendChild(tb);

    scroll.appendChild(table);
    host.appendChild(scroll);

    // Le note: senza, i due segni e le caselle vuote restano enigmi
    const notes = el('div', 'sys-notes');
    [t('systemsNoteThi'), t('systemsNoteAtypi'), t('systemsNoteLineal'),
     t('systemsNoteNov'), t('systemsNoteBri'), t('systemsNoteRos'),
     t('systemsDeadopted')].forEach(function (n) {
      notes.appendChild(el('p', null, n));
    });
    host.appendChild(notes);
  }

  function renderType() {
    const grid = $('typeGrid'), detail = $('typeDetail');
    const open = state.typeface && TYPEFACES.find(function (x) { return x.id === state.typeface; });
    grid.hidden = !!open;
    detail.hidden = !open;
    if (open) return renderTypeDetail(detail, open);

    $('typeTitle').textContent = t('navType');
    $('typeIntro').textContent = t('typeIntro');
    // La tavola sta in primo piano: è l'indice della sezione, le schede
    // che seguono ne sono l'approfondimento.
    renderPeriodic($('typePeriodic'));
    // Subito sotto la tavola, la concordanza fra i sistemi: la tavola dice
    // dove sta un carattere, la tabella come si chiama quel posto altrove.
    // Prima della concordanza, la cronologia delle proposte: senza, le sei
    // colonne della tabella sembrano una scelta arbitraria.
    renderProposals($('typeProposals'));
    renderSystems($('typeSystems'));
    // E in fondo la tavola di riconoscimento: la concordanza dice come si
    // chiama una classe, questa come si riconosce su un campione.
    renderRecognition($('typeRecognition'));
    // Il prontuario chiude la sezione, chiuso di default: è la risposta
    // alla domanda « e questo Galliard, che roba è? » che le due tavole
    // qui sopra fanno nascere e non possono soddisfare.
    renderHandbook($('typeHandbook'));
    // Legenda: senza, il colore resta un vezzo. Con, diventa una chiave
    // di lettura che si impara guardando la griglia due volte.
    const leg = $('typeLegend');
    clear(leg);
    FAMILIES.forEach(function (f) {
      const item = el('span', 'legend-item');
      const sw = el('span', 'legend-sw');
      // la pastiglia mostra le tinte del gruppo, dalla più chiara alla più scura
      sw.style.background = 'linear-gradient(90deg,' +
        f.ids.map(function (i) { return CLASS_COLORS[i]; }).join(',') + ')';
      item.appendChild(sw);
      item.appendChild(document.createTextNode(tr(f.lb)));
      leg.appendChild(item);
    });

    const list = $('typeList');
    clear(list);
    TYPEFACES.forEach(function (tf) {
      list.appendChild(typeCard(tf, function () {
        state.typeface = tf.id;
        markViewed('viewedTypeface', tf.id);
        render();
        window.scrollTo({ top: 0, behavior: 'auto' });
      }));
    });
  }

  function renderTypeDetail(box, tf) {
    clear(box);

    const back = el('button', 'back-link', '← ' + t('backToType'));
    back.type = 'button';
    back.addEventListener('click', function () { state.typeface = null; render(); });
    box.appendChild(back);

    const head = el('div', 'tdetail-head');
    const h1 = el('h1', 'tdetail-name', tf.name);
    h1.style.fontFamily = tf.font;
    head.appendChild(h1);
    const meta = [className(tf), tf.year, tf.designer, tf.foundry]
      .filter(function (x) { return x && x !== '—'; });
    if (meta.length) head.appendChild(el('p', 'tdetail-meta', meta.join('  ·  ')));
    box.appendChild(head);

    // La riga di campione, nel carattere stesso
    const spec = el('div', 'tdetail-spec');
    spec.style.background = classColor(tf);
    SPECIMEN_ROWS.slice(0, 2).forEach(function (row) {
      const r = el('div', 'tdetail-row', row);
      r.style.fontFamily = tf.font;
      spec.appendChild(r);
    });
    box.appendChild(spec);

    if (tf.quote) {
      const q = el('blockquote', 'tdetail-quote');
      q.appendChild(el('p', null, tr(tf.quote.text)));
      q.appendChild(el('cite', null, '— ' + tf.quote.author));
      box.appendChild(q);
    }

    box.appendChild(el('p', 'tdetail-body', tr(tf.desc)));

    [['recognize', 'recognizeLabel'], ['where', 'whereLabel']].forEach(function (pair) {
      if (!tf[pair[0]]) return;
      box.appendChild(el('h2', 'tdetail-sub', t(pair[1])));
      box.appendChild(el('p', 'tdetail-body', tr(tf[pair[0]])));
    });

    // Il link esterno chiude la scheda, come il rimando in fondo a una voce
    if (tf.link) {
      const a = document.createElement('a');
      a.className = 'tdetail-link';
      a.href = tf.link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = tf.link.label + ' ↗';
      box.appendChild(a);
    }

    // La nota sul campione va in fondo: è un avvertimento, non il contenuto
    if (tf.substitute) {
      const n = el('div', 'tdetail-note');
      n.appendChild(el('span', 'tdetail-note-lb', t('substituteLabel')));
      n.appendChild(el('p', null, tr(tf.substitute)));
      box.appendChild(n);
    }
  }

  /* ---- Storia ---- */
  function renderHistory() {
    $('historyTitle').textContent = t('navHistory');
    $('historyIntro').textContent = t('historyIntro');
    const list = $('timelineList');
    clear(list);

    // Le date non sono in ordine crescente nel file (1816 sta dopo 1818):
    // qui si ordinano, così la timeline resta coerente comunque si scriva data.js.
    TIMELINE.slice().sort(function (a, b) { return a.year - b.year; }).forEach(function (ev) {
      const open = !!state.open.event[ev.year];
      const row = el('div', 'tl-row');
      row.dataset.key = 'event:' + ev.year;

      row.appendChild(el('div', 'tl-year', String(ev.year)));

      const line = el('div', 'tl-line');
      line.appendChild(el('div', 'tl-dot'));
      row.appendChild(line);

      const card = el('button', 'tl-card');
      card.type = 'button';
      card.setAttribute('aria-expanded', String(open));
      card.appendChild(el('div', 'tl-title', tr(ev.title)));
      if (open) card.appendChild(el('div', 'tl-desc', tr(ev.desc)));
      card.addEventListener('click', function () {
        state.open.event[ev.year] = !open;
        if (!open) markViewed('viewedEvent', ev.year);
        render();
      });
      row.appendChild(card);
      list.appendChild(row);
    });
  }

  /* ---- Designer ---- */
  function renderDesigners() {
    $('designersTitle').textContent = t('navDesigners');
    $('designersIntro').textContent = t('designersIntro');
    const grid = $('designersList');
    clear(grid);

    DESIGNERS.forEach(function (d) {
      const open = !!state.open.designer[d.id];
      const tile = el('button', 'tile designer');
      tile.type = 'button';
      tile.dataset.key = 'designer:' + d.id;
      tile.setAttribute('aria-expanded', String(open));

      const head = el('div', 'designer-head');
      if (d.img) {
        const img = document.createElement('img');
        img.className = 'designer-photo';
        img.src = d.img;
        img.alt = d.name;
        img.loading = 'lazy';
        head.appendChild(img);
      } else {
        // Senza ritratto: monogramma con le iniziali, così la griglia
        // non ha buchi e la scheda resta riconoscibile.
        head.appendChild(el('div', 'designer-photo designer-mono', initials(d.name)));
      }

      const info = el('div');
      info.appendChild(el('div', 'designer-name', d.name));
      info.appendChild(el('div', 'designer-years', tr(d.years) + (d.place ? ' · ' + tr(d.place) : '')));
      head.appendChild(info);
      tile.appendChild(head);

      tile.appendChild(el('div', 'designer-known', tr(d.knownFor)));
      if (open) tile.appendChild(el('div', 'designer-bio', tr(d.bio)));

      tile.addEventListener('click', function () {
        state.open.designer[d.id] = !open;
        if (!open) markViewed('viewedDesigner', d.id);
        render();
      });
      grid.appendChild(tile);
    });
  }

  /* ---- Profilo ---- */
  function renderProfile() {
    $('profileTitle').textContent = t('navProfile');
    $('profileIntro').textContent = t('profileIntro');

    const level = Math.floor(state.profile.xp / 100) + 1;
    const pct = state.profile.xp % 100;
    $('levelNum').textContent = level;
    $('levelLabel').textContent = t('level');
    $('levelFill').style.width = pct + '%';
    $('levelMeta').textContent = state.profile.xp + ' XP · ' + (100 - pct) + ' XP ' + t('xpToNext');

    const n = counts();
    const stats = [
      { v: n.cls + '/' + CLASSIFICATIONS.length, l: t('statClassifications') },
      { v: n.ter + '/' + TERMS.length, l: t('statTerms') },
      { v: n.tec + '/' + TECHNIQUES.length, l: t('statTechniques') },
      { v: n.typ + '/' + TYPEFACES.length, l: t('statTypefaces') },
      { v: n.ev + '/' + TIMELINE.length, l: t('statTimeline') },
      { v: n.des + '/' + DESIGNERS.length, l: t('statDesigners') },
      { v: state.profile.bestFont + '/' + QUIZ_LEN, l: t('statBestFont') },
      { v: state.profile.bestTerms + '/' + QUIZ_LEN, l: t('statBestTerms') },
      { v: state.profile.bestTechnique + '/' + QUIZ_LEN, l: t('statBestTechnique') },
      { v: state.profile.bestHistory + '/' + QUIZ_LEN, l: t('statBestHistory') },
    ];
    const box = $('profileStats');
    clear(box);
    stats.forEach(function (s) {
      const b = el('div', 'stat-box');
      b.appendChild(el('div', 'stat-value', s.v));
      b.appendChild(el('div', 'stat-label', s.l));
      box.appendChild(b);
    });

    $('resetBtn').textContent = t('resetProgress');
  }

  /* ============ 6. QUIZ ============ */

  const QUIZ_LEN = 8;

  const QUIZ_TYPES = {
    font:      { pool: function () { return CLASSIFICATIONS; }, best: 'bestFont' },
    history:   { pool: function () { return TIMELINE; },        best: 'bestHistory' },
    terms:     { pool: function () { return TERMS; },           best: 'bestTerms' },
    technique: { pool: function () { return TECHNIQUES; },      best: 'bestTechnique' },
  };

  function startQuiz(type) {
    state.exMode = 'quiz';
    state.quizType = type;
    state.questions = shuffle(QUIZ_TYPES[type].pool()).slice(0, QUIZ_LEN);
    state.qIndex = 0; state.qScore = 0; state.qSelected = null; state.qFinished = false;
    buildChoices();
    render();
  }

  // Le opzioni si generano una sola volta per domanda: se le rigenerassimo a
  // ogni render, cambierebbero ordine a ogni clic.
  function buildChoices() {
    const q = state.questions[state.qIndex];
    if (!q) { state.qChoices = []; return; }
    let correct, distractors;

    if (state.quizType === 'font') {
      correct = tr(q.name);
      distractors = shuffle(CLASSIFICATIONS.filter(function (c) { return c.id !== q.id; }))
        .slice(0, 3).map(function (c) { return tr(c.name); });
    } else if (state.quizType === 'history') {
      correct = String(q.year);
      distractors = shuffle(TIMELINE.filter(function (e) { return e.year !== q.year; }))
        .slice(0, 3).map(function (e) { return String(e.year); });
    } else if (state.quizType === 'terms') {
      correct = tr(q.term);
      distractors = shuffle(TERMS.filter(function (x) { return x.id !== q.id; }))
        .slice(0, 3).map(function (x) { return tr(x.term); });
    } else {
      correct = tr(q.term);
      distractors = shuffle(TECHNIQUES.filter(function (x) { return x.id !== q.id; }))
        .slice(0, 3).map(function (x) { return tr(x.term); });
    }
    state.qChoices = shuffle([correct].concat(distractors)).map(function (label) {
      return { label: label, correct: label === correct };
    });
  }

  function answer(choice) {
    if (state.qSelected !== null) return;
    state.qSelected = choice.label;
    if (choice.correct) { state.qScore++; addXp(10); }
    render();
  }

  function nextQuestion() {
    const next = state.qIndex + 1;
    if (next >= state.questions.length) {
      const key = QUIZ_TYPES[state.quizType].best;
      if (state.qScore > state.profile[key]) { state.profile[key] = state.qScore; persist(); }
      state.qFinished = true;
    } else {
      state.qIndex = next;
      state.qSelected = null;
      buildChoices();
    }
    render();
  }

  function finishMessage() {
    const s = state.qScore, type = state.quizType;
    const high = {
      font: {it:'Occhio da compositore: distingui una grottesca da una geometrica al volo.', en:'A compositor’s eye: you spot a grotesque from a geometric sans on sight.', de:'Ein Setzer-Auge: du erkennst eine Grotesk auf den ersten Blick.'},
      terms: {it:'Parli tipografia come un compositore di professione.', en:'You talk typography like a professional compositor.', de:'Du sprichst Typografie wie ein Fachsetzer.'},
      technique: {it:'Conosci il mestiere, non solo le forme: dal punzone alla giustezza.', en:'You know the craft, not just the shapes: from punch to measure.', de:'Du kennst das Handwerk, nicht nur die Formen: vom Stempel bis zur Satzbreite.'},
      history: {it:'Conosci la timeline meglio di molti storici della stampa.', en:'You know the timeline better than most print historians.', de:'Du kennst die Zeitleiste besser als die meisten Druckhistoriker.'},
    };
    const mid = {
      font: {it:'Buona base: gli assi di contrasto cominciano a saltare all’occhio.', en:'Solid base: stress axes are starting to jump out at you.', de:'Solide Basis: Kontrastachsen fallen dir schon auf.'},
      terms: {it:'I termini principali sono chiari, gli altri arriveranno con la pratica.', en:'The core terms stick; the rest will come with practice.', de:'Die wichtigsten Begriffe sitzen, der Rest kommt mit Übung.'},
      technique: {it:'Le tecniche principali sono chiare, i parametri di composizione meno.', en:'The main techniques are clear; the typesetting parameters less so.', de:'Die Haupttechniken sitzen, die Satzparameter weniger.'},
      history: {it:'Le date principali sono chiare, i dettagli ancora da fissare.', en:'The big dates stick; the finer details still need work.', de:'Die wichtigen Daten sitzen, Details noch nicht ganz.'},
    };
    const low = {
      font: {it:'Rivedi il glossario: parti dalle grazie, poi passa all’asse di contrasto.', en:'Revisit the glossary: start from the serifs, then the stress axis.', de:'Sieh dir das Glossar noch einmal an: erst die Serifen, dann die Achse.'},
      terms: {it:'Rivedi l’anatomia: occhielli, grazie e linee di costruzione.', en:'Revisit the anatomy: counters, serifs and construction lines.', de:'Sieh dir die Anatomie noch einmal an: Punzen, Serifen, Konstruktionslinien.'},
      technique: {it:'Rivedi la sezione tecnica: prima le tecnologie, poi la composizione.', en:'Revisit the technique section: technologies first, then typesetting.', de:'Sieh dir den Technik-Teil noch einmal an: erst die Technologien, dann den Satz.'},
      history: {it:'Rileggi la timeline: ventitré date, un secolo alla volta.', en:'Reread the timeline: twenty-three dates, one century at a time.', de:'Lies die Zeitleiste noch einmal: dreiundzwanzig Daten, ein Jahrhundert nach dem anderen.'},
    };
    return tr(s >= 7 ? high[type] : s >= 4 ? mid[type] : low[type]);
  }

  function renderExercises() {
    $('exercisesTitle').textContent = t('navExercises');
    const menu = $('exMenu'), quizBox = $('exQuiz');
    menu.hidden = state.exMode !== 'menu';
    quizBox.hidden = state.exMode !== 'quiz';

    if (state.exMode === 'menu') return renderExMenu(menu);
    return renderQuiz(quizBox);
  }

  function renderExMenu(menu) {
    clear(menu);
    const items = [
      { type:'font', glyph:'Aa', font:"'EB Garamond', serif", color:'var(--accent1)',
        title:t('quizFontTitle'), desc:t('quizFontDesc'), best:state.profile.bestFont },
      { type:'terms', glyph:'x', font:"'Cinzel', serif", color:'var(--accent3)',
        title:t('quizTermsTitle'), desc:t('quizTermsDesc'), best:state.profile.bestTerms },
      { type:'technique', glyph:'¶', font:"'PT Serif', serif", color:'var(--accent2-dark)',
        title:t('quizTechniqueTitle'), desc:t('quizTechniqueDesc'), best:state.profile.bestTechnique },
      { type:'history', glyph:'1501', font:"'Blacker Pro Text', serif", color:'var(--accent4)',
        title:t('quizHistoryTitle'), desc:t('quizHistoryDesc'), best:state.profile.bestHistory },
    ];
    items.forEach(function (q) {
      const tile = el('button', 'tile');
      tile.type = 'button';
      const g = el('span', 'tile-glyph', q.glyph);
      g.style.fontFamily = q.font;
      g.style.color = q.color;
      if (q.glyph.length > 2) g.style.fontSize = '56px';
      tile.appendChild(g);
      tile.appendChild(el('span', 'tile-title', q.title));
      tile.appendChild(el('span', 'tile-desc', q.desc));
      tile.appendChild(el('span', 'tile-meta', t('bestScoreLabel') + ': ' + q.best + '/' + QUIZ_LEN));
      tile.addEventListener('click', function () { startQuiz(q.type); });
      menu.appendChild(tile);
    });
  }

  function renderQuiz(box) {
    clear(box);

    const back = el('button', 'back-link', '← ' + t('backToTabs'));
    back.type = 'button';
    back.addEventListener('click', function () { state.exMode = 'menu'; render(); });
    box.appendChild(back);

    if (state.qFinished) {
      const done = el('div', 'quiz-done');
      done.appendChild(el('div', 'done-score', state.qScore + '/' + QUIZ_LEN));
      done.appendChild(el('div', 'done-msg', finishMessage()));
      const actions = el('div', 'done-actions');
      const again = el('button', 'btn-outline', t('playAgain'));
      again.type = 'button';
      again.addEventListener('click', function () { startQuiz(state.quizType); });
      const exit = el('button', 'btn-solid', t('backToTabs'));
      exit.type = 'button';
      exit.addEventListener('click', function () { state.exMode = 'menu'; render(); });
      actions.appendChild(again);
      actions.appendChild(exit);
      done.appendChild(actions);
      box.appendChild(done);
      return;
    }

    const q = state.questions[state.qIndex];
    if (!q) return;

    const bar = el('div', 'quiz-bar');
    bar.appendChild(el('span', 'quiz-count', t('question') + ' ' + (state.qIndex + 1) + ' ' + t('of') + ' ' + QUIZ_LEN));
    bar.appendChild(el('span', 'quiz-score', t('score') + ': ' + state.qScore));
    box.appendChild(bar);

    const card = el('div', 'quiz-card');
    if (state.quizType === 'font') {
      card.appendChild(el('div', 'quiz-prompt', t('whichClass')));
      const spec = el('div', 'quiz-specimen', q.sample || tr(SAMPLE_WORD));
      spec.style.fontFamily = q.font;
      card.appendChild(spec);
    } else if (state.quizType === 'history') {
      card.appendChild(el('div', 'quiz-prompt', t('whichYear')));
      card.appendChild(el('div', 'quiz-text', '“' + tr(q.title) + '”'));
    } else if (state.quizType === 'terms') {
      card.appendChild(el('div', 'quiz-prompt', t('whichTerm')));
      card.appendChild(el('div', 'quiz-text', firstSentence(tr(q.def))));
    } else {
      card.appendChild(el('div', 'quiz-prompt', t('whichTechnique')));
      card.appendChild(el('div', 'quiz-text', firstSentence(tr(q.def))));
    }
    box.appendChild(card);

    const answered = state.qSelected !== null;
    const choices = el('div', 'quiz-choices');
    state.qChoices.forEach(function (c) {
      let cls = 'choice';
      if (answered) {
        if (c.correct) cls += ' right';
        else if (c.label === state.qSelected) cls += ' wrong';
      }
      const btn = el('button', cls, c.label);
      btn.type = 'button';
      btn.disabled = answered;
      btn.addEventListener('click', function () { answer(c); });
      choices.appendChild(btn);
    });
    box.appendChild(choices);

    if (answered) {
      const wasRight = state.qChoices.some(function (c) { return c.correct && c.label === state.qSelected; });
      const correct = state.qChoices.find(function (c) { return c.correct; });
      const foot = el('div', 'quiz-foot');
      const verdict = el('div', 'quiz-verdict');
      verdict.appendChild(el('div', 'quiz-feedback ' + (wasRight ? 'ok' : 'ko'),
        wasRight ? t('correctFeedback') : t('wrongFeedback') + ' “' + (correct ? correct.label : '') + '”'));
      // Dopo la risposta si dichiara anche il carattere del campione: è quello
      // davvero composto sullo schermo, non l'originale storico, così chi
      // studia sa cosa sta guardando e può cercarlo.
      if (state.quizType === 'font') {
        const label = fontLabel(q.font);
        if (label) {
          const note = el('div', 'quiz-specimen-name', t('specimenName') + ': ');
          const nm = el('span', 'quiz-specimen-font', label);
          nm.style.fontFamily = q.font;
          note.appendChild(nm);
          verdict.appendChild(note);
        }
        // Seconda riga: i caratteri canonici della classe. Il campione è un
        // equivalente libero, questi sono i nomi che si incontrano nei
        // repertori — vanno tenuti distinti, o si impara il nome sbagliato.
        if (q.examples) {
          verdict.appendChild(el('div', 'quiz-class-examples',
            t('classExamples') + ': ' + q.examples));
        }
      }
      foot.appendChild(verdict);
      const isLast = state.qIndex >= state.questions.length - 1;
      const next = el('button', 'btn-solid', isLast ? t('finishLabel') : t('nextLabel'));
      next.type = 'button';
      next.addEventListener('click', nextQuestion);
      foot.appendChild(next);
      box.appendChild(foot);
    }
  }

  // Il campo `font` è una dichiarazione CSS completa — famiglia più fallback
  // generico: all'utente va mostrata solo la prima famiglia, senza apici.
  function fontLabel(css) {
    if (!css) return '';
    return String(css).split(',')[0].replace(/['"]/g, '').trim();
  }

  // Le definizioni sono lunghe cinque o sei frasi: nel quiz ne basta la prima,
  // altrimenti la domanda diventa un muro di testo.
  function firstSentence(s) {
    const m = /^[\s\S]*?[.!?](\s|$)/.exec(s);
    return m ? m[0].trim() : s;
  }

  /* ============ 7. RENDER E AVVIO ============ */

  function render() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.documentElement.lang = state.lang;

    $('tagline').textContent = t('tagline');
    $('appVersion').textContent = 'Glifo ' + APP_VERSION;
    renderXp();
    applySearchStrings();

    Array.prototype.forEach.call(document.querySelectorAll('.lang-opt'), function (b) {
      b.classList.toggle('active', b.dataset.lang === state.lang);
    });

    renderNav();

    Array.prototype.forEach.call(document.querySelectorAll('.view'), function (v) {
      v.hidden = v.id !== 'view-' + state.section;
    });

    // Le tavole d'apertura della sezione, se previste: una o più d'una
    const holder = $('plate-' + state.section);
    if (holder) {
      clear(holder);
      [].concat(SECTION_PLATE[state.section] || []).forEach(function (key) {
        const f = plateFig(key);
        if (f) holder.appendChild(f);
      });
    }

    switch (state.section) {
      case 'home': renderHome(); break;
      case 'glossary': renderGlossary(); break;
      case 'terms': renderTerms(); break;
      case 'technique': renderTechnique(); break;
      case 'type': renderType(); break;
      case 'history': renderHistory(); break;
      case 'designers': renderDesigners(); break;
      case 'exercises': renderExercises(); break;
      case 'profile': renderProfile(); break;
    }

    syncTopbarHeight();

    // Il seguito di un salto dalla ricerca: la vista ora esiste, si può
    // scorrere fino alla voce e illuminarla.
    afterRender();
  }

  function init() {
    initSearch();

    $('langToggle').addEventListener('click', function (e) {
      const btn = e.target.closest('.lang-opt');
      if (!btn) return;
      state.lang = btn.dataset.lang;
      try { localStorage.setItem('glifo-lang', state.lang); } catch (err) {}
      render();
      // I risultati già a schermo portano titoli e sottotitoli nella lingua
      // vecchia: si ridisegnano, l'indice invece resta valido perché contiene
      // tutte e tre le lingue. Il rinvio a fine giro non è un vezzo: questo
      // stesso clic risale fino a document, dove l'ascoltatore che chiude la
      // tendina cancellerebbe i risultati appena rifatti.
      if ($('searchInput').value.trim()) setTimeout(renderSearch, 0);
    });

    $('themeToggle').addEventListener('click', function () {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('glifo-theme', state.theme); } catch (err) {}
      render();
    });

    $('resetBtn').addEventListener('click', function () {
      if (!window.confirm(t('resetConfirm'))) return;
      state.profile = JSON.parse(JSON.stringify(defaults));
      persist();
      render();
    });

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
