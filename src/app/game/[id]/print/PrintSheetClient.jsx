'use client'

import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {pickLangText} from '@/lib/i18n/dictionaries'
import styles from './print.module.scss'

const PRINT_SHEET_DICTIONARY = {
  it: {
    title: 'Stampa Card',
    addResults: 'Inserisci risultati',
    print: 'Stampa',
  },
  en: {
    title: 'Print Card',
    addResults: 'Add results',
    print: 'Print',
  },
}

export default function PrintSheetClient({gameId, hasResults}) {
  const router = useRouter()
  const {lang} = useLanguage()
  const t = pickLangText(lang, PRINT_SHEET_DICTIONARY)

  return (
    <TopBar
      title={t.title}
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
          {t.addResults}
        </button>
      )}
      <button type="button" className="btn primary" onClick={() => window.print()}>
        {t.print}
      </button>
    </TopBar>
  )
}
