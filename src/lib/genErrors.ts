import { GenerationError, type GenErrorCode } from './types'

export interface FriendlyError {
  title: string
  body: string
  retry: boolean
  editBrief?: boolean
  newPhoto?: boolean
}

const MAP: Record<GenErrorCode, FriendlyError> = {
  quota: { title: 'Today’s limit is reached', body: 'To keep the service fair and affordable there’s a daily limit on new concepts. Your project is saved — please come back tomorrow.', retry: false },
  rate_limited: { title: 'The image service is busy', body: 'Lots of people are creating concepts right now. Wait a minute, then try again. Nothing was lost.', retry: true },
  timeout: { title: 'That took too long', body: 'The image model didn’t respond in time. This usually works on a second try.', retry: true },
  model_unavailable: { title: 'Concept creation is unavailable', body: 'The image model isn’t available right now. Your brief is saved — please try again later.', retry: false },
  unsupported_image: { title: 'We couldn’t use this photo', body: 'The image model couldn’t work with this photo. Try a clear, well-lit JPG of the room.', retry: false, newPhoto: true },
  blocked: { title: 'This request was declined', body: 'The image model declined the photo or request. Photos with people, screens showing personal information, or unusual content can trigger this. Try another photo or adjust your brief.', retry: false, newPhoto: true, editBrief: true },
  busy: { title: 'A concept is already on its way', body: 'We’re already creating a concept for this room. Give it a moment before trying again.', retry: true },
  refine_limit: { title: 'No refinement rounds left', body: 'You’ve used all refinement rounds for this project. You can still save versions, or start a new project from the same room.', retry: false },
  no_brief: { title: 'Approve your brief first', body: 'Concepts are always created from an approved brief.', retry: false, editBrief: true },
  provider: { title: 'Something went wrong on our side', body: 'The image service returned an error. Your project is safe — please try again.', retry: true },
  network: { title: 'You seem to be offline', body: 'We couldn’t reach the server. Check your connection, then try again.', retry: true },
  unknown: { title: 'Something went wrong', body: 'We couldn’t create the concept. Your project is saved — please try again.', retry: true },
}

export function friendly(e: unknown): FriendlyError {
  if (e instanceof GenerationError) return MAP[e.code] ?? MAP.unknown
  if (typeof navigator !== 'undefined' && !navigator.onLine) return MAP.network
  return MAP.unknown
}
