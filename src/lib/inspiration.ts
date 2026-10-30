import type { BriefData, Vote } from './types'

export type RefGroup = 'Colour' | 'Material' | 'Furniture' | 'Décor'

/**
 * A small, curated set of static references. Art is drawn in SVG by
 * <RefArt/> (original work, no licensing needed). Each reference maps to a
 * concrete brief change when liked or disliked.
 */
export interface Reference {
  id: string
  group: RefGroup
  title: string
  caption: string
  /** Styles this reference suits; used to order the board. */
  styles: string[]
  art: { kind: 'palette'; colours: string[] } | { kind: 'material'; material: string } | { kind: 'object'; object: string; colour: string }
  apply: { colours?: string[]; materials?: string[]; explore?: string[] }
}

export const REFERENCES: Reference[] = [
  {
    id: 'pal-sage-oat', group: 'Colour', title: 'Sage & oat', caption: 'Muted green with warm beige',
    styles: ['warm-contemporary', 'japandi', 'scandinavian'],
    art: { kind: 'palette', colours: ['#F1EADD', '#D9C7A8', '#8C9A7C', '#5E6B53'] },
    apply: { colours: ['muted green', 'beige'] },
  },
  {
    id: 'pal-clay-sun', group: 'Colour', title: 'Clay & sun', caption: 'Terracotta, mustard, cream',
    styles: ['indian-modern', 'boho', 'mid-century'],
    art: { kind: 'palette', colours: ['#F4EEE3', '#E1B866', '#B9694A', '#7A3E2A'] },
    apply: { colours: ['terracotta', 'mustard'] },
  },
  {
    id: 'pal-ink-stone', group: 'Colour', title: 'Ink & stone', caption: 'Charcoal with cool grey',
    styles: ['soft-industrial', 'classic'],
    art: { kind: 'palette', colours: ['#E9E7E3', '#A3A6A8', '#5B5E61', '#2C2D2F'] },
    apply: { colours: ['charcoal', 'grey'] },
  },
  {
    id: 'pal-teal-brass', group: 'Colour', title: 'Teal & brass', caption: 'Deep teal, warm metal',
    styles: ['indian-modern', 'classic', 'mid-century'],
    art: { kind: 'palette', colours: ['#EFE6D6', '#C9A24D', '#2F5D5E', '#1E3A3B'] },
    apply: { colours: ['deep teal'], materials: ['brass'] },
  },
  {
    id: 'mat-oak', group: 'Material', title: 'Pale oak', caption: 'Light, matte wood grain',
    styles: ['scandinavian', 'japandi', 'warm-contemporary'],
    art: { kind: 'material', material: 'oak' }, apply: { materials: ['light wood'] },
  },
  {
    id: 'mat-cane', group: 'Material', title: 'Woven cane', caption: 'Airy, handmade texture',
    styles: ['indian-modern', 'boho', 'japandi'],
    art: { kind: 'material', material: 'cane' }, apply: { materials: ['cane / rattan'] },
  },
  {
    id: 'mat-linen', group: 'Material', title: 'Washed linen', caption: 'Soft, relaxed fabric',
    styles: ['warm-contemporary', 'scandinavian', 'japandi'],
    art: { kind: 'material', material: 'linen' }, apply: { materials: ['linen'] },
  },
  {
    id: 'mat-terrazzo', group: 'Material', title: 'Terrazzo', caption: 'Speckled, durable surface',
    styles: ['mid-century', 'soft-industrial', 'indian-modern'],
    art: { kind: 'material', material: 'terrazzo' }, apply: { materials: ['terrazzo'] },
  },
  {
    id: 'fur-low-sofa', group: 'Furniture', title: 'Low, deep sofa', caption: 'Relaxed seating, soft arms',
    styles: ['japandi', 'warm-contemporary'],
    art: { kind: 'object', object: 'sofa', colour: '#D9C7A8' }, apply: { explore: ['a low, deep sofa or seating'] },
  },
  {
    id: 'fur-round-table', group: 'Furniture', title: 'Round coffee table', caption: 'No sharp corners',
    styles: ['scandinavian', 'mid-century', 'warm-contemporary'],
    art: { kind: 'object', object: 'table', colour: '#A9825A' }, apply: { explore: ['a round, soft-edged coffee table'] },
  },
  {
    id: 'dec-paper-lamp', group: 'Décor', title: 'Paper pendant', caption: 'Diffused, warm light',
    styles: ['japandi', 'scandinavian', 'boho'],
    art: { kind: 'object', object: 'lamp', colour: '#F4EEE3' }, apply: { explore: ['warm, diffused pendant lighting'] },
  },
  {
    id: 'dec-sheer-curtains', group: 'Décor', title: 'Sheer curtains', caption: 'Softens daylight',
    styles: ['warm-contemporary', 'classic', 'scandinavian'],
    art: { kind: 'object', object: 'curtain', colour: '#EDE3D2' }, apply: { explore: ['sheer, floor-length curtains'] },
  },
  {
    id: 'dec-plants', group: 'Décor', title: 'Easy greenery', caption: 'A few large plants',
    styles: ['boho', 'japandi', 'indian-modern'],
    art: { kind: 'object', object: 'plant', colour: '#6F7F63' }, apply: { explore: ['a few large, easy-care plants'] },
  },
  {
    id: 'dec-block-print', group: 'Décor', title: 'Block-print textiles', caption: 'Hand-printed cushions & throws',
    styles: ['indian-modern', 'boho'],
    art: { kind: 'object', object: 'cushion', colour: '#B9694A' }, apply: { explore: ['block-print cushions and throws'] },
  },
]

/** Pick ~10 references, those matching chosen styles first. */
export function boardFor(styles: string[]): Reference[] {
  const score = (r: Reference) => (styles.length ? r.styles.filter((s) => styles.includes(s)).length : 0)
  const sorted = [...REFERENCES].sort((a, b) => score(b) - score(a))
  return sorted.slice(0, 10)
}

const uniq = (xs: string[]) => Array.from(new Set(xs))
const without = (xs: string[], ys: string[]) => xs.filter((x) => !ys.includes(x))

/** Fold likes/dislikes into a brief. Dislikes win over earlier likes. */
export function applyVotes(brief: BriefData, votes: Record<string, Vote>): BriefData {
  const next = { ...brief }
  for (const ref of REFERENCES) {
    const v = votes[ref.id]
    if (!v) continue
    const { colours = [], materials = [], explore = [] } = ref.apply
    if (v === 'like') {
      next.colours = uniq([...next.colours, ...without(colours, next.avoidColours)])
      next.materials = uniq([...next.materials, ...without(materials, next.avoidMaterials)])
      next.explore = uniq([...next.explore, ...explore])
    } else {
      next.avoidColours = uniq([...next.avoidColours, ...colours])
      next.colours = without(next.colours, colours)
      next.avoidMaterials = uniq([...next.avoidMaterials, ...materials])
      next.materials = without(next.materials, materials)
      next.explore = without(next.explore, explore)
    }
  }
  return next
}
