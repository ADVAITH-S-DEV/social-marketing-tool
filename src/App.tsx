import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RegisterPage from './pages/RegisterPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import { supabase } from './services/supabaseClient'

function LoadingRoute() {
  return (
    <main className="route-loading">
      <div className="route-loading-card">Loading...</div>
    </main>
  )
}

function useSessionState() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      const { data } = await supabase.auth.getSession()

      if (isMounted) {
        setSession(data.session)
      }
    }

    void loadSession()

    return () => {
      isMounted = false
    }
  }, [])

  return session
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = useSessionState()

  if (session === undefined) {
    return <LoadingRoute />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

function PublicRoute({ children }: { children: ReactNode }) {
  const session = useSessionState()

  if (session === undefined) {
    return <LoadingRoute />
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function RootRoute() {
  const session = useSessionState()

  if (session === undefined) {
    return <LoadingRoute />
  }

  return <Navigate to={session ? '/dashboard' : '/login'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/oauth/callback"
        element={
          <ProtectedRoute>
            <OAuthCallbackPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
