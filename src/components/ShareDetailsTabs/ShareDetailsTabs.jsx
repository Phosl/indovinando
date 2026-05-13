'use client'

import {useState} from 'react'
import styles from './ShareDetailsTabs.module.scss'

export default function ShareDetailsTabs({
  shareLabel,
  detailsLabel,
  leaderboardLabel,
  shareContent,
  detailsContent,
  leaderboardContent,
  defaultTab = 'share',
  shareBadge,
  detailsBadge,
  leaderboardBadge,
  className = '',
}) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  const tabs = [
    {
      key: 'share',
      label: shareLabel,
      content: shareContent,
      badge: shareBadge,
    },
    {
      key: 'details',
      label: detailsLabel,
      content: detailsContent,
      badge: detailsBadge,
    },
    leaderboardLabel && leaderboardContent
      ? {
          key: 'leaderboard',
          label: leaderboardLabel,
          content: leaderboardContent,
          badge: leaderboardBadge,
        }
      : null,
  ].filter(Boolean)

  const activeTabConfig = tabs.find((tab) => tab.key === activeTab) || tabs[0]

  return (
    <div className={`${styles.shell} ${className}`.trim()}>
      <div
        className={styles.tabBar}
        role="tablist"
        aria-label={tabs.map((tab) => tab.label).join(' / ') || undefined}>
        <div className={styles.tabTrack}>
          {tabs.map((tab) => {
            const showBadge = tab.badge !== undefined && tab.badge !== null

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTabConfig.key === tab.key}
                className={`${styles.tab} ${activeTabConfig.key === tab.key ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.key)}>
                {tab.label}
                {showBadge && <span className={styles.tabBadge}>{tab.badge}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.panel} role="tabpanel">
        {activeTabConfig.content}
      </div>
    </div>
  )
}
