import { useEffect, useId, useRef, useState } from 'react'
import { MoreIcon } from './icons'

export interface MenuItem {
  label: string
  shortcut?: string
  onSelect: () => void
}

/** A small pop-up menu behind a "⋯" button. Closes on Escape, outside click or selection. */
export function MoreMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    // Focus the first item so the menu is keyboard-usable straight away.
    rootRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="menu-root" ref={rootRef}>
      <button
        type="button"
        className="icon-button"
        aria-label="More"
        title="More"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen((o) => !o)
        }}
      >
        <MoreIcon />
      </button>
      {open && (
        <div className="menu" role="menu" id={menuId}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              <span>{item.label}</span>
              {item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
