// Entry point. Sirf CLI routing — asli kaam src/ me hai.
//
//   npm start                    server + ingest (agar zarurat ho) + sawaal
//   npm start -- ingest          sirf dobara ingest
//   npm start -- "your question" [--k 3] [--source bert.pdf] [--full]

import { startServer } from './src/helpers/server.js';
import { countPoints } from './src/4-store/index.js';
import { ingest } from './src/flows/ingest.js';
import { ask, interactive } from './src/flows/search.js';
import { TOP_K, QDRANT_URL } from './src/helpers/config.js';

function parseArgs(argv) {
  const opts = { k: TOP_K, full: false, source: null };
  const words = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--k') opts.k = Number(argv[++i]) || TOP_K;
    else if (argv[i] === '--source') opts.source = argv[++i];
    else if (argv[i] === '--full') opts.full = true;
    else words.push(argv[i]);
  }

  return { opts, command: words.join(' ') };
}

const { opts, command } = parseArgs(process.argv.slice(2));

await startServer();

if (command === 'ingest') {
  await ingest();
} else {
  const count = await countPoints();
  if (count) {
    console.log(`${count} chunks ready`);
  } else {
    console.log('Collection khaali — ingest chala rahe hain');
    await ingest();
  }

  console.log(`Dashboard: ${QDRANT_URL}/dashboard`);

  if (command) await ask(command, opts);
  else await interactive(opts);
}

process.exit(0);
