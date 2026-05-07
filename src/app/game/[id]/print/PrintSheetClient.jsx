'use client'

import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import styles from './print.module.scss'

export default function PrintSheetClient({gameId, hasResults}) {
  const router = useRouter()
  return (
    <TopBar
      title="Stampa Scheda"
      className={styles.toolbar}
      titleClassName={styles.toolbarTitle}
      actionsClassName={styles.toolbarActions}
      maxWidth="210mm"
      wrapTitle>
      {gameId && !hasResults && (
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
