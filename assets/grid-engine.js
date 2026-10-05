/* ============================================================================
   grid-engine.js — printable grid geometry + vector PDF writer
   No dependencies. Runs in the browser and in Node.

   Design rule that everything else depends on:
   ONE geometry function produces the line list. The SVG preview and the PDF
   both consume that same list. They cannot drift apart.

   All internal units are millimetres, origin top-left, y down (SVG convention).
   The PDF writer flips y and converts mm -> PostScript points at write time.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GridEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MM_PER_IN = 25.4;
  var PT_PER_IN = 72;
  var mm2pt = function (mm) { return mm * PT_PER_IN / MM_PER_IN; };

  /* --- paper sizes, millimetres, portrait --------------------------------- */
  var PAPER = {
    a4:      { w: 210,   h: 297,   label: 'A4' },
    a5:      { w: 148,   h: 210,   label: 'A5' },
    a3:      { w: 297,   h: 420,   label: 'A3' },
    letter:  { w: 215.9, h: 279.4, label: 'Letter' },
    legal:   { w: 215.9, h: 355.6, label: 'Legal' },
    tabloid: { w: 279.4, h: 431.8, label: 'Tabloid' }
  };

  var DEFAULTS = {
    mode: 'spacing', columns: 20, rows: 30,
    style: 'square',
    paper: 'letter',
    orientation: 'portrait',
    spacing: 5,             // in `unit`
    unit: 'mm',             // 'mm' | 'in'
    majorEvery: 5,          // heavy line every N squares; 0 disables
    margin: 10,             // mm
    minorWeight: 0.12,      // mm
    majorWeight: 0.30,      // mm
    color: '#4A7FB5',
    calibration: true,      // print the measuring strip in the bottom margin
    bg: null,               // page background hex; null = plain white paper
    calibInk: '#14181C',    // calibration strip + label ink (light on dark bg)
    pages: 1                // number of identical pages in the PDF
  };

  function opts(o) {
    var r = {}, k;
    for (k in DEFAULTS) r[k] = DEFAULTS[k];
    for (k in (o || {})) if (o[k] !== undefined && o[k] !== null) r[k] = o[k];
    return r;
  }

  function paperSize(o) {
    var p = typeof o.paper === 'string' ? PAPER[o.paper] : o.paper;
    if (!p) throw new Error('Unknown paper size: ' + o.paper);
    return o.orientation === 'landscape'
      ? { w: p.h, h: p.w, label: (p.label || '') }
      : { w: p.w, h: p.h, label: (p.label || '') };
  }

  function hex2rgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255
    ];
  }

  /* --- geometry ------------------------------------------------------------
     The grid is a whole number of squares, centred in the printable area.
     Centring matters: it means the leftover fraction is split evenly instead
     of dumped on one edge, so the sheet reads as deliberate rather than cropped.
     ------------------------------------------------------------------------ */
  function computeGrid(o) {
    o = opts(o);
    var page = paperSize(o);
    var step = o.unit === 'in' ? o.spacing * MM_PER_IN : o.spacing;
    if (o.mode !== 'count' && (!isFinite(step) || step < 1)) throw new Error('Spacing too small to print: ' + step + 'mm');

    if (['square', 'dot', 'coordinate', 'isometric', 'hexagonal'].indexOf(o.style) < 0) throw new Error('Unknown grid style');
    if (!isFinite(o.margin) || o.margin < 0 || o.margin > 50) throw new Error('Margin must be 0 to 50 mm');
    if (!isFinite(o.minorWeight) || o.minorWeight < 0.05 || o.minorWeight > 1) throw new Error('Line width must be 0.05 to 1 mm');
    if (!isFinite(o.pages) || o.pages < 1 || o.pages > 25) throw new Error('Copies must be 1 to 25');
    if (!/^#[0-9a-f]{6}$/i.test(o.color)) throw new Error('Invalid line colour');
    var reserve = o.calibration ? 18 : 0;         // bottom strip for the ruler
    var availW = page.w - 2 * o.margin;
    var availH = page.h - 2 * o.margin - reserve;
    if ((o.style === 'isometric' || o.style === 'hexagonal') && o.mode === 'count') throw new Error('This paper type uses edge spacing; choose spacing mode');
    if (o.mode === 'count') {
      if (!Number.isInteger(o.columns) || !Number.isInteger(o.rows) || o.columns < 2 || o.rows < 2 || o.columns > 200 || o.rows > 200) throw new Error('Grid counts must be whole numbers from 2 to 200');
      if (o.style === 'coordinate' && (o.columns % 2 || o.rows % 2)) throw new Error('Coordinate grids need even counts to centre both axes');
      step = Math.min(availW / o.columns, availH / o.rows);
      if (step < 1) throw new Error('Too many squares for this paper: reduce the counts or margins');
    } else if (o.mode !== 'spacing') throw new Error('Unknown sizing mode');
    if (availW <= step || availH <= step) throw new Error('Margin leaves no room for a grid');

    var cols = o.mode === 'count' ? o.columns : Math.floor((availW + 1e-9) / step);
    var rows = o.mode === 'count' ? o.rows : Math.floor((availH + 1e-9) / step);
    if (o.style === 'coordinate') { cols -= cols % 2; rows -= rows % 2; }
    if (cols < 2 || rows < 2) throw new Error('Choose a smaller spacing or margin');
    if (o.style === 'isometric') cols = Math.floor((availW + 1e-9) / (step * Math.sqrt(3) / 2));
    var gridW = cols * step * (o.style === 'isometric' ? Math.sqrt(3) / 2 : 1);
    var gridH = rows * step;
    var x0 = o.margin + (availW - gridW) / 2;
    var y0 = o.margin + (availH - gridH) / 2;

    var lines = [], i, major;
    for (i = 0; i <= cols; i++) {
      major = o.majorEvery > 0 && i % o.majorEvery === 0;
      lines.push({ x1: x0 + i * step, y1: y0, x2: x0 + i * step, y2: y0 + gridH,
                   w: major ? o.majorWeight : o.minorWeight, major: major });
    }
    for (i = 0; i <= rows; i++) {
      major = o.majorEvery > 0 && i % o.majorEvery === 0;
      lines.push({ x1: x0, y1: y0 + i * step, x2: x0 + gridW, y2: y0 + i * step,
                   w: major ? o.majorWeight : o.minorWeight, major: major });
    }

    if (o.style === 'isometric') {
      lines = [];
      function isoLine(a, b, c, d) { lines.push({x1:x0+a,y1:y0+b,x2:x0+c,y2:y0+d,w:o.minorWeight,major:false}); }
      var dx = step * Math.sqrt(3) / 2;
      for (i = 0; i <= cols; i++) isoLine(i * dx, 0, i * dx, gridH);
      // Two families at +/-30 degrees; clipped to the rectangular grid area.
      [-1 / Math.sqrt(3), 1 / Math.sqrt(3)].forEach(function (slope) {
        var low = Math.min(0, -slope * gridW), high = Math.max(gridH, gridH - slope * gridW);
        for (var j = Math.ceil(low / step); j <= Math.floor(high / step); j++) {
          var intercept = j * step;
          var left = Math.max(0, Math.min(-intercept / slope, (gridH - intercept) / slope));
          var right = Math.min(gridW, Math.max(-intercept / slope, (gridH - intercept) / slope));
          if (right - left > 0.00001) isoLine(left, slope * left + intercept, right, slope * right + intercept);
        }
      });
    }
    if (o.style === 'hexagonal') {
      lines = [];
      var seen = Object.create(null), height = Math.sqrt(3) * step;
      // Flat-top regular hexagons. Clip edge segments at the page's grid bounds
      // and emit each shared edge once so it does not print darker.
      function edge(ax, ay, bx, by) {
        var vx = bx - ax, vy = by - ay, lo = 0, hi = 1;
        var pp = [-vx, vx, -vy, vy], qq = [ax, gridW - ax, ay, gridH - ay];
        for (var z = 0; z < 4; z++) {
          if (Math.abs(pp[z]) < 1e-10) { if (qq[z] < -1e-8) return; }
          else { var ratio = qq[z] / pp[z]; if (pp[z] < 0) lo = Math.max(lo, ratio); else hi = Math.min(hi, ratio); }
        }
        if (hi - lo <= 1e-8) return;
        var x1 = ax + lo * vx, y1 = ay + lo * vy, x2 = ax + hi * vx, y2 = ay + hi * vy;
        var a = x1.toFixed(6) + ',' + y1.toFixed(6), b = x2.toFixed(6) + ',' + y2.toFixed(6);
        var key = a < b ? a + ':' + b : b + ':' + a;
        if (seen[key]) return; seen[key] = true;
        lines.push({x1:x0+x1,y1:y0+y1,x2:x0+x2,y2:y0+y2,w:o.minorWeight,major:false});
      }
      if ((gridW / step + 3) * (gridH / height + 3) * 4 > 40000) throw new Error('Choose larger hexagon edges for this paper size');
      for (var col = -1; col <= Math.ceil(gridW / (1.5 * step)) + 1; col++) {
        var offset = Math.abs(col % 2) * height / 2;
        for (var row = -1; row <= Math.ceil(gridH / height) + 1; row++) {
          var cx = col * 1.5 * step, cy = row * height + offset;
          for (var corner = 0; corner < 6; corner++) {
            var angle = corner * Math.PI / 3, next = (corner + 1) * Math.PI / 3;
            edge(cx + step * Math.cos(angle), cy + step * Math.sin(angle), cx + step * Math.cos(next), cy + step * Math.sin(next));
          }
        }
      }
    }
    var dots = [], labels = [];
    if (o.style === 'dot') {
      if ((cols + 1) * (rows + 1) > 20000) throw new Error('Choose wider dot spacing for this paper size');
      lines = [];
      for (var dx = 0; dx <= cols; dx++) for (var dy = 0; dy <= rows; dy++)
        dots.push({x: x0 + dx * step, y: y0 + dy * step, r: Math.max(0.18, o.minorWeight)});
    }
    if (o.style === 'coordinate') {
      var cx = x0 + gridW / 2, cy = y0 + gridH / 2;
      lines.push({x1: cx, y1: y0, x2: cx, y2: y0 + gridH, w: 0.5, major: true, axis: true});
      lines.push({x1: x0, y1: cy, x2: x0 + gridW, y2: cy, w: 0.5, major: true, axis: true});
      var interval = Math.max(1, Math.ceil(8 / step));
      for (var t = Math.ceil((-cols / 2 + 1) / interval) * interval; t < cols / 2; t += interval)
        if (t !== 0) labels.push({x: cx + t * step - 1, y: cy + 3, size: 2.5, text: String(t)});
      for (var t = Math.ceil((-rows / 2 + 1) / interval) * interval; t < rows / 2; t += interval)
        if (t !== 0) labels.push({x: cx + 1, y: cy - t * step + 1, size: 2.5, text: String(t)});
      labels.push({x: cx + 1, y: cy + 3, size: 2.5, text: '0'});
      labels.push({x: x0 + gridW - 3, y: cy - 2, size: 3, text: 'x'});
      labels.push({x: cx + 2, y: y0 + 3, size: 3, text: 'y'});
    }
    return {
      dots: dots, labels: labels,
      opts: o, page: page, step: step, cols: cols, rows: rows,
      x0: x0, y0: y0, gridW: gridW, gridH: gridH, lines: lines,
      calibrationY: page.h - o.margin - 12,      // metric bar baseline
      calibrationY2: page.h - o.margin - 4.5     // imperial bar baseline
    };
  }

  /* --- calibration strip ---------------------------------------------------
     Two independent scales, because the two failure modes look different:
     a metric bar that must measure 100mm, and an imperial bar that must
     measure 4in. If the page was scaled, both are wrong by the same ratio and
     the user can read the ratio straight off the strip.
     ------------------------------------------------------------------------ */
  function calibrationMarks(g) {
    if (!g.opts.calibration) return { ticks: [], labels: [] };
    var ticks = [], labels = [], i, x;
    var mx = g.x0;
    var right = g.x0 + g.gridW;

    // The two bars stack rather than sit side by side. Side by side collides on
    // any sheet narrower than ~210mm of grid, and the earlier version silently
    // dropped the imperial bar exactly on the most common paper sizes.
    function bar(y, lengthMm, ticksN, majorEvery, label) {
      if (mx + lengthMm > right + 0.5) return false;   // does not fit, skip cleanly
      ticks.push({ x1: mx, y1: y, x2: mx + lengthMm, y2: y, w: 0.25 });
      for (i = 0; i <= ticksN; i++) {
        x = mx + i * lengthMm / ticksN;
        ticks.push({ x1: x, y1: y, x2: x, y2: y - (i % majorEvery === 0 ? 3.2 : 1.7), w: 0.25 });
      }
      labels.push({ x: mx + lengthMm + 2, y: y + 1.6, size: 5.6, text: label });
      return true;
    }

    bar(g.calibrationY, 100, 10, 5, 'must measure 100 mm');
    bar(g.calibrationY2, 4 * MM_PER_IN, 16, 4, 'must measure 4 in');

    // Right-aligned reminder, only when there is clear space for it.
    var note = 'Print at 100% / Actual Size';
    var noteW = note.length * 5.6 * 0.5;
    if (right - noteW - 2 > mx + 4 * MM_PER_IN + 34) {
      labels.push({ x: right - noteW, y: g.calibrationY2 + 1.6, size: 5.6, text: note });
    }
    return { ticks: ticks, labels: labels };
  }

  /* --- SVG preview ---------------------------------------------------------
     Same line list, so what is previewed is what is printed.
     ------------------------------------------------------------------------ */
  function renderSVG(o) {
    var g = computeGrid(o), c = calibrationMarks(g), s = [], i, L;
    s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
           g.page.w.toFixed(3) + ' ' + g.page.h.toFixed(3) +
           '" width="100%" height="100%" role="img" aria-label="Grid preview">');
    s.push('<rect width="100%" height="100%" fill="' + (g.opts.bg || '#fff') + '"/>');
    s.push('<g stroke="' + g.opts.color + '" stroke-linecap="square" shape-rendering="crispEdges">');
    for (i = 0; i < g.lines.length; i++) {
      L = g.lines[i];
      s.push('<line x1="' + L.x1.toFixed(3) + '" y1="' + L.y1.toFixed(3) +
             '" x2="' + L.x2.toFixed(3) + '" y2="' + L.y2.toFixed(3) +
             '" stroke="' + (L.axis ? g.opts.calibInk : g.opts.color) + '" stroke-width="' + L.w + '"/>');
    }
    s.push('</g>');
    g.dots.forEach(function (d) {
      s.push('<circle cx="' + d.x + '" cy="' + d.y + '" r="' + d.r + '" fill="' + g.opts.color + '"/>');
    });
    c.labels = g.labels.concat(c.labels);
    if (c.ticks.length || c.labels.length) {
      s.push('<g stroke="' + g.opts.calibInk + '" stroke-linecap="butt">');
      for (i = 0; i < c.ticks.length; i++) {
        L = c.ticks[i];
        s.push('<line x1="' + L.x1.toFixed(3) + '" y1="' + L.y1.toFixed(3) +
               '" x2="' + L.x2.toFixed(3) + '" y2="' + L.y2.toFixed(3) +
               '" stroke-width="' + L.w + '"/>');
      }
      s.push('</g>');
      for (i = 0; i < c.labels.length; i++) {
        L = c.labels[i];
        s.push('<text x="' + L.x.toFixed(3) + '" y="' + L.y.toFixed(3) +
               '" font-size="' + L.size + '" font-family="Helvetica, sans-serif" fill="' + g.opts.calibInk + '">' +
               L.text + '</text>');
      }
    }
    s.push('</svg>');
    return s.join('');
  }

  /* --- PDF writer ----------------------------------------------------------
     Written by hand rather than with a PDF library. Two reasons:
     1. A library is ~250KB over the wire for a file that is a few hundred
        vector lines. The whole page budget is smaller than the dependency.
     2. Exact control of the unit conversion. No transform matrix is ever
        emitted, so nothing can silently scale the grid.
     ------------------------------------------------------------------------ */
  function esc(t) {
    return String(t)
      .replace(/[^\x20-\xFF]/g, '?')   // keep the stream single-byte clean
      .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
  function n(v) { var s = v.toFixed(4); return s.replace(/\.?0+$/, '') || '0'; }

  function contentStream(g) {
    var c = calibrationMarks(g), out = [], i, L, rgb = hex2rgb(g.opts.color);
    var bg = g.opts.bg, bgrgb;
    var H = g.page.h;
    var flip = function (y) { return mm2pt(H - y); };
    var lastW = null;

    out.push('1 J 1 j');                                   // square caps/joins

    if (bg) {
      // Paint the page background before any line work. Flattened in RGB, so
      // the sheet reads as a solid tint even on printers without colour mgmt.
      bgrgb = hex2rgb(bg);
      out.push(n(bgrgb[0]) + ' ' + n(bgrgb[1]) + ' ' + n(bgrgb[2]) + ' rg');
      out.push('0 0 ' + n(mm2pt(g.page.w)) + ' ' + n(mm2pt(g.page.h)) + ' re f');
    }

    out.push(n(rgb[0]) + ' ' + n(rgb[1]) + ' ' + n(rgb[2]) + ' RG');

    // minor lines first, then major, so heavy lines sit on top
    var ordered = g.lines.slice().sort(function (a, b) { return (a.major ? 1 : 0) - (b.major ? 1 : 0); });
    for (i = 0; i < ordered.length; i++) {
      L = ordered[i];
      var ink = L.axis ? hex2rgb(g.opts.calibInk) : rgb;
      out.push(n(ink[0]) + ' ' + n(ink[1]) + ' ' + n(ink[2]) + ' RG');
      if (L.w !== lastW) { out.push(n(mm2pt(L.w)) + ' w'); lastW = L.w; }
      out.push(n(mm2pt(L.x1)) + ' ' + n(flip(L.y1)) + ' m ' +
               n(mm2pt(L.x2)) + ' ' + n(flip(L.y2)) + ' l S');
    }

    out.push(n(rgb[0]) + ' ' + n(rgb[1]) + ' ' + n(rgb[2]) + ' rg');
    g.dots.forEach(function (d) {
      var x = mm2pt(d.x), y = flip(d.y), radius = mm2pt(d.r), k = radius * 0.55228475;
      out.push(n(x + radius) + ' ' + n(y) + ' m ' +
        n(x + radius) + ' ' + n(y + k) + ' ' + n(x + k) + ' ' + n(y + radius) + ' ' + n(x) + ' ' + n(y + radius) + ' c ' +
        n(x - k) + ' ' + n(y + radius) + ' ' + n(x - radius) + ' ' + n(y + k) + ' ' + n(x - radius) + ' ' + n(y) + ' c ' +
        n(x - radius) + ' ' + n(y - k) + ' ' + n(x - k) + ' ' + n(y - radius) + ' ' + n(x) + ' ' + n(y - radius) + ' c ' +
        n(x + k) + ' ' + n(y - radius) + ' ' + n(x + radius) + ' ' + n(y - k) + ' ' + n(x + radius) + ' ' + n(y) + ' c f');
    });
    c.labels = g.labels.concat(c.labels);
    if (c.ticks.length || c.labels.length) {
      var ckrgb = hex2rgb(g.opts.calibInk);
      out.push(n(ckrgb[0]) + ' ' + n(ckrgb[1]) + ' ' + n(ckrgb[2]) + ' RG');
      lastW = null;
      for (i = 0; i < c.ticks.length; i++) {
        L = c.ticks[i];
        if (L.w !== lastW) { out.push(n(mm2pt(L.w)) + ' w'); lastW = L.w; }
        out.push(n(mm2pt(L.x1)) + ' ' + n(flip(L.y1)) + ' m ' +
                 n(mm2pt(L.x2)) + ' ' + n(flip(L.y2)) + ' l S');
      }
      out.push(n(ckrgb[0]) + ' ' + n(ckrgb[1]) + ' ' + n(ckrgb[2]) + ' rg');
      for (i = 0; i < c.labels.length; i++) {
        L = c.labels[i];
        out.push('BT /F1 ' + n(L.size * PT_PER_IN / MM_PER_IN) + ' Tf ' +
                 n(mm2pt(L.x)) + ' ' + n(flip(L.y)) + ' Td (' + esc(L.text) + ') Tj ET');
      }
    }
    return out.join('\n');
  }

  // The writer below emits exactly one byte per character (latin1), so byte
  // length is character length. Measuring this as UTF-8 instead puts every
  // xref offset out by the width of the binary header comment, which most
  // readers repair silently and strict ones reject.
  function bytelen(s) { return s.length; }

  function buildPDF(o) {
    o = opts(o);
    var g = computeGrid(o);
    var stream = contentStream(g);
    var W = n(mm2pt(g.page.w)), H = n(mm2pt(g.page.h));
    var title = 'Printable grid — ' + g.page.label + ' ' + o.orientation +
                ' — ' + (o.mode === 'count' ? o.columns + 'x' + o.rows + ' squares' : o.spacing + o.unit);
    var pages = Math.max(1, Math.floor(o.pages) || 1), i;

    // Every page is identical, so they all share one content stream and one
    // font object. That keeps the file small no matter how many copies you ask
    // for. Object layout: 1 Catalog, 2 Pages, 3..(2+n) Pages, stream, font, info.
    var kids = [];
    for (i = 0; i < pages; i++) kids.push((3 + i) + ' 0 R');
    var streamRef = (3 + pages) + ' 0 R';
    var fontRef = (4 + pages) + ' 0 R';

    var objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + pages + ' >>'
    ];
    for (i = 0; i < pages; i++) {
      objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] ' +
        '/Resources << /Font << /F1 ' + fontRef + ' >> >> /Contents ' + streamRef + ' >>');
    }
    objs.push('<< /Length ' + bytelen(stream) + ' >>\nstream\n' + stream + '\nendstream');
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objs.push('<< /Title (' + esc(title) + ') /Producer (grid-engine) >>');

    var head = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    var body = '', offsets = [], pos = bytelen(head), i, chunk;
    for (i = 0; i < objs.length; i++) {
      chunk = (i + 1) + ' 0 obj\n' + objs[i] + '\nendobj\n';
      offsets.push(pos);
      body += chunk;
      pos += bytelen(chunk);
    }

    var xref = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    for (i = 0; i < offsets.length; i++) {
      xref += ('0000000000' + offsets[i]).slice(-10) + ' 00000 n \n';
    }
    var trailer = 'trailer\n<< /Size ' + (objs.length + 1) +
                  ' /Root 1 0 R /Info ' + (5 + pages) + ' 0 R >>\nstartxref\n' + pos + '\n%%EOF\n';

    var pdf = head + body + xref + trailer;
    var bytes = new Uint8Array(pdf.length);
    for (i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
    return bytes;
  }

  function filename(o) {
    o = opts(o);
    var p = typeof o.paper === 'string' ? o.paper : 'custom';
    var f = [o.style, 'grid', o.mode === 'count' ? o.columns + 'x' + o.rows : o.spacing + o.unit, p, o.orientation].join('-') + '.pdf';
    if (Math.max(1, Math.floor(o.pages) || 1) > 1) {
      f = f.replace(/\.pdf$/, '-x' + (Math.floor(o.pages) || 1) + '.pdf');
    }
    return f;
  }

  function download(o) {
    var blob = new Blob([buildPDF(o)], { type: 'application/pdf' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename(o);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  return {
    PAPER: PAPER, DEFAULTS: DEFAULTS, MM_PER_IN: MM_PER_IN,
    computeGrid: computeGrid, calibrationMarks: calibrationMarks,
    renderSVG: renderSVG, buildPDF: buildPDF, filename: filename, download: download,
    mm2pt: mm2pt
  };
});
