// Tes fungsional: state DOM, transisi babak, timing 60 detik, kontrol UI.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PAGE_URL = 'http://127.0.0.1:8931/index.html';
const PORT = 9225;
const W = 1280, H = 800;

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-sandbox',
  '--disable-gpu-sandbox', '--hide-scrollbars', `--window-size=${W},${H}`,
  '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required',
  '--user-data-dir=C:/Users/Admin/.zcode/workspace/default/games/energy-ball/shots/cp4', 'about:blank'
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
const check = (name, ok, detail = '') => (ok ? pass : fail).push(name + (detail ? ' — ' + detail : ''));

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
  await send('Page.navigate', { url: PAGE_URL }, sessionId);
  await sleep(9000);

  // --- 1. Scene terbentuk ---
  const scene = await evalJS(`(() => {
    const b = window.__energyBall;
    if (!b) return null;
    let meshes = 0, points = 0;
    b.scene.traverse(o => { if (o.isMesh) meshes++; if (o.isPoints) points++; });
    return { meshes, points, hasWebGL: !!b.renderer.getContext(),
             camDist: +b.camera.position.length().toFixed(2) };
  })()`, sessionId);
  check('three.js termuat & scene ada', !!scene);
  check('WebGL konteks aktif', scene?.hasWebGL);
  check('mesh terpasang minimal 3', scene?.meshes >= 3, 'jumlah=' + scene?.meshes);
  check('sistem partikel terpasang', scene?.points >= 1, 'jumlah=' + scene?.points);

  // --- 2. Loader hilang, autoplay jalan ---
  const boot = await evalJS(`({
    loaderHidden: document.getElementById('loader').classList.contains('done'),
    playing: window.__energyBall.playing,
    panelShown: document.getElementById('panel').classList.contains('show')
  })`, sessionId);
  check('loader tersembunyi setelah boot', boot.loaderHidden);
  check('animasi mulai otomatis', boot.playing);
  check('panel kontrol tampil', boot.panelShown);

  // --- 3. Timing nyata: elapsed bertambah ---
  const t0 = await evalJS('window.__energyBall.elapsed', sessionId);
  await sleep(2500);
  const t1 = await evalJS('window.__energyBall.elapsed', sessionId);
  check('timer berjalan (elapsed bertambah)', t1 > t0, `${t0.toFixed(2)}s → ${t1.toFixed(2)}s`);

  // --- 4. HUD clock cocok dengan elapsed ---
  const hud = await evalJS(`({
    clock: document.getElementById('clock').textContent,
    prog: document.getElementById('prog').style.width
  })`, sessionId);
  check('jam HUD terformat', /^\d{2}:\d{2} \/ 01:00$/.test(hud.clock), hud.clock);
  check('bar progres terisi', parseFloat(hud.prog) > 0, hud.prog);

  // --- 4b. Panduan napas & energi meter ---
  const breathUI = await evalJS(`(() => {
    window.__renderAt(2.5);
    const b = window.__energyBall.getBreathState(2.5);
    return {
      phase: b.phase,
      cycle: b.cycleNumber,
      label: document.getElementById('breathLabel').textContent,
      meterVisible: parseFloat(document.getElementById('energyFill').style.height) >= 0
    };
  })()`, sessionId);
  check('panduan napas muncul', breathUI.phase === 'inhale' && breathUI.cycle === 1, `phase=${breathUI.phase} cycle=${breathUI.cycle}`);
  check('label napas terisi', breathUI.label.length > 0, breathUI.label);
  check('energy meter terupdate', breathUI.meterVisible);

  // --- 5. Transisi babak pada waktu yang benar ---
  for (const [t, expect] of [[1,'Babak 1 dari 5'],[15,'Babak 2 dari 5'],[30,'Babak 3 dari 5'],[45,'Babak 4 dari 5'],[56,'Babak 5 dari 5']]) {
    await evalJS(`window.__renderAt(${t})`, sessionId);
    await sleep(400);
    const idx = await evalJS(`document.getElementById('chIdx').textContent`, sessionId);
    const ttl = await evalJS(`document.getElementById('chTtl').textContent`, sessionId);
    check(`transisi @${t}s`, idx === expect, `${idx} / ${ttl}`);
  }

  // --- 6. Kontrol UI ---
  await evalJS('window.__energyBall.pause()', sessionId);
  const afterPause = await evalJS('window.__energyBall.playing', sessionId);
  check('pause menghentikan animasi', afterPause === false);
  await evalJS(`window.__energyBall.restart()`, sessionId);   // pastikan playing = true dulu
  await sleep(300);
  await evalJS(`window.__energyBall.pause()`, sessionId);
  await sleep(150);
  await evalJS(`document.getElementById('btnPlay').click()`, sessionId);
  await sleep(300);
  check('tombol Putar melanjutkan', await evalJS('window.__energyBall.playing', sessionId) === true);
  await evalJS(`document.getElementById('btnSound').click()`, sessionId);
  const snd = await evalJS(`document.getElementById('btnSound').textContent`, sessionId);
  check('tombol suara toggle', snd.includes('Nyala'), snd);

  // --- 7. Restart ---
  await evalJS(`document.getElementById('btnRestart').click()`, sessionId);
  await sleep(600);
  const afterRestart = await evalJS('window.__energyBall.elapsed', sessionId);
  check('restart mengulang dari awal', afterRestart < 3, afterRestart.toFixed(2) + 's');

  // --- 8. Penutup muncul tepat di akhir ---
  // pakai step() langsung supaya finish() terpanggil tanpa menunggu rAF
  const atEnd = await evalJS(`(() => {
    window.__energyBall.restart();
    for (let i = 0; i < 1300; i++) window.__energyBall.step(0.05, performance.now());
    return { elapsed: window.__energyBall.elapsed, playing: window.__energyBall.playing };
  })()`, sessionId);
  check('berhenti tepat di 60 detik', !atEnd.playing && atEnd.elapsed === 60,
        'elapsed=' + atEnd.elapsed.toFixed(2) + ' playing=' + atEnd.playing);
  await sleep(1800);   // tunggu setTimeout 900ms di finish()
  const finale = await evalJS(`document.getElementById('finale').classList.contains('show')`, sessionId);
  check('layar penutup muncul di akhir', finale);

  // --- 9. Tombol Tutup menutup penutup & memulai ulang ---
  await evalJS(`document.getElementById('btnClose').click()`, sessionId);
  await sleep(400);
  const closed = await evalJS(`({
    hidden: !document.getElementById('finale').classList.contains('show'),
    playing: window.__energyBall.playing,
    elapsed: window.__energyBall.elapsed
  })`, sessionId);
  check('tombol Tutup menutup & mengulang', closed.hidden && closed.playing && closed.elapsed < 3,
        'elapsed=' + closed.elapsed.toFixed(2));

  console.log('\n===== LULUS (' + pass.length + ') =====');
  pass.forEach(p => console.log('  OK  ' + p));
  if (fail.length) {
    console.log('\n===== GAGAL (' + fail.length + ') =====');
    fail.forEach(f => console.log('  X   ' + f));
  }
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
