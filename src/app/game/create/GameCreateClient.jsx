'use client'

import {Suspense, useState} from 'react'
import {createClient} from '@/lib/supabaseClient'
import GameEditor from '@/components/game/GameEditor'
import Loader from '@/components/Loader'
import OnboardingModal from '@/components/game/OnboardingModal'
import TopBar from '@/components/TopBar'
import styles from './gameCreate.module.css'

const TEMPLATE_QUESTIONS = [
  {
    text: 'Stato',
    options: ['Italia', 'Francia', 'Usa', 'Australia', 'Grecia', 'Svezia', 'Spagna'],
  },
  {
    text: 'Regione',
    options: ['Toscana', 'Borgogna', 'Marche', 'Piemonte', 'Campania', 'Napa Valley', 'Umbria'],
  },
  {
    text: 'Uvaggio',
    options: ['Blend', 'Sangiovese', 'Pinot Nero', 'Aglianico', 'Nebbiolo', 'Merlot', 'Syrah', 'Verdicchio'],
  },
  {
    text: 'Anno',
    options: ['2017', '2018', '2019', '2020', '2021', '2022', '2023'],
  },
  {
    text: 'Prezzo',
    options: ['5€', '10€', '20€', '30€', '40€', '60€', '80€'],
  },
]

// null = choosing, 'custom' = full editor, 'quick' = template prefilled
function ModePickerScreen({onPick}) {
  return (
    <main className="flex-container">
      <div className="flex-column">
        <TopBar title="Crea gioco" onBack={() => (window.location.href = '/dashboard')} />
        <div className={styles.modePickerGrid}>
          <button className={styles.modeCard} onClick={() => onPick('custom')}>
            <span className={styles.modeCardEmoji}>✏️</span>
            <strong className={styles.modeCardTitle}>Gioco personalizzato</strong>
            <p className={styles.modeCardDesc}>
              Crea le tue domande e risposta da zero, adatta ogni dettaglio al tuo stile.
            </p>
            <span className={styles.modeCardCta}>Inizia →</span>
          </button>

          <button className={styles.modeCard} onClick={() => onPick('quick')}>
            <span className={styles.modeCardEmoji}>⚡</span>
            <strong className={styles.modeCardTitle}>Gioco rapido</strong>
            <p className={styles.modeCardDesc}>
              Usa il nostro modello pronto per la degustazione: aggiungi le bottiglie e sei pronto.
            </p>
            <span className={styles.modeCardCta}>Usa template →</span>
          </button>
        </div>
      </div>
    </main>
  )
}

export default function GameCreateClient({initialShowOnboarding, userId}) {
  const supabase = createClient()
  const [showOnboarding, setShowOnboarding] = useState(initialShowOnboarding)
  const [mode, setMode] = useState(null)

  async function handleDisableOnboarding() {
    if (!userId) {
      setShowOnboarding(false)
      return
    }
    await supabase.from('profiles').update({onboarding: false}).eq('id', userId)
    setShowOnboarding(false)
  }

  if (mode === null) {
    return <ModePickerScreen onPick={setMode} />
  }

  return (
    <main className="flex-container">
      <div className="flex-column">
        {showOnboarding && (
          <OnboardingModal
            onClose={() => setShowOnboarding(false)}
            onDisable={handleDisableOnboarding}
          />
        )}

        <Suspense fallback={<Loader label="Caricamento editor" />}>
          {mode === 'quick' ? (
            <GameEditor
              initialQuestions={TEMPLATE_QUESTIONS}
              initialGameName="Indovinando"
              userId={userId}
              isQuickCreate={true}
            />
          ) : (
            <GameEditor userId={userId} />
          )}
        </Suspense>
      </div>
    </main>
  )
}
