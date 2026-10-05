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

test('worksheet headings reserve space without changing cell size and escape SVG text', async () => {
  for (const style of ['square','dot','coordinate','isometric','hexagonal']) {
    const plain = GridEngine.computeGrid({style});
    const options = {style,title:'Maths <practice> & notes',worksheetHeader:true,calibration:false};
    const g = GridEngine.computeGrid(options);
    assert.equal(g.step, plain.step);
    assert.ok(g.y0 >= g.opts.margin + 22);
    assert.equal(g.labels[0].text, options.title);
    assert.ok(g.labels.some(l => l.text.startsWith('Name:')));
    const svg = GridEngine.renderSVG(options);
    assert.ok(svg.includes('Maths &lt;practice&gt; &amp; notes'));
    assert.ok(svg.includes('Date:'));
    assert.ok(GridEngine.buildPDF(options).length > 1000);
  }
  const long = GridEngine.computeGrid({title:'W'.repeat(60),paper:'a5',orientation:'landscape',margin:30});
  assert.ok(long.labels[0].size < 5);
  assert.throws(() => GridEngine.computeGrid({title:'X'.repeat(61)}), /Title/);
  assert.equal((await get('?title=Practice&worksheetHeader=true')).status,200);
  assert.equal((await get('?title='+encodeURIComponent('中文'))).status,400);
});

test('binding margin reserves left space for every grid style and headings', async () => {
  for (const style of ['square','dot','coordinate','isometric','hexagonal']) {
    const plain = GridEngine.computeGrid({style});
    const g = GridEngine.computeGrid({style,bindingMargin:20,title:'Practice',worksheetHeader:true});
    assert.equal(g.step, plain.step);
    assert.ok(g.x0 >= g.opts.margin + 20);
    assert.ok(g.x0 + g.gridW <= g.page.w - g.opts.margin + 1e-8);
    assert.ok(g.labels.every(l => l.x >= g.opts.margin + 20));
    assert.ok(g.lines.every(l => l.x1 >= g.x0 - 1e-8 && l.x2 >= g.x0 - 1e-8));
  }
  const g = GridEngine.computeGrid({bindingMargin:30,mode:'count',columns:20,rows:30});
  assert.equal(g.cols,20);
  assert.equal(g.rows,30);
  assert.ok(g.x0 >= g.opts.margin + 30);
  assert.throws(() => GridEngine.computeGrid({bindingMargin:-1}), /binding margin/);
  assert.throws(() => GridEngine.computeGrid({bindingMargin:31}), /binding margin/);
  const res = await get('?bindingMargin=20&title=Practice');
  assert.equal(res.status,200);
  assert.equal((await get('?bindingMargin=31')).status,400);
});

test('PNG pixel dimensions match selected resolution and page orientation', () => {
  assert.deepEqual(GridEngine.pngSize({paper:'a4'},150), {width:1240,height:1754,dpi:150});
  assert.deepEqual(GridEngine.pngSize({paper:'a4'},300), {width:2480,height:3508,dpi:300});
  assert.deepEqual(GridEngine.pngSize({paper:'letter',orientation:'landscape'},300), {width:3300,height:2550,dpi:300});
  assert.deepEqual(GridEngine.pngSize({paper:'a3'},300), {width:3508,height:4961,dpi:300});
  assert.throws(() => GridEngine.pngSize({},600), /PNG resolution/);
  assert.throws(() => GridEngine.pngSize({},NaN), /PNG resolution/);
});

test('polar rings and rays share a centre, physical spacing, bounds and exports', async () => {
  for (const radials of [12,24,36,72]) {
    const o={style:'polar',radials,spacing:5,bindingMargin:20,title:'Polar practice',worksheetHeader:true};
    const g=GridEngine.computeGrid(o);
    assert.equal(g.lines.length,radials);
    assert.equal(g.circles.length,g.rings);
    const c=g.circles[0],radius=g.circles.at(-1).r;
    g.circles.forEach((ring,i)=>{assert.equal(ring.r,(i+1)*5);assert.equal(ring.x,c.x);assert.equal(ring.y,c.y);});
    assert.ok(c.x-radius>=g.x0-1e-8 && c.x+radius<=g.x0+g.gridW+1e-8);
    assert.ok(c.y-radius>=g.y0-1e-8 && c.y+radius<=g.y0+g.gridH+1e-8);
    g.lines.forEach(ray=>{assert.equal(ray.x1,c.x);assert.equal(ray.y1,c.y);assert.ok(Math.abs(Math.hypot(ray.x2-c.x,ray.y2-c.y)-radius)<1e-8);});
    assert.ok(GridEngine.renderSVG(o).includes('fill="none"'));
    assert.ok(GridEngine.buildPDF(o).length>1000);
  }
  assert.throws(()=>GridEngine.computeGrid({style:'polar',mode:'count'}),/spacing mode/);
  assert.throws(()=>GridEngine.computeGrid({style:'polar',radials:13}),/radial count/);
  assert.equal((await get('?style=polar&radials=36')).status,200);
  assert.equal((await get('?style=polar&radials=13')).status,400);
});

test('log paper uses base-10 positions on selected axes and validates cycles', async () => {
  for (const logAxes of ['x','y','both']) for (const decades of [1,2,3,4]) {
    const o={style:'logarithmic',logAxes,decades,bindingMargin:15,title:'Log practice',worksheetHeader:true};
    const g=GridEngine.computeGrid(o);
    const vertical=g.lines.filter(l=>l.x1===l.x2), horizontal=g.lines.filter(l=>l.y1===l.y2);
    if(logAxes!=='y') {
      assert.equal(vertical.length,decades*9+1);
      assert.ok(Math.abs((vertical[1].x1-g.x0)/g.gridW-Math.log10(2)/decades)<1e-10);
      assert.equal(vertical.filter(l=>l.major).length,decades+1);
    }
    if(logAxes!=='x') {
      assert.equal(horizontal.length,decades*9+1);
      assert.ok(Math.abs((g.y0+g.gridH-horizontal[1].y1)/g.gridH-Math.log10(2)/decades)<1e-10);
      assert.equal(horizontal.filter(l=>l.major).length,decades+1);
    }
    assert.ok(g.labels.some(l=>l.text===String(10**decades)));
    assert.ok(g.lines.every(l=>l.x1>=g.x0-1e-8 && l.x2<=g.x0+g.gridW+1e-8 && l.y1>=g.y0-1e-8 && l.y2<=g.y0+g.gridH+1e-8));
    assert.ok(GridEngine.renderSVG(o).includes('>10</text>'));
    assert.ok(GridEngine.buildPDF(o).length>1000);
  }
  assert.throws(()=>GridEngine.computeGrid({style:'logarithmic',decades:1.5}),/decades/);
  assert.throws(()=>GridEngine.computeGrid({style:'logarithmic',logAxes:'z'}),/Log axes/);
  assert.throws(()=>GridEngine.computeGrid({style:'logarithmic',mode:'count'}),/spacing mode/);
  assert.equal((await get('?style=logarithmic&logAxes=both&decades=3')).status,200);
  assert.equal((await get('?style=logarithmic&decades=1.5')).status,400);
});

test('independent margins constrain every paper style, headers and calibration', async () => {
  for (const style of ['square','dot','coordinate','isometric','hexagonal','polar','logarithmic']) {
    const o={style,separateMargins:true,marginTop:20,marginBottom:25,marginLeft:15,marginRight:30,bindingMargin:10,title:'Margins practice',worksheetHeader:true};
    const g=GridEngine.computeGrid(o);
    assert.deepEqual(g.margins,{top:20,bottom:25,left:15,right:30});
    assert.ok(g.x0>=25 && g.x0+g.gridW<=g.page.w-30+1e-8);
    assert.ok(g.y0>=42 && g.y0+g.gridH<=g.page.h-25-18+1e-8);
    assert.equal(g.calibrationY,g.page.h-25-12);
    assert.ok(g.labels.some(l=>l.text==='Margins practice' && l.x===25 && l.y===26));
    assert.ok(GridEngine.buildPDF(o).length>1000);
  }
  const g=GridEngine.computeGrid({mode:'count',columns:20,rows:30,separateMargins:true,marginLeft:40,marginRight:30});
  assert.equal(g.cols,20);assert.equal(g.rows,30);assert.ok(g.x0>=40);
  assert.equal(GridEngine.computeGrid({separateMargins:false,marginLeft:40}).margins.left,10);
  assert.throws(()=>GridEngine.computeGrid({separateMargins:true,marginTop:51}),/Top margin/);
  assert.deepEqual(parseOptions(new URLSearchParams('margin=12&marginLeft=30')), {...parseOptions(new URLSearchParams('margin=12')),separateMargins:true,marginLeft:30});
  assert.equal((await get('?marginLeft=30&marginBottom=20')).status,200);
  assert.equal((await get('?marginLeft=-1')).status,400);
});
