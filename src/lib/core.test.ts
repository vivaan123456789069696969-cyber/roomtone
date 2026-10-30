import { describe, expect, it } from 'vitest'
import { buildConceptPrompt } from '../../supabase/functions/_shared/prompt'
import { briefSummary, composeBrief } from './brief'
import { QUESTIONS } from './conversation'
import { applyVotes } from './inspiration'
import { resumeStep } from './steps'
import type { Answers, Project } from './types'

const answers: Answers = {
  household: { choices: ['A couple', 'Young children'] },
  goals: { choices: ['Too dark', 'Hard to keep clean'] },
  styles: { choices: ['warm-contemporary'] },
  keep: { choices: ['Sofa', 'Flooring', 'Windows', 'Doors'] },
  colours: { choices: ['beige', 'muted green'], avoid: ['black'] },
  materials: { choices: ['light wood'], avoid: [] },
  practical: { choices: ['Easy-care, wipeable surfaces'] },
  scale: { choices: ['Moderate update'] },
  budget: { choices: ['₹3–5 lakh'] },
}

const project = (over: Partial<Project> = {}): Project => ({
  id: 'p', ownerId: 'u', name: 'Living', roomType: 'Living room', status: 'draft', photoPath: null, answers: {},
  conversationStep: 0, conversationDone: false, inspiration: {}, inspirationDone: false, briefDraft: null,
  approvedBrief: null, currentConceptId: null, createdAt: '', updatedAt: '', ...over,
})

describe('composeBrief', () => {
  const b = composeBrief({ answers, roomType: 'Living room', inspiration: {} })

  it('carries keep items and style labels through', () => {
    expect(b.keep).toEqual(['Sofa', 'Flooring', 'Windows', 'Doors'])
    expect(b.styles).toEqual(['Warm contemporary'])
    expect(b.avoidColours).toEqual(['black'])
  })

  it('derives changes to explore from goals and scale', () => {
    expect(b.explore).toContain('layered lighting')
    expect(b.explore).toContain('curtains')
  })

  it('does not suggest changing something marked keep', () => {
    const kept = composeBrief({ answers: { ...answers, keep: { choices: ['Wall colour'] } }, roomType: 'Living room', inspiration: {} })
    expect(kept.explore.some((e) => /wall colour/i.test(e))).toBe(false)
  })

  it('writes a plain-language summary', () => {
    const s = briefSummary(b)
    expect(s.startsWith('Family living room.')).toBe(true)
    expect(s).toContain('Keep the existing sofa, flooring, windows and doors.')
    expect(s).toContain('Budget preference: ₹3–5 lakh.')
  })
})

describe('inspiration votes', () => {
  it('adds liked colours and moves disliked ones to avoid', () => {
    const base = composeBrief({ answers, roomType: 'Living room', inspiration: {} })
    const next = applyVotes(base, { 'pal-clay-sun': 'like', 'pal-sage-oat': 'dislike', 'mat-cane': 'like' })
    expect(next.colours).toContain('terracotta')
    expect(next.colours).not.toContain('muted green')
    expect(next.avoidColours).toContain('muted green')
    expect(next.materials).toContain('cane / rattan')
  })
})

describe('conversation adapts', () => {
  it('pre-ticks practical needs from earlier answers', () => {
    const practical = QUESTIONS.find((q) => q.id === 'practical')!
    expect(practical.prefill!(answers)).toEqual(['Child-safe edges and finishes', 'Easy-care, wipeable surfaces'])
    expect(practical.ask(answers, 'Living room')).toMatch(/children/)
  })
})

describe('resumeStep', () => {
  it('reopens at the first unfinished step', () => {
    expect(resumeStep(project())).toBe('photo')
    expect(resumeStep(project({ photoPath: 'x' }))).toBe('chat')
    expect(resumeStep(project({ photoPath: 'x', conversationDone: true }))).toBe('inspiration')
    expect(resumeStep(project({ photoPath: 'x', conversationDone: true, inspirationDone: true }))).toBe('brief')
    expect(resumeStep(project({ photoPath: 'x', conversationDone: true, inspirationDone: true, currentConceptId: 'c',
      approvedBrief: { version: 1, data: composeBrief({ answers, roomType: 'Living room', inspiration: {} }), summary: '', approvedAt: '' } }))).toBe('result')
  })
})

describe('generation prompt', () => {
  const b = composeBrief({ answers, roomType: 'Living room', inspiration: {} })
  it('puts preservation first and lists keep items', () => {
    const p = buildConceptPrompt(b)
    expect(p.indexOf('PRESERVE')).toBeLessThan(p.indexOf('DESIGN DIRECTION'))
    expect(p).toContain('- the existing sofa')
    expect(p).toMatch(/window and door/)
    expect(p).toContain('Colours to avoid: black')
  })
  it('limits a refinement to the requested change', () => {
    const p = buildConceptPrompt(b, 'Make the room brighter')
    expect(p).toContain('"Make the room brighter"')
    expect(p).not.toContain('DESIGN DIRECTION')
  })
})
