import { supabase } from './supabaseClient'

export const supportedPlatforms = ['x', 'instagram', 'facebook', 'threads', 'linkedin'] as const

export type SupportedPlatform = (typeof supportedPlatforms)[number]

export type PostPlatformTarget = {
  id: string
  platform_name: string
  platform_post_id: string | null
  status: string | null
  error_message: string | null
  published_at: string | null
}

export type DashboardPost = {
  id: string
  content: string
  media_urls: string[]
  status: string | null
  scheduled_at: string | null
  created_at: string | null
  targets: PostPlatformTarget[]
}

export type PlatformAccount = {
  id: string
  platform_name: string
  is_connected: boolean | null
  token_expires_at: string | null
  created_at: string | null
}

export type DashboardData = {
  posts: DashboardPost[]
  platformAccounts: PlatformAccount[]
}

function normalizeMediaUrls(mediaUrls: string[] | null | undefined) {
  return mediaUrls ?? []
}

export async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const [postsResponse, accountsResponse] = await Promise.all([
    supabase
      .from('posts')
      .select('id, content, media_urls, status, scheduled_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('platform_accounts')
      .select('id, platform_name, is_connected, token_expires_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ])

  if (postsResponse.error) {
    throw new Error(postsResponse.error.message)
  }

  if (accountsResponse.error) {
    throw new Error(accountsResponse.error.message)
  }

  const posts = postsResponse.data ?? []
  const postIds = posts.map((post) => post.id)

  let targetsByPostId = new Map<string, PostPlatformTarget[]>()

  if (postIds.length > 0) {
    const targetsResponse = await supabase
      .from('post_platform_targets')
      .select('id, post_id, platform_name, platform_post_id, status, error_message, published_at')
      .in('post_id', postIds)
      .order('published_at', { ascending: false, nullsFirst: false })

    if (targetsResponse.error) {
      throw new Error(targetsResponse.error.message)
    }

    targetsByPostId = (targetsResponse.data ?? []).reduce((mapping, target) => {
      const targetList = mapping.get(target.post_id) ?? []
      targetList.push({
        id: target.id,
        platform_name: target.platform_name,
        platform_post_id: target.platform_post_id,
        status: target.status,
        error_message: target.error_message,
        published_at: target.published_at,
      })
      mapping.set(target.post_id, targetList)
      return mapping
    }, new Map<string, PostPlatformTarget[]>())
  }

  return {
    posts: posts.map((post) => ({
      id: post.id,
      content: post.content,
      media_urls: normalizeMediaUrls(post.media_urls),
      status: post.status,
      scheduled_at: post.scheduled_at,
      created_at: post.created_at,
      targets: targetsByPostId.get(post.id) ?? [],
    })),
    platformAccounts: accountsResponse.data ?? [],
  }
}

export async function createDashboardPost(input: {
  userId: string
  content: string
  mediaUrls: string[]
  scheduledAt: string | null
  platformNames: SupportedPlatform[]
}) {
  const postStatus = input.scheduledAt ? 'scheduled' : 'draft'

  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      user_id: input.userId,
      content: input.content,
      media_urls: input.mediaUrls.length > 0 ? input.mediaUrls : null,
      status: postStatus,
      scheduled_at: input.scheduledAt,
    })
    .select('id, content, media_urls, status, scheduled_at, created_at')
    .single()

  if (postError) {
    throw new Error(postError.message)
  }

  if (input.platformNames.length > 0) {
    const { error: targetsError } = await supabase.from('post_platform_targets').insert(
      input.platformNames.map((platformName) => ({
        post_id: post.id,
        platform_name: platformName,
        status: 'pending',
      })),
    )

    if (targetsError) {
      throw new Error(targetsError.message)
    }
  }

  return {
    id: post.id,
    content: post.content,
    media_urls: normalizeMediaUrls(post.media_urls),
    status: post.status,
    scheduled_at: post.scheduled_at,
    created_at: post.created_at,
    targets: [],
  }
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

export async function connectPlatform(userId: string, platform: SupportedPlatform, token: string, refreshToken?: string) {
  const { error } = await supabase.from('platform_accounts').upsert({
    user_id: userId,
    platform_name: platform,
    access_token: token,
    refresh_token: refreshToken || null,
    is_connected: true,
  }, {
    onConflict: 'user_id,platform_name'
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function disconnectPlatform(connectionId: string) {
  const { error } = await supabase.from('platform_accounts').delete()
    .eq('id', connectionId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function exchangeOAuthCode(userId: string, platform: SupportedPlatform, code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<string> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
  
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token

  if (!token) {
    throw new Error('No active session')
  }

  try {
    const response = await fetch(`${backendUrl}/api/platformconnections/oauth-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        platform,
        code,
        clientId,
        clientSecret,
        redirectUri
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to exchange OAuth code')
    }

    const result = await response.json()
    return result.message || `Connected to ${platform}`
  } catch (error) {
    throw new Error(`OAuth Exchange failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function publishPostToPlatform(userId: string, postId: string, platform: SupportedPlatform, content: string): Promise<void> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
  
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token

  if (!token) {
    throw new Error('No active session')
  }

  // 1. Send publish request to .NET backend
  const response = await fetch(`${backendUrl}/api/posts/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      userId,
      postId,
      platform,
      content
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const detailedMessage = errorData.details ? `${errorData.error} - ${errorData.details}` : errorData.error || 'Failed to publish post'

    // Update target status to failed
    await supabase.from('post_platform_targets')
      .update({ status: 'failed', error_message: detailedMessage })
      .eq('post_id', postId)
      .eq('platform_name', platform)
      
    throw new Error(detailedMessage)
  }

  // 2. Update status in Supabase to 'published'
  await supabase.from('post_platform_targets')
    .update({ status: 'published', published_at: new Date().toISOString(), error_message: null })
    .eq('post_id', postId)
    .eq('platform_name', platform)
}
