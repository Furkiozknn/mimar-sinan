// Duman testi: sayfa açılıyor mu, konsol hatası var mı, oyun başlıyor mu, bir etkileşim durumu değiştiriyor mu,
// telefon görünümünde taşma var mı. Hiçbir bağımlılık depoya eklenmez.
//
// Kullanım:  node test/duman.mjs [klasör]        (klasör verilmezse deponun kökü)
// Gerekli:   `playwright-core` (depo dışında kurulu olabilir: PW_MODULE=<node_modules'ün bulunduğu klasör>) ve bir Chromium:
//            CHROMIUM=<chrome.exe yolu> (verilmezse Playwright'ın kendi tarayıcısı).
// Çıktı: "ok" / "FAIL" / "n/a" satırları, en sonda RESULT; hata varsa çıkış kodu 1.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] || join(here, '..'));
const req = createRequire(process.env.PW_MODULE ? pathToFileURL(join(process.env.PW_MODULE, 'x.js')) : import.meta.url);
const { chromium } = req('playwright-core');
const IGNORED = /gc\.zgo\.at|goatcounter|fonts\.googleapis\.com|fonts\.gstatic\.com/;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.mp4': 'video/mp4' };
let failed = false;
const ok = (m) => console.log('ok   ' + m);
const fail = (m) => { failed = true; console.log('FAIL ' + m); };
const check = (c, m) => (c ? ok(m) : fail(m));

const srv = createServer((rq, rs) => {
  const p = normalize(decodeURIComponent(new URL(rq.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  let f = join(root, p || 'index.html');
  if (!f.startsWith(root)) { rs.writeHead(403).end(); return; }
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { rs.writeHead(404, { 'content-type': 'text/plain' }).end('404'); return; }
  rs.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }).end(readFileSync(f));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + srv.address().port + '/';
console.log('hedef: ' + root);

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const [name, vp, mobile] of [['masaustu 1366x768', { width: 1366, height: 768 }, false], ['telefon 390x844', { width: 390, height: 844 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
    await ctx.route(IGNORED, (r) => r.fulfill({ status: 200, body: '' }));
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    let depthWarn = 0;
    // SwiftShader (yazılım GL) bazen three.js'in gölge derinlik malzemesini derleyemez (boş program günlüğü, 1282):
    // oyun kodundan değil ortamdan gelir, eski sürümde de aynıdır; hata sayılmaz, ayrıca bildirilir.
    page.on('console', (m) => { if (m.type() !== 'error') return; const x = m.text(); if (/WebGLProgram: Shader Error \d+ - VALIDATE_STATUS false/.test(x)) depthWarn++; else errs.push('console: ' + x); });
    page.on('requestfailed', (r) => { if (!IGNORED.test(r.url())) errs.push('requestfailed: ' + r.url()); });
    page.on('response', (r) => { if (r.status() >= 400 && !IGNORED.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
    await page.goto(base + '?lang=tr', { waitUntil: 'load' });
    await page.waitForFunction(() => { const b = document.getElementById('bPlay'); return b && !b.disabled; }, null, { timeout: 120000 });
    check(true, `[${name}] sayfa açıldı, "Oyna" düğmesi etkin`);
    const title = await page.title();
    check(/Mimar Sinan/.test(title), `[${name}] başlık: ${title}`);
    const over = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      for (const e of document.querySelectorAll('#title button, #title a')) { const r = e.getBoundingClientRect(); if (r.width && (r.left < -1 || r.right > w + 1)) bad.push(e.id || e.textContent); }
      return { h: document.documentElement.scrollWidth > w + 1, bad };
    });
    check(!over.h && !over.bad.length, `[${name}] başlık ekranında yatay taşma yok ${over.bad.join(',')}`);
    // Yenilikler penceresi (yalnız yeni sürümde var)
    if (await page.$('#bNews')) {
      await page.click('#bNews');
      const shown = await page.evaluate(() => !document.getElementById('news').hidden && document.querySelectorAll('#newsList li').length >= 3);
      check(shown, `[${name}] Yenilikler penceresi açılıyor ve maddeleri var`);
      const fit = await page.evaluate(() => { const r = document.querySelector('#news .panel').getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1; });
      check(fit, `[${name}] Yenilikler kartı ekrana sığıyor`);
      await page.keyboard.press('Escape');
      check(await page.evaluate(() => document.getElementById('news').hidden && !document.getElementById('title').hidden), `[${name}] Esc ile kapanıp başlığa dönüyor`);
    } else console.log(`n/a  [${name}] Yenilikler penceresi bu sürümde yok`);
    // oyun başlıyor: harita -> görev -> ön bilgi -> inşa
    await page.click('#bPlay');
    await page.waitForFunction(() => window.mimar && window.mimar.state === 'map', null, { timeout: 15000 });
    ok(`[${name}] harita açıldı`);
    await page.click('#pcards .lv5 button:not([disabled])');
    await page.waitForFunction(() => window.mimar.state === 'brief', null, { timeout: 15000 });
    await page.click('#bBegin');
    await page.waitForFunction(() => window.mimar.state === 'play', null, { timeout: 15000 });
    const n0 = await page.evaluate(() => window.mimar.pieces);
    await page.keyboard.press('Digit1');
    const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.55 }; });
    let n1 = n0;
    for (const [dx, dy] of [[0, 0], [30, 10], [-30, 10], [0, 40], [60, 0], [-60, 0], [0, -40]]) {
      await page.mouse.click(box.x + dx, box.y + dy);
      await page.waitForTimeout(150);
      n1 = await page.evaluate(() => window.mimar.pieces);
      if (n1 > n0) break;
    }
    check(n1 > n0, `[${name}] bir parça yerleştirildi (${n0} -> ${n1})`);
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(300);
    check(await page.evaluate(() => !document.getElementById('pause').hidden), `[${name}] P ile duraklatma penceresi açılıyor`);
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(600);
    if (depthWarn) console.log(`uyari [${name}] ${depthWarn} kez three.js shader doğrulaması (VALIDATE_STATUS, boş günlük) başarısız oldu (yazılım GL ortamı; hata sayılmadı)`);
    check(errs.length === 0, `[${name}] konsol/sayfa/ağ hatası yok` + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }
  // bot: 15 görevi bitirir (hızlı ileri sarma); durum ilerliyor
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.route(IGNORED, (r) => r.fulfill({ status: 200, body: '' }));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(base + '?auto&debug&botdelay=0.05', { waitUntil: 'load' });
  await page.waitForFunction(() => window.mimar && typeof window.mimarSim === 'function' && window.mimar.loaded, null, { timeout: 120000 });
  const r = await page.evaluate(() => { for (let i = 0; i < 400 && !window.mimar.bot.done; i++) window.mimarSim(30); const m = window.mimar; return { done: m.bot.done, stars: m.stars.reduce((a, b) => a + b, 0), levels: m.bot.levelsDone, errors: m.errors.length }; });
  check(r.done && r.stars === 45, `bot 15 görevi bitirdi: ${r.stars}/45 yıldız, görev ${r.levels}`);
  check(r.errors === 0 && errs.length === 0, 'bot oturumunda oyun içi hata yok');
  await ctx.close();
} catch (e) { fail('beklenmeyen: ' + (e && e.message)); }
await browser.close();
srv.close();
console.log(failed ? 'RESULT FAIL' : 'RESULT OK');
process.exit(failed ? 1 : 0);
