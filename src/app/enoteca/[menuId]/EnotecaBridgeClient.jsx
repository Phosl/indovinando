'use client'

import {useEffect, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import QRCode from 'qrcode'
import TopBar from '@/components/TopBar'
import ShareDetailsTabs from '@/components/ShareDetailsTabs/ShareDetailsTabs'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {ENOTECA_DICTIONARY, pickLangText} from '@/lib/i18n/dictionaries'
import {formatAppDate} from '@/lib/dateFormat'
import styles from '../../live/session/[sessionId]/play/playerLive.module.scss'
import xStyles from './enotecaJoin.module.scss'

export default function EnotecaBridgeClient({
  menuId,
  menuName,
  menuDescription,
  menuLocation,
  questions = [],
  bottles = [],
  leaderboard = [],
}) {
  const {lang} = useLanguage()
  const t = pickLangText(lang, ENOTECA_DICTIONARY.join)
  const router = useRouter()
  const safeQuestions = questions || []
  const safeBottles = bottles || []
  const safeLeaderboard = leaderboard || []
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const joinPath = `/enoteca/${menuId}/join`
  const shareLink = useMemo(() => {
    if (typeof window === 'undefined') return joinPath
    return `${window.location.origin}${joinPath}`
  }, [joinPath])
  const backHref = '/miei-giochi'

  useEffect(() => {
    if (!shareLink) return
    let cancelled = false

    QRCode.toDataURL(shareLink, {width: 320, margin: 1, errorCorrectionLevel: 'M'})
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('')
      })

    return () => {
      cancelled = true
    }
  }, [shareLink])

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

  const handlePrintQr = () => {
    if (!qrDataUrl) return

    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>${menuName} QR</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; text-align: center; }
            .logo { width: 120px; height: auto; margin: 0 auto 12px; display: block; }
            img { width: 280px; height: 280px; }
            h1 { font-size: 18px; margin: 0 0 12px; }
            p { font-size: 12px; color: #444; word-break: break-all; }
          </style>
        </head>
        <body>
          <img class="logo" src="${window.location.origin}/logo.svg" alt="Indovinando" />
          <h1>${menuName}</h1>
          <img src="${qrDataUrl}" alt="QR" />
          <p>${shareLink}</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div className={styles.fullPage}>
      <div className={styles.topBarContainer}>
        <TopBar title={`🍷 ${t.enotecaLabel}`} onBack={() => router.push(backHref)}></TopBar>
      </div>
      <div className={styles.slideContent}>
        <div className={xStyles.infoCard}>
          <span className={xStyles.wineBadge}>🍷</span>
          <h1 className={xStyles.menuName}>{menuName}</h1>
          {menuLocation && <p className={xStyles.location}>📍 {menuLocation}</p>}
          {menuDescription && <p className={xStyles.description}>{menuDescription}</p>}

          <ShareDetailsTabs
            shareLabel={t.shareTabLabel}
            detailsLabel={t.detailsTabLabel}
            leaderboardLabel={t.leaderboardTabLabel}
            leaderboardBadge={safeLeaderboard.length || null}
            shareContent={
              <>
                <p className={xStyles.bridgeTitle}>{t.bridgeTitle}</p>
                <p className={xStyles.bridgeHint}>{t.bridgeHint}</p>

                <div className={xStyles.linkRow}>
                  <input
                    id="enoteca-share-link"
                    className={xStyles.linkInput}
                    value={shareLink}
                    readOnly
                  />
                  <button
                    type="button"
                    className={xStyles.shareActionButton}
                    onClick={handleCopyLink}>
                    {copied ? t.copied : t.copyLink}
                  </button>
                  <button
                    type="button"
                    className={xStyles.shareActionButton}
                    onClick={handleShareLink}>
                    {t.shareLink}
                  </button>
                  <button
                    type="button"
                    className={xStyles.shareActionButton}
                    onClick={() => setQrOpen(true)}>
                    {t.qr}
                  </button>
                </div>
              </>
            }
            detailsContent={
              <>
                <div className={xStyles.questionPreviewBlock}>
                  <div className={xStyles.questionPreviewHeader}>
                    <span className={xStyles.questionPreviewTitle}>{t.questionPreviewTitle}</span>
                    <span className={xStyles.questionPreviewCount}>
                      {safeQuestions.length}{' '}
                      {safeQuestions.length === 1 ? t.questionSingular : t.questionPlural}
                    </span>
                  </div>
                  <div className={xStyles.questionPreviewStrip} aria-label={t.questionPreviewTitle}>
                    {safeQuestions.length === 0 ? (
                      <div className={xStyles.questionPreviewEmpty}>{t.questionPreviewEmpty}</div>
                    ) : (
                      safeQuestions.map((question, index) => (
                        <article key={question.id} className={xStyles.questionPreviewCard}>
                          <span className={xStyles.questionPreviewIndex}>#{index + 1}</span>
                          <h2 className={xStyles.questionPreviewText}>
                            {question.text || t.unknownQuestion}
                          </h2>
                        </article>
                      ))
                    )}
                  </div>
                </div>

                <div className={xStyles.bottlePreviewBlock}>
                  <div className={xStyles.bottlePreviewHeader}>
                    <span className={xStyles.bottlePreviewTitle}>{t.bottlePreviewTitle}</span>
                    <span className={xStyles.bottlePreviewCount}>
                      {safeBottles.length}{' '}
                      {safeBottles.length === 1 ? t.bottleCountSingular : t.bottleCountPlural}
                    </span>
                  </div>
                  <div className={xStyles.bottlePreviewStrip} aria-label={t.bottlePreviewTitle}>
                    {safeBottles.length === 0 ? (
                      <div className={xStyles.bottlePreviewEmpty}>{t.bottlePreviewEmpty}</div>
                    ) : (
                      safeBottles.map((bottle, index) => (
                        <article key={bottle.id} className={xStyles.bottlePreviewCard}>
                          <span className={xStyles.bottlePreviewIndex}>#{index + 1}</span>
                          <h2 className={xStyles.bottlePreviewName}>
                            {bottle.name || t.unknownBottle}
                          </h2>
                          <p className={xStyles.bottlePreviewProducer}>
                            {bottle.producer || t.unknownProducer}
                          </p>
                          {bottle.year && (
                            <span className={xStyles.bottlePreviewYear}>{bottle.year}</span>
                          )}
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </>
            }
            leaderboardContent={
              <div className={xStyles.leaderboardBlock}>
                <div className={xStyles.leaderboardHeader}>
                  <span className={xStyles.leaderboardTitle}>{t.leaderboardTitle}</span>
                  <span className={xStyles.leaderboardCount}>
                    {safeLeaderboard.length}{' '}
                    {safeLeaderboard.length === 1
                      ? t.leaderboardPlayerSingular
                      : t.leaderboardPlayerPlural}
                  </span>
                </div>

                {safeLeaderboard.length === 0 ? (
                  <div className={xStyles.leaderboardEmpty}>{t.leaderboardEmpty}</div>
                ) : (
                  <div className={xStyles.leaderboardList}>
                    {safeLeaderboard.map((entry, index) => (
                      <article key={entry.id} className={xStyles.leaderboardItem}>
                        <div className={xStyles.leaderboardIdentity}>
                          <span className={xStyles.leaderboardRank}>#{index + 1}</span>
                          <div className={xStyles.leaderboardMeta}>
                            <h3 className={xStyles.leaderboardName}>
                              {entry.nickname || t.leaderboardAnonymous}
                            </h3>
                            {entry.table_name && (
                              <p className={xStyles.leaderboardTable}>
                                {t.leaderboardTableLabel}: {entry.table_name}
                              </p>
                            )}
                            {entry.completed_at && (
                              <p className={xStyles.leaderboardDate}>
                                {formatAppDate(entry.completed_at, lang)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className={xStyles.leaderboardScore}>
                          <span className={xStyles.leaderboardScoreValue}>
                            {entry.total_score ?? 0}
                          </span>
                          <span className={xStyles.leaderboardScoreLabel}>
                            {t.leaderboardPoints}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            }
          />
        </div>
      </div>

      <div className={styles.bottomPanel}>
        <button className={styles.continueButton} onClick={() => router.push(joinPath)}>
          🍷 {t.goToTasting ?? t.start}
        </button>
      </div>

      {qrOpen && (
        <div className={xStyles.qrOverlay} onClick={() => setQrOpen(false)}>
          <div className={xStyles.qrModal} onClick={(e) => e.stopPropagation()}>
            <img src="/logo.svg" alt="Indovinando" className={xStyles.qrLogo} />
            <h3>{t.qrTitle}</h3>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR degustazione" className={xStyles.qrImage} />
            ) : (
              <p className={xStyles.qrHint}>{t.loading ?? 'Loading...'}</p>
            )}
            <div className={xStyles.qrActions}>
              <button type="button" className={styles.continueButton} onClick={handlePrintQr}>
                {t.print}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setQrOpen(false)}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
