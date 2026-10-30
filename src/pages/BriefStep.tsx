import { ArrowRight, CheckCircle2, MessageCircle, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { backend } from '../lib/backend'
import { briefSummary, composeBrief, sameBrief } from '../lib/brief'
import { QUESTIONS } from '../lib/conversation'
import { stepPath } from '../lib/steps'
import type { BriefData } from '../lib/types'
import { StepFrame, useProject } from '../components/ProjectShell'
import { fmtDate, Notice, useTitle } from '../components/ui'

type ListKey = 'styles' | 'colours' | 'avoidColours' | 'materials' | 'avoidMaterials' | 'keep' | 'explore' | 'practical' | 'goals'

const LIST_FIELDS: { key: ListKey; label: string; hint?: string }[] = [
  { key: 'keep', label: 'Keep as it is', hint: 'We’ll ask the model to preserve these. Walls, windows, doors and the camera angle are always included.' },
  { key: 'explore', label: 'Changes to explore' },
  { key: 'styles', label: 'Style' },
  { key: 'colours', label: 'Colours you love' },
  { key: 'avoidColours', label: 'Colours to avoid' },
  { key: 'materials', label: 'Materials & finishes' },
  { key: 'avoidMaterials', label: 'Materials to avoid' },
  { key: 'practical', label: 'Practical needs' },
  { key: 'goals', label: 'What should improve' },
]

function ListEditor({ id, label, hint, values, onChange }: { id: string; label: string; hint?: string; values: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState('')
  function add(e: FormEvent) {
    e.preventDefault()
    const t = text.trim()
    if (t && !values.includes(t)) onChange([...values, t])
    setText('')
  }
  return (
    <div className="field" style={{ marginTop: 18 }}>
      <span className="label" id={`${id}-l`}>{label}</span>
      {hint && <span className="hint">{hint}</span>}
      <div className="chips" aria-labelledby={`${id}-l`} role="list">
        {values.length === 0 && <span className="small muted">Nothing yet</span>}
        {values.map((v) => (
          <span key={v} className="chip" role="listitem" style={{ cursor: 'default', paddingRight: 6 }}>
            {v}
            <button type="button" className="btn btn-ghost btn-sm" style={{ minHeight: 28, padding: '2px 6px' }} onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v} from ${label}`}>
              <X aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <form className="row" onSubmit={add} style={{ marginTop: 6, flexWrap: 'nowrap' }}>
        <label htmlFor={`${id}-add`} className="visually-hidden">Add to {label}</label>
        <input id={`${id}-add`} className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add…" maxLength={80} style={{ minHeight: 40 }} />
        <button className="btn btn-secondary btn-sm" type="submit" disabled={!text.trim()}><Plus aria-hidden="true" /> Add</button>
      </form>
    </div>
  )
}

export default function BriefStep() {
  const { project, setProject, update } = useProject()
  useTitle(`Brief · ${project.name}`)
  const nav = useNavigate()
  const [brief, setBrief] = useState<BriefData>(() => project.briefDraft ?? composeBrief(project))
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setSaveState('saving')
    const t = setTimeout(() => {
      update({ briefDraft: brief })
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'))
    }, 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief])

  const summary = briefSummary(brief)
  const approved = project.approvedBrief
  const upToDate = approved && sameBrief(approved.data, brief)
  const set = <K extends keyof BriefData>(k: K, v: BriefData[K]) => setBrief((b) => ({ ...b, [k]: v }))

  async function approve() {
    setApproving(true)
    setError(null)
    try {
      const ab = await backend.approveBrief(project.id, brief, summary)
      const p = await backend.getProject(project.id)
      if (p) setProject(p)
      else setProject({ ...project, approvedBrief: ab })
      nav(stepPath(project.id, 'generate'))
    } catch {
      setError('We couldn’t approve the brief just now. Your edits are kept — please try again.')
      setApproving(false)
    }
  }

  return (
    <StepFrame step="brief">
      <div className="split">
        <div>
          <span className="eyebrow">Your design brief</span>
          <h1>Here’s what I understood</h1>
          <p className="lede">Check this reads like you. Edit anything below, then approve it — the concept is created from exactly this version.</p>

          <div className="panel" style={{ marginTop: 20 }}>
            <p className="brief-text" style={{ margin: 0 }} aria-live="polite">{summary}</p>
          </div>

          {error && <div style={{ marginTop: 16 }}><Notice tone="error">{error}</Notice></div>}
          {approved && !upToDate && (
            <div style={{ marginTop: 16 }}>
              <Notice>You’ve changed the brief since approving version {approved.version}. Approve again to use these changes in new concepts.</Notice>
            </div>
          )}

          <div className="row" style={{ marginTop: 20 }}>
            {upToDate ? (
              <>
                <span className="status s-saved"><CheckCircle2 size={14} aria-hidden="true" /> Approved · version {approved.version}, {fmtDate(approved.approvedAt)}</span>
                <button className="btn btn-primary btn-lg" onClick={() => nav(stepPath(project.id, project.currentConceptId ? 'result' : 'generate'))}>
                  {project.currentConceptId ? 'Back to my concept' : 'Create my concept'} <ArrowRight aria-hidden="true" />
                </button>
              </>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={approve} disabled={approving}>
                {approving ? 'Approving…' : 'Approve brief'} <ArrowRight aria-hidden="true" />
              </button>
            )}
            <Link className="btn btn-ghost" to={stepPath(project.id, 'chat')}><MessageCircle aria-hidden="true" /> Revisit answers</Link>
          </div>
          <p className="small muted" style={{ marginTop: 8 }} aria-live="polite">
            {saveState === 'saving' ? 'Saving draft…' : saveState === 'saved' ? 'Draft saved.' : saveState === 'error' ? 'Couldn’t save the draft — it will retry on your next edit.' : ''}
          </p>
        </div>

        <section className="panel" aria-labelledby="edit-brief">
          <h2 id="edit-brief" style={{ fontSize: '1.3rem' }}>Edit the details</h2>
          {LIST_FIELDS.map((f) => (
            <ListEditor key={f.key} id={`bf-${f.key}`} label={f.label} hint={f.hint} values={brief[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: 18 }}>
            <div className="field">
              <label htmlFor="bf-scale">Scale of change</label>
              <select id="bf-scale" className="select" value={brief.scale} onChange={(e) => set('scale', e.target.value)}>
                <option value="">Not sure</option>
                {QUESTIONS.find((q) => q.id === 'scale')!.options({}, '').map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginTop: 0 }}>
              <label htmlFor="bf-budget">Budget</label>
              <select id="bf-budget" className="select" value={brief.budget} onChange={(e) => set('budget', e.target.value)}>
                <option value="">Not sure</option>
                {QUESTIONS.find((q) => q.id === 'budget')!.options({}, '').map((o) => <option key={o.id} value={o.id}>{o.id}</option>)}
              </select>
            </div>
          </div>
          <div className="field" style={{ marginTop: 18 }}>
            <label htmlFor="bf-notes">Anything else for the designer?</label>
            <textarea id="bf-notes" className="textarea" value={brief.notes} maxLength={400} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. We love reading here in the evenings." />
          </div>
        </section>
      </div>
    </StepFrame>
  )
}
