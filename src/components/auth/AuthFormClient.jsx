'use client'

import {useState, Suspense} from 'react'
import {createClient} from '@/lib/supabaseClient'
import {useRouter, useSearchParams} from 'next/navigation'
import {useT} from '@/lib/i18n/useT'
import styles from '@/components/auth/AuthEntryClient.module.scss'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/
const MIN_USERNAME_LENGTH = 3

function AuthForm() {
  const supabase = createClient()
  const router = useRouter()
  const t = useT('auth')
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
    if (!value) return t('emailRequired')
    if (!EMAIL_REGEX.test(value)) return t('emailInvalid')
    return ''
  }

  const validatePassword = (value) => {
    if (!value) return t('passwordRequired')
    if (value.length < MIN_PASSWORD_LENGTH) return t('passwordTooShort', {min: MIN_PASSWORD_LENGTH})
    return ''
  }

  const validateUsername = (value) => {
    if (!value) return t('usernameRequired')
    if (value.length < MIN_USERNAME_LENGTH) return t('usernameTooShort', {min: MIN_USERNAME_LENGTH})
    if (!USERNAME_REGEX.test(value)) return t('usernameInvalid')
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
        const {error: loginError} = await supabase.auth.signInWithPassword({email, password})
        if (loginError) {
          setError(loginError.message)
          return
        }
        router.push(safeNextPath)
      } else {
        const {data, error: signupError} = await supabase.auth.signUp({email, password})
        if (signupError) {
          setError(signupError.message)
          return
        }
        if (data?.user && username) {
          const {error: profileError} = await supabase
            .from('profiles')
            .upsert({id: data.user.id, username: username.trim()})
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
          setError(t('registrationComplete'))
          return
        }
        router.push(safeNextPath)
      }
    } finally {
      setLoading(false)
    }
  }

  function toggleMode(nextIsLogin) {
    if (nextIsLogin === isLogin) return
    setIsLogin(nextIsLogin)
    setError('')
    setUsername('')
    setEmail('')
    setPassword('')
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.shell}>
          <div className={styles.brandBlock}>
            <img src="/logo.svg" alt="Indovinando Logo" className={styles.logo} />
            <p className={styles.tagline}>{t('tagline')}</p>
          </div>

          <div className={styles.formCard}>
            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={styles.form}>
              {!isLogin && (
                <input
                  type="text"
                  className={styles.input}
                  placeholder={t('usernamePlaceholder')}
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
                className={styles.input}
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                disabled={loading}
              />

              <input
                type="password"
                className={styles.input}
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                disabled={loading}
              />

              <button onClick={handleAuth} disabled={loading} className="btn primary" type="button">
                {loading ? t('loading') : isLogin ? t('login') : t('register')}
              </button>

              <button
                onClick={() => toggleMode(!isLogin)}
                disabled={loading}
                className="btn type-text"
                type="button">
                {isLogin ? t('switchToRegister') : t('switchToLogin')}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default function AuthFormClient() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
