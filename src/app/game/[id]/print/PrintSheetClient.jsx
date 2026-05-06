'use client'

import {useRouter} from 'next/navigation'
import styles from './print.module.scss'

export default function PrintSheetClient({gameId}) {
  const router = useRouter()
  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className={styles.toolbarAction}>
        ← Dashboard
      </button>
      {gameId && (
        <button
          type="button"
          onClick={() => router.push(`/game/${gameId}?step=4`)}
          className={styles.toolbarAction}>
          Inserisci risultati
        </button>
      )}
      <button type="button" onClick={() => window.print()} className={styles.printAction}>
        Stampa
      </button>
    </div>
  )
}
