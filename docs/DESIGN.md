# Design

The look and feel is calm, typographic and native to macOS, inspired by Bear,
iA Writer and Apple's own apps. When adding UI, reuse what's here rather than
inventing new styles.

## Principles

- **The document is the hero.** Chrome is quiet: translucent bars, hairline
  separators, icon buttons that only show a background on hover.
- **One accent colour** (iris, `--accent`) for the primary action, links, selection,
  focus rings and checked boxes. Everything else is neutral grey.
- **Native feel on the Mac:** system font (SF Pro), window buttons inside the toolbar,
  the whole toolbar drags the window, keyboard shortcuts shown as ⌘ keys.
- **Light and dark** follow the system setting. Printing is always light.
- **Motion is brief** (≤ 280 ms) and switched off with "Reduce motion".

## Where things live

| File                        | Contents                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/app/src/styles.css`   | Design tokens (colours, radii, shadows, sizes) and the app frame: toolbar, segmented control, buttons, menu, status bar, welcome screen, notices, toasts, print rules |
| `apps/app/src/markdown.css` | Document typography, code highlighting colours, print typography                                                                                                      |
| `apps/app/src/ui/`          | Toolbar, ⋯ menu, welcome screen, status bar, toast, icon set                                                                                                          |

## Tokens

Use the CSS variables in `styles.css` (`--text`, `--text-2`, `--text-3`, `--hairline`,
`--fill`, `--surface`, `--accent`, `--radius-*`, `--shadow-*`, …). Each has a dark-mode
value, so components built from tokens get dark mode for free. Avoid hard-coded colours
outside the token blocks and the syntax-highlighting palette.
