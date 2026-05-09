'use client'

import {useState, Suspense} from 'react'
import {createClient} from '@/lib/supabaseClient'
import {useRouter, useSearchParams} from 'next/navigation'
import {useLanguage} from '@/components/i18n/LanguageProvider'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/
const MIN_USERNAME_LENGTH = 3

function AuthForm() {
  const supabase = createClient()
  const router = useRouter()
  const {lang} = useLanguage()
  const isEnglish = lang === 'en'
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
    if (!value) return isEnglish ? 'Email is required' : 'Email obbligatoria'
    if (!EMAIL_REGEX.test(value)) {
      return isEnglish ? 'Please enter a valid email' : 'Inserisci un indirizzo email valido'
    }
    return ''
  }

  const validatePassword = (value) => {
    if (!value) return isEnglish ? 'Password is required' : 'Password obbligatoria'
    if (value.length < MIN_PASSWORD_LENGTH) {
      return isEnglish
        ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
        : `La password deve essere di almeno ${MIN_PASSWORD_LENGTH} caratteri`
    }
    return ''
  }

  const validateUsername = (value) => {
    if (!value) return isEnglish ? 'Username is required' : 'Username obbligatorio'
    if (value.length < MIN_USERNAME_LENGTH) {
      return isEnglish
        ? `Username must be at least ${MIN_USERNAME_LENGTH} characters`
        : `Lo username deve essere di almeno ${MIN_USERNAME_LENGTH} caratteri`
    }
    if (!USERNAME_REGEX.test(value)) {
      return isEnglish
        ? 'Username can contain only letters, numbers and _'
        : 'Lo username puo contenere solo lettere, numeri e _'
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
          setError(
            isEnglish
              ? 'Registration completed. Check your email to confirm your account.'
              : "Registrazione completata. Controlla l'email per confermare l'account.",
          )
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
        <h1>
          {isLogin ? (isEnglish ? 'Login' : 'Accedi') : isEnglish ? 'Register' : 'Registrati'}
        </h1>

        {error && <div className="error-message">{error}</div>}

        {!isLogin && (
          <input
            type="text"
            placeholder={isEnglish ? 'Username' : 'Nome utente'}
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
          placeholder={isEnglish ? 'Password' : 'Password'}
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
          {loading
            ? isEnglish
              ? 'Loading...'
              : 'Caricamento...'
            : isLogin
              ? isEnglish
                ? 'Login'
                : 'Accedi'
              : isEnglish
                ? 'Register'
                : 'Registrati'}
        </button>

        <button
          onClick={handleToggleMode}
          disabled={loading}
          className={'btn type-text' + (loading ? ' btn-primary btn-notallowed' : ' btn-primary')}>
          {isLogin
            ? isEnglish
              ? "Don't have an account? Register"
              : 'Non hai un account? Registrati'
            : isEnglish
              ? 'Already have an account? Login'
              : 'Hai gia un account? Accedi'}
        </button>
      </div>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
