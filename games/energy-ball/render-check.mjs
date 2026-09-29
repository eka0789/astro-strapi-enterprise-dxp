// Render verifier v2: paksa render sinkron pada waktu tertentu via __renderAt.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PAGE_URL = 'http://127.0.0.1:8931/index.html';
const OUT = 'C:/Users/Admin/.zcode/workspace/default/games/energy-ball/shots/';
const PORT = 9224;
const W = 1280, H = 800;
const SEEKS = [
  { t: 2,  name: 'babak1-bangun' },
  { t: 14, name: 'babak2-aurora' },
  { t: 28, name: 'babak3-kembang' },
  { t: 42, name: 'babak4-puncak' },
  { t: 56, name: 'babak5-abadi' },
  { t: 60, name: 'finale' }
];

mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-sandbox',
  '--disable-gpu-sandbox', '--hide-scrollbars', `--window-size=${W},${H}`,
  '--use-gl=angle', '--enable-unsafe-swiftshader',
  '--user-data-dir=' + OUT + 'cp3', 'about:blank'
], { stdio: 'ignore' });

let ws, msgId = 0;
const pending = new Map();
const logs = [];
const send = (m, p = {}, s) => new Promise((res, rej) => {
  const id = ++msgId; pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method: m, params: p, sessionId: s }));
});

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
      logs.push('EXCEPTION: ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
    }
  };

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: PAGE_URL }, sessionId);
  await sleep(10000);

  const ready = await send('Runtime.evaluate', {
    expression: '!!window.__renderAt', returnByValue: true
  }, sessionId);
  console.log('__renderAt tersedia:', ready.result.value);

  for (const s of SEEKS) {
    const r = await send('Runtime.evaluate', {
      expression: `(async () => {
        for (let k = 0; k < 12; k++) {
          window.__renderAt(${s.t} - 0.6 + k * 0.05);
          await new Promise(r => setTimeout(r, 16));
        }
        return window.__renderAt(${s.t});
      })()`,
      awaitPromise: true, returnByValue: true
    }, sessionId);
    if (r.exceptionDetails) console.log(s.name, 'EXC:', JSON.stringify(r.exceptionDetails).slice(0, 200));

    const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    const file = `${OUT}v2_${s.name}.png`;
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log('OK', s.name, '@', s.t + 's');
  }

  console.log('\nEXCEPTIONS:', logs.length ? logs.join('\n') : 'none');
} catch (e) {
  console.error('ERROR:', e.message, '\n', logs.join('\n'));
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
  await sleep(400);
}
