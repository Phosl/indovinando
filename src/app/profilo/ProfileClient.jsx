'use client'

import {useEffect, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {useWineCourseProgress} from '@/app/corso-vino/hooks/useWineCourseProgress'
import styles from './profilo.module.scss'

const AVATARS = ['😀', '😎', '🤓', '🧠', '🍷', '🍇', '🧑‍🍳', '🚀', '🎯', '🏅']
const AVATAR_STORAGE_KEY = 'profile_avatar_emoji'

function computeCourseStats(levels, progress) {
  const totalLessons = levels.reduce((sum, level) => sum + level.lessonIds.length, 0)
  const completedLessons = levels.reduce(
    (sum, level) => sum + level.lessonIds.filter((id) => progress[level.id]?.[id]?.completed).length,
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

export default function ProfileClient({userLabel, email, levels, gamesCount}) {
  const router = useRouter()
  const {lang} = useLanguage()
  const {progress, loaded} = useWineCourseProgress()
  const isEnglish = lang === 'en'

  const [avatar, setAvatar] = useState('😀')

  useEffect(() => {
    const saved = localStorage.getItem(AVATAR_STORAGE_KEY)
    if (saved && AVATARS.includes(saved)) {
      setAvatar(saved)
    }
  }, [])

  function selectAvatar(nextAvatar) {
    setAvatar(nextAvatar)
    localStorage.setItem(AVATAR_STORAGE_KEY, nextAvatar)
  }

  const stats = useMemo(() => computeCourseStats(levels, progress), [levels, progress])

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.topBar}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.push('/dashboard')}
            aria-label={isEnglish ? 'Back to dashboard' : 'Torna alla dashboard'}>
            ← {isEnglish ? 'Back' : 'Indietro'}
          </button>
          <h1 className={styles.pageTitle}>{isEnglish ? 'Profile' : 'Profilo'}</h1>
        </header>

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
              <span className={styles.statLabel}>{isEnglish ? 'Games created' : 'Giochi creati'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {loaded ? `${stats.completedLessons}/${stats.totalLessons}` : '...'}
              </span>
              <span className={styles.statLabel}>{isEnglish ? 'Lessons completed' : 'Lezioni completate'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {loaded ? `${stats.completedLevels}/${stats.totalLevels}` : '...'}
              </span>
              <span className={styles.statLabel}>{isEnglish ? 'Levels completed' : 'Livelli completati'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{loaded ? stats.currentLevelOrder : '...'}</span>
              <span className={styles.statLabel}>{isEnglish ? 'Current level' : 'Livello attuale'}</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
