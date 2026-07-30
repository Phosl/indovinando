'use client'

import {useEffect, useId, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import styles from './OnboardingModal.module.scss'
import {useT} from '@/lib/i18n/useT'
import Icon from '@/components/Icon'
import ModalCloseButton from '@/components/ui/ModalCloseButton'
import {Button} from '@/components/ui/Button'

/**
 * Shared onboarding surface for multi-step and contextual guides.
 */
export default function OnboardingModal({
  onClose,
  onDisable,
  variant = 'modal',
  translationKey = 'onboarding',
  steps: providedSteps,
  labels = {},
  eyebrow,
  finishLabel,
  disableLabel,
  disableHint,
  renderStepContent,
  actions,
  isDisabling = false,
  persistenceError = false,
}) {
  const [step, setStep] = useState(1)
  const t = useT(translationKey)
  const modalRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  const translatedSteps = t('steps')
  const steps = Array.isArray(providedSteps)
    ? providedSteps
    : Array.isArray(translatedSteps)
      ? translatedSteps
      : []

  const currentStep = steps[step - 1]
  const isLastStep = step === steps.length
  const isFirstStep = step === 1
  const isPage = variant === 'page'
  const hasMultipleSteps = steps.length > 1
  const overlayClassName = `${styles.overlay} ${isPage ? styles.overlayPage : ''}`.trim()
  const modalClassName = `${styles.modal} ${isPage ? styles.modalPage : ''}`.trim()
  const copy = {
    eyebrow: labels.eyebrow || eyebrow || t('eyebrow'),
    step: labels.step || t('step'),
    of: labels.of || t('of'),
    back: labels.back || t('back'),
    next: labels.next || t('next'),
    start: labels.start || finishLabel || t('start'),
    disable: labels.disable || disableLabel || t('disable'),
    disabling: labels.disabling || t('disabling'),
    disableHint: labels.disableHint || disableHint || t('disableHint'),
    persistenceError: labels.persistenceError || t('persistenceError'),
  }

  useEffect(() => {
    const previousActiveElement = document.activeElement
    const previousOverflow = document.body.style.overflow
    const focusTimer = window.requestAnimationFrame(() => modalRef.current?.focus())

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!isDisabling) onClose()
        return
      }

      if (event.key !== 'Tab' || !modalRef.current) return

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )

      if (focusableElements.length === 0) {
        event.preventDefault()
        modalRef.current.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (
        event.shiftKey &&
        (document.activeElement === firstElement || document.activeElement === modalRef.current)
      ) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(focusTimer)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      previousActiveElement?.focus?.()
    }
  }, [isDisabling, onClose])

  if (typeof document === 'undefined' || !currentStep) return null

  const content = (
    <div
      className={overlayClassName}
      onClick={
        isPage
          ? undefined
          : (event) => {
              if (!isDisabling && event.target === event.currentTarget) onClose()
            }
      }>
      <div
        ref={modalRef}
        className={modalClassName}
        role="dialog"
        aria-modal="true"
        aria-busy={isDisabling}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}>
        <div className={styles.header}>
          <div className={styles.headerCopy}>
            {copy.eyebrow ? <span className={styles.eyebrow}>{copy.eyebrow}</span> : null}
            {hasMultipleSteps ? (
              <span className={styles.stepIndicator}>
                {copy.step} {step} {copy.of} {steps.length}
              </span>
            ) : null}
          </div>
          <ModalCloseButton
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isDisabling}
          />
        </div>

        {hasMultipleSteps ? (
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label={`${copy.step} ${step} ${copy.of} ${steps.length}`}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={step}>
            <span
              className={styles.progressFill}
              style={{width: `${(step / steps.length) * 100}%`}}
            />
          </div>
        ) : null}

        <div className={styles.body}>
          <div className={styles.content} aria-live="polite">
            {currentStep.icon ? (
              <div className={styles.iconFrame} aria-hidden="true">
                <span>{currentStep.icon}</span>
              </div>
            ) : null}
            <h2 id={titleId}>{currentStep.title}</h2>
            <p id={descriptionId}>{currentStep.description}</p>
            {renderStepContent ? (
              <div className={styles.extraContent}>
                {renderStepContent(currentStep, step - 1)}
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.footer}>
          {actions ? (
            <div className={`${styles.primaryActions} ${styles.customActions}`}>{actions}</div>
          ) : (
            <div
              className={`${styles.primaryActions} ${
                hasMultipleSteps ? '' : styles.primaryActionsSingle
              }`}>
              {hasMultipleSteps ? (
                <Button
                  variant="neutral"
                  className={styles.backBtn}
                  onClick={() => setStep((current) => Math.max(1, current - 1))}
                  disabled={isFirstStep || isDisabling}
                  aria-label={copy.back}
                  type="button">
                  <Icon name="back" size={22} />
                  <span>{copy.back}</span>
                </Button>
              ) : null}

              <Button
                variant="primary-filled"
                className={styles.nextBtn}
                onClick={
                  isLastStep
                    ? onClose
                    : () => setStep((current) => Math.min(steps.length, current + 1))
                }
                disabled={isDisabling}
                type="button">
                {isLastStep ? copy.start : copy.next}
              </Button>
            </div>
          )}

          {onDisable ? (
            <div className={styles.preference}>
              <Button
                variant="ghost"
                size="small"
                className={styles.disableBtn}
                onClick={onDisable}
                disabled={isDisabling}
                aria-busy={isDisabling}
                type="button">
                {isDisabling ? copy.disabling : copy.disable}
              </Button>
              {copy.disableHint ? <p>{copy.disableHint}</p> : null}
              {persistenceError ? (
                <p className={styles.preferenceError} role="alert">
                  {copy.persistenceError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
