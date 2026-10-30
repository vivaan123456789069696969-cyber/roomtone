import { ArrowRight, Lock, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { backend } from '../lib/backend'
import { ACCEPTED_TYPES, PhotoError, preparePhoto } from '../lib/image'
import { stepPath } from '../lib/steps'
import { StepFrame, useProject } from '../components/ProjectShell'
import { ConfirmDialog, Notice, StoredImage, useTitle } from '../components/ui'

export default function PhotoStep() {
  const { project, setProject } = useProject()
  useTitle(`Photo · ${project.name}`)
  const nav = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [confirmRemove, setConfirmRemove] = useState(false)

  async function handle(file: File | undefined) {
    if (!file) return
    setError(null)
    setWarnings([])
    setBusy(true)
    try {
      const prepared = await preparePhoto(file)
      const next = await backend.uploadPhoto(project.id, prepared.blob)
      setProject(next)
      setWarnings(prepared.warnings)
    } catch (e) {
      setError(e instanceof PhotoError ? e.message : (e as Error).message || 'The upload didn’t finish. Please try again.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDrag(false)
    handle(e.dataTransfer.files[0])
  }

  async function remove() {
    setBusy(true)
    try {
      setProject(await backend.removePhoto(project.id))
      setWarnings([])
    } catch {
      setError('We couldn’t remove the photo. Please try again.')
    } finally {
      setBusy(false)
      setConfirmRemove(false)
    }
  }

  const picker = (
    <input
      ref={input}
      type="file"
      accept={ACCEPTED_TYPES.join(',')}
      className="visually-hidden"
      id="photo-input"
      onChange={(e) => handle(e.target.files?.[0])}
      tabIndex={-1}
    />
  )

  return (
    <StepFrame step="photo">
      <div className="split">
        <div>
          <h1>Show us the room</h1>
          <p className="lede">One photo is enough. Stand in a corner or doorway so we can see as much of the room as possible.</p>

          {error && <div style={{ margin: '16px 0' }}><Notice tone="error">{error}</Notice></div>}

          {project.photoPath ? (
            <div className="stack">
              <div className="frame">
                <StoredImage path={project.photoPath} alt={`Your uploaded photo of the ${project.roomType.toLowerCase()}`} />
                <span className="tag">Your photo</span>
              </div>
              {warnings.map((w) => <Notice key={w}>{w} You can keep it or <button className="linkbtn" onClick={() => input.current?.click()}>choose another</button>.</Notice>)}
              <div className="row">
                <button className="btn btn-primary btn-lg" onClick={() => nav(stepPath(project.id, 'chat'))} disabled={busy}>
                  Use this photo <ArrowRight aria-hidden="true" />
                </button>
                <button className="btn btn-secondary" onClick={() => input.current?.click()} disabled={busy}>
                  <RefreshCw aria-hidden="true" /> {busy ? 'Uploading…' : 'Replace'}
                </button>
                <button className="btn btn-ghost" onClick={() => setConfirmRemove(true)} disabled={busy}>
                  <Trash2 aria-hidden="true" /> Remove
                </button>
              </div>
              {picker}
            </div>
          ) : (
            <div
              className={`dropzone ${drag ? 'drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              aria-busy={busy}
            >
              <Upload className="big" aria-hidden="true" />
              <strong>{busy ? 'Preparing your photo…' : 'Drop a photo here, or choose one'}</strong>
              <span className="small muted">JPG, PNG or WebP, up to 15 MB</span>
              <button className="btn btn-primary" onClick={() => input.current?.click()} disabled={busy}>
                {busy ? 'Uploading…' : 'Choose a photo'}
              </button>
              {picker}
              <p className="small muted row" style={{ gap: 6, justifyContent: 'center', margin: 0 }}>
                <Lock size={14} aria-hidden="true" /> Private to your account. We remove location data before saving.
              </p>
            </div>
          )}
        </div>

        <aside className="panel tint" aria-labelledby="tips">
          <h2 id="tips" style={{ fontSize: '1.3rem' }}>For the best concept</h2>
          <ul style={{ paddingLeft: 18, margin: 0 }} className="stack">
            <li><strong>Daylight, lights on.</strong> Open curtains and switch on lamps.</li>
            <li><strong>Wide and level.</strong> Hold the phone upright at chest height, landscape if you can.</li>
            <li><strong>Show the whole room.</strong> Include windows, doors and floor — they help the concept keep the layout.</li>
            <li><strong>No people or personal documents</strong> in the frame.</li>
          </ul>
        </aside>
      </div>
      <ConfirmDialog
        open={confirmRemove}
        title="Remove this photo?"
        body="The photo will be deleted from your project. Your conversation answers are kept."
        confirmLabel="Remove photo"
        danger
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmRemove(false)}
      />
    </StepFrame>
  )
}
