/* ============================================================================
   ui.js — the generator controller, shared by every page on the site.

   Each page declares its own starting sheet before loading this file:

       <script>window.PAGE_PRESET = {paper:'letter', spacing:0.25, unit:'in',
                                     majorEvery:4};</script>
       <script src="/assets/ui.js"></script>

   Anything not declared falls back to the values below. Elements that a given
   page does not have (the homepage size grid, for example) are simply skipped,
   so one file drives both the homepage and the per-size pages.

   Still no URL parameters anywhere: every combination of settings would
   otherwise be a crawlable URL with near-identical content.
   ========================================================================== */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };

  var base = { paper: 'a4', orientation: 'portrait', spacing: 5, unit: 'mm',
               margin: 10, majorEvery: 5, calibration: true, color: '#4A7FB5' };

  var state = {}, k;
  for (k in base) state[k] = base[k];
  var preset = window.PAGE_PRESET || {};
  for (k in preset) if (preset[k] !== undefined && preset[k] !== null) state[k] = preset[k];

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
      state[key] = b.dataset.v;
      press(this, function (c) { return c === b; });
      if (after) after();
      draw();
    });
  }
  seg('orient', 'orientation');
  seg('unit', 'unit', function () {
    var sp = $('#spacing');
    state.spacing = state.unit === 'in' ? 0.25 : 5;
    if (sp) { sp.step = state.unit === 'in' ? '0.125' : '0.5'; sp.value = state.spacing; }
  });

  on('#swatches', 'click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    state.color = b.dataset.c;
    press(this, function (c) { return c === b; });
    draw();
  });

  function applyPitch(d) {
    state.spacing = parseFloat(d.s);
    state.unit = d.u;
    state.majorEvery = parseInt(d.m, 10);
    var sp = $('#spacing'), mj = $('#major'), un = $('#unit');
    if (sp) { sp.value = state.spacing; sp.step = state.unit === 'in' ? '0.125' : '0.5'; }
    if (mj) mj.value = state.majorEvery;
    if (un) press(un, function (c) { return c.dataset.v === state.unit; });
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

  on('#paper', 'change', function () { state.paper = this.value; draw(); });
  on('#spacing', 'input', function () { state.spacing = parseFloat(this.value) || 5; draw(); });
  on('#major', 'input', function () { state.majorEvery = parseInt(this.value, 10) || 0; draw(); });
  on('#calib', 'change', function () { state.calibration = this.checked; draw(); });

  on('#dl', 'click', function () {
    try { GridEngine.download(state); }
    catch (err) { alert('That sheet cannot be built: ' + err.message); }
  });

  /* Reflect the starting state into the controls, so a size page opens with
     its own square size already selected rather than the shared default. */
  function syncControls() {
    var sp = $('#spacing'), mj = $('#major'), pa = $('#paper'),
        un = $('#unit'), or = $('#orient'), ca = $('#calib'), sw = $('#swatches'),
        pr = $('#presets');
    if (sp) { sp.value = state.spacing; sp.step = state.unit === 'in' ? '0.125' : '0.5'; }
    if (mj) mj.value = state.majorEvery;
    if (pa) pa.value = state.paper;
    if (ca) ca.checked = state.calibration;
    if (un) press(un, function (c) { return c.dataset.v === state.unit; });
    if (or) press(or, function (c) { return c.dataset.v === state.orientation; });
    if (sw) press(sw, function (c) { return c.dataset.c === state.color; });
    if (pr) press(pr, function (c) {
      return parseFloat(c.dataset.s) === state.spacing && c.dataset.u === state.unit;
    });
  }

  function draw() {
    var g, svg, host = $('#sheet');
    if (!host) return;
    try { g = GridEngine.computeGrid(state); svg = GridEngine.renderSVG(state); }
    catch (err) {
      host.innerHTML = '<p style="padding:26px;color:#C4452F;font-size:14px">' + err.message + '</p>';
      if ($('#oBytes')) $('#oBytes').textContent = '\u2014';
      return;
    }
    host.style.aspectRatio = g.page.w + ' / ' + g.page.h;
    host.innerHTML = svg;

    if ($('#oPitch')) $('#oPitch').textContent = state.spacing + ' ' + state.unit;
    if ($('#oSheet')) $('#oSheet').textContent =
      g.page.label + (state.orientation === 'landscape' ? ' \u2014 landscape' : '');
    if ($('#metaGrid')) $('#metaGrid').textContent = g.cols + ' \u00D7 ' + g.rows + ' squares';
    if ($('#metaSize')) $('#metaSize').textContent =
      g.page.w.toFixed(1) + ' \u00D7 ' + g.page.h.toFixed(1) + ' mm';
    if ($('#oBytes')) {
      try { $('#oBytes').textContent = (GridEngine.buildPDF(state).length / 1024).toFixed(1) + ' KB'; }
      catch (e) { $('#oBytes').textContent = '\u2014'; }
    }
  }

  syncControls();
  draw();
})();
