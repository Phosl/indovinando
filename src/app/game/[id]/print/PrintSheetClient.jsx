'use client'

import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import styles from './print.module.scss'

export default function PrintSheetClient({gameId, hasResults}) {
  const router = useRouter()
  const {lang} = useLanguage()
  const isEnglish = lang === 'en'

  return (
    <TopBar
      title={isEnglish ? 'Print Card' : 'Stampa Card'}
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
          {isEnglish ? 'Add results' : 'Inserisci risultati'}
        </button>
      )}
      <button type="button" className="btn primary" onClick={() => window.print()}>
        {isEnglish ? 'Print' : 'Stampa'}
      </button>
    </TopBar>
  )
}

