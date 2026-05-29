'use client'

import GameEditor from '@/components/game/GameEditor'

export default function GameEditClient({
  gameId,
  initialGame,
  initialQuestions,
  initialBottles,
  avatarOptions,
  userId,
  onGameSaved,
}) {
  return (
    <main className="flex-container">
      <div className="flex-column">
        <GameEditor
          isEditMode={true}
          gameId={gameId}
          initialGame={initialGame}
          initialQuestions={initialQuestions}
          initialBottles={initialBottles}
          avatarOptions={avatarOptions}
          userId={userId}
          onGameSaved={onGameSaved}
        />
      </div>
    </main>
  )
}
