import { Home, Images, Plus, Settings } from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { isDemo } from '../lib/backend'
import { useAuth } from '../lib/auth'

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#4E5D45" />
      <path d="M8 24V13l8-6 8 6v11" fill="none" stroke="#F7F3EC" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="13" y="16" width="6" height="8" rx="1" fill="#C9A47A" />
    </svg>
  )
}

function DemoBanner() {
  if (!isDemo) return null
  return (
    <div className="demo-banner" role="note">
      <strong>Demo mode.</strong> Accounts, photos and projects stay in this browser only, and concepts are labelled colour studies — not AI images.{' '}
      <Link to="/privacy#demo">What this means</Link>
    </div>
  )
}

export function Layout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const inApp = !!user && (pathname.startsWith('/app') || pathname === '/welcome')

  useEffect(() => {
    document.body.classList.toggle('has-tabs', inApp)
  }, [inApp])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <DemoBanner />
      <header className="site-header">
        <div className="wrap">
          <Link to={user ? '/app' : '/'} className="brand" aria-label="Roomtone home">
            <BrandMark />
            Roomtone
          </Link>
          <nav className="nav" aria-label="Main">
            {user ? (
              <>
                <NavLink end to="/app" className="navlink hide-sm">Projects</NavLink>
                <NavLink to="/app/gallery" className="navlink hide-sm">My designs</NavLink>
                <NavLink to="/app/settings" className="navlink hide-sm">Settings</NavLink>
                <Link to="/app/new" className="btn btn-primary btn-sm hide-sm">
                  <Plus aria-hidden="true" /> New makeover
                </Link>
              </>
            ) : (
              <>
                <NavLink to="/sign-in" className="navlink">Sign in</NavLink>
                <Link to="/sign-up" className="btn btn-primary btn-sm">Start my makeover</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="wrap">
          <span>Roomtone · open-source room makeover concepts</span>
          <span className="row">
            <Link to="/privacy">Privacy</Link>
            <Link to="/privacy#concepts">About visual concepts</Link>
          </span>
        </div>
      </footer>
      {inApp && (
        <nav className="mobile-tabs" aria-label="App">
          <NavLink end to="/app"><Home size={20} aria-hidden="true" />Projects</NavLink>
          <NavLink to="/app/new"><Plus size={20} aria-hidden="true" />New</NavLink>
          <NavLink to="/app/gallery"><Images size={20} aria-hidden="true" />Designs</NavLink>
          <NavLink to="/app/settings"><Settings size={20} aria-hidden="true" />Settings</NavLink>
        </nav>
      )}
    </>
  )
}
