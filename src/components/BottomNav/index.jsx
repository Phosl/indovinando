'use client'

import Link from 'next/link'
import {usePathname, useSearchParams} from 'next/navigation'
import Icon from '@/components/Icon'
import {useT} from '@/lib/i18n/useT'
import styles from './BottomNav.module.scss'

function isActive(pathname, href, key) {
  if (!pathname) return false
  if (key === 'home') return pathname === '/dashboard'
  if (key === 'tastings') return pathname.startsWith('/miei-giochi') || pathname.startsWith('/game')
  if (key === 'course') return pathname.startsWith('/corso-vino')
  if (key === 'profile') return pathname.startsWith('/profilo')
  return pathname === href
}

function shouldRender(pathname, searchParams) {
  if (!pathname) return false
  if (pathname === '/dashboard') return true
  if (pathname.startsWith('/miei-giochi')) return true
  if (pathname.startsWith('/profilo')) return true

  if (pathname === '/game/create') {
    const stepValue = searchParams?.get('step')
    return stepValue === '1' || stepValue === null
  }

  const gameMatch = pathname.match(/^\/game\/([^/]+)$/)
  if (gameMatch && gameMatch[1] !== 'create') return true

  if (pathname === '/corso-vino') return true
  if (/^\/corso-vino\/[^/]+$/.test(pathname)) return true

  return false
}

export default function BottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = useT('bottomNav')

  if (!shouldRender(pathname, searchParams)) return null

  const items = [
    {key: 'home', href: '/dashboard', label: t('home'), icon: 'home'},
    {key: 'tastings', href: '/miei-giochi', label: t('tastings'), icon: 'testing'},
    {key: 'course', href: '/corso-vino', label: t('course'), icon: 'course'},
    {key: 'profile', href: '/profilo', label: t('profile'), icon: 'profile'},
  ]

  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      <nav className={styles.nav} aria-label={t('ariaLabel')}>
        <div className={styles.inner}>
          {items.map((item) => {
            const active = isActive(pathname, item.href, item.key)
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`${styles.item} ${active ? styles.active : ''}`}>
                <Icon name={item.icon} size={24} className={styles.icon} />
                <span className={styles.label}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
