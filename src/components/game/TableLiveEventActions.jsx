'use client'

import Image from 'next/image'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import QRCode from 'qrcode'
import Icon from '@/components/Icon'
import InfoModal from '@/components/InfoModal'
import {Button, ButtonLink} from '@/components/ui/Button'
import {buildPublicAppUrl, getPublicAppOrigin} from '@/lib/publicAppUrl'
import {useT} from '@/lib/i18n/useT'
import styles from './GamePlayView/GamePlayView.module.scss'

function appendImage(document, parent, {src, alt, className}) {
  const image = document.createElement('img')
  image.src = src
  image.alt = alt
  image.className = className
  parent.appendChild(image)
}

function appendText(document, parent, tagName, value, className = '') {
  const element = document.createElement(tagName)
  element.textContent = value
  if (className) element.className = className
  parent.appendChild(element)
}

function printEventQr({eventTitle, eventLink, qrDataUrl, branding}) {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.title = 'QR print'
  document.body.appendChild(iframe)

  const frameWindow = iframe.contentWindow
  const frameDocument = iframe.contentDocument || frameWindow?.document
  if (!frameWindow || !frameDocument) {
    iframe.remove()
    return false
  }

  frameDocument.open()
  frameDocument.write('<!doctype html><html><head></head><body></body></html>')
  frameDocument.close()
  frameDocument.title = `${eventTitle} QR`

  const style = frameDocument.createElement('style')
  style.textContent = `
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; text-align: center; }
    .logo { width: 120px; height: auto; margin: 0 auto 12px; display: block; object-fit: contain; }
    .qr { width: 280px; height: 280px; margin: 0 auto; display: block; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    p { font-size: 12px; color: #444; word-break: break-all; }
    .brand { font-size: 13px; color: #222; margin-bottom: 8px; font-weight: 700; }
  `
  frameDocument.head.appendChild(style)

  const logoUrl = branding.logoUrl || `${getPublicAppOrigin()}/logo.svg`
  appendImage(frameDocument, frameDocument.body, {
    src: logoUrl,
    alt: branding.activityName || eventTitle,
    className: 'logo',
  })
  if (branding.activityName) {
    appendText(frameDocument, frameDocument.body, 'div', branding.activityName, 'brand')
  }
  appendText(frameDocument, frameDocument.body, 'h1', eventTitle)
  appendImage(frameDocument, frameDocument.body, {
    src: qrDataUrl,
    alt: 'QR',
    className: 'qr',
  })
  appendText(frameDocument, frameDocument.body, 'p', eventLink)

  const printFromFrame = () => {
    try {
      frameWindow.focus()
      frameWindow.print()
    } finally {
      window.setTimeout(() => iframe.remove(), 1000)
    }
  }

  const images = Array.from(frameDocument.images)
  let pendingImages = images.filter((image) => !image.complete).length
  if (!pendingImages) {
    window.setTimeout(printFromFrame, 120)
    return true
  }

  let printed = false
  const finishImage = () => {
    pendingImages -= 1
    if (pendingImages > 0 || printed) return
    printed = true
    window.setTimeout(printFromFrame, 120)
  }

  images.forEach((image) => {
    if (image.complete) return
    image.addEventListener('load', finishImage, {once: true})
    image.addEventListener('error', finishImage, {once: true})
  })

  window.setTimeout(() => {
    if (printed) return
    printed = true
    printFromFrame()
  }, 1500)

  return true
}

export default function TableLiveEventActions({
  gameId,
  gameName,
  initialEvent = null,
  branding = {},
}) {
  const router = useRouter()
  const t = useT('gamePlayViewActions')
  const [event, setEvent] = useState(initialEvent)
  const [pendingAction, setPendingAction] = useState('')
  const [error, setError] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [eventLink, setEventLink] = useState('')
  const [copyFeedback, setCopyFeedback] = useState(false)

  const ensureEvent = async () => {
    if (event?.url) return event

    const response = await fetch('/api/table-live/event/create', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        gameId,
        title: gameName,
        inactivityTimeoutMinutes: 15,
      }),
    })
    const payload = await response.json().catch(() => null)
    const resolvedEvent = payload?.event || null

    if (!response.ok || !resolvedEvent?.url) {
      throw new Error(t('tableLivePrepareError'))
    }

    setEvent(resolvedEvent)
    return resolvedEvent
  }

  const handleStart = async () => {
    if (pendingAction) return
    setPendingAction('start')
    setError('')

    try {
      const resolvedEvent = await ensureEvent()
      window.dispatchEvent(new CustomEvent('app:navigation-intent', {detail: {direction: 'forward'}}))
      router.push(resolvedEvent.url)
    } catch (caughtError) {
      setError(caughtError?.message || t('tableLivePrepareError'))
      setPendingAction('')
    }
  }

  const handleOpenQr = async () => {
    if (pendingAction) return
    setPendingAction('qr')
    setError('')

    try {
      const resolvedEvent = await ensureEvent()
      const resolvedEventLink = buildPublicAppUrl(resolvedEvent.url)
      const dataUrl = await QRCode.toDataURL(resolvedEventLink, {
        width: 360,
        margin: 1,
        errorCorrectionLevel: 'M',
      })
      setEventLink(resolvedEventLink)
      setQrDataUrl(dataUrl)
      setQrOpen(true)
    } catch (caughtError) {
      setError(caughtError?.message || t('tableLivePrepareError'))
    } finally {
      setPendingAction('')
    }
  }

  const handlePrint = () => {
    const didOpenPrint = printEventQr({
      eventTitle: event?.title || gameName,
      eventLink,
      qrDataUrl,
      branding,
    })
    if (!didOpenPrint) setError(t('tableLivePrintError'))
  }

  const handleCopyLink = async () => {
    if (!eventLink) return

    try {
      await navigator.clipboard.writeText(eventLink)
      setCopyFeedback(true)
      window.setTimeout(() => setCopyFeedback(false), 1800)
    } catch {
      setError(t('tableLiveCopyError'))
    }
  }

  return (
    <div className={styles.tableLiveActions}>
      {event?.url ? (
        <ButtonLink
          href={event.url}
          variant="success"
          className={`btn-start ${styles.actionBtn}`}>
          {t('startMatch')}
        </ButtonLink>
      ) : (
        <Button
          variant="success"
          className={`btn-start ${styles.actionBtn}`}
          onClick={handleStart}
          disabled={Boolean(pendingAction)}
          aria-busy={pendingAction === 'start'}>
          {pendingAction === 'start' ? t('startingMatch') : t('startMatch')}
        </Button>
      )}
      <Button
        variant="neutral"
        className={styles.actionBtn}
        onClick={handleOpenQr}
        disabled={Boolean(pendingAction)}
        aria-busy={pendingAction === 'qr'}>
        <span className={styles.actionBtnContent}>
          <Icon name="print" size={24} className={styles.actionBtnIcon} />
          <span>{pendingAction === 'qr' ? t('preparingQr') : t('printQr')}</span>
        </span>
      </Button>
      {error ? (
        <p className={styles.tableLiveError} role="alert">
          {error}
        </p>
      ) : null}

      <InfoModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        title={t('qrTitle')}
        disableClose={false}>
        <div className={styles.qrModalContent}>
          <Image
            src={branding.logoUrl || '/logo.svg'}
            alt={branding.activityName || 'Indovinando'}
            className={styles.qrLogo}
            width={84}
            height={84}
            unoptimized
          />
          {branding.activityName ? (
            <p className={styles.qrBrandName}>{branding.activityName}</p>
          ) : null}
          <h4 className={styles.qrEventTitle}>{event?.title || gameName}</h4>
          <p className={styles.qrHint}>{t('qrHint')}</p>
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt={t('qrImageAlt')}
              className={styles.qrImage}
              width={300}
              height={300}
              unoptimized
            />
          ) : null}
          <p className={styles.qrEventLink}>{eventLink}</p>
          <div className={styles.qrModalActions}>
            <Button variant="neutral" size="small" onClick={() => setQrOpen(false)}>
              {t('close')}
            </Button>
            <Button variant="neutral" size="small" onClick={handleCopyLink}>
              {copyFeedback ? t('copied') : t('copyLink')}
            </Button>
            <Button variant="success" size="small" onClick={handlePrint}>
              {t('printQrAction')}
            </Button>
          </div>
        </div>
      </InfoModal>
    </div>
  )
}
