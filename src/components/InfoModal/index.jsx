'use client'

import {useEffect} from 'react'
import styles from './InfoModal.module.scss'
import ModalCloseButton from '@/components/ui/ModalCloseButton'

/**
 * Generic info modal with a title, optional icon, and body content.
 *
 * Usage:
 *   <InfoModal isOpen={open} onClose={() => setOpen(false)} title="Come funziona">
 *     <p>...</p>
 *   </InfoModal>
 */
export default function InfoModal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  fullScreen = false,
  disableClose = false,
}) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e) {
      if (e.key === 'Escape' && !disableClose) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [disableClose, isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className={`${styles.overlay} ${fullScreen ? styles.overlayFullScreen : ''}`}
      onClick={disableClose ? undefined : onClose}
      role="dialog"
      aria-modal="true">
      <div
        className={`${styles.sheet} ${fullScreen ? styles.sheetFullScreen : ''}`}
        onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          {icon && <span className={styles.headerIcon}>{icon}</span>}
          <h3 className={styles.title}>{title}</h3>
          {!disableClose ? <ModalCloseButton className={styles.closeBtn} onClick={onClose} /> : null}
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
