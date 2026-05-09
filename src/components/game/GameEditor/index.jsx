'use client'

import {useEffect, useState, useRef} from 'react'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'
import {createClient} from '@/lib/supabaseClient'
import QuestionsList from '../QuestionsList'
import QuestionModal from '../QuestionModal'
import GameStepsBreadcrumbs from '../GameStepsBreadcrumbs'
import BottlesList from '../BottlesList'
import BottleModal from '../BottleModal'
import TopBar from '@/components/TopBar'
import {
  validateGameName,
  validateQuestionnaire,
  validateBottles,
  validateBottleForm,
} from '../utils/validations'
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

export default function GameEditor({
  isEditMode = false,
  gameId,
  initialGame,
  initialQuestions = [],
  initialBottles = [],
  userId,
  onGameSaved,
  initialGameName,
  isQuickCreate = false,
}) {
  const {lang} = useLanguage()
  const isEnglish = lang === 'en'
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [step, setStep] = useState(1)

  const [gameName, setGameName] = useState(DEFAULT_GAME_NAME)
  const [questionDraft, setQuestionDraft] = useState([])

  const [bottleName, setBottleName] = useState('')
  const [producer, setProducer] = useState('')
  const [year, setYear] = useState('')

  const [templateQuestions, setTemplateQuestions] = useState([])
  const [currentAnswers, setCurrentAnswers] = useState([])
  const [bottles, setBottles] = useState([])
  const [activeBottleIndex, setActiveBottleIndex] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null)
  const [resolvedUserId, setResolvedUserId] = useState(userId)

  const editorText = getGameEditorText(lang)
  const alertMessages = getAlertMessages(lang)
  const steps = getSteps(lang)

  // Track if initialization has already run to prevent resetting on deps change
  const initializationDoneRef = useRef(false)

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
              answers,
            }
          })
        setBottles(normalizedBottles)
      }

      // Skip step 1 in edit mode
      setStep(2)
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

      // Skip step 1 and go to step 2
      setStep(2)
    }
  }, [isEditMode, initialGame, isQuickCreate, initialQuestions, initialGameName])

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
    const safeStep = normalizeStep(rawStep)

    setStep((prev) => (prev === safeStep ? prev : safeStep))

    if (rawStep !== String(safeStep)) {
      router.replace(`${pathname}?step=${safeStep}`)
    }
  }, [pathname, router, searchParams])

  function goToStep(nextStep) {
    const safeStep = normalizeStep(String(nextStep))
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
      let currentGameId = gameId

      if (!isEditMode) {
        const {data: gameInsert, error: gameError} = await supabase
          .from('games')
          .insert({
            name: gameName.trim(),
            created_by: resolvedUserId,
            status: 'published',
          })
          .select('id')
          .single()

        if (gameError || !gameInsert?.id)
          throw new Error(gameError?.message || alertMessages.CREATE_GAME_ERROR)

        currentGameId = gameInsert.id
      }

      const questionsToInsert = templateQuestions.map((question, index) => ({
        game_id: currentGameId,
        text: question.text,
        display_order: index,
      }))

      const {data: insertedQuestions, error: questionsError} = await supabase
        .from('game_questions')
        .insert(questionsToInsert)
        .select('id, display_order')

      if (questionsError || !insertedQuestions?.length) {
        throw new Error(questionsError?.message || alertMessages.SAVE_QUESTIONS_ERROR)
      }

      const questionIdByOrder = new Map(insertedQuestions.map((row) => [row.display_order, row.id]))

      const optionsToInsert = templateQuestions.flatMap((question, qIndex) => {
        const questionId = questionIdByOrder.get(qIndex)
        return question.options.map((optionText, oIndex) => ({
          question_id: questionId,
          text: optionText,
          option_order: oIndex,
        }))
      })

      const {error: optionsError} = await supabase
        .from('game_question_options')
        .insert(optionsToInsert)

      if (optionsError) {
        throw new Error(optionsError?.message || alertMessages.SAVE_OPTIONS_ERROR)
      }

      router.push(`/game/${currentGameId}/print`)
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
    setCurrentAnswers(Array(templateQuestions.length).fill(null))
    setIsModalOpen(true)
  }

  function concludeBottle() {
    try {
      validateBottleForm(
        bottleName,
        producer,
        year,
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
          answers: [...currentAnswers],
        }
        return updated
      })
    }

    setIsModalOpen(false)
    setActiveBottleIndex(null)
    setBottleName('')
    setProducer('')
    setYear('')
    setCurrentAnswers(Array(templateQuestions.length).fill(null))
  }

  function closeModal() {
    setIsModalOpen(false)
    setActiveBottleIndex(null)
    setBottleName('')
    setProducer('')
    setYear('')
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

  async function publishGame() {
    if (isSaving) return

    try {
      validateGameName(gameName, alertMessages)
      validateQuestionnaire(templateQuestions, alertMessages)
      validateBottles(bottles, templateQuestions, alertMessages)

      if (!resolvedUserId) {
        throw new Error(alertMessages.USER_NOT_AUTHENTICATED)
      }
    } catch (error) {
      alert(error.message)
      return
    }

    setIsSaving(true)

    try {
      let currentGameId = gameId

      if (isEditMode) {
        // Update game name
        const {error: gameUpdateError} = await supabase
          .from('games')
          .update({name: gameName.trim()})
          .eq('id', currentGameId)

        if (gameUpdateError) throw gameUpdateError
      } else {
        // Create new game
        const {data: gameInsert, error: gameError} = await supabase
          .from('games')
          .insert({
            name: gameName.trim(),
            created_by: resolvedUserId,
            status: 'published',
          })
          .select('id')
          .single()

        if (gameError || !gameInsert?.id)
          throw new Error(gameError?.message || alertMessages.CREATE_GAME_ERROR)

        currentGameId = gameInsert.id
      }

      // Delete old data in edit mode
      if (isEditMode) {
        await supabase.from('game_bottle_answers').delete().eq('game_id', currentGameId)
        // this will cascade-delete bottles' answers
        await supabase.from('game_bottles').delete().eq('game_id', currentGameId)
        await supabase.from('game_question_options').delete().eq('game_id', currentGameId)
        // this will cascade-delete question options
        await supabase.from('game_questions').delete().eq('game_id', currentGameId)
      }

      const questionsToInsert = templateQuestions.map((question, index) => ({
        game_id: currentGameId,
        text: question.text,
        display_order: index,
      }))

      const {data: insertedQuestions, error: questionsError} = await supabase
        .from('game_questions')
        .insert(questionsToInsert)
        .select('id, display_order')

      if (questionsError || !insertedQuestions?.length) {
        throw new Error(questionsError?.message || alertMessages.SAVE_QUESTIONS_ERROR)
      }

      const questionIdByOrder = new Map(insertedQuestions.map((row) => [row.display_order, row.id]))

      const optionsToInsert = templateQuestions.flatMap((question, qIndex) => {
        const questionId = questionIdByOrder.get(qIndex)
        return question.options.map((optionText, oIndex) => ({
          question_id: questionId,
          text: optionText,
          option_order: oIndex,
        }))
      })

      const {data: insertedOptions, error: optionsError} = await supabase
        .from('game_question_options')
        .insert(optionsToInsert)
        .select('id, question_id, option_order')

      if (optionsError || !insertedOptions?.length) {
        throw new Error(optionsError?.message || alertMessages.SAVE_OPTIONS_ERROR)
      }

      const optionIdByQuestionAndOrder = new Map(
        insertedOptions.map((row) => [`${row.question_id}-${row.option_order}`, row.id]),
      )

      const bottlesToInsert = bottles.map((bottle, index) => ({
        game_id: currentGameId,
        name: bottle.name,
        producer: bottle.producer,
        year: bottle.year,
        bottle_order: index,
      }))

      const {data: insertedBottles, error: bottlesError} = await supabase
        .from('game_bottles')
        .insert(bottlesToInsert)
        .select('id, bottle_order')

      if (bottlesError || !insertedBottles?.length) {
        throw new Error(bottlesError?.message || alertMessages.SAVE_BOTTLES_ERROR)
      }

      const bottleIdByOrder = new Map(insertedBottles.map((row) => [row.bottle_order, row.id]))

      const answersToInsert = bottles.flatMap((bottle, bottleIndex) => {
        const bottleId = bottleIdByOrder.get(bottleIndex)

        return bottle.answers.map((selectedOptionOrder, questionOrder) => {
          const questionId = questionIdByOrder.get(questionOrder)
          const optionId = optionIdByQuestionAndOrder.get(`${questionId}-${selectedOptionOrder}`)

          return {
            bottle_id: bottleId,
            question_id: questionId,
            option_id: optionId,
          }
        })
      })

      const {error: answersError} = await supabase
        .from('game_bottle_answers')
        .insert(answersToInsert)

      if (answersError) {
        throw new Error(answersError?.message || alertMessages.SAVE_BOTTLE_ANSWERS_ERROR)
      }

      alert(isEditMode ? alertMessages.GAME_UPDATED_SUCCESS : alertMessages.GAME_SAVED_SUCCESS)

      if (isEditMode) {
        if (onGameSaved) {
          await onGameSaved(gameId)
        }
        // Force a hard reload to get fresh data from server
        window.location.href = `/game/${gameId}`
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      alert(error.message || alertMessages.GAME_SAVE_ERROR)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.editor}>
      <TopBar title={isEditMode ? editorText.topBarEdit : editorText.topBarCreate}>
        <button
          type="button"
          className="btn secondary"
          onClick={() => router.push(isEditMode && gameId ? `/game/${gameId}` : '/dashboard')}
          style={{order: -1}}>
          ← {isEnglish ? 'Back' : 'Indietro'}
        </button>
      </TopBar>
      <GameStepsBreadcrumbs
        steps={steps}
        currentStep={step}
        onStepClick={goToStep}
        isStep2Completed={templateQuestions.length > 0}
        isStep3Completed={templateQuestions.length > 0}
      />

      {/* STEP 1 */}
      {step === 1 && (
        <div className={styles.section}>
          <input
            className={styles.inputField}
            placeholder={editorText.step1Placeholder}
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
          />

          <div className={styles.buttonRow}>
            <button className="btn primary" onClick={() => goToStep(2)}>
              {editorText.continue}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className={styles.section}>
          <QuestionsList
            questions={questionDraft}
            onEditQuestion={openQuestionModal}
            onNewQuestion={openNewQuestionModal}
            onDeleteQuestion={deleteQuestion}
          />

          <div className={styles.buttonRow}>
            <button
              className="btn primary"
              onClick={saveQuestionnaire}
              disabled={questionDraft.length === 0}>
              {editorText.saveQuestionnaire}
            </button>
            <button className="btn secondary" onClick={() => goToStep(1)}>
              {editorText.back}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Bridge */}
      {step === 3 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{editorText.bridgeTitle}</h3>
          <div className={styles.bridgeRow}>
            <button className="btn primary" onClick={() => goToStep(4)}>
              {editorText.bridgeInsertResults}
            </button>
            <button className="btn secondary" onClick={saveGameForPrint} disabled={isSaving}>
              {isSaving ? editorText.saving : editorText.saveAndPrint}
            </button>
          </div>
          <div className={styles.buttonRow}>
            <button className="btn secondary" onClick={() => goToStep(2)}>
              {editorText.back}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 — Bottiglie */}
      {step === 4 && (
        <div className={styles.section}>
          <BottlesList
            bottles={bottles}
            questions={templateQuestions}
            onEditBottle={selectBottle}
            onNewBottle={startNewBottle}
            onDeleteBottle={deleteBottle}
          />

          <div className={styles.buttonRow}>
            <button className="btn secondary" onClick={() => goToStep(3)}>
              {editorText.back}
            </button>
            {bottles.length > 0 && (
              <button className="btn primary" onClick={publishGame} disabled={isSaving}>
                {isSaving ? editorText.saving : editorText.publishGame}
              </button>
            )}
          </div>
        </div>
      )}

      <BottleModal
        isOpen={isModalOpen}
        bottleIndex={activeBottleIndex}
        bottleName={bottleName}
        producer={producer}
        year={year}
        questions={templateQuestions}
        currentAnswers={currentAnswers}
        onBottleNameChange={setBottleName}
        onProducerChange={setProducer}
        onYearChange={setYear}
        onAnswerChange={handleAnswerChange}
        onSave={concludeBottle}
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
