'use client'

import {useEffect, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import {useWineCourseProgress} from '@/app/corso-vino/hooks/useWineCourseProgress'
import {supabaseClient} from '@/lib/supabaseClient'
import {useT} from '@/lib/i18n/useT'
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
  const t = useT('profile')
  const tc = useT('common')
  const {progress, loaded} = useWineCourseProgress()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

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

    const clearClientMemory = async () => {
      try {
        localStorage.clear()
      } catch {}

      try {
        sessionStorage.clear()
      } catch {}

      try {
        // Expire all cookies for current path and root path.
        const cookies = document.cookie ? document.cookie.split(';') : []
        cookies.forEach((cookie) => {
          const eqPos = cookie.indexOf('=')
          const name = (eqPos > -1 ? cookie.slice(0, eqPos) : cookie).trim()
          if (!name) return
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${window.location.pathname}`
        })
      } catch {}

      try {
        if (typeof caches !== 'undefined' && caches.keys) {
          const cacheKeys = await caches.keys()
          await Promise.all(cacheKeys.map((key) => caches.delete(key)))
        }
      } catch {}

      try {
        if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
          const dbs = await indexedDB.databases()
          await Promise.all(
            (dbs || [])
              .map((db) => db?.name)
              .filter(Boolean)
              .map((name) => {
                return new Promise((resolve) => {
                  const req = indexedDB.deleteDatabase(name)
                  req.onsuccess = () => resolve()
                  req.onerror = () => resolve()
                  req.onblocked = () => resolve()
                })
              }),
          )
        }
      } catch {}
    }

    try {
      // Prefer server-side signout (invalidates cookies reliably).
      // Fall back to client-side with a 3s timeout to avoid the GoTrueClient
      // init-queue hang that occurs when @supabase/ssr is used in an
      // authenticated browser context.
      await Promise.race([
        fetch('/api/auth/signout', {method: 'POST'}),
        supabaseClient.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ])
    } catch (error) {
      console.error('[profile] sign out error:', error)
    } finally {
      await clearClientMemory()
      router.replace('/')
      router.refresh()
      setIsLoggingOut(false)
    }
  }

  const stats = useMemo(() => computeCourseStats(levels, progress), [levels, progress])

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <TopBar title={t('title')} onBack={() => router.push('/dashboard')}></TopBar>

        <section className={styles.headerCard}>
          <div className={styles.userRow}>
            <div className={styles.avatar}>{avatar}</div>
            <div>
              <h2 className={styles.name}>{userLabel}</h2>
              <p className={styles.email}>{email}</p>
            </div>
          </div>

          <div className={styles.languageRow}>
            <span className={styles.label}>{t('language')}</span>
            <LanguageSwitcher inline />
          </div>
        </section>

        <section className={styles.card}>
          <h2>{t('howTheAppWorks')}</h2>
          <p className={styles.quickInfoText}>{t('howTheAppWorksDesc')}</p>
          <a href="/info" className="btn accent">
            {t('openAppGuide')}
          </a>
        </section>

        <section className={styles.card}>
          <h2>{t('chooseAvatar')}</h2>
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
          <h2>{t('yourStats')}</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{gamesCount}</span>
              <span className={styles.statLabel}>{t('gamesCreated')}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {loaded ? `${stats.completedLessons}/${stats.totalLessons}` : '...'}
              </span>
              <span className={styles.statLabel}>{t('lessonsCompleted')}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {loaded ? `${stats.completedLevels}/${stats.totalLevels}` : '...'}
              </span>
              <span className={styles.statLabel}>{t('levelsCompleted')}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{loaded ? stats.currentLevelOrder : '...'}</span>
              <span className={styles.statLabel}>{t('currentLevel')}</span>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2>{t('changelog')}</h2>
          <p className={styles.quickInfoText}>{t('changelogDesc')}</p>
          <a href="/changelog" className="btn secondary">
            {t('viewChangelog')}
          </a>
        </section>

        <section className={styles.card}>
          <button
            type="button"
            className={`btn secondary ${styles.logoutBtn}`}
            onClick={() => setShowLogoutConfirm(true)}
            disabled={isLoggingOut}>
            {t('logoutBtn')}
          </button>
        </section>

        {showLogoutConfirm && (
          <div className={styles.modalOverlay} onClick={() => setShowLogoutConfirm(false)}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <p className={styles.modalText}>{t('logoutConfirm')}</p>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setShowLogoutConfirm(false)}>
                  {tc('cancel')}
                </button>
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    setShowLogoutConfirm(false)
                    handleLogout()
                  }}
                  disabled={isLoggingOut}>
                  {isLoggingOut ? t('loggingOut') : t('logoutAction')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
