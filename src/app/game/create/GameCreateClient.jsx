'use client'

import {Suspense, useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '@/lib/supabaseClient'
import GameEditor from '@/components/game/GameEditor'
import Loader from '@/components/Loader'
import OnboardingModal from '@/components/game/OnboardingModal'
import PageLayout from '@/components/PageLayout'
import Icon from '@/components/Icon'
import BottomNav from '@/components/BottomNav'
import styles from './gameCreate.module.scss'

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
    options: [
      'Blend',
      'Sangiovese',
      'Pinot Nero',
      'Aglianico',
      'Nebbiolo',
      'Merlot',
      'Syrah',
      'Verdicchio',
    ],
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
  const router = useRouter()

  return (
    <>
      <PageLayout title="Crea Degustazione" onBack={() => router.push('/miei-giochi')}>
        <h1 className={styles.modePickerTitle}>Scegli come vuoi preparare il gioco.</h1>
        <div className={styles.modePickerGrid}>
          <button
            className={`${styles.modeCard} ${styles.modeCardQuick}`}
            onClick={() => onPick('quick')}>
            <img
              src="/game-options-quick.svg"
              alt=""
              aria-hidden="true"
              className={styles.modeCardBgImage}
            />
            <div className={styles.modeCardContent}>
              <strong className={styles.modeCardTitle}>Quiz rapido</strong>
              <p className={styles.modeCardDesc}>
                Usa il nostro modello pronto per la degustazione: aggiungi le bottiglie e sei
                pronto.
              </p>
              <span className="btn btn-small quaternary btn-quick-game btn-inline btn-with-icon-end">
                <span>Usa modello</span>
                <Icon name="forward" size={24} className="btn-icon" />
              </span>
            </div>
          </button>

          <button
            className={`${styles.modeCard} ${styles.modeCardCustom}`}
            onClick={() => onPick('custom')}>
            <img
              src="/game-options-custom.svg"
              alt=""
              aria-hidden="true"
              className={styles.modeCardBgImage}
            />
            <div className={styles.modeCardContent}>
              <strong className={styles.modeCardTitle}>Quiz personalizzato</strong>
              <p className={styles.modeCardDesc}>
                Crea le tue domande e risposta da zero, adatta ogni dettaglio al tuo stile.
              </p>
              <span className="btn btn-small quaternary btn-custom-game btn-inline btn-with-icon-end">
                <span>Inizia</span>
                <Icon name="forward" size={24} className="btn-icon" />
              </span>
            </div>
          </button>
        </div>
      </PageLayout>
      <BottomNav />
    </>
  )
}

export default function GameCreateClient({initialShowOnboarding, userId, avatarOptions = []}) {
  const router = useRouter()
  const supabase = createClient()
  const [showOnboarding, setShowOnboarding] = useState(initialShowOnboarding)
  const [mode, setMode] = useState(null)

  function resetEditorStepInUrl() {
    router.replace('/game/create?step=1')
  }

  function handlePickMode(nextMode) {
    resetEditorStepInUrl()
    setMode(nextMode)
  }

  function handleBackToModePicker() {
    setMode(null)
    resetEditorStepInUrl()
  }

  async function handleDisableOnboarding() {
    if (!userId) {
      setShowOnboarding(false)
      return
    }
    await supabase.from('profiles').update({onboarding: false}).eq('id', userId)
    setShowOnboarding(false)
  }

  if (mode === null) {
    return <ModePickerScreen onPick={handlePickMode} />
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
              avatarOptions={avatarOptions}
              isQuickCreate={true}
              onBack={handleBackToModePicker}
            />
          ) : (
            <GameEditor
              userId={userId}
              avatarOptions={avatarOptions}
              onBack={handleBackToModePicker}
            />
          )}
        </Suspense>
      </div>
    </main>
  )
}
