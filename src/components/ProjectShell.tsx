import { Check, ChevronLeft } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { backend } from '../lib/backend'
import type { ProjectPatch } from '../lib/backend/types'
import { isDone, reachable, resumeStep, STEPS, stepPath, type StepId } from '../lib/steps'
import type { Concept, Project } from '../lib/types'
import { Notice, PageLoader } from './ui'

interface ProjectCtx {
  project: Project
  concepts: Concept[]
  setProject: (p: Project) => void
  update: (patch: ProjectPatch) => Promise<Project>
  reload: () => Promise<void>
}

const Ctx = createContext<ProjectCtx | null>(null)
export function useProject(): ProjectCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useProject outside ProjectShell')
  return v
}

/** Loads one project (owner-only via the backend) and shares it with step pages. */
export function ProjectShell() {
  const { id = '' } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')

  const reload = useCallback(async () => {
    try {
      const [p, cs] = await Promise.all([backend.getProject(id), backend.listConcepts(id)])
      if (!p) return setState('missing')
      setProject(p)
      setConcepts(cs)
      setState('ready')
    } catch {
      setState('error')
    }
  }, [id])

  useEffect(() => {
    setState('loading')
    reload()
  }, [reload])

  const update = useCallback(
    async (patch: ProjectPatch) => {
      const next = await backend.updateProject(id, patch)
      setProject(next)
      return next
    },
    [id],
  )

  if (state === 'loading') return <PageLoader label="Opening your room" />
  if (state === 'missing')
    return (
      <div className="wrap narrow page">
        <h1>We couldn’t find that room</h1>
        <p className="lede">It may have been deleted, or it belongs to a different account.</p>
        <Link className="btn btn-primary" to="/app">Back to my projects</Link>
      </div>
    )
  if (state === 'error' || !project)
    return (
      <div className="wrap narrow page">
        <Notice tone="error">We couldn’t load this project. Check your connection and try again.</Notice>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => { setState('loading'); reload() }}>Try again</button>
          <Link className="btn btn-secondary" to="/app">Back to projects</Link>
        </div>
      </div>
    )

  return (
    <Ctx.Provider value={{ project, concepts, setProject, update, reload }}>
      <Outlet />
    </Ctx.Provider>
  )
}

/** Redirect /app/projects/:id to the step where the user left off. */
export function ResumeRedirect() {
  const { project } = useProject()
  return <Navigate to={stepPath(project.id, resumeStep(project))} replace />
}

/** Guards a step and renders the journey header (back link, name, stepper). */
export function StepFrame({ step, children }: { step: StepId; children: React.ReactNode }) {
  const { project } = useProject()
  const loc = useLocation()
  if (!reachable(project, step)) return <Navigate to={stepPath(project.id, resumeStep(project))} replace state={{ from: loc.pathname }} />
  const currentIdx = STEPS.findIndex((s) => s.id === (step === 'generate' ? 'result' : step))
  return (
    <div className="wrap page">
      <div className="row between" style={{ marginBottom: 12 }}>
        <Link to={`/app/projects/${project.id}/overview`} className="btn btn-ghost btn-sm">
          <ChevronLeft aria-hidden="true" /> {project.name}
        </Link>
      </div>
      <nav className="stepper" aria-label="Makeover steps">
        <ol>
          {STEPS.map((s, i) => {
            const cur = i === currentIdx
            const done = isDone(project, s.id)
            const open = reachable(project, s.id)
            return (
              <li key={s.id} className={cur ? 'current' : done ? 'done' : ''}>
                {cur || !open ? (
                  <span aria-current={cur ? 'step' : undefined}>
                    {done && !cur && <Check aria-hidden="true" />}
                    {i + 1}. {s.label}
                    {!open && <span className="visually-hidden"> (not available yet)</span>}
                  </span>
                ) : (
                  <Link to={stepPath(project.id, s.id)}>
                    {done && <Check aria-hidden="true" />}
                    {i + 1}. {s.label}
                    {done && <span className="visually-hidden"> (done)</span>}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
      {children}
    </div>
  )
}
