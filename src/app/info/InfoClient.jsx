'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import {useT} from '@/lib/i18n/useT'
import {supabaseClient} from '@/lib/supabaseClient'
import styles from './info.module.scss'

export default function InfoClient() {
  const router = useRouter()
  const t = useT('info')
  const tc = useT('common')
  const slidesRaw = t('slides')
  const slides = Array.isArray(slidesRaw) ? slidesRaw : []
  const [current, setCurrent] = useState(0)
  const [userId, setUserId] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  const currentSlide = slides[current]
  const isFirst = current === 0
  const isLast = current === slides.length - 1
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

  function goNext() {
    setCurrent((prev) => Math.min(prev + 1, slides.length - 1))
  }

  function goPrev() {
    setCurrent((prev) => Math.max(prev - 1, 0))
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
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

          <div className={styles.swipeViewport} role="presentation">
            <div className={styles.swipeTrack}>
              <div className={styles.hero}>
                {currentSlide.image ? (
                  <div className={styles.imageWrap}>
                    <img
                      src={currentSlide.image}
                      alt={currentSlide.imageAlt || currentSlide.title}
                      className={styles.image}
                    />
                  </div>
                ) : (
                  <div className={styles.emoji} aria-hidden="true">
                    {currentSlide.emoji}
                  </div>
                )}
                {currentSlide.kicker && <p className={styles.kicker}>{currentSlide.kicker}</p>}
                <h2 className={styles.title}>{currentSlide.title}</h2>
                <p className={styles.description}>{currentSlide.description}</p>
              </div>

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
          </div>

          <div className={styles.actions}>
            <div className={styles.actionsInner}>
              <button type="button" className="btn neutral" onClick={goPrev} disabled={isFirst}>
                {tc('back')}
              </button>

              {!isLast ? (
                <button type="button" className="btn success-filled" onClick={goNext}>
                  {tc('next')}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn success-filled"
                  onClick={() => router.push(doneHref)}>
                  {tc('done')}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
