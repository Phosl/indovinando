'use client'

import {useState} from 'react'
import styles from './ShareDetailsTabs.module.scss'

export default function ShareDetailsTabs({
  shareLabel,
  detailsLabel,
  shareContent,
  detailsContent,
  defaultTab = 'share',
  shareBadge,
  detailsBadge,
  className = '',
}) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  const showShareBadge = shareBadge !== undefined && shareBadge !== null
  const showDetailsBadge = detailsBadge !== undefined && detailsBadge !== null

  return (
    <div className={`${styles.shell} ${className}`.trim()}>
      <div
        className={styles.tabBar}
        role="tablist"
        aria-label={shareLabel && detailsLabel ? `${shareLabel} / ${detailsLabel}` : undefined}>
        <div className={styles.tabTrack}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'share'}
            className={`${styles.tab} ${activeTab === 'share' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('share')}>
            {shareLabel}
            {showShareBadge && <span className={styles.tabBadge}>{shareBadge}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'details'}
            className={`${styles.tab} ${activeTab === 'details' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('details')}>
            {detailsLabel}
            {showDetailsBadge && <span className={styles.tabBadge}>{detailsBadge}</span>}
          </button>
        </div>
      </div>

      <div className={styles.panel} role="tabpanel">
        {activeTab === 'share' ? shareContent : detailsContent}
      </div>
    </div>
  )
}
