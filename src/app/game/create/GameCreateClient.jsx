'use client'

import {Suspense, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '@/lib/supabaseClient'
import GameEditor from '@/components/game/GameEditor'
import PageSkeleton from '@/components/PageSkeleton'
import OnboardingModal from '@/components/game/OnboardingModal'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {useT} from '@/lib/i18n/useT'
import {getQuickTemplateQuestions} from './autoTastingHelpers'
import AutomaticModeContainer from './AutomaticModeContainer'
import ModePickerScreen from './ModePickerScreen'

function CreateOnboardingModal({
  showOnboarding,
  onClose,
  onDisable,
  variant = 'modal',
  translationKey = 'onboarding',
}) {
  if (!showOnboarding) return null
  return (
    <OnboardingModal
      onClose={onClose}
      onDisable={onDisable}
      variant={variant}
      translationKey={translationKey}
    />
  )
}

const CREATE_ONBOARDING_STORAGE_KEY = 'hideCreateOnboarding'

export default function GameCreateClient({
  initialShowOnboarding,
  userId,
  avatarOptions = [],
  initialAiScanCredits = null,
  mode = 'choose',
}) {
  const router = useRouter()
  const t = useT('gameCreate')
  const {lang} = useLanguage()
  const supabase = useMemo(() => createClient(), [])
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        initialShowOnboarding && window.localStorage.getItem(CREATE_ONBOARDING_STORAGE_KEY) !== '1'
      )
    }
    return initialShowOnboarding
  })
  const quickTemplateQuestions = useMemo(() => getQuickTemplateQuestions(t, lang), [lang, t])

  function handlePickMode(nextMode) {
    if (nextMode === 'quick') {
      router.push('/game/create/quick')
      return
    }
    if (nextMode === 'automatic') {
      router.push('/game/create/automatic')
      return
    }
    router.push('/game/create/custom')
  }

  function handleBackToModePicker() {
    router.push('/game/create')
  }

  async function handleDisableOnboarding() {
    setShowOnboarding(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CREATE_ONBOARDING_STORAGE_KEY, '1')
    }

    if (!userId) return
    try {
      await supabase.from('profiles').update({onboarding: false}).eq('id', userId)
    } catch {}
  }

  if (mode === 'choose') {
    return (
      <>
        <CreateOnboardingModal
          showOnboarding={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onDisable={handleDisableOnboarding}
          variant="page"
        />
        {!showOnboarding ? (
          <ModePickerScreen onPick={handlePickMode} onOpenGuide={() => setShowOnboarding(true)} />
        ) : null}
      </>
    )
  }

  if (mode === 'automatic') {
    return (
      <>
        <CreateOnboardingModal
          showOnboarding={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onDisable={handleDisableOnboarding}
          translationKey="automaticOnboarding"
        />
        <AutomaticModeContainer
          onBack={handleBackToModePicker}
          userId={userId}
          initialAiScanCredits={initialAiScanCredits}
        />
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

        <Suspense
          fallback={
            <PageSkeleton
              embedded
              variant="form"
              showTopBar={false}
              showHero={false}
            />
          }>
          {mode === 'quick' ? (
            <GameEditor
              initialQuestions={quickTemplateQuestions}
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
