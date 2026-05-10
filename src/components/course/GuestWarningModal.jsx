'use client'

import styles from './GuestWarningModal.module.scss'
import {useT} from '@/lib/i18n/useT'

/**
 * GuestWarningModal component - displays a warning for guest users about progress loss
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback when closing the modal
 */
export default function GuestWarningModal({isOpen, onClose}) {
  const t = useT('course')

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>

        <div className={styles.content}>
          <div className={styles.icon}>👤</div>
          <h2>{t('guest.title')}</h2>
          <p>{t('guest.desc')}</p>
        </div>

        <div className={styles.actions}>
          <button className={styles.secondaryBtn} onClick={onClose}>
            {t('guest.continueAsGuest')}
          </button>
          <a href="/?next=/corso-vino" className={`${styles.primaryBtn} btn primary`}>
            {t('guest.signUp')}
          </a>
        </div>
      </div>
    </div>
  )
}
