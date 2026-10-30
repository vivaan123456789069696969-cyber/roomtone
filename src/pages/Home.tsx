import { ArrowRight, Camera, ImagePlus, Images, MessageCircle, Sparkles } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { backend } from '../lib/backend'
import { useAuth } from '../lib/auth'
import { ROOM_TYPES } from '../lib/conversation'
import { resumeStep, stepPath } from '../lib/steps'
import type { Concept, Project } from '../lib/types'
import { EmptyRoomArt } from '../illustrations/Swatches'
import { fmtDate, Notice, PageLoader, StatusPill, StoredImage, useTitle, useToast } from '../components/ui'

export function Welcome() {
  useTitle('Welcome')
  const { user, setUser } = useAuth()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  async function go(to: string) {
    setBusy(true)
    try {
      setUser(await backend.updateProfile({ welcomed: true }))
    } finally {
      nav(to)
    }
  }
  return (
    <div className="wrap narrow page">
      <span className="eyebrow">Welcome{user?.displayName ? `, ${user.displayName}` : ''}</span>
      <h1>Let’s start with one room.</h1>
      <p className="lede">Here’s how a makeover works. It takes about ten minutes, and everything saves as you go.</p>
      <ol className="stack" style={{ paddingLeft: 0, listStyle: 'none', margin: '28px 0' }}>
        {[
          [Camera, 'Add a photo of the room', 'One clear, well-lit photo is enough.'],
          [MessageCircle, 'Answer a few questions', 'Pick from pictures — no design words needed.'],
          [Sparkles, 'Approve your brief, see a concept', 'Compare before and after, then refine it.'],
        ].map(([Icon, t, d], i) => {
          const I = Icon as typeof Camera
          return (
            <li key={i} className="row" style={{ alignItems: 'flex-start', gap: 14, flexWrap: 'nowrap' }}>
              <span className="msg"><span className="avatar"><I aria-hidden="true" /></span></span>
              <div><strong>{t as string}</strong><div className="muted">{d as string}</div></div>
            </li>
          )
        })}
      </ol>
      <div className="row">
        <button className="btn btn-primary btn-lg" onClick={() => go('/app/new')} disabled={busy}>
          Start my first room <ArrowRight aria-hidden="true" />
        </button>
        <button className="btn btn-ghost" onClick={() => go('/app')} disabled={busy}>Go to my dashboard</button>
      </div>
    </div>
  )
}

function ProjectCard({ p }: { p: Project }) {
  return (
    <Link className="pcard" to={stepPath(p.id, resumeStep(p))} aria-label={`${p.name}, ${p.roomType}. Open project`}>
      <div className="thumb">
        {p.photoPath ? <StoredImage path={p.photoPath} alt="" /> : <ImagePlus aria-hidden="true" />}
      </div>
      <div className="body">
        <div className="row between" style={{ gap: 8 }}>
          <span className="title">{p.name}</span>
          <StatusPill status={p.status} />
        </div>
        <span className="small muted">{p.roomType} · Updated {fmtDate(p.updatedAt)}</span>
      </div>
    </Link>
  )
}

const NEXT_ACTION: Record<string, string> = {
  photo: 'Add a room photo',
  chat: 'Continue the conversation',
  inspiration: 'Review inspiration',
  brief: 'Review and approve your brief',
  generate: 'Create your concept',
  result: 'See your concept',
}

export function Dashboard() {
  useTitle('My projects')
  const { user } = useAuth()
  const loc = useLocation()
  const toast = useToast()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [saved, setSaved] = useState<Concept[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    const t = (loc.state as { toast?: string } | null)?.toast
    if (t) toast(t)
  }, [loc.state, toast])

  async function load() {
    setError(false)
    try {
      const [ps, cs] = await Promise.all([backend.listProjects(), backend.listConcepts()])
      setProjects(ps)
      setSaved(cs.filter((c) => c.saved))
    } catch {
      setError(true)
    }
  }
  useEffect(() => {
    load()
  }, [])

  if (error)
    return (
      <div className="wrap page">
        <Notice tone="error">We couldn’t load your projects. Check your connection and try again.</Notice>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={load}>Try again</button>
      </div>
    )
  if (!projects) return <PageLoader label="Loading your projects" />

  const unfinished = projects.find((p) => p.status !== 'saved' && p.status !== 'concept_ready')
  const hello = user?.displayName ? `Hello, ${user.displayName}` : 'Hello'

  return (
    <div className="wrap page">
      <div className="row between" style={{ alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <span className="eyebrow">Your home base</span>
          <h1 style={{ marginBottom: 0 }}>{hello}.</h1>
        </div>
        <Link to="/app/new" className="btn btn-primary btn-lg">Start a new makeover <ArrowRight aria-hidden="true" /></Link>
      </div>

      {projects.length === 0 ? (
        <div className="empty">
          <EmptyRoomArt />
          <h2>No rooms yet</h2>
          <p className="muted" style={{ maxWidth: 420 }}>Start with the room that bothers you most. You’ll need one photo and about ten minutes.</p>
          <Link to="/app/new" className="btn btn-primary">Start my first room</Link>
        </div>
      ) : (
        <>
          {unfinished && (
            <section className="panel tint" aria-labelledby="continue" style={{ marginBottom: 36 }}>
              <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
                <div className="frame" style={{ width: 140, aspectRatio: '4 / 3', flex: 'none' }}>
                  {unfinished.photoPath ? <StoredImage path={unfinished.photoPath} alt="" /> : null}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <span className="eyebrow" id="continue">Continue where you left off</span>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: 4 }}>{unfinished.name}</h2>
                  <p className="muted small" style={{ margin: 0 }}>
                    <StatusPill status={unfinished.status} /> · Next: {NEXT_ACTION[resumeStep(unfinished)]}
                  </p>
                </div>
                <Link className="btn btn-primary" to={stepPath(unfinished.id, resumeStep(unfinished))}>
                  Continue <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </section>
          )}

          <section aria-labelledby="recent">
            <h2 id="recent">Your rooms</h2>
            <div className="cards">{projects.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
          </section>

          <section aria-labelledby="designs" style={{ marginTop: 40 }}>
            <div className="row between">
              <h2 id="designs" style={{ margin: 0 }}>Saved designs</h2>
              <Link to="/app/gallery" className="btn btn-ghost"><Images aria-hidden="true" /> Open My designs</Link>
            </div>
            <p className="muted" style={{ marginTop: 8 }}>
              {saved.length
                ? `You’ve saved ${saved.length} concept${saved.length === 1 ? '' : 's'}.`
                : 'Concepts you save appear here, across all your rooms.'}
            </p>
          </section>
        </>
      )}
    </div>
  )
}

export function NewProject() {
  useTitle('New room')
  const nav = useNavigate()
  const [roomType, setRoomType] = useState<string>('Living room')
  const [other, setOther] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const effectiveType = roomType === 'Other' ? other.trim() || 'Room' : roomType
  const defaultName = `My ${effectiveType.toLowerCase()}`

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const p = await backend.createProject(name.trim().slice(0, 80) || defaultName, effectiveType)
      nav(stepPath(p.id, 'photo'))
    } catch (err) {
      setError((err as Error).message || 'We couldn’t create the project. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="wrap narrow page">
      <span className="eyebrow">New makeover</span>
      <h1>Which room are we working on?</h1>
      <form onSubmit={submit} className="stack" style={{ ['--stack' as string]: '1.5rem', marginTop: 24 }}>
        {error && <Notice tone="error">{error}</Notice>}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ marginBottom: 10 }}>Room type</legend>
          <div className="chips">
            {ROOM_TYPES.map((t) => (
              <button
                type="button"
                key={t}
                aria-pressed={roomType === t}
                className="chip"
                onClick={() => setRoomType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </fieldset>
        {roomType === 'Other' && (
          <div className="field">
            <label htmlFor="other">What kind of room?</label>
            <input id="other" className="input" value={other} onChange={(e) => setOther(e.target.value)} placeholder="e.g. Pooja room, guest room, entryway" maxLength={40} />
          </div>
        )}
        <div className="field">
          <label htmlFor="pname">Project name <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
          <input id="pname" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultName} maxLength={80} />
          <span className="hint">We’ll call it “{name.trim() || defaultName}”. You can rename it later.</span>
        </div>
        <div className="row">
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Continue to photo'} <ArrowRight aria-hidden="true" />
          </button>
          <Link to="/app" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
