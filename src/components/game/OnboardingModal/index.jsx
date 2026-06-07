'use client'

import {useState} from 'react'
import {createPortal} from 'react-dom'
import styles from './OnboardingModal.module.scss'
import {useT} from '@/lib/i18n/useT'
import Icon from '@/components/Icon'
import ModalCloseButton from '@/components/ui/ModalCloseButton'

/**
 * OnboardingModal component - displays onboarding information for game creation
 * @param {Function} onClose - Callback when closing the modal
 * @param {Function} onDisable - Callback when user disables onboarding
 * @param {'modal'|'page'} variant - Presentation variant
 */
export default function OnboardingModal({onClose, onDisable, variant = 'modal'}) {
  const [step, setStep] = useState(1)
  const t = useT('onboarding')
  const steps = t('steps')

  const currentStep = steps[step - 1]
  const isLastStep = step === steps.length
  const isFirstStep = step === 1
  const isPage = variant === 'page'
  const overlayClassName = `${styles.overlay} ${isPage ? styles.overlayPage : ''}`.trim()
  const modalClassName = `${styles.modal} ${isPage ? styles.modalPage : ''}`.trim()

  if (typeof document === 'undefined') return null

  const content = (
    <div className={overlayClassName} onClick={isPage ? undefined : onClose}>
      <div
        className={modalClassName}
        onClick={isPage ? undefined : (e) => e.stopPropagation()}>
        <ModalCloseButton className={styles.closeBtn} onClick={onClose} />

        <div className={styles.topProgress}>
          <div className={styles.stepIndicator}>
            {t('step')} {step} {t('of')} {steps.length}
          </div>
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
            <button className={styles.disableBtn} onClick={onDisable} type="button">
              <Icon name="removeSmall" size={18} />
              {t('disable')}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
