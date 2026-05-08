import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../services/authApi'

type FormState = {
  email: string
  password: string
}

const initialFormState: FormState = {
  email: '',
  password: '',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (!formState.email || !formState.password) {
      setErrorMessage('Please fill in all required fields.')
      return
    }

    try {
      setIsSubmitting(true)
      const result = await loginUser(formState)

      if (result.session) {
        navigate('/dashboard', { replace: true })
        return
      }

      navigate('/dashboard', { replace: true })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Login failed. Please try again.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <p className="auth-kicker">Social Marketing Tool</p>
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">
          Sign in to manage and publish content across your connected platforms.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="auth-input"
            type="email"
            value={formState.email}
            onChange={(event) =>
              setFormState((previousState) => ({
                ...previousState,
                email: event.target.value,
              }))
            }
            placeholder="you@company.com"
            autoComplete="email"
            required
          />

          <label className="auth-label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className="auth-input"
            type="password"
            value={formState.password}
            onChange={(event) =>
              setFormState((previousState) => ({
                ...previousState,
                password: event.target.value,
              }))
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          {errorMessage ? (
            <p className="auth-message auth-message-error">{errorMessage}</p>
          ) : null}
          <button className="auth-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer-text">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  )
}
