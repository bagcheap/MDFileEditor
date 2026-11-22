# MD File Editor — Architecture

Status: **agreed baseline** (Phase 0). Decisions here are changed by editing this
file in a reviewed commit, with the reason recorded in the Decision Log at the end.

## 1. Requirements (from the owner)

| #   | Requirement                                                      | Notes                                                                                                                               |
| --- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Runs on macOS (several MacBooks) and in the browser              | Single user. Mac builds are compiled and installed locally; no App Store, no notarization.                                          |
| R2  | Open local Markdown files and render them with proper formatting | One file at a time for now; folders/workspaces later. Cloud sources (GitHub, Google Drive) later.                                   |
| R3  | WYSIWYG editing                                                  |                                                                                                                                     |
| R4  | Toggle between rich-text view and code view                      | Tabbed toggle first, side-by-side split later.                                                                                      |
| R5  | Agents can add, edit and update documents                        | Via an API / MCP server, as live **shared editing** (agent and owner can edit the same document at the same time).                  |
| R6  | Export to several formats                                        | PDF first.                                                                                                                          |
| R7  | **Safe to use**                                                  | Robust, regularly checked for vulnerabilities, built only on established, well-vetted libraries. See [SECURITY.md](../SECURITY.md). |
| R8  | **Never lose content**                                           | Markdown _formatting_ may be normalized (e.g. `*` → `-` bullets), but content must never be deleted and text must never be altered. |

## 2. Stack

| Concern                      | Choice                                                                       | Why                                                                                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language                     | TypeScript (strict) everywhere except the thin native shell                  | One language for UI, core logic, agent bridge and tests.                                                                                                                                                      |
| UI                           | React                                                                        | Largest, most-vetted ecosystem; first-class bindings for the editor libraries below.                                                                                                                          |
| Build                        | Vite                                                                         | Standard, fast; same build serves web and desktop.                                                                                                                                                            |
| Desktop shell                | **Tauri 2** (Rust)                                                           | Small (~10 MB) native app using the system WebView (WKWebView on macOS). Strong security model: the web code can only call native commands we explicitly expose. Can also produce Linux/Windows builds later. |
| Markdown parsing & rendering | **unified / remark / rehype**                                                | The most widely used Markdown toolchain in JS. Plugins for GFM, frontmatter, math, directives (callouts). One parser feeds viewing, editing and export, so they can't disagree.                               |
| Rich-text editor             | **TipTap 3** (on **ProseMirror**)                                            | ProseMirror is the most established structured-editor engine; TipTap adds tables, task lists, React bindings and an official Yjs collaboration extension.                                                     |
| Code view                    | **CodeMirror 6**                                                             | Standard code editor; good Markdown mode. Same author as ProseMirror.                                                                                                                                         |
| Shared editing               | **Yjs** (CRDT)                                                               | De-facto standard for real-time collaborative editing; mature ProseMirror binding. Lets an agent be "just another collaborator".                                                                              |
| HTML sanitizing              | **rehype-sanitize** (+ DOMPurify where raw HTML must reach the DOM)          | Markdown can embed HTML; everything rendered is sanitized against an allowlist.                                                                                                                               |
| Tests                        | Vitest (unit/property), fast-check (property tests), Playwright (end-to-end) |                                                                                                                                                                                                               |
| Package manager              | pnpm (workspaces)                                                            | Blocks dependency install scripts by default and supports a minimum release age; see SECURITY.md.                                                                                                             |

Pinned versions live in `package.json` / `pnpm-lock.yaml` / `Cargo.lock`, not here.
TypeScript is held at 6.0.x until `typescript-eslint` supports 7.x.

## 3. Repository layout

```
apps/
  app/                 React UI shell — the same frontend for web and desktop
    src/
    src-tauri/         Tauri (Rust) desktop shell: windows, native file dialogs, atomic file I/O
packages/
  core/                Headless: Markdown <-> document model, content-preservation checks,
                       command API. No DOM, no React. Runs in browser, Node and tests.
  platform/            FileSystem adapter interface + web and Tauri implementations
  editor/      (Ph 2)  TipTap rich view + CodeMirror code view, bound to the shared doc
  export/      (Ph 1)  Exporters (PDF first), each a small plugin over core's output
  agent-bridge/(Ph 4)  MCP server that joins a document as a Yjs peer and calls the command API
docs/                  Architecture, roadmap, decisions
```

Rule: **`packages/core` must never import UI or platform code.** Everything that
changes a document goes through core's command API, whether it comes from the
keyboard, a code-view edit, a file reload or an agent.

## 4. Document model and data flow

```
            ┌───────────── .md file on disk (durable format) ─────────────┐
            │ open: parse                                    save: serialize│
            ▼                                                              │
   Markdown ──remark──▶ mdast ──map──▶ ProseMirror doc ──▶ Y.Doc (Y.XmlFragment)  ◀── single source of truth
                                                            │       │        │      while a file is open
                                         TipTap rich view ◀─┘       │        └─▶ Agent (Yjs peer, Phase 4)
                                   CodeMirror code view ◀── serialize┘
                                   (edits re-parsed and applied back as a minimal diff)
```

- **One source of truth while editing:** a Yjs document holding the ProseMirror
  structure. The `.md` file is the durable format; Yjs state is in-memory
  (optionally snapshotted to app data for crash recovery).
- **Rich view** binds directly to the Yjs document (TipTap Collaboration extension).
- **Code view** shows the serialized Markdown. Edits there are debounced, parsed,
  and applied back to the Yjs document as a minimal diff, so concurrent agent
  edits merge instead of being overwritten. Remote changes arriving while the code
  view is open are applied to CodeMirror as a minimal text diff, preserving the cursor.
- **External file changes** (another tool, `git checkout`) are detected by a file
  watcher, parsed, and merged into the Yjs document the same way (origin `disk`).
  If there are unsaved local edits the user is asked first.
- **Every change carries an origin** (`user`, `code-view`, `disk`, `agent:<name>`),
  which drives per-origin undo ("undo everything the agent did") and highlighting.

### Content preservation (R8)

Formatting may normalize; content may not be lost. Enforced in four layers:

1. **No silent drops in the mapping.** Any Markdown construct the editor schema does
   not model yet (e.g. math before it is supported, unknown HTML, directives) becomes
   a _raw block/inline_ node that stores the original source verbatim and is written
   back unchanged.
2. **Round-trip test corpus.** CommonMark and GFM spec examples plus our own fixtures:
   `parse → model → serialize → parse` must yield the same content (text, links,
   images, code, structure) — compared on a normalized tree, not on bytes.
3. **Property tests** (fast-check) generate random documents and assert the same.
4. **Runtime guard.** Before every save, core re-parses the output and compares its
   content fingerprint with the in-memory document. On mismatch the save is refused,
   the user is warned, and nothing on disk is touched.

### Saving

- Explicit save (⌘S). Autosave may come later, opt-in.
- **Atomic writes:** write to a temp file in the same folder, flush, then rename over
  the original. A crash mid-save can never leave a half-written file.
- Before overwriting, the previous version is copied to a small rolling backup in the
  app's data folder (last N versions per file).

## 5. Platform adapter (`packages/platform`)

One interface, two implementations, selected at startup:

```ts
interface DocumentFileSystem {
  openDocument(): Promise<OpenedDocument | null> // shows a picker
  saveDocument(doc: OpenedDocument, text: string): Promise<void>
  saveDocumentAs(text: string, suggestedName?: string): Promise<OpenedDocument | null>
}
```

- **Desktop (Tauri):** the web code gets **no general file-system access**. It calls
  three custom Rust commands. Rust shows the native dialog, remembers which paths the
  user picked in this session, and only ever reads/writes those paths (atomic write
  in Rust). No Tauri `fs` or `shell` plugin.
- **Web:** File System Access API in Chrome/Edge (true open and save-in-place; the
  browser itself writes atomically). In Safari/Firefox: open via file picker, save
  via download. No server, no accounts. The web build is a static site you can run
  locally or host privately.

## 6. Views

- **Tabbed toggle** (Phase 2): Rich | Code, one at a time, same document.
- **Split view** (later): both side by side, both bound to the same Yjs document.
- Rendering-only features (Mermaid, math) render in the rich view and in export.

## 7. Agent access (R5, Phase 4)

Design principles fixed now; transport finalized at the start of Phase 4.

- **The agent is a collaborator, not a file writer.** An MCP server
  (`packages/agent-bridge`) joins the open document as a Yjs peer and exposes
  high-level tools built on core's command API, e.g. `read_document`,
  `get_outline`, `replace_section`, `insert_after_heading`, `find_and_replace`,
  `set_frontmatter`. Edits appear live in the editor while the owner keeps typing.
- **Safety:** off by default; local machine only (Unix socket or `127.0.0.1` with a
  per-session token and origin checks); scoped to the open document only (no
  general file access); visible "agent connected" indicator; each agent edit is
  attributed and highlighted; one-click undo of an agent's changes; size and rate
  limits on agent operations. A "suggest only" mode (agent edits arrive as
  proposals to accept/reject) can be added on the same foundation.
- **Candidate transports:** (a) the desktop app listens on a Unix domain socket in
  its data folder (permissions 0600) and the stdio MCP server connects to it;
  (b) the MCP server hosts a local WebSocket and both the desktop and web apps
  connect to it as clients (needed for the web version, since browsers cannot
  listen for connections).

## 8. Export (R6)

- **PDF (Phase 1):** render the document through the same remark → rehype →
  sanitized HTML pipeline, apply a dedicated print stylesheet, and use the native
  print path (macOS print dialog → Save as PDF; `window.print()` on web). No extra
  dependencies, good typography, matches what you see.
- **Later:** HTML (self-contained file), DOCX, plain text, possibly slides. Each is a
  plugin in `packages/export` consuming mdast/hast. Pandoc may be considered for the
  desktop app only if a format can't be done well in-process.

## 9. Markdown feature phases

| Phase | Features                                                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | CommonMark basics (headings, paragraphs, emphasis, links, images, lists, blockquotes, code blocks with syntax highlighting, horizontal rules) + GFM tables, task lists, strikethrough, autolinks |
| 3     | YAML frontmatter, footnotes, callouts/admonitions                                                                                                                                                |
| 5     | Math (KaTeX), Mermaid diagrams, embedded HTML (sanitized; editable as raw blocks)                                                                                                                |

Until a feature is supported in the editor, its source is kept verbatim by the
raw-node fallback (section 4), so nothing is lost.

## 10. Images (default, revisit in Phase 5)

Pasted or dropped images are saved to an `assets/` folder next to the document and
linked with a relative path (`![](assets/image-2026-11-22-1.png)`). Never embedded
as base64 by default (it bloats files and breaks diffs). Remote images are not
loaded by default (privacy: they can be used to track when a file is opened);
a per-document "load remote images" switch allows them.

## 11. Decision log

| Date       | Decision                                                            | Reason                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-22 | Tauri 2 + React + TypeScript, one frontend for web and desktop      | R1, R7: small native shell with an explicit command allowlist.                                                                                                        |
| 2026-11-22 | Yjs as the live source of truth from the first editing phase        | R5: owner chose shared editing; retrofitting a CRDT later is costly.                                                                                                  |
| 2026-11-22 | TipTap/ProseMirror + our own remark ↔ ProseMirror mapping in `core` | R8: owning the mapping lets us guarantee and test content preservation; remark also drives rendering and export. Fallback if the mapping proves too costly: Milkdown. |
| 2026-11-22 | PDF via print stylesheet + native print                             | R6: zero extra dependencies, matches on-screen rendering.                                                                                                             |
| 2026-11-22 | TypeScript 6.0.x                                                    | `typescript-eslint` does not yet support TypeScript 7.                                                                                                                |
