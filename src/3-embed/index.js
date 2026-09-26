import { pipeline } from '@huggingface/transformers';
import { EMBED_MODEL } from '../helpers/config.js';

let extractorPromise = null;

function getExtractor() {
  extractorPromise ??= pipeline('feature-extraction', EMBED_MODEL);
  return extractorPromise;
}

// Text -> vector. normalize:true isliye ki Qdrant ka Cosine score
// seedha similarity ban jaye.
export async function embed(texts, onProgress) {
  const extractor = await getExtractor();
  const vectors = [];
  const BATCH = 32;

  for (let i = 0; i < texts.length; i += BATCH) {
    const out = await extractor(texts.slice(i, i + BATCH), { pooling: 'mean', normalize: true });
    vectors.push(...out.tolist());
    onProgress?.(Math.min(i + BATCH, texts.length), texts.length);
  }

  return vectors;
}

export async function embedOne(text) {
  const [vector] = await embed([text]);
  return vector;
}
