'use client'

import Image from 'next/image'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import {ButtonLink} from '@/components/ui/Button'
import Icon from '@/components/Icon'
import CreateGameCardLink from '@/components/CreateGameCardLink'
import styles from './miei-giochi.module.scss'
import {useT} from '@/lib/i18n/useT'

export default function MieiGiochiClient({games, avatarOptions = [], lang, dashboardDict}) {
  const router = useRouter()
  const t = useT('profile')

  return (
    <div className={styles.page}>
      <div className={styles.topBarContainer}>
        <TopBar
          title={dashboardDict.myGames || 'I miei giochi'}
          onBack={() => router.push('/dashboard')}
        />
      </div>
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
            <ButtonLink href="/guida" variant="neutral" size="small">
              {t('openAppGuide')}
            </ButtonLink>
          </div>
        )}
      </div>
    </div>
  )
}
