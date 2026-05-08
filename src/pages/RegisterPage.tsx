import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { registerUser } from '../services/authApi'

type FormState = {
  username: string
  email: string
  password: string
  confirmPassword: string
}

const initialFormState: FormState = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export default function RegisterPage() {
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (
      !formState.username ||
      !formState.email ||
      !formState.password ||
      !formState.confirmPassword
    ) {
      setErrorMessage('Please fill in all required fields.')
      return
    }

    if (formState.password !== formState.confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    try {
      setIsSubmitting(true)
      const result = await registerUser({
        username: formState.username,
        email: formState.email,
        password: formState.password,
      })

      setSuccessMessage(result.message ?? 'Registration successful. You can sign in now.')
      setFormState(initialFormState)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Registration failed. Please try again.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <p className="auth-kicker">Social Marketing Tool</p>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">
          Set up your account to connect Instagram, Facebook, Threads, LinkedIn, and more.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-label" htmlFor="register-username">
            Username
          </label>
          <input
            id="register-username"
            className="auth-input"
            type="text"
            value={formState.username}
            onChange={(event) =>
              setFormState((previousState) => ({
                ...previousState,
                username: event.target.value,
              }))
            }
            placeholder="Choose a username"
            autoComplete="username"
            required
          />

          <label className="auth-label" htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
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

          <label className="auth-label" htmlFor="register-password">
            Password
          </label>
          <input
            id="register-password"
            className="auth-input"
            type="password"
            value={formState.password}
            onChange={(event) =>
              setFormState((previousState) => ({
                ...previousState,
                password: event.target.value,
              }))
            }
            placeholder="Create a password"
            autoComplete="new-password"
            required
          />

          <label className="auth-label" htmlFor="register-confirm-password">
            Confirm Password
          </label>
          <input
            id="register-confirm-password"
            className="auth-input"
            type="password"
            value={formState.confirmPassword}
            onChange={(event) =>
              setFormState((previousState) => ({
                ...previousState,
                confirmPassword: event.target.value,
              }))
            }
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
          />

          {errorMessage ? (
            <p className="auth-message auth-message-error">{errorMessage}</p>
          ) : null}
          {successMessage ? (
            <p className="auth-message auth-message-success">{successMessage}</p>
          ) : null}

          <button className="auth-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
