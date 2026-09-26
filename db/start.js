// Qdrant ko alag terminal me chalata hai, apne aap band nahi hota.
//
// Debugging ke waqt kaam ka: normally npm start Qdrant ko child banata hai,
// to har nodemon restart par DB bhi restart hota hai. Isse alag chala do,
// phir npm start use dekh kar chhod dega.
//
//   npm run db:start        (Ctrl+C se band)

import { spawn } from 'node:child_process';
import { QDRANT_BIN, QDRANT_STORAGE, QDRANT_STATIC, QDRANT_URL } from '../src/helpers/config.js';

console.log(`${QDRANT_BIN} chal raha hai — ${QDRANT_URL}`);
console.log(`Dashboard: ${QDRANT_URL}/dashboard`);
console.log('Band karne ke liye Ctrl+C\n');

const child = spawn(QDRANT_BIN, {
  stdio: 'inherit',
  env: {
    ...process.env,
    QDRANT__SERVICE__STATIC_CONTENT_DIR: QDRANT_STATIC,
    QDRANT__STORAGE__STORAGE_PATH: QDRANT_STORAGE,
    QDRANT__STORAGE__SNAPSHOTS_PATH: `${QDRANT_STORAGE}/snapshots`,
    QDRANT_INIT_FILE_PATH: `${QDRANT_STORAGE}/.initialized`,
  },
});

child.on('exit', (code) => process.exit(code ?? 0));
