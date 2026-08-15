'use client'

import Image from 'next/image'
import {useCallback, useRef, useState} from 'react'
import {Button, ButtonLink} from '@/components/ui/Button'
import styles from './info.module.scss'

const SWIPE_MIN_DISTANCE = 44
const SWIPE_MIN_VELOCITY = 0.45

export default function GuideSlideDeck({slides = [], labels = {}}) {
  const [current, setCurrent] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const gestureRef = useRef(null)
  const slideCount = slides.length
  const currentSlide = slides[current]
  const isFirst = current === 0
  const isLast = current === slideCount - 1

  const goToSlide = useCallback(
    (index) => {
      setDragOffset(0)
      setCurrent(Math.max(0, Math.min(index, Math.max(slideCount - 1, 0))))
    },
    [slideCount],
  )
  const goNext = useCallback(() => goToSlide(current + 1), [current, goToSlide])
  const goPrev = useCallback(() => goToSlide(current - 1), [current, goToSlide])

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

    const edgeResistance = (isFirst && deltaX > 0) || (isLast && deltaX < 0) ? 0.28 : 1
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

  function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goPrev()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      goNext()
    }
  }

  if (!currentSlide) return null

  const progressLabel = `${labels.slide || 'Slide'} ${current + 1}/${slideCount}`
  const slideTitleId = 'guide-current-slide-title'

  return (
    <div
      className={styles.deck}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={labels.title}>
      <div className={styles.deckProgressRow}>
        <span className={styles.deckProgressText}>{progressLabel}</span>
        <div className={styles.deckDots} role="group" aria-label={labels.title}>
          {slides.map((slide, index) => (
            <button
              key={`${slide.image || slide.title}-${index}`}
              type="button"
              className={`${styles.deckDot} ${index === current ? styles.deckDotActive : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`${labels.goToSlide} ${index + 1}`}
              aria-current={index === current ? 'step' : undefined}
              aria-controls="guide-current-slide"
            />
          ))}
        </div>
      </div>

      <div
        className={styles.deckProgressBar}
        role="progressbar"
        aria-label={progressLabel}
        aria-valuemin={1}
        aria-valuemax={slideCount}
        aria-valuenow={current + 1}>
        <span
          className={styles.deckProgressFill}
          style={{width: `${((current + 1) / slideCount) * 100}%`}}
        />
      </div>

      <div
        className={styles.deckViewport}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerGesture}
        onPointerCancel={(event) => finishPointerGesture(event, true)}
        onLostPointerCapture={(event) => finishPointerGesture(event, true)}>
        <article
          id="guide-current-slide"
          key={`${current}-${currentSlide.title}`}
          className={`${styles.deckSlide} ${dragOffset ? styles.deckSlideDragging : ''}`}
          style={{transform: `translate3d(${dragOffset}px, 0, 0)`}}>
          <div className={styles.deckVisual}>
            {currentSlide.image ? (
              <Image
                src={currentSlide.image}
                alt={currentSlide.imageAlt || currentSlide.title}
                className={styles.deckImage}
                width={260}
                height={260}
                sizes="(max-width: 699px) 180px, 260px"
                priority={current === 0}
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
              />
            ) : (
              <span className={styles.deckEmoji} aria-hidden="true">
                {currentSlide.emoji}
              </span>
            )}
          </div>

          <div className={styles.deckCopy}>
            {currentSlide.kicker ? <p className={styles.eyebrow}>{currentSlide.kicker}</p> : null}
            <h3 id={slideTitleId}>{currentSlide.title}</h3>
            <p>{currentSlide.description}</p>
            {Array.isArray(currentSlide.points) && currentSlide.points.length ? (
              <ul className={styles.checkList}>
                {currentSlide.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </article>
      </div>

      <p className={styles.deckHint}>
        <span aria-hidden="true">↔</span>
        {labels.swipeHint}
      </p>
      <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {progressLabel}: {currentSlide.title}
      </p>

      <div className={styles.deckActions}>
        <Button variant="neutral" onClick={goPrev} disabled={isFirst}>
          {labels.back}
        </Button>
        {isLast ? (
          <ButtonLink href="#video" variant="success-filled">
            {labels.complete}
          </ButtonLink>
        ) : (
          <Button variant="success-filled" onClick={goNext}>
            {labels.next}
          </Button>
        )}
      </div>
    </div>
  )
}
