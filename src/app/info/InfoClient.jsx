'use client'

import {useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import styles from './info.module.scss'

const SWIPE_THRESHOLD_PX = 70

function buildSlides(isEnglish) {
  if (isEnglish) {
    return [
      {
        emoji: '🧭',
        title: 'Welcome to Indovinando',
        description: 'A practical guide to discover every feature and jump in quickly.',
        points: [
          'Create your game formats in minutes.',
          'Play with friends live or use enoteca mode in person.',
          'Track your wine learning progress in the course area.',
        ],
      },
      {
        emoji: '🍷',
        title: 'Create Game',
        description: 'Build a full custom game with questions, answer options and bottle list.',
        points: [
          'Choose your own question set.',
          'Add bottles with producer and vintage.',
          'Set correct answers for each bottle-question pair.',
        ],
        ctaHref: '/game/create',
        ctaLabel: 'Open Create Game',
      },
      {
        emoji: '⚡',
        title: 'Create Quick Game',
        description: 'Start from a ready template and publish immediately when you need speed.',
        points: [
          'Pre-filled question structure.',
          'Faster setup for events and tastings.',
          'Perfect for quick sessions with minimum prep.',
        ],
        ctaHref: '/game/create-quick',
        ctaLabel: 'Open Quick Create',
      },
      {
        emoji: '🥂',
        title: 'Enoteca Mode',
        description: 'A table-friendly flow for in-person tasting rounds with nickname sessions.',
        points: [
          'Join and play from the same table.',
          'Score bottle by bottle in a guided flow.',
          'Great for wine bars, classes and private tastings.',
        ],
        ctaHref: '/dashboard',
        ctaLabel: 'Go to your games',
      },
      {
        emoji: '🛰️',
        title: 'Live Multiplayer',
        description: 'Host a realtime game session and show results round by round.',
        points: [
          'Players join with nickname and avatar.',
          'Round status and scoring updates live.',
          'Final leaderboard at the end of the game.',
        ],
        ctaHref: '/dashboard',
        ctaLabel: 'Start from Dashboard',
      },
      {
        emoji: '🎓',
        title: 'Wine Course',
        description:
          'Learn wine step by step with didactic slides, quiz rounds and progress tracking.',
        points: [
          'Levels and lessons organized by topic.',
          'Best score and attempts tracked per lesson.',
          'Great for continuous training over time.',
        ],
        ctaHref: '/corso-vino',
        ctaLabel: 'Open Wine Course',
      },
    ]
  }

  return [
    {
      emoji: '🧭',
      title: 'Benvenuto su Indovinando',
      description: 'Una guida pratica per scoprire tutte le funzioni e iniziare velocemente.',
      points: [
        'Crea format di gioco in pochi minuti.',
        'Gioca con amici live o in presenza con modalita enoteca.',
        'Tieni traccia della formazione vino nell area corso.',
      ],
    },
    {
      emoji: '🍷',
      title: 'Crea Gioco',
      description: 'Costruisci un gioco completo personalizzato con domande, opzioni e bottiglie.',
      points: [
        'Definisci le domande che vuoi usare.',
        'Aggiungi bottiglie con produttore e annata.',
        'Imposta le risposte corrette per ogni coppia bottiglia-domanda.',
      ],
      ctaHref: '/game/create',
      ctaLabel: 'Apri Crea Gioco',
    },
    {
      emoji: '⚡',
      title: 'Crea Gioco Veloce',
      description: 'Parti da un template pronto e pubblica subito quando vuoi massima velocita.',
      points: [
        'Struttura domande gia impostata.',
        'Setup rapido per eventi e degustazioni.',
        'Perfetto per sessioni veloci con poca preparazione.',
      ],
      ctaHref: '/game/create-quick',
      ctaLabel: 'Apri Crea Veloce',
    },
    {
      emoji: '🥂',
      title: 'Modalita Enoteca',
      description: 'Flusso da tavolo per degustazioni in presenza con sessioni a nickname.',
      points: [
        'Si gioca insieme nello stesso tavolo.',
        'Punteggio bottiglia per bottiglia guidato.',
        'Ideale per wine bar, corsi e degustazioni private.',
      ],
      ctaHref: '/dashboard',
      ctaLabel: 'Vai ai tuoi giochi',
    },
    {
      emoji: '🛰️',
      title: 'Live Multiplayer',
      description: 'Crea una sessione realtime con host e giocatori, risultati round per round.',
      points: [
        'Join dei partecipanti con nickname e avatar.',
        'Stato round e punteggi in tempo reale.',
        'Classifica finale al termine della partita.',
      ],
      ctaHref: '/dashboard',
      ctaLabel: 'Parti dalla Dashboard',
    },
    {
      emoji: '🎓',
      title: 'Corso Vino',
      description:
        'Impara il vino passo passo con slide didattiche, quiz e tracciamento progressi.',
      points: [
        'Livelli e lezioni organizzati per argomento.',
        'Miglior punteggio e tentativi salvati per lezione.',
        'Perfetto per allenamento continuo nel tempo.',
      ],
      ctaHref: '/corso-vino',
      ctaLabel: 'Apri Corso Vino',
    },
  ]
}

export default function InfoClient() {
  const router = useRouter()
  const {lang} = useLanguage()
  const isEnglish = lang === 'en'
  const slides = useMemo(() => buildSlides(isEnglish), [isEnglish])
  const [current, setCurrent] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const pointerStartXRef = useRef(0)
  const pointerIdRef = useRef(null)

  const currentSlide = slides[current]
  const isFirst = current === 0
  const isLast = current === slides.length - 1

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
        <TopBar title={isEnglish ? 'App Info' : 'Info App'} back={null}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => router.push('/profilo')}
            aria-label={isEnglish ? 'Back to profile' : 'Torna al profilo'}>
            ← {isEnglish ? 'Back' : 'Indietro'}
          </button>
        </TopBar>

        <section className={styles.card}>
          <div className={styles.progressRow}>
            <span className={styles.progressText}>
              {isEnglish ? 'Slide' : 'Slide'} {current + 1}/{slides.length}
            </span>
            <div className={styles.dots}>
              {slides.map((slide, idx) => (
                <button
                  key={slide.title}
                  type="button"
                  className={`${styles.dot} ${idx === current ? styles.dotActive : ''}`}
                  onClick={() => setCurrent(idx)}
                  aria-label={`${isEnglish ? 'Go to slide' : 'Vai alla slide'} ${idx + 1}`}
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

          <p className={styles.swipeHint}>
            {isEnglish
              ? 'Swipe left or right to change slide.'
              : 'Scorri a destra o sinistra per cambiare slide.'}
          </p>

          <div className={styles.actions}>
            <button type="button" className="btn secondary" onClick={goPrev} disabled={isFirst}>
              {isEnglish ? 'Back' : 'Indietro'}
            </button>

            {!isLast ? (
              <button type="button" className="btn primary" onClick={goNext}>
                {isEnglish ? 'Next' : 'Avanti'}
              </button>
            ) : (
              <a href="/profilo" className="btn primary">
                {isEnglish ? 'Done' : 'Fine'}
              </a>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
