// Qdrant binary aur dashboard files download karta hai.
//
// Ye repo me commit nahi hote — binary 73MB ki hai aur har OS ke liye alag
// hoti hai. Isliye clone karne ke baad yahi script sahi wali le aati hai.
// npm start khud call kar leta hai agar binary na mile.

import { execFileSync } from 'node:child_process';
import { mkdir, rm, rename, access, chmod, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { QDRANT_BIN, QDRANT_STATIC, QDRANT_VERSION, QDRANT_UI_VERSION } from './config.js';

// platform+arch -> qdrant release asset
const ASSETS = {
  'darwin-arm64': 'qdrant-aarch64-apple-darwin.tar.gz',
  'darwin-x64': 'qdrant-x86_64-apple-darwin.tar.gz',
  'linux-x64': 'qdrant-x86_64-unknown-linux-gnu.tar.gz',
  'linux-arm64': 'qdrant-aarch64-unknown-linux-musl.tar.gz',
  'win32-x64': 'qdrant-x86_64-pc-windows-msvc.zip',
};

const exists = (p) => access(p).then(() => true, () => false);

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);

  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

function extract(archive, into) {
  if (archive.endsWith('.zip')) {
    // macOS/Linux par unzip, Windows ke tar par bhi zip chalti hai
    try {
      execFileSync('unzip', ['-q', '-o', archive, '-d', into], { stdio: 'ignore' });
      return;
    } catch {
      execFileSync('tar', ['-xf', archive, '-C', into], { stdio: 'ignore' });
      return;
    }
  }

  execFileSync('tar', ['-xzf', archive, '-C', into], { stdio: 'ignore' });
}

async function installBinary(tmp) {
  const key = `${os.platform()}-${os.arch()}`;
  const asset = ASSETS[key];

  if (!asset) {
    throw new Error(
      `${key} ke liye Qdrant ki ready binary nahi hai.\n` +
      `Docker se chala sakte ho:  docker run -p 6333:6333 qdrant/qdrant`
    );
  }

  const url = `https://github.com/qdrant/qdrant/releases/download/${QDRANT_VERSION}/${asset}`;
  const archive = path.join(tmp, asset);

  console.log(`  qdrant ${QDRANT_VERSION} (${key})`);
  await download(url, archive);

  const out = path.join(tmp, 'qdrant-bin');
  await mkdir(out, { recursive: true });
  extract(archive, out);

  const binDir = path.dirname(QDRANT_BIN);
  await mkdir(binDir, { recursive: true });

  const name = os.platform() === 'win32' ? 'qdrant.exe' : 'qdrant';
  await rename(path.join(out, name), QDRANT_BIN);
  await chmod(QDRANT_BIN, 0o755);
}

async function installDashboard(tmp) {
  const url = `https://github.com/qdrant/qdrant-web-ui/releases/download/${QDRANT_UI_VERSION}/dist-qdrant.zip`;
  const archive = path.join(tmp, 'dist-qdrant.zip');

  console.log(`  dashboard ${QDRANT_UI_VERSION}`);
  await download(url, archive);

  const out = path.join(tmp, 'ui');
  await mkdir(out, { recursive: true });
  extract(archive, out);

  // zip ke andar ek dist/ folder hota hai
  await rename(path.join(out, 'dist'), QDRANT_STATIC);
}

/** Jo missing hai wahi download karta hai. Dono maujood ho to kuch nahi karta. */
export async function ensureQdrant() {
  const haveBin = await exists(QDRANT_BIN);
  const haveUi = await exists(QDRANT_STATIC);

  if (haveBin && haveUi) return false;

  console.log('Pehli baar setup — Qdrant download kar rahe hain (~35MB, ek hi baar)');

  const tmp = path.join(os.tmpdir(), `qdrant-setup-${Date.now()}`);
  await mkdir(tmp, { recursive: true });

  try {
    if (!haveBin) await installBinary(tmp);
    if (!haveUi) await installDashboard(tmp);
    console.log('  ho gaya\n');
    return true;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
