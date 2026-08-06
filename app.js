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

    const head = el('button', 'item-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(opts.open));

    if (opts.specimen) {
      const spec = el('span', 'item-specimen', opts.specimen);
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
    cap.appendChild(el('span', 'plate-n', t('plateLabel') + ' ' + pl.n));
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

    TERMS.forEach(function (term) {
      const open = !!state.open.term[term.id];
      list.appendChild(accordionItem({
        open: open, specimen: term.letter, font: "'EB Garamond', serif", plate: term.plate,
        tags: langTags(term.term), name: tr(term.term), desc: tr(term.def),
        onToggle: function () {
          state.open.term[term.id] = !open;
          if (!open) markViewed('viewedTerm', term.id);
          render();
        },
      }));
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
    ];

    groups.forEach(function (g) {
      list.appendChild(el('h2', 'group-head', tr(g.label)));
      TECHNIQUES.filter(function (x) { return x.group === g.key; }).forEach(function (x) {
        const open = !!state.open.technique[x.id];
        list.appendChild(accordionItem({
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

  function renderType() {
    const grid = $('typeGrid'), detail = $('typeDetail');
    const open = state.typeface && TYPEFACES.find(function (x) { return x.id === state.typeface; });
    grid.hidden = !!open;
    detail.hidden = !open;
    if (open) return renderTypeDetail(detail, open);

    $('typeTitle').textContent = t('navType');
    $('typeIntro').textContent = t('typeIntro');
    // Legenda: senza, il colore resta un vezzo. Con, diventa una chiave
    // di lettura che si impara guardando la griglia due volte.
    const leg = $('typeLegend');
    clear(leg);
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
      foot.appendChild(el('div', 'quiz-feedback ' + (wasRight ? 'ok' : 'ko'),
        wasRight ? t('correctFeedback') : t('wrongFeedback') + ' “' + (correct ? correct.label : '') + '”'));
      const isLast = state.qIndex >= state.questions.length - 1;
      const next = el('button', 'btn-solid', isLast ? t('finishLabel') : t('nextLabel'));
      next.type = 'button';
      next.addEventListener('click', nextQuestion);
      foot.appendChild(next);
      box.appendChild(foot);
    }
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

    Array.prototype.forEach.call(document.querySelectorAll('.lang-opt'), function (b) {
      b.classList.toggle('active', b.dataset.lang === state.lang);
    });

    renderNav();

    Array.prototype.forEach.call(document.querySelectorAll('.view'), function (v) {
      v.hidden = v.id !== 'view-' + state.section;
    });

    // La tavola d'apertura della sezione, se prevista
    const holder = $('plate-' + state.section);
    if (holder) {
      clear(holder);
      const f = plateFig(SECTION_PLATE[state.section]);
      if (f) holder.appendChild(f);
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
  }

  function init() {
    $('langToggle').addEventListener('click', function (e) {
      const btn = e.target.closest('.lang-opt');
      if (!btn) return;
      state.lang = btn.dataset.lang;
      try { localStorage.setItem('glifo-lang', state.lang); } catch (err) {}
      render();
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
