import { AlertIcon, CloseIcon } from './icons'

/** An error message that stays until dismissed. */
export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="toast" role="alert">
      <span className="toast-icon">
        <AlertIcon />
      </span>
      <span className="toast-message">{message}</span>
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={onDismiss}>
        <CloseIcon />
      </button>
    </div>
  )
}
