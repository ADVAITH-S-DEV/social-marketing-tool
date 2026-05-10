import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createDashboardPost,
  publishPostToPlatform,
  connectPlatform,
  disconnectPlatform,
  fetchDashboardData,
  signOutUser,
  supportedPlatforms,
  type DashboardPost,
  type PlatformAccount,
  type SupportedPlatform,
} from '../services/dashboardApi'
import { supabase } from '../services/supabaseClient'

type SessionUser = {
  id: string
  email: string | undefined
  username: string
}

type ComposerState = {
  content: string
  mediaUrls: string
  scheduledAt: string
}

const initialComposerState: ComposerState = {
  content: '',
  mediaUrls: '',
  scheduledAt: '',
}

const platformLabels: Record<SupportedPlatform, string> = {
  x: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  threads: 'Threads',
  linkedin: 'LinkedIn',
}

const platformDescriptions: Record<SupportedPlatform, string> = {
  x: 'Fast updates and launch notes',
  instagram: 'Visual posts and stories',
  facebook: 'Community and brand updates',
  threads: 'Short-form conversational posts',
  linkedin: 'Professional audience content',
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not scheduled'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getInitials(email: string | undefined) {
  if (!email) {
    return 'SM'
  }

  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function buildUsername(userMetadata: Record<string, unknown> | undefined, email: string | undefined) {
  const metadataUsername = userMetadata?.username

  if (typeof metadataUsername === 'string' && metadataUsername.trim().length > 0) {
    return metadataUsername
  }

  if (email) {
    return email.split('@')[0]
  }

  return 'Creator'
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
  const [posts, setPosts] = useState<DashboardPost[]>([])
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<SupportedPlatform[]>([
    'x',
    'instagram',
    'threads',
    'linkedin',
    'facebook',
  ])
  const [composerState, setComposerState] = useState<ComposerState>(initialComposerState)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const [isConnectingPlatform, setIsConnectingPlatform] = useState(false)
  const [selectedPlatformForAuth, setSelectedPlatformForAuth] = useState<SupportedPlatform | null>(null)
  const [credentialForm, setCredentialForm] = useState({
    accessToken: '',
    apiKey: '',
    refreshToken: '',
    clientSecret: '',
  })

  async function loadDashboard() {
    if (!currentUser) {
      return
    }

    try {
      setErrorMessage('')
      const data = await fetchDashboardData(currentUser.id)
      setPosts(data.posts)
      setPlatformAccounts(data.platformAccounts)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load dashboard data.'
      setErrorMessage(message)
    }
  }

  useEffect(() => {
    let isActive = true

    async function initialize() {
      const { data, error } = await supabase.auth.getSession()

      if (!isActive) {
        return
      }

      if (error) {
        setErrorMessage(error.message)
        setIsLoading(false)
        return
      }

      const session = data.session

      if (!session) {
        navigate('/login', { replace: true })
        return
      }

      setCurrentUser({
        id: session.user.id,
        email: session.user.email,
        username: buildUsername(session.user.user_metadata, session.user.email),
      })
      setIsLoading(false)
    }

    initialize()

    return () => {
      isActive = false
    }
  }, [navigate])

  useEffect(() => {
    if (currentUser) {
      void loadDashboard()
    }
  }, [currentUser])

  async function handleLogout() {
    await signOutUser()
    navigate('/login', { replace: true })
  }

  function togglePlatform(platform: SupportedPlatform) {
    setSelectedPlatforms((previousPlatforms) =>
      previousPlatforms.includes(platform)
        ? previousPlatforms.filter((item) => item !== platform)
        : [...previousPlatforms, platform],
    )
  }

  function setAllPlatforms(nextSelected: boolean) {
    setSelectedPlatforms(nextSelected ? [...supportedPlatforms] : [])
  }

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!currentUser) {
      return
    }

    const content = composerState.content.trim()
    const mediaUrls = composerState.mediaUrls
      .split(/\r?\n|,/) 
      .map((entry) => entry.trim())
      .filter(Boolean)

    if (!content) {
      setErrorMessage('Write the post content before publishing.')
      return
    }

    if (selectedPlatforms.length === 0) {
      setErrorMessage('Select at least one platform.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      const post = await createDashboardPost({
        userId: currentUser.id,
        content,
        mediaUrls,
        scheduledAt: composerState.scheduledAt || null,
        platformNames: selectedPlatforms,
      })

      let publishErrors: string[] = []

      // If it's an immediate post, trigger publish for each selected platform
      if (!composerState.scheduledAt) {
        for (const platform of selectedPlatforms) {
          try {
            await publishPostToPlatform(currentUser.id, post.id, platform, content)
          } catch (err) {
            publishErrors.push(err instanceof Error ? err.message : `Failed to publish to ${platform}`)
          }
        }
      }

      setComposerState(initialComposerState)
      await loadDashboard()
      
      if (publishErrors.length > 0) {
        setErrorMessage(`Saved as draft, but some publishing failed: ${publishErrors.join(', ')}`)
      } else {
        setSuccessMessage(composerState.scheduledAt ? 'Post scheduled successfully!' : 'Post published successfully!')
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create the post.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSelectPlatformForAuth(platform: SupportedPlatform) {
    setSelectedPlatformForAuth(platform)
    setCredentialForm({
      accessToken: '',
      apiKey: '',
      refreshToken: '',
      clientSecret: '',
    })
    setErrorMessage('')
    setSuccessMessage('')
  }

  async function handleConnectPlatform(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!currentUser || !selectedPlatformForAuth) {
      setErrorMessage('Invalid state. Please try again.')
      return
    }

    if (selectedPlatformForAuth === 'linkedin') {
      const clientId = credentialForm.accessToken || credentialForm.apiKey
      const clientSecret = credentialForm.clientSecret
      
      if (!clientId.trim() || !clientSecret.trim()) {
        setErrorMessage('Please enter both Client ID and Client Secret.')
        return
      }

      // Store in localStorage
      localStorage.setItem('oauth_client_id', clientId.trim())
      localStorage.setItem('oauth_client_secret', clientSecret.trim())
      localStorage.setItem('oauth_platform', 'linkedin')

      // Redirect to LinkedIn
      const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`)
      const scope = encodeURIComponent('w_member_social profile openid email')
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId.trim()}&redirect_uri=${redirectUri}&state=linkedin&scope=${scope}`
      
      window.location.href = authUrl
      return
    }

    const credential = credentialForm.accessToken || credentialForm.apiKey
    if (!credential.trim()) {
      setErrorMessage('Please enter valid credentials.')
      return
    }

    setIsConnectingPlatform(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await connectPlatform(currentUser.id, selectedPlatformForAuth, credential)
      await loadDashboard()
      setSuccessMessage(`Successfully connected to ${platformLabels[selectedPlatformForAuth]}!`)
      setSelectedPlatformForAuth(null)
      setCredentialForm({ accessToken: '', apiKey: '', refreshToken: '', clientSecret: '' })
      setIsConnectModalOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect platform'
      setErrorMessage(message)
    } finally {
      setIsConnectingPlatform(false)
    }
  }

  async function handleDisconnectPlatform(connectionId: string) {
    try {
      setErrorMessage('')
      setSuccessMessage('')

      await disconnectPlatform(connectionId)
      await loadDashboard()
      setSuccessMessage('Platform disconnected successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect platform'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="dashboard-loading">
        <div className="dashboard-loading-card">
          <p className="dashboard-loading-kicker">Social Marketing Tool</p>
          <h1>Loading your workspace...</h1>
          <p>Fetching your posts, connected accounts, and publishing queue.</p>
        </div>
      </main>
    )
  }

  const totalPosts = posts.length
  const scheduledPosts = posts.filter((post) => post.status === 'scheduled').length
  const draftPosts = posts.filter((post) => post.status === 'draft').length
  const connectedPlatforms = platformAccounts.filter((account) => account.is_connected).length

  return (
    <main className="dashboard-layout-full">
      <header className="dashboard-top-header">
        <div className="dashboard-top-branding">
          <p className="dashboard-brand">Social Marketing Tool</p>
          <h1 className="dashboard-top-title">Publishing Home</h1>
        </div>

        <div className="dashboard-profile-container">
          <button
            className="dashboard-profile-button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            title={currentUser?.email}
          >
            <span className="dashboard-profile-avatar">{getInitials(currentUser?.email)}</span>
          </button>

          {isProfileOpen && (
            <div className="dashboard-profile-dropdown">
              <div className="profile-dropdown-header">
                <p className="profile-dropdown-name">{currentUser?.username ?? 'Creator'}</p>
                <p className="profile-dropdown-email">{currentUser?.email ?? 'Signed in user'}</p>
              </div>
              <button className="profile-dropdown-signout" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="dashboard-main-full">
        <header className="dashboard-section-header">
          <div>
            <p className="dashboard-kicker">Home</p>
            <h2>Manage posts and platform deliveries</h2>
            <p className="dashboard-subtitle">
              Track what was posted, what is scheduled, and what is still waiting in draft.
            </p>
          </div>

          <div className="dashboard-stats">
            <article className="dashboard-stat-card">
              <span>Total posts</span>
              <strong>{totalPosts}</strong>
            </article>
            <article className="dashboard-stat-card">
              <span>Scheduled</span>
              <strong>{scheduledPosts}</strong>
            </article>
            <article className="dashboard-stat-card">
              <span>Drafts</span>
              <strong>{draftPosts}</strong>
            </article>
            <article className="dashboard-stat-card">
              <span>Connected</span>
              <strong>{connectedPlatforms}</strong>
            </article>
          </div>
        </header>

        <div className="dashboard-grid">
          <section className="dashboard-panel dashboard-composer-panel">
            <div className="panel-heading">
              <div>
                <p className="dashboard-kicker">New post</p>
                <h3>Create content</h3>
              </div>
              <button className="platform-toggle-button" type="button" onClick={() => setAllPlatforms(selectedPlatforms.length !== supportedPlatforms.length)}>
                {selectedPlatforms.length === supportedPlatforms.length ? 'Clear all' : 'Select all'}
              </button>
            </div>

            <form className="composer-form" onSubmit={handleCreatePost}>
              <label className="composer-label" htmlFor="post-content">
                Post content
              </label>
              <textarea
                id="post-content"
                className="composer-textarea"
                value={composerState.content}
                onChange={(event) =>
                  setComposerState((previousState) => ({
                    ...previousState,
                    content: event.target.value,
                  }))
                }
                placeholder="Write your campaign announcement, product update, or content caption..."
                rows={8}
              />

              <label className="composer-label" htmlFor="media-urls">
                Media URLs
              </label>
              <input
                id="media-urls"
                className="composer-input"
                value={composerState.mediaUrls}
                onChange={(event) =>
                  setComposerState((previousState) => ({
                    ...previousState,
                    mediaUrls: event.target.value,
                  }))
                }
                placeholder="Paste image or video URLs separated by commas or new lines"
              />

              <label className="composer-label" htmlFor="scheduled-at">
                Schedule time
              </label>
              <input
                id="scheduled-at"
                className="composer-input"
                type="datetime-local"
                value={composerState.scheduledAt}
                onChange={(event) =>
                  setComposerState((previousState) => ({
                    ...previousState,
                    scheduledAt: event.target.value,
                  }))
                }
              />

              <div>
                <div className="composer-label-row">
                  <label className="composer-label">Platforms</label>
                  <span className="composer-hint">Choose where this post should be delivered</span>
                </div>
                <div className="platform-picker">
                  {supportedPlatforms.map((platform) => {
                    const isSelected = selectedPlatforms.includes(platform)

                    return (
                      <button
                        key={platform}
                        type="button"
                        className={`platform-chip ${isSelected ? 'platform-chip-active' : ''}`}
                        onClick={() => togglePlatform(platform)}
                      >
                        <span className="platform-chip-label">{platformLabels[platform]}</span>
                        <span className="platform-chip-copy">{platformDescriptions[platform]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {errorMessage ? (
                <p className="dashboard-message dashboard-message-error">{errorMessage}</p>
              ) : null}
              {successMessage ? (
                <p className="dashboard-message dashboard-message-success">{successMessage}</p>
              ) : null}

              <button className="composer-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Publishing...' : 'Create New Post'}
              </button>
            </form>
          </section>

          <section className="dashboard-panel dashboard-feed-panel">
            <div className="panel-heading">
              <div>
                <p className="dashboard-kicker">Recent activity</p>
                <h3>Posts and delivery targets</h3>
              </div>
              <button className="refresh-button" type="button" onClick={() => loadDashboard()}>
                Refresh
              </button>
            </div>

            <div className="platform-summary">
              <div className="platform-management-section">
                <div className="platform-section-header">
                  <h4 className="platform-section-title">Connected Platforms</h4>
                  <button 
                    className="connect-platform-button"
                    onClick={() => setIsConnectModalOpen(true)}
                    type="button"
                  >
                    + Connect New
                  </button>
                </div>

                {platformAccounts.length > 0 ? (
                  <div className="connected-platforms">
                    {platformAccounts.map((account) => {
                      const label = account.platform_name
                      const isConnected = Boolean(account.is_connected)

                      return (
                        <article key={account.id} className={`connection-card ${isConnected ? 'connection-card-connected' : ''}`}>
                          <div>
                            <p className="connection-label">{label}</p>
                            <p className="connection-copy">
                              {isConnected ? 'Connected and ready' : 'Disconnected'}
                            </p>
                          </div>
                          <div className="connection-card-actions">
                            <span className={`connection-status ${isConnected ? 'connection-status-connected' : ''}`}>
                              {isConnected ? 'Live' : 'Offline'}
                            </span>
                            {isConnected && (
                              <button
                                className="disconnect-button"
                                onClick={() => handleDisconnectPlatform(account.id)}
                                type="button"
                              >
                                Disconnect
                              </button>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state compact">
                    <p>No connected accounts yet.</p>
                    <span>Click "Connect New" to add your first platform.</span>
                  </div>
                )}
              </div>
            </div>

            {isConnectModalOpen && (
              <div className="modal-overlay" onClick={() => setIsConnectModalOpen(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>{selectedPlatformForAuth ? `Connect ${platformLabels[selectedPlatformForAuth]}` : 'Connect a Platform'}</h3>
                    <button
                      className="modal-close-button"
                      onClick={() => {
                        setIsConnectModalOpen(false)
                        setSelectedPlatformForAuth(null)
                      }}
                      type="button"
                    >
                      ×
                    </button>
                  </div>

                  <div className="modal-body">
                    {!selectedPlatformForAuth ? (
                      <>
                        <p className="modal-description">
                          Select a platform to connect your account and start sharing your posts.
                        </p>

                        <div className="platform-options">
                          {supportedPlatforms.map((platform) => {
                            const alreadyConnected = platformAccounts.some(
                              (acc) => acc.platform_name === platform && acc.is_connected
                            )

                            return (
                              <button
                                key={platform}
                                className={`platform-option ${alreadyConnected ? 'disabled' : ''}`}
                                onClick={() => {
                                  if (!alreadyConnected) {
                                    handleSelectPlatformForAuth(platform)
                                  }
                                }}
                                disabled={alreadyConnected}
                                type="button"
                              >
                                <span className="platform-option-name">
                                  {platformLabels[platform]}
                                </span>
                                {alreadyConnected && (
                                  <span className="platform-option-status">Connected</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </>
                    ) : (
                      <form onSubmit={handleConnectPlatform} className="credential-form">
                        <button
                          type="button"
                          className="credential-back-button"
                          onClick={() => setSelectedPlatformForAuth(null)}
                        >
                          ← Back to Platforms
                        </button>

                        <p className="modal-description">
                          Enter your credentials to connect your {platformLabels[selectedPlatformForAuth]} account.
                        </p>

                        <div className="credential-field-group">
                          <label htmlFor="accessToken" className="credential-label">
                            {selectedPlatformForAuth === 'linkedin' ? 'LinkedIn Client ID' :
                             selectedPlatformForAuth === 'x' ? 'API Key or Bearer Token' :
                             selectedPlatformForAuth === 'instagram' ? 'Instagram Business Account Token' :
                             selectedPlatformForAuth === 'facebook' ? 'Facebook Access Token' :
                             selectedPlatformForAuth === 'threads' ? 'Threads API Token' :
                             'Access Token'}
                          </label>
                          <input
                            id="accessToken"
                            type="password"
                            className="credential-input"
                            placeholder={selectedPlatformForAuth === 'linkedin' ? "Enter your Client ID" : "Enter your access token"}
                            value={credentialForm.accessToken || credentialForm.apiKey}
                            onChange={(e) => setCredentialForm({
                              ...credentialForm,
                              accessToken: e.target.value,
                              apiKey: e.target.value,
                            })}
                            required
                          />
                          <p className="credential-hint">
                            {selectedPlatformForAuth === 'linkedin' ? 'Get your Client ID from LinkedIn Developer console. We will redirect you to authenticate.' :
                             selectedPlatformForAuth === 'x' ? 'Get your API keys from X Developer Portal' :
                             selectedPlatformForAuth === 'instagram' ? 'Create a token in Instagram Business settings' :
                             selectedPlatformForAuth === 'facebook' ? 'Generate token from Facebook Developer' :
                             selectedPlatformForAuth === 'threads' ? 'Create token from Threads settings' :
                             ''}
                          </p>
                        </div>

                        {selectedPlatformForAuth === 'linkedin' && (
                          <div className="credential-field-group">
                            <label htmlFor="clientSecret" className="credential-label">
                              LinkedIn Client Secret
                            </label>
                            <input
                              id="clientSecret"
                              type="password"
                              className="credential-input"
                              placeholder="Enter your Client Secret"
                              value={credentialForm.clientSecret}
                              onChange={(e) => setCredentialForm({
                                ...credentialForm,
                                clientSecret: e.target.value,
                              })}
                              required
                            />
                          </div>
                        )}

                        {selectedPlatformForAuth !== 'instagram' && selectedPlatformForAuth !== 'linkedin' && (
                          <div className="credential-field-group">
                            <label htmlFor="refreshToken" className="credential-label">
                              Refresh Token (Optional)
                            </label>
                            <input
                              id="refreshToken"
                              type="password"
                              className="credential-input"
                              placeholder="Enter refresh token if applicable"
                              value={credentialForm.refreshToken}
                              onChange={(e) => setCredentialForm({
                                ...credentialForm,
                                refreshToken: e.target.value,
                              })}
                            />
                          </div>
                        )}

                        {errorMessage && (
                          <p className="modal-error">{errorMessage}</p>
                        )}

                        <button
                          type="submit"
                          className="credential-submit-button"
                          disabled={isConnectingPlatform || !credentialForm.accessToken?.trim()}
                        >
                          {isConnectingPlatform ? 'Connecting...' : 'Connect Account'}
                        </button>
                      </form>
                    )}

                    {!selectedPlatformForAuth && (
                      <>
                        {errorMessage && (
                          <p className="modal-error">{errorMessage}</p>
                        )}
                        {successMessage && (
                          <p className="modal-success">{successMessage}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="post-list">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <article key={post.id} className="post-card">
                    <div className="post-card-header">
                      <div>
                        <p className="post-card-title">{post.status ?? 'draft'}</p>
                        <span className="post-card-time">{formatDateTime(post.created_at)}</span>
                      </div>
                      <span className={`status-pill status-pill-${post.status ?? 'draft'}`}>
                        {post.status ?? 'draft'}
                      </span>
                    </div>

                    <p className="post-card-content">{post.content}</p>

                    <div className="post-card-section">
                      <span className="post-section-label">Targets</span>
                      <div className="target-badges">
                        {post.targets.length > 0 ? (
                          post.targets.map((target) => (
                            <span key={target.id} className={`target-badge target-badge-${target.status ?? 'pending'}`}>
                              {target.platform_name}
                            </span>
                          ))
                        ) : (
                          <span className="target-badge muted">No platform targets yet</span>
                        )}
                      </div>
                    </div>

                    <div className="post-card-section split">
                      <div>
                        <span className="post-section-label">Schedule</span>
                        <p className="post-section-value">{formatDateTime(post.scheduled_at)}</p>
                      </div>
                      <div>
                        <span className="post-section-label">Media</span>
                        <p className="post-section-value">
                          {post.media_urls.length > 0
                            ? `${post.media_urls.length} attachment${post.media_urls.length > 1 ? 's' : ''}`
                            : 'No media attached'}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <h3>No posts yet</h3>
                  <p>Create your first post on the left and it will show up here with its platform targets.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
