// Smoke test terhadap URL produksi Netlify (bukan localhost).
// Meniru test fungsional tapi shortened — hanya yang essential untuk deploy check.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SITE = 'https://bola-energi.netlify.app';
const PORT = 9230;
const W = 1280, H = 800;

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-sandbox',
  '--disable-gpu-sandbox', '--hide-scrollbars', `--window-size=${W},${H}`,
  '--use-gl=angle', '--enable-unsafe-swiftshader',
  '--user-data-dir=C:/Users/Admin/.zcode/workspace/default/games/energy-ball/.prodcheck', 'about:blank'
], { stdio: 'ignore' });

let ws, msgId = 0;
const pending = new Map();
const errs = [];
const send = (m, p = {}, s) => new Promise((res, rej) => {
  const id = ++msgId; pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method: m, params: p, sessionId: s }));
});
const evalJS = async (expr, s) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, s);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval error');
  return r.result.value;
};

const pass = [], fail = [];
const check = (n, ok, d = '') => (ok ? pass : fail).push(n + (d ? ' — ' + d : ''));

try {
  let target = null;
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl; if (target) break; } catch {}
  }
  if (!target) throw new Error('DevTools tidak merespons');
  ws = new WebSocket(target);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errs.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    }
  };

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: SITE }, sessionId);
  await sleep(12000);   // CDN three.js + compile shader

  const boot = await evalJS(`(() => {
    const b = window.__energyBall;
    if (!b) return null;
    let meshes = 0, points = 0;
    b.scene.traverse(o => { if (o.isMesh) meshes++; if (o.isPoints) points++; });
    return { ready: true, meshes, points, hasWebGL: !!b.renderer.getContext(),
             playing: b.playing, elapsed: +b.elapsed.toFixed(2),
             loaderHidden: document.getElementById('loader').classList.contains('done') };
  })()`, sessionId);

  check('halaman termuat di produksi', !!boot);
  check('three.js termuat dari CDN', !!boot?.hasWebGL);
  check('geometri terpasang', boot?.meshes === 3, 'meshes=' + boot?.meshes);
  check('partikel terpasang', boot?.points === 1);
  check('loader disembunyikan', boot?.loaderHidden);
  check('animasi berjalan', boot?.playing);

  // timer benar-benar bertambah?
  const t0 = await evalJS('window.__energyBall.elapsed', sessionId);
  await sleep(2500);
  const t1 = await evalJS('window.__energyBall.elapsed', sessionId);
  check('timer maju', t1 > t0, `${t0.toFixed(2)}s → ${t1.toFixed(2)}s`);

  // transisi babak
  const ch = await evalJS(`(() => {
    window.__renderAt(45);
    return document.getElementById('chIdx').textContent;
  })()`, sessionId);
  check('transisi babak di produksi', ch === 'Babak 4 dari 5', ch);

  // render benar-benar menghasilkan piksel (bukan layar kosong)
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  check('render menghasilkan output', shot.data && shot.data.length > 20000,
        Math.round(shot.data.length / 1024) + 'KB');

  console.log('\n===== LULUS (' + pass.length + ') =====');
  pass.forEach(p => console.log('  OK  ' + p));
  if (fail.length) { console.log('\n===== GAGAL (' + fail.length + ') ====='); fail.forEach(f => console.log('  X   ' + f)); }
  console.log('\nEXCEPTIONS:', errs.length ? errs.join('\n') : 'none');
  process.exitCode = fail.length ? 1 : 0;
} catch (e) {
  console.error('ERROR:', e.message, '\n', errs.join('\n'));
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
  await sleep(400);
}
