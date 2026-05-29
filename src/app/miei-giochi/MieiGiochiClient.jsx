'use client'

import Link from 'next/link'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import {ButtonLink} from '@/components/ui/Button'
import Icon from '@/components/Icon'
import {formatAppDate} from '@/lib/dateFormat'
import styles from './miei-giochi.module.scss'

export default function MieiGiochiClient({games, avatarOptions = [], lang, dashboardDict}) {
  const router = useRouter()

  return (
    <div className={styles.page}>
      <div className={styles.topBarContainer}>
        <TopBar
          title={dashboardDict.myGames || 'I miei giochi'}
          onBack={() => router.push('/dashboard')}
        />
      </div>
      <div className={styles.content}>
        <div className={styles.gamesHeaderActions}>
          <Link href="/game/create" className={styles.createGameLink}>
            <div className={styles.createGameCard}>
              <div className={styles.createGameContent}>
                <h2>Crea una nuova degustazione</h2>
                <p>Inizia a creare la tua nuova degustazione e condividila con i tuoi amici.</p>
              </div>
              <div className={styles.createGameContainer}>
                <div className={styles.createGameBtn}>
                  <span>Iniziamo</span>
                  <Icon name="forward" size={24} className={styles.createGameBtnIcon} />
                </div>
              </div>
              <img
                src="/img-card-create.svg"
                alt=""
                aria-hidden="true"
                className={styles.createGameIllustration}
              />
            </div>
          </Link>
        </div>
        {games.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🎮</span>
            <p>
              {dashboardDict.emptyStateFirstGame ||
                'Non hai ancora creato giochi. Crea il tuo primo gioco per iniziare a giocare.'}
            </p>
            <ButtonLink href="/game/create" variant="success">
              {dashboardDict.createFirstGame || 'Crea il tuo primo gioco'}
            </ButtonLink>
          </div>
        ) : (
          <div className={styles.gamesList}>
            <div className={styles.gamesSectionTitle}>
              {dashboardDict.yourGames || 'I tuoi giochi'}
            </div>
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
                    <img src={gameAvatar} alt="" aria-hidden="true" className={styles.gameAvatar} />
                    <div className={styles.gameCardBody}>
                      <div className={styles.gameCardTop}>
                        <h3>
                          {game.name}{' '}
                          <span className={styles.statusLabel}>
                            {game.status === 'published' ? '' : dashboardDict.draft || 'Incompleto'}
                          </span>{' '}
                        </h3>
                        <div className={styles.gameCardMeta}>
                          <p className={styles.date}>{formatAppDate(game.created_at, lang)}</p>
                        </div>
                      </div>

                      <div className={styles.statsRow}>
                        <span>
                          <Icon name="bottle" size={24} className={styles.statsIcon} />
                          {bottles.length} Bottiglie
                        </span>
                        <span className={styles.statsDivider} aria-hidden="true">
                          -
                        </span>
                        <span>
                          <Icon name="question" size={24} className={styles.statsIcon} />
                          {questionsCount} Domande
                        </span>
                      </div>

                      <div className={styles.bottleLabels}>
                        {bottlePreview.map((bottle, index) => (
                          <span
                            key={bottle.id || `${game.id}-preview-bottle-${index}`}
                            className={styles.bottleLabel}>
                            {(bottle.name || 'Senza nome') +
                              ' - ' +
                              (bottle.producer || 'Produttore non indicato')}
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
        )}
      </div>
    </div>
  )
}
