'use client'

import {useEffect, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import {useT} from '@/lib/i18n/useT'
import {supabaseClient} from '@/lib/supabaseClient'
import styles from './info.module.scss'

const SWIPE_THRESHOLD_PX = 70

export default function InfoClient() {
  const router = useRouter()
  const t = useT('info')
  const tc = useT('common')
  const slidesRaw = t('slides')
  const slides = Array.isArray(slidesRaw) ? slidesRaw : []
  const [current, setCurrent] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [userId, setUserId] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  const pointerStartXRef = useRef(0)
  const pointerIdRef = useRef(null)

  const currentSlide = slides[current]
  const isFirst = current === 0
  const isLast = current === slides.length - 1
  const backHref = authChecked && !userId ? '/' : '/profilo'
  const doneHref = backHref

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

  function goNext() {
    setCurrent((prev) => Math.min(prev + 1, slides.length - 1))
  }

  function goPrev() {
    setCurrent((prev) => Math.max(prev - 1, 0))
  }

  function handlePointerDown(event) {
    // Left mouse button (or touch/pen) only.
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerIdRef.current = event.pointerId
    pointerStartXRef.current = event.clientX
    setIsDragging(true)
    setDragOffset(0)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {}
  }

  function handlePointerMove(event) {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return
    const deltaX = event.clientX - pointerStartXRef.current
    setDragOffset(deltaX)
  }

  function handlePointerEnd(event) {
    if (pointerIdRef.current !== event.pointerId) return
    const deltaX = event.clientX - pointerStartXRef.current

    if (deltaX <= -SWIPE_THRESHOLD_PX && !isLast) {
      goNext()
    } else if (deltaX >= SWIPE_THRESHOLD_PX && !isFirst) {
      goPrev()
    }

    setIsDragging(false)
    setDragOffset(0)
    pointerIdRef.current = null
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <TopBar title={t('title')} onBack={() => router.push(backHref)}></TopBar>

        <section className={styles.card}>
          <div className={styles.progressRow}>
            <span className={styles.progressText}>
              {t('slide')} {current + 1}/{slides.length}
            </span>
            <div className={styles.dots}>
              {slides.map((slide, idx) => (
                <button
                  key={slide.title}
                  type="button"
                  className={`${styles.dot} ${idx === current ? styles.dotActive : ''}`}
                  onClick={() => setCurrent(idx)}
                  aria-label={`${t('goToSlide')} ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <div className={styles.progressBar} aria-hidden="true">
            <span
              className={styles.progressFill}
              style={{width: `${((current + 1) / slides.length) * 100}%`}}
            />
          </div>

          <div
            className={styles.swipeViewport}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onPointerLeave={handlePointerEnd}
            role="presentation">
            <div
              className={`${styles.swipeTrack} ${isDragging ? styles.swipeTrackDragging : ''}`}
              style={{transform: `translateX(${dragOffset}px)`}}>
              <div className={styles.hero}>
                <div className={styles.emoji} aria-hidden="true">
                  {currentSlide.emoji}
                </div>
                <h2 className={styles.title}>{currentSlide.title}</h2>
                <p className={styles.description}>{currentSlide.description}</p>
              </div>

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
            </div>
          </div>

          <p className={styles.swipeHint}>{t('swipeHint')}</p>

          <div className={styles.actions}>
            <button type="button" className="btn secondary" onClick={goPrev} disabled={isFirst}>
              {tc('back')}
            </button>

            {!isLast ? (
              <button type="button" className="btn primary" onClick={goNext}>
                {tc('next')}
              </button>
            ) : (
              <button type="button" className="btn primary" onClick={() => router.push(doneHref)}>
                {tc('done')}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
