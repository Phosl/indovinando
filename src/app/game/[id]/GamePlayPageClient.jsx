'use client'

import {useRouter} from 'next/navigation'
import {useState} from 'react'
import GamePlayView from '@/components/game/GamePlayView'
import TopBar from '@/components/TopBar'
import {useT} from '@/lib/i18n/useT'
import styles from './GamePlayPage.module.scss'

export default function GamePlayPageClient({
  game,
  questions,
  bottles,
  historySessions,
  avatarOptions,
  isOwner,
  onDelete,
}) {
  const router = useRouter()
  const t = useT('gamePlayPage')
  const tc = useT('common')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDelete = async () => {
    const message = t('deleteConfirm')
    if (!window.confirm(message)) {
      return
    }
    setIsDeleting(true)
    setDeleteError('')
    try {
      const result = await onDelete(game.id)
      if (!result?.ok) {
        setDeleteError(result?.error || t('deleteError'))
        return
      }
      router.push('/miei-giochi')
      router.refresh()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className="flex-container">
      <div className="flex-column" style={{width: '100%', maxWidth: 960, margin: '0 auto'}}>
        <TopBar title={t('title')} onBack={() => router.push('/miei-giochi')} />

        <GamePlayView
          game={game}
          questions={questions}
          bottles={bottles}
          historySessions={historySessions}
          avatarOptions={avatarOptions}
          isOwner={isOwner}
        />

        {isOwner && (
          <>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`btn btn-small danger ${isDeleting ? 'disabled' : ''}`}>
              {isDeleting ? '...' : t('delete')}
            </button>
            {deleteError ? <p className={styles.deleteError}>{deleteError}</p> : null}
          </>
        )}
      </div>
    </main>
  )
}
