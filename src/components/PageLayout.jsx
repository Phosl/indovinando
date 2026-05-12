'use client'

/**
 * PageLayout — centralized page wrapper with optional TopBar.
 *
 * Usage:
 *   <PageLayout title="Titolo" onBack={() => router.push('/dashboard')}>
 *     ...page content...
 *   </PageLayout>
 *
 * If you need custom TopBar actions (icons, buttons on the right):
 *   <PageLayout title="Titolo" topBarActions={<button>...</button>}>
 *
 * If you don't want a TopBar at all, omit `title`:
 *   <PageLayout>
 *
 * To change the header appearance for ALL pages at once, edit this file.
 */

import TopBar from '@/components/TopBar'
import styles from './PageLayout.module.css'

export default function PageLayout({
  // TopBar props — omit `title` to skip the TopBar entirely
  title,
  onBack,
  topBarActions,

  // Layout
  children,
  className = '',

  // Pass-through to inner container (e.g. maxWidth override)
  style,
}) {
  return (
    <main className={styles.page}>
      <div className={`${styles.inner} ${className}`} style={style}>
        {title && (
          <TopBar title={title} onBack={onBack}>
            {topBarActions}
          </TopBar>
        )}
        {children}
      </div>
    </main>
  )
}
