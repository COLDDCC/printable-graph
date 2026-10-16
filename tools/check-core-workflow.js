// First-screen contract: run with npm run test:ux. Screenshots are CI artifacts.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png'};
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try { const body = await fs.readFile(file); res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'}).end(body); }
  catch { res.writeHead(404).end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
    await fs.mkdir(path.join(root,'artifacts/core-workflow'), {recursive:true});
    for (const [width,height] of [[1280,720],[1366,768],[390,844]]) {
      const page = await browser.newPage({viewport:{width,height}});
      const errors=[]; page.on('pageerror', e => errors.push(e.message));
      // Fonts and analytics must never block the core tool.
      await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.locator('#sheet svg').waitFor();
      await page.screenshot({path:`artifacts/core-workflow/${width}x${height}.png`});
      async function inScreen(selector) {
        const box=await page.locator(selector).boundingBox();
        assert(box && box.x>=0 && box.y>=0 && box.x+box.width<=width && box.y+box.height<=height, `${width}x${height}: ${selector} outside first screen: ${JSON.stringify(box)}`);
        assert(await page.locator(selector).evaluate(el => {const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}), `${selector} is obstructed`);
      }
      for (const selector of ['#paper','#presets button[data-s="5"]','#presets button[data-s="0.25"]','#dl','#printSheet']) await inScreen(selector);
      assert.equal(await page.evaluate(()=>window.scrollY),0);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
      await page.locator('#presets button[data-s="0.25"]').click();
      await page.locator('#paper').selectOption('letter');
      assert.match(await page.locator('#oPitch').textContent(), /0.25|¼|1\/4/);
      for (const id of ['dl','downloadSVG','downloadPNG']) {
        const downloadPromise=page.waitForEvent('download');
        await page.locator('#'+id).click();
        const download=await downloadPromise;
        assert.equal(await download.failure(),null);
        const bytes=await fs.readFile(await download.path());
        assert(bytes.length>100, `${id} produced an empty file`);
        if (id==='dl') assert.equal(bytes.subarray(0,4).toString(),'%PDF');
      }
      await page.locator('.extra-tools summary').click();
      await page.locator('#unit button[data-v="mm"]').click();
      await page.locator('#spacing').fill('7');
      assert.match(await page.locator('#oPitch').textContent(),/7/);
      await page.locator('#paper').selectOption('custom');
      assert(await page.locator('#paperWidth').isVisible());
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}x${height}: visible controls, presets, PDF/PNG/SVG, advanced settings`);
      await page.close();
    }
  } finally { if(browser) await browser.close(); server.close(); }
})().catch(e=>{console.error(e); process.exitCode=1;});
