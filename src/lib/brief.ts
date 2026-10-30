import { STYLE_OPTIONS } from './conversation'
import { applyVotes } from './inspiration'
import type { Answers, BriefData, Project } from './types'

const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean)))
const pick = (a: Answers, id: string) => a[id]?.choices ?? []
const note = (a: Answers, id: string) => a[id]?.note?.trim() ?? ''

const EXPLORE_BY_GOAL: Record<string, string[]> = {
  'Feels cramped': ['lighter, smaller-scale furniture'],
  'Too dark': ['layered lighting', 'lighter wall colour'],
  'Looks dated': ['wall colour', 'soft furnishings'],
  'Cluttered, needs storage': ['built-in or closed storage'],
  "Doesn't feel like us": ['décor and artwork'],
  'Not cosy enough': ['rugs, cushions and warm lighting'],
  'Hard to keep clean': ['easy-care fabrics and finishes'],
  'Layout does not work': ['furniture arrangement'],
}
const EXPLORE_BY_SCALE: Record<string, string[]> = {
  'Light refresh': ['curtains', 'cushions and throws', 'lighting', 'décor'],
  'Moderate update': ['wall colour', 'curtains', 'lighting', 'a few loose furniture pieces'],
  'Full makeover': ['loose furniture', 'wall finishes', 'lighting', 'curtains and textiles'],
}

export function styleLabels(ids: string[]): string[] {
  return ids.map((id) => STYLE_OPTIONS.find((s) => s.id === id)?.label ?? id)
}

/** Build a draft brief from conversation answers (and inspiration votes). */
export function composeBrief(p: Pick<Project, 'answers' | 'roomType' | 'inspiration'>): BriefData {
  const a = p.answers
  const keep = uniq([...pick(a, 'keep'), ...(note(a, 'keep') ? [note(a, 'keep')] : [])])
  const keepLower = keep.map((k) => k.toLowerCase())
  const scale = a.scale?.choices[0] ?? ''
  const explore = uniq([
    ...pick(a, 'goals').flatMap((g) => EXPLORE_BY_GOAL[g] ?? []),
    ...(EXPLORE_BY_SCALE[scale] ?? EXPLORE_BY_SCALE['Moderate update']),
  ]).filter((e) => !keepLower.some((k) => e.toLowerCase().includes(k)))

  const base: BriefData = {
    roomType: p.roomType,
    household: pick(a, 'household'),
    goals: uniq([...pick(a, 'goals'), ...(note(a, 'goals') ? [note(a, 'goals')] : [])]),
    styles: styleLabels(pick(a, 'styles')),
    colours: pick(a, 'colours'),
    avoidColours: a.colours?.avoid ?? [],
    materials: pick(a, 'materials'),
    avoidMaterials: a.materials?.avoid ?? [],
    keep,
    explore,
    practical: uniq([...pick(a, 'practical'), ...(note(a, 'practical') ? [note(a, 'practical')] : [])]),
    scale,
    budget: a.budget?.choices[0] ?? '',
    notes: '',
  }
  return applyVotes(base, p.inspiration)
}

const join = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

function householdPhrase(h: string[]): string {
  if (h.includes('Young children') || h.includes('Teenagers')) return 'Family'
  if (h.includes('A couple')) return 'Shared'
  if (h.includes('Just me')) return 'Personal'
  return ''
}

/** Plain-language summary, e.g. "Family living room. Warm contemporary style, ..." */
export function briefSummary(b: BriefData): string {
  const s: string[] = []
  const who = householdPhrase(b.household)
  s.push(`${who ? `${who} ${b.roomType.toLowerCase()}` : b.roomType}.`)

  const look: string[] = []
  if (b.styles.length) look.push(`${join(b.styles)} style`)
  if (b.colours.length) look.push(join(b.colours))
  if (b.materials.length) look.push(`${join(b.materials)} finishes`)
  const practical = b.practical.map((p) => p.toLowerCase())
  if (practical.length) look.push(join(practical))
  if (look.length) s.push(`${cap(look.join(', '))}.`)

  if (b.avoidColours.length || b.avoidMaterials.length) {
    s.push(`Avoid ${join([...b.avoidColours, ...b.avoidMaterials])}.`)
  }
  if (b.keep.length) s.push(`Keep the existing ${join(b.keep.map((k) => k.toLowerCase()))}.`)
  if (b.explore.length) s.push(`Explore ${join(b.explore)}.`)
  if (b.scale) s.push(`${b.scale}.`)
  if (b.budget) s.push(`Budget preference: ${b.budget}.`)
  if (b.notes.trim()) s.push(b.notes.trim())
  return s.join(' ')
}

/** Shallow equality on brief content, to know if a draft differs from the approved version. */
export function sameBrief(a: BriefData | null, b: BriefData | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
