/* ============================================================================
   tools/patch-compact-layout.js — put the whole generator in the first screen.

   For every page with a generator (`<div class="tool">`):
   - the hero becomes one row: the H1 and a one-line subtitle on the left, and
     a one-click "Download <size> PDF" button on the right. The button links
     to /api/pdf so agents reading the HTML get a direct URL; ui.js builds the
     same PDF in the browser for people.
   - the intro paragraph (and the homepage's tick list) moves below the
     generator, followed by the preview image. No copy is dropped.
   - the controls are packed two per row: paper + orientation, heavy line +
     copies, colour + preset.

   Idempotent: pages already carrying `tool compact` are left alone.
   Run it after any of the tools/gen-*.js page generators.

       node tools/patch-compact-layout.js
   ========================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');

/* Mirrors SIZES in worker/index.js: the named sizes /api/pdf accepts. */
var SIZES = {
  '2mm':          { spacing: 2,     unit: 'mm', majorEvery: 5,  paper: 'a4' },
  '5mm':          { spacing: 5,     unit: 'mm', majorEvery: 5,  paper: 'a4' },
  '1cm':          { spacing: 10,    unit: 'mm', majorEvery: 10, paper: 'a4' },
  '10-per-inch':  { spacing: 0.1,   unit: 'in', majorEvery: 10, paper: 'letter' },
  'eighth-inch':  { spacing: 0.125, unit: 'in', majorEvery: 8,  paper: 'letter' },
  'quarter-inch': { spacing: 0.25,  unit: 'in', majorEvery: 4,  paper: 'letter' },
  'half-inch':    { spacing: 0.5,   unit: 'in', majorEvery: 2,  paper: 'letter' },
  '1-inch':       { spacing: 1,     unit: 'in', majorEvery: 0,  paper: 'letter' }
};
var BACKGROUNDS = { '#12171B': 'black', '#F7F1E3': 'cream' };
var PAPER_LABEL = { a4: 'A4', letter: 'Letter', a5: 'A5', a3: 'A3', legal: 'Legal', tabloid: 'Tabloid' };
var INCH_LABEL = { 0.1: '1/10 in', 0.125: '1/8 in', 0.25: '1/4 in', 0.5: '1/2 in', 1: '1 in' };

function readPreset(html) {
  var m = html.match(/window\.PAGE_PRESET = (\{[^}]*\});/);
  if (!m) return { paper: 'a4', spacing: 5, unit: 'mm', majorEvery: 5 };
  return Function('return ' + m[1])();   // our own literal, e.g. {paper:'a4', spacing:5, ...}
}

function sizeLabel(p) {
  if (p.unit === 'in') return INCH_LABEL[p.spacing] || p.spacing + ' in';
  return p.spacing === 10 ? '1 cm' : p.spacing + ' mm';
}

function apiHref(p, paper) {
  var q = [], key = null, k;
  for (k in SIZES) if (SIZES[k].spacing === p.spacing && SIZES[k].unit === p.unit) key = k;
  if (key) {
    q.push('size=' + key);
    if (p.majorEvery !== SIZES[key].majorEvery) q.push('major=' + p.majorEvery);
  } else {
    q.push('spacing=' + p.spacing, 'unit=' + p.unit, 'major=' + p.majorEvery);
  }
  q.push('paper=' + paper);
  if (p.bg && BACKGROUNDS[p.bg]) q.push('background=' + BACKGROUNDS[p.bg]);
  return '/api/pdf?' + q.join('&amp;');
}

function sentence(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function patchHero(html, p) {
  var re = /  <div class="hero( size)?">\n([\s\S]*?)\n  <\/div>\n/;
  var m = html.match(re);
  if (!m) throw new Error('no hero');
  var inner = m[2];
  var eyebrow = (inner.match(/<p class="eyebrow">([\s\S]*?)<\/p>/) || [])[1];
  var h1 = inner.match(/<h1[^>]*>[\s\S]*?<\/h1>/)[0];
  var lede = (inner.match(/<p class="lede">[\s\S]*?<\/p>/) || [''])[0];
  var ticks = (inner.match(/<ul class="ticks">[\s\S]*?<\/ul>/) || [''])[0];

  var label = sizeLabel(p);
  var alt = p.paper === 'a4' ? 'letter' : p.paper === 'letter' ? 'a4' : null;
  var sub = !eyebrow ? 'Free, true to size, no sign-up'
          : /free/i.test(eyebrow) ? sentence(eyebrow) + ' &middot; true to size'
          : sentence(eyebrow) + ' &middot; free, true to size, no sign-up';
  var hero =
    '  <div class="hero size compact">\n' +
    '    <div>\n' +
    '      ' + h1 + '\n' +
    '      <p class="sub">' + sub + '</p>\n' +
    '    </div>\n' +
    '    <div class="quick-dl">\n' +
    '      <a class="cta" href="' + apiHref(p, p.paper) + '" data-paper="' + p.paper + '">Download ' +
           label + ' PDF &middot; ' + PAPER_LABEL[p.paper] + '</a>\n' +
    (alt ? '      <a class="quick-alt" href="' + apiHref(p, alt) + '" data-paper="' + alt + '">' +
           (alt === 'letter' ? 'US Letter' : 'A4') + '</a>\n' : '') +
    '    </div>\n' +
    '  </div>\n';
  var after = [
    '  <p class="quick-note">Direct PDF link for sharing or scripts: <a href="' + apiHref(p, p.paper) + '">printgridpaper.com' +
      apiHref(p, p.paper) + '</a></p>\n'
  ];
  if (lede) after.push('\n  <div class="intro">\n    ' + lede + (ticks ? '\n    ' + ticks : '') + '\n  </div>\n');
  return { html: html.replace(re, hero), after: after.join('') };
}

function row(a, b) {
  return '        <div class="row">\n          ' + a.trim() + '\n' + (b ? '          ' + b.trim() + '\n' : '') + '        </div>\n\n';
}

function patchControls(html) {
  var i = html.indexOf('<div class="ctrls">');
  var j = html.indexOf('<button class="dl" id="dl"', i);
  if (i < 0 || j < 0) throw new Error('no controls');
  var c = html.slice(i, j);
  function take(re, optional) {
    var m = c.match(re);
    if (!m) { if (optional) return null; throw new Error('control not found: ' + re); }
    c = c.replace(m[0], m[0] === '' ? '' : '\u0000');   // mark where it was
    return m;
  }
  var paper = take(/<div class="f">\s*<span>Paper<\/span>[\s\S]*?<\/select>\s*<\/div>\s*/)[0];
  var om = take(/<div class="row">\s*(<div class="f"><span>Orientation<\/span>[\s\S]*?<\/div>\s*<\/div>)\s*(<div class="f"><span>Heavy line every<\/span>[^\n]*)\s*<\/div>\s*/);
  var colour = take(/<div class="f">\s*<span>Line colour<\/span>[\s\S]*?<\/div>\s*<\/div>\s*/, true);
  var check = take(/<label class="check">[\s\S]*?<\/label>\s*/)[0];
  var cp = take(/<div class="row">\s*(<div class="f"><span>Copies per PDF<\/span>[^\n]*)\s*(<div class="f"><span>Preset<\/span>[^\n]*)\s*<\/div>\s*/);

  var block =
    row(paper, om[1]) +
    row(om[2], cp[1]) +
    (colour ? row(colour[0], cp[2]) : row(cp[2])) +
    '        ' + check.trim().replace(/<span>Include the measuring bars\.[^<]*<\/span>/,
      '<span>Include the measuring bars (turn off for a clean sheet)</span>') + '\n        ';
  // The first marker takes the new block; the rest are dropped.
  var first = true;
  c = c.replace(/\u0000/g, function () { var r = first ? block : ''; first = false; return r; });
  return html.slice(0, i) + c + html.slice(j);
}

function patchPage(file) {
  var html = fs.readFileSync(file, 'utf8');
  if (html.indexOf('class="tool compact"') !== -1) return 'skipped';
  var p = readPreset(html);

  var fig = html.match(/\n  <figure class="preview-shot">[\s\S]*?<\/figure>\n/);
  if (fig) html = html.replace(fig[0], '\n');

  var h = patchHero(html, p);
  html = h.html;
  html = patchControls(html);

  var t = html.indexOf('  <div class="tool">');
  if (t < 0) throw new Error('no tool');
  var end = html.indexOf('\n  </div>\n', t) + '\n  </div>\n'.length;
  var tail = '\n' + h.after + (fig ? fig[0].replace('at the default settings below', 'at the default settings').replace(
    'all change live.', 'all change live in the generator above.') : '');
  html = html.slice(0, t) + '  <div class="tool compact">' + html.slice(t + '  <div class="tool">'.length, end) +
         tail + html.slice(end);
  html = html.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(file, html);
  return 'patched';
}

var counts = { patched: 0, skipped: 0 };
var pages = ['index.html'].concat(fs.readdirSync(ROOT).map(function (d) { return path.join(d, 'index.html'); }));
pages.forEach(function (rel) {
  var file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return;
  var html = fs.readFileSync(file, 'utf8');
  if (html.indexOf('<div class="tool') === -1) return;
  try { counts[patchPage(file)]++; }
  catch (err) { console.error(rel + ': ' + err.message); process.exitCode = 1; }
});
console.log('patched ' + counts.patched + ', already compact ' + counts.skipped);
