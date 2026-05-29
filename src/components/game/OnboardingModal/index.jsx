'use client'

import {useState} from 'react'
import styles from './OnboardingModal.module.scss'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {pickLangText} from '@/lib/i18n/dictionaries'
import ProgressBar from '@/components/ui/ProgressBar'

const ONBOARDING_DICTIONARY = {
  it: {
    step: 'Passo',
    of: 'di',
    back: '← Indietro',
    disable: 'Non mostrare più',
    next: 'Avanti →',
    start: 'Inizia! 🚀',
    steps: [
      {
        title: '🎮 Benvenuto!',
        description: 'Stai per creare un incredibile gioco per scoprire il vino con i tuoi amici.',
        icon: '🎮',
      },
      {
        title: '❓ Passo 1: Crea il Questionario',
        description:
          'Aggiungi domande e opzioni di risposta. Ad esempio: "Quale vino è questo?" con diverse opzioni.',
        icon: '❓',
      },
      {
        title: '🍷 Passo 2: Aggiungi le Bottiglie',
        description:
          'Per ogni domanda, seleziona la risposta corretta e aggiungi i dettagli della bottiglia (nome, produttore, anno).',
        icon: '🍷',
      },
      {
        title: '👥 Passo 3: Invita gli Amici',
        description:
          'Una volta finito, pubblica il gioco e invita i tuoi amici a partecipare! Loro cercheranno di indovinare le risposte corrette.',
        icon: '👥',
      },
      {
        title: '🎉 Iniziamo!',
        description: 'Sei pronto? Clicca "Inizia" per cominciare a creare il tuo gioco.',
        icon: '🎉',
      },
    ],
  },
  en: {
    step: 'Step',
    of: 'of',
    back: '← Back',
    disable: 'Do not show again',
    next: 'Next →',
    start: 'Start! 🚀',
    steps: [
      {
        title: '🎮 Welcome!',
        description: 'You are about to create an amazing wine game for your friends.',
        icon: '🎮',
      },
      {
        title: '❓ Step 1: Create the Quiz',
        description:
          'Add questions and answer options. Example: "Which wine is this?" with different options.',
        icon: '❓',
      },
      {
        title: '🍷 Step 2: Add Bottles',
        description:
          'For each question, select the correct answer and add bottle details (name, producer, year).',
        icon: '🍷',
      },
      {
        title: '👥 Step 3: Invite Friends',
        description:
          'Once done, publish the game and invite your friends to play! They will try to guess the right answers.',
        icon: '👥',
      },
      {
        title: "🎉 Let's begin!",
        description: 'Ready? Click "Start" to begin creating your game.',
        icon: '🎉',
      },
    ],
  },
}

/**
 * OnboardingModal component - displays onboarding information for game creation
 * @param {Function} onClose - Callback when closing the modal
 * @param {Function} onDisable - Callback when user disables onboarding
 */
export default function OnboardingModal({onClose, onDisable}) {
  const [step, setStep] = useState(1)
  const {lang} = useLanguage()
  const d = pickLangText(lang, ONBOARDING_DICTIONARY)
  const steps = d.steps

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
            {d.step} {step} {d.of} {steps.length}
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
              {d.back}
            </button>
          )}

          {onDisable && (
            <button className="btn secondary" onClick={onDisable}>
              {d.disable}
            </button>
          )}

          {!isLastStep && (
            <button className="btn primary" onClick={() => setStep(step + 1)}>
              {d.next}
            </button>
          )}
          {isLastStep && (
            <button className="btn primary" onClick={onClose}>
              {d.start}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
