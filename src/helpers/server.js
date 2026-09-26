import { spawn } from 'node:child_process';
import net from 'node:net';
import { QDRANT_URL, QDRANT_BIN, QDRANT_STORAGE, QDRANT_STATIC } from './config.js';
import { ensureQdrant } from './setup.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = Number(new URL(QDRANT_URL).port || 6333);

// Server zinda hai = HTTP jawab de raha hai
export async function isRunning() {
  try {
    await fetch(QDRANT_URL, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

// Port par koi baitha hai ya nahi — chahe wo jawab de ya na de
function portBusy() {
  return new Promise((resolve) => {
    const socket = net.connect({ port: PORT, host: '127.0.0.1' });
    const done = (busy) => { socket.destroy(); resolve(busy); };

    socket.on('connect', () => done(true));
    socket.on('error', () => done(false));
    setTimeout(() => done(false), 1000);
  });
}

export async function startServer() {
  // Clone ke baad binary maujood nahi hoti — pehli baar download kar lete hain
  await ensureQdrant();

  if (await isRunning()) {
    console.log('Qdrant pehle se chal raha hai');
    return null;
  }

  // Port bound hai par HTTP dead hai = zombie. Ye tab hota hai jab purana
  // server theek se band nahi hua. 20s wait karne ka koi fayda nahi.
  if (await portBusy()) {
    console.error(
      `\nPort ${PORT} par ek mara hua qdrant baitha hai (bound hai, jawab nahi deta).\n` +
      `Chalao:  npm run db:stop\n`
    );
    process.exit(1);
  }

  // npm run dev me nodemon baar-baar restart karta hai. Agar Qdrant hamara
  // child rahe to har restart par DB bhi restart hoga. KEEP_DB=1 par use
  // detached chalate hain — ek baar start, phir sab restarts use reuse karte hain.
  // Band karne ke liye: npm run db:stop
  const keepAlive = process.env.KEEP_DB === '1';

  let stderr = '';

  const child = spawn(QDRANT_BIN, {
    detached: keepAlive,
    stdio: keepAlive ? 'ignore' : ['ignore', 'ignore', 'pipe'],
    env: {
      ...process.env,
      QDRANT__SERVICE__STATIC_CONTENT_DIR: QDRANT_STATIC,
      QDRANT__STORAGE__STORAGE_PATH: QDRANT_STORAGE,
      QDRANT__STORAGE__SNAPSHOTS_PATH: `${QDRANT_STORAGE}/snapshots`,
      QDRANT_INIT_FILE_PATH: `${QDRANT_STORAGE}/.initialized`,
    },
  });

  child.stderr?.on('data', (d) => { stderr += d; });

  child.on('error', (err) => {
    console.error(`Qdrant start nahi hua: ${err.message}`);
    process.exit(1);
  });

  if (keepAlive) {
    child.unref(); // hamare exit se ye na mare
  } else {
    // Exit par saath me band ho jaye, warna agli baar WAL lock error aayega.
    const stop = () => child.kill();
    process.on('exit', stop);
    process.on('SIGINT', () => { stop(); process.exit(0); });
    process.on('SIGTERM', () => { stop(); process.exit(0); });
  }

  process.stdout.write('Qdrant start ho raha hai');

  for (let i = 0; i < 40; i++) {
    await sleep(500);
    if (await isRunning()) {
      console.log(' — ready');
      return child;
    }

    // Process hi mar gaya to aur intezaar bekaar hai
    if (child.exitCode !== null) break;
    process.stdout.write('.');
  }

  console.error('\nQdrant start nahi hua.');

  const reason = stderr.split('\n').find((l) => /panic occurred|error/i.test(l));
  if (reason) console.error(reason.trim());
  if (/WouldBlock|Address already in use/.test(stderr)) {
    console.error('\nEk aur qdrant chal raha hai. Chalao:  npm run db:stop\n');
  }

  process.exit(1);
}
