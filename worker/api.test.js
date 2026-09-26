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
