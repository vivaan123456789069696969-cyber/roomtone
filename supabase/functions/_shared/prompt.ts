// Shared between the browser (preview of what will be sent) and the
// generate-concept edge function (what is actually sent). Keep dependency-free.

export interface BriefLike {
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

const list = (xs: string[]) => xs.filter(Boolean).join(', ')

/** Fixed elements we always ask the model to preserve, whatever the brief says. */
export const ALWAYS_PRESERVE = [
  'the room geometry, wall positions and ceiling height',
  'every window and door: position, size and shape',
  'the camera position, lens and perspective of the photo',
]

export function buildConceptPrompt(brief: BriefLike, refinement?: string | null): string {
  const keep = brief.keep.length ? brief.keep : []
  const lines: string[] = []

  if (refinement) {
    lines.push(
      'Edit this interior photo, which is an earlier makeover concept, by applying ONLY the following change requested by the homeowner:',
      `"${refinement.trim()}"`,
      'Leave everything else in the image as it is.',
    )
  } else {
    lines.push(
      `Redesign the interior shown in this photo of a ${brief.roomType.toLowerCase()} as a realistic, photographic makeover concept.`,
    )
  }

  lines.push('', 'PRESERVE (highest priority — do not move, remove, resize or restyle):')
  for (const p of ALWAYS_PRESERVE) lines.push(`- ${p}`)
  for (const k of keep) lines.push(`- the existing ${k.toLowerCase()}`)

  if (!refinement) {
    lines.push('', 'DESIGN DIRECTION:')
    if (brief.styles.length) lines.push(`- Style: ${list(brief.styles)}`)
    if (brief.colours.length) lines.push(`- Colours to use: ${list(brief.colours)}`)
    if (brief.avoidColours.length) lines.push(`- Colours to avoid: ${list(brief.avoidColours)}`)
    if (brief.materials.length) lines.push(`- Materials and finishes: ${list(brief.materials)}`)
    if (brief.avoidMaterials.length) lines.push(`- Materials to avoid: ${list(brief.avoidMaterials)}`)
    if (brief.explore.length) lines.push(`- Change or add: ${list(brief.explore)}`)
    if (brief.goals.length) lines.push(`- The room should solve: ${list(brief.goals)}`)
    if (brief.practical.length) lines.push(`- Practical needs: ${list(brief.practical)}`)
    if (brief.scale) lines.push(`- Scale of change: ${brief.scale}`)
    if (brief.budget) lines.push(`- Keep choices plausible for a budget of ${brief.budget}`)
    if (brief.notes.trim()) lines.push(`- Homeowner notes: ${brief.notes.trim()}`)
  }

  lines.push(
    '',
    'Output one photorealistic image with the same framing and aspect ratio as the input. Do not add text, labels or watermarks to the image.',
    'Then, in plain text, list 3 to 5 short lines starting with "- " describing what you changed.',
  )
  return lines.join('\n')
}
