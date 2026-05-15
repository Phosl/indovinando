'use client'

import styles from '../GameEditor/GameEditor.module.scss'

export default function GameStepsBreadcrumbs({
  steps,
  currentStep,
  onStepClick,
  isStep2Completed,
  isStep3Completed,
}) {
  return (
    <div className={styles.breadcrumbs}>
      {steps.map((step, index) => {
        const isDisabled =
          (step.id === 3 && !isStep2Completed) || (step.id === 4 && !isStep3Completed)

        return (
          <div key={step.id} className={styles.breadcrumbItem}>
            <button
              type="button"
              className={`${styles.breadcrumbButton} ${step.id === currentStep ? styles.active : ''} ${isDisabled ? styles.disabled : ''}`}
              onClick={() => !isDisabled && onStepClick(step.id)}
              disabled={isDisabled}>
              <span className={styles.breadcrumbNum}>{step.id}</span>
              {step.label}
            </button>
            {index < steps.length - 1 && <span className={styles.separator}>→</span>}
          </div>
        )
      })}
    </div>
  )
}
