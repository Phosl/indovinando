'use client'

import {useState} from 'react'
import {usePathname, useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import PageTransitionShell from '@/components/PageTransitionShell'
import {useT} from '@/lib/i18n/useT'
import {AppShellProvider} from './AppShellContext'
import {AppDataProvider} from './AppDataContext'
import {resolveShellRoute} from './appShellRoutes'
import styles from './AppShell.module.scss'

export default function AppShell({children}) {
  const pathname = usePathname()
  const router = useRouter()
  const [topBarOverride, setTopBarOverride] = useState(null)
  const dashboardT = useT('dashboard')
  const gameCreateT = useT('gameCreate')
  const gamePlayPageT = useT('gamePlayPage')
  const gameEditorT = useT('gameEditor')
  const homeT = useT('home')
  const infoT = useT('info')
  const profileT = useT('profile')
  const adminT = useT('admin')
  const courseT = useT('course')
  const shellRoute = resolveShellRoute(pathname, {
    admin: adminT,
    course: courseT,
    dashboard: dashboardT,
    gameCreate: gameCreateT,
    gameEditor: gameEditorT,
    gamePlayPage: gamePlayPageT,
    home: homeT,
    info: infoT,
    profile: profileT,
  })
  const activeShellRoute = topBarOverride ? {...(shellRoute || {}), ...topBarOverride} : shellRoute

  const handleBack = () => {
    if (activeShellRoute?.onBack) {
      activeShellRoute.onBack()
      return
    }
    if (!activeShellRoute?.backHref) return
    if (activeShellRoute.smartBack && typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(activeShellRoute.backHref)
  }

  const content = (
    <AppShellProvider setTopBarOverride={setTopBarOverride}>
      <AppDataProvider>
        <PageTransitionShell>{children}</PageTransitionShell>
      </AppDataProvider>
    </AppShellProvider>
  )

  if (!activeShellRoute) {
    return content
  }

  return (
    <div className={styles.shell}>
      {activeShellRoute.showTopBar !== false ? (
        <div className={styles.topBarLayer}>
          <div className={styles.topBarInner}>
            <TopBar
              title={activeShellRoute.title}
              onBack={activeShellRoute.backHref || activeShellRoute.onBack ? handleBack : undefined}>
              {activeShellRoute.actions}
            </TopBar>
          </div>
        </div>
      ) : null}
      <div className={styles.contentLayer}>{content}</div>
    </div>
  )
}
