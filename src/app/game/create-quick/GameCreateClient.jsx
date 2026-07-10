'use client'

import {useMemo, useState} from 'react'
import {createClient} from '@/lib/supabaseClient'
import GameEditor from '@/components/game/GameEditor'
import OnboardingModal from '@/components/game/OnboardingModal'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {useT} from '@/lib/i18n/useT'
import {getQuickTemplateQuestions} from '@/app/game/create/autoTastingHelpers'

const CREATE_ONBOARDING_STORAGE_KEY = 'hideCreateOnboarding'

export default function GameCreateClient({userId, initialShowOnboarding, avatarOptions = []}) {
  const t = useT('gameCreate')
  const {lang} = useLanguage()
  const supabase = createClient()
  const templateQuestions = useMemo(() => getQuickTemplateQuestions(t, lang), [lang, t])
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        initialShowOnboarding &&
        window.localStorage.getItem(CREATE_ONBOARDING_STORAGE_KEY) !== '1'
      )
    }
    return initialShowOnboarding
  })

  async function handleDisableOnboarding() {
    setShowOnboarding(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CREATE_ONBOARDING_STORAGE_KEY, '1')
    }

    if (!userId) {
      return
    }
    try {
      await supabase.from('profiles').update({onboarding: false}).eq('id', userId)
    } catch {}
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
        <GameEditor
          initialQuestions={templateQuestions}
          initialGameName="Indovinando"
          userId={userId}
          avatarOptions={avatarOptions}
          isQuickCreate={true}
        />
      </div>
    </main>
  )
}
