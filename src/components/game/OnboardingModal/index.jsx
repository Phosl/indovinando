'use client'

import {useState} from 'react'
import styles from './OnboardingModal.module.scss'
import {useT} from '@/lib/i18n/useT'
import ProgressBar from '@/components/ui/ProgressBar'
import Icon from '@/components/Icon'
import ModalCloseButton from '@/components/ui/ModalCloseButton'

/**
 * OnboardingModal component - displays onboarding information for game creation
 * @param {Function} onClose - Callback when closing the modal
 * @param {Function} onDisable - Callback when user disables onboarding
 */
export default function OnboardingModal({onClose, onDisable}) {
  const [step, setStep] = useState(1)
  const t = useT('onboarding')
  const steps = t('steps')

  const currentStep = steps[step - 1]
  const isLastStep = step === steps.length
  const isFirstStep = step === 1

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <ModalCloseButton className={styles.closeBtn} onClick={onClose} />

        <div className={styles.topProgress}>
          <div className={styles.stepIndicator}>
            {t('step')} {step} {t('of')} {steps.length}
          </div>
          {/* <ProgressBar
            value={(step / steps.length) * 100}
            variant="course"
            className={styles.progress}
            ariaLabel="Onboarding progress"
          /> */}
        </div>

        <div className={styles.content}>
          <h2>{currentStep.title}</h2>
          <p>{currentStep.description}</p>
        </div>

        <div className={styles.buttons}>
          <div className={styles.primaryActions}>
            {!isFirstStep && (
              <button className={`btn neutral ${styles.backBtn}`} onClick={() => setStep(step - 1)}>
                <Icon name="back" size={24} />
              </button>
            )}

            {!isLastStep && (
              <button
                className={`btn success-filled ${styles.nextBtn}`}
                onClick={() => setStep(step + 1)}>
                {t('next')}
              </button>
            )}
            {isLastStep && (
              <button className={`btn success-filled ${styles.nextBtn}`} onClick={onClose}>
                {t('start')}
              </button>
            )}
          </div>

          {onDisable && (
            <button className={`btn btn-only-text`} onClick={onDisable}>
              {t('disable')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
