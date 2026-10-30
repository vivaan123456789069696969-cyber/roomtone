/**
 * Supabase backend: Auth, Postgres (row-level security) and a private
 * Storage bucket. Image generation runs in the `generate-concept` edge
 * function so provider keys never reach the browser.
 */
import { createClient, FunctionsHttpError, type SupabaseClient, type User as SbUser } from '@supabase/supabase-js'
import { GenerationError, type ApprovedBrief, type Concept, type GenErrorCode, type Project, type User } from '../types'
import type { Backend, ProjectPatch } from './types'

const BUCKET = 'room-photos'
const SIGNED_URL_TTL = 60 * 60

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

const toProject = (r: Row): Project => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  roomType: r.room_type,
  status: r.status,
  photoPath: r.photo_path,
  answers: r.answers ?? {},
  conversationStep: r.conversation_step ?? 0,
  conversationDone: r.conversation_done ?? false,
  inspiration: r.inspiration ?? {},
  inspirationDone: r.inspiration_done ?? false,
  briefDraft: r.brief_draft,
  approvedBrief: r.approved_brief,
  currentConceptId: r.current_concept_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const PATCH_COLUMNS: Record<keyof ProjectPatch, string> = {
  name: 'name',
  roomType: 'room_type',
  status: 'status',
  answers: 'answers',
  conversationStep: 'conversation_step',
  conversationDone: 'conversation_done',
  inspiration: 'inspiration',
  inspirationDone: 'inspiration_done',
  briefDraft: 'brief_draft',
  currentConceptId: 'current_concept_id',
}

const toConcept = (r: Row): Concept => ({
  id: r.id,
  projectId: r.project_id,
  ownerId: r.owner_id,
  version: r.version,
  parentId: r.parent_id,
  briefVersion: r.brief_version,
  imagePath: r.image_path,
  refinement: r.refinement,
  whatChanged: r.what_changed ?? [],
  source: r.source,
  model: r.model,
  saved: r.saved,
  fidelity: r.fidelity,
  createdAt: r.created_at,
})

function friendlyAuthError(e: { message?: string; code?: string } | null): Error {
  const m = e?.message ?? ''
  if (/invalid login credentials/i.test(m)) return new Error('That email and password don’t match. Check for typos, or reset your password.')
  if (/email not confirmed/i.test(m)) return new Error('Please confirm your email first — check your inbox for the link we sent.')
  if (/already registered|already exists/i.test(m)) return new Error('An account with that email already exists. Try signing in.')
  if (/rate limit/i.test(m)) return new Error('Too many attempts. Please wait a minute and try again.')
  if (/password/i.test(m)) return new Error(m)
  return new Error(m || 'Something went wrong. Please try again.')
}

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  })
  const signed = new Map<string, { url: string; exp: number }>()

  async function profileFor(u: SbUser): Promise<User> {
    const { data } = await sb.from('profiles').select('display_name, welcomed').eq('id', u.id).maybeSingle()
    return {
      id: u.id,
      email: u.email ?? '',
      displayName: data?.display_name ?? (u.user_metadata?.display_name as string) ?? '',
      welcomed: data?.welcomed ?? false,
    }
  }
  async function uidOrThrow(): Promise<string> {
    const { data } = await sb.auth.getUser()
    if (!data.user) throw new Error('Please sign in again.')
    return data.user.id
  }
  // Callers that use maybeSingle() still null-check the result.
  const check = <T>(r: { data: T; error: { message: string } | null }): NonNullable<T> => {
    if (r.error) throw new Error(r.error.message)
    return r.data as NonNullable<T>
  }

  return {
    mode: 'supabase',

    async getUser() {
      const { data } = await sb.auth.getSession()
      return data.session ? profileFor(data.session.user) : null
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        // Defer: calling Supabase inside this callback can deadlock the auth lock.
        setTimeout(async () => cb(session ? await profileFor(session.user) : null), 0)
      })
      return () => data.subscription.unsubscribe()
    },
    async signUp(email, password, displayName) {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName }, emailRedirectTo: `${location.origin}/welcome` },
      })
      if (error) throw friendlyAuthError(error)
      return { needsConfirmation: !data.session }
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw friendlyAuthError(error)
    },
    async signOut() {
      await sb.auth.signOut()
      signed.clear()
    },
    async requestPasswordReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` })
      if (error) throw friendlyAuthError(error)
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password })
      if (error) throw friendlyAuthError(error)
    },
    async updateProfile(patch) {
      const id = await uidOrThrow()
      const row: Row = { id }
      if (patch.displayName !== undefined) row.display_name = patch.displayName
      if (patch.welcomed !== undefined) row.welcomed = patch.welcomed
      check(await sb.from('profiles').upsert(row))
      const { data } = await sb.auth.getUser()
      return profileFor(data.user!)
    },
    async deleteAccount() {
      const { error } = await sb.functions.invoke('delete-account', { method: 'POST' })
      if (error) throw new Error('We couldn’t delete your account just now. Please try again, or contact us.')
      await sb.auth.signOut()
    },

    async listProjects() {
      const rows = check(await sb.from('projects').select('*').order('updated_at', { ascending: false }))
      return (rows ?? []).map(toProject)
    },
    async getProject(id) {
      const r = check(await sb.from('projects').select('*').eq('id', id).maybeSingle())
      return r ? toProject(r) : null
    },
    async createProject(name, roomType) {
      const owner_id = await uidOrThrow()
      return toProject(check(await sb.from('projects').insert({ owner_id, name, room_type: roomType }).select().single()))
    },
    async updateProject(id, patch) {
      const row: Row = {}
      for (const [k, v] of Object.entries(patch)) row[PATCH_COLUMNS[k as keyof ProjectPatch]] = v
      return toProject(check(await sb.from('projects').update(row).eq('id', id).select().single()))
    },
    async deleteProject(id) {
      const owner = await uidOrThrow()
      const prefix = `${owner}/${id}`
      const { data: files } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 })
      if (files?.length) await sb.storage.from(BUCKET).remove(files.map((f) => `${prefix}/${f.name}`))
      check(await sb.from('projects').delete().eq('id', id))
    },
    async uploadPhoto(projectId, blob) {
      const owner = await uidOrThrow()
      const current = await this.getProject(projectId)
      const path = `${owner}/${projectId}/original-${crypto.randomUUID()}.jpg`
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (error) throw new Error('The upload didn’t finish. Check your connection and try again.')
      if (current?.photoPath) await sb.storage.from(BUCKET).remove([current.photoPath])
      const status = !current || current.status === 'draft' ? 'photo_added' : current.status
      return toProject(check(await sb.from('projects').update({ photo_path: path, status }).eq('id', projectId).select().single()))
    },
    async removePhoto(projectId) {
      const current = await this.getProject(projectId)
      if (current?.photoPath) await sb.storage.from(BUCKET).remove([current.photoPath])
      return toProject(check(await sb.from('projects').update({ photo_path: null, status: 'draft' }).eq('id', projectId).select().single()))
    },
    async approveBrief(projectId, data, summary) {
      const r = check(await sb.rpc('approve_brief', { p_project: projectId, p_data: data, p_summary: summary }))
      return r as ApprovedBrief
    },

    async imageUrl(path) {
      const hit = signed.get(path)
      if (hit && hit.exp > Date.now() + 60_000) return hit.url
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
      if (error || !data) throw new Error('That image is no longer available.')
      signed.set(path, { url: data.signedUrl, exp: Date.now() + SIGNED_URL_TTL * 1000 })
      return data.signedUrl
    },

    async listConcepts(projectId) {
      let q = sb.from('concepts').select('*').order('created_at', { ascending: true })
      if (projectId) q = q.eq('project_id', projectId)
      return (check(await q) ?? []).map(toConcept)
    },
    async updateConcept(id, patch) {
      const row: Row = {}
      if (patch.saved !== undefined) row.saved = patch.saved
      if (patch.fidelity !== undefined) row.fidelity = patch.fidelity
      const c = toConcept(check(await sb.from('concepts').update(row).eq('id', id).select().single()))
      if (patch.saved !== undefined) {
        const { count } = await sb.from('concepts').select('id', { count: 'exact', head: true }).eq('project_id', c.projectId).eq('saved', true)
        await sb.from('projects').update({ status: count ? 'saved' : 'concept_ready' }).eq('id', c.projectId)
      }
      return c
    },
    async generateConcept(projectId, opts = {}) {
      const { data, error } = await sb.functions.invoke('generate-concept', {
        body: { projectId, refinement: opts.refinement ?? null, parentId: opts.parentId ?? null },
      })
      if (error) {
        let code: GenErrorCode = 'network'
        let message: string | undefined
        if (error instanceof FunctionsHttpError) {
          try {
            const body = await error.context.json()
            code = body.code ?? 'unknown'
            message = body.message
          } catch {
            code = 'unknown'
          }
        }
        throw new GenerationError(code, message)
      }
      return toConcept(data.concept)
    },
  }
}
