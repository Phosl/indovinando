'use client'

import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useState} from 'react'
import GamePlayView from '@/components/game/GamePlayView'
import TopBar from '@/components/TopBar'
import styles from './GamePlayPage.module.css'

export default function GamePlayPageClient({
  game,
  questions,
  bottles,
  isOwner,
  onToggleStatus,
  onDelete,
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleToggleStatus = async () => {
    const nextStatus = game.status === 'published' ? 'draft' : 'published'
    await onToggleStatus(game.id, nextStatus)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare questo gioco? Non sarà recuperabile.')) {
      return
    }
    setIsDeleting(true)
    try {
      await onDelete(game.id)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className="flex-container">
      <div className="flex-column" style={{width: '100%'}}>
        <TopBar title={game.name}>
          <a href={`/game/${game.id}/live`} className="btn primary">
            Gioca Live
          </a>
          <a href={`/game/${game.id}/print`} className="btn secondary">
            Stampa Scheda
          </a>
          {isOwner && (
            <>
              <Link href={`/game/${game.id}/edit`} className="btn secondary">
                Modifica
              </Link>
              <button
                onClick={handleToggleStatus}
                className={`btn ${game.status === 'published' ? 'secondary' : 'primary'}`}>
                {game.status === 'published' ? 'Bozza' : 'Pubblica'}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`${styles.dangerAction} ${isDeleting ? styles.disabledAction : ''}`}>
                {isDeleting ? '...' : 'Elimina'}
              </button>
            </>
          )}
        </TopBar>

        <GamePlayView game={game} questions={questions} bottles={bottles} />
      </div>
    </main>
  )
}
