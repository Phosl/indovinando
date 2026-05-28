'use client'

import {useRouter} from 'next/navigation'
import {useState} from 'react'
import GamePlayView from '@/components/game/GamePlayView'
import TopBar from '@/components/TopBar'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {pickLangText} from '@/lib/i18n/dictionaries'
import styles from './GamePlayPage.module.scss'

const GAME_PLAY_PAGE_DICTIONARY = {
  it: {
    deleteConfirm: 'Sei sicuro di voler eliminare questo gioco? Non sara recuperabile.',
    delete: 'Elimina',
  },
  en: {
    deleteConfirm: 'Are you sure you want to delete this game? It cannot be recovered.',
    delete: 'Delete',
  },
}

export default function GamePlayPageClient({game, questions, bottles, isOwner, onDelete}) {
  const router = useRouter()
  const {lang} = useLanguage()
  const t = pickLangText(lang, GAME_PLAY_PAGE_DICTIONARY)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    const message = t.deleteConfirm
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
        <TopBar title={`${game.name}`} onBack={() => router.push('/miei-giochi')} />

        <GamePlayView game={game} questions={questions} bottles={bottles} isOwner={isOwner} />

        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`${styles.dangerAction} ${isDeleting ? styles.disabledAction : ''}`}>
            {isDeleting ? '...' : `${t.delete}`}
          </button>
        )}

      </div>
    </main>
  )
}
