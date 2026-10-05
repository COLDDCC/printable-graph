/* ============================================================================
   ui.js — the generator controller, shared by every page on the site.

   Each page declares its own starting sheet before loading this file:

       <script>window.PAGE_PRESET = {paper:'letter', spacing:0.25, unit:'in',
                                     majorEvery:4};</script>
       <script src="/assets/ui.js"></script>

   Anything not declared falls back to the values below. Elements that a given
   page does not have (the homepage size grid, for example) are simply skipped,
   so one file drives both the homepage and the per-size pages.

   The pages themselves take no URL parameters: every combination of settings
   would otherwise be a crawlable URL with near-identical content. Parameters
   live on /api/pdf instead (worker/index.js), which returns a PDF, not a page.
   ========================================================================== */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };

  var base = { cellNumbers: false, numberStart: 1, numberEnd: 31, numberStep: 1, numberSize: 3.5, numberOrder: 'rows', numberPosition: 'center', pngDpi: 150, radials: 24, logAxes: 'y', decades: 2, bindingMargin: 0, title: '', worksheetHeader: false, mode: 'spacing', columns: 20, rows: 30, style: 'square', minorWeight: 0.12, majorWeight: 0.30, paper: 'a4', paperWidth: 210, paperHeight: 297, orientation: 'portrait', spacing: 5, unit: 'mm',
               margin: 10, separateMargins: false, marginTop: null, marginBottom: null, marginLeft: null, marginRight: null, majorEvery: 5, calibration: true, color: '#4A7FB5',
               pages: 1, bg: null };

  var state = {}, k;
  for (k in base) state[k] = base[k];
  var preset = window.PAGE_PRESET || {};
  for (k in preset) if (preset[k] !== undefined && preset[k] !== null) state[k] = preset[k];

  // Fragment settings are shareable without creating indexed query variants.
  try {
    var shared = JSON.parse(decodeURIComponent(location.hash.slice(1)));
    Object.keys(base).forEach(function (key) { if (shared[key] !== undefined) state[key] = shared[key]; });
    GridEngine.computeGrid(state);
  } catch (err) { /* Ordinary section anchors or invalid settings use page defaults. */
    for (k in base) state[k] = base[k];
    for (k in preset) if (preset[k] !== undefined && preset[k] !== null) state[k] = preset[k];
  }
  function status(message) { var el = $('#toolStatus'); if (el) el.textContent = message; }
  function press(container, matchFn) {
    [].forEach.call(container.children, function (c) {
      c.setAttribute('aria-pressed', String(matchFn(c)));
    });
  }

  function on(sel, type, fn) {
    var el = $(sel);
    if (el) el.addEventListener(type, fn);
    return el;
  }

  function seg(id, key, after) {
    on('#' + id, 'click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (state[key] === b.dataset.v) return;
      state[key] = b.dataset.v;
      press(this, function (c) { return c === b; });
      if (after) after();
      draw();
    });
  }
  seg('orient', 'orientation');
  seg('unit', 'unit', function () {
    var sp = $('#spacing');
    state.spacing = state.unit === 'in' ? state.spacing / 25.4 : state.spacing * 25.4;
    if (sp) { sp.step = state.unit === 'in' ? '0.125' : '0.5'; sp.value = state.spacing; }
    pressPresets();
  });

  on('#swatches', 'click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    state.color = b.dataset.c;
    if ($('#customColor')) $('#customColor').value = state.color;
    press(this, function (c) { return c === b; });
    draw();
  });

  function pressPresets() {
    var pr = $('#presets');
    if (pr) press(pr, function (c) {
      return parseFloat(c.dataset.s) === state.spacing && c.dataset.u === state.unit;
    });
  }

  function applyPitch(d) {
    state.mode = 'spacing'; syncSizing();
    state.spacing = parseFloat(d.s);
    state.unit = d.u;
    state.majorEvery = parseInt(d.m, 10);
    var sp = $('#spacing'), mj = $('#major'), un = $('#unit');
    if (sp) { sp.value = state.spacing; sp.step = state.unit === 'in' ? '0.125' : '0.5'; }
    if (mj) mj.value = state.majorEvery;
    if (un) press(un, function (c) { return c.dataset.v === state.unit; });
    pressPresets();
    draw();
  }

  on('#presets', 'click', function (e) {
    var b = e.target.closest('button'); if (b) applyPitch(b.dataset);
  });
  on('#pitchGrid', 'click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    applyPitch(b.dataset);
    var tool = document.querySelector('.tool');
    if (tool) tool.scrollIntoView({ block: 'center' });
  });

  on('#paperTypes', 'click', function (e) {
    var button = e.target.closest('button[data-style]');
    if (!button) return;
    state.style = button.dataset.style;
    if (state.style !== 'square' && state.style !== 'hexagonal') state.cellNumbers = false;
    syncNumbers();
    if ((state.style === 'isometric' || state.style === 'hexagonal' || state.style === 'polar' || state.style === 'logarithmic')) state.mode = 'spacing';
    if (state.cellNumbers) {
      try { if (GridEngine.computeGrid(Object.assign({},state,{cellNumbers:false})).step < 8) { state.mode='spacing'; state.unit='mm'; state.spacing=10; } } catch (_) {}
    }
    syncControls();
    draw();
  });
  function syncPaperTypes() {
    var host = $('#paperTypes');
    if (host) press(host, function (button) { return button.dataset.style === state.style; });
  }
  on('#sizingMode', 'change', function () { state.mode = this.value; syncSizing(); draw(); });
  on('#columns', 'input', function () { state.columns = Number(this.value); draw(); });
  on('#rows', 'input', function () { state.rows = Number(this.value); draw(); });
  function syncSizing() {
    if ($('#sizingMode')) { $('#sizingMode').value = state.mode; $('#sizingMode').querySelector('option[value=count]').disabled = state.style === 'isometric' || state.style === 'hexagonal' || state.style === 'polar' || state.style === 'logarithmic'; }
    if ($('#columns')) $('#columns').value = state.columns;
    if ($('#rows')) $('#rows').value = state.rows;
    if ($('#logFields')) $('#logFields').hidden = state.style !== 'logarithmic';
    if ($('#logAxes')) $('#logAxes').value = state.logAxes;
    if ($('#decades')) $('#decades').value = state.decades;
    if ($('#polarFields')) $('#polarFields').hidden = state.style !== 'polar';
    if ($('#radials')) $('#radials').value = state.radials;
    if ($('#countFields')) $('#countFields').hidden = state.mode !== 'count';
    if ($('#countHelp')) $('#countHelp').hidden = state.mode !== 'count';
    if ($('#spacing')) $('#spacing').disabled = state.mode === 'count';
  }
  function syncNumbers() {
    if ($('#cellNumbers')) { $('#cellNumbers').checked = state.cellNumbers; $('#cellNumbers').disabled = state.style !== 'square' && state.style !== 'hexagonal'; }
    if ($('#numberFields')) $('#numberFields').hidden = !state.cellNumbers;
    if ($('#numberStart')) $('#numberStart').value = state.numberStart;
    if ($('#numberEnd')) $('#numberEnd').value = state.numberEnd;
    if ($('#numberStep')) $('#numberStep').value = state.numberStep;
    if ($('#numberSize')) $('#numberSize').value = state.numberSize;
    if ($('#numberOrder')) $('#numberOrder').value = state.numberOrder;
    if ($('#numberPosition')) $('#numberPosition').value = state.numberPosition;
  }
  on('#cellNumbers', 'change', function () {
    if (this.checked) {
      try { if (GridEngine.computeGrid(state).step < 8) { state.mode='spacing'; state.unit='mm'; state.spacing=10; } } catch (err) { /* draw reports invalid settings */ }
    }
    state.cellNumbers=this.checked; syncControls(); draw();
  });
  on('#numberStart', 'input', function () { state.numberStart=Number(this.value); draw(); });
  on('#numberStep', 'input', function () { state.numberStep=Number(this.value); draw(); });
  on('#numberEnd', 'input', function () { state.numberEnd=Number(this.value); draw(); });
  on('#numberPosition', 'change', function () { state.numberPosition=this.value; draw(); });
  on('#numberOrder', 'change', function () { state.numberOrder=this.value; draw(); });
  on('#numberSize', 'input', function () { state.numberSize=Number(this.value); draw(); });
  on('#logAxes', 'change', function () { state.logAxes = this.value; draw(); });
  on('#decades', 'change', function () { state.decades = Number(this.value); draw(); });
  on('#radials', 'change', function () { state.radials = Number(this.value); draw(); });
  on('#pngDpi', 'change', function () { state.pngDpi = Number(this.value); });
  on('#bindingMargin', 'input', function () { state.bindingMargin = Number(this.value); draw(); });
  on('#sheetTitle', 'input', function () { state.title = this.value; draw(); });
  on('#worksheetHeader', 'change', function () { state.worksheetHeader = this.checked; draw(); });
  function syncMargins() {
    if ($('#separateMargins')) $('#separateMargins').checked = state.separateMargins;
    if ($('#marginFields')) $('#marginFields').hidden = !state.separateMargins;
    if ($('#margin')) $('#margin').disabled = state.separateMargins;
    ['Top','Bottom','Left','Right'].forEach(function (side) { var el=$('#margin'+side); if (el) el.value=state['margin'+side] === null ? state.margin : state['margin'+side]; });
  }
  on('#separateMargins', 'change', function () { state.separateMargins=this.checked; syncMargins(); draw(); });
  ['Top','Bottom','Left','Right'].forEach(function (side) { on('#margin'+side, 'input', function () { state['margin'+side]=Number(this.value); draw(); }); });
  on('#margin', 'input', function () { state.margin = Number(this.value); syncMargins(); draw(); });
  on('#weight', 'input', function () { state.minorWeight = Number(this.value); draw(); });
  on('#customColor', 'input', function () { state.color = this.value; draw(); });
  on('#printSheet', 'click', function () {
    try { GridEngine.computeGrid(state); } catch (err) { status(err.message); return; }
    var win = window.open('', '_blank');
    if (!win) { status('Allow pop-ups to print, or download the PDF instead.'); return; }
    var page = GridEngine.computeGrid(state).page;
    win.onload = function () { win.focus(); win.print(); };
    win.document.write('<!doctype html><html><head><title>Print graph paper</title><style>@page{size:' + page.w + 'mm ' + page.h + 'mm;margin:0}body{margin:0}svg{display:block;width:' + page.w + 'mm;height:' + page.h + 'mm}</style></head><body>' + GridEngine.renderSVG(state) + '</body></html>');
    win.document.close();
    status('Choose 100% scale and matching paper size. Print one sheet; use PDF for multiple copies.');
  });
  on('#downloadPNG', 'click', function () {
    try {
      var exportState = Object.assign({}, state), dimensions = GridEngine.pngSize(exportState, exportState.pngDpi), svg = GridEngine.renderSVG(exportState);
      var url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'})), img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = dimensions.width; canvas.height = dimensions.height;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          if (!blob) { status('PNG export failed. Try PDF instead.'); return; }
          var link = document.createElement('a'), pngURL = URL.createObjectURL(blob);
          link.href = pngURL; link.download = GridEngine.filename(exportState).replace('.pdf', '-' + dimensions.dpi + 'dpi.png'); link.click();
          setTimeout(function () { URL.revokeObjectURL(pngURL); }, 1000);
          status('PNG downloaded: ' + dimensions.width + ' × ' + dimensions.height + ' px (' + dimensions.dpi + ' DPI pixel resolution). Use PDF for exact-size printing.');
          if (window.gtag) gtag('event', 'download_png', {style: exportState.style, dpi: dimensions.dpi});
        }, 'image/png');
      };
      img.onerror = function () { URL.revokeObjectURL(url); status('PNG export failed. Try PDF instead.'); };
      img.src = url;
    } catch (err) { status(err.message); }
  });
  on('#downloadSVG', 'click', function () {
    try {
      var g = GridEngine.computeGrid(state);
      // Physical dimensions survive import into vector editors.
      var svg = GridEngine.renderSVG(state).replace('width="100%" height="100%"', 'width="' + g.page.w + 'mm" height="' + g.page.h + 'mm"');
      var url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
      var link = document.createElement('a');
      link.href = url; link.download = GridEngine.filename(state).replace('.pdf', '.svg');
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      status('SVG downloaded with physical page dimensions.');
      if (window.gtag) gtag('event', 'download_svg', {style: state.style});
    } catch (err) { status(err.message); }
  });
  on('#resetSheet', 'click', function () {
    applyPreset(preset);
    // Drop a shared-settings fragment, keeping ordinary section navigation.
    if (location.hash.startsWith('#%7B')) history.replaceState(null, '', location.pathname + location.search);
    status('Restored this page’s default settings. Your saved presets are kept.');
  });
  on('#shareSheet', 'click', async function () {
    try {
      GridEngine.computeGrid(state);
      var url = location.origin + location.pathname + '#' + encodeURIComponent(JSON.stringify(state));
      try { await navigator.clipboard.writeText(url); status('Link copied with your current settings.'); }
      catch (err) { prompt('Copy this link:', url); }
    } catch (err) { status(err.message); }
  });
  function syncCustomPaper() {
    if ($('#customPaperFields')) $('#customPaperFields').hidden = state.paper !== 'custom';
    if ($('#paperWidth')) $('#paperWidth').value = state.paperWidth;
    if ($('#paperHeight')) $('#paperHeight').value = state.paperHeight;
  }
  on('#paperWidth', 'input', function () { state.paperWidth = Number(this.value); draw(); });
  on('#paperHeight', 'input', function () { state.paperHeight = Number(this.value); draw(); });
  on('#paper', 'change', function () { state.paper = this.value; syncCustomPaper(); if (state.paper === 'custom' && $('.extra-tools')) $('.extra-tools').open = true; draw(); });
  on('#spacing', 'input', function () {
    state.spacing = parseFloat(this.value); pressPresets(); draw();
  });
  on('#major', 'input', function () { state.majorEvery = this.value === '' ? NaN : Number(this.value); draw(); });
  on('#calib', 'change', function () { state.calibration = this.checked; draw(); });
  on('#copies', 'input', function () {
    state.pages = Number(this.value); draw();
  });

  /* --- saved presets (localStorage) ------------------------------------- */
  var PRESETS_KEY = 'graphpaper_presets';
  function loadPresets() {
    try { var l = JSON.parse(localStorage.getItem(PRESETS_KEY)); return Array.isArray(l) ? l.filter(function (p) {
      return p && typeof p.name === 'string' && p.cfg && typeof p.cfg === 'object' && !Array.isArray(p.cfg);
    }) : []; }
    catch (e) { return []; }
  }
  function persistPresets(list) {
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function applyPreset(cfg) {
    var k;
    for (k in base) state[k] = base[k];
    for (k in cfg) if (cfg[k] !== undefined && cfg[k] !== null) state[k] = cfg[k];
    syncControls();
    draw();
  }

  function renderChips() {
    var host = $('#presetChips');
    if (!host) return;
    var list = loadPresets();
    host.innerHTML = '';
    if (!list.length) { host.hidden = true; return; }
    host.hidden = false;
    var hd = document.createElement('span');
    hd.className = 'chips-hd';
    hd.textContent = 'Your presets:';
    host.appendChild(hd);
    list.forEach(function (p, idx) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = '\uD83D\uDCCC ' + p.name;
      b.addEventListener('click', function () { applyPreset(p.cfg); });
      var x = document.createElement('span');
      x.className = 'chip-x';
      x.textContent = '\u00D7';
      x.title = 'Delete';
      x.addEventListener('click', function (ev) {
        ev.stopPropagation();
        list.splice(idx, 1);
        persistPresets(list);
        renderChips();
      });
      b.appendChild(x);
      host.appendChild(b);
    });
  }

  on('#presetSave', 'click', function () {
    try { GridEngine.computeGrid(state); } catch (err) { status('Cannot save these settings: ' + err.message); return; }
    var name = prompt('Name this preset (e.g. "My sketch paper"):');
    if (!name) return;
    var cfg = {};
    for (var k in state) if (state[k] !== null) cfg[k] = state[k];
    var list = loadPresets();
    list.push({ name: name, cfg: cfg });
    if (list.length > 8) list = list.slice(list.length - 8);
    persistPresets(list);
    renderChips();
  });

  on('#dl', 'click', function () {
    try {
      GridEngine.download(state);
      if (window.gtag) gtag('event', 'download_pdf', {
        mode: state.mode, columns: state.columns, rows: state.rows, style: state.style, paper: state.paper, spacing: state.spacing, unit: state.unit, color: state.color
      });
    }
    catch (err) { alert('That sheet cannot be built: ' + err.message); }
  });

  /* Hero quick download: the page's default sheet on the chosen paper,
     whatever the controls below are set to. The link's href points at
     /api/pdf, for people without JavaScript and for agents reading the HTML;
     here the same PDF is built in the browser instead. */
  var initial = {};
  for (k in state) initial[k] = state[k];
  [].forEach.call(document.querySelectorAll('.quick-dl a[data-paper]'), function (a) {
    a.addEventListener('click', function (e) {
      var o = {}, j;
      for (j in initial) o[j] = initial[j];
      o.paper = a.dataset.paper;
      try {
        GridEngine.download(o);
        e.preventDefault();
        if (window.gtag) gtag('event', 'download_pdf', {
          paper: o.paper, spacing: o.spacing, unit: o.unit, color: o.color, source: 'hero'
        });
      } catch (err) { /* follow the link to /api/pdf instead */ }
    });
  });

  /* Reflect the starting state into the controls, so a size page opens with
     its own square size already selected rather than the shared default. */
  function syncControls() {
    var sp = $('#spacing'), mj = $('#major'), pa = $('#paper'),
        un = $('#unit'), or = $('#orient'), ca = $('#calib'), sw = $('#swatches'),
        pr = $('#presets'), cp = $('#copies');
    if (sp) { sp.value = state.spacing; sp.step = state.unit === 'in' ? '0.125' : '0.5'; }
    if (mj) mj.value = state.majorEvery;
    if (pa) pa.value = state.paper;
    if (ca) ca.checked = state.calibration;
    if (cp) cp.value = state.pages;
    if (un) press(un, function (c) { return c.dataset.v === state.unit; });
    if (or) press(or, function (c) { return c.dataset.v === state.orientation; });
    if (sw) press(sw, function (c) { return c.dataset.c === state.color; });
    if ($('#pngDpi')) $('#pngDpi').value = state.pngDpi === 300 ? '300' : '150';
    if ($('#bindingMargin')) $('#bindingMargin').value = state.bindingMargin;
    if ($('#sheetTitle')) $('#sheetTitle').value = state.title;
    if ($('#worksheetHeader')) $('#worksheetHeader').checked = state.worksheetHeader;
    [['style','style'],['margin','margin'],['weight','minorWeight'],['customColor','color']].forEach(function (pair) { var el = $('#' + pair[0]); if (el) el.value = state[pair[1]]; });
    syncPaperTypes();
    syncSizing();
    syncMargins();
    syncCustomPaper();
    syncNumbers();
    pressPresets();
  }

  function draw() {
    var g, svg, host = $('#sheet');
    if (!host) return;
    try { g = GridEngine.computeGrid(state); svg = GridEngine.renderSVG(state); }
    catch (err) {
      ['dl','printSheet','downloadPNG','downloadSVG','shareSheet'].forEach(function (id) { if ($('#' + id)) $('#' + id).disabled = true; });
      status(err.message);
      host.innerHTML = '<p style="padding:26px;color:#C4452F;font-size:14px">' + err.message + '</p>';
      if ($('#oBytes')) $('#oBytes').textContent = '\u2014';
      return;
    }
    ['dl','printSheet','downloadPNG','downloadSVG','shareSheet'].forEach(function (id) { if ($('#' + id)) $('#' + id).disabled = false; });
    status(state.cellNumbers ? 'Cells follow your selected numbering order. Numbered cells need at least 8 mm spacing; smaller grids switch to 10 mm when enabled.' : state.style === 'logarithmic' ? 'Base-10 log paper: each decade runs from 1 to 10 times the previous value. Spacing and heavy-line controls apply to linear axes; decade boundaries are heavy.' : state.style === 'polar' ? 'Polar: spacing is the distance between rings; radial lines divide a full circle evenly.' : state.style === 'hexagonal' ? 'Hexagonal: spacing is each hexagon edge length. Heavy-line settings do not apply.' : state.style === 'isometric' ? 'Isometric: spacing is the triangle edge length. Heavy-line settings do not apply.' : '');
    host.style.aspectRatio = g.page.w + ' / ' + g.page.h;
    host.innerHTML = svg;

    if ($('#oPitch')) $('#oPitch').textContent = state.mode === 'count' ? g.step.toFixed(3) + ' mm' : state.spacing + ' ' + state.unit;
    if ($('#oSheet')) $('#oSheet').textContent =
      g.page.label + (state.orientation === 'landscape' ? ' \u2014 landscape' : '');
    if ($('#metaGrid')) $('#metaGrid').textContent = state.style === 'logarithmic' ? state.decades + ' decades · log ' + (state.logAxes === 'both' ? 'X and Y' : state.logAxes.toUpperCase()) : state.style === 'polar' ? g.rings + ' rings · ' + state.radials + ' radials · ' + g.step.toFixed(3) + ' mm ring spacing' : state.style === 'hexagonal' ? g.step.toFixed(3) + ' mm hexagon edges' : state.style === 'isometric' ? g.step.toFixed(3) + ' mm triangle edges' : (state.mode === 'count' ? g.step.toFixed(3) + ' mm · ' : '') + g.cols + ' \u00D7 ' + g.rows + ' squares';
    if ($('#metaSize')) $('#metaSize').textContent =
      g.page.w.toFixed(1) + ' \u00D7 ' + g.page.h.toFixed(1) + ' mm';
    if ($('#oBytes')) {
      try { $('#oBytes').textContent = (GridEngine.buildPDF(state).length / 1024).toFixed(1) + ' KB'; }
      catch (e) { $('#oBytes').textContent = '\u2014'; }
    }
  }

  // Keep optional print preferences below the primary download actions.
  var advanced = $('.tool.compact .extra-tools');
  if (advanced) {
    var optional = [$('#major'), $('#presetSave'), $('#calib')];
    optional.forEach(function (control, index) {
      if (!control) return;
      var group = control.closest(index === 0 ? '.row' : index === 1 ? '.f' : '.check');
      if (group && !advanced.contains(group)) advanced.appendChild(group);
    });
  }
  syncControls();
  draw();
  renderChips();
})();
