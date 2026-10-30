import { ArrowRight, Check, Circle, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { backend, isDemo } from '../lib/backend'
import { friendly, type FriendlyError } from '../lib/genErrors'
import { stepPath } from '../lib/steps'
import { StepFrame, useProject } from '../components/ProjectShell'
import { Dots, Notice, StoredImage, useTitle } from '../components/ui'

const PHASES = [
  'Sending your photo and approved brief',
  'Keeping walls, windows, doors and your “keep” list in place',
  'Applying your style, colours and materials',
  'Saving the concept to your project',
]
const PHASE_MS = isDemo ? 900 : 9000
const SLOW_AFTER_MS = 75_000

export default function GenerateStep() {
  const { project, reload, setProject } = useProject()
  useTitle(`Creating concept · ${project.name}`)
  const nav = useNavigate()
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState(0)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState<FriendlyError | null>(null)
  const [waitingOnOther, setWaitingOnOther] = useState(project.status === 'generating')
  const inFlight = useRef(false)

  // Arrived while a generation was already running (e.g. after a refresh): poll for its result.
  useEffect(() => {
    if (!waitingOnOther) return
    let tries = 0
    const t = setInterval(async () => {
      tries++
      const p = await backend.getProject(project.id)
      if (p && p.status !== 'generating') {
        clearInterval(t)
        setProject(p)
        setWaitingOnOther(false)
        if (p.currentConceptId) nav(stepPath(p.id, 'result'), { replace: true })
      } else if (tries >= (isDemo ? 1 : 40)) {
        // No result after ~3 minutes (or a demo run interrupted by a reload): let the user retry.
        clearInterval(t)
        setWaitingOnOther(false)
      }
    }, isDemo ? 1500 : 5000)
    return () => clearInterval(t)
  }, [waitingOnOther, project.id, nav, setProject])

  useEffect(() => {
    if (!running) return
    const p = setInterval(() => setPhase((x) => Math.min(x + 1, PHASES.length - 1)), PHASE_MS)
    const s = setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => {
      clearInterval(p)
      clearTimeout(s)
    }
  }, [running])

  async function start() {
    if (inFlight.current) return
    inFlight.current = true
    setRunning(true)
    setPhase(0)
    setSlow(false)
    setError(null)
    try {
      await backend.generateConcept(project.id)
      await reload()
      nav(stepPath(project.id, 'result'))
    } catch (e) {
      setError(friendly(e))
      await reload().catch(() => {})
    } finally {
      inFlight.current = false
      setRunning(false)
    }
  }

  const brief = project.approvedBrief!

  if (waitingOnOther)
    return (
      <StepFrame step="generate">
        <div className="narrow" style={{ margin: '0 auto', textAlign: 'center' }}>
          <h1>Your concept is on its way</h1>
          <p className="lede" style={{ margin: '0 auto' }}>We started creating it a moment ago. This page will update when it’s ready.</p>
          <div className="loader"><Dots /></div>
        </div>
      </StepFrame>
    )

  return (
    <StepFrame step="generate">
      <div className="split">
        <div>
          {running ? (
            <div role="status" aria-live="polite">
              <span className="eyebrow">Creating your concept</span>
              <h1>Designing your {project.roomType.toLowerCase()}…</h1>
              <p className="lede">{isDemo ? 'Demo mode makes a quick colour study of your photo.' : 'This usually takes 20–60 seconds. Please keep this page open.'}</p>
              <ol className="gen-steps" style={{ marginTop: 24 }}>
                {PHASES.map((ph, i) => (
                  <li key={ph} className={i < phase ? 'done' : i === phase ? 'active' : ''}>
                    {i < phase ? <Check aria-hidden="true" /> : i === phase ? <Loader2 aria-hidden="true" className="spin" /> : <Circle aria-hidden="true" />}
                    {ph}
                    <span className="visually-hidden">{i < phase ? ' — done' : i === phase ? ' — in progress' : ''}</span>
                  </li>
                ))}
              </ol>
              {slow && (
                <div style={{ marginTop: 20 }}>
                  <Notice>
                    This is taking longer than usual. It will stop on its own if the model doesn’t respond. You can also leave this
                    page — if it finishes, the concept will appear in your project.
                  </Notice>
                </div>
              )}
            </div>
          ) : (
            <>
              <span className="eyebrow">Ready when you are</span>
              <h1>Create your makeover concept</h1>
              <p className="lede">
                We’ll send your photo with the brief you approved (version {brief.version}). You’ll get a visual concept to
                compare with your room — then you can refine it in your own words.
              </p>
              {error && (
                <div style={{ margin: '16px 0' }}>
                  <Notice tone="error">
                    <strong>{error.title}.</strong> {error.body}
                  </Notice>
                  <div className="row" style={{ marginTop: 12 }}>
                    {error.editBrief && <Link className="btn btn-secondary" to={stepPath(project.id, 'brief')}>Edit brief</Link>}
                    {error.newPhoto && <Link className="btn btn-secondary" to={stepPath(project.id, 'photo')}>Use another photo</Link>}
                    <Link className="btn btn-ghost" to="/app">Back to dashboard</Link>
                  </div>
                </div>
              )}
              <div className="row" style={{ marginTop: 20 }}>
                <button className="btn btn-primary btn-lg" onClick={start} disabled={running || (error ? !error.retry : false)}>
                  {error?.retry ? 'Try again' : 'Create my concept'} <ArrowRight aria-hidden="true" />
                </button>
                <Link className="btn btn-ghost" to={stepPath(project.id, 'brief')}>Review brief</Link>
              </div>
              <p className="small muted" style={{ marginTop: 16 }}>
                {isDemo
                  ? 'Demo mode: no AI model is used. You’ll get a labelled colour study made from your photo.'
                  : 'Concepts are AI-generated visual ideas. The model may still alter some details.'}
              </p>
            </>
          )}
        </div>
        <aside className="stack">
          <div className="frame">
            <StoredImage path={project.photoPath} alt={`Your photo of the ${project.roomType.toLowerCase()}`} />
            <span className="tag">Your photo</span>
          </div>
          <div className="panel tint">
            <h2 style={{ fontSize: '1.1rem' }}>Approved brief</h2>
            <p className="small" style={{ margin: 0 }}>{brief.summary}</p>
          </div>
        </aside>
      </div>
    </StepFrame>
  )
}
