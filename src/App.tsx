import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './lib/auth'
import { Layout } from './components/Layout'
import { ProjectShell, ResumeRedirect } from './components/ProjectShell'
import { PageLoader, ToastProvider, useTitle } from './components/ui'
import Landing from './pages/Landing'
import { ForgotPassword, ResetPassword, SignIn, SignUp } from './pages/Auth'
import { Dashboard, NewProject, Welcome } from './pages/Home'

const Privacy = lazy(() => import('./pages/Privacy'))
const PhotoStep = lazy(() => import('./pages/PhotoStep'))
const ChatStep = lazy(() => import('./pages/ChatStep'))
const InspirationStep = lazy(() => import('./pages/InspirationStep'))
const BriefStep = lazy(() => import('./pages/BriefStep'))
const GenerateStep = lazy(() => import('./pages/GenerateStep'))
const ResultStep = lazy(() => import('./pages/ResultStep'))
const ProjectOverview = lazy(() => import('./pages/ProjectOverview'))
const Gallery = lazy(() => import('./pages/Gallery'))
const Settings = lazy(() => import('./pages/Settings'))

function NotFound() {
  useTitle('Page not found')
  return (
    <div className="wrap narrow page">
      <h1>This page isn’t here</h1>
      <p className="lede">The link may be old, or the page has moved.</p>
      <Link className="btn btn-primary" to="/">Go home</Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Landing />} />
                <Route path="privacy" element={<Privacy />} />
                <Route path="sign-in" element={<SignIn />} />
                <Route path="sign-up" element={<SignUp />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password" element={<ResetPassword />} />
                <Route path="welcome" element={<RequireAuth><Welcome /></RequireAuth>} />
                <Route path="app" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="app/new" element={<RequireAuth><NewProject /></RequireAuth>} />
                <Route path="app/gallery" element={<RequireAuth><Gallery /></RequireAuth>} />
                <Route path="app/settings" element={<RequireAuth><Settings /></RequireAuth>} />
                <Route path="app/projects/:id" element={<RequireAuth><ProjectShell /></RequireAuth>}>
                  <Route index element={<ResumeRedirect />} />
                  <Route path="overview" element={<ProjectOverview />} />
                  <Route path="photo" element={<PhotoStep />} />
                  <Route path="chat" element={<ChatStep />} />
                  <Route path="inspiration" element={<InspirationStep />} />
                  <Route path="brief" element={<BriefStep />} />
                  <Route path="generate" element={<GenerateStep />} />
                  <Route path="result" element={<ResultStep />} />
                </Route>
                <Route path="app/*" element={<Navigate to="/app" replace />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
