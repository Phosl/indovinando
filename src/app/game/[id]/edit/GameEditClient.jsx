'use client'

import {Suspense} from 'react'
import GameEditor from '@/components/game/GameEditor'
import Loader from '@/components/Loader'

export default function GameEditClient({
  gameId,
  initialGame,
  initialQuestions,
  initialBottles,
  userId,
  onGameSaved,
}) {
  return (
    <main className="flex-container">
      <div className="flex-column">
        <Suspense fallback={<Loader label="Caricamento editor" />}>
          <GameEditor
            isEditMode={true}
            gameId={gameId}
            initialGame={initialGame}
            initialQuestions={initialQuestions}
            initialBottles={initialBottles}
            userId={userId}
            onGameSaved={onGameSaved}
          />
        </Suspense>
      </div>
    </main>
  )
}
