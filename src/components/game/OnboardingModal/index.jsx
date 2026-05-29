'use client'

import {useState} from 'react'
import styles from './OnboardingModal.module.scss'
import {useT} from '@/lib/i18n/useT'
import ProgressBar from '@/components/ui/ProgressBar'

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
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>

        <div className={styles.content}>
          <div className={styles.icon}>{currentStep.icon}</div>
          <h2>{currentStep.title}</h2>
          <p>{currentStep.description}</p>

          <div className={styles.stepIndicator}>
            {t('step')} {step} {t('of')} {steps.length}
          </div>
        </div>

        <ProgressBar
          value={(step / steps.length) * 100}
          variant="course"
          className={styles.progress}
          ariaLabel="Onboarding progress"
        />

        <div className={styles.buttons}>
          {!isFirstStep && (
            <button className="btn secondary" onClick={() => setStep(step - 1)}>
              {t('back')}
            </button>
          )}

          {onDisable && (
            <button className="btn secondary" onClick={onDisable}>
              {t('disable')}
            </button>
          )}

          {!isLastStep && (
            <button className="btn primary" onClick={() => setStep(step + 1)}>
              {t('next')}
            </button>
          )}
          {isLastStep && (
            <button className="btn primary" onClick={onClose}>
              {t('start')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
