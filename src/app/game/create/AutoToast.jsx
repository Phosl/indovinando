'use client'

import {useEffect} from 'react'
import Icon from '@/components/Icon'
import styles from './gameCreate.module.scss'

export default function AutoToast({toast, onClose, closeLabel}) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => {
      onClose()
    }, toast.duration || 3200)
    return () => window.clearTimeout(timer)
  }, [onClose, toast])

  if (!toast) return null

  return (
    <div className={styles.autoToastViewport} aria-live="polite">
      <div
        className={`${styles.autoToast} ${
          toast.tone === 'success'
            ? styles.autoToastSuccess
            : toast.tone === 'info'
              ? styles.autoToastInfo
              : styles.autoToastError
        }`}>
        <span className={styles.autoToastMessage}>{toast.message}</span>
        <button
          type="button"
          className={styles.autoToastClose}
          onClick={onClose}
          aria-label={closeLabel}>
          <Icon name="removeSmall" size={16} />
        </button>
      </div>
    </div>
  )
}
