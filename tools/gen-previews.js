/* ============================================================================
   tools/gen-previews.js — screenshot each generator page's rendered sheet
   into a static PNG under assets/previews/, so the grid a visitor sees is
   also a real <img> that Google Images / Pinterest / OG unfurls can index
   (the live tool draws to canvas, which crawlers cannot see as an image).

   Requires the "playwright" devDependency (npm install), and reuses the
   Chromium already cached on this machine.

       node tools/gen-previews.js
   ========================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');
var http = require('http');
var chromium = require('playwright').chromium;

var ROOT = path.join(__dirname, '..');
var OUT_DIR = path.join(ROOT, 'assets', 'previews');
var PORT = 8934;
var CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome'
].filter(Boolean);

var MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

function hasTool(file) {
  return /id="sheet"/.test(fs.readFileSync(file, 'utf8'));
}

function findToolPages() {
  var slugs = [];
  if (hasTool(path.join(ROOT, 'index.html'))) slugs.push('');
  fs.readdirSync(ROOT, { withFileTypes: true }).forEach(function (d) {
    if (!d.isDirectory()) return;
    if (['.git', '.wrangler', 'tools', 'assets', 'node_modules'].indexOf(d.name) !== -1) return;
    var idx = path.join(ROOT, d.name, 'index.html');
    if (fs.existsSync(idx) && hasTool(idx)) slugs.push(d.name);
  });
  return slugs;
}

function startServer() {
  var server = http.createServer(function (req, res) {
    var p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    var fp = path.join(ROOT, p);
    fs.readFile(fp, function (err, data) {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(function (resolve) { server.listen(PORT, function () { resolve(server); }); });
}

(async function () {
  var slugs = findToolPages();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  var server = await startServer();
  var execPath = CHROME_CANDIDATES.find(function (p) { return fs.existsSync(p); });
  var browser = await chromium.launch(execPath ? { executablePath: execPath } : {});
  var manifest = {};

  for (var i = 0; i < slugs.length; i++) {
    var slug = slugs[i];
    var page = await browser.newPage({ viewport: { width: 640, height: 1400 }, deviceScaleFactor: 2 });
    var url = 'http://localhost:' + PORT + '/' + (slug ? slug + '/' : '');
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    var el = await page.$('.sheet-frame');
    var box = await el.boundingBox();
    var name = (slug || 'home') + '.png';
    await el.screenshot({ path: path.join(OUT_DIR, name) });
    manifest[slug] = {
      file: 'assets/previews/' + name,
      width: Math.round(box.width * 2),
      height: Math.round(box.height * 2)
    };
    console.log('generated', name, box.width * 2 + 'x' + box.height * 2);
    await page.close();
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await browser.close();
  server.close();
  console.log(slugs.length + ' previews written to assets/previews/');
})();
