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

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.shell}>
          <a href="/" className={styles.authExitBtn}>
            {t('exitToHome')}
          </a>

          <div className={styles.formCard}>
            {error && <div className={styles.errorMessage}>{error}</div>}
            {info && (
              <div
                className={styles.errorMessage}
                style={{backgroundColor: '#eefaf1', color: '#1f6d37', border: '1px solid #bfe8c9'}}>
                {info}
              </div>
            )}

            <div className={styles.form}>
              {!isLogin && !isForgot && (
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

              {!isForgot && (
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
              )}

              <button
                onClick={handleAuth}
                disabled={loading}
                className={styles.authSubmitBtn}
                type="button">
                {loading
                  ? t('loading')
                  : isForgot
                    ? t('sendResetLink')
                    : isLogin
                      ? t('login')
                      : t('register')}
              </button>

              {isLogin && (
                <button
                  onClick={openForgot}
                  disabled={loading}
                  className={styles.authSecondaryBtn}
                  type="button">
                  {t('forgotPassword')}
                </button>
              )}

              {isForgot && (
                <button
                  onClick={backToLogin}
                  disabled={loading}
                  className={styles.authSecondaryBtn}
                  type="button">
                  {t('backToLogin')}
                </button>
              )}

              {!isForgot && (
                <button
                  onClick={() => toggleMode(!isLogin)}
                  disabled={loading}
                  className={styles.authSecondaryBtn}
                  type="button">
                  {isLogin ? t('switchToRegister') : t('switchToLogin')}
                </button>
              )}
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
