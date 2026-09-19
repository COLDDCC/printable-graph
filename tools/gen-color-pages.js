/* ============================================================================
   tools/gen-color-pages.js — generate black & cream background variants of the
   8 size pages. Run from anywhere:

       node tools/gen-color-pages.js

   Each variant is a full static page pre-set to its size + background, with
   colour-specific SEO copy, a facts table computed by the grid engine, and
   cross-links to its white / black / cream siblings.
   ========================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');
var GridEngine = require('../assets/grid-engine.js');

var ROOT = path.join(__dirname, '..');
var SITE = 'https://printgridpaper.com';

/* --- per-size metadata --------------------------------------------------- */
var SIZES = [
  { slug: '2mm-graph-paper', mono: '2 mm', spacing: 2, unit: 'mm', majorEvery: 5,  paper: 'a4',  high: 'Fine × 5 mm accent', use: 'Precision charts, technical cross-hatching and detailed drafting where a coarse grid would get in the way.' },
  { slug: '5mm-graph-paper', mono: '5 mm', spacing: 5, unit: 'mm', majorEvery: 5,  paper: 'a4',  high: '5 mm × 5 mm', use: 'The metric classroom and notebook grid — school notes, sketching, bullet journal layouts.' },
  { slug: '1cm-graph-paper', mono: '1 cm', spacing: 10, unit: 'mm', majorEvery: 10, paper: 'a4', high: '10 mm × 10 mm', use: 'Coordinate geometry, planning grids and large clear working where each square holds a number.' },
  { slug: 'eighth-inch-graph-paper', mono: '1/8 inch', spacing: 0.125, unit: 'in', majorEvery: 8, paper: 'letter', high: '8 × 8 to the inch', use: 'Cross stitch, pixel art, bead patterns and knitting charts that need one square per stitch.' },
  { slug: 'quarter-inch-graph-paper', mono: '1/4 inch', spacing: 0.25, unit: 'in', majorEvery: 4, paper: 'letter', high: '4 × 4 to the inch', use: 'The US classroom default — quad-ruled homework, coordinate graphing and 1/4" floor plans.' },
  { slug: 'half-inch-graph-paper', mono: '1/2 inch', spacing: 0.5, unit: 'in', majorEvery: 2, paper: 'letter', high: '2 × 2 to the inch', use: 'Big, forgiving squares for young learners and chunky early writing practice.' },
  { slug: '10-squares-per-inch-graph-paper', mono: '10 per inch', spacing: 0.1, unit: 'in', majorEvery: 10, paper: 'letter', high: '10 × 10 to the inch', use: 'Fine engineering computation pads and plotting work that needs precision.' },
  { slug: '1-inch-graph-paper', mono: '1 inch', spacing: 1, unit: 'in', majorEvery: 0, paper: 'letter', high: '1 in × 1 in', use: 'Floor plans, room layouts and scale models where one square is one foot.' }
];

/* --- colour palettes ------------------------------------------------------ */
var COLORS = {
  white: {
    key: 'white', display: 'White', swatch: '#FFFFFF',
    bg: null, color: null, calibInk: '#14181C', contrast: '— blank base',
    tag: 'Standard, bright clean paper.', urlPostfix: ''
  },
  black: {
    key: 'black', display: 'Black', swatch: '#12171B',
    bg: '#12171B', color: '#FFFFFF', calibInk: '#E8E8E8', contrast: '~95%',
    tag: 'White grid on a near-black page.',
    lead: 'Black graph paper is the sheet for dark aesthetics: presentation mock-ups, screen-wireframe sketches and artwork made to be photographed or shown on a monitor rather than written on in pencil.',
    uses: [
      ['Dark design work', 'Wireframe and UI mock-ups read cleanly in white-on-black, and a dark sheet flatters screenshots and pitch decks.'],
      ['Light art & photography', 'White lines on black photograph well and make a strong backdrop for pixel-art and light-painting layouts.'],
      ['Low-glare, high contrast', 'The white grid holds ~95% contrast against the page, so spacing checks stay easy even from arm\u2019s length.']
    ],
    tech: [
      'White grid lines, near-black background (#' + '12171B).',
      'High contrast for printer-friendly line work.',
      'Slightly more ink to print than a white sheet \u2014 expect a dark page.'
    ]
  },
  cream: {
    key: 'cream', display: 'Cream', swatch: '#F7F1E3',
    bg: '#F7F1E3', color: '#6B5B41', calibInk: '#4A4238', contrast: '~75%',
    tag: 'Warm tint, dark grid.',
    lead: 'Cream graph paper is the softer, warmer version: an easy-on-the-eyes tint that suits long writing sessions, vintage journals and any project where plain white feels harsh.',
    uses: [
      ['Long writing & note-taking', 'The warm tint reduces glare compared with pure white, so it is kinder over long study sessions.'],
      ['Vintage & analog aesthetic', 'Cream paper reads as classic stationery \u2014 a natural fit for journaling, lettering and printed planners.'],
      ['Works with warm inks', 'Dark brown-ink lines pair with sepia and amber pens far better than cold blue on white.']
    ],
    tech: [
      'Dark warm grid lines, cream background (#' + 'F7F1E3).',
      'Gentler contrast (\u2248' + '75%) than white, tuned for reading not glare.',
      'Slightly more ink than a blank white page, less than black.'
    ]
  }
};

/* --- helpers -------------------------------------------------------------- */
function factsFor(size, paper) {
  var o = { paper: paper, spacing: size.spacing, unit: size.unit,
            majorEvery: size.majorEvery, calibration: true };
  var g = GridEngine.computeGrid(o);
  var bytes = GridEngine.buildPDF(o).length;
  return { cols: g.cols, rows: g.rows, count: g.cols * g.rows,
           kb: (bytes / 1024).toFixed(1) };
}

function e(s) { return String(s); }

function buildFaq(size, col) {
  var rows = [];

  if (col.key === 'black') {
    rows.push(['Does printing the black background waste a lot of ink?',
      'A full black page uses noticeably more toner than a white one \u2014 most of the sheet is covered. If ink is a concern, print one sheet first, and set your print dialog to \u201cDraft\u201d or \u201cEco\u201d mode if your printer offers it. The grid stays perfectly usable.']);
    rows.push(['Can I write on it in pencil after printing?',
      'Yes, though a soft white or light pen reads best. For pencil work people usually prefer the cream version, which is nearly as kind to the eye but costs far less ink.']);
    rows.push(['Is the black version really the same grid as the white one?',
      'Exactly the same geometry \u2014 same line spacing and same measuring bars. Only the background changes, so swap freely between the three colour versions without re-learning the grid.']);
  } else if (col.key === 'cream') {
    rows.push(['Why is cream easier on the eyes than white?',
      'Plain white reflects the most light. The cream tint (\u0023F7F1E3) cuts that glare a little, which helps over long writing and reading sessions where your eyes are close to the page.']);
    rows.push(['Does the cream background use more ink to print?',
      'A little \u2014 the whole page is tinted rather than left blank. It is far cheaper than the black version. Print one sheet to confirm your printer handles the tint before running a stack.']);
    rows.push(['Is the cream version the same grid as the white one?',
      'Identical lines and identical measuring bars; only the paper colour differs. You can switch between white, black and cream versions with no change in measurements.']);
  }

  rows.push(['How do I verify this prints at the true size?',
    'Lay a ruler on the two bars in the bottom margin \u2014 the upper must read 100 mm and the lower 4 inches. If both are short by the same amount, the print dialog scaled the page: set it to 100% / Actual Size and print again.']);

  return rows.map(function (r) {
    return { q: r[0], a: r[1] };
  });
}

/* --- page template -------------------------------------------------------- */
function page(size, col) {
  var dir = path.join(ROOT, size.slug + (col.key === 'white' ? '' : '-' + col.key));
  var urlPath = '/' + (size.slug + (col.key === 'white' ? '' : '-' + col.key)) + '/';
  var url = SITE + urlPath;
  var title = col.display + ' ' + size.mono + ' Graph Paper \u2014 Free Printable PDF';
  var desc = 'Free printable ' + col.display.toLowerCase() + ' graph paper, ' +
             size.mono.toLowerCase() + ' squares, on A4 or Letter. Every sheet carries a measuring bar so you can check the squares really are ' +
             size.mono.toLowerCase() + '.';

  var fA4 = factsFor(size, 'a4');
  var fLetter = factsFor(size, 'letter');
  var kb = factsFor(size, size.paper).kb;

  var colorLinks = ['white', 'black', 'cream'].map(function (k) {
    var c = COLORS[k];
    return '<a href="' + SITE + '/' + (size.slug + (k === 'white' ? '' : '-' + k)) + '/"><strong>' +
           c.display + '</strong><span>' + c.tag + '</span></a>';
  }).join('\n          ');

  var swatches = ['#FFFFFF', '#4A7FB5', '#5F8A6E', '#9AA6AD', '#12171B', '#C4452F']
    .map(function (c) {
      var pressed = col.color === c;
      var label = { '#FFFFFF':'White','#4A7FB5':'Blue','#5F8A6E':'Green','#9AA6AD':'Grey','#12171B':'Black','#C4452F':'Red' }[c];
      var style = c === '#FFFFFF' ? ' style="background:#FFFFFF;border:1px solid #C3CDD2"' : ' style="background:' + c + '"';
      return '<button type="button" data-c="' + c + '"' + style +
             (pressed ? ' aria-pressed="true"' : ' aria-pressed="false"') +
             ' aria-label="' + label + '"></button>';
    }).join('\n            ');

  var preset = "window.PAGE_PRESET = {paper:'" + size.paper + "', spacing:" + size.spacing +
               ", unit:'" + size.unit + "', majorEvery:" + size.majorEvery +
               ", bg:'" + col.bg + "', color:'" + col.color + "', calibInk:'" + col.calibInk + "'};";

  var cb = buildFaq(size, col);
  var faqMarkup = cb.map(function (r, i) {
    return '<details' + (i === 0 ? ' open' : '') + '>\n        <summary>' + r.q + '</summary>\n        <p>' + r.a + '</p>\n      </details>';
  }).join('\n      ');

  var faqLd = cb.map(function (r) {
    return '{"@type":"Question","name":' + JSON.stringify(r.q.replace(/"/g, '\\"')) +
           ',"acceptedAnswer":{"@type":"Answer","text":' + JSON.stringify(r.a.replace(/"/g, '\\"')) + '}}';
  }).join(',\n          ');

  var usesMarkup = col.uses.map(function (u) {
    return '<div><h3>' + u[0] + '</h3><p>' + u[1] + '</p></div>';
  }).join('\n      ');

  var techMarkup = col.tech.map(function (t) { return '<li>' + t + '</li>'; }).join('\n        ');

  return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'<meta charset="utf-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
'\n' +
'<title>' + title + '</title>\n' +
'<meta name="description" content="' + desc + '">\n' +
'<link rel="canonical" href="' + url + '">\n' +
// These 16 size x colour pages exist for visitors who want a tinted sheet, but
// their copy varies only by the size numbers - any two pages of the same colour
// are ~96% identical. Keeping them out of the index avoids 16 near-duplicates on
// a small site; "follow" still passes their links on to the main size pages.
// To chase "black graph paper" style queries, build one consolidated page per
// colour rather than re-indexing these.
'<meta name="robots" content="noindex, follow">\n' +
'\n' +
'<meta property="og:type" content="website">\n' +
'<meta property="og:title" content="' + title + '">\n' +
'<meta property="og:description" content="' + desc + '">\n' +
'<meta property="og:url" content="' + url + '">\n' +
'<meta name="twitter:card" content="summary">\n' +
'\n' +
'<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'%3E%3Crect width=\'16\' height=\'16\' fill=\'%23fff\'/%3E%3Cg stroke=\'%234A7FB5\' stroke-width=\'1\'%3E%3Cpath d=\'M4.5 0v16M8.5 0v16M12.5 0v16M0 4.5h16M0 8.5h16M0 12.5h16\'/%3E%3C/g%3E%3C/svg%3E">\n' +
'\n' +
'<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'<link href="https://fonts.googleapis.com/css2?family=Anybody:wght@500;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">\n' +
'\n' +
'<link rel="stylesheet" href="/assets/site.css">\n' +
'\n' +
'<!-- Google tag (gtag.js) -->\n' +
'<script async src="https://www.googletagmanager.com/gtag/js?id=G-WFH3F9TQCN"></script>\n' +
'<script>\n' +
'  window.dataLayer = window.dataLayer || [];\n' +
'  function gtag(){dataLayer.push(arguments);}\n' +
'  gtag(\'js\', new Date());\n' +
'  gtag(\'config\', \'G-WFH3F9TQCN\');\n' +
'</script>\n' +
'</head>\n' +
'<body>\n' +
'\n' +
'<header>\n' +
'  <div class="wrap mast">\n' +
'    <a class="brand" href="/">\n' +
'      <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><rect width="16" height="16" fill="#fff" stroke="#C3CDD2"/><g stroke="#4A7FB5" stroke-width="1"><path d="M4.5 0v16M8.5 0v16M12.5 0v16M0 4.5h16M0 8.5h16M0 12.5h16"/></g></svg>\n' +
'      Graph Paper\n' +
'    </a>\n' +
'    <nav>\n' +
'      <a href="/#setup">Print settings</a>\n' +
'      <a href="/#sizes">Square sizes</a>\n' +
'      <a href="#faq">FAQ</a>\n' +
'    </nav>\n' +
'  </div>\n' +
'</header>\n' +
'\n' +
'<main class="wrap">\n' +
'\n' +
'  <p class="crumb"><a href="/">Graph paper</a><span>/</span>' + col.display.toLowerCase() + ' ' + size.mono + '</p>\n' +
'\n' +
'  <div class="hero size">\n' +
'    <p class="eyebrow">' + size.high + ' &middot; ' + col.key + ' background</p>\n' +
'    <h1>' + col.display + ' ' + size.mono + ' graph paper</h1>\n' +
'    <p class="lede">' + col.lead + ' ' + size.use + '</p>\n' +
'  </div>\n' +
'\n' +
'  <div class="tool">\n' +
'    <div class="sheet-frame">\n' +
'      <div id="sheet" class="sheet"></div>\n' +
'      <div class="sheet-meta"><span id="metaGrid">&mdash;</span><span id="metaSize">&mdash;</span></div>\n' +
'    </div>\n' +
'\n' +
'    <div class="block">\n' +
'      <div class="block-hd"><span>Your sheet</span><span id="oBytes">&mdash;</span></div>\n' +
'      <div class="preset-chips" id="presetChips" hidden></div>\n' +
'      <div class="cells">\n' +
'        <div class="cell"><label>Square</label><output id="oPitch">' + size.mono + '</output></div>\n' +
'        <div class="cell"><label>Paper</label><output id="oSheet">' + size.paper.toUpperCase() + '</output></div>\n' +
'      </div>\n' +
'\n' +
'      <div class="ctrls">\n' +
'        <div class="f">\n' +
'          <span>Square size</span>\n' +
'          <div class="presets" id="presets">\n' +
'            <button type="button" data-s="5" data-u="mm" data-m="5">5 mm</button>\n' +
'            <button type="button" data-s="10" data-u="mm" data-m="10">1 cm</button>\n' +
'            <button type="button" data-s="0.25" data-u="in" data-m="4">1/4 in</button>\n' +
'            <button type="button" data-s="0.5" data-u="in" data-m="2">1/2 in</button>\n' +
'            <button type="button" data-s="1" data-u="in" data-m="0">1 in</button>\n' +
'            <button type="button" data-s="0.1" data-u="in" data-m="10">10 per in</button>\n' +
'          </div>\n' +
'        </div>\n' +
'\n' +
'        <div class="row">\n' +
'          <div class="f"><span>Custom size</span><input id="spacing" type="number" min="0.05" step="' + (size.unit === 'in' ? '0.125' : '0.5') + '" value="' + size.spacing + '" aria-label="Custom square size"></div>\n' +
'          <div class="f"><span>Unit</span>\n' +
'            <div class="seg" id="unit">\n' +
'              <button type="button" data-v="mm" aria-pressed="' + (size.unit === 'mm') + '">mm</button>\n' +
'              <button type="button" data-v="in" aria-pressed="' + (size.unit === 'in') + '">inch</button>\n' +
'            </div>\n' +
'          </div>\n' +
'        </div>\n' +
'\n' +
'        <div class="f">\n' +
'          <span>Paper</span>\n' +
'          <select id="paper" aria-label="Paper size">\n' +
'            <option value="a4"' + (size.paper === 'a4' ? ' selected' : '') + '>A4 &mdash; 210 &times; 297 mm</option>\n' +
'            <option value="letter"' + (size.paper === 'letter' ? ' selected' : '') + '>Letter &mdash; 8.5 &times; 11 in</option>\n' +
'            <option value="a5">A5 &mdash; 148 &times; 210 mm</option>\n' +
'            <option value="a3">A3 &mdash; 297 &times; 420 mm</option>\n' +
'            <option value="legal">Legal &mdash; 8.5 &times; 14 in</option>\n' +
'            <option value="tabloid">Tabloid &mdash; 11 &times; 17 in</option>\n' +
'          </select>\n' +
'        </div>\n' +
'\n' +
'        <div class="row">\n' +
'          <div class="f"><span>Orientation</span>\n' +
'            <div class="seg" id="orient">\n' +
'              <button type="button" data-v="portrait" aria-pressed="true">Portrait</button>\n' +
'              <button type="button" data-v="landscape" aria-pressed="false">Landscape</button>\n' +
'            </div>\n' +
'          </div>\n' +
'          <div class="f"><span>Heavy line every</span><input id="major" type="number" min="0" max="20" step="1" value="' + size.majorEvery + '" aria-label="Heavy line every N squares"></div>\n' +
'        </div>\n' +
'\n' +
'        <div class="f">\n' +
'          <span>Line colour</span>\n' +
'          <div class="swatches" id="swatches">\n' +
'            ' + swatches + '\n' +
'          </div>\n' +
'        </div>\n' +
'\n' +
'        <label class="check"><input type="checkbox" id="calib" checked>\n' +
'          <span>Include the measuring bars. Turn this off once you\'ve confirmed your printer setting and want a clean sheet.</span></label>\n' +
'\n' +
'        <div class="row">\n' +
'          <div class="f"><span>Copies per PDF</span><input id="copies" type="number" min="1" max="25" step="1" value="1" aria-label="Copies per PDF"></div>\n' +
'          <div class="f"><span>Preset</span><button type="button" class="btn-save" id="presetSave">Save settings</button></div>\n' +
'        </div>\n' +
'\n' +
'        <button class="dl" id="dl" type="button">Download PDF</button>\n' +
'      </div>\n' +
'    </div>\n' +
'  </div>\n' +
'\n' +
'  <section id="uses">\n' +
'    <div class="sec-hd">\n' +
'      <h2>What a ' + col.display.toLowerCase() + ' ' + size.mono + ' grid is for</h2>\n' +
'      <p class="sec-lede">Same '+ size.mono + ' squares as every other version here \u2014 the background just changes how the finished sheet reads.</p>\n' +
'    </div>\n' +
'    <div class="uses">\n' +
'      ' + usesMarkup + '\n' +
'    </div>\n' +
'  </section>\n' +
'\n' +
'  <section id="tech">\n' +
'    <div class="sec-hd">\n' +
'      <h2>Sheet specs</h2>\n' +
'    </div>\n' +
'    <div class="tscroll">\n' +
'      <table class="facts">\n' +
'        <caption>Whole ' + size.mono + ' squares that fit, with the measuring bars on, portrait</caption>\n' +
'        <thead>\n' +
'          <tr><th scope="col">Paper</th><th scope="col">Grid</th><th scope="col">Squares</th></tr>\n' +
'        </thead>\n' +
'        <tbody>\n' +
'          <tr><th scope="row">Letter</th><td>' + fLetter.cols + ' &times; ' + fLetter.rows + '</td><td><b>' + fLetter.count + '</b></td></tr>\n' +
'          <tr><th scope="row">A4</th><td>' + fA4.cols + ' &times; ' + fA4.rows + '</td><td><b>' + fA4.count + '</b></td></tr>\n' +
'        </tbody>\n' +
'      </table>\n' +
'    </div>\n' +
'    <ul style="margin-top:16px">\n' +
'        ' + techMarkup + '\n' +
'      <li>Downloaded PDF is only ' + kb + ' KB \u2014 pure vector line work.</li>\n' +
'    </ul>\n' +
'  </section>\n' +
'\n' +
'  <section id="colours">\n' +
'    <div class="sec-hd">\n' +
'      <h2>' + size.mono + ' in white, black or cream</h2>\n' +
'      <p class="sec-lede">The grid geometry never changes between these versions \u2014 only the background. Pick the tint to match the job.</p>\n' +
'    </div>\n' +
'    <div class="tscroll">\n' +
'      <table class="facts">\n' +
'        <thead>\n' +
'          <tr><th scope="col">Background</th><th scope="col">Look</th><th scope="col">Compare</th><th scope="col"></th></tr>\n' +
'        </thead>\n' +
'        <tbody>\n' +
'          <tr><th scope="row">\u2B1C White</th><td>' + COLORS.white.tag + '</td><td>' + COLORS.white.contrast + '</td><td><a href="' + SITE + '/' + size.slug + '/">Open white</a></td></tr>\n' +
'          <tr><th scope="row">\u2B1B Black</th><td>' + COLORS.black.tag + '</td><td>' + COLORS.black.contrast + '</td><td><a href="' + SITE + '/' + size.slug + '-black/">Open black</a></td></tr>\n' +
'          <tr><th scope="row">\u{1F7E8} Cream</th><td>' + COLORS.cream.tag + '</td><td>' + COLORS.cream.contrast + '</td><td><a href="' + SITE + '/' + size.slug + '-cream/">Open cream</a></td></tr>\n' +
'        </tbody>\n' +
'      </table>\n' +
'    </div>\n' +
'  </section>\n' +
'\n' +
'  <section id="faq">\n' +
'    <div class="sec-hd">\n' +
'      <h2>Questions about ' + col.display.toLowerCase() + ' graph paper</h2>\n' +
'    </div>\n' +
'    <div class="faq">\n' +
'      ' + faqMarkup + '\n' +
'    </div>\n' +
'  </section>\n' +
'\n' +
'  <section id="related">\n' +
'    <div class="sec-hd">\n' +
'      <h2>Other square sizes</h2>\n' +
'    </div>\n' +
'    <div class="related">\n' +
'      <a href="/2mm-graph-paper/"><strong>2 mm</strong><span>Dense plotting and fine detail work</span></a>\n' +
'      <a href="/5mm-graph-paper/"><strong>5 mm</strong><span>The metric school and notebook grid</span></a>\n' +
'      <a href="/eighth-inch-graph-paper/"><strong>1/8 inch</strong><span>Cross stitch, pixel art and bead patterns</span></a>\n' +
'      <a href="/1cm-graph-paper/"><strong>1 cm</strong><span>Coordinate geometry and large clear plotting</span></a>\n' +
'      <a href="/quarter-inch-graph-paper/"><strong>1/4 inch</strong><span>Quad paper, the US classroom default</span></a>\n' +
'      <a href="/10-squares-per-inch-graph-paper/"><strong>10 per inch</strong><span>Engineering computation work</span></a>\n' +
'      <a href="/half-inch-graph-paper/"><strong>1/2 inch</strong><span>Younger students and rough sketching</span></a>\n' +
'      <a href="/1-inch-graph-paper/"><strong>1 inch</strong><span>Floor plans and room layouts at scale</span></a>\n' +
'    </div>\n' +
'  </section>\n' +
'\n' +
'  <footer>\n' +
'    <span>Graph paper, generated in your browser. Nothing is uploaded.</span>\n' +
'    <span>Free to use, no signup, no watermark &nbsp;&middot;&nbsp; &copy; 2026</span>\n' +
'    <span><a href="mailto:hello@printgridpaper.com">Something wrong with a sheet? Tell me.</a>\n' +
'      &nbsp;&middot;&nbsp; <a href="/print-troubleshooting/">Print help</a></span>\n' +
'  </footer>\n' +
'</main>\n' +
'\n' +
'<script type="application/ld+json">\n' +
'{\n' +
'  "@context": "https://schema.org",\n' +
'  "@graph": [\n' +
'    {\n' +
'      "@type": "BreadcrumbList",\n' +
'      "itemListElement": [\n' +
'        {"@type":"ListItem","position":1,"name":"Graph paper","item":"' + SITE + '/"},\n' +
'        {"@type":"ListItem","position":2,"name":"' + title + '","item":"' + url + '"}\n' +
'      ]\n' +
'    },\n' +
'    {\n' +
'      "@type": "FAQPage",\n' +
'      "mainEntity": [\n' +
'          ' + faqLd + '\n' +
'      ]\n' +
'    }\n' +
'  ]\n' +
'}\n' +
'</script>\n' +
'\n' +
'<script src="/assets/grid-engine.js"></script>\n' +
'<script>' + preset + '</script>\n' +
'<script src="/assets/ui.js"></script>\n' +
'</body>\n' +
'</html>\n';
}

/* --- generate ------------------------------------------------------------- */
var made = [];
SIZES.forEach(function (size) {
  ['black', 'cream'].forEach(function (key) {
    var col = COLORS[key];
    var dir = path.join(ROOT, size.slug + '-' + key);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), page(size, col));
    made.push(size.slug + '-' + key);
  });
});
console.log('Generated ' + made.length + ' pages:');
made.forEach(function (m) { console.log('  ' + m); });