'use client'

import {Suspense, useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '@/lib/supabaseClient'
import GameEditor from '@/components/game/GameEditor'
import Loader from '@/components/Loader'
import OnboardingModal from '@/components/game/OnboardingModal'
import PageLayout from '@/components/PageLayout'
import Icon from '@/components/Icon'
import {useT} from '@/lib/i18n/useT'
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

function ModePickerScreen({onPick, onOpenGuide}) {
  const router = useRouter()
  const t = useT('gameCreate')

  return (
    <PageLayout title={t('title')} onBack={() => router.push('/miei-giochi')}>
      <h1 className={styles.modePickerTitle}>{t('chooseModeTitle')}</h1>
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
            <strong className={styles.modeCardTitle}>{t('quickTitle')}</strong>
            <p className={styles.modeCardDesc}>{t('quickDescription')}</p>
            <span className="btn btn-small quaternary btn-quick-game btn-inline btn-with-icon-end">
              <span>{t('quickAction')}</span>
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
            <strong className={styles.modeCardTitle}>{t('customTitle')}</strong>
            <p className={styles.modeCardDesc}>{t('customDescription')}</p>
            <span className="btn btn-small quaternary btn-custom-game btn-inline btn-with-icon-end">
              <span>{t('customAction')}</span>
              <Icon name="forward" size={24} className="btn-icon" />
            </span>
          </div>
        </button>
      </div>
      <button
        type="button"
        className={`btn neutral btn-small ${styles.openGuideBtn}`}
        onClick={onOpenGuide}>
        {t('openGuide')}
      </button>
    </PageLayout>
  )
}

function CreateOnboardingModal({showOnboarding, onClose, onDisable}) {
  if (!showOnboarding) return null
  return <OnboardingModal onClose={onClose} onDisable={onDisable} />
}

export default function GameCreateClient({
  initialShowOnboarding,
  userId,
  avatarOptions = [],
  mode = 'choose',
}) {
  const router = useRouter()
  const t = useT('gameCreate')
  const supabase = createClient()
  const [showOnboarding, setShowOnboarding] = useState(initialShowOnboarding)

  function handlePickMode(nextMode) {
    router.push(nextMode === 'quick' ? '/game/create/quick' : '/game/create/custom')
  }

  function handleBackToModePicker() {
    router.push('/game/create')
  }

  async function handleDisableOnboarding() {
    if (!userId) {
      setShowOnboarding(false)
      return
    }
    await supabase.from('profiles').update({onboarding: false}).eq('id', userId)
    setShowOnboarding(false)
  }

  if (mode === 'choose') {
    return (
      <>
        <CreateOnboardingModal
          showOnboarding={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onDisable={handleDisableOnboarding}
        />
        <ModePickerScreen onPick={handlePickMode} onOpenGuide={() => setShowOnboarding(true)} />
      </>
    )
  }

  return (
    <main className="flex-container">
      <div className="flex-column">
        <CreateOnboardingModal
          showOnboarding={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onDisable={handleDisableOnboarding}
        />

        <Suspense fallback={<Loader label={t('loadingEditor')} />}>
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
