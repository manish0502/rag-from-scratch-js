// Chalte hue Qdrant ko band karta hai aur port sach me free hone tak rukta hai.
// "Address already in use" ya "mara hua qdrant" wala message aaye to ye chalao.
//
//   npm run db:stop

import { execFileSync } from 'node:child_process';
import net from 'node:net';
import { QDRANT_BIN, QDRANT_URL } from '../src/helpers/config.js';

const PORT = Number(new URL(QDRANT_URL).port || 6333);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// pgrep/pkill kuch na mile to non-zero dete hain — isliye try/catch
function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function portBusy() {
  return new Promise((resolve) => {
    const socket = net.connect({ port: PORT, host: '127.0.0.1' });
    const done = (busy) => { socket.destroy(); resolve(busy); };

    socket.on('connect', () => done(true));
    socket.on('error', () => done(false));
    setTimeout(() => done(false), 1000);
  });
}

const pids = run('pgrep', ['-f', QDRANT_BIN]).split('\n').filter(Boolean);

if (pids.length === 0) {
  console.log('Koi qdrant process nahi mila');
} else {
  console.log(`Band kar rahe hain: PID ${pids.join(', ')}`);
  run('pkill', ['-f', QDRANT_BIN]);
  await sleep(1500);

  if (run('pgrep', ['-f', QDRANT_BIN])) {
    run('pkill', ['-9', '-f', QDRANT_BIN]);
    await sleep(1000);
  }
}

// Sabse zaroori hissa: port sach me chhoota hai ya nahi.
// Process marne ke baad bhi socket thodi der bound reh sakta hai, aur usi
// wajah se agla npm start "mara hua qdrant" dekh kar ruk jata hai.
process.stdout.write(`Port ${PORT} free hone ka intezaar`);

for (let i = 0; i < 30; i++) {
  if (!(await portBusy())) {
    console.log(' — free');
    process.exit(0);
  }
  process.stdout.write('.');
  await sleep(500);
}

console.log('');
console.error(`\nPort ${PORT} abhi bhi kisi ke paas hai:`);
console.error(run('lsof', ['-nP', `-iTCP:${PORT}`, '-sTCP:LISTEN']) || '(lsof kuch nahi dikha raha)');
process.exit(1);
