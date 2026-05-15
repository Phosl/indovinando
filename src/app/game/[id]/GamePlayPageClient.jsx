'use client'

import Link from 'next/link'
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
    playLive: 'Gioca Live',
    printCard: 'Stampa Card',
    edit: 'Modifica',
    delete: 'Elimina',
  },
  en: {
    deleteConfirm: 'Are you sure you want to delete this game? It cannot be recovered.',
    playLive: 'Play Live',
    printCard: 'Print Card',
    edit: 'Edit',
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
        <TopBar title={`🎮 ${game.name}`} onBack={() => router.push('/miei-giochi')} />

        <div className={styles.actionsBar}>
          <Link href={`/game/${game.id}/print`} className={`btn secondary ${styles.actionBtn}`}>
            🖨️ {t.printCard}
          </Link>
          {isOwner && (
            <Link href={`/game/${game.id}/edit`} className={`btn secondary ${styles.actionBtn}`}>
              ✏️ {t.edit}
            </Link>
          )}
        </div>

        <GamePlayView game={game} questions={questions} bottles={bottles} />

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
