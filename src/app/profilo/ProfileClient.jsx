'use client'

import {useEffect, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {useWineCourseProgress} from '@/app/corso-vino/hooks/useWineCourseProgress'
import {supabaseClient} from '@/lib/supabaseClient'
import styles from './profilo.module.scss'

const AVATARS = [
  '😀',
  '😎',
  '🤓',
  '🧠',
  '🍷',
  '🍇',
  '🧑‍🍳',
  '🚀',
  '🏅',
  '🦊',
  '🐼',
  '🦁',
  '🐯',
  '🐨',
  '🐙',
  '🦉',
  '🐧',
  '🔥',
  '⚡',
  '🌟',
  '🎲',
  '🎮',
  '🎸',
  '📚',
  '🧪',
  '🧭',
  '🛰️',
  '🌊',
  '⛰️',
]
const AVATAR_STORAGE_KEY = 'profile_avatar_emoji'

function computeCourseStats(levels, progress) {
  const totalLessons = levels.reduce((sum, level) => sum + level.lessonIds.length, 0)
  const completedLessons = levels.reduce(
    (sum, level) =>
      sum + level.lessonIds.filter((id) => progress[level.id]?.[id]?.completed).length,
    0,
  )

  const completedLevels = levels.filter((level) =>
    level.lessonIds.every((id) => progress[level.id]?.[id]?.completed),
  ).length

  const currentLevel =
    levels.find((level) => level.lessonIds.some((id) => !progress[level.id]?.[id]?.completed)) ||
    levels[levels.length - 1] ||
    null

  return {
    totalLessons,
    completedLessons,
    completedLevels,
    totalLevels: levels.length,
    currentLevelOrder: currentLevel?.order ?? 1,
  }
}

export default function ProfileClient({
  userId,
  userLabel,
  email,
  initialAvatar,
  levels,
  gamesCount,
}) {
  const router = useRouter()
  const {lang} = useLanguage()
  const {progress, loaded} = useWineCourseProgress()
  const isEnglish = lang === 'en'
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const [avatar, setAvatar] = useState(
    initialAvatar && AVATARS.includes(initialAvatar) ? initialAvatar : '😀',
  )

  useEffect(() => {
    const saved = localStorage.getItem(AVATAR_STORAGE_KEY)
    if (saved && AVATARS.includes(saved)) {
      setAvatar(saved)
      return
    }
    if (initialAvatar && AVATARS.includes(initialAvatar)) setAvatar(initialAvatar)
  }, [initialAvatar])

  async function selectAvatar(nextAvatar) {
    setAvatar(nextAvatar)
    localStorage.setItem(AVATAR_STORAGE_KEY, nextAvatar)

    if (userId) {
      const {error} = await supabaseClient.from('profiles').upsert(
        {
          id: userId,
          avatar_emoji: nextAvatar,
          updated_at: new Date().toISOString(),
        },
        {onConflict: 'id'},
      )

      if (error) {
        console.error('[profile] failed to persist avatar_emoji:', error.message)
      }
    }
  }

  async function handleLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    try {
      await supabaseClient.auth.signOut()
    } catch (error) {
      console.error('[profile] sign out error:', error)
    } finally {
      try {
        localStorage.clear()
      } catch {}
      try {
        sessionStorage.clear()
      } catch {}
      router.replace('/auth')
      router.refresh()
      setIsLoggingOut(false)
    }
  }

  const stats = useMemo(() => computeCourseStats(levels, progress), [levels, progress])

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <TopBar title={isEnglish ? 'Profile' : 'Profilo'}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => router.push('/dashboard')}
            aria-label={isEnglish ? 'Back to dashboard' : 'Torna alla dashboard'}>
            ← {isEnglish ? 'Back' : 'Indietro'}
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label={isEnglish ? 'Log out' : 'Esci'}>
            {isLoggingOut
              ? isEnglish
                ? 'Logging out...'
                : 'Disconnessione...'
              : isEnglish
                ? 'Logout'
                : 'Logout'}
          </button>
        </TopBar>

        <section className={styles.headerCard}>
          <div className={styles.userRow}>
            <div className={styles.avatar}>{avatar}</div>
            <div>
              <h2 className={styles.name}>{userLabel}</h2>
              <p className={styles.email}>{email}</p>
            </div>
          </div>

          <div className={styles.languageRow}>
            <span className={styles.label}>{isEnglish ? 'Language' : 'Lingua'}</span>
            <LanguageSwitcher inline />
          </div>
        </section>

        <section className={styles.card}>
          <h2>{isEnglish ? 'How the app works' : "Come funziona l'app"}</h2>
          <p className={styles.quickInfoText}>
            {isEnglish
              ? 'Open the onboarding guide with slides for Create Game, Quick Game, Enoteca, Live and Wine Course.'
              : 'Apri la guida onboarding con slide su Crea Gioco, Gioco Veloce, Enoteca, Live e Corso Vino.'}
          </p>
          <a href="/info" className="btn accent">
            {isEnglish ? 'Open app guide' : 'Apri guida app'}
          </a>
        </section>

        <section className={styles.card}>
          <h2>{isEnglish ? 'Choose your avatar' : 'Scegli il tuo avatar'}</h2>
          <div className={styles.avatarGrid}>
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                className={`${styles.avatarOption} ${avatar === emoji ? styles.avatarOptionActive : ''}`}
                onClick={() => selectAvatar(emoji)}
                type="button"
                aria-label={`avatar ${emoji}`}>
                {emoji}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <h2>{isEnglish ? 'Your stats' : 'Le tue statistiche'}</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{gamesCount}</span>
              <span className={styles.statLabel}>
                {isEnglish ? 'Games created' : 'Giochi creati'}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {loaded ? `${stats.completedLessons}/${stats.totalLessons}` : '...'}
              </span>
              <span className={styles.statLabel}>
                {isEnglish ? 'Lessons completed' : 'Lezioni completate'}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {loaded ? `${stats.completedLevels}/${stats.totalLevels}` : '...'}
              </span>
              <span className={styles.statLabel}>
                {isEnglish ? 'Levels completed' : 'Livelli completati'}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{loaded ? stats.currentLevelOrder : '...'}</span>
              <span className={styles.statLabel}>
                {isEnglish ? 'Current level' : 'Livello attuale'}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
