import WebSocket from 'ws';
const ws = new WebSocket('ws://localhost:9222/devtools/page/3');
ws.on('open', () => setTimeout(() => process.exit(0), 2000));
ws.on('message', (data) => { const m = JSON.parse(data); if (m.method === 'Target.targetCreated') console.log('target:', JSON.stringify(m.params.targetInfo)); });
ws.on('error', e => console.log('ERR', e.message));
