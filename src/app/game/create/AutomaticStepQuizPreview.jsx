'use client'

import {AutoTastingGamePreview} from '@/components/game'
import styles from './gameCreate.module.scss'

export default function AutomaticStepQuizPreview({
  quizPreview,
  quizTemplateMode,
  setQuizTemplateMode,
  t,
}) {
  return (
    <>
      <h1 className={styles.autoModeTitleCentered}>{t('automaticPreviewTitle')}</h1>
      <section className={styles.autoPreviewPageCard}>
        <div className={styles.autoPreviewPageHeader}>
          <div className={styles.autoPreviewModalTemplateRow}>
            <span className={styles.autoModeQuizTemplateLabel}>
              {t('automaticQuizTemplateLabel')}
            </span>
            <div className={styles.autoModeQuizTemplateSegmented}>
              <button
                type="button"
                className={`${styles.autoModeQuizTemplateButton} ${
                  quizTemplateMode === 'openai' ? styles.autoModeQuizTemplateButtonActive : ''
                }`}
                onClick={() => setQuizTemplateMode('openai')}>
                {t('automaticQuizTemplateOpenAi')}
              </button>
              <button
                type="button"
                className={`${styles.autoModeQuizTemplateButton} ${
                  quizTemplateMode === 'standard' ? styles.autoModeQuizTemplateButtonActive : ''
                }`}
                onClick={() => setQuizTemplateMode('standard')}>
                {t('automaticQuizTemplateStandard')}
              </button>
            </div>
          </div>
        </div>

        {quizPreview ? (
          <div className={styles.autoPreviewPageBody}>
            <AutoTastingGamePreview
              preview={quizPreview}
              labels={{
                sliderAria: t('automaticPreviewBottles'),
                bottles: t('automaticPreviewBottles'),
                bottle: t('automaticPreviewBottleLabel'),
                of: t('automaticPreviewOf'),
                question: t('automaticPreviewQuestionLabel'),
                questionLabel: t('automaticPreviewQuestionLabel'),
                producerMissing: t('automaticPreviewProducerMissing'),
                yearMissing: t('automaticPreviewYearMissing'),
                unnamedBottle: t('automaticPreviewUnnamedBottle'),
                loadingBottle: t('automaticPreviewLoadingBottle'),
              }}
            />
          </div>
        ) : null}
      </section>
    </>
  )
}
