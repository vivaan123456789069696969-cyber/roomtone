import { LogOut } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { backend, isDemo } from '../lib/backend'
import { useAuth } from '../lib/auth'
import type { Project } from '../lib/types'
import { ConfirmDialog, Notice, useTitle, useToast } from '../components/ui'

export default function Settings() {
  useTitle('Settings')
  const { user, setUser } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [name, setName] = useState(user?.displayName ?? '')
  const [projects, setProjects] = useState<Project[]>([])
  const [confirm, setConfirm] = useState<null | 'account' | Project>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    backend.listProjects().then(setProjects).catch(() => {})
  }, [])

  async function saveName(e: FormEvent) {
    e.preventDefault()
    try {
      setUser(await backend.updateProfile({ displayName: name.trim() }))
      toast('Name updated')
    } catch {
      setError('We couldn’t update your name. Please try again.')
    }
  }

  async function sendReset() {
    if (!user) return
    try {
      await backend.requestPasswordReset(user.email)
      setResetSent(true)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function signOut() {
    await backend.signOut()
    nav('/', { replace: true })
  }

  async function doDelete() {
    if (!confirm) return
    setBusy(true)
    setError(null)
    try {
      if (confirm === 'account') {
        await backend.deleteAccount()
        nav('/', { replace: true })
        return
      }
      await backend.deleteProject(confirm.id)
      setProjects((ps) => ps.filter((p) => p.id !== confirm.id))
      toast(`“${confirm.name}” was deleted`)
    } catch (e) {
      setError((e as Error).message || 'That didn’t work. Please try again.')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  return (
    <div className="wrap narrow page stack" style={{ ['--stack' as string]: '1.75rem' }}>
      <div>
        <span className="eyebrow">Your account</span>
        <h1>Profile and settings</h1>
      </div>
      {error && <Notice tone="error">{error}</Notice>}

      <section className="panel" aria-labelledby="profile">
        <h2 id="profile" style={{ fontSize: '1.3rem' }}>Profile</h2>
        <form onSubmit={saveName}>
          <div className="field">
            <label htmlFor="dn">Name</label>
            <input id="dn" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="given-name" />
          </div>
          <div className="field">
            <span className="label">Email</span>
            <span>{user?.email}</span>
          </div>
          <button className="btn btn-secondary" type="submit" style={{ marginTop: 16 }} disabled={name.trim() === (user?.displayName ?? '')}>Save name</button>
        </form>
      </section>

      <section className="panel" aria-labelledby="security">
        <h2 id="security" style={{ fontSize: '1.3rem' }}>Password and sign-in</h2>
        {resetSent ? (
          <Notice tone="success" role="status">
            {isDemo ? <>Demo mode can’t send email. <Link to="/reset-password">Choose a new password now</Link>.</> : <>We’ve sent a reset link to {user?.email}.</>}
          </Notice>
        ) : (
          <p className="muted">We’ll email you a secure link to choose a new password.</p>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={sendReset}>Send password reset link</button>
          <button className="btn btn-ghost" onClick={signOut}><LogOut aria-hidden="true" /> Sign out</button>
        </div>
      </section>

      <section className="panel" aria-labelledby="privacy-h">
        <h2 id="privacy-h" style={{ fontSize: '1.3rem' }}>Privacy</h2>
        <p className="muted">
          {isDemo
            ? 'Demo mode: your account, photos and projects are stored only in this browser.'
            : 'Your photos and concepts are stored privately and are visible only to you. To create concepts, your photo and brief are processed by our image-model provider.'}{' '}
          <Link to="/privacy">Read the full privacy summary</Link>.
        </p>
      </section>

      <section className="panel" aria-labelledby="delete-h">
        <h2 id="delete-h" style={{ fontSize: '1.3rem' }}>Delete projects</h2>
        {projects.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>You have no projects.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="stack">
            {projects.map((p) => (
              <li key={p.id} className="row between">
                <span>{p.name} <span className="small muted">· {p.roomType}</span></span>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirm(p)}>Delete<span className="visually-hidden"> {p.name}</span></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="acct-h" style={{ borderColor: '#dcb6a6' }}>
        <h2 id="acct-h" style={{ fontSize: '1.3rem' }}>Delete account</h2>
        <p className="muted">Permanently deletes your account, every room photo, brief and concept. This can’t be undone.</p>
        <button className="btn btn-danger" onClick={() => setConfirm('account')}>Delete my account</button>
      </section>

      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'account' ? 'Delete your account?' : `Delete “${typeof confirm === 'object' && confirm ? confirm.name : ''}”?`}
        body={confirm === 'account'
          ? 'Your account, all photos, briefs and concepts will be permanently deleted.'
          : 'The photo, conversation, brief and every concept version will be permanently deleted.'}
        confirmLabel={confirm === 'account' ? 'Delete everything' : 'Delete project'}
        danger
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
