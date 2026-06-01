import Link from 'next/link'
import Icon from '@/components/Icon'
import styles from './CreateGameCardLink.module.scss'

export default function CreateGameCardLink({
  href = '/game/create',
  title,
  description,
  action,
  className = '',
}) {
  return (
    <Link href={href} className={`${styles.createGameLink} ${className}`.trim()}>
      <div className={styles.createGameCard}>
        <div className={styles.createGameContent}>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className={styles.createGameContainer}>
          <div className={`btn card-cta btn-inline ${styles.createGameBtn}`}>
            {/* <span>{action}</span> */}
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
  )
}
