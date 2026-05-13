'use client'

import {useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {ENOTECA_DICTIONARY, pickLangText} from '@/lib/i18n/dictionaries'
import styles from '../../live/session/[sessionId]/play/playerLive.module.scss'
import xStyles from './enotecaJoin.module.scss'

export default function EnotecaBridgeClient({
  menuId,
  menuName,
  menuDescription,
  menuLocation,
  bottleCount,
}) {
  const {lang} = useLanguage()
  const t = pickLangText(lang, ENOTECA_DICTIONARY.join)
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const joinPath = `/enoteca/${menuId}/join`
  const shareLink = useMemo(() => {
    if (typeof window === 'undefined') return joinPath
    return `${window.location.origin}${joinPath}`
  }, [joinPath])
  const backHref = '/miei-giochi'

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  const handleShareLink = async () => {
    const shareText = `${menuName} · ${shareLink}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: menuName,
          text: menuName,
          url: shareLink,
        })
        return
      }
    } catch {
      return
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={styles.fullPage}>
      <TopBar title={`🍷 ${t.enotecaLabel}`} onBack={() => router.push(backHref)}></TopBar>

      <div className={styles.slideContent}>
        <div className={xStyles.infoCard}>
          <span className={xStyles.wineBadge}>🍷</span>
          <h1 className={xStyles.menuName}>{menuName}</h1>
          {menuLocation && <p className={xStyles.location}>📍 {menuLocation}</p>}
          {menuDescription && <p className={xStyles.description}>{menuDescription}</p>}
          <span className={xStyles.bottleCount}>
            {bottleCount} {bottleCount === 1 ? t.bottleCountSingular : t.bottleCountPlural}
          </span>

          <p className={xStyles.bridgeTitle}>{t.bridgeTitle}</p>
          <p className={xStyles.bridgeHint}>{t.bridgeHint}</p>
          <label className={xStyles.linkLabel} htmlFor="enoteca-share-link">
            {t.tastingLinkLabel}
          </label>
          <div className={xStyles.linkRow}>
            <input
              id="enoteca-share-link"
              className={xStyles.linkInput}
              value={shareLink}
              readOnly
            />
            <button type="button" className={styles.secondaryButton} onClick={handleCopyLink}>
              {copied ? t.copied : t.copyLink}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={handleShareLink}>
              {t.shareLink}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.bottomPanel}>
        <button className={styles.continueButton} onClick={() => router.push(joinPath)}>
          🍷 {t.goToTasting ?? t.start}
        </button>
      </div>
    </div>
  )
}
