import { Bookmark, BookmarkCheck, Download, FileText, Plus, Sparkles } from 'lucide-react'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { backend, isDemo } from '../lib/backend'
import { downloadImage, slug } from '../lib/download'
import { friendly, type FriendlyError } from '../lib/genErrors'
import { stepPath } from '../lib/steps'
import { MAX_REFINEMENTS, type Concept, type FidelityCheck } from '../lib/types'
import { CompareSlider } from '../components/CompareSlider'
import { StepFrame, useProject } from '../components/ProjectShell'
import { Dots, Notice, StoredImage, useTitle, useToast } from '../components/ui'

const SUGGESTIONS = ['Make the room brighter', 'Change the curtains to muted green', 'Try a smaller coffee table', 'Add more plants']

const FIDELITY: { key: keyof FidelityCheck; label: string }[] = [
  { key: 'geometry', label: 'Walls and room shape look the same' },
  { key: 'openings', label: 'Windows and doors stayed in place' },
  { key: 'keptItems', label: 'Things I marked “keep” are still there' },
  { key: 'perspective', label: 'The camera angle matches my photo' },
]

function SourceBadge({ c }: { c: Concept }) {
  return c.source === 'demo' ? (
    <span className="status" style={{ background: 'var(--paper-3)', color: 'var(--ink)' }}>Demo preview · not AI-generated</span>
  ) : (
    <span className="status s-brief_ready">AI visual concept</span>
  )
}

export default function ResultStep() {
  const { project, concepts, reload } = useProject()
  useTitle(`Concept · ${project.name}`)
  const toast = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(project.currentConceptId)
  const [view, setView] = useState<'slider' | 'side'>('side')
  const [refineText, setRefineText] = useState('')
  const [refining, setRefining] = useState(false)
  const [error, setError] = useState<FriendlyError | null>(null)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  const selected = useMemo(
    () => concepts.find((c) => c.id === selectedId) ?? concepts.find((c) => c.id === project.currentConceptId) ?? concepts.at(-1),
    [concepts, selectedId, project.currentConceptId],
  )
  const used = concepts.filter((c) => c.refinement).length
  const left = Math.max(0, MAX_REFINEMENTS - used)

  if (!selected)
    return (
      <StepFrame step="result">
        <Notice>No concept yet. <Link to={stepPath(project.id, 'generate')}>Create your first concept</Link>.</Notice>
      </StepFrame>
    )

  async function toggleSave() {
    if (!selected) return
    setBusy(true)
    try {
      await backend.updateConcept(selected.id, { saved: !selected.saved })
      await reload()
      toast(selected.saved ? 'Removed from My designs' : 'Saved to My designs')
    } catch {
      toast('Couldn’t save — please try again')
    } finally {
      setBusy(false)
    }
  }

  async function setFidelity(key: keyof FidelityCheck, value: boolean) {
    if (!selected) return
    try {
      await backend.updateConcept(selected.id, { fidelity: { ...(selected.fidelity ?? {}), [key]: value } })
      await reload()
    } catch {
      toast('Couldn’t record that — please try again')
    }
  }

  async function refine(e: FormEvent) {
    e.preventDefault()
    const text = refineText.trim()
    if (!text || inFlight.current || !selected) return
    inFlight.current = true
    setRefining(true)
    setError(null)
    try {
      const c = await backend.generateConcept(project.id, { refinement: text, parentId: concepts.at(-1)?.id })
      await reload()
      setSelectedId(c.id)
      setRefineText('')
      toast(`Version ${c.version} is ready`)
    } catch (err) {
      setError(friendly(err))
      await reload().catch(() => {})
    } finally {
      inFlight.current = false
      setRefining(false)
    }
  }

  async function download() {
    if (!selected) return
    try {
      await downloadImage(selected.imagePath, `roomtone-${slug(project.name)}-v${selected.version}`)
    } catch {
      toast('Download failed — please try again')
    }
  }

  const beforeAlt = `Your original photo of the ${project.roomType.toLowerCase()}`
  const afterAlt = `Makeover concept version ${selected.version}${selected.refinement ? `, refined: ${selected.refinement}` : ''}`

  return (
    <StepFrame step="result">
      <div className="row between" style={{ alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <span className="eyebrow">Version {selected.version} of {concepts.length}</span>
          <h1 style={{ marginBottom: 6 }}>Your makeover concept</h1>
          <SourceBadge c={selected} />
        </div>
        <div className="row" role="group" aria-label="Comparison view">
          <button className={`btn btn-sm ${view === 'side' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={view === 'side'} onClick={() => setView('side')}>Side by side</button>
          <button className={`btn btn-sm ${view === 'slider' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={view === 'slider'} onClick={() => setView('slider')}>Slider</button>
        </div>
      </div>

      {view === 'side' ? (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <figure className="frame" style={{ margin: 0 }}>
            <StoredImage path={project.photoPath} alt={beforeAlt} />
            <span className="tag">Before</span>
          </figure>
          <figure className="frame" style={{ margin: 0 }}>
            <StoredImage path={selected.imagePath} alt={afterAlt} />
            <span className="tag">Concept v{selected.version}</span>
          </figure>
        </div>
      ) : (
        <CompareSlider
          label={`Compare your photo with concept version ${selected.version}`}
          before={<StoredImage path={project.photoPath} alt={beforeAlt} />}
          after={<StoredImage path={selected.imagePath} alt={afterAlt} />}
        />
      )}

      <div style={{ marginTop: 16 }}>
        <Notice>
          {isDemo || selected.source === 'demo'
            ? 'Demo preview: a colour study of your own photo, not an AI redesign. Connect an image model to create real concepts.'
            : 'This is an AI-generated visual concept, not a photo or a plan. It may change details, isn’t to scale, and colours vary on screen.'}
        </Notice>
      </div>

      {concepts.length > 1 && (
        <section aria-labelledby="versions" style={{ marginTop: 24 }}>
          <h2 id="versions" style={{ fontSize: '1.15rem' }}>Versions</h2>
          <div className="versions">
            {concepts.map((c) => (
              <button key={c.id} className="version" aria-pressed={c.id === selected.id} onClick={() => setSelectedId(c.id)}>
                <StoredImage path={c.imagePath} alt="" />
                <span>
                  v{c.version}{c.saved ? ' · saved' : ''}
                  <span className="visually-hidden">{c.refinement ? `, refined: ${c.refinement}` : ', first concept'}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="split" style={{ marginTop: 28 }}>
        <div className="stack" style={{ ['--stack' as string]: '1.5rem' }}>
          <section aria-labelledby="changed">
            <h2 id="changed" style={{ fontSize: '1.3rem' }}>What changed</h2>
            {selected.refinement && <p className="muted small">You asked: “{selected.refinement}”</p>}
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {selected.whatChanged.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </section>

          <section className="panel" aria-labelledby="refine">
            <div className="row between">
              <h2 id="refine" style={{ fontSize: '1.3rem', margin: 0 }}><Sparkles size={18} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> Refine it</h2>
              <span className="small muted">{left} of {MAX_REFINEMENTS} rounds left</span>
            </div>
            <p className="muted small" style={{ marginTop: 6 }}>Describe one change in your own words. We’ll edit the latest version and keep the earlier ones.</p>
            {error && <div style={{ marginBottom: 12 }}><Notice tone="error"><strong>{error.title}.</strong> {error.body}</Notice></div>}
            {refining ? (
              <div className="row" role="status" style={{ padding: '16px 0' }}><Dots /> Creating version {concepts.length + 1}…</div>
            ) : left > 0 ? (
              <form onSubmit={refine}>
                <label htmlFor="refine-text" className="visually-hidden">Describe your change</label>
                <textarea id="refine-text" className="textarea" value={refineText} onChange={(e) => setRefineText(e.target.value)} maxLength={300} placeholder="e.g. Keep the sofa, change the curtains to muted green" />
                <div className="chips" style={{ marginTop: 10 }}>
                  {SUGGESTIONS.map((s) => <button key={s} type="button" className="chip" onClick={() => setRefineText(s)}>{s}</button>)}
                </div>
                <button className="btn btn-primary" type="submit" style={{ marginTop: 14 }} disabled={!refineText.trim()}>Create new version</button>
              </form>
            ) : (
              <p className="small" style={{ margin: 0 }}>You’ve used every refinement round for this room. Save your favourite version, or <Link to="/app/new">start a new project</Link>.</p>
            )}
          </section>
        </div>

        <aside className="stack" style={{ ['--stack' as string]: '1.25rem' }}>
          <div className="panel tint stack">
            <button className="btn btn-primary" onClick={toggleSave} disabled={busy} style={{ width: '100%' }}>
              {selected.saved ? <><BookmarkCheck aria-hidden="true" /> Saved to My designs</> : <><Bookmark aria-hidden="true" /> Save to My designs</>}
            </button>
            <button className="btn btn-secondary" onClick={download} style={{ width: '100%' }}><Download aria-hidden="true" /> Download image</button>
            <p className="small muted" style={{ margin: 0 }}>
              Sharing links aren’t available yet, so nobody else can see this concept. Download it to share it yourself.
            </p>
            <div className="row">
              <Link className="btn btn-ghost btn-sm" to={stepPath(project.id, 'brief')}><FileText aria-hidden="true" /> Return to brief</Link>
              <Link className="btn btn-ghost btn-sm" to="/app/new"><Plus aria-hidden="true" /> Start over</Link>
            </div>
          </div>

          <fieldset className="panel" style={{ margin: 0 }}>
            <legend className="label" style={{ padding: '0 6px' }}>Check the concept</legend>
            <p className="small muted" style={{ marginTop: 0 }}>Image models can alter details. Tick what held up — it helps us improve, and reminds you what to verify.</p>
            {FIDELITY.map((f) => (
              <label key={f.key} className="row" style={{ fontWeight: 400, flexWrap: 'nowrap', alignItems: 'flex-start', gap: 10, marginTop: 8 }}>
                <input type="checkbox" checked={!!selected.fidelity?.[f.key]} onChange={(e) => setFidelity(f.key, e.target.checked)} style={{ width: 18, height: 18, marginTop: 3 }} />
                {f.label}
              </label>
            ))}
          </fieldset>
        </aside>
      </div>
    </StepFrame>
  )
}
