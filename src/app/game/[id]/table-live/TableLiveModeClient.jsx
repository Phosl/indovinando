'use client'

import Image from 'next/image'
import {useCallback, useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import QRCode from 'qrcode'
import TopBar from '@/components/TopBar'
import {buildPublicAppUrl, getPublicAppOrigin} from '@/lib/publicAppUrl'
import styles from './tableLiveMode.module.scss'

export default function TableLiveModeClient({gameId, gameName, backHref = `/game/${gameId}`, branding = {}}) {
  const router = useRouter()
  const [eventTitle, setEventTitle] = useState(gameName)
  const [eventLink, setEventLink] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [error, setError] = useState('')
  const [qrOpen, setQrOpen] = useState(false)

  const createEventRequest = useCallback(async (title, {regenerate = false} = {}) => {
    const response = await fetch('/api/table-live/event/create', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        gameId,
        title,
        inactivityTimeoutMinutes: 15,
        regenerate,
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.url) {
      throw new Error(payload?.error || 'Creazione evento fallita')
    }

    setEventTitle(payload.event?.title || title)
    setEventLink(buildPublicAppUrl(payload.url))
  }, [gameId])

  useEffect(() => {
    let cancelled = false

    const loadExisting = async () => {
      try {
        setError('')
        const response = await fetch(
          `/api/table-live/event/create?gameId=${encodeURIComponent(gameId)}`,
          {
            cache: 'no-store',
          },
        )
        const payload = await response.json().catch(() => null)
        if (!cancelled && response.ok && payload?.event?.url) {
          setEventTitle(payload.event.title || gameName)
          setEventLink(buildPublicAppUrl(payload.event.url))
          return
        }

        await createEventRequest(gameName)
      } catch (caughtError) {
        if (!cancelled) setError(caughtError?.message || 'Errore di rete')
      } finally {
        if (!cancelled) setLoadingExisting(false)
      }
    }

    loadExisting()
    return () => {
      cancelled = true
    }
  }, [createEventRequest, gameId, gameName])

  useEffect(() => {
    if (!eventLink) return
    let cancelled = false

    QRCode.toDataURL(eventLink, {width: 360, margin: 1, errorCorrectionLevel: 'M'})
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('')
      })

    return () => {
      cancelled = true
    }
  }, [eventLink])

  const handleRegenerate = async () => {
    const confirmed = window.confirm(
      "Rigenerando l'evento, il link/QR attuale smettera di funzionare. Vuoi continuare?",
    )
    if (!confirmed) return
    setError('')
    setCreating(true)
    try {
      await createEventRequest(gameName, {regenerate: true})
    } catch (caughtError) {
      setError(caughtError?.message || 'Errore di rete')
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async () => {
    if (!eventLink) return
    await navigator.clipboard.writeText(eventLink)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 1800)
  }

  const handlePrint = () => {
    if (!qrDataUrl || !eventLink) return

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    document.body.appendChild(iframe)

    const frameWindow = iframe.contentWindow
    const frameDocument = iframe.contentDocument || frameWindow?.document
    if (!frameWindow || !frameDocument) {
      iframe.remove()
      return
    }

    frameDocument.open()
    frameDocument.write(`
      <html>
        <head>
          <title>${eventTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; text-align: center; }
            .logo { width: 120px; height: auto; margin: 0 auto 12px; display: block; object-fit: contain; }
            img { width: 280px; height: 280px; }
            h1 { font-size: 18px; margin: 0 0 12px; }
            p { font-size: 12px; color: #444; word-break: break-all; }
            .brand { font-size: 13px; color: #222; margin-bottom: 8px; font-weight: 700; }
          </style>
        </head>
        <body>
          ${branding.logoUrl ? `<img class="logo" src="${branding.logoUrl}" alt="${branding.activityName || eventTitle}" />` : `<img class="logo" src="${getPublicAppOrigin()}/logo.svg" alt="Indovinando" />`}
          ${branding.activityName ? `<div class="brand">${branding.activityName}</div>` : ''}
          <h1>${eventTitle}</h1>
          <img src="${qrDataUrl}" alt="QR evento tavoli" />
          <p>${eventLink}</p>
        </body>
      </html>
    `)
    frameDocument.close()

    const printFromFrame = () => {
      try {
        frameWindow.focus()
        frameWindow.print()
      } finally {
        setTimeout(() => iframe.remove(), 1000)
      }
    }

    const images = Array.from(frameDocument.images || [])
    if (!images.length) {
      setTimeout(printFromFrame, 120)
      return
    }

    let loaded = 0
    let printed = false

    const tryPrint = () => {
      if (printed || loaded < images.length) return
      printed = true
      setTimeout(printFromFrame, 120)
    }

    images.forEach((img) => {
      if (img.complete) {
        loaded += 1
        tryPrint()
        return
      }

      const done = () => {
        loaded += 1
        tryPrint()
      }

      img.addEventListener('load', done, {once: true})
      img.addEventListener('error', done, {once: true})
    })

    setTimeout(() => {
      if (printed) return
      printed = true
      printFromFrame()
    }, 1500)
  }

  const handleOpenLink = () => {
    if (!eventLink) return

    try {
      const targetUrl = new URL(eventLink, window.location.origin)
      if (targetUrl.origin === window.location.origin) {
        window.dispatchEvent(new CustomEvent('app:navigation-intent', {detail: {direction: 'forward'}}))
        router.push(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`)
        return
      }
    } catch {}

    window.location.href = eventLink
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBarWrap}>
        <TopBar title="Avvia partita" onBack={() => router.push(backHref)} />
      </div>

      <main className={styles.container}>
        {loadingExisting ? (
          <section className={styles.card}>
            <p>Preparazione link e QR in corso...</p>
          </section>
        ) : null}

        {eventLink ? (
          <section className={`${styles.card} ${styles.shareCard}`}>
            <div className={styles.shareCardBody}>
              <h2>Link e QR evento</h2>
              <p>Accedi a questo link per giocare o stampa il QR per condividerlo.</p>
            </div>

            <div className={styles.linkBlock}>
              <span className={styles.linkLabel}>Link</span>
              <input type="text" readOnly value={eventLink} className={styles.linkInput} />
            </div>

            <div className={styles.actions}>
              <button className="btn secondary small" onClick={handleOpenLink}>
                Vai al link
              </button>
              <button className="btn neutral small" onClick={handleCopy}>
                {copyFeedback ? 'Copiato' : 'Copia'}
              </button>
              <button className="btn success small" onClick={() => setQrOpen(true)}>
                Stampa QR
              </button>
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
          </section>
        ) : null}

        {!loadingExisting && !eventLink && error ? (
          <section className={styles.card}>
            <h2>Non sono riuscita a preparare questo evento</h2>
            <p>Riprova tra un attimo. Se il problema continua, rientra nella degustazione.</p>
            <p className={styles.error}>{error}</p>
          </section>
        ) : null}

        {eventLink ? (
          <section className={styles.card}>
            <h2>Rigenera codice</h2>
            <p>Attenzione: il link e il QR attuali verranno disattivati.</p>
            <button className="btn danger" onClick={handleRegenerate} disabled={creating}>
              {creating ? 'Rigenerazione...' : 'Rigenera link evento'}
            </button>
          </section>
        ) : null}
      </main>

      {qrOpen && (
        <div className={styles.qrOverlay} onClick={() => setQrOpen(false)}>
          <div className={styles.qrModal} onClick={(e) => e.stopPropagation()}>
            <Image
              src={branding.logoUrl || '/logo.svg'}
              alt={branding.activityName || 'Indovinando'}
              className={styles.qrLogo}
              width={84}
              height={84}
              unoptimized
            />
            {branding.activityName ? <p className={styles.qrBrandName}>{branding.activityName}</p> : null}
            <h3>{eventTitle}</h3>
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt="QR evento tavoli"
                className={styles.qrImage}
                width={300}
                height={300}
                unoptimized
              />
            ) : null}
            <div className={styles.actions}>
              <button className="btn neutral small" onClick={() => setQrOpen(false)}>
                Chiudi
              </button>
              <button className="btn success small" onClick={handlePrint}>
                Stampa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
