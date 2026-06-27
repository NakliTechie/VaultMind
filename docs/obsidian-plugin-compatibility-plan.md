# Obsidian Plugin Compatibility — Plan

> Status: **planning / not started**. Authored in a web session; to be resumed in a
> desktop session. This is the roadmap for making VaultMind run existing Obsidian
> community plugins as drop-ins.

## Goal

Replicate enough of the Obsidian plugin surface that existing community plugins work
as **drop-ins** inside VaultMind. Users who bring in a plugin we can't fully support
get a **non-blocking warning**, not a hard failure.

## Locked decisions (from the planning session)

1. **Packaging — accept a build step for the whole app.** Drop the single-file /
   no-build constraint. One codebase, a bundler, modular source. (The README's
   "one HTML file / ~69 KB" selling point retires; needs new positioning.)
2. **Security — run plugins in-page first, harden later.** Execute plugin code
   directly in the page initially for development speed; move to a sandbox
   (Worker/iframe + message bridge) in a later phase. **Because privacy is the
   brand, ship an honest disclosure during the in-page window** (see Phase C).
3. **First milestone — go straight for editor parity.** Tackle the CodeMirror 6
   editor swap early so editor-heavy plugins (Templater, Tasks, etc.) are the
   first real drop-ins. This makes the early work foundational rather than flashy.

## Reality check — what is actually achievable

Obsidian's plugin API assumes an Electron + Node runtime. A browser cannot give a
plugin `fs`, `child_process`, `electron`, or native binaries. **No browser-resident
host can run *every* plugin.**

The reachable target is precise and well-defined: **Obsidian's mobile runtime already
runs the same plugin API without Node/Electron.** The plugins that work on Obsidian
mobile are exactly the ones that can work in a browser, and Obsidian labels them via
`isDesktopOnly: false`. So the north star is:

- **Green** — mobile-compatible, documented API only → load silently. (Large fraction
  of the ecosystem: Dataview-render, Calendar, Tasks, Kanban, many UI/view plugins.)
- **Yellow** — `isDesktopOnly: true`, or touches an API we've only partially shimmed
  → load best-effort + non-blocking warning.
- **Red** — static detection of `require('fs' | 'child_process' | 'electron')` →
  don't auto-execute; warn; offer "run anyway."

Honest framing: **replicate the Obsidian *mobile* plugin surface**; gate the rest.

## Architecture, in layers

1. **Loader** — read `.obsidian/plugins/*/{manifest.json,main.js,styles.css,data.json}`
   and `community-plugins.json` (the enabled set). NOTE: today VaultMind *skips*
   `.obsidian` entirely (`index.html`, the vault walk filter) — that is the first
   thing to change.
2. **Module shim** — plugins are CommonJS bundles. Execute `main.js` via
   `new Function('module','exports','require', code)`. `require('obsidian')` returns
   our shim; node-builtins return guarded stubs that trip the classifier.
3. **The `obsidian` API shim** — the bulk of the work; hundreds of exported members.
   Map onto what VaultMind already has:
   - `Vault` / `TFile` / `TFolder` / `TAbstractFile` → our `vault.byPath` + a
     File System Access adapter (`read`, `cachedRead`, `create`, `modify`, `delete`,
     `rename`, `on('modify'|'create'|'delete'|'rename')`, `adapter.*`).
   - `MetadataCache` → reshape our existing frontmatter/wikilink/tag extraction into
     Obsidian's `getFileCache` + `resolvedLinks`/`unresolvedLinks` format. **~70%
     already computed.**
   - `Workspace` / `WorkspaceLeaf` / `ItemView` → a real leaf-container so plugin
     views mount as sidebar panels (new; VaultMind has fixed panes today).
   - UI primitives: `Notice`, `Modal`, `Setting`, `PluginSettingTab`, `Menu`,
     `MenuItem`, `Component`, `Events`, `setIcon`/`addIcon` (Lucide),
     `MarkdownRenderer.render` (we have a renderer).
   - Helpers: `requestUrl` (→ fetch), `moment`, `parseYaml`/`stringifyYaml`
     (**we already have `parseYaml`**), `normalizePath`, `debounce`, `Platform`,
     `htmlToMarkdown`.
   - `HTMLElement.prototype` augmentations (`createEl`, `createDiv`, `empty`,
     `setText`, `addClass`, …) — Obsidian patches the DOM prototype; plugins assume
     it everywhere.
4. **Obsidian base CSS** — ship the CSS variables / class names plugins style
   against, or plugin UI renders broken.
5. **Editor (CodeMirror 6)** — the single biggest lift. Obsidian's editor *is* CM6;
   editor plugins (`registerEditorExtension`, `Editor`, `MarkdownView`) need a real
   CM6 instance. VaultMind uses a textarea today.
6. **Classifier + non-blocking warning** — static scan for red flags **plus** a
   runtime `Proxy` on the shim that records every missing-member access. That
   telemetry auto-generates a live compatibility matrix and powers the per-plugin
   warning — and tells us exactly what to build next.
7. **Sandbox/security** — running untrusted third-party JS in the page breaks
   VaultMind's privacy promise. The clean answer is execution in a Worker/iframe
   with a structured-clone message bridge. Deferred per decision #2, but **design
   for it now** (see below).

## Phased roadmap (decisions baked in)

### Phase A — Build system + module migration
Nothing else can start until the single HTML file is a buildable module tree.
- Stand up **Vite** (fast dev server, ESM, easy CM6/Lezer bundling); output a
  deployable static site.
- Migrate `index.html` (~6k lines) incrementally and **behavior-preservingly**:
  extract CSS → files; carve JS into modules (`vault/`, `graph/`, `rag/`, `ingest/`,
  `bases/`, `editor/`, `ui/`) behind existing function names so each extraction is a
  near no-op diff. Keep the smoke/engine tests green at every step.
- Retire the "one file / ~69 KB" README pitch; new positioning ≈ "local-first
  Obsidian-compatible workspace." (Decide the new tagline early.)
- **Pilot migration:** extract the Bases + YAML modules first (already self-contained
  from the previous session) to prove the build + test loop before touching the
  riskier graph/editor code.

### Phase B — CodeMirror 6 editor
The long pole; do it before plugins. Independently a user win (real editor vs textarea).
- Replace the textarea editor with CM6 + markdown language; Obsidian-ish theme using
  our palette.
- Build the Obsidian `Editor` / `MarkdownView` wrapper over `EditorView` — the API
  plugins call: `getValue`, `replaceRange`, `getCursor`, `setSelection`, `getLine`,
  transactions. This wrapper is the seam editor plugins plug into.

### Phase C — Plugin runtime core (in-page)
- Loader (manifests, main.js, styles.css, data.json, community-plugins.json); stop
  skipping `.obsidian`.
- CJS execution **directly in the page**; `require('obsidian')` → shim;
  node-builtins → guarded stubs.
- `Plugin` base + `App`/`Vault`/`TFile`/`TFolder`/`MetadataCache` (read), `Notice`,
  `loadData`/`saveData`, DOM-prototype polyfills, Obsidian base CSS variables.
- **Gap-tracker Proxy** on the shim from line one → compatibility matrix + per-plugin
  non-blocking warning (yellow = partial/desktop-only, red = static node-builtin use).
- **Honest disclosure:** in-page execution gives plugins full page access. Ship a
  one-time consent + per-plugin "runs with full access to this page" notice so users
  are not misled during the harden-later window.

### Phase D — Editor extension surface  ← **editor-parity milestone**
With CM6 in place: `registerEditorExtension` (pass CM6 extensions straight through),
editor commands, `registerMarkdownPostProcessor` /
`registerMarkdownCodeBlockProcessor`. Templater/Tasks-class plugins start loading.

### Phase E — Workspace & views
`WorkspaceLeaf`/`ItemView`/`registerView` (plugin panels mount as sidebar leaves),
`PluginSettingTab`/`Setting`, `Menu`. Unlocks Dataview-render, Calendar, Kanban-class.

### Phase F — Compatibility hardening
`requestUrl`, `moment`, file-event wiring, enable/disable UI mirroring
`community-plugins.json`, productized warnings + public compatibility matrix.

### Phase G — Sandbox (deferred)
Move execution to Worker/iframe + message bridge when ready.

## Design-for-sandbox now (so Phase G isn't a rewrite)

- Route **all** plugin → app calls through a single shim object (no direct globals),
  so it can later become a `postMessage` bridge.
- Keep the `obsidian` shim a **thin adapter over VaultMind's own internal API**, not
  the reverse.

## Hard, schedule-dominating problems

1. **CM6 editor parity** (Phase B/D).
2. **Security / sandbox model** (Phase G; mitigated near-term by disclosure).

Everything else is surface-area grind that the gap-tracker Proxy makes tractable —
the loaded plugins tell us what to build next.

## Concrete next step (resume here)

Start **Phase A**: introduce Vite, move CSS out, and extract the **Bases + YAML**
modules (self-contained) as the pilot migration — proving the build + test loop
before touching graph/editor code. Each extraction is a behavior-preserving diff
with existing tests passing.

Open decisions to confirm at resume:
- New product tagline / README positioning once single-file is dropped.
- Vite vs alternative bundler (Vite is the current recommendation).
- First 2–3 "hero" plugins to target as the editor-parity proof (suggest one
  trivial status-bar plugin + Templater + Tasks).
