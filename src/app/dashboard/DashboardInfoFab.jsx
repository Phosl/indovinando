'use client'

import {useState} from 'react'
import InfoModal from '@/components/InfoModal'
import Link from 'next/link'
import styles from './dashboard.module.scss'

export default function DashboardInfoFab({
  changelogLabel,
  copyrightLabel,
  dashboardDict,
  appVersion,
}) {
  const [infoOpen, setInfoOpen] = useState(false)
  return (
    <>
      <div className={styles.legalLinks}>
        <button type="button" className={styles.smallLegalBtn} onClick={() => setInfoOpen(true)}>
          Info
        </button>
        <h4>
          {dashboardDict.versionLabel || 'Versione BETA'} {appVersion}
        </h4>
      </div>
      <InfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} title="Informazioni">
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
