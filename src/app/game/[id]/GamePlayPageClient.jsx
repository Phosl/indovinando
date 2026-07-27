'use client'

import {useRouter} from 'next/navigation'
import {useState} from 'react'
import GamePlayView from '@/components/game/GamePlayView'
import InfoModal from '@/components/InfoModal'
import {useT} from '@/lib/i18n/useT'
import styles from './GamePlayPage.module.scss'

export default function GamePlayPageClient({
  game,
  questions,
  bottles,
  historySessions,
  avatarOptions,
  isOwner,
  tableLiveEvent,
  branding,
  onDelete,
}) {
  const router = useRouter()
  const t = useT('gamePlayPage')
  const tc = useT('common')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError('')
    try {
      const result = await onDelete(game.id)
      if (!result?.ok) {
        setDeleteError(result?.error || t('deleteError'))
        return
      }
      setDeleteModalOpen(false)
      router.replace('/miei-giochi?toast=game-deleted')
      router.refresh()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className="flex-container">
      <div className="flex-column" style={{width: '100%', maxWidth: 960, margin: '0 auto'}}>
        <GamePlayView
          game={game}
          questions={questions}
          bottles={bottles}
          historySessions={historySessions}
          avatarOptions={avatarOptions}
          isOwner={isOwner}
          tableLiveEvent={tableLiveEvent}
          branding={branding}
        />

        {isOwner && (
          <>
            <button
              onClick={() => {
                setDeleteError('')
                setDeleteModalOpen(true)
              }}
              disabled={isDeleting}
              className={`btn btn-small danger ${isDeleting ? 'disabled' : ''}`}>
              {t('delete')}
            </button>
            {deleteError ? <p className={styles.deleteError}>{deleteError}</p> : null}
          </>
        )}
      </div>
      <InfoModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) setDeleteModalOpen(false)
        }}
        title={t('deleteModalTitle')}
        disableClose={isDeleting}>
        <p className={styles.deleteModalText}>{t('deleteConfirm')}</p>
        {deleteError ? <p className={styles.deleteError}>{deleteError}</p> : null}
        <div className={styles.deleteModalActions}>
          <button
            type="button"
            className="btn warning"
            disabled={isDeleting}
            onClick={() => setDeleteModalOpen(false)}>
            {tc('cancel')}
          </button>
          <button
            type="button"
            className={`btn danger ${isDeleting ? 'disabled' : ''}`}
            disabled={isDeleting}
            onClick={handleDelete}>
            {isDeleting ? t('deleting') : t('delete')}
          </button>
        </div>
      </InfoModal>
    </main>
  )
}
