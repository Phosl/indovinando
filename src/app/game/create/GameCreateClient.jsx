'use client'

import {Suspense, useMemo} from 'react'
import {useRouter} from 'next/navigation'
import GameEditor from '@/components/game/GameEditor'
import PageSkeleton from '@/components/PageSkeleton'
import OnboardingModal from '@/components/game/OnboardingModal'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {useT} from '@/lib/i18n/useT'
import useOnboardingPreference from '@/hooks/useOnboardingPreference'
import {disableCreateOnboarding} from '@/lib/profileOnboardingClient'
import {getQuickTemplateQuestions} from './autoTastingHelpers'
import AutomaticModeContainer from './AutomaticModeContainer'
import ModePickerScreen from './ModePickerScreen'

function CreateOnboardingModal({
  showOnboarding,
  onClose,
  onDisable,
  persistenceError,
  variant = 'modal',
  translationKey = 'onboarding',
}) {
  if (!showOnboarding) return null
  return (
    <OnboardingModal
      onClose={onClose}
      onDisable={onDisable}
      persistenceError={persistenceError}
      variant={variant}
      translationKey={translationKey}
    />
  )
}

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
  const onboarding = useOnboardingPreference({
    preference: mode === 'automatic' ? 'createAutomatic' : 'createOverview',
    userId,
    initiallyVisible: initialShowOnboarding,
    persistDisable: disableCreateOnboarding,
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

  if (mode === 'choose') {
    return (
      <>
        <CreateOnboardingModal
          showOnboarding={onboarding.isVisible}
          onClose={onboarding.close}
          onDisable={onboarding.disable}
          persistenceError={onboarding.persistenceError}
          variant="page"
        />
        <ModePickerScreen onPick={handlePickMode} onOpenGuide={onboarding.open} />
      </>
    )
  }

  if (mode === 'automatic') {
    return (
      <>
        <CreateOnboardingModal
          showOnboarding={onboarding.isVisible}
          onClose={onboarding.close}
          onDisable={onboarding.disable}
          persistenceError={onboarding.persistenceError}
          translationKey="automaticOnboarding"
        />
        <AutomaticModeContainer
          onBack={handleBackToModePicker}
          onOpenGuide={onboarding.open}
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
          showOnboarding={onboarding.isVisible}
          onClose={onboarding.close}
          onDisable={onboarding.disable}
          persistenceError={onboarding.persistenceError}
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
              automaticGuidesEnabled={
                onboarding.isReady && initialShowOnboarding && !onboarding.isDisabled
              }
              onDisableOnboarding={disableCreateOnboarding}
            />
          ) : (
            <GameEditor
              userId={userId}
              avatarOptions={avatarOptions}
              onBack={handleBackToModePicker}
              automaticGuidesEnabled={
                onboarding.isReady && initialShowOnboarding && !onboarding.isDisabled
              }
              onDisableOnboarding={disableCreateOnboarding}
            />
          )}
        </Suspense>
      </div>
    </main>
  )
}
