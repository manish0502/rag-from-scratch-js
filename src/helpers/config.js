// Saari settings .env se aati hain. Yahan sirf padhte hain.
// Node khud .env load karta hai: node --env-file=.env index.js

export const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
export const COLLECTION = process.env.COLLECTION ?? 'papers';

export const QDRANT_BIN = process.env.QDRANT_BIN ?? './bin/qdrant';
export const QDRANT_STORAGE = process.env.QDRANT_STORAGE ?? './qdrant-data';
export const QDRANT_STATIC = process.env.QDRANT_STATIC ?? './static';

// Setup script inhi versions ko download karta hai
export const QDRANT_VERSION = process.env.QDRANT_VERSION ?? 'v1.19.1';
export const QDRANT_UI_VERSION = process.env.QDRANT_UI_VERSION ?? 'v0.2.18';

export const EMBED_MODEL = process.env.EMBED_MODEL ?? 'Xenova/all-MiniLM-L6-v2';
export const VECTOR_SIZE = Number(process.env.VECTOR_SIZE ?? 384);

export const CHUNK_WORDS = Number(process.env.CHUNK_WORDS ?? 200);
export const CHUNK_OVERLAP = Number(process.env.CHUNK_OVERLAP ?? 50);

export const TOP_K = Number(process.env.TOP_K ?? 5);
export const MIN_SCORE = Number(process.env.MIN_SCORE ?? 0.3);

export const DOCS_DIR = process.env.DOCS_DIR ?? 'docs';
