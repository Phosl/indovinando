'use client'

import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import {useT} from '@/lib/i18n/useT'
import styles from './print.module.scss'

export default function PrintSheetClient({gameId, hasResults}) {
  const router = useRouter()
  const t = useT('printSheet')

  return (
    <>
      <TopBar
        title={t('title')}
        className={styles.toolbar}
        titleClassName={styles.toolbarTitle}
        maxWidth="210mm"
        onBack={() => router.push(`/game/${gameId}`)}
      />

      <div className={styles.actionBar}>
        {gameId && !hasResults && (
          <button
            type="button"
            className="btn secondary"
            onClick={() => router.push(`/game/${gameId}?step=4`)}>
            {t('addResults')}
          </button>
        )}
        <button type="button" className="btn primary" onClick={() => window.print()}>
          {t('print')}
        </button>
      </div>
    </>
  )
}
