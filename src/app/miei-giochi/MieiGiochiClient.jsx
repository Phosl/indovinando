'use client'

import Image from 'next/image'
import Link from 'next/link'
import {useCallback, useEffect, useState} from 'react'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'
import {ButtonLink} from '@/components/ui/Button'
import Icon from '@/components/Icon'
import CreateGameCardLink from '@/components/CreateGameCardLink'
import styles from './miei-giochi.module.scss'
import {useT} from '@/lib/i18n/useT'

function GamesToast({toast, onClose, closeLabel}) {
  useEffect(() => {
    if (!toast) return undefined
    const timeoutId = window.setTimeout(() => onClose(), toast.duration || 3200)
    return () => window.clearTimeout(timeoutId)
  }, [onClose, toast])

  if (!toast) return null

  return (
    <div className={styles.toastViewport} aria-live="polite">
      <div className={`${styles.toast} ${styles.toastSuccess}`}>
        <span className={styles.toastMessage}>{toast.message}</span>
        <button type="button" className={styles.toastClose} onClick={onClose} aria-label={closeLabel}>
          ×
        </button>
      </div>
    </div>
  )
}

export default function MieiGiochiClient({games, avatarOptions = [], dashboardDict}) {
  const t = useT('profile')
  const tc = useT('common')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [toast, setToast] = useState(null)

  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (searchParams.get('toast') !== 'game-deleted') return

    const timeoutId = window.setTimeout(() => {
      setToast({
        tone: 'success',
        message: dashboardDict.gameDeletedToast,
      })

      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete('toast')
      const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname
      router.replace(nextUrl, {scroll: false})
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [dashboardDict.gameDeletedToast, pathname, router, searchParams])

  return (
    <div className={styles.page}>
      <GamesToast toast={toast} onClose={closeToast} closeLabel={tc('close')} />
      <div className={styles.content}>
        {games.length === 0 && (
          <div className={styles.emptyState}>{dashboardDict.emptyStateFirstGame}</div>
        )}
        <div className={styles.gamesHeaderActions}>
          <CreateGameCardLink
            title={dashboardDict.createGameCardTitle}
            description={dashboardDict.createGameCardDescription}
            action={dashboardDict.createGameCardAction}
          />
        </div>
        {games.length !== 0 ? (
          <div className={styles.gamesList}>
            <div className={styles.gamesSectionTitle}>{dashboardDict.yourGames}</div>
            {games.map((game) => {
              const bottles = [...(game.game_bottles || [])].sort(
                (a, b) => (a.bottle_order || 0) - (b.bottle_order || 0),
              )
              const questionsCount = (game.game_questions || []).length
              const bottlePreview = bottles.slice(0, 3)
              const hiddenBottles = Math.max(0, bottles.length - bottlePreview.length)
              const coverPath =
                Number.isInteger(game.cover_index) && game.cover_index >= 0
                  ? avatarOptions[game.cover_index] || ''
                  : ''
              const fallbackAvatar = avatarOptions[0] || '/avatar/avatar-01.svg'
              const gameAvatar = coverPath || fallbackAvatar

              return (
                <Link key={game.id} href={`/game/${game.id}`} className={styles.gameCardLink}>
                  <article className={styles.gameCard}>
                    <Image
                      src={gameAvatar}
                      alt=""
                      aria-hidden="true"
                      className={styles.gameAvatar}
                      width={92}
                      height={92}
                    />
                    <div className={styles.gameCardBody}>
                      <div className={styles.gameCardTop}>
                        <h3>
                          {game.name}{' '}
                          <span className={styles.statusLabel}>
                            {game.status === 'published' ? '' : dashboardDict.incomplete}
                          </span>{' '}
                        </h3>
                      </div>

                      <div className={styles.statsRow}>
                        <span>
                          <Icon name="bottle" size={24} className={styles.statsIcon} />
                          {dashboardDict.bottlesCountLabel.replace(
                            '{count}',
                            String(bottles.length),
                          )}
                        </span>
                        <span className={styles.statsDivider} aria-hidden="true">
                          -
                        </span>
                        <span>
                          <Icon name="question" size={24} className={styles.statsIcon} />
                          {dashboardDict.questionsCountLabel.replace(
                            '{count}',
                            String(questionsCount),
                          )}
                        </span>
                      </div>

                      <div className={styles.bottleLabels}>
                        {bottlePreview.map((bottle, index) => (
                          <span
                            key={bottle.id || `${game.id}-preview-bottle-${index}`}
                            className={styles.bottleLabel}>
                            {(bottle.name || dashboardDict.unnamedBottle) +
                              ' - ' +
                              (bottle.producer || dashboardDict.unknownProducer)}
                          </span>
                        ))}
                        {hiddenBottles > 0 && (
                          <span className={styles.bottleMore}>+{hiddenBottles}...</span>
                        )}
                      </div>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className={styles.guideContainer}>
            <h3>oppure</h3>
            <ButtonLink href="/info" variant="neutral" size="small">
              {t('openAppGuide')}
            </ButtonLink>
          </div>
        )}
      </div>
    </div>
  )
}
