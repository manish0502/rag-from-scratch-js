import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFile } from 'node:fs/promises';

// PDF ka har page alag-alag text ke roop me. Page number rakhte hain
// taaki baad me bata sakein chunk kahan se aaya.
export async function extractPages(filePath) {
  const bytes = new Uint8Array(await readFile(filePath));
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true, verbosity: 0 }).promise;
  const pages = [];

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();

    let text = '';
    for (const item of content.items) {
      if (typeof item.str !== 'string') continue;
      text += item.str + (item.hasEOL ? '\n' : ' ');
    }

    pages.push({ page: n, text: clean(text) });
  }

  await doc.destroy();
  return pages;
}

function clean(raw) {
  return raw
    .replace(/-\n\s*/g, '')     // papers me "informa-\ntion" bahut aata hai
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
