import { createDemoBackend } from './demo'
import { createSupabaseBackend } from './supabase'
import type { Backend } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Live mode when Supabase is configured; otherwise a local, clearly labelled demo. */
export const backend: Backend = url && key ? createSupabaseBackend(url, key) : createDemoBackend()
export const isDemo = backend.mode === 'demo'
export type { Backend } from './types'
