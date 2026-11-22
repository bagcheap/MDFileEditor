# Runtime dependencies

Every dependency that ships in the app, and why. Development-only tools (TypeScript,
ESLint, Prettier, Vitest, Testing Library, Vite, Tauri CLI) are not listed; they never
reach users but are still audited in CI.

## JavaScript (shipped in the web build and the desktop app's UI)

| Package              | Why                                                     | Maintainer                  |
| -------------------- | ------------------------------------------------------- | --------------------------- |
| `react`, `react-dom` | UI framework                                            | Meta                        |
| `@tauri-apps/api`    | Calls the desktop app's native commands (unused on web) | Tauri (Commons Conservancy) |

## Rust (desktop shell)

| Crate                  | Why                                              | Maintainer                      |
| ---------------------- | ------------------------------------------------ | ------------------------------- |
| `tauri`, `tauri-build` | Desktop shell, WebView, command bridge           | Tauri                           |
| `tauri-plugin-dialog`  | Native open/save dialogs (called from Rust only) | Tauri                           |
| `serde`                | Serializing command results to the UI            | serde-rs (dtolnay)              |
| `tempfile`             | Temporary file for atomic saves                  | Stebalien / rust-lang ecosystem |
