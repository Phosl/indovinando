'use client'

import {useEffect, useState, Suspense} from 'react'
import {createClient, resetBrowserClient} from '@/lib/supabaseClient'
import {useRouter, useSearchParams} from 'next/navigation'
import {useT} from '@/lib/i18n/useT'
import TopBar from '@/components/TopBar'
import styles from './AuthFormClient.module.scss'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/
const MIN_USERNAME_LENGTH = 3
const LOGIN_TIMEOUT_MS = 12000
const TIMEOUT_RECOVERY_ATTEMPTS = 4
const TIMEOUT_RECOVERY_DELAY_MS = 400

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function AuthForm() {
  const router = useRouter()
  const t = useT('auth')
  const tHome = useT('home')
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/dashboard'
  const safeNextPath = nextPath.startsWith('/') ? nextPath : '/dashboard'
  const requestedMode = searchParams.get('mode')
  const defaultMode = requestedMode === 'register' ? 'register' : 'login'

  const [mode, setMode] = useState(defaultMode)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const isLogin = mode === 'login'
  const isForgot = mode === 'forgot'

  useEffect(() => {
    router.prefetch(safeNextPath)
  }, [router, safeNextPath])

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
    const passwordError = isForgot ? '' : validatePassword(password)
    const usernameError = !isLogin && !isForgot ? validateUsername(username) : ''
    if (emailError) errors.push(emailError)
    if (passwordError) errors.push(passwordError)
    if (usernameError) errors.push(usernameError)
    return errors
  }

  async function handleAuth() {
    const supabase = createClient()
    setError('')
    setInfo('')

    const validationErrors = getValidationErrors()
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '))
      return
    }

    setLoading(true)

    try {
      if (isForgot) {
        const {error: resetError} = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        })
        if (resetError) {
          setError(resetError.message)
          return
        }
        setInfo(t('resetEmailSent'))
        return
      }

      if (isLogin) {
        const {error: loginError} = await Promise.race([
          supabase.auth.signInWithPassword({email, password}),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('LOGIN_TIMEOUT')), LOGIN_TIMEOUT_MS)
          }),
        ])
        if (loginError) {
          setError(loginError.message)
          return
        }
        router.push(safeNextPath)
      } else {
        const normalizedUsername = username.trim()
        const {data, error: signupError} = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: normalizedUsername,
            },
          },
        })
        if (signupError) {
          setError(signupError.message)
          return
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
          setInfo(t('registrationComplete'))
          return
        }
        router.push(safeNextPath)
      }
    } catch (err) {
      if (err?.message === 'LOGIN_TIMEOUT') {
        // The login request can complete shortly after the timeout race.
        // Probe session state a few times before surfacing an error.
        for (let attempt = 0; attempt < TIMEOUT_RECOVERY_ATTEMPTS; attempt += 1) {
          const recoveryClient = createClient()
          const {
            data: {session},
          } = await recoveryClient.auth.getSession()

          if (session) {
            router.replace(safeNextPath)
            router.refresh()
            return
          }

          await wait(TIMEOUT_RECOVERY_DELAY_MS)
        }

        resetBrowserClient()
        setError(t('loginTimeout'))
        return
      }
      setError(err?.message || t('loginGenericError'))
    } finally {
      setLoading(false)
    }
  }

  function toggleMode(nextIsLogin) {
    const nextMode = nextIsLogin ? 'login' : 'register'
    if (nextMode === mode) return
    setMode(nextMode)
    setError('')
    setInfo('')
    setUsername('')
    setEmail('')
    setPassword('')
  }

  function openForgot() {
    setMode('forgot')
    setError('')
    setInfo('')
    setPassword('')
    setUsername('')
  }

  function backToLogin() {
    setMode('login')
    setError('')
    setInfo('')
    setPassword('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    handleAuth()
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <TopBar title={tHome('loginOrRegister')} onBack={() => router.push('/')} />

        <section className={styles.card}>
          <div className={styles.brandBlock}>
            <h1 className={styles.title}>
              {isForgot ? t('forgotTitle') : isLogin ? t('login') : t('register')}
            </h1>
            <p className={styles.subtitle}>{t('tagline')}</p>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}
          {info && <div className={styles.infoMessage}>{info}</div>}

          <form className={styles.form} onSubmit={handleSubmit}>
            {!isLogin && !isForgot && (
              <div className={styles.fieldBlock}>
                <label className={styles.fieldLabel} htmlFor="auth-username">
                  {t('usernamePlaceholder')}
                </label>
                <input
                  id="auth-username"
                  name="username"
                  type="text"
                  className={styles.input}
                  placeholder={t('usernamePlaceholder')}
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setError('')
                  }}
                  disabled={loading}
                />
              </div>
            )}

            <div className={styles.fieldBlock}>
              <label className={styles.fieldLabel} htmlFor="auth-email">
                {t('emailPlaceholder')}
              </label>
              <input
                id="auth-email"
                name="email"
                type="email"
                className={styles.input}
                placeholder={t('emailPlaceholder')}
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                disabled={loading}
              />
            </div>

            {!isForgot && (
              <div className={styles.fieldBlock}>
                <div className={styles.fieldHeader}>
                  <label className={styles.fieldLabel} htmlFor="auth-password">
                    {t('passwordPlaceholder')}
                  </label>
                  {isLogin && (
                    <button
                      onClick={openForgot}
                      disabled={loading}
                      className={`btn type-text ${styles.forgotInlineBtn}`}
                      type="button">
                      {t('forgotPassword')}
                    </button>
                  )}
                </div>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  className={styles.input}
                  placeholder={t('passwordPlaceholder')}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  disabled={loading}
                />
              </div>
            )}

            <div className={styles.actions}>
              <button
                disabled={loading}
                className="btn success-filled"
                type="submit">
                {loading
                  ? t('loading')
                  : isForgot
                    ? t('sendResetLink')
                    : isLogin
                      ? t('login')
                      : t('register')}
              </button>

              {isForgot && (
                <button
                  onClick={backToLogin}
                  disabled={loading}
                  className="btn neutral"
                  type="button">
                  {t('backToLogin')}
                </button>
              )}

              {!isForgot && (
                <button
                  onClick={() => toggleMode(!isLogin)}
                  disabled={loading}
                  className="btn type-text btn-small"
                  type="button">
                  {isLogin ? t('switchToRegister') : t('switchToLogin')}
                </button>
              )}
            </div>
          </form>
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
