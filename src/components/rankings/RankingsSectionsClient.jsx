'use client'

import Link from 'next/link'
import {useMemo, useState} from 'react'
import InfoModal from '@/components/InfoModal'
import Icon from '@/components/Icon'
import styles from '@/app/classifiche/rankings.module.scss'

const SECTION_ICON_BY_ID = {
  blind: '/icons/match.svg',
  qualityPrice: '/icons/dollar.svg',
  surprising: '/icons/bottle.svg',
  divisive: '/icons/bolt.svg',
}

export default function RankingsSectionsClient({sections = [], text = {}}) {
  const [openSectionId, setOpenSectionId] = useState(null)

  const activeSection = useMemo(
    () => sections.find((section) => section.id === openSectionId) || null,
    [openSectionId, sections],
  )

  const metricText = useMemo(() => text.metrics?.[openSectionId] || null, [openSectionId, text])

  return (
    <>
      <section className={styles.sectionsGrid}>
        {sections.map((section) => (
          <article key={section.id} className={styles.sectionCard}>
            <div className={styles.sectionHeader}> 
              <div className={styles.sectionHeadingWrap}>
                <div className={styles.sectionTitleRow}>
                  <h2 className={styles.sectionTitle}>
                    <Icon
                      src={SECTION_ICON_BY_ID[section.id] || '/icons/quiz.svg'}
                      size={20}
                      className={styles.sectionTitleIcon}
                    />
                    <span>{text.sections?.[section.id] || section.id}</span>
                  </h2>
                  <button
                    type="button"
                    className={styles.sectionInfoBtn}
                    onClick={() => setOpenSectionId(section.id)}
                    aria-label={text.metricInfoLabel || 'Informazioni metrica'}>
                    ?
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.rankingList}>
              {section.items.map((item, index) => {
                const content = (
                  <>
                    <div className={styles.rankIndex}>{index + 1}</div>
                    <div className={styles.rankingContent}>
                      <h3>{item.name}</h3>
                      <p className={styles.rankingMeta}>
                        {item.producer} · {item.region}
                      </p>
                    </div>
                  </>
                )

                return item.wineGroupKey ? (
                  <Link
                    key={item.id}
                    href={`/classifiche/${encodeURIComponent(item.wineGroupKey)}`}
                    className={`${styles.rankingItem} ${styles.rankingItemLink}`}>
                    {content}
                  </Link>
                ) : (
                  <div key={item.id} className={styles.rankingItem}>
                    {content}
                  </div>
                )
              })}
            </div>
          </article>
        ))}
      </section>

      <InfoModal
        isOpen={!!activeSection}
        onClose={() => setOpenSectionId(null)}
        title={text.sections?.[activeSection?.id] || text.modalTitle || 'Metrica'}>
        <p>{metricText?.description || text.metricFallback || 'Spiegazione metrica non disponibile.'}</p>
        {metricText?.formula ? <p>{metricText.formula}</p> : null}
      </InfoModal>
    </>
  )
}
