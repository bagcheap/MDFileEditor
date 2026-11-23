/** Formats a shortcut for display: "⌘O" on Apple platforms, "Ctrl+O" elsewhere. */
export function shortcutLabel(isApple: boolean, key: string, shift = false): string {
  if (isApple) return `${shift ? '⇧' : ''}⌘${key}`
  return `Ctrl+${shift ? 'Shift+' : ''}${key}`
}
