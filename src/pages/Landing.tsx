import { ArrowRight, Lock } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { RoomIllustration } from '../illustrations/Room'
import { CompareSlider } from '../components/CompareSlider'
import { useTitle } from '../components/ui'

export default function Landing() {
  useTitle('')
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/app" replace />

  return (
    <>
      <section className="hero">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Room makeover concepts, guided</span>
            <h1>Make your room feel right — starting from the room you have.</h1>
            <p className="lede">
              Share a room photo and tell us what you want to change. Our design assistant will help clarify your ideas,
              confirm the brief, and create a visual makeover concept for you to review.
            </p>
            <div className="row" style={{ marginTop: 28 }}>
              <Link to="/sign-up" className="btn btn-primary btn-lg">
                Start my makeover <ArrowRight aria-hidden="true" />
              </Link>
              <Link to="/sign-in" className="btn btn-ghost btn-lg">I have an account</Link>
            </div>
            <p className="small muted row" style={{ marginTop: 20, gap: 8 }}>
              <Lock size={16} aria-hidden="true" /> Your photos stay private to your account. Free to try.
            </p>
          </div>
          <figure style={{ margin: 0 }}>
            <CompareSlider
              before={<RoomIllustration variant="before" title="Illustration: a dim living room before the makeover" />}
              after={<RoomIllustration variant="after" title="Illustration: the same living room after, with warm white and sage walls, curtains, plants and a pendant light" />}
              label="Example makeover"
            />
            <figcaption className="small muted" style={{ marginTop: 10 }}>
              Illustrated example. Drag to compare. The window, door, floor and sofa stay put; colour, lighting and soft
              furnishings change.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="band" aria-labelledby="how">
        <div className="wrap">
          <h2 id="how">How it works</h2>
          <p className="lede">About ten minutes, at your own pace. You can stop and come back anytime.</p>
          <div className="how" style={{ marginTop: 28 }}>
            <ol style={{ display: 'contents' }}>
              <li>
                <h3>Share your room</h3>
                <p className="muted">Upload one clear photo. It stays private to your account.</p>
              </li>
              <li>
                <h3>Talk it through</h3>
                <p className="muted">Answer a few friendly questions — pick from pictures when words don’t come easily.</p>
              </li>
              <li>
                <h3>Confirm your brief</h3>
                <p className="muted">Check a plain-language summary. Edit anything, including what must stay.</p>
              </li>
              <li>
                <h3>Review your concept</h3>
                <p className="muted">Compare before and after, refine in your own words, and save the ones you love.</p>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="wrap" style={{ padding: '64px var(--gutter)' }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
          <div>
            <span className="eyebrow">Your privacy</span>
            <h2>Your home stays yours.</h2>
            <p className="muted">
              You need an account before uploading anything. Room photos and concepts are stored privately, visible only to
              you, and you can delete a project — or your whole account — at any time. We never make your photos public.
            </p>
            <Link to="/privacy">Read how we handle your photos</Link>
          </div>
          <div>
            <span className="eyebrow">What you get</span>
            <h2>A visual concept, not a blueprint.</h2>
            <p className="muted">
              Concepts are AI-generated images to help you see a direction. They can change details, aren’t to scale, and
              aren’t construction drawings. We ask the model to keep what you mark as “keep”, and you can check and refine.
            </p>
            <Link to="/privacy#concepts">About visual concepts</Link>
          </div>
        </div>
        <div className="row" style={{ marginTop: 40 }}>
          <Link to="/sign-up" className="btn btn-primary btn-lg">Start my makeover <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>
    </>
  )
}
