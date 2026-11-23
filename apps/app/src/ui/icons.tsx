import type { ReactNode, SVGProps } from 'react'

/** Small stroke icon set (24×24 grid), drawn to match SF Symbols' weight. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const FolderIcon = () => (
  <Icon>
    <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2h8A1.5 1.5 0 0 1 20.5 9v8.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" />
  </Icon>
)

export const SaveIcon = () => (
  <Icon>
    <path d="M12 4v10m0 0-4-4m4 4 4-4" />
    <path d="M4.5 14.5v3A1.5 1.5 0 0 0 6 19h12a1.5 1.5 0 0 0 1.5-1.5v-3" />
  </Icon>
)

export const ExportIcon = () => (
  <Icon>
    <path d="M12 15V4m0 0L8 8m4-4 4 4" />
    <path d="M8.5 11H7a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 17 11h-1.5" />
  </Icon>
)

export const MoreIcon = () => (
  <Icon fill="currentColor" stroke="none">
    <circle cx="6" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="18" cy="12" r="1.6" />
  </Icon>
)

export const DocumentIcon = () => (
  <Icon width="16" height="16">
    <path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z" />
    <path d="M13.5 3.5v5h5M9 13h6M9 16.5h4" />
  </Icon>
)

export const ImageIcon = () => (
  <Icon>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="m20.5 15-4.5-4.5L6 19" />
  </Icon>
)

export const AlertIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v5.5M12 16.5v.01" />
  </Icon>
)

export const CloseIcon = () => (
  <Icon width="14" height="14">
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const PlusIcon = () => (
  <Icon width="16" height="16">
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

/** The app mark: a page with a Markdown "M↓". */
export const AppMark = () => (
  <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="app-mark-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7b7bf0" />
        <stop offset="1" stopColor="#4b4bc4" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#app-mark-bg)" />
    <path
      d="M15 43V21h5.5l6 8 6-8H38v22h-5.5V30.5l-6 7.8-6-7.8V43z"
      fill="#fff"
      fillOpacity="0.96"
    />
    <path d="M43 21h5v12h5l-7.5 10L38 33h5z" fill="#fff" fillOpacity="0.75" />
  </svg>
)
