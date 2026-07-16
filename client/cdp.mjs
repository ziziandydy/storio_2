import WebSocket from 'ws';
const TARGET_ID = 'page-8';
const ws = new WebSocket('ws://localhost:9222/devtools/page/2');
let id = 0; const pending = {};
function targetSend(method, params) {
  const innerId = ++id;
  ws.send(JSON.stringify({ id: ++id, method: 'Target.sendMessageToTarget', params: { targetId: TARGET_ID, message: JSON.stringify({ id: innerId, method, params }) } }));
  return new Promise(r => { pending['inner-' + innerId] = r; });
}
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.method === 'Target.dispatchMessageFromTarget') {
    const inner = JSON.parse(msg.params.message);
    if (inner.id && pending['inner-' + inner.id]) { pending['inner-' + inner.id](inner); delete pending['inner-' + inner.id]; }
  }
});
ws.on('open', async () => {
  await new Promise(r => setTimeout(r, 300));
  await targetSend('Runtime.enable', {});
  const res = await targetSend('Runtime.evaluate', { expression: process.argv[2], returnByValue: true, awaitPromise: true });
  const r = res.result?.result ?? res.result;
  if (r?.value !== undefined) console.log(typeof r.value === 'string' ? r.value : JSON.stringify(r.value));
  else if (res.result?.wasThrown) console.log('THROWN:', JSON.stringify(r));
  else console.log(JSON.stringify(r ?? res));
  ws.close(); process.exit(0);
});
ws.on('error', (e) => { console.log('WS_ERROR:', e.message); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 8000);
