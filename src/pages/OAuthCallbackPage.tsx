import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { exchangeOAuthCode, type SupportedPlatform } from '../services/dashboardApi'

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('Processing authentication...')
  const [error, setError] = useState('')
  const hasExchanged = useRef(false)

  useEffect(() => {
    async function processCallback() {
      if (hasExchanged.current) return
      hasExchanged.current = true
      try {
        const code = searchParams.get('code')
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (errorParam) {
          throw new Error(errorDescription || errorParam)
        }

        if (!code) {
          throw new Error('No authorization code received from the platform.')
        }

        const clientId = localStorage.getItem('oauth_client_id')
        const clientSecret = localStorage.getItem('oauth_client_secret')
        const platform = localStorage.getItem('oauth_platform') as SupportedPlatform

        if (!clientId || !clientSecret || !platform) {
          throw new Error('Missing OAuth credentials. Please try connecting again from the dashboard.')
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('You must be logged in to connect platforms.')
        }

        setStatus(`Exchanging token for ${platform}...`)
        
        const redirectUri = `${window.location.origin}/oauth/callback`
        
        await exchangeOAuthCode(
          session.user.id,
          platform,
          code,
          clientId,
          clientSecret,
          redirectUri
        )

        // Clear local storage
        localStorage.removeItem('oauth_client_id')
        localStorage.removeItem('oauth_client_secret')
        localStorage.removeItem('oauth_platform')

        setStatus('Successfully connected! Redirecting to dashboard...')
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500)

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred during OAuth callback.')
      }
    }

    processCallback()
  }, [navigate, searchParams])

  return (
    <main className="dashboard-loading">
      <div className="dashboard-loading-card">
        <p className="dashboard-loading-kicker">OAuth Callback</p>
        
        {error ? (
          <>
            <h1 style={{ color: 'red' }}>Connection Failed</h1>
            <p>{error}</p>
            <button 
              className="refresh-button" 
              style={{ marginTop: '1rem' }}
              onClick={() => navigate('/dashboard')}
            >
              Return to Dashboard
            </button>
          </>
        ) : (
          <>
            <h1>{status}</h1>
            <p>Please wait while we finalize your connection.</p>
          </>
        )}
      </div>
    </main>
  )
}
