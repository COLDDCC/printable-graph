/* ============================================================================
   tools/gen-extra-pages.js — generate paper-size pages (a3/legal/tabloid) and
   use-driven landing pages (pixel art, knitting, D&D maps, architecture).

       node tools/gen-extra-pages.js
   ========================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');
var GridEngine = require('../assets/grid-engine.js');

var ROOT = path.join(__dirname, '..');
var SITE = 'https://printgridpaper.com';

/* Shared page shell (nav, footer, JSON-LD breadcrumb, engine + ui.js). */
function shell(opts) {
  var preset = "window.PAGE_PRESET = {paper:'" + opts.paper + "', spacing:" + opts.spacing +
               ", unit:'" + opts.unit + "', majorEvery:" + opts.major + "};";
  var crumbs = opts.crumb2 || opts.title;
  return [
'<!DOCTYPE html>',
'<html lang="en">',
'<head>',
'<meta charset="utf-8">',
'<meta name="viewport" content="width=device-width, initial-scale=1">',
'',
'<title>' + opts.title + '</title>',
'<meta name="description" content="' + opts.desc + '">',
'<link rel="canonical" href="' + SITE + opts.urlPath + '">',
'',
'<meta property="og:type" content="website">',
'<meta property="og:title" content="' + opts.title + '">',
'<meta property="og:description" content="' + opts.desc + '">',
'<meta property="og:url" content="' + SITE + opts.urlPath + '">',
'<meta name="twitter:card" content="summary">',
'',
'<link rel="icon" href="/favicon.ico" sizes="any">',
'<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">',
'<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png">',
'<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">',
'<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
'',
'<link rel="preconnect" href="https://fonts.googleapis.com">',
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
'<link href="https://fonts.googleapis.com/css2?family=Anybody:wght@500;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">',
'',
'<link rel="stylesheet" href="/assets/site.css">',
opts.extraCss || '',
'',
'<!-- Google tag (gtag.js) -->',
'<script async src="https://www.googletagmanager.com/gtag/js?id=G-WFH3F9TQCN"></script>',
'<script>',
'  window.dataLayer = window.dataLayer || [];',
'  function gtag(){dataLayer.push(arguments);}',
'  gtag(\'js\', new Date());',
'  gtag(\'config\', \'G-WFH3F9TQCN\');',
'</script>',
'</head>',
'<body>',
'',
'<header>',
'  <div class="wrap mast">',
'    <a class="brand" href="/">',
'      <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><rect width="16" height="16" fill="#fff" stroke="#C3CDD2"/><g stroke="#4A7FB5" stroke-width="1"><path d="M4.5 0v16M8.5 0v16M12.5 0v16M0 4.5h16M0 8.5h16M0 12.5h16"/></g></svg>',
'      Graph Paper',
'    </a>',
'    <nav>',
'      <a href="/#setup">Print settings</a>',
'      <a href="/#sizes">Square sizes</a>',
'      <a href="#faq">FAQ</a>',
'    </nav>',
'  </div>',
'</header>',
'',
'<main class="wrap">',
'',
'  <p class="crumb"><a href="/">Graph paper</a><span>/</span>' + crumbs + '</p>',
'',
'  <div class="hero size">',
'    <p class="eyebrow">' + opts.eyebrow + '</p>',
'    <h1>' + opts.h1 + '</h1>',
'    <p class="lede">' + opts.lede + '</p>',
'  </div>',
'',
opts.tool,
opts.sections || '',
'',
'  <footer>',
'    <span>Graph paper, generated in your browser. Nothing is uploaded.</span>',
'    <span>&copy; 2026</span>',
'    <span><a href="mailto:hello@printgridpaper.com">Something wrong with a sheet? Tell me.</a>',
'      &nbsp;&middot;&nbsp; <a href="/print-troubleshooting/">Print help</a></span>',
'  </footer>',
'</main>',
'',
'<script type="application/ld+json">',
'{',
'  "@context": "https://schema.org",',
'  "@type": "BreadcrumbList",',
'  "itemListElement": [',
'    {"@type":"ListItem","position":1,"name":"Graph paper","item":"' + SITE + '/"},',
'    {"@type":"ListItem","position":2,"name":"' + opts.title + '","item":"' + SITE + opts.urlPath + '"}',
'  ]',
'}',
'</script>',
'',
'<script src="/assets/grid-engine.js"></script>',
'<script>' + preset + '</script>',
'<script src="/assets/ui.js"></script>',
'</body>',
'</html>'
  ].join('\n') + '\n';
}

/* The generator tool block (reused by paper & use pages). */
function toolBlock(sizeLabel, paperLabel, paper, spacing, unit, major) {
  return [
'  <div class="tool">',
'    <div class="sheet-frame">',
'      <div id="sheet" class="sheet"></div>',
'      <div class="sheet-meta"><span id="metaGrid">&mdash;</span><span id="metaSize">&mdash;</span></div>',
'    </div>',
'',
'    <div class="block">',
'      <div class="block-hd"><span>Your sheet</span><span id="oBytes">&mdash;</span></div>',
'      <div class="preset-chips" id="presetChips" hidden></div>',
'      <div class="cells">',
'        <div class="cell"><label>Square</label><output id="oPitch">' + sizeLabel + '</output></div>',
'        <div class="cell"><label>Paper</label><output id="oSheet">' + paperLabel + '</output></div>',
'      </div>',
'',
'      <div class="ctrls">',
'        <div class="f">',
'          <span>Square size</span>',
'          <div class="presets" id="presets">',
'            <button type="button" data-s="5" data-u="mm" data-m="5">5 mm</button>',
'            <button type="button" data-s="10" data-u="mm" data-m="10">1 cm</button>',
'            <button type="button" data-s="0.25" data-u="in" data-m="4">1/4 in</button>',
'            <button type="button" data-s="0.5" data-u="in" data-m="2">1/2 in</button>',
'            <button type="button" data-s="1" data-u="in" data-m="0">1 in</button>',
'            <button type="button" data-s="0.1" data-u="in" data-m="10">10 per in</button>',
'          </div>',
'        </div>',
'',
'        <div class="row">',
'          <div class="f"><span>Custom size</span><input id="spacing" type="number" min="0.05" step="' + (unit === 'in' ? '0.125' : '0.5') + '" value="' + spacing + '" aria-label="Custom square size"></div>',
'          <div class="f"><span>Unit</span>',
'            <div class="seg" id="unit">',
'              <button type="button" data-v="mm" aria-pressed="' + (unit === 'mm') + '">mm</button>',
'              <button type="button" data-v="in" aria-pressed="' + (unit === 'in') + '">inch</button>',
'            </div>',
'          </div>',
'        </div>',
'',
'        <div class="f">',
'          <span>Paper</span>',
'          <select id="paper" aria-label="Paper size">',
'            <option value="a4">A4 &mdash; 210 &times; 297 mm</option>',
'            <option value="letter">Letter &mdash; 8.5 &times; 11 in</option>',
'            <option value="a5">A5 &mdash; 148 &times; 210 mm</option>',
'            <option value="a3"' + (paper === 'a3' ? ' selected' : '') + '>A3 &mdash; 297 &times; 420 mm</option>',
'            <option value="legal"' + (paper === 'legal' ? ' selected' : '') + '>Legal &mdash; 8.5 &times; 14 in</option>',
'            <option value="tabloid"' + (paper === 'tabloid' ? ' selected' : '') + '>Tabloid &mdash; 11 &times; 17 in</option>',
'          </select>',
'        </div>',
'',
'        <div class="row">',
'          <div class="f"><span>Orientation</span>',
'            <div class="seg" id="orient">',
'              <button type="button" data-v="portrait" aria-pressed="true">Portrait</button>',
'              <button type="button" data-v="landscape" aria-pressed="false">Landscape</button>',
'            </div>',
'          </div>',
'          <div class="f"><span>Heavy line every</span><input id="major" type="number" min="0" max="20" step="1" value="' + major + '" aria-label="Heavy line every N squares"></div>',
'        </div>',
'',
'        <label class="check"><input type="checkbox" id="calib" checked>',
'          <span>Include the measuring bars. Turn this off once you\'ve confirmed your printer setting and want a clean sheet.</span></label>',
'',
'        <div class="row">',
'          <div class="f"><span>Copies per PDF</span><input id="copies" type="number" min="1" max="25" step="1" value="1" aria-label="Copies per PDF"></div>',
'          <div class="f"><span>Preset</span><button type="button" class="btn-save" id="presetSave">Save settings</button></div>',
'        </div>',
'',
'        <button class="dl" id="dl" type="button">Download PDF</button>',
'      </div>',
'    </div>',
'  </div>'
  ].join('\n');
}

function factsRow(paper, spacing, unit, major) {
  var g = GridEngine.computeGrid({ paper: paper, spacing: spacing, unit: unit, majorEvery: major, calibration: true });
  return { cols: g.cols, rows: g.rows, count: g.cols * g.rows };
}

function relatedSizes() {
  return [
'    <div class="related">',
'      <a href="/2mm-graph-paper/"><strong>2 mm</strong><span>Dense plotting and fine detail work</span></a>',
'      <a href="/5mm-graph-paper/"><strong>5 mm</strong><span>The metric school and notebook grid</span></a>',
'      <a href="/eighth-inch-graph-paper/"><strong>1/8 inch</strong><span>Cross stitch, pixel art and bead patterns</span></a>',
'      <a href="/1cm-graph-paper/"><strong>1 cm</strong><span>Coordinate geometry and large clear plotting</span></a>',
'      <a href="/quarter-inch-graph-paper/"><strong>1/4 inch</strong><span>Quad paper, the US classroom default</span></a>',
'      <a href="/10-squares-per-inch-graph-paper/"><strong>10 per inch</strong><span>Engineering computation work</span></a>',
'      <a href="/half-inch-graph-paper/"><strong>1/2 inch</strong><span>Younger students and rough sketching</span></a>',
'      <a href="/1-inch-graph-paper/"><strong>1 inch</strong><span>Floor plans and room layouts at scale</span></a>',
'    </div>'
  ].join('\n');
}

/* --- paper-size pages ------------------------------------------------------ */
var PAPER_PAGES = [
  {
    urlPath: '/a3-graph-paper/', slug: 'a3-graph-paper',
    paper: 'a3', spacing: 5, unit: 'mm', major: 5, sizeLabel: '5 mm', paperLabel: 'A3',
    title: 'A3 Graph Paper — Free Printable PDF, 297 × 420 mm',
    desc: 'Free printable A3 graph paper with 5 mm squares, plus any custom size, on the double-A4 sheet. Every sheet carries a measuring bar so you can check the squares print true to size.',
    eyebrow: '297 × 420 mm &middot; the big metric sheet',
    h1: 'A3 graph paper',
    lede: 'A3 is exactly double an A4 sheet &mdash; same shape, twice the area &mdash; so the grid continues cleanly across two A4 pages if you ever tile a print. It is the size for large technical drawings and layouts that a notebook page cannot hold.',
    extraCss: '',
    body: function () {
      var r5 = factsRow('a3', 5, 'mm', 5), r2 = factsRow('a3', 2, 'mm', 5), r10 = factsRow('a3', 10, 'mm', 10);
      return [
'',
'  <section id="facts">',
'    <div class="sec-hd">',
'      <h2>What fits on an A3 sheet</h2>',
'      <p class="sec-lede">A3 measures 297 by 420 mm. With the measuring bars on and portrait orientation, whole squares that fit:</p>',
'    </div>',
'    <div class="tscroll">',
'      <table class="facts">',
'        <thead><tr><th scope="col">Square size</th><th scope="col">Grid</th><th scope="col">Squares</th></tr></thead>',
'        <tbody>',
'          <tr><th scope="row">2 mm</th><td>' + r2.cols + ' &times; ' + r2.rows + '</td><td><b>' + r2.count + '</b></td></tr>',
'          <tr><th scope="row">5 mm</th><td>' + r5.cols + ' &times; ' + r5.rows + '</td><td><b>' + r5.count + '</b></td></tr>',
'          <tr><th scope="row">1 cm</th><td>' + r10.cols + ' &times; ' + r10.rows + '</td><td><b>' + r10.count + '</b></td></tr>',
'        </tbody>',
'      </table>',
'    </div>',
'  </section>',
'',
'  <section id="uses">',
'    <div class="sec-hd"><h2>Where A3 earns its size</h2></div>',
'    <div class="uses">',
'      <div><h3>Technical drawing</h3><p>Engineering sketches, isometric views and detail sheets that keep every dimension readable instead of crammed.</p></div>',
'      <div><h3>Poster &amp; display layouts</h3><p>Mood boards, project posters and hand-lettered sheets with room for a full-size layout.</p></div>',
'      <div><h3>Big floor plans</h3><p>On 1/4 inch or 1 cm grids, one A3 page covers a large room or a small apartment at full scale.</p></div>',
'    </div>',
'  </section>',
'',
'  <section id="faq">',
'    <div class="sec-hd"><h2>Questions about A3</h2></div>',
'    <div class="faq">',
'      <details><summary>Will it print on my A4 printer?</summary><p>Only if your printer has an A3 tray &mdash; most home printers do not. An A3 PDF sent to an A4 machine gets shrunk to fit, which breaks the grid scale. If you do not have A3 paper, tile across two A4 sheets instead, or use the A4 size above.</p></details>',
'      <details><summary>How do I check it printed at size?</summary><p>The measuring bars in the bottom margin are the proof: the upper must read 100 mm and the lower 4 in. Set the print scale to 100% / Actual Size first.</p></details>',
'    </div>',
'  </section>',
'',
'  <section id="related">',
'    <div class="sec-hd"><h2>Other square sizes</h2></div>',
relatedSizes(),
'  </section>'
      ].join('\n');
    }
  },
  {
    urlPath: '/legal-size-graph-paper/', slug: 'legal-size-graph-paper',
    paper: 'legal', spacing: 0.25, unit: 'in', major: 4, sizeLabel: '1/4 inch', paperLabel: 'Legal',
    title: 'Legal Size Graph Paper — Free Printable PDF, 8.5 × 14 in',
    desc: 'Free printable legal-size graph paper, 8.5 × 14 in, with quarter-inch squares or any custom grid. Every sheet carries a measuring bar so you can check it prints true to size.',
    eyebrow: '8.5 × 14 in &middot; the long US legal sheet',
    h1: 'Legal size graph paper',
    lede: 'Legal is Letter with three extra inches of length &mdash; same width, 14 in tall. That extra run suits long tables, tall plots and contracts that need ruled working space below the text.',
    extraCss: '',
    body: function () {
      var r4 = factsRow('legal', 0.25, 'in', 4), r5 = factsRow('legal', 5, 'mm', 5), r10 = factsRow('legal', 0.1, 'in', 10);
      return [
'',
'  <section id="facts">',
'    <div class="sec-hd">',
'      <h2>What fits on a legal sheet</h2>',
'      <p class="sec-lede">Legal is 8.5 by 14 inches. Whole squares that fit, measuring bars on, portrait:</p>',
'    </div>',
'    <div class="tscroll">',
'      <table class="facts">',
'        <thead><tr><th scope="col">Square size</th><th scope="col">Grid</th><th scope="col">Squares</th></tr></thead>',
'        <tbody>',
'          <tr><th scope="row">1/4 inch</th><td>' + r4.cols + ' &times; ' + r4.rows + '</td><td><b>' + r4.count + '</b></td></tr>',
'          <tr><th scope="row">5 mm</th><td>' + r5.cols + ' &times; ' + r5.rows + '</td><td><b>' + r5.count + '</b></td></tr>',
'          <tr><th scope="row">10 per inch</th><td>' + r10.cols + ' &times; ' + r10.rows + '</td><td><b>' + r10.count + '</b></td></tr>',
'        </tbody>',
'      </table>',
'    </div>',
'  </section>',
'',
'  <section id="uses">',
'    <div class="sec-hd"><h2>Why you might want the longer sheet</h2></div>',
'    <div class="uses">',
'      <div><h3>Long tables &amp; ledgers</h3><p>Twelve months of columns, or a full-page schedule, without the cramped feel of fitting it into Letter height.</p></div>',
'      <div><h3>Tall plots</h3><p>Financial charts and time-series plots get three more inches of vertical scale.</p></div>',
'      <div><h3>Legal &amp; contract roughs</h3><p>Margined drafting space on the same paper size your office already prints documents on.</p></div>',
'    </div>',
'  </section>',
'',
'  <section id="faq">',
'    <div class="sec-hd"><h2>Questions about legal size</h2></div>',
'    <div class="faq">',
'      <details><summary>Will it fit in my printer?</summary><p>Legal paper fits most US office printers and many home multi-function machines, but not all. Check your paper settings; if legal is not an option, the driver cannot print it at true size.</p></details>',
'      <details><summary>Is legal the same as A4?</summary><p>No &mdash; A4 is 210 × 297 mm (about 8.3 × 11.7 in). Legal is 8.5 × 14 in, both wider and noticeably longer. A legal PDF printed on A4 must shrink and will be wrong.</p></details>',
'    </div>',
'  </section>',
'',
'  <section id="related">',
'    <div class="sec-hd"><h2>Other square sizes</h2></div>',
relatedSizes(),
'  </section>'
      ].join('\n');
    }
  },
  {
    urlPath: '/tabloid-graph-paper/', slug: 'tabloid-graph-paper',
    paper: 'tabloid', spacing: 0.25, unit: 'in', major: 4, sizeLabel: '1/4 inch', paperLabel: 'Tabloid',
    title: 'Tabloid Graph Paper — Free Printable PDF, 11 × 17 in (Ledger)',
    desc: 'Free printable tabloid (ledger) graph paper, 11 × 17 in, with quarter-inch squares or any custom size. Every sheet carries a measuring bar so you can check it prints true to size.',
    eyebrow: '11 × 17 in &middot; ledger &amp; blueprint size',
    h1: 'Tabloid graph paper',
    lede: 'Tabloid (the same sheet sold as ledger) is the big US working paper &mdash; 11 by 17 inches, twice Letter in area. It is the classic blueprint and drafting size, and a single sheet holds a floor plan that Letter cannot.',
    extraCss: '',
    body: function () {
      var r4 = factsRow('tabloid', 0.25, 'in', 4), r5 = factsRow('tabloid', 5, 'mm', 5), r1 = factsRow('tabloid', 1, 'in', 0);
      return [
'',
'  <section id="facts">',
'    <div class="sec-hd">',
'      <h2>What fits on a tabloid sheet</h2>',
'      <p class="sec-lede">Tabloid is 11 by 17 inches. Whole squares that fit, measuring bars on, portrait:</p>',
'    </div>',
'    <div class="tscroll">',
'      <table class="facts">',
'        <thead><tr><th scope="col">Square size</th><th scope="col">Grid</th><th scope="col">Squares</th></tr></thead>',
'        <tbody>',
'          <tr><th scope="row">1/4 inch</th><td>' + r4.cols + ' &times; ' + r4.rows + '</td><td><b>' + r4.count + '</b></td></tr>',
'          <tr><th scope="row">5 mm</th><td>' + r5.cols + ' &times; ' + r5.rows + '</td><td><b>' + r5.count + '</b></td></tr>',
'          <tr><th scope="row">1 inch</th><td>' + r1.cols + ' &times; ' + r1.rows + '</td><td><b>' + r1.count + '</b></td></tr>',
'        </tbody>',
'      </table>',
'    </div>',
'  </section>',
'',
'  <section id="uses">',
'    <div class="sec-hd"><h2>Where tabloid is the standard</h2></div>',
'    <div class="uses">',
'      <div><h3>Blueprints &amp; drawings</h3><p>Architectural and engineering drawings are traditionally printed 11 × 17. Grid it for the draft stage, print clean for delivery.</p></div>',
'      <div><h3>Large floor plans</h3><p>At 1/4 inch to the foot, one sheet covers a 40 × 60 ft layout &mdash; most of a house on a single page.</p></div>',
'      <div><h3>Publishing roughs</h3><p>Newspaper and magazine spreads are laid out on tabloid, making it the natural grid for print-layout thumbnails.</p></div>',
'    </div>',
'  </section>',
'',
'  <section id="faq">',
'    <div class="sec-hd"><h2>Questions about tabloid size</h2></div>',
'    <div class="faq">',
'      <details><summary>Do I need a special printer?</summary><p>Tabloid prints on A3-capable or 11 × 17-capable office printers. Most home printers cap at Letter/A4 and will refuse or shrink the job.</p></details>',
'      <details><summary>Is tabloid the same as ledger?</summary><p>Yes, they are the same 11 × 17 in sheet &mdash; tabloid names it by orientation and ledger by accounting tradition. Pick whichever term your printer driver uses.</p></details>',
'    </div>',
'  </section>',
'',
'  <section id="related">',
'    <div class="sec-hd"><h2>Other square sizes</h2></div>',
relatedSizes(),
'  </section>'
      ].join('\n');
    }
  }
];

/* --- use-driven pages ------------------------------------------------------ */
var USE_PAGES = [
  {
    urlPath: '/graph-paper-for-pixel-art/', slug: 'graph-paper-for-pixel-art',
    paper: 'letter', spacing: 0.125, unit: 'in', major: 8, sizeLabel: '1/8 inch', paperLabel: 'Letter',
    title: 'Graph Paper for Pixel Art — Free Printable Pixel Grid',
    desc: 'Free printable pixel-art graph paper. One square = one pixel. Use 1/8 inch for 8-bit sprites and 1/4 inch for chunky 16-bit work, then fill with your pixel palette.',
    eyebrow: 'One square = one pixel',
    h1: 'Graph paper for pixel art',
    lede: 'Pixel art needs a grid where every square is exactly one pixel. On 1/8 inch paper, 100 squares are 12.5 inches, so most sprites and icons fit a single sheet &mdash; and the heavy line every 8 squares gives you natural 8&times;8 tiles.',
    extraCss: '',
    body: function () {
      return [
'',
'  <section id="pick">',
'    <div class="sec-hd">',
'      <h2>Which size to choose</h2>',
'    </div>',
'    <div class="uses">',
'      <div><h3>1/8 inch &mdash; sprites &amp; icons</h3><p>64&times;64 or smaller sprites map cleanly. 1/8 in is 3.2 mm, fine enough for a sheet of pixels, coarse enough to see.</p></div>',
'      <div><h3>1/4 inch &mdash; chunky 16-bit</h3><p>Bigger pixels for 16-bit characters and tiles, easier on the eyes when you fill with pencil or marker. <a href="/quarter-inch-graph-paper/">Open 1/4 inch</a>.</p></div>',
'      <div><h3>1 cm &mdash; room-scale scenes</h3><p>Whole scenes and level maps with one square per metre of in-game space. <a href="/1cm-graph-paper/">Open 1 cm</a>.</p></div>',
'    </div>',
'  </section>',
'',
'  <section id="howto">',
'    <div class="sec-hd"><h2>How to use it</h2></div>',
'    <div class="faq">',
'      <details open><summary>Plan the sprite before drawing</summary><p>Sketch your palette in a corner first. Then outline the character on the grid, treating each square as one pixel. The heavy lines every 8 squares keep your tile sizes honest.</p></details>',
'      <details><summary>Fill in light order</summary><p>Do outlines first, then flat fills, then dithering or shading last. Erasing is easier on paper than in software, so pencil in, then ink what survives.</p></details>',
'      <details><summary>Scan or photograph to digitise</summary><p>Photograph straight-on in even light, or scan at 300 dpi. The measuring bar proves the grid is true to size if you later trace over the scan.</p></details>',
'    </div>',
'  </section>',
'',
'  <section id="related">',
'    <div class="sec-hd"><h2>Ready-made sheets</h2></div>',
relatedSizes(),
'  </section>'
      ].join('\n');
    }
  },
  {
    urlPath: '/graph-paper-for-knitting/', slug: 'graph-paper-for-knitting',
    paper: 'a4', spacing: 5, unit: 'mm', major: 5, sizeLabel: '5 mm', paperLabel: 'A4',
    title: 'Graph Paper for Knitting & Crochet — Free Printable Charts',
    desc: 'Free printable knitting and crochet chart paper. Draft colourwork, lace and intarsia patterns on a grid where one square is one stitch.',
    eyebrow: 'One square = one stitch',
    h1: 'Graph paper for knitting &amp; crochet',
    lede: 'Charts turn a stitch repeat into squares you can read. 5 mm squares leave room for a pencil symbol, while the heavy line every 5 squares matches common repeat widths.',
    extraCss: '',
    body: function () {
      return [
'',
'  <section id="pick">',
'    <div class="sec-hd"><h2>Which size to choose</h2></div>',
'    <div class="uses">',
'      <div><h3>5 mm &mdash; standard charts</h3><p>Room for a stitch symbol, and the 5-square heavy blocks suit most colourwork repeats. The default on this page.</p></div>',
'      <div><h3>1/8 inch &mdash; fine lace</h3><p>Tighter squares when a chart carries a symbol in every cell and you need many rows per page. <a href="/eighth-inch-graph-paper/">Open 1/8 inch</a>.</p></div>',
'      <div><h3>1 cm &mdash; chunky yarn</h3><p>Big squares for beginner charts or when a repeat is coarse and heavily charted. <a href="/1cm-graph-paper/">Open 1 cm</a>.</p></div>',
'    </div>',
'  </section>',
'',
'  <section id="howto">',
'    <div class="sec-hd"><h2>Charting tips</h2></div>',
'    <div class="faq">',
'      <details open><summary>Read rows bottom-up</summary><p>Knitting charts are read from the bottom, right to left on the right side and left to right on wrong-side rows. Mark off rows with a ruler or the copies feature if you want two identical sheets.</p></details>',
'      <details><summary>Colour one square per stitch</summary><p>For colourwork, pencil a block for each stitch of the contrast colour. The heavy lines help you spot repeat boundaries.</p></details>',
'      <details><summary>Check your gauge matters</summary><p>Charts are stitch-counts, not physical size &mdash; the paper grid is for planning, and your gauge decides the finished dimensions.</p></details>',
'    </div>',
'  </section>',
'',
'  <section id="related">',
'    <div class="sec-hd"><h2>Ready-made sheets</h2></div>',
relatedSizes(),
'  </section>'
      ].join('\n');
    }
  },
  {
    urlPath: '/graph-paper-for-dnd-maps/', slug: 'graph-paper-for-dnd-maps',
    paper: 'letter', spacing: 0.25, unit: 'in', major: 4, sizeLabel: '1/4 inch', paperLabel: 'Letter',
    title: 'Graph Paper for D&D Maps — Free Printable Dungeon Grid',
    desc: 'Free printable D&D battle and dungeon map paper. Quarter-inch squares map one square to one 5-foot grid cell, the default for most tabletop RPGs.',
    eyebrow: 'One square = one 5-foot cell',
    h1: 'Graph paper for D&amp;D maps',
    lede: 'Most tabletop RPGs use a 5-foot grid, and the classic answer is a quarter-inch grid where one square is one 5-foot cell. A Letter sheet gives you a 30 &times; 40 cell map &mdash; most dungeons fit.',
    extraCss: '',
    body: function () {
      return [
'',
'  <section id="pick">',
'    <div class="sec-hd"><h2>Which size to choose</h2></div>',
'    <div class="uses">',
'      <div><h3>1/4 inch &mdash; battle maps</h3><p>The standard. One square is one 5-foot cell, and four squares make an inch for easy scale. Default on this page.</p></div>',
'      <div><h3>5 mm &mdash; region maps</h3><p>Tighter grid for overland hex-style planning where the party covers miles. <a href="/5mm-graph-paper/">Open 5 mm</a>.</p></div>',
'      <div><h3>1 cm &mdash; hand-drawn dungeons</h3><p>Bigger squares if your sessions run combat on the paper with minis or dice. <a href="/1cm-graph-paper/">Open 1 cm</a>.</p></div>',
'    </div>',
'  </section>',
'',
'  <section id="howto">',
'    <div class="sec-hd"><h2>Mapping tips</h2></div>',
'    <div class="faq">',
'      <details open><summary>Pencil the dungeon, ink the result</summary><p>Draft walls in pencil while exploring, then ink the final map after the session so later encounters stay clean.</p></details>',
'      <details><summary>Count grid cells, not inches</summary><p>Because one square is 5 feet, a corridor three squares wide is 15 feet &mdash; exactly what your movement rules expect.</p></details>',
'      <details><summary>Print a spare</summary><p>Use the copies feature to print 3&ndash;5 identical sheets at once, one per player, or keep spares for campaign mapping.</p></details>',
'    </div>',
'  </section>',
'',
'  <section id="related">',
'    <div class="sec-hd"><h2>Ready-made sheets</h2></div>',
relatedSizes(),
'  </section>'
      ].join('\n');
    }
  },
  {
    urlPath: '/graph-paper-for-architecture/', slug: 'graph-paper-for-architecture',
    paper: 'letter', spacing: 0.25, unit: 'in', major: 4, sizeLabel: '1/4 inch', paperLabel: 'Letter',
    title: 'Graph Paper for Architecture — Free Printable Scale Paper',
    desc: 'Free printable architectural graph paper. Draft floor plans at 1/4 inch to the foot, where one square is one foot, or choose 1 inch and 1 cm grids for detail work.',
    eyebrow: 'One square = one foot at 1/4" scale',
    h1: 'Graph paper for architecture',
    lede: 'The default US floor-plan scale is a quarter inch to the foot. On this grid one square is exactly one foot, so a 12 &times; 15 ft room is 12 by 15 squares with no arithmetic.',
    extraCss: '',
    body: function () {
      return [
'',
'  <section id="pick">',
'    <div class="sec-hd"><h2>Which size to choose</h2></div>',
'    <div class="uses">',
'      <div><h3>1/4 inch &mdash; floor plans</h3><p>The scale architects mean by &ldquo;quarter-inch drawings&rdquo;. One square is one foot. Default on this page.</p></div>',
'      <div><h3>1 inch &mdash; detail sections</h3><p>1 inch to the foot (1:12) for wall sections and joinery where a quarter inch is too coarse. <a href="/1-inch-graph-paper/">Open 1 inch</a>.</p></div>',
'      <div><h3>1 cm &mdash; metric work</h3><p>One square is 10 mm, close to a 1:100 metric convention for site and floor layouts. <a href="/1cm-graph-paper/">Open 1 cm</a>.</p></div>',
'    </div>',
'  </section>',
'',
'  <section id="howto">',
'    <div class="sec-hd"><h2>Drafting tips</h2></div>',
'    <div class="faq">',
'      <details open><summary>Count squares, not rulers</summary><p>At quarter-inch scale a 15-foot wall is 15 squares long. It is the whole point of the scale &mdash; the grid does the measuring.</p></details>',
'      <details><summary>Sketch massing first</summary><p>Start with wall thickness and door swings in pencil, refine after. Ink only what survives a second read.</p></details>',
'      <details><summary>Verify your print</summary><p>Architecture is where a scaled printout quietly ruins a drawing. Always check the measuring bar reads 100 mm before drafting on it.</p></details>',
'    </div>',
'  </section>',
'',
'  <section id="related">',
'    <div class="sec-hd"><h2>Ready-made sheets</h2></div>',
relatedSizes(),
'  </section>'
      ].join('\n');
    }
  }
];

/* --- write ---------------------------------------------------------------- */
var made = [];
PAPER_PAGES.forEach(function (p) {
  var dir = path.join(ROOT, p.slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  var html = shell({
    title: p.title, desc: p.desc, urlPath: p.urlPath, crumb2: p.title.split(' — ')[0].toLowerCase(),
    eyebrow: p.eyebrow, h1: p.h1, lede: p.lede,
    paper: p.paper, spacing: p.spacing, unit: p.unit, major: p.major,
    tool: toolBlock(p.sizeLabel, p.paperLabel, p.paper, p.spacing, p.unit, p.major),
    sections: p.body()
  });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  made.push(p.slug);
});

USE_PAGES.forEach(function (p) {
  var dir = path.join(ROOT, p.slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  var html = shell({
    title: p.title, desc: p.desc, urlPath: p.urlPath,
    eyebrow: p.eyebrow, h1: p.h1, lede: p.lede,
    paper: p.paper, spacing: p.spacing, unit: p.unit, major: p.major,
    tool: toolBlock(p.sizeLabel, p.paperLabel, p.paper, p.spacing, p.unit, p.major),
    sections: p.body()
  });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  made.push(p.slug);
});

console.log('Generated ' + made.length + ' pages:');
made.forEach(function (m) { console.log('  ' + m); });