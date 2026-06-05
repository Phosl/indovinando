'use client'

import {useState} from 'react'
import InfoModal from '@/components/InfoModal'
import Link from 'next/link'
import {useT} from '@/lib/i18n/useT'
import styles from './AuthEntryClient.module.scss'

export default function AuthInfoFab({changelogLabel, copyrightLabel}) {
  const [infoOpen, setInfoOpen] = useState(false)
  const t = useT('auth')
  return (
    <>
      <div className={styles.legalLinks}>
        <button
          type="button"
          className="btn neutral btn-mini"
          style={{marginTop: 0, marginBottom: 0}}
          onClick={() => setInfoOpen(true)}>
          {t('infoButton')}
        </button>
      </div>
      <InfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} title={t('infoTitle')}>
        <ul className={styles.infoModalList}>
          <li>
            <Link href="/changelog" onClick={() => setInfoOpen(false)}>
              {changelogLabel}
            </Link>
          </li>
          <li>
            <Link href="/copyright" onClick={() => setInfoOpen(false)}>
              {copyrightLabel}
            </Link>
          </li>
        </ul>
      </InfoModal>
    </>
  )
}
