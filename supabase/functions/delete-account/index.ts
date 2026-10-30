// delete-account: removes the caller's photos, concepts, projects and auth user.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cors, fail, json } from '../_shared/http.ts'

const BUCKET = 'room-photos'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return fail(405, 'unknown', 'Method not allowed')

  const url = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data } = await userClient.auth.getUser()
  if (!data.user) return fail(401, 'unknown', 'Please sign in again.')
  const uid = data.user.id
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Storage objects are not removed by cascades, so delete them first.
  const { data: projects } = await admin.from('projects').select('id').eq('owner_id', uid)
  for (const p of projects ?? []) {
    const prefix = `${uid}/${p.id}`
    const { data: files } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000 })
    if (files?.length) await admin.storage.from(BUCKET).remove(files.map((f) => `${prefix}/${f.name}`))
  }

  // Deleting the auth user cascades to profiles, projects, briefs and concepts.
  const { error } = await admin.auth.admin.deleteUser(uid)
  if (error) {
    console.error('delete_user_failed')
    return fail(500, 'unknown', 'We couldn’t delete the account.')
  }
  return json({ ok: true })
})
