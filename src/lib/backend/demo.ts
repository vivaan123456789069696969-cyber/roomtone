/**
 * Demo backend: everything lives in this browser's IndexedDB. No data leaves
 * the device. Accounts are local and for trying the product only.
 */
import { renderDemoConcept } from '../image'
import {
  GenerationError,
  MAX_REFINEMENTS,
  type ApprovedBrief,
  type BriefData,
  type Concept,
  type Project,
  type User,
} from '../types'
import type { Backend, GenerateOptions, ProjectPatch } from './types'

const DB_NAME = 'roomtone-demo'
const STORES = ['users', 'projects', 'concepts', 'blobs', 'kv'] as const
type Store = (typeof STORES)[number]
const DAILY_LIMIT = 30
export const DEMO_DELAY_MS = 3500

let dbp: Promise<IDBDatabase> | null = null
function db(): Promise<IDBDatabase> {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbp
}

async function tx<T>(store: Store, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db()
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode)
    const r = fn(t.objectStore(store))
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}
const get = <T>(s: Store, k: string) => tx<T | undefined>(s, 'readonly', (o) => o.get(k) as IDBRequest<T | undefined>)
const put = (s: Store, k: string, v: unknown) => tx(s, 'readwrite', (o) => o.put(v, k))
const del = (s: Store, k: string) => tx(s, 'readwrite', (o) => o.delete(k))
const all = <T>(s: Store) => tx<T[]>(s, 'readonly', (o) => o.getAll() as IDBRequest<T[]>)

interface StoredUser extends User {
  salt: string
  hash: string
}

const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 120_000 },
    key,
    256,
  )
  return btoa(String.fromCharCode(...new Uint8Array(bits)))
}

const publicUser = ({ salt: _s, hash: _h, ...u }: StoredUser): User => u

function whatChangedDemo(brief: BriefData, refinement?: string): string[] {
  const out = [
    'Demo mode: this is a colour study of your own photo, not an AI redesign.',
    brief.colours.length ? `Shifted the overall tone towards ${brief.colours.join(', ')}.` : 'Applied a warm, neutral grade.',
  ]
  if (refinement) out.push(`Your refinement request was recorded: “${refinement}”. In live mode the image model applies it.`)
  else if (brief.explore.length) out.push(`In live mode the model would explore: ${brief.explore.slice(0, 4).join(', ')}.`)
  const extra = brief.keep.filter((k) => !/^(windows|doors)$/i.test(k)).map((k) => k.toLowerCase())
  out.push(`In live mode the prompt asks the model to keep the walls, windows, doors and camera angle${extra.length ? `, plus your ${extra.join(', ')}` : ''}.`)
  return out
}

export function createDemoBackend(): Backend {
  const listeners = new Set<(u: User | null) => void>()
  const urls = new Map<string, string>()
  const inFlight = new Set<string>()

  async function currentUser(): Promise<StoredUser | null> {
    const id = await get<string>('kv', 'session')
    if (!id) return null
    return (await get<StoredUser>('users', id)) ?? null
  }
  async function requireUser(): Promise<StoredUser> {
    const u = await currentUser()
    if (!u) throw new Error('Please sign in again.')
    return u
  }
  async function ownProject(id: string): Promise<Project> {
    const u = await requireUser()
    const p = await get<Project>('projects', id)
    if (!p || p.ownerId !== u.id) throw new Error('We couldn’t find that project.')
    return p
  }
  const emit = async () => {
    const u = await currentUser()
    listeners.forEach((l) => l(u ? publicUser(u) : null))
  }
  async function saveProject(p: Project): Promise<Project> {
    const next = { ...p, updatedAt: now() }
    await put('projects', p.id, next)
    return next
  }
  async function blob(path: string): Promise<Blob> {
    const b = await get<Blob>('blobs', path)
    if (!b) throw new Error('That image is no longer available.')
    return b
  }

  return {
    mode: 'demo',

    async getUser() {
      const u = await currentUser()
      return u ? publicUser(u) : null
    },
    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async signUp(email, password, displayName) {
      const users = await all<StoredUser>('users')
      const e = email.trim().toLowerCase()
      if (users.some((u) => u.email === e)) throw new Error('An account with that email already exists on this device. Try signing in.')
      const salt = uid()
      const u: StoredUser = { id: uid(), email: e, displayName: displayName.trim(), welcomed: false, salt, hash: await hashPassword(password, salt) }
      await put('users', u.id, u)
      await put('kv', 'session', u.id)
      await emit()
      return { needsConfirmation: false }
    },
    async signIn(email, password) {
      const users = await all<StoredUser>('users')
      const u = users.find((x) => x.email === email.trim().toLowerCase())
      if (!u || (await hashPassword(password, u.salt)) !== u.hash) throw new Error('That email and password don’t match. Check for typos, or reset your password.')
      await put('kv', 'session', u.id)
      await emit()
    },
    async signOut() {
      await del('kv', 'session')
      await emit()
    },
    async requestPasswordReset(email) {
      // No email can be sent in demo mode; remember which account may reset on this device.
      await put('kv', 'reset', email.trim().toLowerCase())
    },
    async updatePassword(password) {
      let u = await currentUser()
      if (!u) {
        const email = await get<string>('kv', 'reset')
        u = (await all<StoredUser>('users')).find((x) => x.email === email) ?? null
        if (!u) throw new Error('This reset link has expired. Please request a new one.')
      }
      u.salt = uid()
      u.hash = await hashPassword(password, u.salt)
      await put('users', u.id, u)
      await del('kv', 'reset')
      await put('kv', 'session', u.id)
      await emit()
    },
    async updateProfile(patch) {
      const u = await requireUser()
      const next = { ...u, ...patch }
      await put('users', u.id, next)
      await emit()
      return publicUser(next)
    },
    async deleteAccount() {
      const u = await requireUser()
      for (const p of (await all<Project>('projects')).filter((p) => p.ownerId === u.id)) await this.deleteProject(p.id)
      await del('users', u.id)
      await del('kv', 'session')
      await emit()
    },

    async listProjects() {
      const u = await requireUser()
      return (await all<Project>('projects'))
        .filter((p) => p.ownerId === u.id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    async getProject(id) {
      try {
        return await ownProject(id)
      } catch {
        return null
      }
    },
    async createProject(name, roomType) {
      const u = await requireUser()
      const p: Project = {
        id: uid(), ownerId: u.id, name, roomType, status: 'draft', photoPath: null, answers: {}, conversationStep: 0,
        conversationDone: false, inspiration: {}, inspirationDone: false, briefDraft: null, approvedBrief: null,
        currentConceptId: null, createdAt: now(), updatedAt: now(),
      }
      await put('projects', p.id, p)
      return p
    },
    async updateProject(id, patch: ProjectPatch) {
      return saveProject({ ...(await ownProject(id)), ...patch })
    },
    async deleteProject(id) {
      const p = await ownProject(id)
      const concepts = (await all<Concept>('concepts')).filter((c) => c.projectId === id)
      for (const c of concepts) {
        await del('blobs', c.imagePath)
        await del('concepts', c.id)
      }
      if (p.photoPath) await del('blobs', p.photoPath)
      await del('projects', id)
    },
    async uploadPhoto(projectId, b) {
      const p = await ownProject(projectId)
      if (p.photoPath) await del('blobs', p.photoPath)
      const path = `${p.ownerId}/${p.id}/original-${uid()}.jpg`
      await put('blobs', path, b)
      return saveProject({ ...p, photoPath: path, status: p.status === 'draft' ? 'photo_added' : p.status })
    },
    async removePhoto(projectId) {
      const p = await ownProject(projectId)
      if (p.photoPath) await del('blobs', p.photoPath)
      return saveProject({ ...p, photoPath: null, status: 'draft' })
    },
    async approveBrief(projectId, data, summary) {
      const p = await ownProject(projectId)
      const approved: ApprovedBrief = { version: (p.approvedBrief?.version ?? 0) + 1, data, summary, approvedAt: now() }
      await saveProject({ ...p, briefDraft: data, approvedBrief: approved, status: p.currentConceptId ? p.status : 'brief_ready' })
      return approved
    },

    async imageUrl(path) {
      const cached = urls.get(path)
      if (cached) return cached
      const url = URL.createObjectURL(await blob(path))
      urls.set(path, url)
      return url
    },

    async listConcepts(projectId) {
      const u = await requireUser()
      return (await all<Concept>('concepts'))
        .filter((c) => c.ownerId === u.id && (!projectId || c.projectId === projectId))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    },
    async updateConcept(id, patch) {
      const u = await requireUser()
      const c = await get<Concept>('concepts', id)
      if (!c || c.ownerId !== u.id) throw new Error('We couldn’t find that concept.')
      const next = { ...c, ...patch }
      await put('concepts', id, next)
      if (patch.saved !== undefined) {
        const p = await ownProject(c.projectId)
        const others = (await this.listConcepts(c.projectId)).some((x) => x.id !== id && x.saved)
        await saveProject({ ...p, status: patch.saved || others ? 'saved' : 'concept_ready' })
      }
      return next
    },
    async generateConcept(projectId, opts: GenerateOptions = {}) {
      const p = await ownProject(projectId)
      if (!p.approvedBrief) throw new GenerationError('no_brief')
      if (!p.photoPath) throw new GenerationError('unsupported_image', 'Add a room photo first.')
      if (inFlight.has(projectId)) throw new GenerationError('busy')
      const existing = await this.listConcepts(projectId)
      const refinements = existing.filter((c) => c.refinement).length
      if (opts.refinement && refinements >= MAX_REFINEMENTS) throw new GenerationError('refine_limit')
      const today = (await this.listConcepts()).filter((c) => Date.now() - Date.parse(c.createdAt) < 86_400_000)
      if (today.length >= DAILY_LIMIT) throw new GenerationError('quota')

      inFlight.add(projectId)
      const prevStatus = p.status
      await saveProject({ ...p, status: 'generating' })
      try {
        await sleep(DEMO_DELAY_MS)
        const brief = { ...p.approvedBrief.data, notes: [p.approvedBrief.data.notes, opts.refinement].filter(Boolean).join(' ') }
        const img = await renderDemoConcept(await blob(p.photoPath), brief, existing.length)
        const id = uid()
        const path = `${p.ownerId}/${p.id}/concept-${id}.jpg`
        await put('blobs', path, img)
        const c: Concept = {
          id, projectId, ownerId: p.ownerId, version: existing.length + 1, parentId: opts.parentId ?? null,
          briefVersion: p.approvedBrief.version, imagePath: path, refinement: opts.refinement ?? null,
          whatChanged: whatChangedDemo(p.approvedBrief.data, opts.refinement), source: 'demo', model: null,
          saved: false, fidelity: null, createdAt: now(),
        }
        await put('concepts', id, c)
        const latest = await ownProject(projectId)
        await saveProject({ ...latest, currentConceptId: id, status: existing.some((x) => x.saved) ? 'saved' : 'concept_ready' })
        return c
      } catch (e) {
        const latest = await ownProject(projectId)
        await saveProject({ ...latest, status: prevStatus })
        throw e
      } finally {
        inFlight.delete(projectId)
      }
    },
  }
}
