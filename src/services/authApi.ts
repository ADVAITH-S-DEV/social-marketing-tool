import { supabase } from './supabaseClient'

type LoginPayload = {
  email: string
  password: string
}

type RegisterPayload = {
  username: string
  email: string
  password: string
}

export async function loginUser(payload: LoginPayload) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return {
    token: data.session?.access_token,
    message: 'Login successful.',
    user: data.user,
  }
}

export async function registerUser(payload: RegisterPayload) {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        username: payload.username,
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  const requiresEmailVerification = !data.session

  return {
    message: requiresEmailVerification
      ? 'Registration successful. Please verify your email before login.'
      : 'Registration successful. You can sign in now.',
    user: data.user,
  }
}
