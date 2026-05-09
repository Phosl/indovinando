'use client'

import {useState} from 'react'
import styles from './OnboardingModal.module.scss'
import {useLanguage} from '@/components/i18n/LanguageProvider'

/**
 * OnboardingModal component - displays onboarding information for game creation
 * @param {Function} onClose - Callback when closing the modal
 * @param {Function} onDisable - Callback when user disables onboarding
 */
export default function OnboardingModal({onClose, onDisable}) {
  const [step, setStep] = useState(1)
  const {lang} = useLanguage()
  const isEnglish = lang === 'en'

  const steps = isEnglish
    ? [
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
      ]
    : [
        {
          title: '🎮 Benvenuto!',
          description:
            'Stai per creare un incredibile gioco per scoprire il vino con i tuoi amici.',
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
      ]

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
            {isEnglish ? 'Step' : 'Passo'} {step} {isEnglish ? 'of' : 'di'} {steps.length}
          </div>
        </div>

        <div className={styles.progress}>
          <div className={styles.progressBar} style={{width: `${(step / steps.length) * 100}%`}} />
        </div>

        <div className={styles.buttons}>
          {!isFirstStep && (
            <button className="btn secondary" onClick={() => setStep(step - 1)}>
              {isEnglish ? '← Back' : '← Indietro'}
            </button>
          )}

          {onDisable && (
            <button className="btn secondary" onClick={onDisable}>
              {isEnglish ? 'Do not show again' : 'Non mostrare più'}
            </button>
          )}

          {!isLastStep && (
            <button className="btn primary" onClick={() => setStep(step + 1)}>
              {isEnglish ? 'Next →' : 'Avanti →'}
            </button>
          )}
          {isLastStep && (
            <button className="btn primary" onClick={onClose}>
              {isEnglish ? 'Start! 🚀' : 'Inizia! 🚀'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
