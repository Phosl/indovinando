import {useState} from 'react'
import {DndContext, PointerSensor, closestCenter, useSensor, useSensors} from '@dnd-kit/core'
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import {isNeutralQuestion, isPlayerRatingQuestion, isQuestionComplete} from '../utils/validations'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {getQuestionsListText} from '../utils/constants'
import Icon from '@/components/Icon'
import styles from './QuestionsList.module.scss'

function QuestionCard({
  question,
  index,
  text,
  isQuickCreate,
  onEditQuestion,
  onDeleteQuestion,
  onRequestDeleteQuestion,
  dragHandleProps,
  dragHandleRef,
  cardRef,
  cardStyle,
  isDragging = false,
  isOverlay = false,
}) {
  const isComplete = isQuestionComplete(question)
  const isPlayerRating = isPlayerRatingQuestion(question)
  const isNeutral = isNeutralQuestion(question)
  const isLockedInQuickCreate = isQuickCreate && isPlayerRating
  const optionsPreview = (question.options || []).slice(0, 4)

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      className={`${styles.card} ${isComplete ? styles.complete : styles.incomplete} ${
        isDragging ? styles.dragging : ''
      } ${isOverlay ? styles.overlayCard : ''}`}
      onClick={() => {
        if (isOverlay) return
        if (isLockedInQuickCreate) return
        onEditQuestion(index)
      }}>
      <button
        type="button"
        ref={dragHandleRef}
        className={styles.cardRail}
        onClick={(event) => event.stopPropagation()}
        aria-label={text.reorder}
        title={text.reorder}
        {...dragHandleProps}>
        <div className={styles.questionIndex}>{index + 1}</div>
        <div className={styles.dragHandle}>
          <Icon name="drag" size={20} className={styles.dragIcon} />
        </div>
      </button>
      <div className={styles.cardInfo}>
        <div className={styles.cardHeader}>
          <h4 className={styles.questionText}>{question.text}</h4>
          <div className={styles.cardActions}>
            {isLockedInQuickCreate ? <span className={styles.lockedBadge}>{text.lockedPlayer}</span> : null}
            {isNeutral ? <span className={styles.lockedBadge}>{text.lockedNeutral}</span> : null}
            {!isLockedInQuickCreate ? (
              <button
                type="button"
                className={styles.iconActionBtn}
                aria-label={text.delete}
                title={text.delete}
                onClick={(e) => {
                  e.stopPropagation()
                  if (onRequestDeleteQuestion) {
                    onRequestDeleteQuestion(index)
                    return
                  }
                  onDeleteQuestion(index)
                }}>
                <Icon name="bucket" size={20} className={styles.deleteIcon} />
              </button>
            ) : null}
          </div>
        </div>
        <p className={styles.optionsCount}>
          {isPlayerRating
            ? text.playerAnswerFree
            : isNeutral
              ? text.neutralNoCorrectAnswer
              : (question.options?.length || 0) + ' ' + text.options}
        </p>
        <div className={styles.optionsText}>
          {isPlayerRating ? (
            <p>{text.sliderPreview}</p>
          ) : isNeutral ? (
            <p>{text.playerVisibleOptions}</p>
          ) : (
            optionsPreview.map((o, i) => <p key={i}>{typeof o === 'string' ? o : o.text}</p>)
          )}
        </div>
      </div>
    </div>
  )
}

function SortableQuestionCard(props) {
  const {question} = props
  const {attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging} = useSortable({
    id: question.id,
  })

  return (
    <QuestionCard
      {...props}
      cardRef={setNodeRef}
      cardStyle={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      dragHandleRef={setActivatorNodeRef}
      dragHandleProps={{...attributes, ...listeners}}
      isDragging={isDragging}
    />
  )
}

export default function QuestionsList({
  questions,
  onEditQuestion,
  onNewQuestion,
  onDeleteQuestion,
  onRequestDeleteQuestion,
  onReorderQuestions,
  isQuickCreate = false,
}) {
  const {lang} = useLanguage()
  const text = getQuestionsListText(lang)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className="btn tertiary" onClick={onNewQuestion}>
          <Icon name="plus" size={24} /> <span>{text.add}</span>
        </button>
      </div>

      {questions.length === 0 ? (
        <p className={styles.emptyState}>{text.empty}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          autoScroll={false}
          onDragCancel={() => {}}
          onDragEnd={({active, over}) => {
            onReorderQuestions?.(active?.id, over?.id)
          }}>
          <SortableContext
            items={questions.map((question) => question.id)}
            strategy={verticalListSortingStrategy}>
            <div className={styles.grid}>
              {questions.map((question, index) => (
                <SortableQuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  text={text}
                  isQuickCreate={isQuickCreate}
                  onEditQuestion={onEditQuestion}
                  onDeleteQuestion={onDeleteQuestion}
                  onRequestDeleteQuestion={onRequestDeleteQuestion}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
