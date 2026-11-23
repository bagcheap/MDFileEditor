# Feature tour

A sample document for checking what MD File Editor renders. Open it, look at
**Preview**, then try **Export PDF…**

## Contents

- [Text](#text)
- [Lists](#lists)
- [Code](#code)
- [Tables](#tables)
- [Links and images](#links-and-images)
- [Things shown as source for now](#things-shown-as-source-for-now)

## Text

Plain text with _emphasis_, **strong emphasis**, _**both**_, ~~strikethrough~~
and `inline code`. A footnote reference sits here.[^why]

> A blockquote. Useful for callouts until real callouts arrive.
>
> > Nested quotes work too.

---

## Lists

1. First step
2. Second step
   - A nested bullet
   - Another one
3. Third step

### Task list

- [x] Phase 0: foundation
- [x] Phase 1: viewer and PDF
- [ ] Phase 2: editing

## Code

```ts
// TypeScript, highlighted
export function greet(name: string): string {
  return `Hello, ${name}!`
}
```

```python
def fib(n: int) -> int:
    """Return the nth Fibonacci number."""
    return n if n < 2 else fib(n - 1) + fib(n - 2)
```

```bash
pnpm install --frozen-lockfile && pnpm desktop:dev
```

```
A block with no language is shown plain.
```

## Tables

| Feature      | Status  | Phase |
| :----------- | :-----: | ----: |
| Rendering    |  Done   |     1 |
| PDF export   |  Done   |     1 |
| WYSIWYG      | Planned |     2 |
| Agent access | Planned |     4 |

## Links and images

- A web link opens in your browser: <https://commonmark.org>
- An [in-document link](#text) scrolls to that section.
- A [link to another file](other.md) isn't followed yet (hover it).

An image from the internet is blocked until you choose **Load images**:

![CommonMark logo](https://commonmark.org/help/images/favicon.png)

A local image shows a placeholder for now: ![diagram](assets/diagram.png)

## Things shown as source for now

Embedded HTML is shown as code rather than rendered (safe rendering comes later):

<div align="center">Centered with HTML</div>

Press <kbd>⌘</kbd> + <kbd>S</kbd> to save.

[^why]: Footnotes are collected at the end of the document, with links back.
