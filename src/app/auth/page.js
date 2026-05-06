'use client'

import {useState} from 'react'
import {createClient} from '@/lib/supabaseClient'
import {useRouter, useSearchParams} from 'next/navigation'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/
const MIN_USERNAME_LENGTH = 3

export default function AuthPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/dashboard'
  const safeNextPath = nextPath.startsWith('/') ? nextPath : '/dashboard'

  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validateEmail = (value) => {
    if (!value) return 'Email is required'
    if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email'
    return ''
  }

  const validatePassword = (value) => {
    if (!value) return 'Password is required'
    if (value.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    }
    return ''
  }

  const validateUsername = (value) => {
    if (!value) return 'Username is required'
    if (value.length < MIN_USERNAME_LENGTH) {
      return `Username must be at least ${MIN_USERNAME_LENGTH} characters`
    }
    if (!USERNAME_REGEX.test(value)) {
      return 'Username can contain only letters, numbers and _'
    }
    return ''
  }

  const getValidationErrors = () => {
    const errors = []

    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    const usernameError = !isLogin ? validateUsername(username) : ''

    if (emailError) errors.push(emailError)
    if (passwordError) errors.push(passwordError)
    if (usernameError) errors.push(usernameError)

    return errors
  }

  async function handleAuth() {
    setError('')

    const validationErrors = getValidationErrors()
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '))
      return
    }

    setLoading(true)

    try {
      if (isLogin) {
        const {error} = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message)
          return
        }

        router.push(safeNextPath)
      } else {
        const {data, error} = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          setError(error.message)
          return
        }

        // 🔥 salva username nel profile subito
        if (data?.user && username) {
          const {error: profileError} = await supabase.from('profiles').upsert({
            id: data.user.id,
            username: username.trim(),
          })

          if (profileError) {
            setError(profileError.message)
            return
          }
        }

        setUsername('')
        setEmail('')
        setPassword('')

        if (data?.session) {
          router.push(safeNextPath)
          return
        }

        const {error: loginAfterSignupError} = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (loginAfterSignupError) {
          setError('Registrazione completata. Controlla la mail per confermare il tuo account.')
          return
        }

        router.push(safeNextPath)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setUsername('')
    setEmail('')
    setPassword('')
  }

  return (
    <main className="flex-container">
      <div className="flex-column">
        <h1>{isLogin ? 'Login' : 'Register'}</h1>

        {error && <div className="error-message">{error}</div>}

        {!isLogin && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setError('')
            }}
            disabled={loading}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError('')
          }}
          disabled={loading}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError('')
          }}
          disabled={loading}
        />

        <button
          onClick={handleAuth}
          disabled={loading}
          className={'btn' + (loading ? ' btn-primary btn-notallowed' : ' btn-primary')}>
          {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
        </button>

        <button
          onClick={handleToggleMode}
          disabled={loading}
          className={'btn type-text' + (loading ? ' btn-primary btn-notallowed' : ' btn-primary')}>
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
        </button>
      </div>
    </main>
  )
}
