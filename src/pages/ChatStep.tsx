import { ArrowLeft, ArrowRight, Check, Leaf, Pencil } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { composeBrief } from '../lib/brief'
import { QUESTIONS, summariseAnswer, type Question } from '../lib/conversation'
import { stepPath } from '../lib/steps'
import type { Answer, Answers } from '../lib/types'
import { StyleArt } from '../illustrations/Swatches'
import { StepFrame, useProject } from '../components/ProjectShell'
import { Notice, useTitle } from '../components/ui'

function Assistant({ children }: { children: React.ReactNode }) {
  return (
    <div className="msg">
      <span className="avatar" aria-hidden="true"><Leaf /></span>
      <div className="bubble">{children}</div>
    </div>
  )
}

function initialDraft(q: Question, answers: Answers): Answer {
  const existing = answers[q.id]
  if (existing && !existing.skipped) return { ...existing, choices: [...existing.choices], avoid: [...(existing.avoid ?? [])] }
  return { choices: q.prefill?.(answers) ?? [], avoid: [], note: '' }
}

function AnswerInput({ q, answers, roomType, draft, setDraft }: {
  q: Question
  answers: Answers
  roomType: string
  draft: Answer
  setDraft: (a: Answer) => void
}) {
  const [side, setSide] = useState<0 | 1>(0)
  const options = q.options(answers, roomType)
  const max = q.maxChoices ?? Infinity

  const toggle = (id: string) => {
    if (q.kind === 'single') return setDraft({ ...draft, choices: draft.choices[0] === id ? [] : [id], unsure: false })
    if (q.kind === 'twoSided') {
      const love = new Set(draft.choices)
      const avoid = new Set(draft.avoid ?? [])
      const [target, other] = side === 0 ? [love, avoid] : [avoid, love]
      if (target.has(id)) target.delete(id)
      else {
        target.add(id)
        other.delete(id)
      }
      return setDraft({ ...draft, choices: [...love], avoid: [...avoid], unsure: false })
    }
    const on = draft.choices.includes(id)
    if (!on && draft.choices.length >= max) {
      // Replace the oldest choice so the limit never blocks the user.
      return setDraft({ ...draft, choices: [...draft.choices.slice(1), id], unsure: false })
    }
    setDraft({ ...draft, choices: on ? draft.choices.filter((c) => c !== id) : [...draft.choices, id], unsure: false })
  }

  return (
    <div className="stack">
      {q.kind === 'twoSided' && q.sides && (
        <div className="row" role="group" aria-label="Choose which list to edit">
          {q.sides.map((s, i) => (
            <button key={s} type="button" className={`btn btn-sm ${side === i ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={side === i} onClick={() => setSide(i as 0 | 1)}>
              {s}
            </button>
          ))}
          <span className="small muted">
            {side === 0 ? 'Tap what you’d love to see.' : 'Tap what you’d rather avoid.'}
          </span>
        </div>
      )}

      {q.kind === 'styles' ? (
        <div className="vchoices">
          {options.map((o) => {
            const on = draft.choices.includes(o.id)
            return (
              <button key={o.id} type="button" className="vchoice" aria-pressed={on} onClick={() => toggle(o.id)}>
                <span className="art"><StyleArt id={o.id} /></span>
                <span className="cap"><strong>{o.label}</strong><span>{o.hint}</span></span>
                {on && <span className="check" aria-hidden="true"><Check /></span>}
              </button>
            )
          })}
        </div>
      ) : q.kind === 'single' && options.some((o) => o.hint) ? (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {options.map((o) => (
            <button key={o.id} type="button" className="vchoice" style={{ padding: 14 }} aria-pressed={draft.choices.includes(o.id)} onClick={() => toggle(o.id)}>
              <strong>{o.label}</strong>
              <span className="small muted">{o.hint}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="chips">
          {options.map((o) => {
            const loved = draft.choices.includes(o.id)
            const avoided = draft.avoid?.includes(o.id)
            const pressed = q.kind === 'twoSided' ? (side === 0 ? loved : avoided) : loved
            return (
              <button
                key={o.id}
                type="button"
                className="chip"
                aria-pressed={!!pressed}
                onClick={() => toggle(o.id)}
                style={q.kind === 'twoSided' && !pressed && (loved || avoided) ? { borderStyle: 'dashed' } : undefined}
              >
                {o.swatch && <span className="swatch" style={{ background: o.swatch }} aria-hidden="true" />}
                {o.label}
                {q.kind === 'twoSided' && !pressed && (loved || avoided) && (
                  <span className="small muted">({loved ? 'love' : 'avoid'})</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {q.maxChoices && q.kind !== 'single' && (
        <p className="small muted" style={{ margin: 0 }}>
          {draft.choices.length} of {q.maxChoices} chosen
        </p>
      )}

      {q.allowNote && (
        <div className="field">
          <label htmlFor={`note-${q.id}`} className="small">{q.allowNote}</label>
          <input
            id={`note-${q.id}`}
            className="input"
            value={draft.note ?? ''}
            maxLength={200}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}

export default function ChatStep() {
  const { project, update } = useProject()
  useTitle(`Conversation · ${project.name}`)
  const nav = useNavigate()
  const total = QUESTIONS.length
  const [index, setIndex] = useState(() => (project.conversationDone ? total : Math.min(project.conversationStep, total - 1)))
  const q = QUESTIONS[index] as Question | undefined
  const [draft, setDraft] = useState<Answer>(() => (q ? initialDraft(q, project.answers) : { choices: [] }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const askRef = useRef<HTMLParagraphElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (q) setDraft(initialDraft(q, project.answers))
    if (firstRender.current) firstRender.current = false
    else askRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const transcript = useMemo(
    () => QUESTIONS.slice(0, index).map((qq, i) => ({ q: qq, i, summary: summariseAnswer(qq, project.answers) })),
    [index, project.answers],
  )

  async function save(answer: Answer) {
    if (!q) return
    setSaving(true)
    setError(null)
    try {
      const answers = { ...project.answers, [q.id]: answer }
      const last = index === total - 1
      const done = project.conversationDone || last
      const nextIndex = done ? total : index + 1
      await update({
        answers,
        conversationStep: Math.max(project.conversationStep, nextIndex),
        conversationDone: done,
        briefDraft: done ? composeBrief({ ...project, answers }) : project.briefDraft,
        status: done ? (project.approvedBrief || project.currentConceptId ? project.status : 'brief_ready') : project.status === 'photo_added' || project.status === 'draft' ? 'chat_in_progress' : project.status,
      })
      setIndex(nextIndex)
    } catch {
      setError('We couldn’t save that answer. Check your connection and try again — nothing you chose is lost.')
    } finally {
      setSaving(false)
    }
  }

  const hasInput = draft.choices.length > 0 || (draft.avoid?.length ?? 0) > 0 || !!draft.note?.trim()
  const roomType = project.roomType

  return (
    <StepFrame step="chat">
      <div className="split">
        <div>
          <h1>Let’s talk about your {roomType.toLowerCase()}</h1>
          <div className="row" style={{ gap: 12, marginBottom: 24 }}>
            <div className="progress" style={{ flex: 1, minWidth: 120 }} aria-hidden="true">
              <span style={{ width: `${(Math.min(index, total) / total) * 100}%` }} />
            </div>
            <span className="small muted" aria-live="polite">
              {index < total ? `Question ${index + 1} of ${total} · saved as you go` : 'All questions answered'}
            </span>
          </div>

          <div className="chat" aria-label="Conversation">
            <Assistant>
              Hi! I’m your Roomtone design assistant. I’ll ask a few short questions, one at a time. There are no wrong
              answers, and you can change any of them later.
            </Assistant>
            {transcript.map(({ q: qq, i, summary }) => (
              <div key={qq.id} className="stack" style={{ ['--stack' as string]: '10px' }}>
                <Assistant>{qq.ask(project.answers, roomType)}</Assistant>
                <div className="msg user">
                  <div className="bubble">
                    {summary || 'No preference'}
                    <div>
                      <button className="linkbtn edit" onClick={() => setIndex(i)} aria-label={`Change answer about ${qq.topic.toLowerCase()}`}>
                        <Pencil size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px' }} /> Change
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {q ? (
              <>
                <Assistant>
                  <p ref={askRef} tabIndex={-1} style={{ margin: 0, outline: 'none' }} aria-live="polite">{q.ask(project.answers, roomType)}</p>
                  {q.helper?.(project.answers, roomType) && <p className="small muted" style={{ margin: '6px 0 0' }}>{q.helper(project.answers, roomType)}</p>}
                </Assistant>
                <div className="answer-area">
                  {error && <div style={{ marginBottom: 12 }}><Notice tone="error">{error}</Notice></div>}
                  <AnswerInput key={q.id} q={q} answers={project.answers} roomType={roomType} draft={draft} setDraft={setDraft} />
                  <div className="row between" style={{ marginTop: 20 }}>
                    <button className="btn btn-ghost" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0 || saving}>
                      <ArrowLeft aria-hidden="true" /> Back
                    </button>
                    <div className="row">
                      {q.allowUnsure && (
                        <button className="btn btn-secondary" disabled={saving} onClick={() => save({ choices: [], unsure: true, note: draft.note })}>
                          I’m not sure
                        </button>
                      )}
                      {!q.allowUnsure && (
                        <button className="btn btn-ghost" disabled={saving} onClick={() => save({ choices: [], skipped: true })}>Skip</button>
                      )}
                      <button className="btn btn-primary" disabled={saving || !hasInput} onClick={() => save({ ...draft, unsure: false, skipped: false })}>
                        {saving ? 'Saving…' : index === total - 1 ? 'Finish' : 'Continue'} <ArrowRight aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Assistant>
                  <p ref={askRef} tabIndex={-1} style={{ margin: 0, outline: 'none' }}>
                    Thank you — that’s everything I need. Next, a few quick pictures to fine-tune colours and materials, then
                    I’ll write up your brief for you to check.
                  </p>
                </Assistant>
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn btn-primary btn-lg" onClick={() => nav(stepPath(project.id, 'inspiration'))}>
                    Continue to inspiration <ArrowRight aria-hidden="true" />
                  </button>
                  <button className="btn btn-ghost" onClick={() => nav(stepPath(project.id, 'brief'))}>Skip to my brief</button>
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="panel tint" aria-labelledby="so-far" style={{ position: 'sticky', top: 88 }}>
          <h2 id="so-far" style={{ fontSize: '1.2rem' }}>What I’ve heard so far</h2>
          {Object.keys(project.answers).length === 0 ? (
            <p className="muted small" style={{ margin: 0 }}>Your answers will collect here as we go.</p>
          ) : (
            <dl className="facts small">
              <dt>Room</dt>
              <dd>{roomType}</dd>
              {QUESTIONS.filter((qq) => project.answers[qq.id]).map((qq) => (
                <div key={qq.id} style={{ display: 'contents' }}>
                  <dt>{qq.topic}</dt>
                  <dd>{summariseAnswer(qq, project.answers)}</dd>
                </div>
              ))}
            </dl>
          )}
        </aside>
      </div>
    </StepFrame>
  )
}
