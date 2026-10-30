import { AlertCircle } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { backend, isDemo } from '../lib/backend'
import { useAuth } from '../lib/auth'
import { Notice, useTitle } from '../components/ui'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function AuthCard({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  useTitle(title)
  return (
    <div className="wrap page" style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: '2.2rem' }}>{title}</h1>
      {intro && <p className="muted">{intro}</p>}
      <div className="panel" style={{ marginTop: 20 }}>{children}</div>
    </div>
  )
}

function Field(props: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
  autoComplete?: string
}) {
  const describedBy = [props.hint && `${props.id}-hint`, props.error && `${props.id}-err`].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <label htmlFor={props.id}>{props.label}</label>
      {props.hint && <span id={`${props.id}-hint`} className="hint">{props.hint}</span>}
      <input
        id={props.id}
        className="input"
        type={props.type ?? 'text'}
        value={props.value}
        autoComplete={props.autoComplete}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.error && (
        <span id={`${props.id}-err`} className="error-text"><AlertCircle size={16} aria-hidden="true" /> {props.error}</span>
      )}
    </div>
  )
}

function useRedirectTarget() {
  const loc = useLocation()
  return (loc.state as { from?: string } | null)?.from ?? '/app'
}

export function SignIn() {
  const { user } = useAuth()
  const nav = useNavigate()
  const target = useRedirectTarget()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={target} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Enter the email you signed up with, like name@example.com.'
    if (!password) errs.password = 'Enter your password.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    setError(null)
    try {
      await backend.signIn(email, password)
      nav(target, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Welcome back" intro="Sign in to pick up where you left off.">
      <form onSubmit={submit} noValidate>
        {error && <div style={{ marginBottom: 16 }}><Notice tone="error">{error}</Notice></div>}
        <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" value={password} onChange={setPassword} error={errors.password} />
        <div className="row between" style={{ marginTop: 20 }}>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
      </form>
      <hr className="divider" />
      <p className="small" style={{ margin: 0 }}>New here? <Link to="/sign-up" state={{ from: target }}>Create an account</Link></p>
    </AuthCard>
  )
}

export function SignUp() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  if (user) return <Navigate to={user.welcomed ? '/app' : '/welcome'} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'What should we call you? A first name is fine.'
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Enter an email address, like name@example.com.'
    if (password.length < 8) errs.password = 'Use at least 8 characters.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    setError(null)
    try {
      const { needsConfirmation } = await backend.signUp(email.trim(), password, name.trim())
      if (needsConfirmation) setSentTo(email.trim())
      else nav('/welcome', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (sentTo)
    return (
      <AuthCard title="Check your inbox">
        <Notice tone="success" role="status">
          We’ve sent a confirmation link to <strong>{sentTo}</strong>. Open it on this device to finish creating your account.
        </Notice>
        <p className="small muted" style={{ marginTop: 16 }}>No email after a few minutes? Check spam, or <button className="linkbtn" onClick={() => setSentTo(null)}>try a different address</button>.</p>
      </AuthCard>
    )

  return (
    <AuthCard
      title="Create your account"
      intro={isDemo ? 'Demo mode: this account lives only in this browser.' : 'An account keeps your room photos private and your projects saved.'}
    >
      <form onSubmit={submit} noValidate>
        {error && <div style={{ marginBottom: 16 }}><Notice tone="error">{error}</Notice></div>}
        <Field id="name" label="Your first name" autoComplete="given-name" value={name} onChange={setName} error={errors.name} />
        <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." value={password} onChange={setPassword} error={errors.password} />
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 20, width: '100%' }}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="small muted" style={{ marginTop: 14, marginBottom: 0 }}>
          By continuing you agree to how we handle photos, described in <Link to="/privacy">Privacy</Link>.
        </p>
      </form>
      <hr className="divider" />
      <p className="small" style={{ margin: 0 }}>Already have an account? <Link to="/sign-in">Sign in</Link></p>
    </AuthCard>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) return setErr('Enter the email you signed up with.')
    setErr(undefined)
    setBusy(true)
    setError(null)
    try {
      await backend.requestPasswordReset(email.trim())
      setSent(true)
    } catch (e2) {
      setError((e2 as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Reset your password" intro="We’ll send you a link to choose a new one.">
      {sent ? (
        <div className="stack">
          <Notice tone="success" role="status">
            If an account exists for <strong>{email}</strong>, a reset link is on its way.
          </Notice>
          {isDemo && (
            <Notice>
              Demo mode can’t send email. <Link to="/reset-password">Continue to choose a new password</Link> on this device.
            </Notice>
          )}
          <Link to="/sign-in">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          {error && <div style={{ marginBottom: 16 }}><Notice tone="error">{error}</Notice></div>}
          <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} error={err} />
          <div className="row between" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
            <Link to="/sign-in">Back to sign in</Link>
          </div>
        </form>
      )}
    </AuthCard>
  )
}

export function ResetPassword() {
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const errs: typeof errors = {}
    if (password.length < 8) errs.password = 'Use at least 8 characters.'
    if (confirm !== password) errs.confirm = 'The two passwords don’t match.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    setError(null)
    try {
      await backend.updatePassword(password)
      nav('/app', { replace: true, state: { toast: 'Password updated' } })
    } catch (e2) {
      setError((e2 as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={submit} noValidate>
        {error && (
          <div style={{ marginBottom: 16 }}>
            <Notice tone="error">{error} <Link to="/forgot-password">Request a new link</Link></Notice>
          </div>
        )}
        <Field id="password" label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." value={password} onChange={setPassword} error={errors.password} />
        <Field id="confirm" label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 20 }}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
    </AuthCard>
  )
}
