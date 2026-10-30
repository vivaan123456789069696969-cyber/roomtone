import { Link } from 'react-router-dom'
import { isDemo } from '../lib/backend'
import { useTitle } from '../components/ui'

export default function Privacy() {
  useTitle('Privacy & visual concepts')
  return (
    <div className="wrap narrow page stack" style={{ ['--stack' as string]: '1.25rem' }}>
      <span className="eyebrow">Plain-language summary</span>
      <h1>Privacy and visual concepts</h1>

      <section aria-labelledby="photos">
        <h2 id="photos">Your room photos</h2>
        <ul>
          <li>You must sign in before uploading. Photos are tied to your account.</li>
          <li>Photos and concepts are stored in private storage. Only you can open them, through short-lived links.</li>
          <li>Before upload we shrink the photo and remove hidden metadata such as GPS location.</li>
          <li>To create a concept, your photo and approved brief are sent to the image-model provider (Google Gemini API) for processing. We don’t send your name or email.</li>
          <li>Nothing is public by default. Downloading a concept is your choice.</li>
          <li>Delete a single project, or your whole account and every photo, from <Link to="/app/settings">Settings</Link>.</li>
        </ul>
      </section>

      <section aria-labelledby="concepts">
        <h2 id="concepts">What a “visual concept” is</h2>
        <p>
          A concept is an AI-generated image that suggests a direction for your room. It is not a photo of a finished room,
          not to scale, and not a construction or purchase plan.
        </p>
        <ul>
          <li>We ask the model to keep walls, windows, doors, the camera angle and anything you mark “keep” — but it can still change details.</li>
          <li>Colours on screen vary. Check real paint and fabric samples in your own light.</li>
          <li>Budget only guides how ambitious the concept is; it isn’t a quote.</li>
        </ul>
      </section>

      <section aria-labelledby="demo-h" id="demo">
        <h2 id="demo-h">Demo mode</h2>
        <p>
          {isDemo ? 'This site is currently running in demo mode. ' : 'When Roomtone runs without a backend it uses demo mode. '}
          In demo mode, accounts, photos and projects are kept only in this browser (IndexedDB) and never uploaded.
          “Concepts” are colour studies made from your own photo, stamped “Demo preview · not AI-generated”. Clearing your
          browser data removes them.
        </p>
      </section>
    </div>
  )
}
