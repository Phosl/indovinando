'use client'

import {useState} from 'react'
import {createClient} from '@/lib/supabaseClient'
import GameEditor from '@/components/game/GameEditor'
import OnboardingModal from '@/components/game/OnboardingModal'

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

export default function GameCreateClient({userId, initialShowOnboarding}) {
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
        <GameEditor
          initialQuestions={TEMPLATE_QUESTIONS}
          initialGameName="Indovinando"
          userId={userId}
          isQuickCreate={true}
        />
      </div>
    </main>
  )
}
