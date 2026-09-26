import readline from 'node:readline/promises';

import { embedOne } from '../3-embed/index.js';
import { queryPoints } from '../4-store/index.js';
import { MIN_SCORE } from '../helpers/config.js';
import { dim, bold, cyan, scoreBar, pageLabel } from '../helpers/format.js';

// Sawaal -> vector -> top-k chunks
export async function search(question, { k, source }) {
  // Query ko usi model se embed karna hai jisse chunks kiye the.
  const vector = await embedOne(question);

  return queryPoints({ vector, limit: k, source });
}

export function printResults(question, points, { full, source }) {
  console.log(`\n${bold('Q:')} ${question}${source ? dim(`   [only ${source}]`) : ''}\n`);

  if (points.length === 0) {
    console.log('  kuch nahi mila\n');
    return;
  }

  for (const [i, p] of points.entries()) {
    const { text, source: src } = p.payload;

    console.log(
      `${bold(`#${i + 1}`)}  ${p.score.toFixed(3)}  ${scoreBar(p.score)}  ` +
      `${cyan(src)} ${dim(pageLabel(p.payload))} ${dim(`id:${p.id}`)}`
    );
    console.log(`    ${full ? text : text.slice(0, 300) + '…'}\n`);
  }

  // Retrieval hamesha kuch na kuch lautata hai, isliye score dekhna zaroori hai.
  if (points[0].score < MIN_SCORE) {
    console.log(dim(`  top score ${MIN_SCORE} se kam — jawab shayad in PDFs me hai hi nahi\n`));
  }
}

export async function ask(question, opts) {
  printResults(question, await search(question, opts), opts);
}

export async function interactive(opts) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(dim('sawaal likho. khaali Enter = exit\n'));

  while (true) {
    let q;
    try {
      q = (await rl.question(bold('> '))).trim();
    } catch {
      break; // stdin band (Ctrl+D ya piped input khatam)
    }
    if (!q) break;
    await ask(q, opts);
  }

  rl.close();
}
