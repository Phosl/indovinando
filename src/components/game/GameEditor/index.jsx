'use client'

// (rimosso: import duplicato)
// ...existing code...
// Modale introduttiva per lo step questionario
import modalStyles from './QuestionnaireIntroModal.module.scss'
import {Button} from '@/components/ui/Button'
function QuestionnaireIntroModal({isOpen, onClose, onDisable, isQuickCreate, questions}) {
  if (!isOpen) return null
  return (
    <div className={modalStyles.modalOverlay}>
      <div className={modalStyles.modalContent}>
        <h2 style={{marginBottom: 12}}>
          {isQuickCreate ? 'Questionario precompilato' : 'Crea il questionario'}
        </h2>
        <p style={{marginBottom: 16}}>
          {isQuickCreate
            ? 'Abbiamo preparato già il questionario con 5 domande. Puoi modificare le risposte a piacere.'
            : 'Adesso creiamo il questionario: aggiungi le domande e le risposte.'}
        </p>
        {isQuickCreate && questions?.length > 0 && (
          <div
            style={{
              textAlign: 'left',
              margin: '0 auto 16px',
              background: '#f7f7f7',
              borderRadius: 8,
              padding: 12,
            }}>
            <b>Domande predefinite:</b>
            <ul style={{margin: '8px 0 0 16px', padding: 0}}>
              {questions.map((q, i) => (
                <li key={i} style={{fontSize: 15}}>
                  {q.text || `Domanda ${i + 1}`}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className={modalStyles.buttonContainer}>
          <Button variant="success" onClick={onClose}>
            Ho capito
          </Button>

          <Button variant="neutral" size="small" textOnly onClick={onDisable}>
            Non mostrare più
          </Button>
        </div>
      </div>
    </div>
  )
}

function BottlesIntroModal({isOpen, onClose, onDisable}) {
  if (!isOpen) return null

  return (
    <div className={modalStyles.modalOverlay}>
      <div className={modalStyles.modalContent}>
        <h2 style={{marginBottom: 12}}>Aggiungi bottiglia</h2>
        <p style={{marginBottom: 16}}>
          Inserisci i dettagli della bottiglia, poi scegli il tipo vino e completa le risposte
          corrette per ogni domanda.
        </p>
        <div className={modalStyles.buttonContainer}>
          <Button variant="success" onClick={onClose}>
            Ho capito
          </Button>
          <Button variant="neutral" size="small" textOnly onClick={onDisable}>
            Non mostrare più
          </Button>
        </div>
      </div>
    </div>
  )
}

import {memo, useEffect, useState, useRef} from 'react'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'
import {createClient} from '@/lib/supabaseClient'
import QuestionsList from '../QuestionsList'
import QuestionModal from '../QuestionModal'
import GameStepsBreadcrumbs from '../GameStepsBreadcrumbs'
import BottlesList from '../BottlesList'
import BottleModal from '../BottleModal'
import TopBar from '@/components/TopBar'
import {validateGameName, validateQuestionnaire, validateBottleForm} from '../utils/validations'
import {
  MIN_STEP,
  MAX_STEP,
  DEFAULT_GAME_NAME,
  getAlertMessages,
  getGameEditorText,
  getSteps,
} from '../utils/constants'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import styles from './GameEditor.module.scss'

const SAVE_TIMEOUT_MS = 20000
const HARD_WATCHDOG_MS = 240000

/**
 * Normalize step value to ensure it's within valid range
 */
function normalizeStep(value) {
  const parsed = Number.parseInt(value, 10)

  if (Number.isNaN(parsed)) return MIN_STEP
  if (parsed < MIN_STEP) return MIN_STEP
  if (parsed > MAX_STEP) return MAX_STEP

  return parsed
}

function normalizeBottleYear(value) {
  return String(value ?? '')
    .trim()
    .slice(0, 4)
}

const StepOneSection = memo(function StepOneSection({
  editorText,
  gameName,
  onGameNameChange,
  avatarOptions,
  selectedAvatarIndex,
  onAvatarChange,
  onContinue,
}) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{editorText.step1Title}</h3>
      <input
        className={styles.inputField}
        placeholder={editorText.step1Placeholder}
        value={gameName}
        onChange={(e) => onGameNameChange(e.target.value)}
      />
      {avatarOptions.length > 0 && (
        <div className={styles.avatarPicker}>
          <p className={styles.avatarPickerTitle}>Scegli immagine degustazione</p>
          <div className={styles.avatarGrid}>
            {avatarOptions.map((avatarPath, avatarIndex) => (
              <button
                key={avatarPath}
                type="button"
                className={`${styles.avatarOption} ${
                  selectedAvatarIndex === avatarIndex ? styles.avatarOptionActive : ''
                }`}
                onClick={() => onAvatarChange(avatarIndex)}
                aria-pressed={selectedAvatarIndex === avatarIndex}>
                <img src={avatarPath} alt="" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.buttonRow}>
        <button className="btn success" onClick={onContinue}>
          {editorText.continue}
        </button>
      </div>
    </div>
  )
})

const StepTwoSection = memo(function StepTwoSection({
  editorText,
  questionDraft,
  onEditQuestion,
  onNewQuestion,
  onDeleteQuestion,
  onSaveQuestionnaire,
  onBack,
  onShowIntro,
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle} style={{margin: 0}}>
          {editorText.step2Title}
        </h3>
        <button
          type="button"
          aria-label="Guida questionario"
          onClick={onShowIntro}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1.5px solid #bbb',
            fontWeight: 700,
            fontSize: 18,
            color: '#555',
            transition: 'border-color 0.2s,color 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#888'
            e.currentTarget.style.color = '#222'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#bbb'
            e.currentTarget.style.color = '#555'
          }}>
          ?
        </button>
      </div>
      <QuestionsList
        questions={questionDraft}
        onEditQuestion={onEditQuestion}
        onNewQuestion={onNewQuestion}
        onDeleteQuestion={onDeleteQuestion}
      />

      <div className={styles.buttonRow}>
        <button
          className={`btn neutral ${styles.backArrowBtn}`}
          onClick={onBack}
          aria-label={editorText.back}
          title={editorText.back}>
          ←
        </button>
        <button
          className="btn success"
          onClick={onSaveQuestionnaire}
          disabled={questionDraft.length === 0}>
          {editorText.saveQuestionnaire}
        </button>
      </div>
    </div>
  )
})

const StepThreeSection = memo(function StepThreeSection({
  editorText,
  onInsertResults,
  onSaveAndPrint,
  isSaving,
  onBack,
}) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{editorText.bridgeTitle}</h3>
      <div className={styles.bridgeRow}>
        <button className="btn neutral" onClick={onSaveAndPrint} disabled={isSaving}>
          {isSaving ? editorText.saving : editorText.saveAndPrint}
        </button>
        <button className="btn success" onClick={onInsertResults}>
          {editorText.bridgeInsertResults}
        </button>
      </div>
      <div className={styles.buttonRow}>
        <button
          className={`btn neutral ${styles.backArrowBtn}`}
          onClick={onBack}
          aria-label={editorText.back}
          title={editorText.back}>
          ←
        </button>
      </div>
    </div>
  )
})

const StepFourSection = memo(function StepFourSection({
  editorText,
  bottles,
  questions,
  onEditBottle,
  onNewBottle,
  onDeleteBottle,
  onShowInfo,
  onBack,
  onPublish,
  isSaving,
  isEditMode,
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle} style={{margin: 0}}>
          {editorText.step4Title || 'Aggiungi bottiglia'}
        </h3>
        <button
          type="button"
          aria-label="Guida bottiglie"
          onClick={onShowInfo}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1.5px solid #bbb',
            fontWeight: 700,
            fontSize: 18,
            color: '#555',
            transition: 'border-color 0.2s,color 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#888'
            e.currentTarget.style.color = '#222'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#bbb'
            e.currentTarget.style.color = '#555'
          }}>
          ?
        </button>
      </div>
      <BottlesList
        bottles={bottles}
        questions={questions}
        onEditBottle={onEditBottle}
        onNewBottle={onNewBottle}
        onDeleteBottle={onDeleteBottle}
      />

      <div className={styles.buttonRow}>
        <button
          className={`btn secondary ${styles.backArrowBtn}`}
          onClick={onBack}
          aria-label={editorText.back}
          title={editorText.back}>
          ←
        </button>
        <button className="btn success" onClick={onPublish} disabled={isSaving}>
          {isSaving
            ? editorText.saving
            : isEditMode
              ? editorText.updateGame
              : editorText.publishGame}
        </button>
      </div>
    </div>
  )
})

export default function GameEditor({
  isEditMode = false,
  gameId,
  initialGame,
  initialQuestions = [],
  initialBottles = [],
  userId,
  onGameSaved,
  initialGameName,
  avatarOptions = [],
  isQuickCreate = false,
  onBack,
}) {
  const {lang} = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const startsAtStep2 = false
  const [step, setStep] = useState(() => (startsAtStep2 ? 2 : 1))

  const [gameName, setGameName] = useState(DEFAULT_GAME_NAME)
  const [questionDraft, setQuestionDraft] = useState([])
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(0)

  const [bottleName, setBottleName] = useState('')
  const [producer, setProducer] = useState('')
  const [year, setYear] = useState('')
  const [wineType, setWineType] = useState('')

  const [templateQuestions, setTemplateQuestions] = useState([])
  const [currentAnswers, setCurrentAnswers] = useState([])
  const [bottles, setBottles] = useState([])
  const [activeBottleIndex, setActiveBottleIndex] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  // Stato per la modale intro questionario
  const [showQuestionnaireIntro, setShowQuestionnaireIntro] = useState(false)
  const [showBottlesIntro, setShowBottlesIntro] = useState(false)
  // Mostra la modale intro solo la prima volta che si entra nello step 2, se non disabilitata
  useEffect(() => {
    if (step === 2) {
      const disabled = window?.localStorage?.getItem('hideQuestionnaireIntro') === '1'
      if (!disabled) setShowQuestionnaireIntro(true)
    } else {
      setShowQuestionnaireIntro(false)
    }
  }, [step])

  useEffect(() => {
    if (step === 4) {
      const disabled = window?.localStorage?.getItem('hideBottlesIntro') === '1'
      if (!disabled) setShowBottlesIntro(true)
    } else {
      setShowBottlesIntro(false)
    }
  }, [step])

  function handleDisableIntro() {
    window?.localStorage?.setItem('hideQuestionnaireIntro', '1')
    setShowQuestionnaireIntro(false)
  }

  function handleDisableBottlesIntro() {
    window?.localStorage?.setItem('hideBottlesIntro', '1')
    setShowBottlesIntro(false)
  }
  const [bottleModalResetToken, setBottleModalResetToken] = useState(0)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null)
  const [resolvedUserId, setResolvedUserId] = useState(userId)
  const [stepDirection, setStepDirection] = useState('forward')
  const savePhaseRef = useRef('idle')
  const initialStepOverrideRef = useRef(startsAtStep2 ? 2 : null)
  const pendingStepRef = useRef(null)
  const prevStepRef = useRef(startsAtStep2 ? 2 : 1)

  const editorText = getGameEditorText(lang)
  const alertMessages = getAlertMessages(lang)
  const steps = getSteps(lang)
  const saveTimeoutMessage =
    lang === 'en'
      ? 'Saving is taking too long. Please try again.'
      : 'Il salvataggio sta impiegando troppo tempo. Riprova.'

  async function withSaveTimeout(run, contextLabel, retries = 0, timeoutMs = SAVE_TIMEOUT_MS) {
    let attempt = 0

    while (attempt <= retries) {
      let timer
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${saveTimeoutMessage} (${contextLabel})`)),
          timeoutMs,
        )
      })

      try {
        const requestPromise = Promise.resolve().then(() =>
          typeof run === 'function' ? run() : run,
        )
        return await Promise.race([requestPromise, timeoutPromise])
      } catch (error) {
        attempt += 1
        const isTimeoutError =
          typeof error?.message === 'string' && error.message.startsWith(saveTimeoutMessage)

        if (!isTimeoutError || attempt > retries) {
          throw error
        }
      } finally {
        clearTimeout(timer)
      }
    }
  }

  function setSavePhase(phase) {
    savePhaseRef.current = phase
    console.debug('[GameEditor save phase]', phase)
  }

  // Track if initialization has already run to prevent resetting on deps change
  const initializationDoneRef = useRef(false)
  const avatarInitializedRef = useRef(false)

  // Initialize from props if in edit mode
  useEffect(() => {
    // Only initialize once in edit mode
    if (isEditMode && initialGame && !initializationDoneRef.current) {
      initializationDoneRef.current = true
      setGameName(initialGame.name || DEFAULT_GAME_NAME)

      // Load questions
      if (initialQuestions.length > 0) {
        const normalizedQuestions = initialQuestions
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          .map((q) => ({
            id: q.id,
            text: q.text,
            options: (q.game_question_options || [])
              .sort((opt) => opt.option_order)
              .map((opt) => opt.text),
          }))
        setQuestionDraft(normalizedQuestions)
        setTemplateQuestions(normalizedQuestions)
      }

      // Load bottles
      if (initialBottles.length > 0) {
        const normalizedBottles = initialBottles
          .sort((a, b) => (a.bottle_order || 0) - (b.bottle_order || 0))
          .map((b) => {
            const questionIdByIndex = new Map((initialQuestions || []).map((q, idx) => [q.id, idx]))
            const answers = (b.game_bottle_answers || []).map((ans) => {
              const qIdx = questionIdByIndex.get(ans.question_id)
              const optionIndexInQuestion = (initialQuestions || [])[
                qIdx
              ]?.game_question_options?.findIndex((opt) => opt.id === ans.option_id)
              return optionIndexInQuestion ?? null
            })
            return {
              id: b.id,
              name: b.name,
              producer: b.producer,
              year: b.year,
              wineType: b.wine_type || '',
              answers,
            }
          })
        setBottles(normalizedBottles)
      }

      // Step already initialized to 2 via useState — no override needed here
    } else if (isQuickCreate && !initializationDoneRef.current) {
      // Initialize for quick create mode
      initializationDoneRef.current = true
      if (initialGameName) {
        setGameName(initialGameName)
      }

      // Load template questions
      if (initialQuestions.length > 0) {
        const normalizedQuestions = initialQuestions.map((q) => ({
          id: q.id || `q-${Date.now()}-${Math.random()}`,
          text: q.text,
          options: q.options || [],
        }))
        setQuestionDraft(normalizedQuestions)
        setTemplateQuestions(normalizedQuestions)
      }

      // Step already initialized to 2 via useState — no override needed here
    }
  }, [isEditMode, initialGame, isQuickCreate, initialQuestions, initialGameName])

  useEffect(() => {
    if (avatarInitializedRef.current) return
    if (avatarOptions.length === 0) return

    const nextIndex =
      Number.isInteger(initialGame?.cover_index) && initialGame.cover_index >= 0
        ? Math.min(initialGame.cover_index, avatarOptions.length - 1)
        : 0
    setSelectedAvatarIndex(nextIndex)
    avatarInitializedRef.current = true
  }, [avatarOptions, initialGame?.cover_index])

  // Resolve userId if not provided (for create mode)
  useEffect(() => {
    if (!resolvedUserId) {
      supabase.auth.getSession().then(({data: {session}}) => {
        if (session?.user?.id) {
          setResolvedUserId(session.user.id)
        }
      })
    }
  }, [resolvedUserId, supabase])

  useEffect(() => {
    const rawStep = searchParams.get('step')
    // Initialization may set an override
    const override = initialStepOverrideRef.current
    const safeStep = override !== null ? override : normalizeStep(rawStep)
    initialStepOverrideRef.current = null

    // While URL params catch up after a click, keep optimistic step to avoid visual rollback.
    if (pendingStepRef.current !== null && safeStep !== pendingStepRef.current) {
      if (rawStep !== String(safeStep)) {
        router.replace(`${pathname}?step=${safeStep}`)
      }
      return
    }

    if (pendingStepRef.current === safeStep) {
      pendingStepRef.current = null
    }

    setStep((prev) => (prev === safeStep ? prev : safeStep))

    if (rawStep !== String(safeStep)) {
      router.replace(`${pathname}?step=${safeStep}`)
    }
  }, [pathname, router, searchParams])

  useEffect(() => {
    const prevStep = prevStepRef.current
    if (step !== prevStep) {
      setStepDirection(step > prevStep ? 'forward' : 'back')
      prevStepRef.current = step
    }
  }, [step])

  function goToStep(nextStep) {
    const safeStep = normalizeStep(String(nextStep))
    if (safeStep === step) return

    pendingStepRef.current = safeStep
    setStep(safeStep)
    router.push(`${pathname}?step=${safeStep}`)
  }

  function handleAddQuestion(question, editingIndex) {
    if (editingIndex === null || editingIndex === undefined) {
      setQuestionDraft((prev) => [...prev, question])
    } else {
      setQuestionDraft((prev) => {
        const updated = [...prev]
        const existing = updated[editingIndex]

        updated[editingIndex] = {
          ...question,
          id: existing?.id ?? question.id,
        }

        return updated
      })
    }

    // Chiudi il modale dopo aver salvato
    setIsQuestionModalOpen(false)
    setEditingQuestionIndex(null)
  }

  function openQuestionModal(index) {
    setEditingQuestionIndex(index)
    setIsQuestionModalOpen(true)
  }

  function closeQuestionModal() {
    setIsQuestionModalOpen(false)
    setEditingQuestionIndex(null)
  }

  function openNewQuestionModal() {
    setEditingQuestionIndex(null)
    setIsQuestionModalOpen(true)
  }

  function saveQuestionnaire() {
    try {
      validateQuestionnaire(questionDraft, alertMessages)
    } catch (error) {
      alert(error.message)
      return
    }

    // Se ci sono già bottiglie, riallinea le risposte in base alle domande aggiornate
    setBottles((prevBottles) => {
      if (prevBottles.length === 0) return prevBottles

      const oldIndexByQuestionId = new Map(templateQuestions.map((q, index) => [q.id, index]))

      return prevBottles.map((bottle) => {
        const nextAnswers = questionDraft.map((question) => {
          const oldIndex = oldIndexByQuestionId.get(question.id)

          if (oldIndex === undefined) return null

          const oldAnswer = bottle.answers?.[oldIndex]
          const isValidAnswer =
            Number.isInteger(oldAnswer) && oldAnswer >= 0 && oldAnswer < question.options.length

          return isValidAnswer ? oldAnswer : null
        })

        return {
          ...bottle,
          answers: nextAnswers,
        }
      })
    })

    // Sincronizza i template questions con questionDraft
    // Questo è cruciale per edit mode
    setTemplateQuestions(questionDraft)

    setCurrentAnswers((prev) => {
      const oldIndexByQuestionId = new Map(templateQuestions.map((q, index) => [q.id, index]))

      return questionDraft.map((question) => {
        const oldIndex = oldIndexByQuestionId.get(question.id)
        const oldAnswer = oldIndex === undefined ? null : prev?.[oldIndex]
        const isValidAnswer =
          Number.isInteger(oldAnswer) && oldAnswer >= 0 && oldAnswer < question.options.length

        return isValidAnswer ? oldAnswer : null
      })
    })

    if (bottles.length > 0) {
      alert(alertMessages.QUESTIONNAIRE_UPDATED)
    }

    goToStep(3)
  }

  async function saveGameForPrint() {
    if (isSaving) return

    try {
      validateGameName(gameName, alertMessages)
      validateQuestionnaire(templateQuestions, alertMessages)

      if (!resolvedUserId) {
        throw new Error(alertMessages.USER_NOT_AUTHENTICATED)
      }
    } catch (error) {
      alert(error.message)
      return
    }

    setIsSaving(true)

    try {
      setSavePhase('save-game-request')
      const routeMode = isEditMode ? 'edit' : 'create'
      const generatedGameId = gameId || crypto.randomUUID()

      const {id: savedGameId} = await withSaveTimeout(
        async () => {
          const response = await fetch('/api/game/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              mode: routeMode,
              gameId: generatedGameId,
              name: gameName.trim(),
              questions: templateQuestions,
              bottles: [],
              coverIndex: avatarOptions.length > 0 ? selectedAvatarIndex : null,
            }),
          })

          const payload = await response.json().catch(() => ({}))
          if (!response.ok) {
            throw new Error(payload?.error || alertMessages.GAME_SAVE_ERROR)
          }

          return payload
        },
        'save-game',
        1,
      )

      router.push(`/game/${savedGameId || generatedGameId}/print`)
    } catch (error) {
      alert(error.message || alertMessages.GAME_SAVE_ERROR)
    } finally {
      setIsSaving(false)
    }
  }

  function handleAnswerChange(questionIndex, optionIndex) {
    setCurrentAnswers((prev) => {
      const next = [...prev]
      next[questionIndex] = optionIndex
      return next
    })
  }

  function selectBottle(index) {
    const selected = bottles[index]
    if (!selected) return

    setActiveBottleIndex(index)
    setBottleName(selected.name ?? '')
    setProducer(selected.producer ?? '')
    setYear(selected.year ?? '')
    setWineType(selected.wineType ?? '')
    const normalizedAnswers = templateQuestions.map((question, qIndex) => {
      const candidate = selected.answers?.[qIndex]
      const isValid =
        Number.isInteger(candidate) && candidate >= 0 && candidate < question.options.length
      return isValid ? candidate : null
    })

    setCurrentAnswers(normalizedAnswers)
    setIsModalOpen(true)
  }

  function startNewBottle() {
    setActiveBottleIndex(null)
    setBottleName('')
    setProducer('')
    setYear('')
    setWineType('')
    setCurrentAnswers(Array(templateQuestions.length).fill(null))
    setIsModalOpen(true)
  }

  function concludeBottle(keepOpenForAnother = false) {
    try {
      validateBottleForm(
        bottleName,
        producer,
        year,
        wineType,
        currentAnswers,
        templateQuestions.length,
        alertMessages,
      )
    } catch (error) {
      alert(error.message)
      return
    }

    if (activeBottleIndex === null) {
      setBottles((prev) => [
        ...prev,
        {
          name: bottleName.trim(),
          producer: producer.trim(),
          year: year.trim(),
          wineType: wineType.trim(),
          answers: [...currentAnswers],
        },
      ])
    } else {
      setBottles((prev) => {
        const updated = [...prev]
        updated[activeBottleIndex] = {
          name: bottleName.trim(),
          producer: producer.trim(),
          year: year.trim(),
          wineType: wineType.trim(),
          answers: [...currentAnswers],
        }
        return updated
      })
    }

    const shouldKeepOpen = keepOpenForAnother && activeBottleIndex === null
    if (shouldKeepOpen) {
      setBottleModalResetToken((prev) => prev + 1)
    }

    setIsModalOpen(shouldKeepOpen)
    setActiveBottleIndex(null)
    setBottleName('')
    setProducer('')
    setYear('')
    setWineType('')
    setCurrentAnswers(Array(templateQuestions.length).fill(null))
  }

  function closeModal() {
    setIsModalOpen(false)
    setActiveBottleIndex(null)
    setBottleName('')
    setProducer('')
    setYear('')
    setWineType('')
    setCurrentAnswers(Array(templateQuestions.length).fill(null))
  }

  function deleteQuestion(index) {
    setQuestionDraft((prev) => prev.filter((_, i) => i !== index))
    // Se ci sono bottiglie, rimuovi le risposte della domanda eliminata
    if (bottles.length > 0) {
      setBottles((prevBottles) =>
        prevBottles.map((bottle) => ({
          ...bottle,
          answers: bottle.answers.filter((_, i) => i !== index),
        })),
      )
    }
  }

  function deleteBottle(index) {
    setBottles((prev) => prev.filter((_, i) => i !== index))
  }

  let stepContent = null

  if (step === 1) {
    stepContent = (
      <StepOneSection
        editorText={editorText}
        gameName={gameName}
        onGameNameChange={setGameName}
        avatarOptions={avatarOptions}
        selectedAvatarIndex={selectedAvatarIndex}
        onAvatarChange={setSelectedAvatarIndex}
        onContinue={() => goToStep(2)}
      />
    )
  } else if (step === 2) {
    stepContent = (
      <StepTwoSection
        editorText={editorText}
        questionDraft={questionDraft}
        onEditQuestion={openQuestionModal}
        onNewQuestion={openNewQuestionModal}
        onDeleteQuestion={deleteQuestion}
        onSaveQuestionnaire={saveQuestionnaire}
        onBack={() => goToStep(1)}
        onShowIntro={() => setShowQuestionnaireIntro(true)}
      />
    )
  } else if (step === 3) {
    stepContent = (
      <StepThreeSection
        editorText={editorText}
        onInsertResults={() => goToStep(4)}
        onSaveAndPrint={saveGameForPrint}
        isSaving={isSaving}
        onBack={() => goToStep(2)}
      />
    )
  } else if (step === 4) {
    stepContent = (
      <StepFourSection
        editorText={editorText}
        bottles={bottles}
        questions={templateQuestions}
        onEditBottle={selectBottle}
        onNewBottle={startNewBottle}
        onDeleteBottle={deleteBottle}
        onShowInfo={() => setShowBottlesIntro(true)}
        onBack={() => goToStep(3)}
        onPublish={publishGame}
        isSaving={isSaving}
        isEditMode={isEditMode}
      />
    )
  }

  async function publishGame() {
    if (isSaving) return

    try {
      validateGameName(gameName, alertMessages)
      validateQuestionnaire(templateQuestions, alertMessages)

      if (!resolvedUserId) {
        throw new Error(alertMessages.USER_NOT_AUTHENTICATED)
      }
    } catch (error) {
      alert(error.message)
      return
    }

    setIsSaving(true)
    setSavePhase('start-publish-game')

    const hardWatchdog = setTimeout(() => {
      setIsSaving(false)
      alert(`${saveTimeoutMessage} (${savePhaseRef.current || 'unknown-step'})`)
    }, HARD_WATCHDOG_MS)

    try {
      const desiredGameName = gameName.trim()
      const nextStatus = bottles.length > 0 ? 'published' : 'draft'
      setSavePhase('prepare-payloads')
      const routeMode = isEditMode ? 'edit' : 'create'
      const generatedGameId = gameId || crypto.randomUUID()

      setSavePhase('save-game-request')
      const {id: savedGameId} = await withSaveTimeout(
        async () => {
          const response = await fetch('/api/game/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              mode: routeMode,
              gameId: generatedGameId,
              name: desiredGameName,
              questions: templateQuestions,
              bottles,
              status: nextStatus,
              coverIndex: avatarOptions.length > 0 ? selectedAvatarIndex : null,
            }),
          })

          const payload = await response.json().catch(() => ({}))
          if (!response.ok) {
            throw new Error(payload?.error || alertMessages.GAME_SAVE_ERROR)
          }

          return payload
        },
        'save-game',
        1,
      )

      alert(isEditMode ? alertMessages.GAME_UPDATED_SUCCESS : alertMessages.GAME_SAVED_SUCCESS)

      if (isEditMode) {
        setSavePhase('redirect-edit')
        if (onGameSaved) {
          Promise.resolve(onGameSaved(gameId)).catch(() => {})
        }
        router.push(`/game/${savedGameId || generatedGameId}`)
      } else {
        setSavePhase('redirect-create')
        router.push('/miei-giochi')
      }
    } catch (error) {
      const baseError = error.message || alertMessages.GAME_SAVE_ERROR
      alert(`${baseError} (${savePhaseRef.current || 'unknown-step'})`)
    } finally {
      clearTimeout(hardWatchdog)
      setSavePhase('idle')
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.editor}>
      <TopBar
        title={isEditMode ? editorText.topBarEdit : editorText.topBarCreate}
        onBack={() => {
          if (onBack) return onBack()
          router.push(isEditMode && gameId ? `/game/${gameId}` : '/dashboard')
        }}></TopBar>
      <GameStepsBreadcrumbs
        steps={steps}
        currentStep={step}
        onStepClick={goToStep}
        isStep2Completed={templateQuestions.length > 0}
        isStep3Completed={templateQuestions.length > 0}
      />
      {stepContent && (
        <div
          key={step}
          className={`${styles.stepFrame} ${
            stepDirection === 'back' ? styles.stepEnterBack : styles.stepEnterForward
          }`}>
          {stepContent}
        </div>
      )}

      {/* Modale intro questionario */}
      <QuestionnaireIntroModal
        isOpen={showQuestionnaireIntro}
        onClose={() => setShowQuestionnaireIntro(false)}
        onDisable={handleDisableIntro}
        isQuickCreate={isQuickCreate}
        questions={questionDraft}
      />
      <BottlesIntroModal
        isOpen={showBottlesIntro}
        onClose={() => setShowBottlesIntro(false)}
        onDisable={handleDisableBottlesIntro}
      />

      <BottleModal
        isOpen={isModalOpen}
        resetToken={bottleModalResetToken}
        bottleIndex={activeBottleIndex}
        bottleName={bottleName}
        producer={producer}
        year={year}
        wineType={wineType}
        questions={templateQuestions}
        currentAnswers={currentAnswers}
        onBottleNameChange={setBottleName}
        onProducerChange={setProducer}
        onYearChange={setYear}
        onWineTypeChange={setWineType}
        onAnswerChange={handleAnswerChange}
        onSave={concludeBottle}
        onSaveAndAddAnother={() => concludeBottle(true)}
        onCancel={closeModal}
      />

      <QuestionModal
        isOpen={isQuestionModalOpen}
        questionIndex={editingQuestionIndex}
        question={editingQuestionIndex !== null ? questionDraft[editingQuestionIndex] : null}
        onSave={handleAddQuestion}
        onCancel={closeQuestionModal}
      />
    </div>
  )
}
