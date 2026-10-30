import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { backend } from '../lib/backend'
import { STATUS_LABEL, type ProjectStatus } from '../lib/types'

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Roomtone` : 'Roomtone — room makeover concepts, guided'
  }, [title])
}

export function Notice({ tone = 'info', children, role }: { tone?: 'info' | 'error' | 'success'; children: ReactNode; role?: 'alert' | 'status' }) {
  const Icon = tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : Info
  return (
    <div className={`notice ${tone === 'info' ? '' : tone}`} role={role ?? (tone === 'error' ? 'alert' : undefined)}>
      <Icon aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

export function Dots() {
  return (
    <span className="dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}

export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loader" role="status">
      <Dots />
      <span>{label}…</span>
    </div>
  )
}

export function StatusPill({ status }: { status: ProjectStatus }) {
  return <span className={`status s-${status}`}>{STATUS_LABEL[status]}</span>
}

/** Shows a private stored image via a short-lived URL. */
export function StoredImage({ path, alt, className }: { path: string | null; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    setSrc(null)
    setFailed(false)
    if (!path) return
    backend
      .imageUrl(path)
      .then((u) => alive && setSrc(u))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [path])
  if (!path) return null
  if (failed) return <div className="small muted" style={{ padding: 16 }}>Image unavailable</div>
  if (!src) return <div style={{ aspectRatio: '4 / 3' }} aria-hidden="true" />
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />
}

/* Toasts ------------------------------------------------------------------ */
const ToastCtx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((m: string) => {
    setMsg(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 4000)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="visually-hidden">{msg}</div>
      {msg && (
        <div className="toast" aria-hidden="true">
          <CheckCircle2 size={18} />
          <span>{msg}</span>
          <button className="btn-ghost btn btn-sm" style={{ color: 'inherit', minHeight: 28 }} onClick={() => setMsg(null)} aria-label="Dismiss" tabIndex={-1}>
            <X />
          </button>
        </div>
      )}
    </ToastCtx.Provider>
  )
}

/* Confirm dialog ------------------------------------------------------------ */
export function ConfirmDialog(props: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (props.open && !d.open) d.showModal()
    if (!props.open && d.open) d.close()
  }, [props.open])
  return (
    <dialog ref={ref} className="modal" onCancel={(e) => { e.preventDefault(); props.onCancel() }} aria-labelledby="confirm-title">
      <h3 id="confirm-title">{props.title}</h3>
      <div className="muted">{props.body}</div>
      <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={props.onCancel} disabled={props.busy}>Cancel</button>
        <button className={`btn ${props.danger ? 'btn-danger' : 'btn-primary'}`} onClick={props.onConfirm} disabled={props.busy}>
          {props.busy ? 'Working…' : props.confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
