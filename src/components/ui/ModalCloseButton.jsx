'use client'

import {useT} from '@/lib/i18n/useT'
import styles from './ModalCloseButton.module.scss'

export default function ModalCloseButton({
  onClick,
  className = '',
  ariaLabel,
  disabled = false,
}) {
  const t = useT('common')
  const resolvedAriaLabel = ariaLabel || t('close')

  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={disabled}
      aria-label={resolvedAriaLabel}
      title={resolvedAriaLabel}>
      <span aria-hidden="true">×</span>
    </button>
  )
}
