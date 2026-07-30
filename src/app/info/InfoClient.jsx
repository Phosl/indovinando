'use client'

import Image from 'next/image'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useRef, useState} from 'react'
import {Button} from '@/components/ui/Button'
import {useT} from '@/lib/i18n/useT'
import {supabaseClient} from '@/lib/supabaseClient'
import styles from './info.module.scss'

const SWIPE_MIN_DISTANCE = 44
const SWIPE_MIN_VELOCITY = 0.45

export default function InfoClient() {
  const router = useRouter()
  const t = useT('info')
  const tc = useT('common')
  const slidesRaw = t('slides')
  const slides = Array.isArray(slidesRaw) ? slidesRaw : []
  const [current, setCurrent] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [userId, setUserId] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const gestureRef = useRef(null)

  const slideCount = slides.length
  const currentSlide = slides[current]
  const isFirst = current === 0
  const isLast = current === slideCount - 1
  const doneHref = authChecked && userId ? '/dashboard' : '/'

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const {
          data: {session},
        } = await supabaseClient.auth.getSession()
        if (cancelled) return
        setUserId(session?.user?.id ?? null)
      } catch {
        if (cancelled) return
        setUserId(null)
      } finally {
        if (!cancelled) setAuthChecked(true)
      }
    }

    loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setCurrent((previous) => Math.min(previous, Math.max(slideCount - 1, 0)))
  }, [slideCount])

  const goNext = useCallback(() => {
    setDragOffset(0)
    setCurrent((previous) => Math.min(previous + 1, Math.max(slideCount - 1, 0)))
  }, [slideCount])

  const goPrev = useCallback(() => {
    setDragOffset(0)
    setCurrent((prev) => Math.max(prev - 1, 0))
  }, [])

  const goToSlide = useCallback((index) => {
    setDragOffset(0)
    setCurrent(index)
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return
      }

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches('input, textarea, select, [role="textbox"]'))
      ) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev])

  function handlePointerDown(event) {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
      axis: null,
      deltaX: 0,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function handlePointerMove(event) {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    const deltaX = event.clientX - gesture.startX
    const deltaY = event.clientY - gesture.startY
    gesture.deltaX = deltaX

    if (!gesture.axis && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)) {
      gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
    }

    if (gesture.axis !== 'horizontal') return

    const edgeResistance =
      (isFirst && deltaX > 0) || (isLast && deltaX < 0) ? 0.28 : 1
    setDragOffset(Math.max(-96, Math.min(96, deltaX * edgeResistance)))
  }

  function finishPointerGesture(event, cancelled = false) {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    const distance = gesture.deltaX
    const elapsed = Math.max(performance.now() - gesture.startedAt, 1)
    const velocity = Math.abs(distance) / elapsed
    const viewportWidth = event.currentTarget.getBoundingClientRect().width
    const distanceThreshold = Math.min(80, Math.max(SWIPE_MIN_DISTANCE, viewportWidth * 0.12))
    const shouldNavigate =
      !cancelled &&
      gesture.axis === 'horizontal' &&
      (Math.abs(distance) >= distanceThreshold ||
        (Math.abs(distance) >= 24 && velocity >= SWIPE_MIN_VELOCITY))

    gestureRef.current = null
    setDragOffset(0)

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (!shouldNavigate) return
    if (distance < 0) goNext()
    else goPrev()
  }

  if (!currentSlide) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={`${styles.card} ${styles.emptyCard}`}>
            <h1>{t('title')}</h1>
          </section>
        </div>
      </main>
    )
  }

  const progressLabel = `${t('slide')} ${current + 1}/${slideCount}`
  const slideTitleId = 'info-current-slide-title'
  const swipeHintId = 'info-swipe-hint'

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.card} aria-labelledby={slideTitleId}>
          <div className={styles.progressRow}>
            <span className={styles.progressText}>{progressLabel}</span>
            <div className={styles.dots} role="group" aria-label={t('title')}>
              {slides.map((slide, idx) => (
                <button
                  key={`${slide.image || slide.title}-${idx}`}
                  type="button"
                  className={`${styles.dot} ${idx === current ? styles.dotActive : ''}`}
                  onClick={() => goToSlide(idx)}
                  aria-label={`${t('goToSlide')} ${idx + 1}`}
                  aria-current={idx === current ? 'step' : undefined}
                  aria-controls="info-current-slide"
                />
              ))}
            </div>
          </div>

          <div
            className={styles.progressBar}
            role="progressbar"
            aria-label={progressLabel}
            aria-valuemin={1}
            aria-valuemax={slideCount}
            aria-valuenow={current + 1}
            aria-valuetext={progressLabel}>
            <span
              className={styles.progressFill}
              style={{width: `${((current + 1) / slideCount) * 100}%`}}
            />
          </div>

          <div
            className={styles.swipeViewport}
            aria-describedby={swipeHintId}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointerGesture}
            onPointerCancel={(event) => finishPointerGesture(event, true)}
            onLostPointerCapture={(event) => finishPointerGesture(event, true)}>
            <article
              id="info-current-slide"
              key={`${current}-${currentSlide.title}`}
              className={`${styles.swipeTrack} ${
                dragOffset !== 0 ? styles.swipeTrackDragging : ''
              }`}
              style={{transform: `translate3d(${dragOffset}px, 0, 0)`}}>
              <div className={styles.visual}>
                {currentSlide.image ? (
                  <div className={styles.imageWrap}>
                    <Image
                      src={currentSlide.image}
                      alt={currentSlide.imageAlt || currentSlide.title}
                      className={styles.image}
                      width={260}
                      height={260}
                      sizes="(max-width: 699px) 180px, 260px"
                      preload={current === 0}
                      draggable={false}
                      onDragStart={(event) => event.preventDefault()}
                    />
                  </div>
                ) : (
                  <div className={styles.emoji} aria-hidden="true">
                    {currentSlide.emoji}
                  </div>
                )}
              </div>

              <div className={styles.copy}>
                {currentSlide.kicker && <p className={styles.kicker}>{currentSlide.kicker}</p>}
                <h1 id={slideTitleId} className={styles.title}>
                  {currentSlide.title}
                </h1>
                <p className={styles.description}>{currentSlide.description}</p>

                {Array.isArray(currentSlide.points) && currentSlide.points.length > 0 && (
                  <ul className={styles.list}>
                    {currentSlide.points.map((point) => (
                      <li key={point} className={styles.listItem}>
                        <span className={styles.pointIcon} aria-hidden="true">
                          ✓
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          </div>

          <p id={swipeHintId} className={styles.swipeHint}>
            <span aria-hidden="true">↔</span>
            {t('swipeHint')}
          </p>
          <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
            {progressLabel}: {currentSlide.title}
          </p>

          <div className={styles.actions}>
            <div className={styles.actionsInner}>
              <Button
                variant="neutral"
                className={styles.actionButton}
                onClick={goPrev}
                disabled={isFirst}
                aria-keyshortcuts="ArrowLeft">
                {tc('back')}
              </Button>

              {!isLast ? (
                <Button
                  variant="success-filled"
                  className={styles.actionButton}
                  onClick={goNext}
                  aria-keyshortcuts="ArrowRight">
                  {tc('next')}
                </Button>
              ) : (
                <Button
                  variant="success-filled"
                  className={styles.actionButton}
                  onClick={() => router.push(doneHref)}
                  disabled={!authChecked}>
                  {tc('done')}
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
