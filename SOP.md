# SOP — running, debugging, maintenance

Operational guide. For how the system actually works, read [README.md](README.md).

---

## First time

```bash
cp .env.example .env
npm install
npm start
```

`npm start` handles the rest on its own:

1. Downloads the Qdrant binary and dashboard for your OS (~35MB, once) into `bin/` and `static/`
2. Starts Qdrant on port 6333
3. Downloads the embedding model (~23MB, once, cached in `node_modules/.cache`)
4. Reads every PDF in `docs/` and fills the database
5. Drops you at a question prompt

First run takes about a minute. After that, roughly 4 seconds.

**Requirements:** Node.js 20 or newer. Nothing else — no Docker, no Python, no accounts.

To download the binaries without starting anything:

```bash
npm run setup
```

---

## Commands

### Everyday

| Command | What it does |
|---|---|
| `npm start` | Server, ingest if the database is empty, then a question prompt |
| `npm start -- "your question"` | One question, then exit |
| `npm run dev` | Same as `npm start`, restarted by nodemon whenever you save a file |
| `npm run debug` | Runs ingest under the Node inspector |

Question flags:

```bash
npm start -- "what is a bi-encoder?" --k 3
npm start -- "what is attention?" --source attention.pdf
npm start -- "how does BERT train?" --full
```

| Flag | Meaning |
|---|---|
| `--k 3` | How many chunks to return (default `TOP_K`) |
| `--source bert.pdf` | Only search inside one file |
| `--full` | Print the whole chunk instead of the first 300 characters |

### Database (`db/`, run by hand)

These never run automatically.

| Command | What it does |
|---|---|
| `npm run db:reset` | Drops the collection. Next `npm start` refills it |
| `npm run db:stop` | Stops Qdrant and waits until the port is genuinely free |
| `npm run db:start` | Runs Qdrant on its own, in the foreground |
| `npm run setup` | Downloads the Qdrant binary and dashboard if missing |

---

## Configuration

Everything lives in `.env`.

| Variable | Notes |
|---|---|
| `QDRANT_URL` | Where the database listens |
| `COLLECTION` | Collection name |
| `QDRANT_BIN` | Path to the binary |
| `QDRANT_STORAGE` | Where the database keeps its files |
| `QDRANT_STATIC` | Dashboard files |
| `QDRANT_VERSION` | Which Qdrant release `npm run setup` fetches |
| `QDRANT_UI_VERSION` | Which dashboard release |
| `EMBED_MODEL` | Any feature-extraction model from Transformers.js |
| `VECTOR_SIZE` | **Must match the model's output.** MiniLM = 384 |
| `CHUNK_WORDS` | Words per chunk |
| `CHUNK_OVERLAP` | Words shared between neighbouring chunks |
| `TOP_K` | Default number of results |
| `MIN_SCORE` | Below this, a warning is printed |
| `DOCS_DIR` | Where the PDFs live |

**Which changes need a re-ingest?**

| Changed | Re-ingest needed |
|---|---|
| `CHUNK_WORDS`, `CHUNK_OVERLAP` | Yes |
| `EMBED_MODEL`, `VECTOR_SIZE` | Yes |
| PDFs in `docs/` | Yes |
| `TOP_K`, `MIN_SCORE` | No |

```bash
npm run db:reset && npm start
```

---

## Debugging

### VS Code

Press **F5** and pick a configuration from `.vscode/launch.json`:

| Configuration | Runs |
|---|---|
| 1. Ingest — PDF se database tak | The full ingest pipeline |
| 2. Ask — ek sawaal | A single search |
| 3. Start — sab kuch | The default flow |

Useful breakpoints:

| File | What you see there |
|---|---|
| `src/1-pdf/index.js` | PDF fragments being glued into text |
| `src/2-chunk/index.js` | The token list, and chunk windows being sliced |
| `src/3-embed/index.js` | `out.tolist()` — 384 numbers arriving |
| `src/4-store/index.js` | The exact point sent to Qdrant |

Run `npm run db:reset` first, otherwise the database is already full and ingest is skipped.

### Without VS Code

```bash
npm run debug
```

Then open `chrome://inspect` in Chrome and click **inspect**. Execution stops on the
first line.

### Keeping the database up between restarts

By default `npm start` owns Qdrant and shuts it down on exit, so under nodemon the
database restarts on every save. For long debugging sessions, run it separately:

```bash
npm run db:start      # terminal 1
npm run dev           # terminal 2
```

`npm start` detects the running server and leaves it alone.

---

## Dashboard

```
http://localhost:6333/dashboard
```

Collection `papers` lists every chunk with its text, source file and pages.

Vectors are not returned by default. To see one, use the **Console** tab:

```
POST /collections/papers/points
{"ids": [7], "with_payload": true, "with_vector": true}
```

---

## Changing the corpus

Drop PDFs into `docs/`, remove the ones you don't want, then:

```bash
npm run db:reset && npm start
```

Scanned PDFs will produce 0 chunks — they are images, with no text layer. Run them
through OCR first.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `mara hua qdrant baitha hai` | `npm run db:stop` |
| `Address already in use` | `npm run db:stop` |
| `Can't init WAL: WouldBlock` | `npm run db:stop` — two Qdrants were fighting over the same data |
| Everything feels slow | `npm run db:stop`, then `npm start`. A clean start takes 1–2 seconds; longer means a dead server is holding the port |
| `Config file not found: config/config` | Harmless warning from the Qdrant binary. Ignore it |
| `ECONNRESET` during ingest | Idle connections drop while you sit on a breakpoint. It retries three times automatically |
| Ingest reports 0 chunks | The PDF has no text layer |
| All scores near 0, or negative | The collection was not created with Cosine distance. `npm run db:reset && npm start` |
| `dimension mismatch` | `VECTOR_SIZE` in `.env` does not match the model's output |
| Results look wrong | Usually normal — check the score. Below `MIN_SCORE` means the answer is not in the corpus at all |

**Never delete `qdrant-data/` by hand while the server is running.** The process stays
alive holding the port but loses its storage, and every later start fails with
`Address already in use`. Use `npm run db:reset`.

---

## What is safe to delete

| Path | Safe? |
|---|---|
| `qdrant-data/` | Only after `npm run db:stop`. Rebuild with `npm start` |
| `bin/`, `static/` | Yes — `npm run setup` fetches them again |
| `node_modules/` | Yes — `npm install` |
| `.env` | Yes — `cp .env.example .env` |
