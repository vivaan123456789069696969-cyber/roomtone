import { ArrowRight, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { composeBrief } from '../lib/brief'
import { boardFor, type RefGroup } from '../lib/inspiration'
import { stepPath } from '../lib/steps'
import type { Vote } from '../lib/types'
import { RefArt } from '../illustrations/Swatches'
import { StepFrame, useProject } from '../components/ProjectShell'
import { Notice, useTitle } from '../components/ui'

const GROUPS: RefGroup[] = ['Colour', 'Material', 'Furniture', 'Décor']

export default function InspirationStep() {
  const { project, update } = useProject()
  useTitle(`Inspiration · ${project.name}`)
  const nav = useNavigate()
  const [votes, setVotes] = useState<Record<string, Vote>>(project.inspiration)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const board = useMemo(() => boardFor(project.answers.styles?.choices ?? []), [project.answers.styles])
  const liked = Object.values(votes).filter((v) => v === 'like').length
  const disliked = Object.values(votes).filter((v) => v === 'dislike').length

  const vote = (id: string, v: Vote) =>
    setVotes((cur) => {
      const next = { ...cur }
      if (next[id] === v) delete next[id]
      else next[id] = v
      return next
    })

  async function finish() {
    setSaving(true)
    setError(null)
    try {
      await update({
        inspiration: votes,
        inspirationDone: true,
        briefDraft: composeBrief({ ...project, inspiration: votes }),
      })
      nav(stepPath(project.id, 'brief'))
    } catch {
      setError('We couldn’t save your choices. Please try again.')
      setSaving(false)
    }
  }

  return (
    <StepFrame step="inspiration">
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1>Which of these feel right?</h1>
          <p className="lede">
            A small, hand-picked board based on what you told me. Like what draws you in, pass on what doesn’t — your brief
            updates to match. It’s fine to skip any.
          </p>
        </div>
      </div>
      {error && <div style={{ margin: '12px 0' }}><Notice tone="error">{error}</Notice></div>}

      {GROUPS.map((g) => {
        const refs = board.filter((r) => r.group === g)
        if (!refs.length) return null
        return (
          <section key={g} aria-labelledby={`g-${g}`} style={{ marginTop: 28 }}>
            <h2 id={`g-${g}`} style={{ fontSize: '1.25rem' }}>{g}</h2>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
              {refs.map((r) => {
                const v = votes[r.id]
                return (
                  <article key={r.id} className={`ref ${v === 'like' ? 'liked' : v === 'dislike' ? 'disliked' : ''}`} aria-label={r.title}>
                    <div className="art"><RefArt art={r.art} /></div>
                    <div className="cap">{r.title}<span>{r.caption}</span></div>
                    <div className="votes">
                      <button className={`btn btn-sm ${v === 'like' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={v === 'like'} onClick={() => vote(r.id, 'like')}>
                        <ThumbsUp aria-hidden="true" /> Like<span className="visually-hidden"> {r.title}</span>
                      </button>
                      <button className={`btn btn-sm ${v === 'dislike' ? 'btn-danger' : 'btn-secondary'}`} aria-pressed={v === 'dislike'} onClick={() => vote(r.id, 'dislike')}>
                        <ThumbsDown aria-hidden="true" /> Pass<span className="visually-hidden"> on {r.title}</span>
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}

      <div className="panel tint row between" style={{ marginTop: 32 }}>
        <span aria-live="polite">
          {liked || disliked ? `${liked} liked · ${disliked} passed` : 'No choices yet — that’s okay.'}
        </span>
        <button className="btn btn-primary btn-lg" onClick={finish} disabled={saving}>
          {saving ? 'Saving…' : 'Update my brief'} <ArrowRight aria-hidden="true" />
        </button>
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>All references are original illustrations, not product photos.</p>
    </StepFrame>
  )
}
