'use client'

import {useEffect} from 'react'
import styles from './InfoModal.module.scss'

/**
 * Generic info modal with a title, optional icon, and body content.
 *
 * Usage:
 *   <InfoModal isOpen={open} onClose={() => setOpen(false)} title="Come funziona">
 *     <p>...</p>
 *   </InfoModal>
 */
export default function InfoModal({isOpen, onClose, title, icon, children}) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          {icon && <span className={styles.headerIcon}>{icon}</span>}
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
