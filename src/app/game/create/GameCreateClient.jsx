'use client'

import {Suspense, useState} from 'react'
import {createClient} from '@/lib/supabaseClient'
import GameEditor from '@/components/game/GameEditor'
import OnboardingModal from '@/components/game/OnboardingModal'

function GameEditorWrapper() {
  return <GameEditor />
}

export default function GameCreateClient({initialShowOnboarding, userId}) {
  const supabase = createClient()
  const [showOnboarding, setShowOnboarding] = useState(initialShowOnboarding)

  async function handleDisableOnboarding() {
    if (!userId) {
      setShowOnboarding(false)
      return
    }

    await supabase.from('profiles').update({onboarding: false}).eq('id', userId)
    setShowOnboarding(false)
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

        <Suspense fallback={<div>Caricamento...</div>}>
          <GameEditorWrapper />
        </Suspense>
      </div>
    </main>
  )
}
