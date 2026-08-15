'use client'

import {useLanguage} from '@/components/i18n/LanguageProvider'
import {useT} from '@/lib/i18n/useT'
import {
  GuideBusinessSection,
  GuideCreationSection,
  GuideCreditsSection,
  GuideFinalCta,
  GuideHero,
  GuideLearningSection,
  GuidePresentationSection,
  GuideTastingSection,
  GuideVideoSection,
} from './GuideSections'
import styles from './info.module.scss'

export default function InfoClient() {
  const t = useT('info')
  const commonT = useT('common')
  const {lang} = useLanguage()
  const videoLanguage = lang === 'en' ? 'en' : 'it'

  return (
    <main className={styles.page}>
      <GuideHero t={t} />

      <div className={styles.content}>
        <GuidePresentationSection t={t} commonT={commonT} />
        <GuideVideoSection t={t} language={videoLanguage} />
        <GuideTastingSection t={t} />
        <GuideCreationSection t={t} />
        <GuideCreditsSection t={t} />
        <GuideLearningSection t={t} />
        <GuideBusinessSection t={t} />
        <GuideFinalCta t={t} />
      </div>
    </main>
  )
}
