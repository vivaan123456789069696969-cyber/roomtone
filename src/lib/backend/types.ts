import type { ApprovedBrief, BriefData, Concept, FidelityCheck, Project, User } from '../types'

export type ProjectPatch = Partial<
  Pick<
    Project,
    | 'name'
    | 'roomType'
    | 'status'
    | 'answers'
    | 'conversationStep'
    | 'conversationDone'
    | 'inspiration'
    | 'inspirationDone'
    | 'briefDraft'
    | 'currentConceptId'
  >
>

export interface GenerateOptions {
  refinement?: string
  parentId?: string
}

export interface Backend {
  mode: 'demo' | 'supabase'

  getUser(): Promise<User | null>
  onAuthChange(cb: (u: User | null) => void): () => void
  signUp(email: string, password: string, displayName: string): Promise<{ needsConfirmation: boolean }>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  updateProfile(patch: { displayName?: string; welcomed?: boolean }): Promise<User>
  deleteAccount(): Promise<void>

  listProjects(): Promise<Project[]>
  getProject(id: string): Promise<Project | null>
  createProject(name: string, roomType: string): Promise<Project>
  updateProject(id: string, patch: ProjectPatch): Promise<Project>
  deleteProject(id: string): Promise<void>
  uploadPhoto(projectId: string, blob: Blob): Promise<Project>
  removePhoto(projectId: string): Promise<Project>
  approveBrief(projectId: string, data: BriefData, summary: string): Promise<ApprovedBrief>

  /** A URL the current user can display. Private: signed or object URL. */
  imageUrl(path: string): Promise<string>

  listConcepts(projectId?: string): Promise<Concept[]>
  updateConcept(id: string, patch: { saved?: boolean; fidelity?: FidelityCheck }): Promise<Concept>
  generateConcept(projectId: string, opts?: GenerateOptions): Promise<Concept>
}
