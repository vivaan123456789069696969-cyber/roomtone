import { backend } from './backend'

/** Download a private image to the user's device. Nothing is made public. */
export async function downloadImage(path: string, filename: string) {
  const url = await backend.imageUrl(path)
  const blob = await (await fetch(url)).blob()
  const objectUrl = URL.createObjectURL(blob)
  const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = `${filename}.${ext}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

export const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'room'
