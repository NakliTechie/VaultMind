# 🧠 VaultMind

An Obsidian vault explorer and builder that runs entirely in your browser — force graph, live Bases dashboards, semantic search, AI chat, in-place editing, and a full ingestion pipeline that turns raw content into structured, interlinked notes. No server. No API keys required. Nothing leaves your device.

**[→ Try it live](https://vaultmind.naklitechie.com)**

## What it does

Drop your Obsidian vault (as a folder or a ZIP) and get:

- **Force-directed graph** — every note is a node, every `[[wikilink]]` is an edge. Clusters emerge automatically. Switch between 2D and 3D perspective at any time.
- **Bases dashboards** — opens your Obsidian `.base` files as live table and card views over note properties, with filters, sort, and formulas evaluated in-browser. No `.base` files yet? An auto-generated "All Notes" dashboard works on any vault, and one click writes starter Bases built from VaultMind's own frontmatter.
- **Ingestion pipeline** — drop files, paste URLs, record voice memos, or save to `_inbox/`. The AI extracts entities, writes source notes, proposes linked entity pages, and updates the graph live.
- **AI chat** — ask questions about your vault. Context is scoped to the selected note and its 1-hop neighbours (micro-RAG). Works with a local WebGPU model (Gemma 4, Qwen, SmolLM) or any OpenAI-compatible API.
- **Persistent semantic index** — embeddings are saved to IndexedDB after the first run. Subsequent loads only re-embed notes that changed. A 500-note vault goes from "indexing…" to "cached ✓" in under a second.
- **Wiki maintenance** — gap analysis, staleness detection, and AI-powered contradiction scanning keep your knowledge base consistent over time.
- **Full-text search** — multi-word, frequency-ranked search across all note bodies with highlighted snippets.
- **Note editor** — edit any note in place with a markdown toolbar. Autosave to disk, unsaved-draft recovery, Ctrl+B/I/S shortcuts.
- **Semantic audit** — orphan detection, broken link report, frontmatter lint, top hubs, tag cloud.
- **Web search** — optional live augmentation via Tavily, Brave, or SearXNG.
- **Community plugins (experimental)** — when you open a vault as a folder, VaultMind reads `.obsidian/plugins/` and runs your enabled Obsidian community plugins in-page, against a browser implementation of the Obsidian API. Mobile-compatible plugins (`isDesktopOnly: false`) are the target; plugins that reach for node/electron are flagged and not auto-run. See the 🧩 tab for status and a live compatibility matrix, and press Ctrl/Cmd-P for the command palette.

Everything is a single HTML file. Open it, load a vault, start exploring.

> **Plugins run with full page access.** Community-plugin support executes third-party `main.js` directly in the page (no sandbox yet). Only enable plugins you trust, on a vault you own. See [docs/obsidian-plugin-compatibility-plan.md](docs/obsidian-plugin-compatibility-plan.md).

## How to run

```bash
# Serve locally (required for File System Access API and WebGPU)
python3 -m http.server 8080
# open http://localhost:8080
```

Or open `index.html` directly — ZIP drop works in all browsers without a server, though writing to disk requires folder mode.

---

## Ingestion pipeline

Implements the [Karpathy "LLM Wiki" pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — a compounding knowledge base maintained by an AI — running entirely in the browser with no terminal, no CLI, no cloud.

### Two ingestion paths

**Manual (📥 Ingest tab)**
- Drag and drop files directly into the tab
- Paste a URL — page is fetched and converted to markdown
- Paste any text — clipboard captures, quotes, fragments
- Record a voice memo — Whisper WASM transcribes it

**Automatic (`_inbox/` folder watcher)**
Save files to `_inbox/` from any app on your computer. VaultMind detects them within 5 seconds. Enable *Auto* to process without clicking.

### Supported file types

| Type | How it's extracted |
|---|---|
| `.md`, `.txt` | Read as-is |
| `.pdf` | pdf.js text extraction |
| `.html` | Parsed and converted to markdown |
| `.png`, `.jpg`, `.webp` | OCR via Tesseract WASM |
| `.webm`, `.mp3`, `.wav`, `.m4a`, `.ogg` | Transcription via Whisper WASM |
| `.csv`, `.json` | Read as structured text |

PDF.js, Tesseract, and Whisper are all lazy-loaded on first use — zero overhead if you don't use them.

### Content modes

The AI adjusts its extraction strategy based on what you drop in:

| Mode | Triggered by | What the AI focuses on |
|---|---|---|
| **voice** | Audio / voice memo | Key ideas, decisions, action items. Named entities only if explicit. |
| **article** | URL | Core argument/thesis. Full entity extraction. Prefers updating existing pages. |
| **document** | PDF | Arguments, conclusions, methodology. Section-aware summary. |
| **image** | Image (OCR) | Best-effort only. Never infers entities not clearly present in the text. |
| **note** | `.md`, `.txt`, `.csv`, paste | Linking focus. Minimal duplication of content already in the vault. |
| **sparse** | Any content under 100 words | Writes a capture note only — no entity pages, no hallucination. |

### Processing pipeline

1. **Extract** — text pulled from the file using the appropriate method above
2. **Mode detect** — content type mapped to an extraction strategy (see table above)
3. **AI analysis** — summary, entities, tags, wikilinks, and (for voice) action items
4. **Source note** — written to `_sources/YYYY-MM-DD/` with full Obsidian frontmatter; entity wikilinks injected deterministically. Voice memos include a checkbox action items list.
5. **Review** — proposed entity/concept pages shown for Accept / Skip. *Accept All* closes the panel automatically
6. **Live update** — accepted pages written to vault root; graph re-renders with new nodes and edges immediately
7. **Incremental re-index** — new notes are embedded and added to the semantic index in the same session, no reload needed
8. **Log** — `_log.md` appended; `_index.md` rebuilt

SHA-256 deduplication prevents the same file being processed twice. Done items fade from the queue after 30 s; errors stay until reload.

### Vault structure created by VaultMind

```
my-vault/
├── _inbox/                  ← watched folder (drop files here from any app)
├── _sources/
│   └── 2026-04-05/
│       ├── article.md       ← source note: summary + entities + original content
│       └── voice-memo.md    ← Whisper transcript
├── _index.md                ← auto-maintained catalog
├── _log.md                  ← append-only ingest history
├── _schema.md               ← AI processing rules (user-editable)
├── Andrej Karpathy.md       ← entity page (AI-created)
├── WebGPU.md                ← concept page (AI-created)
├── entities.base            ← generated Bases dashboard (optional)
└── ...                      ← your existing notes and .base files (untouched)
```

---

## Semantic index (RAG)

VaultMind embeds every note using `all-MiniLM-L6-v2` (384-dim vectors, WASM) and stores the result in **IndexedDB** — so the index persists across browser sessions.

| Behaviour | Detail |
|---|---|
| **First load** | All notes chunked (800 chars, 150-char overlap) and embedded. Progress shown live. |
| **Subsequent loads** | Only notes whose content changed are re-embedded. Unchanged notes load from cache instantly. |
| **Status indicator** | Shows `RAG ready — N chunks (cached ✓)` when fully cached, or `Indexing… X/Y new chunks (Z cached)` during a partial update. |
| **re-index link** | Appears next to the status. Click to wipe the cache and embed from scratch. |
| **After ingest** | Accepting new entity pages triggers an incremental re-index — new notes are searchable immediately. |

**Micro-RAG** — when a note is selected, context is scoped to that note and its 1-hop neighbours before expanding to the full vault. Cosine similarity threshold: 0.2 (local) / 0.25 (global).

---

## Bases (live dashboards)

VaultMind reads [Obsidian Bases](https://obsidian.md/help/bases/syntax) — the core plugin that turns your notes into a database driven by their frontmatter properties. A Base isn't a spreadsheet you fill in; it's a lens you point at notes you already have. Open the **⊞ Bases** tab to use them.

| Capability | Detail |
|---|---|
| **Reads `.base` files** | Any `.base` in your vault (folder or ZIP) is parsed and rendered. Previously ignored alongside `.md`; now first-class. |
| **Table & card views** | Each view in the file renders as a sortable table or a card gallery (with cover images). Switch views from the panel header. |
| **Filters** | `and` / `or` / `not` trees and expression strings (`status != "done"`, `source_count >= 2`, `tags.contains("ai")`) evaluated per note. |
| **Formulas** | Computed columns — `source_count * 10`, `"$" + price.toFixed(2)` — with arithmetic, string ops, and built-in functions (`if`, `min`, `max`, `date`, `now`, …). |
| **Sort / group / limit** | Honoured from the file; click any column header to re-sort live. |
| **Display names** | The `properties` block's `displayName` becomes the column header. |

**Works on any vault.** Even with zero `.base` files, the auto-generated **✦ All Notes** dashboard gives you a filterable, sortable properties table built from your vault's most common frontmatter fields.

**Generate starter Bases.** Because VaultMind writes consistent properties (`page_type`, `source_count`, `last_updated`, …), it can emit ready-made Bases to your vault root in one click:

| Generator | What it shows |
|---|---|
| **sources.base** | Every source note ingested by VaultMind, newest first |
| **entities.base** | Entity & concept pages ranked by how many sources mention them |
| **stale.base** | Entity pages last updated before 2026 — candidates for re-synthesis |

In folder mode these are written to disk and open back up in Obsidian itself; in ZIP mode they live for the session.

---

## Wiki maintenance (Audit tab)

Three on-demand operations that keep the knowledge base healthy:

| Operation | AI needed? | What it finds |
|---|---|---|
| **🔎 Analyze gaps** | No | Entities mentioned in 2+ sources but with no page; broken links from 2+ notes; thin topics (1 source) |
| **🕓 Check staleness** | No | Entity pages whose `last_updated` predates newer source notes that mention them |
| **🔍 Scan contradictions** | Yes | Factual conflicts between recent sources and existing entity pages |

Each result shows one-click actions: *Create page* (AI-generated), *Re-synthesize* (AI rewrites from all sources), *Keep / Dismiss*.

**⬡ Generate MOC** — select any connected note in the graph and click the button that appears. The AI reads the note and all its direct links, groups them into themed sections, and writes a Map of Content page to the vault root.

---

## AI setup

### Local (WebGPU)

Click *Load Model*. The model downloads once and is cached in the browser. On subsequent visits VaultMind checks the cache and **auto-loads your last model** — no interaction needed.

| Model | Size | Notes |
|---|---|---|
| Gemma 4 E2B | ~2 GB | Default. Good balance of speed and quality. |
| Gemma 4 E4B | ~4 GB | Higher quality. Slower first generation. |
| Qwen 2.5 1.5B | ~1 GB | Fast. Good for quick Q&A. |
| Qwen 2.5 0.5B | ~500 MB | Fastest. Limited reasoning. |
| SmolLM2 1.7B | ~1 GB | Lightweight alternative. |

Requires Chrome 113+ or any WebGPU-capable browser.

### API mode

Any OpenAI-compatible endpoint. Click 🔄 to auto-discover models.

| Preset | URL |
|---|---|
| OpenRouter | `https://openrouter.ai/api/v1` |
| OpenAI | `https://api.openai.com/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| LM Studio | `http://localhost:1234/v1` |
| Ollama | `http://localhost:11434` |

> **CORS for local servers:** LM Studio → *Local Server → Server Settings → Enable CORS*. Ollama: `OLLAMA_ORIGINS="*" ollama serve`.

### System prompt

Expand *System prompt* inside chat Settings to customise the AI's persona and instructions. Changes persist across sessions. Reset restores the default.

---

## Tech stack

| Concern | Solution |
|---|---|
| LLM inference | [Transformers.js v4](https://huggingface.co/docs/transformers.js) — WebGPU (causal + multimodal) |
| Embeddings (RAG) | all-MiniLM-L6-v2 via WASM — persistent index stored in IndexedDB, incremental updates |
| PDF extraction | pdf.js (lazy-loaded from CDN) |
| OCR | Tesseract.js (lazy-loaded from CDN) |
| Audio transcription | Whisper WASM via Transformers.js (lazy-loaded) |
| Vault read/write | File System Access API |
| ZIP loading | JSZip |
| Graph simulation | Custom 2D/3D force layout |
| Build tooling | None — one HTML file |

## Palette

Coloured with **`mexico-10 · NOCHE DE MUERTOS`** — Day of the Dead night, ofrenda lit by marigold candles. The graph reads as a memorial: cobalt notes, ofrenda-red orphans, copal-incense lime hubs, pan-de-muerto tan MOCs, marigold-candle yellow when selected. A second-brain rendered as the night you keep vigil for what came before.

Palette pulled from [**Rangrez**](https://github.com/NakliTechie/rangrez), the global colour-palette library that backs all NakliTechie projects.

---

## Part of the NakliTechie series

| Tool | What it does |
|------|--------------|
| **VaultMind** | Obsidian vault explorer + builder — graph, ingest, RAG chat, editor |
| [**KoLocal**](https://github.com/NakliTechie/KoLocal) | Go (Baduk) vs MCTS AI — 9×9 / 13×13 / 19×19 |
| [**LocalMind**](https://github.com/NakliTechie/LocalMind) | Private AI research agent — 9 tools, RAG, web search, multimodal |
| [**BabelLocal**](https://github.com/NakliTechie/BabelLocal) | Offline translation — 200 languages, NLLB model |
| [**GambitLocal**](https://github.com/NakliTechie/GambitLocal) | Chess vs Stockfish — correspondence mode via URL |
| [**VoiceVault**](https://github.com/NakliTechie/VoiceVault) | Audio transcription — Whisper, offline-first |
| [**SnipLocal**](https://github.com/NakliTechie/SnipLocal) | Background remover — RMBG-1.4, passport mode |
| [**StripLocal**](https://github.com/NakliTechie/StripLocal) | EXIF metadata stripper — nothing leaves the browser |

---

## Footprint

The entire app is a single HTML file.

| | VaultMind | Typical news article page |
|---|---|---|
| Files | 1 | 100s (HTML + JS bundles + CSS + fonts + images + trackers) |
| Raw size | 270 KB | 3–8 MB |
| Transferred (gzipped) | **~69 KB** | 3–8 MB |
| Trackers / ads | 0 | Many |
| ML inference | ✅ In-browser | ✗ |

VaultMind is smaller than the HTML alone on most news pages — and does local LLM inference, semantic search, OCR, and audio transcription on top of it. The only things fetched at runtime are the AI models, and those are cached in the browser after the first download.

---

**Built by [Chirag Patnaik](https://github.com/NakliTechie)**

*Built with [Claude](https://claude.ai).*
