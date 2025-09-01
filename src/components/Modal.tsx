import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ open, onClose, children }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const root = document.getElementById('modal-root')
  if (!root) return null
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="min-w-72 max-w-[90vw] rounded-lg bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 p-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    root
  )
}

