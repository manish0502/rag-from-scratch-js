import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { extractPages } from '../1-pdf/index.js';
import { chunkPages } from '../2-chunk/index.js';
import { embed } from '../3-embed/index.js';
import { createCollection, upsertPoints, countPoints } from '../4-store/index.js';
import { DOCS_DIR, CHUNK_WORDS, CHUNK_OVERLAP } from '../helpers/config.js';

// docs/*.pdf -> chunks -> vectors -> Qdrant
export async function ingest() {
  const files = (await readdir(DOCS_DIR)).filter((f) => f.toLowerCase().endsWith('.pdf'));
  if (files.length === 0) throw new Error(`${DOCS_DIR}/ me koi PDF nahi hai`);

  console.log(`\n${files.length} PDFs | chunk ${CHUNK_WORDS} words, overlap ${CHUNK_OVERLAP}\n`);

  const chunks = [];
  for (const file of files) {
    const pages = await extractPages(path.join(DOCS_DIR, file));
    const fileChunks = chunkPages(pages, file);
    chunks.push(...fileChunks);
    console.log(`  ${file.padEnd(20)} ${String(pages.length).padStart(3)} pages -> ${fileChunks.length} chunks`);
  }

  console.log(`\nTotal ${chunks.length} chunks. Embedding...`);

  const vectors = await embed(
    chunks.map((c) => c.text),
    (done, total) => process.stdout.write(`\r  ${done}/${total}`)
  );

  await createCollection();

  const BATCH = 100;
  for (let i = 0; i < chunks.length; i += BATCH) {
    await upsertPoints(
      chunks.slice(i, i + BATCH).map((chunk, j) => ({
        id: i + j,
        vector: vectors[i + j],
        payload: {
          text: chunk.text,
          source: chunk.source,
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
        },
      }))
    );
    process.stdout.write(`\r  upsert ${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
  }

  console.log(`\r  ${await countPoints()} chunks Qdrant me                \n`);
}
