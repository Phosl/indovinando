'use client'

import {useMemo, useState} from 'react'
import InfoModal from '@/components/InfoModal'
import styles from '@/app/classifiche/rankings.module.scss'

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
                  <h2>
                    <span>{section.emoji}</span> {text.sections?.[section.id] || section.id}
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
              {section.items.map((item, index) => (
                <div key={item.id} className={styles.rankingItem}>
                  <div className={styles.rankIndex}>{index + 1}</div>
                  <div className={styles.rankingContent}>
                    <h3>{item.name}</h3>
                    <p className={styles.rankingMeta}>
                      {item.producer} · {item.region}
                    </p>
                  </div>
                </div>
              ))}
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
