import {useState} from 'react'
import Image from 'next/image'
import {DndContext, PointerSensor, closestCenter, useSensor, useSensors} from '@dnd-kit/core'
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import {isBottleComplete} from '../utils/validations'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {getBottlesListText} from '../utils/constants'
import Icon from '@/components/Icon'
import styles from './BottlesList.module.scss'

function BottleCard({
  bottle,
  index,
  questions,
  text,
  onEditBottle,
  onDeleteBottle,
  onRequestDeleteBottle,
  dragHandleProps,
  dragHandleRef,
  cardRef,
  cardStyle,
  isDragging = false,
  isOverlay = false,
}) {
  const isComplete = isBottleComplete(bottle, questions)

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      className={`${styles.card} ${isComplete ? styles.complete : styles.incomplete} ${
        isDragging ? styles.dragging : ''
      } ${isOverlay ? styles.overlayCard : ''}`}
      onClick={() => {
        if (isOverlay) return
        onEditBottle(index)
      }}>
      <button
        type="button"
        ref={dragHandleRef}
        className={styles.cardRail}
        onClick={(event) => event.stopPropagation()}
        aria-label={text.reorder}
        title={text.reorder}
        {...dragHandleProps}>
        <div className={styles.bottleIndex}>{index + 1}</div>
        <div className={styles.dragHandle}>
          <Icon name="drag" size={20} className={styles.dragIcon} />
        </div>
      </button>
      <div className={styles.cardInfo}>
        <div className={styles.cardHeader}>
          <h4>
            {bottle.name} {bottle.year}
          </h4>
          <div className={styles.cardActions}>
            <button
              type="button"
              className={styles.iconActionBtn}
              aria-label={text.delete}
              title={text.delete}
              onClick={(e) => {
                e.stopPropagation()
                if (onRequestDeleteBottle) {
                  onRequestDeleteBottle(index)
                  return
                }
                onDeleteBottle(index)
              }}>
              <Icon name="bucket" size={20} className={styles.deleteIcon} />
            </button>

            {!isComplete && (
              <Image
                className={styles.status}
                src="/check-warning.svg"
                alt=""
                width={22}
                height={22}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
        <p className={styles.producer}>{bottle.producer}</p>
        {bottle.wineType && <p className={styles.year}>{bottle.wineType}</p>}
      </div>
    </div>
  )
}

function SortableBottleCard(props) {
  const {bottle} = props
  const {attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging} = useSortable({
    id: bottle.clientId,
  })

  return (
    <BottleCard
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

export default function BottlesList({
  bottles,
  questions,
  onEditBottle,
  onNewBottle,
  onDeleteBottle,
  onRequestDeleteBottle,
  onReorderBottles,
}) {
  const {lang} = useLanguage()
  const text = getBottlesListText(lang)
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
        <button className="btn tertiary" onClick={onNewBottle}>
          <Icon name="plus" size={24} /> <span>{text.add}</span>
        </button>
      </div>

      {bottles.length === 0 ? (
        <div className={styles.emptyState}>
          <p>{text.empty}</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          autoScroll={false}
          onDragCancel={() => {}}
          onDragEnd={({active, over}) => {
            onReorderBottles?.(active?.id, over?.id)
          }}>
          <SortableContext
            items={bottles.map((bottle) => bottle.clientId)}
            strategy={verticalListSortingStrategy}>
            <div className={styles.grid}>
              {bottles.map((bottle, index) => (
                <SortableBottleCard
                  key={bottle.clientId}
                  bottle={bottle}
                  index={index}
                  questions={questions}
                  text={text}
                  onEditBottle={onEditBottle}
                  onDeleteBottle={onDeleteBottle}
                  onRequestDeleteBottle={onRequestDeleteBottle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
