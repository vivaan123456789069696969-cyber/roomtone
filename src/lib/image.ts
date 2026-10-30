import { COLOUR_OPTIONS } from './conversation'
import type { BriefData } from './types'

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const MAX_EDGE = 2048
const MIN_EDGE = 640

export interface PreparedPhoto {
  blob: Blob
  width: number
  height: number
  warnings: string[]
}

export class PhotoError extends Error {}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new PhotoError('We couldn’t open that file as an image. Try a JPG or PNG photo.'))
    img.src = src
  })
}

function toBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.88): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new PhotoError('We couldn’t process that photo.'))), type, quality),
  )
}

/**
 * Validate, downscale and re-encode a room photo in the browser.
 * Re-encoding also strips EXIF metadata such as GPS location.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    throw new PhotoError('iPhone HEIC photos aren’t supported yet. In your camera settings choose “Most compatible”, or share the photo as a JPG.')
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new PhotoError('Please choose a JPG, PNG or WebP photo.')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new PhotoError(`That photo is ${(file.size / 1048576).toFixed(1)} MB. Please use one under 15 MB.`)
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const warnings: string[] = []
    const long = Math.max(img.naturalWidth, img.naturalHeight)
    if (long < MIN_EDGE) warnings.push('This photo is quite small, so the concept may look soft. A larger photo will give a sharper result.')
    if (img.naturalHeight > img.naturalWidth * 1.6) warnings.push('This is a tall, narrow shot. A landscape photo usually shows more of the room.')
    const scale = Math.min(1, MAX_EDGE / long)
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new PhotoError('Your browser couldn’t process the photo.')
    ctx.drawImage(img, 0, 0, w, h)
    if (meanLuminance(ctx, w, h) < 50) warnings.push('This photo looks quite dark. If you can, retake it in daylight with the lights on.')
    const blob = await toBlob(canvas)
    return { blob, width: w, height: h, warnings }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function meanLuminance(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const step = Math.max(1, Math.floor(Math.min(w, h) / 64))
  const data = ctx.getImageData(0, 0, w, h).data
  let sum = 0
  let n = 0
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      n++
    }
  }
  return n ? sum / n : 255
}

/**
 * Demo-mode "concept": a colour study made from the user's own photo by
 * grading it towards their chosen palette. It is clearly stamped as a demo
 * and never presented as AI output.
 */
export async function renderDemoConcept(source: Blob, brief: BriefData, variant: number): Promise<Blob> {
  const url = URL.createObjectURL(source)
  try {
    const img = await loadImage(url)
    const w = img.naturalWidth
    const h = img.naturalHeight
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    const brighter = brief.goals.some((g) => /dark/i.test(g)) || /brighter|lighter/i.test(brief.notes)
    ctx.filter = `brightness(${brighter ? 1.14 : 1.04}) saturate(0.92) contrast(1.03)`
    ctx.drawImage(img, 0, 0)
    ctx.filter = 'none'

    const hexes = brief.colours
      .map((c) => COLOUR_OPTIONS.find((o) => o.id === c)?.swatch)
      .filter((x): x is string => !!x)
    const palette = hexes.length ? hexes : ['#D9C7A8', '#8C9A7C']
    const tone = palette[variant % palette.length]
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, tone)
    grad.addColorStop(1, palette[(variant + 1) % palette.length])
    ctx.globalCompositeOperation = 'soft-light'
    ctx.globalAlpha = 0.55
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1

    // Clear, unremovable demo label.
    const band = Math.max(36, Math.round(h * 0.07))
    ctx.fillStyle = 'rgba(43,41,37,0.82)'
    ctx.fillRect(0, h - band, w, band)
    ctx.fillStyle = '#F7F3EC'
    ctx.font = `600 ${Math.round(band * 0.38)}px system-ui, sans-serif`
    ctx.textBaseline = 'middle'
    ctx.fillText('DEMO PREVIEW · colour study of your photo · not AI-generated', Math.round(band * 0.4), h - band / 2)
    return await toBlob(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}
