# Security Policy

"Safe to use" is a core requirement of this project, on the same level as features.
This file is the policy; contributors (human or AI) must follow it.

## 1. Dependency policy

Every dependency is attack surface. Before adding one, it must meet **all** of:

- **Established:** widely used (as a rule of thumb, >100k weekly npm downloads or
  a well-known crate), with a multi-year track record.
- **Maintained:** releases or commits in the last 12 months; security issues answered.
- **Reputable owner:** an organization or long-standing maintainer(s).
- **Permissive license:** MIT, Apache-2.0, BSD, ISC (checked by `cargo deny` / CI).
- **Necessary:** we don't add a library for something a few lines of our own code
  does safely. Prefer packages with few transitive dependencies.
- **No install scripts** unless explicitly allowlisted in `pnpm-workspace.yaml`
  (`onlyBuiltDependencies`) with a reason.

New runtime dependencies are recorded in [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md)
with the reason they're needed.

### Supply-chain guards (configured in the repo)

| Guard                                                                                                                               | Where                                          |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Lockfiles committed; CI installs with `--frozen-lockfile`                                                                           | `pnpm-lock.yaml`, `Cargo.lock`                 |
| Exact versions only (no `^` ranges)                                                                                                 | `.npmrc` `save-exact=true`                     |
| New package versions must be ≥ 7 days old before pnpm will install them (most malicious releases are caught and pulled within days) | `pnpm-workspace.yaml` `minimumReleaseAge`      |
| Dependency install scripts blocked except an explicit allowlist                                                                     | `pnpm-workspace.yaml` `onlyBuiltDependencies`  |
| Block installs where a package's trust evidence got weaker than in earlier versions                                                 | `pnpm-workspace.yaml` `trustPolicy`            |
| Known-vulnerability audit of npm and Rust deps on every push and weekly                                                             | CI: `pnpm audit`, `cargo audit` / `cargo deny` |
| GitHub Actions pinned to full commit SHAs; workflows use least-privilege `permissions`                                              | `.github/workflows/`                           |
| Automated update PRs with a cooldown period                                                                                         | `.github/dependabot.yml`                       |

## 2. Application hardening

- **Sanitize everything rendered.** Markdown → HTML always passes through an allowlist
  sanitizer. No `javascript:`/`data:` URLs in links. No `dangerouslySetInnerHTML`
  on unsanitized input.
- **Strict Content Security Policy** in the desktop app and web build: no remote
  scripts, no `eval`, no inline scripts.
- **Least-privilege native access (Tauri).** The web code cannot touch the file
  system directly. Only a few custom Rust commands are exposed, and they only
  read/write files the user picked in a native dialog this session. No `shell`
  plugin, no general `fs` plugin.
- **No network by default.** No telemetry. Remote images are blocked unless enabled
  per document. Links open in the system browser.
- **Rendering plugins in safe modes:** Mermaid `securityLevel: 'strict'`, KaTeX
  `trust: false`.
- **Agent access** (Phase 4) is off by default, local-only, token-authenticated,
  limited to the open document, attributed, and undoable. See ARCHITECTURE.md §7.

## 3. Data safety

- Atomic saves (temp file + rename); rolling backups before overwrite.
- Content-preservation guard: a save is refused if re-parsing the output would lose
  content (ARCHITECTURE.md §4).

## 4. Ongoing checks

- CI on every push: lint, type-check, tests, dependency audit.
- Weekly scheduled audit run, so newly disclosed vulnerabilities in existing deps surface.
- **At the end of every phase:** a security review of the changes since the last
  phase (`/security-review` in Claude Code), with findings fixed or recorded here.

## 5. Review log

| Date       | Scope                                                                            | Result                                                                                                                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-11-22 | Phase 0 (manual review: native commands, path allowlist, CSP, file decoding, CI) | No issues found. `pnpm audit` and `cargo deny` clean (one dev-only advisory in `minimatch` fixed via override). Carry-over for Phase 1: rendered links must open in the system browser and must never navigate the app window. |
