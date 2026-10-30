export type ProjectStatus =
  | 'draft'
  | 'photo_added'
  | 'chat_in_progress'
  | 'brief_ready'
  | 'generating'
  | 'concept_ready'
  | 'saved'

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: 'Draft',
  photo_added: 'Photo added',
  chat_in_progress: 'Chat in progress',
  brief_ready: 'Brief ready',
  generating: 'Generating',
  concept_ready: 'Concept ready',
  saved: 'Saved',
}

export interface User {
  id: string
  email: string
  displayName: string
  welcomed: boolean
}

/** One structured answer in the guided conversation. */
export interface Answer {
  choices: string[]
  /** Second list for two-sided questions (e.g. colours to avoid). */
  avoid?: string[]
  note?: string
  skipped?: boolean
  unsure?: boolean
}

export type Answers = Record<string, Answer>

export type Vote = 'like' | 'dislike'

/** Editable design brief. Every list is plain language so it can be shown and sent as-is. */
export interface BriefData {
  roomType: string
  household: string[]
  goals: string[]
  styles: string[]
  colours: string[]
  avoidColours: string[]
  materials: string[]
  avoidMaterials: string[]
  keep: string[]
  explore: string[]
  practical: string[]
  scale: string
  budget: string
  notes: string
}

export interface ApprovedBrief {
  version: number
  data: BriefData
  summary: string
  approvedAt: string
}

export interface Project {
  id: string
  ownerId: string
  name: string
  roomType: string
  status: ProjectStatus
  photoPath: string | null
  answers: Answers
  conversationStep: number
  conversationDone: boolean
  inspiration: Record<string, Vote>
  inspirationDone: boolean
  briefDraft: BriefData | null
  approvedBrief: ApprovedBrief | null
  currentConceptId: string | null
  createdAt: string
  updatedAt: string
}

export type ConceptSource = 'ai' | 'demo'

export interface FidelityCheck {
  geometry?: boolean
  openings?: boolean
  keptItems?: boolean
  perspective?: boolean
}

export interface Concept {
  id: string
  projectId: string
  ownerId: string
  version: number
  parentId: string | null
  briefVersion: number
  imagePath: string
  refinement: string | null
  whatChanged: string[]
  source: ConceptSource
  model: string | null
  saved: boolean
  fidelity: FidelityCheck | null
  createdAt: string
}

export type GenErrorCode =
  | 'quota'
  | 'rate_limited'
  | 'timeout'
  | 'model_unavailable'
  | 'unsupported_image'
  | 'blocked'
  | 'busy'
  | 'refine_limit'
  | 'no_brief'
  | 'provider'
  | 'network'
  | 'unknown'

export class GenerationError extends Error {
  code: GenErrorCode
  constructor(code: GenErrorCode, message?: string) {
    super(message ?? code)
    this.code = code
  }
}

export const MAX_REFINEMENTS = 3
