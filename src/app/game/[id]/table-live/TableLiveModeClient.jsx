'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import QRCode from 'qrcode'
import TopBar from '@/components/TopBar'
import styles from './tableLiveMode.module.scss'

export default function TableLiveModeClient({gameId, gameName}) {
  const router = useRouter()
  const [eventTitle, setEventTitle] = useState(`${gameName} Tavoli`)
  const [eventLink, setEventLink] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [error, setError] = useState('')
  const [qrOpen, setQrOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadExisting = async () => {
      try {
        const response = await fetch(`/api/table-live/event/create?gameId=${encodeURIComponent(gameId)}`, {
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (!cancelled && response.ok && payload?.event?.url) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
          setEventTitle(payload.event.title || `${gameName} Tavoli`)
          setEventLink(`${baseUrl}${payload.event.url}`)
        }
      } finally {
        if (!cancelled) setLoadingExisting(false)
      }
    }

    loadExisting()
    return () => {
      cancelled = true
    }
  }, [gameId, gameName])

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

  const handleCreateEvent = async () => {
    if (creating || !eventTitle.trim()) return
    setError('')
    setCreating(true)

    try {
      const response = await fetch('/api/table-live/event/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          gameId,
          title: eventTitle.trim(),
          inactivityTimeoutMinutes: 15,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.url) {
        setError(payload?.error || 'Creazione evento fallita')
        return
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      setEventLink(`${baseUrl}${payload.url}`)
    } catch {
      setError('Errore di rete')
    } finally {
      setCreating(false)
    }
  }

  const handleRegenerate = async () => {
    const confirmed = window.confirm(
      "Rigenerando l'evento, il link/QR attuale smettera di funzionare. Vuoi continuare?",
    )
    if (!confirmed) return
    await handleCreateEvent()
  }

  const handleCopy = async () => {
    if (!eventLink) return
    await navigator.clipboard.writeText(eventLink)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 1800)
  }

  const handlePrint = () => {
    if (!qrDataUrl || !eventLink) return

    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>${eventTitle}</title>
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
          <h1>${eventTitle}</h1>
          <img src="${qrDataUrl}" alt="QR evento tavoli" />
          <p>${eventLink}</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBarWrap}>
        <TopBar title="Impostazioni evento" onBack={() => router.push(`/game/${gameId}`)} />
      </div>

      <main className={styles.container}>
        {loadingExisting ? (
          <section className={styles.card}>
            <p>Caricamento evento...</p>
          </section>
        ) : null}

        {!loadingExisting && !eventLink ? (
          <section className={styles.card}>
            <p>
              Crea un evento unico, stampa il QR e lascia che ogni tavolo giochi in partita separata
              con codice dedicato.
            </p>
            <label htmlFor="table-live-title">Titolo evento</label>
            <input
              id="table-live-title"
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              maxLength={120}
              placeholder="Es. Degustazione Venerdi"
            />
            <button className="btn success" onClick={handleCreateEvent} disabled={creating}>
              {creating ? 'Creazione...' : 'Crea evento tavoli'}
            </button>
            {error ? <p className={styles.error}>{error}</p> : null}
          </section>
        ) : null}

        {eventLink ? (
          <section className={styles.card}>
            <h2>Link e QR evento</h2>
            <input type="text" readOnly value={eventLink} className={styles.linkInput} />
            <div className={styles.actions}>
              <button className="btn neutral small" onClick={handleCopy}>
                {copyFeedback ? 'Copiato' : 'Copia link'}
              </button>
              <button className="btn neutral small" onClick={() => setQrOpen(true)}>
                Apri QR
              </button>
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
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
            <img src="/logo.svg" alt="Indovinando" className={styles.qrLogo} />
            <h3>{eventTitle}</h3>
            {qrDataUrl ? <img src={qrDataUrl} alt="QR evento tavoli" className={styles.qrImage} /> : null}
            <div className={styles.actions}>
              <button className="btn success small" onClick={handlePrint}>
                Stampa
              </button>
              <button className="btn neutral small" onClick={() => setQrOpen(false)}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
