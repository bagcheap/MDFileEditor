# Working on MD File Editor

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [SECURITY.md](SECURITY.md) first.
The owner's top priorities: **safe to use** and **never lose document content**.

## Rules

- **Dependencies:** follow SECURITY.md §1. Don't add a package without meeting every
  criterion and recording it in docs/DEPENDENCIES.md. Never weaken the guards in
  `pnpm-workspace.yaml` (`minimumReleaseAge`, `strictDepBuilds`, `trustPolicy`) or `.npmrc`.
- **Layering:** `packages/core` (when created) has no DOM/React/platform imports. All
  document changes go through core's command API.
- **Native surface:** the desktop app exposes only the commands in
  `apps/app/src-tauri/src/documents.rs`, each explicitly granted in
  `capabilities/default.json`. Don't add Tauri plugins with file-system or shell access.
- **Rendering:** all Markdown-derived HTML is sanitized. No `dangerouslySetInnerHTML` on
  unsanitized input, no `eval`, no inline scripts (CSP forbids them).
- **Content preservation:** never decode files lossily; never write non-atomically.
- **Decisions:** architecture changes update docs/ARCHITECTURE.md and its decision log.

## Branches

`main` holds only reviewed, working code. All work happens on a branch named for
what it does, and is merged into `main` once the owner has tried it and approved:

| Prefix     | Use                                 | Examples                                                  |
| ---------- | ----------------------------------- | --------------------------------------------------------- |
| `feature/` | A roadmap phase or a new capability | `feature/phase-2-editing`, `feature/local-images`         |
| `fix/`     | A bug fix                           | `fix/pdf-page-margins`                                    |
| `chore/`   | Tooling, dependencies, CI           | `chore/branch-workflow`, `chore/update-typescript-eslint` |
| `docs/`    | Documentation only                  | `docs/install-guide`                                      |

Names are lowercase, words joined with hyphens. Start each branch from the latest
`main`. Don't push to `main` directly; merge a reviewed branch instead. CI runs on
every branch, and a branch is only merged when CI is green.

## Before committing

```bash
pnpm check && pnpm audit
(cd apps/app/src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test && cargo deny check)
```

At the end of each roadmap phase, run a security review and log it in SECURITY.md §5.
