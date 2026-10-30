import type { Answers } from './types'

export const ROOM_TYPES = [
  'Living room',
  'Bedroom',
  'Kitchen',
  'Dining room',
  'Kids room',
  'Home office',
  'Bathroom',
  'Balcony',
  'Other',
] as const

export interface Option {
  id: string
  label: string
  /** Colour hex for swatch chips. */
  swatch?: string
  hint?: string
}

export type QuestionKind = 'chips' | 'single' | 'styles' | 'twoSided'

export interface Question {
  id: string
  /** Short topic used in progress and the transcript. */
  topic: string
  kind: QuestionKind
  ask: (a: Answers, roomType: string) => string
  helper?: (a: Answers, roomType: string) => string | undefined
  options: (a: Answers, roomType: string) => Option[]
  /** For twoSided questions: label of each side. */
  sides?: [string, string]
  /** Pre-selected options derived from earlier answers so we never re-ask. */
  prefill?: (a: Answers) => string[]
  allowNote?: string
  maxChoices?: number
  allowUnsure?: boolean
}

const has = (a: Answers, q: string, id: string) => a[q]?.choices.includes(id) ?? false
const lower = (s: string) => s.toLowerCase()

const KEEP_BY_ROOM: Record<string, string[]> = {
  'Living room': ['Sofa', 'TV unit', 'Coffee table', 'Rug', 'Ceiling fan', 'Artwork'],
  Bedroom: ['Bed', 'Wardrobe', 'Side tables', 'Dressing table', 'Ceiling fan', 'Artwork'],
  Kitchen: ['Cabinets', 'Countertop', 'Appliances', 'Sink', 'Chimney / hood'],
  'Dining room': ['Dining table', 'Chairs', 'Crockery unit', 'Pendant light'],
  'Kids room': ['Bed', 'Study table', 'Wardrobe', 'Toy storage'],
  'Home office': ['Desk', 'Chair', 'Bookshelf', 'Storage'],
  Bathroom: ['Vanity', 'Tiles', 'Fixtures', 'Mirror'],
  Balcony: ['Railings', 'Planters', 'Seating'],
}
const KEEP_COMMON = ['Flooring', 'Windows', 'Doors', 'Ceiling', 'Wall colour']

export const STYLE_OPTIONS: Option[] = [
  { id: 'warm-contemporary', label: 'Warm contemporary', hint: 'Soft neutrals, clean lines, wood' },
  { id: 'japandi', label: 'Japandi', hint: 'Calm, low, natural, uncluttered' },
  { id: 'indian-modern', label: 'Modern Indian', hint: 'Cane, brass, block-print, rich accents' },
  { id: 'scandinavian', label: 'Scandinavian', hint: 'Light, airy, pale wood, cosy textiles' },
  { id: 'mid-century', label: 'Mid-century', hint: 'Tapered legs, walnut, warm colour' },
  { id: 'soft-industrial', label: 'Soft industrial', hint: 'Concrete, black metal, leather' },
  { id: 'classic', label: 'Classic', hint: 'Mouldings, symmetry, timeless' },
  { id: 'boho', label: 'Relaxed boho', hint: 'Layers, plants, rattan, pattern' },
]

export const COLOUR_OPTIONS: Option[] = [
  { id: 'warm white', label: 'Warm white', swatch: '#F4EEE3' },
  { id: 'beige', label: 'Beige', swatch: '#D9C7A8' },
  { id: 'muted green', label: 'Muted green', swatch: '#8C9A7C' },
  { id: 'terracotta', label: 'Terracotta', swatch: '#B9694A' },
  { id: 'charcoal', label: 'Charcoal', swatch: '#3A3836' },
  { id: 'dusty blue', label: 'Dusty blue', swatch: '#8AA0AE' },
  { id: 'mustard', label: 'Mustard', swatch: '#C99A3B' },
  { id: 'blush', label: 'Blush', swatch: '#DDB7A8' },
  { id: 'deep teal', label: 'Deep teal', swatch: '#2F5D5E' },
  { id: 'bright white', label: 'Bright white', swatch: '#FFFFFF' },
  { id: 'grey', label: 'Cool grey', swatch: '#A3A6A8' },
  { id: 'black', label: 'Black', swatch: '#1E1E1E' },
]

export const MATERIAL_OPTIONS: Option[] = [
  { id: 'light wood', label: 'Light wood' },
  { id: 'walnut', label: 'Walnut' },
  { id: 'cane / rattan', label: 'Cane & rattan' },
  { id: 'linen', label: 'Linen' },
  { id: 'brass', label: 'Brass' },
  { id: 'black metal', label: 'Black metal' },
  { id: 'marble', label: 'Marble' },
  { id: 'terrazzo', label: 'Terrazzo' },
  { id: 'velvet', label: 'Velvet' },
  { id: 'jute', label: 'Jute' },
]

export const QUESTIONS: Question[] = [
  {
    id: 'household',
    topic: 'Who uses it',
    kind: 'chips',
    ask: (_a, room) =>
      `Let's start with the people. Who spends time in this ${lower(room)}?`,
    helper: () => 'Pick all that apply — it helps us plan for wear, storage and comfort.',
    options: () => [
      { id: 'Just me', label: 'Just me' },
      { id: 'A couple', label: 'A couple' },
      { id: 'Young children', label: 'Young children' },
      { id: 'Teenagers', label: 'Teenagers' },
      { id: 'Older parents', label: 'Older parents' },
      { id: 'Pets', label: 'Pets' },
      { id: 'Guests often', label: 'Guests often' },
    ],
    allowUnsure: false,
  },
  {
    id: 'goals',
    topic: 'What to improve',
    kind: 'chips',
    ask: (a) => {
      const kids = has(a, 'household', 'Young children')
      return kids
        ? 'Got it — a room that works for little ones too. What bothers you most about it right now?'
        : 'Thanks. What would you most like to change about how the room feels?'
    },
    helper: () => 'Choose up to three, or add your own words.',
    options: () => [
      { id: 'Feels cramped', label: 'Feels cramped' },
      { id: 'Too dark', label: 'Too dark' },
      { id: 'Looks dated', label: 'Looks dated' },
      { id: 'Cluttered, needs storage', label: 'Needs storage' },
      { id: "Doesn't feel like us", label: "Doesn't feel like us" },
      { id: 'Not cosy enough', label: 'Not cosy enough' },
      { id: 'Hard to keep clean', label: 'Hard to keep clean' },
      { id: 'Layout does not work', label: 'Layout doesn’t work' },
    ],
    maxChoices: 3,
    allowNote: 'Anything else? (optional)',
    allowUnsure: true,
  },
  {
    id: 'styles',
    topic: 'Style',
    kind: 'styles',
    ask: () =>
      "You don't need design words for this. Which of these rooms would you be happy to walk into?",
    helper: () => 'Choose up to two. If none feel right, choose "I’m not sure" and we’ll use the inspiration board.',
    options: () => STYLE_OPTIONS,
    maxChoices: 2,
    allowUnsure: true,
  },
  {
    id: 'keep',
    topic: 'Must stay',
    kind: 'chips',
    ask: (_a, room) =>
      `What in your ${lower(room)} should stay exactly as it is? We'll ask the image model to keep these.`,
    helper: () => 'Image generation can still alter small details — you’ll be able to check and refine.',
    options: (_a, room) =>
      [...(KEEP_BY_ROOM[room] ?? []), ...KEEP_COMMON].map((k) => ({ id: k, label: k })),
    prefill: () => ['Windows', 'Doors'],
    allowNote: 'Something else to keep? (optional)',
    allowUnsure: true,
  },
  {
    id: 'colours',
    topic: 'Colours',
    kind: 'twoSided',
    sides: ['Love', 'Avoid'],
    ask: (a) => {
      const styles = a.styles?.choices ?? []
      return styles.length
        ? 'Nice choice. Now colours — tap the ones you love, then switch to “Avoid” for any you don’t want.'
        : 'Let’s try colours instead — tap the ones you love, then switch to “Avoid” for any you don’t want.'
    },
    options: () => COLOUR_OPTIONS,
    allowUnsure: true,
  },
  {
    id: 'materials',
    topic: 'Materials',
    kind: 'twoSided',
    sides: ['Love', 'Avoid'],
    ask: () => 'And materials or finishes? Same idea: what draws you in, and what would you rather skip?',
    options: () => MATERIAL_OPTIONS,
    allowUnsure: true,
  },
  {
    id: 'practical',
    topic: 'Practical needs',
    kind: 'chips',
    ask: (a) => {
      const notes: string[] = []
      if (has(a, 'household', 'Young children')) notes.push('children')
      if (has(a, 'household', 'Pets')) notes.push('pets')
      if (has(a, 'household', 'Older parents')) notes.push('older parents')
      return notes.length
        ? `You mentioned ${notes.join(' and ')}, so I’ve ticked a few things. Anything else practical we should plan for?`
        : 'Any practical needs we should plan for?'
    },
    options: () => [
      { id: 'Child-safe edges and finishes', label: 'Child-safe' },
      { id: 'Pet-friendly fabrics', label: 'Pet-friendly fabrics' },
      { id: 'Easy-care, wipeable surfaces', label: 'Easy to clean' },
      { id: 'Step-free, easy to move around', label: 'Easy access / mobility' },
      { id: 'More storage', label: 'More storage' },
      { id: 'Better lighting for work or reading', label: 'Task lighting' },
      { id: 'Low maintenance plants only', label: 'Low-maintenance plants' },
    ],
    prefill: (a) => {
      const out: string[] = []
      if (has(a, 'household', 'Young children')) out.push('Child-safe edges and finishes')
      if (has(a, 'household', 'Pets')) out.push('Pet-friendly fabrics')
      if (has(a, 'household', 'Older parents')) out.push('Step-free, easy to move around')
      if (has(a, 'goals', 'Hard to keep clean')) out.push('Easy-care, wipeable surfaces')
      if (has(a, 'goals', 'Cluttered, needs storage')) out.push('More storage')
      return out
    },
    allowNote: 'Anything else? (optional)',
    allowUnsure: true,
  },
  {
    id: 'scale',
    topic: 'Scale of change',
    kind: 'single',
    ask: (a) =>
      has(a, 'goals', 'Looks dated')
        ? 'Since it feels dated, how big a change are you open to?'
        : 'How big a change are you open to?',
    options: () => [
      { id: 'Light refresh', label: 'Light refresh', hint: 'Soft furnishings, décor, lighting' },
      { id: 'Moderate update', label: 'Moderate update', hint: 'Plus paint, some furniture, curtains' },
      { id: 'Full makeover', label: 'Full makeover', hint: 'New furniture and finishes, keeping the structure' },
    ],
    allowUnsure: true,
  },
  {
    id: 'budget',
    topic: 'Budget',
    kind: 'single',
    ask: () =>
      'Last one. Roughly what budget feels comfortable? It only guides how ambitious the concept is.',
    options: () => [
      { id: 'Under ₹50,000', label: 'Under ₹50k' },
      { id: '₹50,000–1.5 lakh', label: '₹50k–1.5L' },
      { id: '₹1.5–3 lakh', label: '₹1.5–3L' },
      { id: '₹3–5 lakh', label: '₹3–5L' },
      { id: 'Over ₹5 lakh', label: '₹5L+' },
    ],
    allowUnsure: true,
  },
]

export function summariseAnswer(q: Question, a: Answers): string {
  const ans = a[q.id]
  if (!ans) return ''
  if (ans.skipped) return 'Skipped'
  if (ans.unsure && !ans.choices.length) return 'I’m not sure yet'
  const label = (id: string) => q.options(a, '').find((o) => o.id === id)?.label ?? id
  const parts: string[] = []
  if (ans.choices.length) parts.push(ans.choices.map(label).join(', '))
  if (ans.avoid?.length) parts.push(`avoid ${ans.avoid.map(label).join(', ')}`)
  if (ans.note?.trim()) parts.push(`“${ans.note.trim()}”`)
  return parts.join(' · ') || 'No preference'
}
