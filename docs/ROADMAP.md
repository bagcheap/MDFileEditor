# Roadmap

Each phase ends with: all checks green, a security review (SECURITY.md §4), and a
working build on web and macOS.

## Phase 0 — Foundation

- [x] pnpm monorepo, TypeScript strict, ESLint, Prettier, Vitest
- [x] Supply-chain guards (release-age delay, script allowlist, exact versions)
- [x] CI: lint, type-check, tests, `pnpm audit`, Rust audit; weekly scheduled run
- [x] `packages/platform`: file adapter for web (File System Access API + fallback) and desktop (Tauri)
- [x] Tauri 2 shell with least-privilege commands: open, save (atomic), save as
- [x] Minimal app: open a `.md` file, show its raw text, save it back

## Phase 1 — Viewer + PDF

- [ ] remark/rehype rendering with CommonMark + GFM (tables, task lists, strikethrough, autolinks)
- [ ] Syntax highlighting for code blocks
- [ ] Sanitization, CSP, remote-image blocking
- [ ] Links open in the system browser; the app window never navigates away
- [ ] Light/dark theme, readable typography
- [ ] PDF export (print stylesheet + native print)

## Phase 2 — Editing

- [ ] remark ↔ ProseMirror mapping in `core`, with raw-node fallback
- [ ] Content-preservation corpus + property tests + runtime save guard
- [ ] Yjs document as source of truth
- [ ] TipTap rich view, CodeMirror code view, tabbed toggle
- [ ] Unsaved-changes tracking, ⌘S, external-change detection and merge
- [ ] Rolling backups

## Phase 3 — More Markdown

- [ ] YAML frontmatter, footnotes, callouts/admonitions

## Phase 4 — Agent access

- [ ] Finalize transport (ARCHITECTURE.md §7)
- [ ] Command API hardened for external callers
- [ ] MCP server (`packages/agent-bridge`) as a Yjs peer
- [ ] Agent indicator, attribution highlights, per-agent undo

## Phase 5 — Polish and extras

- [ ] Split (side-by-side) view
- [ ] Math (KaTeX), Mermaid, sanitized embedded HTML
- [ ] Image paste/drop to `assets/`
- [ ] More exports: HTML, DOCX, plain text
- [ ] Outline sidebar, find/replace

## Later

- Multiple files / folders, wiki-links
- Cloud sources (GitHub, Google Drive)
- Installable web app (PWA)
