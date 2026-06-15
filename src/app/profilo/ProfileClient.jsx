'use client'

import Image from 'next/image'
import Link from 'next/link'
import {useEffect, useMemo, useState, useCallback} from 'react'
import {useRouter} from 'next/navigation'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import InfoModal from '@/components/InfoModal'
import Icon from '@/components/Icon'
import ProgressBar from '@/components/ui/ProgressBar'
import {useWineCourseProgress} from '@/app/corso-vino/hooks/useWineCourseProgress'
import {supabaseClient, resetBrowserClient} from '@/lib/supabaseClient'
import {useT} from '@/lib/i18n/useT'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {isBusinessProfile, isProfileComplete} from '@/lib/profileSetup'
import CommunityHighlightsCard from '@/components/community/CommunityHighlightsCard'
import {normalizeAiScanCredits} from '@/lib/aiScanCredits'
import {useAppData} from '@/components/AppDataContext'
import styles from './profilo.module.scss'
// ── Player rank levels ────────────────────────────────────────────────────────
const PLAYER_LEVELS = [
  {idx: 0, num: 1, name: 'Novizio', svg: '/combo/combo-01.svg'},
  {idx: 1, num: 2, name: 'Curioso', svg: '/combo/combo-02.svg'},
  {idx: 2, num: 3, name: 'Magico', svg: '/combo/combo-03.svg'},
  {idx: 3, num: 4, name: 'Esperto', svg: '/combo/combo-04.svg'},
  {idx: 4, num: 5, name: 'Maestro', svg: '/combo/combo-05.svg'},
  {idx: 5, num: 6, name: 'Supremo', svg: '/combo/combo-06.svg'},
]

function computePlayerLevel(completedLessons, totalLessons) {
  if (!totalLessons) return {level: PLAYER_LEVELS[0], levelIdx: 0, progressInLevel: 0}
  const pct = completedLessons / totalLessons // 0..1
  const levelIdx = Math.min(5, Math.floor(pct * 6))
  const bandStart = levelIdx / 6
  const progressInLevel =
    levelIdx === 5 && completedLessons === totalLessons
      ? 100
      : Math.round(Math.min(100, Math.max(0, ((pct - bandStart) / (1 / 6)) * 100)))
  return {level: PLAYER_LEVELS[levelIdx], levelIdx, progressInLevel}
}

const AVATARS = [
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

const AVATAR_SVGS = [
  '/avatar/avatar-01.svg',
  '/avatar/avatar-02.svg',
  '/avatar/avatar-03.svg',
  '/avatar/avatar-04.svg',
  '/avatar/avatar-05.svg',
  '/avatar/avatar-06.svg',
]

const ALL_AVATARS = [...AVATARS, ...AVATAR_SVGS]

function isImgAvatar(a) {
  return typeof a === 'string' && a.includes('.svg')
}

function normalizeSrc(src) {
  if (!src) return ''
  return src.startsWith('/') ? src : `/${src}`
}

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
  profileData,
  levels,
  gamesCount,
  children,
}) {
  const router = useRouter()
  const t = useT('profile')
  const tc = useT('common')
  const {isSwitching} = useLanguage()
  const {
    profile: sharedProfile,
    credits: sharedCredits,
    gamesCount: sharedGamesCount,
    refresh: refreshAppData,
  } = useAppData()
  const {progress, loaded} = useWineCourseProgress()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showAvatarSheet, setShowAvatarSheet] = useState(false)
  const [showLevelInfo, setShowLevelInfo] = useState(false)
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null)
  const [installPlatform, setInstallPlatform] = useState('generic')
  const [isStandalone, setIsStandalone] = useState(false)
  const effectiveProfile = useMemo(
    () => sharedProfile || profileData || {},
    [profileData, sharedProfile],
  )
  const effectiveUserLabel = effectiveProfile?.username || userLabel
  const effectiveAvatar = effectiveProfile?.avatar_emoji || initialAvatar
  const effectiveGamesCount = sharedProfile ? sharedGamesCount : gamesCount
  const aiCredits = sharedCredits || normalizeAiScanCredits(effectiveProfile)

  const [avatar, setAvatar] = useState(
    effectiveAvatar && ALL_AVATARS.includes(effectiveAvatar) ? effectiveAvatar : '😎',
  )
  const hasBusinessProfile = useMemo(
    () => isBusinessProfile(effectiveProfile || {}),
    [effectiveProfile],
  )

  useEffect(() => {
    const saved = localStorage.getItem(AVATAR_STORAGE_KEY)
    if (saved && ALL_AVATARS.includes(saved)) {
      setAvatar(saved)
      return
    }
    if (effectiveAvatar && ALL_AVATARS.includes(effectiveAvatar)) setAvatar(effectiveAvatar)
  }, [effectiveAvatar])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const updateStandaloneState = () => {
      setIsStandalone(mediaQuery.matches || window.navigator.standalone === true)
    }

    const ua = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(ua)
    const isAndroidDevice = /android/.test(ua)

    setInstallPlatform(isIosDevice ? 'ios' : isAndroidDevice ? 'android' : 'generic')
    updateStandaloneState()

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredInstallPrompt(event)
    }

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null)
      setIsStandalone(true)
      setShowInstallHelp(false)
    }

    mediaQuery.addEventListener?.('change', updateStandaloneState)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      mediaQuery.removeEventListener?.('change', updateStandaloneState)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const selectAvatar = useCallback(
    async (nextAvatar) => {
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
        } else {
          refreshAppData({force: true})
        }
      }
    },
    [refreshAppData, userId],
  )

  const handleLogout = useCallback(async () => {
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
      resetBrowserClient()
      router.replace('/')
      router.refresh()
      setIsLoggingOut(false)
    }
  }, [router, isLoggingOut])

  const handleInstallApp = useCallback(async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt()
      const {outcome} = await deferredInstallPrompt.userChoice
      if (outcome !== 'accepted') {
        setShowInstallHelp(true)
      }
      setDeferredInstallPrompt(null)
      return
    }

    setShowInstallHelp(true)
  }, [deferredInstallPrompt])

  const handleAvatarSelect = useCallback(
    (selected) => {
      selectAvatar(selected)
      setShowAvatarSheet(false)
    },
    [selectAvatar],
  )

  const toggleAvatarSheet = useCallback(
    (show) => setShowAvatarSheet(typeof show === 'boolean' ? show : (prev) => !prev),
    [],
  )
  const toggleLevelInfo = useCallback(
    (show) => setShowLevelInfo(typeof show === 'boolean' ? show : (prev) => !prev),
    [],
  )
  const toggleLogoutConfirm = useCallback(
    (show) => setShowLogoutConfirm(typeof show === 'boolean' ? show : (prev) => !prev),
    [],
  )

  const stats = useMemo(() => computeCourseStats(levels, progress), [levels, progress])
  const hasCompletedProfile = useMemo(
    () => isProfileComplete(effectiveProfile || {}),
    [effectiveProfile],
  )
  const playerLevel = useMemo(
    () => computePlayerLevel(stats.completedLessons, stats.totalLessons),
    [stats],
  )

  // Persist player_level to DB when it increases (only after progress is loaded)
  useEffect(() => {
    if (!loaded || !userId) return
    const newLevelNum = playerLevel.level.num
    supabaseClient
      .from('profiles')
      .select('player_level')
      .eq('id', userId)
      .single()
      .then(({data}) => {
        const savedLevel = data?.player_level ?? 1
        if (newLevelNum > savedLevel) {
          supabaseClient
            .from('profiles')
            .update({player_level: newLevelNum, updated_at: new Date().toISOString()})
            .eq('id', userId)
            .then(({error}) => {
              if (error) console.error('[profile] failed to update player_level:', error.message)
              else refreshAppData({force: true})
            })
        }
      })
  }, [loaded, refreshAppData, userId, playerLevel.level.num])

  return (
    <main className={styles.page}>
      {isSwitching ? (
        <div className={styles.languageLoadingOverlay} aria-live="polite" aria-busy="true">
          <p className={styles.languageLoadingTitle}>{t('languageSwitching')}</p>
          <span className={styles.languageLoadingSpinner} aria-hidden="true" />
          <p className={styles.languageLoadingHint}>{t('languageSwitchingHint')}</p>
        </div>
      ) : null}
      <div className={styles.container}>
        {/* ── Header: user info + lingua + avatar button ── */}
        <section className={styles.headerCard}>
          <div className={styles.userRow}>
            <div className={styles.avatar}>
              {isImgAvatar(avatar) ? (
                <Image
                  src={normalizeSrc(avatar)}
                  alt="avatar"
                  className={styles.avatarImg}
                  width={100}
                  height={100}
                />
              ) : (
                avatar
              )}
            </div>
            <div>
              <h2 className={styles.name}>{effectiveUserLabel}</h2>
              <p className={styles.email}>{email}</p>
              {hasCompletedProfile || hasBusinessProfile ? (
                <div className={styles.profileBadges}>
                  {hasCompletedProfile ? (
                    <span className={styles.profileCompleteBadge}>{t('profileCompleteBadge')}</span>
                  ) : null}
                  {hasBusinessProfile ? (
                    <span className={styles.businessBadge}>{t('businessBadge')}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.cardDivider} />

          {/* <div className={styles.optionsHeader}>
            <h3 className={styles.optionsTitle}>{t('optionsSection')}</h3>
          </div> */}

          <div className={styles.languageRow}>
            <span className={styles.labelWithIcon}>
              <Icon name="language" size={20} />
              <span className={styles.label}>{t('language')}</span>
            </span>
            <LanguageSwitcher inline />
          </div>

          <div className={styles.optionDivider} />

          <div className={styles.avatarRow}>
            <span className={styles.labelWithIcon}>
              <Icon name="avatar" size={24} />
              <span className={styles.label}>{t('chooseAvatar')}</span>
            </span>
            <button
              type="button"
              className={styles.avatarPickerBtn}
              onClick={() => toggleAvatarSheet(true)}>
              <span className={styles.avatarPickerDivider} />
              <span className={styles.avatarPickerLabel}>Scegli</span>
            </button>
          </div>

          <div className={styles.optionDivider} />

          <div className={styles.avatarRow}>
            <span className={styles.labelWithIcon}>
              <Icon name="profile" size={22} />
              <span className={styles.label}>{t('preferences')}</span>
            </span>
            <Link href="/profilo/preferenze" className={styles.avatarPickerBtn}>
              <span className={styles.avatarPickerDivider} />
              <span className={styles.avatarPickerLabel}>{t('editPreferences')}</span>
            </Link>
          </div>

          <div className={styles.optionDivider} />

          <div className={styles.avatarRow}>
            <span className={styles.labelWithIcon}>
              <Icon src="/icons/token.svg" size={20} />
              <span className={styles.label}>{t('credits')}</span>
            </span>
            <Link href="/profilo/crediti" className={styles.avatarPickerBtn}>
              <span className={styles.creditsBadge}>{aiCredits.remaining}</span>
              <span className={styles.avatarPickerDivider} />
              <span className={styles.avatarPickerLabel}>{t('editCredits')}</span>
            </Link>
          </div>

          <div className={styles.creditsActions}>
            <p className={styles.creditsHint}>{t('creditsHint')}</p>
            <Link href="/profilo/crediti" className={`btn success ${styles.buyCreditsBtn}`}>
              {t('buyCredits')}
            </Link>
          </div>

          {hasBusinessProfile ? (
            <>
              <div className={styles.optionDivider} />

              <div className={styles.publicProfileRow}>
                <div className={styles.publicProfileText}>
                  <span className={styles.labelWithIcon}>
                    <Icon name="home" size={20} />
                    <span className={styles.label}>{t('publicProfile')}</span>
                  </span>
                  <p className={styles.publicProfileHint}>
                    {effectiveProfile?.is_partner_public
                      ? t('publicProfileHintPublic')
                      : t('publicProfileHintPrivate')}
                  </p>
                </div>
                <Link href="/profilo/pubblico" className={styles.avatarPickerBtn}>
                  <span className={styles.avatarPickerDivider} />
                  <span className={styles.avatarPickerLabel}>{t('editAction')}</span>
                </Link>
              </div>
            </>
          ) : null}

          <div className={styles.optionDivider} />

          <Link href="/profilo/partite" className={`btn btn-small ${styles.historyToggle}`}>
            {t('showMatches')}
          </Link>
        </section>

        {/* ── Livello + Statistiche ── */}
        <section className={styles.card}>
          {/* Player level */}
          <div className={styles.levelHeader}>
            {loaded ? (
              <Image
                src={playerLevel.level.svg}
                className={styles.levelBadgeImg}
                alt={playerLevel.level.name}
                width={72}
                height={72}
              />
            ) : (
              <div className={`skeleton ${styles.levelBadgeImgPlaceholder}`} />
            )}
            <div className={styles.levelInfo}>
              <p className={styles.levelNum}>Livello {loaded ? playerLevel.level.num : '…'}</p>
              <h3 className={styles.levelName}>{loaded ? playerLevel.level.name : '…'}</h3>
            </div>
            <button
              className={styles.levelHelpBtn}
              onClick={() => toggleLevelInfo(true)}
              aria-label="Come si sale di livello">
              ?
            </button>
          </div>

          <div className={styles.levelProgressWrap}>
            <div className={styles.levelProgressRow}>
              <ProgressBar
                value={loaded ? playerLevel.progressInLevel : 0}
                variant="course"
                className={styles.levelProgressTrack}
                fillClassName={styles.levelProgressFill}
                ariaLabel="Progress livello"
              />
              <span className={styles.levelProgressLabel}>
                {loaded ? `${playerLevel.progressInLevel}%` : '…'}
              </span>
            </div>
            <span className={styles.levelProgressNext}>
              {loaded
                ? playerLevel.levelIdx >= PLAYER_LEVELS.length - 1
                  ? '🏆 Livello massimo raggiunto!'
                  : `Prossimo livello: ${PLAYER_LEVELS[playerLevel.levelIdx + 1].name}`
                : ''}
            </span>
          </div>

          <div className={styles.levelStrip}>
            {PLAYER_LEVELS.map((lvl) => {
              const isActive = loaded && lvl.idx === playerLevel.levelIdx
              const isPast = loaded && lvl.idx < playerLevel.levelIdx
              return (
                <div
                  key={lvl.idx}
                  className={`${styles.levelStripItem} ${isActive ? styles.levelStripActive : ''}`}>
                  <Image
                    src={lvl.svg}
                    className={styles.levelStripImg}
                    alt={lvl.name}
                    width={52}
                    height={52}
                    style={
                      !loaded || (!isActive && !isPast)
                        ? {filter: 'grayscale(1) opacity(0.35)'}
                        : undefined
                    }
                  />
                  <span className={styles.levelStripName}>{lvl.name}</span>
                </div>
              )
            })}
          </div>

          <div className={styles.cardDivider} />

          {/* Stats */}
          <h2>{t('yourStats')}</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{effectiveGamesCount}</span>
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

        {children ? <div className={styles.communityCard}>{children}</div> : null}

        {/* ── Come funziona + Changelog ── */}
        <section className={styles.card}>
          <h2>{t('howTheAppWorks')}</h2>
          <p className={styles.quickInfoText}>{t('howTheAppWorksDesc')}</p>
          <Link href="/info" className="btn quaternary btn-small">
            {t('openAppGuide')}
          </Link>

          <div className={styles.cardDivider} />

          <h2>{t('changelog')}</h2>
          <p className={styles.quickInfoText}>{t('changelogDesc')}</p>
          <Link href="/changelog" className="btn neutral btn-small">
            {t('viewChangelog')}
          </Link>
        </section>

        {/* ── Logout ── */}
        <section className={styles.card}>
          <button
            type="button"
            className={`btn neutral btn-small ${styles.logoutBtn}`}
            onClick={() => toggleLogoutConfirm(true)}
            disabled={isLoggingOut}>
            {t('logoutBtn')}
          </button>

          {!isStandalone && (
            <div className={styles.installAppWrap}>
              <button type="button" className={styles.installAppBtn} onClick={handleInstallApp}>
                {t('installAppBtn')}
              </button>
              <p className={styles.installAppNote}>{t('installAppNote')}</p>
            </div>
          )}
        </section>

        {/* ── Avatar bottom sheet ── */}
        {showAvatarSheet && (
          <div className={styles.sheetOverlay} onClick={() => toggleAvatarSheet(false)}>
            <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
              <div className={styles.sheetHandle} />
              <h3 className={styles.sheetTitle}>{t('chooseAvatar')}</h3>
              <div className={styles.avatarSvgGrid}>
                {AVATAR_SVGS.map((src) => (
                  <button
                    key={src}
                    className={`${styles.avatarOption} ${avatar === src ? styles.avatarOptionActive : ''}`}
                    onClick={() => handleAvatarSelect(src)}
                    type="button"
                    aria-label={`avatar ${src}`}>
                    <Image
                      src={src}
                      alt=""
                      className={styles.avatarSvgThumb}
                      width={48}
                      height={48}
                    />
                  </button>
                ))}
              </div>
              <div className={styles.sheetSectionLabel}>Emoji</div>
              <div className={styles.avatarGrid}>
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    className={`${styles.avatarOption} ${avatar === emoji ? styles.avatarOptionActive : ''}`}
                    onClick={() => handleAvatarSelect(emoji)}
                    type="button"
                    aria-label={`avatar ${emoji}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Logout confirm modal ── */}
        {showLogoutConfirm && (
          <div className={styles.modalOverlay} onClick={() => toggleLogoutConfirm(false)}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <p className={styles.modalText}>{t('logoutConfirm')}</p>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => toggleLogoutConfirm(false)}>
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

        {showInstallHelp && (
          <div className={styles.modalOverlay} onClick={() => setShowInstallHelp(false)}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <p className={styles.modalText}>{t('installAppTitle')}</p>
              <div className={styles.installHelpBody}>
                <p className={styles.installHelpText}>
                  {installPlatform === 'ios'
                    ? t('installAppIosLine1')
                    : installPlatform === 'android'
                      ? t('installAppAndroidLine1')
                      : t('installAppGenericLine1')}
                </p>
                <p className={styles.installHelpText}>
                  {installPlatform === 'ios'
                    ? t('installAppIosLine2')
                    : installPlatform === 'android'
                      ? t('installAppAndroidLine2')
                      : t('installAppGenericLine2')}
                </p>
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setShowInstallHelp(false)}>
                  {tc('close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <InfoModal
        isOpen={showLevelInfo}
        onClose={() => setShowLevelInfo(false)}
        title="Come si sale di livello"
        icon="">
        <p>
          Il tuo <strong>livello</strong> riflette quante lezioni del Corso Vino hai completato.
        </p>
        <p>
          Il corso è diviso in <strong>6 bande di avanzamento</strong> — ogni banda corrisponde a un
          livello rango:
        </p>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          {PLAYER_LEVELS.map((lvl) => (
            <div key={lvl.idx} style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <Image
                src={lvl.svg}
                alt={lvl.name}
                width={36}
                height={36}
                style={{width: 36, height: 36, objectFit: 'contain'}}
              />
              <span style={{fontWeight: 900}}>
                Livello {lvl.num} — {lvl.name}
              </span>
            </div>
          ))}
        </div>
        <p style={{marginTop: 4}}>Completa più lezioni per avanzare di livello!</p>
      </InfoModal>

    </main>
  )
}
