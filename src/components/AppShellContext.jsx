'use client'

import {createContext, useContext, useEffect, useMemo} from 'react'

const AppShellContext = createContext(null)

export function AppShellProvider({children, setTopBarOverride}) {
  const value = useMemo(() => ({setTopBarOverride}), [setTopBarOverride])

  return (
    <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
  )
}

export function useAppShellTopBar(topBarOverride) {
  const context = useContext(AppShellContext)

  useEffect(() => {
    if (!context) return undefined

    const timeoutId = window.setTimeout(() => {
      context.setTopBarOverride(topBarOverride || null)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
      context.setTopBarOverride(null)
    }
  }, [context, topBarOverride])
}
