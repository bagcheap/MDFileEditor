# MD File Editor

A Markdown viewer and editor for macOS and the web, with live agent editing on the roadmap.

- **Status:** Phase 1 (viewer + PDF). Opens `.md` files and shows them formatted, edits
  them as plain text (Source tab), saves, and exports to PDF. Try
  [examples/feature-tour.md](examples/feature-tour.md). See [docs/ROADMAP.md](docs/ROADMAP.md).
- **Design:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Design guide:** [docs/DESIGN.md](docs/DESIGN.md)
- **Security policy:** [SECURITY.md](SECURITY.md)

## Prerequisites (on each Mac)

1. Xcode Command Line Tools: `xcode-select --install`
2. Rust: install from <https://rustup.rs>, then add both Mac targets for universal builds:
   `rustup target add aarch64-apple-darwin x86_64-apple-darwin`
3. Node.js 22 or later, then enable pnpm: `corepack enable`

## Common commands

```bash
pnpm install --frozen-lockfile   # install exactly what's in the lockfile
pnpm dev                          # web version at http://localhost:1420
pnpm desktop:dev                  # desktop app with hot reload
pnpm check                        # format, lint, type-check, tests
pnpm audit                        # known-vulnerability check (npm deps)
```

Rust side (from `apps/app/src-tauri`): `cargo test`, `cargo clippy`, `cargo deny check`.

## Building and installing the Mac app

```bash
pnpm desktop:build:universal
```

This produces a universal (Apple silicon + Intel) app and disk image under
`apps/app/src-tauri/target/universal-apple-darwin/release/bundle/` (`macos/` and `dmg/`).
Open the `.dmg` and drag the app to Applications.

The app is ad-hoc signed, not notarized. A build made on the same Mac opens normally.
If you copy the `.dmg` to another Mac (AirDrop, download), macOS will block it the first
time; right-click the app → **Open**, or run
`xattr -dr com.apple.quarantine "/Applications/MD File Editor.app"`.
Building on each Mac avoids this.

## Web version

`pnpm build` writes a static site to `apps/app/dist`. Serve it locally with
`pnpm --filter @mdedit/app preview`. Opening and saving files in place works in Chrome
and Edge; Safari and Firefox can open files and "save" by downloading a copy.
