'use client'

import styles from './ModalCloseButton.module.scss'

export default function ModalCloseButton({onClick, className = '', ariaLabel = 'Chiudi'}) {
  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}>
      <span aria-hidden="true">×</span>
    </button>
  )
}
