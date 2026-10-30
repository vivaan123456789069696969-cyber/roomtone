import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { backend } from '../lib/backend'
import { stepPath } from '../lib/steps'
import type { Concept, Project } from '../lib/types'
import { EmptyRoomArt } from '../illustrations/Swatches'
import { fmtDate, Notice, PageLoader, StoredImage, useTitle } from '../components/ui'

export default function Gallery() {
  useTitle('My designs')
  const [data, setData] = useState<{ concepts: Concept[]; projects: Map<string, Project> } | null>(null)
  const [error, setError] = useState(false)

  async function load() {
    setError(false)
    try {
      const [cs, ps] = await Promise.all([backend.listConcepts(), backend.listProjects()])
      setData({
        concepts: cs.filter((c) => c.saved).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        projects: new Map(ps.map((p) => [p.id, p])),
      })
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
        <Notice tone="error">We couldn’t load your designs. Please try again.</Notice>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={load}>Try again</button>
      </div>
    )
  if (!data) return <PageLoader label="Loading your designs" />

  return (
    <div className="wrap page">
      <span className="eyebrow">Saved concepts</span>
      <h1>My designs</h1>
      <p className="lede">Every concept you save, across all your rooms. Only you can see these.</p>
      {data.concepts.length === 0 ? (
        <div className="empty" style={{ marginTop: 24 }}>
          <EmptyRoomArt />
          <h2>Nothing saved yet</h2>
          <p className="muted" style={{ maxWidth: 420 }}>When a concept feels right, choose “Save to My designs” on the result screen and it will appear here.</p>
          <Link to="/app" className="btn btn-primary">Go to my projects</Link>
        </div>
      ) : (
        <div className="cards" style={{ marginTop: 24 }}>
          {data.concepts.map((c) => {
            const p = data.projects.get(c.projectId)
            return (
              <Link key={c.id} className="pcard" to={p ? stepPath(p.id, 'result') : '/app'} aria-label={`Open ${p?.name ?? 'project'}, version ${c.version}`}>
                <div className="thumb"><StoredImage path={c.imagePath} alt="" /></div>
                <div className="body">
                  <span className="title">{p?.name ?? 'Room'}</span>
                  <span className="small muted">Version {c.version}{c.source === 'demo' ? ' · demo' : ''} · {fmtDate(c.createdAt)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
