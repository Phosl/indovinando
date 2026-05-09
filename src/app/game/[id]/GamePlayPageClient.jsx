'use client'

import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useState} from 'react'
import GamePlayView from '@/components/game/GamePlayView'
import TopBar from '@/components/TopBar'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import styles from './GamePlayPage.module.css'

export default function GamePlayPageClient({game, questions, bottles, isOwner, onDelete}) {
  const router = useRouter()
  const {lang} = useLanguage()
  const isEnglish = lang === 'en'
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    const message = isEnglish 
      ? 'Are you sure you want to delete this game? It cannot be recovered.' 
      : 'Sei sicuro di voler eliminare questo gioco? Non sarà recuperabile.'
    if (!window.confirm(message)) {
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
      <div className="flex-column" style={{width: '100%', maxWidth: 960, margin: '0 auto'}}>
        <TopBar>
          <a href={`/game/${game.id}/live`} className="btn primary">
            {isEnglish ? 'Play Live' : 'Gioca Live'}
          </a>
          <a href={`/game/${game.id}/print`} className="btn secondary">
            {isEnglish ? 'Print Card' : 'Stampa Card'}
          </a>
          {isOwner && (
            <>
              <Link href={`/game/${game.id}/edit`} className="btn secondary">
                {isEnglish ? 'Edit' : 'Modifica'}
              </Link>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`${styles.dangerAction} ${isDeleting ? styles.disabledAction : ''}`}>
                {isDeleting ? '...' : isEnglish ? 'Delete' : 'Elimina'}
              </button>
            </>
          )}
        </TopBar>

        <GamePlayView game={game} questions={questions} bottles={bottles} />
      </div>
    </main>
  )
}
