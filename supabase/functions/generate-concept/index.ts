// generate-concept: turns the approved brief + the user's room photo (or the
// latest concept, for refinements) into a new concept version.
//
// Secrets: GEMINI_API_KEY (required for live generation).
// Config:  GEMINI_IMAGE_MODEL, DAILY_GENERATION_LIMIT, ALLOWED_ORIGIN.
// Never logs photos, prompts or personal data — only error codes.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { encodeBase64, decodeBase64 } from 'jsr:@std/encoding@1/base64'
import { buildConceptPrompt, type BriefLike } from '../_shared/prompt.ts'
import { cors, fail, json } from '../_shared/http.ts'

const BUCKET = 'room-photos'
const MODEL = Deno.env.get('GEMINI_IMAGE_MODEL') ?? 'gemini-3.1-flash-image'
const DAILY_LIMIT = Number(Deno.env.get('DAILY_GENERATION_LIMIT') ?? '12')
const MAX_REFINEMENTS = 3
const TIMEOUT_MS = 110_000
const LOCK_STALE_MS = 3 * 60_000
const API = 'https://generativelanguage.googleapis.com/v1beta/interactions'

type Found = { images: { data: string; mime: string }[]; texts: string[]; blocked: boolean }

/** The response shape differs across API versions; collect image/text blocks wherever they are. */
function collect(node: unknown, out: Found = { images: [], texts: [], blocked: false }): Found {
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, out))
  } else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>
    const inline = (o.inlineData ?? o.inline_data) as Record<string, string> | undefined
    if (inline?.data) out.images.push({ data: inline.data, mime: inline.mimeType ?? inline.mime_type ?? 'image/png' })
    else if (o.type === 'image' && typeof o.data === 'string') out.images.push({ data: o.data, mime: String(o.mime_type ?? 'image/png') })
    if (typeof o.text === 'string' && (o.type === 'text' || !('type' in o))) out.texts.push(o.text)
    if (/SAFETY|BLOCK|PROHIBITED/i.test(String(o.finishReason ?? o.finish_reason ?? o.blockReason ?? ''))) out.blocked = true
    for (const [k, v] of Object.entries(o)) if (k !== 'inlineData' && k !== 'inline_data') collect(v, out)
  }
  return out
}

function parseChanges(texts: string[]): string[] {
  return texts
    .join('\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[-•*]\s+/.test(l))
    .map((l) => l.replace(/^[-•*]\s+/, ''))
    .slice(0, 6)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return fail(405, 'unknown', 'Method not allowed')

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return fail(503, 'model_unavailable', 'Image generation is not configured on this server yet.')

  const authHeader = req.headers.get('Authorization') ?? ''
  const url = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: auth } = await userClient.auth.getUser()
  const user = auth.user
  if (!user) return fail(401, 'unknown', 'Please sign in again.')

  let body: { projectId?: string; refinement?: string | null; parentId?: string | null }
  try {
    body = await req.json()
  } catch {
    return fail(400, 'unknown', 'Bad request')
  }
  const refinement = body.refinement?.trim() || null
  if (refinement && refinement.length > 400) return fail(400, 'unknown', 'Please keep the refinement under 400 characters.')
  if (!body.projectId || !/^[0-9a-f-]{36}$/i.test(body.projectId)) return fail(400, 'unknown', 'Bad request')

  // RLS: the user client can only read the caller's own project.
  const { data: project } = await userClient.from('projects').select('*').eq('id', body.projectId).maybeSingle()
  if (!project) return fail(404, 'unknown', 'Project not found')
  if (!project.approved_brief) return fail(409, 'no_brief', 'Approve the design brief first.')
  if (!project.photo_path) return fail(409, 'unsupported_image', 'Add a room photo first.')

  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count: today } = await admin.from('concepts').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).gte('created_at', since)
  if ((today ?? 0) >= DAILY_LIMIT) return fail(429, 'quota', `You’ve reached today’s limit of ${DAILY_LIMIT} concepts. Please try again tomorrow.`)

  const { data: existing } = await admin.from('concepts').select('id, version, refinement, image_path, saved').eq('project_id', project.id).order('version')
  const concepts = existing ?? []
  if (refinement && concepts.filter((c) => c.refinement).length >= MAX_REFINEMENTS) {
    return fail(409, 'refine_limit', 'You’ve used all refinement rounds for this project.')
  }
  const parent = refinement ? concepts.find((c) => c.id === body.parentId) ?? concepts.at(-1) : null
  if (refinement && !parent) return fail(409, 'unknown', 'Generate a first concept before refining.')

  // Lock: only one generation per project at a time (protects against double clicks and retries).
  const stale = new Date(Date.now() - LOCK_STALE_MS).toISOString()
  const prevStatus = project.status === 'generating' ? (concepts.length ? 'concept_ready' : 'brief_ready') : project.status
  const { data: locked } = await admin
    .from('projects')
    .update({ generation_started_at: new Date().toISOString(), status: 'generating' })
    .eq('id', project.id)
    .or(`generation_started_at.is.null,generation_started_at.lt.${stale}`)
    .select('id')
  if (!locked?.length) return fail(409, 'busy', 'A concept is already being created for this room.')

  const release = (patch: Record<string, unknown> = {}) =>
    admin.from('projects').update({ generation_started_at: null, status: prevStatus, ...patch }).eq('id', project.id)

  try {
    const sourcePath = parent ? parent.image_path : project.photo_path
    const { data: src, error: dlErr } = await admin.storage.from(BUCKET).download(sourcePath)
    if (dlErr || !src) {
      await release()
      return fail(409, 'unsupported_image', 'We couldn’t read the source photo. Try uploading it again.')
    }
    const imageB64 = encodeBase64(new Uint8Array(await src.arrayBuffer()))
    const prompt = buildConceptPrompt(project.approved_brief.data as BriefLike, refinement)

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(API, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          input: [
            { type: 'text', text: prompt },
            { type: 'image', mime_type: src.type || 'image/jpeg', data: imageB64 },
          ],
        }),
      })
    } catch (e) {
      await release()
      if ((e as Error).name === 'AbortError') return fail(504, 'timeout', 'The image model took too long to respond.')
      return fail(502, 'provider', 'We couldn’t reach the image model.')
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      await release()
      const text = await res.text()
      console.error('provider_error', res.status)
      if (res.status === 429) {
        return /quota|billing|exhaust/i.test(text)
          ? fail(429, 'quota', 'The image service has reached its usage quota.')
          : fail(429, 'rate_limited', 'The image service is busy.')
      }
      if (res.status === 404) return fail(503, 'model_unavailable', `The image model “${MODEL}” isn’t available.`)
      if (res.status === 400 && /image|mime|size/i.test(text)) return fail(422, 'unsupported_image', 'The image model couldn’t use this photo.')
      if (res.status === 400 && /safety|block/i.test(text)) return fail(422, 'blocked', 'The image model declined this request.')
      return fail(502, 'provider', 'The image service returned an error.')
    }

    const found = collect(await res.json())
    const img = found.images.at(-1)
    if (!img) {
      await release()
      return found.blocked
        ? fail(422, 'blocked', 'The image model declined this photo or request.')
        : fail(502, 'provider', 'The image model didn’t return an image.')
    }

    const conceptId = crypto.randomUUID()
    const ext = img.mime.includes('jpeg') ? 'jpg' : img.mime.includes('webp') ? 'webp' : 'png'
    const path = `${user.id}/${project.id}/concept-${conceptId}.${ext}`
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, decodeBase64(img.data), { contentType: img.mime })
    if (upErr) {
      await release()
      return fail(500, 'provider', 'We couldn’t save the new concept.')
    }

    const changes = parseChanges(found.texts)
    const { data: concept, error: insErr } = await admin
      .from('concepts')
      .insert({
        id: conceptId,
        project_id: project.id,
        owner_id: user.id,
        version: (concepts.at(-1)?.version ?? 0) + 1,
        parent_id: parent?.id ?? null,
        brief_version: project.approved_brief.version,
        image_path: path,
        refinement,
        what_changed: changes.length ? changes : ['The model didn’t describe its changes. Compare the images to see what changed.'],
        source: 'ai',
        model: MODEL,
      })
      .select()
      .single()
    if (insErr) {
      await admin.storage.from(BUCKET).remove([path])
      await release()
      return fail(500, 'unknown', 'We couldn’t save the new concept.')
    }

    await release({ current_concept_id: conceptId, status: concepts.some((c) => c.saved) ? 'saved' : 'concept_ready' })
    return json({ concept })
  } catch (e) {
    console.error('generate_failed', (e as Error).name)
    await release()
    return fail(500, 'unknown', 'Something went wrong while creating the concept.')
  }
})
