import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

type Placement = 'center' | 'right' | 'left'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  placement?: Placement
  footer?: ReactNode
  hideTitle?: boolean
}

const placements: Record<Placement, string> = {
  center: 'm-auto w-[min(36rem,calc(100%-2rem))] max-h-[calc(100dvh-2rem)]',
  right: 'ml-auto mr-0 my-0 h-dvh max-h-dvh w-[min(24rem,100%)]',
  left: 'mr-auto ml-0 my-0 h-dvh max-h-dvh w-[min(22rem,100%)]',
}

/**
 * Modal built on the native <dialog> element: the browser provides focus
 * containment, inert background, Escape to close and focus restoration.
 */
export function Dialog({ open, onClose, title, children, placement = 'center', footer, hideTitle }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={`flex-col overflow-hidden border border-ink bg-paper p-0 text-ink shadow-paper backdrop:bg-ink/55 open:flex ${placements[placement]}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-ink px-5 py-3">
        <h2 id={titleId} className={hideTitle ? 'sr-only' : 'font-display text-lg font-bold'}>
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-sm hover:bg-cream"
          aria-label="Затвори"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer ? <div className="border-t border-ink/20 px-5 py-3">{footer}</div> : null}
    </dialog>
  )
}
