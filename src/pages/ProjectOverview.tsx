import { ArrowRight, ChevronLeft, Pencil, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { backend } from '../lib/backend'
import { REFERENCES } from '../lib/inspiration'
import { resumeStep, stepPath } from '../lib/steps'
import { useProject } from '../components/ProjectShell'
import { ConfirmDialog, fmtDate, Notice, StatusPill, StoredImage, useTitle } from '../components/ui'

export default function ProjectOverview() {
  const { project, concepts, update } = useProject()
  useTitle(project.name)
  const nav = useNavigate()
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(project.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const current = concepts.find((c) => c.id === project.currentConceptId)
  const votes = Object.entries(project.inspiration)
  const next = resumeStep(project)

  async function rename(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    try {
      await update({ name: n.slice(0, 80) })
      setRenaming(false)
    } catch {
      setError('We couldn’t rename the project. Please try again.')
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await backend.deleteProject(project.id)
      nav('/app', { replace: true, state: { toast: `“${project.name}” was deleted` } })
    } catch {
      setError('We couldn’t delete the project. Please try again.')
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="wrap page">
      <Link to="/app" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><ChevronLeft aria-hidden="true" /> All projects</Link>
      {error && <div style={{ marginBottom: 16 }}><Notice tone="error">{error}</Notice></div>}
      <div className="row between" style={{ alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <span className="eyebrow">{project.roomType}</span>
          {renaming ? (
            <form onSubmit={rename} className="row">
              <label htmlFor="rename" className="visually-hidden">Project name</label>
              <input id="rename" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus style={{ maxWidth: 320 }} />
              <button className="btn btn-primary btn-sm" type="submit">Save</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setRenaming(false); setName(project.name) }}>Cancel</button>
            </form>
          ) : (
            <h1 style={{ marginBottom: 6 }}>{project.name}</h1>
          )}
          <div className="row small muted">
            <StatusPill status={project.status} /> Updated {fmtDate(project.updatedAt)}
          </div>
        </div>
        <div className="row">
          <Link className="btn btn-primary" to={stepPath(project.id, next)}>Resume <ArrowRight aria-hidden="true" /></Link>
          {!renaming && <button className="btn btn-secondary" onClick={() => setRenaming(true)}><Pencil aria-hidden="true" /> Rename</button>}
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}><Trash2 aria-hidden="true" /> Delete</button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <section aria-labelledby="orig">
          <h2 id="orig" style={{ fontSize: '1.2rem' }}>Original photo</h2>
          {project.photoPath ? (
            <div className="frame"><StoredImage path={project.photoPath} alt={`Original photo of the ${project.roomType.toLowerCase()}`} /></div>
          ) : (
            <div className="empty"><p className="muted" style={{ margin: 0 }}>No photo yet.</p><Link className="btn btn-secondary btn-sm" to={stepPath(project.id, 'photo')}>Add a photo</Link></div>
          )}
        </section>
        <section aria-labelledby="cur">
          <h2 id="cur" style={{ fontSize: '1.2rem' }}>Current concept</h2>
          {current ? (
            <Link to={stepPath(project.id, 'result')} className="frame" style={{ display: 'block' }} aria-label={`Open concept version ${current.version}`}>
              <StoredImage path={current.imagePath} alt="" />
              <span className="tag">v{current.version}{current.source === 'demo' ? ' · demo' : ''}</span>
            </Link>
          ) : (
            <div className="empty"><p className="muted" style={{ margin: 0 }}>No concept yet.</p><Link className="btn btn-secondary btn-sm" to={stepPath(project.id, next)}>Continue</Link></div>
          )}
        </section>
      </div>

      <div className="split" style={{ marginTop: 32 }}>
        <section className="panel" aria-labelledby="brief-h">
          <div className="row between">
            <h2 id="brief-h" style={{ fontSize: '1.2rem', margin: 0 }}>Approved brief</h2>
            {project.conversationDone && <Link className="small" to={stepPath(project.id, 'brief')}>Edit</Link>}
          </div>
          {project.approvedBrief ? (
            <>
              <p className="brief-text" style={{ fontSize: '1.05rem', marginTop: 12 }}>{project.approvedBrief.summary}</p>
              <p className="small muted" style={{ margin: 0 }}>Version {project.approvedBrief.version} · approved {fmtDate(project.approvedBrief.approvedAt)}</p>
            </>
          ) : (
            <p className="muted" style={{ marginTop: 12 }}>Not approved yet.</p>
          )}
        </section>
        <section className="panel tint" aria-labelledby="insp-h">
          <h2 id="insp-h" style={{ fontSize: '1.2rem' }}>Inspiration feedback</h2>
          {votes.length ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="stack">
              {votes.map(([id, v]) => (
                <li key={id} className="row" style={{ gap: 8 }}>
                  {v === 'like' ? <ThumbsUp size={16} aria-label="Liked" /> : <ThumbsDown size={16} aria-label="Passed" />}
                  {REFERENCES.find((r) => r.id === id)?.title ?? id}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>No likes or passes yet.</p>
          )}
        </section>
      </div>

      {concepts.length > 0 && (
        <section aria-labelledby="hist" style={{ marginTop: 32 }}>
          <h2 id="hist" style={{ fontSize: '1.2rem' }}>Version history</h2>
          <div className="cards">
            {concepts.map((c) => (
              <Link key={c.id} to={stepPath(project.id, 'result')} className="pcard">
                <div className="thumb"><StoredImage path={c.imagePath} alt="" /></div>
                <div className="body">
                  <span className="title">Version {c.version}{c.saved ? ' · saved' : ''}</span>
                  <span className="small muted">{c.refinement ? `“${c.refinement}”` : 'First concept'} · {fmtDate(c.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${project.name}”?`}
        body="This permanently deletes the room photo, conversation, brief and every concept version. This can’t be undone."
        confirmLabel="Delete project"
        danger
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
