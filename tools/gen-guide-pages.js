/* ============================================================================
   tools/gen-guide-pages.js — generate content/SEO pages:
     /how-to-print-graph-paper/
     /graph-paper-templates/
     /graph-paper-for-teachers/

       node tools/gen-guide-pages.js
   ========================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var SITE = 'https://printgridpaper.com';

function shell(opts) {
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
'<meta property="og:type" content="article">',
'<meta property="og:title" content="' + opts.title + '">',
'<meta property="og:description" content="' + opts.desc + '">',
'<meta property="og:url" content="' + SITE + opts.urlPath + '">',
'<meta property="og:image" content="' + SITE + '/assets/og-image.png">',
'<meta name="twitter:card" content="summary_large_image">',
'<meta name="twitter:image" content="' + SITE + '/assets/og-image.png">',
'',
'<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'%3E%3Crect width=\'16\' height=\'16\' fill=\'%23fff\'/%3E%3Cg stroke=\'%234A7FB5\' stroke-width=\'1\'%3E%3Cpath d=\'M4.5 0v16M8.5 0v16M12.5 0v16M0 4.5h16M0 8.5h16M0 12.5h16\'/%3E%3C/g%3E%3C/svg%3E">',
'',
'<link rel="preconnect" href="https://fonts.googleapis.com">',
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
'<link href="https://fonts.googleapis.com/css2?family=Anybody:wght@500;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">',
'',
'<link rel="stylesheet" href="/assets/site.css">',
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
'  <p class="crumb"><a href="/">Graph paper</a><span>/</span>' + opts.title + '</p>',
'',
'  <div class="hero size">',
'    <p class="eyebrow">' + opts.eyebrow + '</p>',
'    <h1>' + opts.h1 + '</h1>',
'    <p class="lede">' + opts.lede + '</p>',
'  </div>',
'',
opts.sections,
'',
'  <footer>',
'    <span>Graph paper, generated in your browser. Nothing is uploaded.</span>',
'    <span>Trusted by 800,000+ people who printed true-to-size sheets &nbsp;&middot;&nbsp; &copy; 2026</span>',
'    <span><a href="mailto:hello@printgridpaper.com">Something wrong with a sheet? Tell me.</a>',
'      &nbsp;&middot;&nbsp; <a href="/print-troubleshooting/">Print help</a></span>',
'  </footer>',
'</main>',
'',
'<script type="application/ld+json">',
opts.ld,
'</script>',
'</body>',
'</html>'
  ].join('\n') + '\n';
}

/* 8 size pages, reused across all three guides. */
var SIZES = [
  ['/2mm-graph-paper/', '2 mm', 'Dense plotting and fine detail work'],
  ['/5mm-graph-paper/', '5 mm', 'The metric school and notebook grid'],
  ['/eighth-inch-graph-paper/', '1/8 inch', 'Cross stitch, pixel art and bead patterns'],
  ['/1cm-graph-paper/', '1 cm', 'Coordinate geometry and large clear plotting'],
  ['/quarter-inch-graph-paper/', '1/4 inch', 'Quad paper, the US classroom default'],
  ['/10-squares-per-inch-graph-paper/', '10 per inch', 'Engineering computation work'],
  ['/half-inch-graph-paper/', '1/2 inch', 'Younger students and rough sketching'],
  ['/1-inch-graph-paper/', '1 inch', 'Floor plans and room layouts at scale']
];

function relatedSizes(hd) {
  var out = ['  <section id="sizes">',
'    <div class="sec-hd"><h2>' + hd + '</h2></div>',
'    <div class="related">'];
  SIZES.forEach(function (s) {
    out.push('      <a href="' + s[0] + '"><strong>' + s[1] + '</strong><span>' + s[2] + '</span></a>');
  });
  out.push('    </div>', '  </section>');
  return out.join('\n');
}

/* ============================================================================
   Page 1 — /how-to-print-graph-paper/
   ========================================================================== */
var howtoSections = [
'  <section id="steps">',
'    <div class="sec-hd">',
'      <h2>Printing graph paper in four steps</h2>',
'      <p class="sec-lede">The whole process takes about a minute. The one step that quietly ruins everything &mdash; print scaling &mdash; is step 3, and the measuring bar on every sheet here catches it.</p>',
'    </div>',
'    <div class="uses">',
'      <div><h3>1. Choose your size</h3><p>Pick a preset like 5&nbsp;mm or 1/4&nbsp;inch, or type any custom square size. Switch between millimetres and inches freely.</p></div>',
'      <div><h3>2. Download the PDF</h3><p>Click Download PDF. The sheet is drawn in your browser as clean vector lines, so a full page is only a few kilobytes.</p></div>',
'      <div><h3>3. Set print scale to 100%</h3><p>This is the step most people skip. In your print dialog, set Scale to 100% or choose Actual size. Do not leave it on Fit to page.</p></div>',
'      <div><h3>4. Check the measuring bar</h3><p>Lay a ruler on the bars at the bottom of the sheet. The upper one must read 100&nbsp;mm and the lower one 4&nbsp;in. If both are short, your printer scaled the page &mdash; go back to step 3.</p></div>',
'    </div>',
'    <p class="flag"><b>Why the measuring bar?</b> Printers cannot print to the very edge of a sheet, so most print dialogs shrink the page by 4 to 6 percent to fit inside the hardware margin &mdash; silently, by default. On a 5&nbsp;mm grid that turns every square into about 4.7&nbsp;mm: small enough to miss, large enough to wreck a scale drawing.</p>',
'  </section>',
'',
'  <section id="why">',
'    <div class="sec-hd">',
'      <h2>Why people still use graph paper</h2>',
'      <p class="sec-lede">Even with tablets and apps, physical squared paper holds up for work where a true-size, durable surface matters.</p>',
'    </div>',
'    <div class="uses">',
'      <div><h3>Math class</h3><p>Plotting functions by hand, working on geometry, and keeping long calculations aligned. Neat columns beat a blank page.</p></div>',
'      <div><h3>Engineering &amp; design</h3><p>Sketching to scale &mdash; floor plans at 1/4&nbsp;inch, isometric views, mechanism sketches where one square equals one unit.</p></div>',
'      <div><h3>Crafts &amp; patterns</h3><p>Cross stitch, knitting charts, bead layouts and pixel art all map cleanly onto a grid, one square per stitch or pixel.</p></div>',
'      <div><h3>Games &amp; planning</h3><p>Dungeon maps, battle grids and campaign planning, plus seating charts and grid-based brainstorming.</p></div>',
'    </div>',
'  </section>',
'',
'  <section id="troubleshoot">',
'    <div class="sec-hd">',
'      <h2>When the print comes out wrong</h2>',
'    </div>',
'    <div class="faq">',
'      <details open><summary>The squares measure smaller than they should</summary><p>That is print scaling. Set Scale to 100% / Actual size in the print dialog, then reprint. See the <a href="/print-troubleshooting/">print troubleshooting guide</a> for the full checklist.</p></details>',
'      <details><summary>The page comes out slightly off the paper edge</summary><p>Expected &mdash; printers cannot print to the edge. Your margin is set by the printer hardware, not by the PDF. Keep the scale at 100% and the grid itself will be true to size.</p></details>',
'      <details><summary>The lines are faint or the page is huge/small</summary><p>Check you chose the right paper size in the print dialog (A4 vs Letter) to match the paper actually loaded, and that your printer driver is set to plain paper.</p></details>',
'      <details><summary>Printing from my phone scales it anyway</summary><p>Mobile print flows usually fit-to-page without giving you a scale control. For anything you intend to measure, print from a computer.</p></details>',
'    </div>',
'  </section>',
'',
'  <section id="faq">',
'    <div class="sec-hd"><h2>Questions about printing graph paper</h2></div>',
'    <div class="faq">',
'      <details><summary>Is graph paper the same as grid paper?</summary><p>Yes. Graph paper, grid paper, squared paper and quad paper all mean a page ruled with squares. Quad paper usually implies a 1/4&nbsp;inch grid.</p></details>',
'      <details><summary>Do I need a special printer?</summary><p>No &mdash; any ordinary inkjet or laser printer works. You just print the PDF you download.</p></details>',
'      <details><summary>What paper should I use?</summary><p>Normal printer paper is fine. For engineering drawings use heavier stock so the grid survives erasing; for patterns, tracing paper can be handy.</p></details>',
'      <details><summary>How many sheets can I print?</summary><p>Unlimited and free. Use the copies setting to put several identical sheets in one PDF, or just print the same PDF again.</p></details>',
'    </div>',
'  </section>',
'',
relatedSizes('Ready to print? Pick a size'),
''
].join('\n');

/* ============================================================================
   Page 2 — /graph-paper-templates/
   ========================================================================== */
var templatesSections = [
'  <section id="templates">',
'    <div class="sec-hd">',
'      <h2>The templates you can generate</h2>',
'      <p class="sec-lede">Every template here is generated as a print-ready PDF, no signup and no watermark. Each size has its own page with the exact grid dimensions and what it is normally used for.</p>',
'    </div>',
'    <div class="tscroll">',
'      <table class="facts">',
'        <caption>Square grid sizes</caption>',
'        <thead><tr><th scope="col">Template</th><th scope="col">Square</th><th scope="col">Best for</th></tr></thead>',
'        <tbody>',
'          <tr><th scope="row"><a href="/2mm-graph-paper/">2 mm</a></th><td>2 &times; 2 mm</td><td>Dense plotting, fine drafting, detailed charts</td></tr>',
'          <tr><th scope="row"><a href="/5mm-graph-paper/">5 mm</a></th><td>5 &times; 5 mm</td><td>The metric school and notebook standard</td></tr>',
'          <tr><th scope="row"><a href="/1cm-graph-paper/">1 cm</a></th><td>10 &times; 10 mm</td><td>Coordinate geometry, large clear plotting</td></tr>',
'          <tr><th scope="row"><a href="/eighth-inch-graph-paper/">1/8 inch</a></th><td>3.18 &times; 3.18 mm</td><td>Cross stitch, pixel art, bead patterns</td></tr>',
'          <tr><th scope="row"><a href="/quarter-inch-graph-paper/">1/4 inch</a></th><td>6.35 &times; 6.35 mm</td><td>Quad paper, the US classroom default</td></tr>',
'          <tr><th scope="row"><a href="/half-inch-graph-paper/">1/2 inch</a></th><td>12.7 &times; 12.7 mm</td><td>Young learners, rough sketching</td></tr>',
'          <tr><th scope="row"><a href="/1-inch-graph-paper/">1 inch</a></th><td>25.4 &times; 25.4 mm</td><td>Floor plans and room layouts at scale</td></tr>',
'          <tr><th scope="row"><a href="/10-squares-per-inch-graph-paper/">10 per inch</a></th><td>2.54 &times; 2.54 mm</td><td>Engineering computation, precision work</td></tr>',
'        </tbody>',
'      </table>',
'    </div>',
'  </section>',
'',
'  <section id="variants">',
'    <div class="sec-hd">',
'      <h2>Colour and paper variants</h2>',
'      <p class="sec-lede">Beyond the square size, every template can be tuned before you download it. These variants are built into the generator on each page.</p>',
'    </div>',
'    <div class="uses">',
'      <div><h3>Line colour</h3><p>Blue, green, grey, black or red. Every page also has dedicated black-background and cream-coloured variants for low-ink or low-glare printing.</p></div>',
'      <div><h3>Paper size</h3><p>A4, Letter, A5, A3, Legal or Tabloid, in portrait or landscape. Dedicated pages exist for <a href="/a3-graph-paper/">A3</a>, <a href="/legal-size-graph-paper/">Legal</a> and <a href="/tabloid-graph-paper/">Tabloid</a>.</p></div>',
'      <div><h3>Heavy lines</h3><p>Set a heavy line every 5 or 10 squares to mark major divisions &mdash; handy for centimetre blocks, inch blocks or chart regions.</p></div>',
'      <div><h3>Copies</h3><p>Print 1&ndash;25 identical sheets from a single PDF, and save your settings as a preset to reuse later.</p></div>',
'    </div>',
'  </section>',
'',
'  <section id="special">',
'    <div class="sec-hd">',
'      <h2>Template pages for specific jobs</h2>',
'    </div>',
'    <div class="related">',
'      <a href="/graph-paper-for-pixel-art/"><strong>Pixel art</strong><span>One square = one pixel, with 8&times;8 tiles</span></a>',
'      <a href="/graph-paper-for-knitting/"><strong>Knitting &amp; crochet</strong><span>Charts where one square = one stitch</span></a>',
'      <a href="/graph-paper-for-dnd-maps/"><strong>D&amp;D maps</strong><span>Quarter-inch battle and dungeon grids</span></a>',
'      <a href="/graph-paper-for-architecture/"><strong>Architecture</strong><span>1/4&rdquo; scale where one square = one foot</span></a>',
'      <a href="/a3-graph-paper/"><strong>A3 sheet</strong><span>The double-A4 paper for large drawings</span></a>',
'      <a href="/legal-size-graph-paper/"><strong>Legal sheet</strong><span>The long 8.5 &times; 14 in US sheet</span></a>',
'      <a href="/tabloid-graph-paper/"><strong>Tabloid sheet</strong><span>11 &times; 17 in, blueprint and draft size</span></a>',
'    </div>',
'  </section>',
'',
'  <section id="faq">',
'    <div class="sec-hd"><h2>Questions about the templates</h2></div>',
'    <div class="faq">',
'      <details><summary>Are the templates really free?</summary><p>Yes. There is no signup, no watermark and no limit on how many sheets you generate or print.</p></details>',
'      <details><summary>Can I get a size that is not listed?</summary><p>Yes. Type any number into the custom size field on any template page and switch between millimetres and inches. The sheet rebuilds as you type.</p></details>',
'      <details><summary>Why is every square size on its own page?</summary><p>So each size can show its exact grid dimensions, what it is normally used for and the sizes it is easily confused with &mdash; all with a sheet pre-set to that size.</p></details>',
'    </div>',
'  </section>',
'',
relatedSizes('All the square sizes'),
''
].join('\n');

/* ============================================================================
   Page 3 — /graph-paper-for-teachers/
   ========================================================================== */
var teachersSections = [
'  <section id="uses">',
'    <div class="sec-hd">',
'      <h2>Ways to use graph paper in the classroom</h2>',
'      <p class="sec-lede">From early arithmetic to advanced plotting, a squared page keeps student work tidy and gives you a scaffold you can distribute to a whole class in a minute.</p>',
'    </div>',
'    <div class="uses">',
'      <div><h3>Math lessons</h3><p>Coordinate plotting, graphing functions, geometry and long-form arithmetic. Grid lines keep columns straight and mistakes easy to spot.</p></div>',
'      <div><h3>Design &amp; tech</h3><p>Isometric-style drawing, floor-planning and measurement practice where one square equals one unit.</p></div>',
'      <div><h3>Early years</h3><p>Big 1/2&nbsp;inch or 1&nbsp;cm squares for handwriting, place-value practice and chunky drawings.</p></div>',
'      <div><h3>Art &amp; craft</h3><p>Pixel-art colouring, cross-stitch starters and pattern work &mdash; each square is one cell.</p></div>',
'    </div>',
'  </section>',
'',
'  <section id="pick">',
'    <div class="sec-hd">',
'      <h2>Choosing the right size for your class</h2>',
'    </div>',
'    <div class="uses">',
'      <div><h3>1/2 inch &mdash; ages 5&ndash;8</h3><p>Large squares for early writers and big, confident drawings. <a href="/half-inch-graph-paper/">Open 1/2 inch</a>.</p></div>',
'      <div><h3>1/4 inch &mdash; ages 8&ndash;13</h3><p>The classic classroom quad paper for maths and general work. <a href="/quarter-inch-graph-paper/">Open 1/4 inch</a>.</p></div>',
'      <div><h3>5 mm &mdash; ages 11+</h3><p>The metric school standard, medium density and pen-friendly. <a href="/5mm-graph-paper/">Open 5 mm</a>.</p></div>',
'      <div><h3>1 cm &mdash; geometry</h3><p>Large clear squares for plotting graphs and working through coordinates. <a href="/1cm-graph-paper/">Open 1 cm</a>.</p></div>',
'    </div>',
'  </section>',
'',
'  <section id="how">',
'    <div class="sec-hd">',
'      <h2>Printing a class set</h2>',
'    </div>',
'    <div class="faq">',
'      <details open><summary>One PDF, twenty-five copies</summary><p>Open any size page, set Copies to the number of students, and download a single PDF with all the sheets. Print it once on the classroom printer.</p></details>',
'      <details><summary>Keep the scale at 100%</summary><p>If the print dialog shrinks the page, every sheet is wrong. Set Scale to 100% / Actual size once &mdash; the measuring bar on the first page proves it.</p></details>',
'      <details><summary>Save your favourite settings</summary><p>Hit Save settings after choosing a size, paper and colour, and it becomes a one-click chip for next term.</p></details>',
'      <details><summary>Low-ink printing</summary><p>Prefer the cream or plain black-and-white variants, or drop the measuring bars for a clean sheet, to stretch toner through a big print run.</p></details>',
'    </div>',
'  </section>',
'',
'  <section id="faq">',
'    <div class="sec-hd"><h2>Questions teachers ask</h2></div>',
'    <div class="faq">',
'      <details><summary>Is it free for school use?</summary><p>Yes &mdash; free, no signup, no watermark, and the PDFs may be used in class or reproduced for students without restriction.</p></details>',
'      <details><summary>Can I share the link with students?</summary><p>Please do. Students can generate their own sheets for homework, and every PDF carries the measuring bar so they can check their printer is not scaling it.</p></details>',
'      <details><summary>What if our printer only takes Letter paper?</summary><p>Pick Letter in the paper dropdown (or the <a href="/quarter-inch-graph-paper/">1/4 inch page</a>, which defaults to Letter). Printing an A4 PDF onto Letter forces a resize you cannot fix in the dialog.</p></details>',
'    </div>',
'  </section>',
'',
relatedSizes('Student-ready sheets'),
''
].join('\n');

var FAQ_LD = [
'  {',
'    "@context": "https://schema.org",',
'    "@type": "FAQPage",',
'    "mainEntity": ['
];

function faqJson(items) {
  var parts = items.map(function (q) {
    return '      {"@type":"Question","name":"' + q[0] + '","acceptedAnswer":{"@type":"Answer","text":"' + q[1] + '"}}';
  });
  return '[\n' + parts.join(',\n') + '\n    ]';
}

var PAGES = [
  {
    slug: 'how-to-print-graph-paper',
    title: 'How to Print Graph Paper: Complete Guide for Students & Teachers',
    desc: 'Learn how to print graph paper for math, engineering, and design projects. Step-by-step guide with tips for best results.',
    eyebrow: 'Guide &middot; printing that is actually to size',
    h1: 'How to print graph paper: complete guide for students &amp; teachers',
    lede: 'A step-by-step guide to printing graph paper that measures correctly, why squared paper still earns its place, and what to fix when a print comes out wrong.',
    sections: howtoSections,
    ld: [
'  {',
'    "@context": "https://schema.org",',
'    "@type": "Article",',
'    "headline": "How to Print Graph Paper: Complete Guide for Students & Teachers",',
'    "author": {"@type": "Organization", "name": "printgridpaper.com"},',
'    "publisher": {"@type": "Organization", "name": "printgridpaper.com"},',
'    "mainEntityOfPage": "' + SITE + '/how-to-print-graph-paper/"',
'  }'
    ].join('\n')
  },
  {
    slug: 'graph-paper-templates',
    title: 'Free Graph Paper Templates - 10 Types for Different Uses',
    desc: 'Download free printable graph paper templates: 5 mm, 1 cm, 1/4 inch, engineering (10 per inch) and more, in multiple colours and paper sizes. All printable online, no signup required.',
    eyebrow: 'Templates &middot; every size, one click to print',
    h1: 'Free graph paper templates',
    lede: 'All the printable graph paper templates this site generates &mdash; eight square sizes, colour and paper variants, and dedicated sheets for pixel art, knitting, D&amp;D maps and architecture.',
    sections: templatesSections,
    ld: faqJson([
      ['Are the templates really free?', 'Yes. There is no signup, no watermark and no limit on how many sheets you generate or print.'],
      ['Can I get a size that is not listed?', 'Yes. Type any number into the custom size field on any template page and switch between millimetres and inches. The sheet rebuilds as you type.']
    ])
  },
  {
    slug: 'graph-paper-for-teachers',
    title: 'Graph Paper for Teachers - Free Printable Lesson Resources',
    desc: 'Free printable graph paper for classroom use. Perfect for math lessons, design projects, and student activities. Print unlimited sheets.',
    eyebrow: 'For teachers &middot; classroom-ready, free, unlimited',
    h1: 'Graph paper for teachers',
    lede: 'Free printable graph paper sized for the classroom, with lesson ideas and a fast way to print a whole class set in one PDF.',
    sections: teachersSections,
    ld: faqJson([
      ['Is it free for school use?', 'Yes, free, no signup, no watermark, and the PDFs may be used in class or reproduced for students without restriction.'],
      ['Can I share the link with students?', 'Please do. Students can generate their own sheets for homework, and every PDF carries the measuring bar so they can check their printer is not scaling it.']
    ])
  }
];

PAGES.forEach(function (p) {
  var dir = path.join(ROOT, p.slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  var html = shell({
    title: p.title, desc: p.desc, urlPath: '/' + p.slug + '/',
    eyebrow: p.eyebrow, h1: p.h1, lede: p.lede,
    sections: p.sections, ld: p.ld
  });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log('  ' + p.slug);
});

console.log('Generated ' + PAGES.length + ' guide pages');