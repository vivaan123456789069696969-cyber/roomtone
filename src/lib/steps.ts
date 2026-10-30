import type { Project } from './types'

export type StepId = 'photo' | 'chat' | 'inspiration' | 'brief' | 'generate' | 'result'

export const STEPS: { id: StepId; label: string }[] = [
  { id: 'photo', label: 'Photo' },
  { id: 'chat', label: 'Conversation' },
  { id: 'inspiration', label: 'Inspiration' },
  { id: 'brief', label: 'Brief' },
  { id: 'result', label: 'Concept' },
]

export const stepPath = (projectId: string, step: StepId) => `/app/projects/${projectId}/${step}`

/** Where to reopen a project: the first unfinished step. */
export function resumeStep(p: Project): StepId {
  if (!p.photoPath) return 'photo'
  if (!p.conversationDone) return 'chat'
  if (!p.inspirationDone) return 'inspiration'
  if (!p.approvedBrief) return 'brief'
  if (p.status === 'generating') return 'generate'
  if (p.currentConceptId) return 'result'
  return 'generate'
}

/** Which steps can be visited right now (earlier steps stay open for edits). */
export function reachable(p: Project, step: StepId): boolean {
  switch (step) {
    case 'photo':
      return true
    case 'chat':
      return !!p.photoPath
    case 'inspiration':
      return !!p.photoPath && p.conversationDone
    case 'brief':
      return !!p.photoPath && p.conversationDone
    case 'generate':
      return !!p.approvedBrief && !!p.photoPath
    case 'result':
      return !!p.currentConceptId
  }
}

export function isDone(p: Project, step: StepId): boolean {
  switch (step) {
    case 'photo':
      return !!p.photoPath
    case 'chat':
      return p.conversationDone
    case 'inspiration':
      return p.inspirationDone
    case 'brief':
      return !!p.approvedBrief
    case 'generate':
    case 'result':
      return !!p.currentConceptId
  }
}
