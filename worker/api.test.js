/* Tests for GET /api/pdf. Run with: npm test */
import test from 'node:test';
import assert from 'node:assert/strict';
import GridEngine from '../assets/grid-engine.js';
import worker, { SIZES, parseOptions } from './index.js';

const env = { ASSETS: { fetch: () => new Response('asset') } };
const get = (qs, method = 'GET') =>
  worker.fetch(new Request('https://printgridpaper.com/api/pdf' + qs, { method }), env, { waitUntil() {} });

test('named size returns the same PDF the page builds', async () => {
  const res = await get('?size=1cm&paper=a4');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'application/pdf');
  assert.equal(res.headers.get('X-Grid-Columns'), '19');
  assert.equal(res.headers.get('X-Grid-Rows'), '25');
  const body = new Uint8Array(await res.arrayBuffer());
  const page = GridEngine.buildPDF({ paper: 'a4', spacing: 10, unit: 'mm', majorEvery: 10,
    calibration: true, color: '#4A7FB5', pages: 1, orientation: 'portrait', bg: null, calibInk: '#14181C' });
  assert.deepEqual(body, page);
  assert.match(res.headers.get('Content-Disposition'), /grid-10mm-a4-portrait\.pdf/);
});

test('every named size builds on its default paper', () => {
  for (const key of Object.keys(SIZES)) {
    const o = parseOptions(new URLSearchParams('size=' + key));
    assert.ok(GridEngine.buildPDF(o).length > 500, key);
  }
});

test('custom spacing, background, colour and pages', async () => {
  const o = parseOptions(new URLSearchParams('spacing=7&unit=mm&paper=letter&background=black&pages=3'));
  assert.equal(o.spacing, 7);
  assert.equal(o.bg, '#12171B');
  assert.equal(o.color, '#FFFFFF');
  assert.equal(o.pages, 3);
  assert.equal(parseOptions(new URLSearchParams('color=4a7fb5')).color, '#4a7fb5');
  assert.equal(parseOptions(new URLSearchParams('color=red')).color, '#C4452F');
  const res = await get('?spacing=0.2&unit=in&landscape');
  assert.equal(res.status, 200);
});

test('bad input is a 400 with a readable message', async () => {
  for (const qs of ['?size=3mm', '?spacing=0.5', '?spacing=abc', '?pages=500', '?paper=b5',
                    '?size=1cm&spacing=5', '?unit=in', '?color=pink', '?calibration=maybe']) {
    const res = await get(qs);
    assert.equal(res.status, 400, qs);
    const body = await res.json();
    assert.ok(body.error, qs);
    assert.match(body.docs, /llms\.txt/);
  }
});

test('HEAD has headers and no body; other methods are refused', async () => {
  const head = await get('?size=5mm', 'HEAD');
  assert.equal(head.status, 200);
  assert.ok(Number(head.headers.get('Content-Length')) > 0);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.equal((await get('', 'POST')).status, 405);
});

test('other paths fall through to static assets', async () => {
  const res = await worker.fetch(new Request('https://printgridpaper.com/1cm-graph-paper/'), env, {});
  assert.equal(await res.text(), 'asset');
});

test('dot and coordinate sheets retain physical spacing and export through the API', async () => {
  for (const style of ['dot', 'coordinate']) {
    const res = await get('?style=' + style + '&size=5mm&paper=a4');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('X-Square-Size-Mm'), '5');
    const g = GridEngine.computeGrid({style, paper:'a4', spacing:5});
    if (style === 'dot') {
      assert.equal(g.lines.length, 0);
      assert.equal(g.dots.length, (g.cols + 1) * (g.rows + 1));
      assert.equal(g.dots[1].y - g.dots[0].y, 5);
      assert.match(GridEngine.renderSVG({style}), /<circle/);
    } else {
      assert.equal(g.cols % 2, 0);
      assert.equal(g.rows % 2, 0);
      assert.equal(g.lines.filter(l => l.axis).length, 2);
      assert.ok(g.labels.some(l => l.text === '0'));
      assert.match(GridEngine.renderSVG({style, calibration:false}), />x<\/text>/);
    }
  }
  assert.equal((await get('?style=hex')).status, 400);
  assert.equal((await get('?margin=100')).status, 400);
  assert.equal((await get('?weight=0')).status, 400);
});

test('multi-page PDF trailer references its actual information object', () => {
  for (const pages of [1, 3, 25]) {
    const text = Buffer.from(GridEngine.buildPDF({pages})).toString('latin1');
    assert.match(text, new RegExp('/Info ' + (5 + pages) + ' 0 R'));
    assert.match(text, new RegExp('/Count ' + pages + '\\b'));
  }
});

test('exact counts keep square cells and fit within the printable area', async () => {
  for (const style of ['square','dot','coordinate']) {
    const o = {mode:'count',columns:20,rows:30,paper:'a4',style};
    const g = GridEngine.computeGrid(o);
    assert.equal(g.cols,20); assert.equal(g.rows,30);
    assert.ok(g.gridW <= 190); assert.ok(g.gridH <= 259);
    assert.equal(g.gridW / 20,g.gridH / 30);
    const response = await get('?mode=count&columns=20&rows=30&style='+style);
    assert.equal(response.status,200);
    assert.equal(response.headers.get('X-Grid-Columns'),'20');
    assert.equal(response.headers.get('X-Grid-Rows'),'30');
  }
  for (const query of ['?mode=count','?columns=20&rows=30','?mode=count&columns=2.5&rows=30','?mode=count&columns=21&rows=30&style=coordinate','?mode=count&columns=200&rows=200&paper=a5'])
    assert.equal((await get(query)).status,400,query);
});

test('isometric grid has vertical and true 30-degree lines inside its bounds', async () => {
  const g = GridEngine.computeGrid({style:'isometric',paper:'a4',spacing:5});
  const vertical = g.lines.filter(l=>Math.abs(l.x2-l.x1)<1e-8);
  assert.ok(vertical.length>0);
  assert.ok(Math.abs(vertical[1].x1-vertical[0].x1-5*Math.sqrt(3)/2)<1e-8);
  const slants = g.lines.filter(l=>Math.abs(l.x2-l.x1)>1e-8);
  assert.ok(slants.some(l=>l.y2>l.y1)); assert.ok(slants.some(l=>l.y2<l.y1));
  for (const l of slants) assert.ok(Math.abs(Math.abs((l.y2-l.y1)/(l.x2-l.x1))-1/Math.sqrt(3))<1e-8);
  for (const l of g.lines) for (const [x,y] of [[l.x1,l.y1],[l.x2,l.y2]]) {
    assert.ok(x>=g.x0-1e-8 && x<=g.x0+g.gridW+1e-8);
    assert.ok(y>=g.y0-1e-8 && y<=g.y0+g.gridH+1e-8);
  }
  assert.equal((await get('?style=isometric&size=5mm')).status,200);
  assert.equal((await get('?style=isometric&mode=count&columns=20&rows=30')).status,400);
});

test('hexagonal paper has regular hexagon edges, bounded segments and no duplicates', async () => {
  const g = GridEngine.computeGrid({style:'hexagonal',spacing:5,paper:'a4'});
  assert.ok(g.lines.length>100);
  const seen = new Set(); let full = 0;
  for (const l of g.lines) {
    const length = Math.hypot(l.x2-l.x1,l.y2-l.y1);
    assert.ok(length<=5+1e-8);
    if (Math.abs(length-5)<1e-8) full++;
    for (const [x,y] of [[l.x1,l.y1],[l.x2,l.y2]]) {
      assert.ok(x>=g.x0-1e-8 && x<=g.x0+g.gridW+1e-8);
      assert.ok(y>=g.y0-1e-8 && y<=g.y0+g.gridH+1e-8);
    }
    const ends = [[l.x1,l.y1],[l.x2,l.y2]].map(e=>e.map(v=>v.toFixed(5)).join(',')).sort().join(':');
    assert.ok(!seen.has(ends)); seen.add(ends);
  }
  assert.ok(full>100);
  assert.equal((await get('?style=hexagonal&size=5mm')).status,200);
  assert.equal((await get('?style=hexagonal&mode=count&columns=20&rows=30')).status,400);
});
