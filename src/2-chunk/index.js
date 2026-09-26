import { CHUNK_WORDS, CHUNK_OVERLAP } from '../helpers/config.js';

// Pages ko overlapping word-windows me todta hai.
// Overlap isliye ki boundary par kata hua sentence kisi ek chunk me pura mile.
export function chunkPages(pages, source) {
  const tokens = [];
  for (const { page, text } of pages) {
    for (const word of text.split(' ')) {
      if (word) tokens.push({ word, page });
    }
  }

  const chunks = [];
  const step = CHUNK_WORDS - CHUNK_OVERLAP;

  for (let start = 0; start < tokens.length; start += step) {
    const window = tokens.slice(start, start + CHUNK_WORDS);
    if (window.length < 20) break; // aakhri adhoora tukda

    chunks.push({
      text: window.map((t) => t.word).join(' '),
      source,
      pageStart: window[0].page,
      pageEnd: window.at(-1).page,
    });

    if (start + CHUNK_WORDS >= tokens.length) break;
  }

  return chunks;
}
