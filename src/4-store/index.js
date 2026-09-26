import { QdrantClient } from '@qdrant/js-client-rest';
import { COLLECTION, VECTOR_SIZE, QDRANT_URL } from '../helpers/config.js';

export const client = new QdrantClient({ url: QDRANT_URL });

// Debugger me ruko to idle HTTP connection gir jata hai, aur agli call
// ECONNRESET de deti hai. Aise transient errors par dobara koshish karte hain.
const TRANSIENT = /ECONNRESET|ECONNREFUSED|fetch failed|socket hang up|ETIMEDOUT/i;

async function withRetry(fn, tries = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const text = `${err?.message ?? ''} ${err?.cause?.code ?? ''}`;
      if (attempt >= tries || !TRANSIENT.test(text)) throw err;

      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

// Distance 'Cosine' zaroori hai. Euclid par order to theek aata hai
// par score bekaar ho jata hai, phir MIN_SCORE threshold kaam nahi karta.
export async function createCollection() {
  const { exists } = await client.collectionExists(COLLECTION);
  if (exists) await client.deleteCollection(COLLECTION);

  await client.createCollection(COLLECTION, {
    vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
  });

  // --source filter tez chale iske liye
  await client.createPayloadIndex(COLLECTION, { field_name: 'source', field_schema: 'keyword' });
}

export function upsertPoints(points) {
  return withRetry(() => client.upsert(COLLECTION, { wait: true, points }));
}

export async function queryPoints({ vector, limit, source }) {
  const { points } = await withRetry(() =>
    client.query(COLLECTION, {
      query: vector,
      limit,
      with_payload: true,
      ...(source && { filter: { must: [{ key: 'source', match: { value: source } }] } }),
    })
  );

  return points;
}

// DB clear karne ka sahi tareeka. qdrant-data folder ko haath se delete mat
// karna jab server chal raha ho — server zinda reh jata hai par uski storage
// gayab ho jati hai.
export async function dropCollection() {
  const { exists } = await client.collectionExists(COLLECTION);
  if (!exists) return false;

  await client.deleteCollection(COLLECTION);
  return true;
}

export async function countPoints() {
  const info = await withRetry(() => client.getCollection(COLLECTION)).catch(() => null);
  return info?.points_count ?? 0;
}
