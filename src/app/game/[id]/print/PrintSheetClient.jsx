'use client'

import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'

export default function PrintSheetClient({gameId}) {
  const router = useRouter()
  return (
    <TopBar title="Stampa Scheda">
      {gameId && (
        <button
          type="button"
          className="btn secondary"
          onClick={() => router.push(`/game/${gameId}?step=4`)}>
          Inserisci risultati
        </button>
      )}
      <button type="button" className="btn primary" onClick={() => window.print()}>
        Stampa
      </button>
    </TopBar>
  )
}
