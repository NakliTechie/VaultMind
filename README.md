# 🧠 VaultMind

An Obsidian vault explorer that runs entirely in your browser — force graph, semantic search, AI chat, and in-place note editing. No server. No API keys required. Nothing leaves your device.

**[→ Try it live](https://naklitechie.github.io/VaultMind/)**

## What it does

Drop your Obsidian vault (as a folder or a ZIP) and instantly get:

- **Force-directed graph** — every note is a node, every `[[wikilink]]` is an edge. Clusters emerge automatically by colour. Switch between 2D and 3D perspective at any time.
- **Full-text search** — multi-word, frequency-ranked search across all note bodies with highlighted snippets. Title hits outrank body hits.
- **AI chat** — ask questions about your vault. Context is scoped to the selected note and its 1-hop neighbours (micro-RAG). Works with a local WebGPU model (Gemma, Qwen, SmolLM) or any OpenAI-compatible API (OpenRouter, Groq, LM Studio, Ollama, and more).
- **Web search** — optional live search augmentation via Tavily, Brave, or a self-hosted SearXNG instance.
- **Note editor** — edit any note in place with a markdown toolbar (bold, italic, headings, code, links, lists, todos, blockquotes). Autosave to disk, unsaved-draft recovery, Ctrl+B/I/S shortcuts.
- **Semantic audit** — orphan detection, broken link report, top hubs, cluster overview.

Everything is a single HTML file. Open it, load a vault, start exploring.

## How to run

```bash
# Serve locally (required for File System Access API)
python3 -m http.server 8080
# open http://localhost:8080
```

Or just open `index.html` directly — ZIP drop works in all browsers without a server.

## AI chat setup

**Local (WebGPU)** — click *Load Model*. The model downloads once (~1–4 GB depending on selection) and is cached in your browser. Requires Chrome 113+ or any browser with WebGPU enabled.

**API mode** — enter a base URL and optional API key. Preset chips for common endpoints:

| Preset | URL |
|---|---|
| OpenRouter | `https://openrouter.ai/api/v1` |
| OpenAI | `https://api.openai.com/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| LM Studio | `http://localhost:1234/v1` |
| Ollama | `http://localhost:11434` |

Click the 🔄 button to auto-discover available models from the endpoint.

> **LM Studio / Ollama CORS:** In LM Studio open *Local Server → Server Settings → Enable CORS*. For Ollama restart with `OLLAMA_ORIGINS="*" ollama serve`.

## Note editing

- Open any note → click **✏️** to enter edit mode
- **Save** writes back to the original `.md` file (folder mode only; falls back to download for ZIP)
- Switch notes without saving → your draft is preserved in memory with an amber badge; come back and continue or Discard
- **Autosave** — tick the checkbox to save 1.5 s after each keystroke

## Tech

- **[Transformers.js v4](https://huggingface.co/docs/transformers.js)** — WebGPU inference for local LLM and WASM embeddings (all-MiniLM-L6-v2 for RAG)
- **File System Access API** — read/write vault files directly from the browser
- **Force simulation** — custom 2D/3D force-directed layout with exponential zoom and perspective projection
- **JSZip** — vault loading from ZIP for cross-browser compatibility
- Zero build tooling. One HTML file.

---

## Part of the NakliTechie series

| Tool | What it does |
|------|--------------|
| **VaultMind** | Obsidian vault explorer — graph, RAG chat, editor |
| [**KoLocal**](https://github.com/NakliTechie/KoLocal) | Go (Baduk) vs MCTS AI — 9×9 / 13×13 / 19×19 |
| [**LocalMind**](https://github.com/NakliTechie/LocalMind) | Private AI research agent — 9 tools, RAG, web search, multimodal |
| [**BabelLocal**](https://github.com/NakliTechie/BabelLocal) | Offline translation — 200 languages, NLLB model |
| [**GambitLocal**](https://github.com/NakliTechie/GambitLocal) | Chess vs Stockfish — correspondence mode via URL |
| [**VoiceVault**](https://github.com/NakliTechie/VoiceVault) | Audio transcription — Whisper, offline-first |
| [**SnipLocal**](https://github.com/NakliTechie/SnipLocal) | Background remover — RMBG-1.4, passport mode |
| [**StripLocal**](https://github.com/NakliTechie/StripLocal) | EXIF metadata stripper — nothing leaves the browser |

---

**Built by [Chirag Patnaik](https://github.com/NakliTechie)**

*Built with [Claude](https://claude.ai).*
