'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {readStoredIds, readStoredObject, writeStoredIds, writeStoredObject} from './autoTastingHelpers'

export function useAutoTastingDraftPersistence({
  userId,
  autoStep,
  setAutoStep,
  quizTemplateMode,
  setQuizTemplateMode,
  generatedQuizSignature,
  setGeneratedQuizSignature,
}) {
  const sessionImageIdsRef = useRef([])
  const [sessionImageIds, setSessionImageIds] = useState([])

  const sessionIdsStorageKey = useMemo(
    () => (userId ? `auto_tasting_draft_image_ids:${userId}` : ''),
    [userId],
  )
  const draftStateStorageKey = useMemo(
    () => (userId ? `auto_tasting_draft_state:${userId}` : ''),
    [userId],
  )

  const persistSessionIds = useCallback(
    (ids) => {
      if (typeof window === 'undefined') return
      writeStoredIds(window.sessionStorage, sessionIdsStorageKey, ids)
    },
    [sessionIdsStorageKey],
  )

  const clearSessionIds = useCallback(() => {
    if (typeof window === 'undefined') return
    if (sessionIdsStorageKey) window.sessionStorage.removeItem(sessionIdsStorageKey)
    if (draftStateStorageKey) window.localStorage.removeItem(draftStateStorageKey)
  }, [draftStateStorageKey, sessionIdsStorageKey])

  const applyStoredDraftState = useCallback(
    ({storedDraftState, storedSessionIds}) => {
      setSessionImageIds(storedSessionIds)

      if (storedDraftState) {
        const restoredStep = Number(storedDraftState.autoStep || 1)
        setAutoStep(
          restoredStep >= 2 && storedSessionIds.length > 0 ? Math.min(restoredStep, 3) : 1,
        )
        setQuizTemplateMode(storedDraftState.quizTemplateMode === 'standard' ? 'standard' : 'openai')
        setGeneratedQuizSignature(
          typeof storedDraftState.generatedQuizSignature === 'string'
            ? storedDraftState.generatedQuizSignature
            : '',
        )
      }
    },
    [setAutoStep, setGeneratedQuizSignature, setQuizTemplateMode],
  )

  useEffect(() => {
    sessionImageIdsRef.current = sessionImageIds
  }, [sessionImageIds])

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return

    const navigationType =
      window.performance?.getEntriesByType?.('navigation')?.[0]?.type ||
      window.performance?.navigation?.type ||
      ''
    if (navigationType === 'reload') {
      if (sessionIdsStorageKey) window.sessionStorage.removeItem(sessionIdsStorageKey)
      if (draftStateStorageKey) window.localStorage.removeItem(draftStateStorageKey)
    }

    const storedSessionIds = readStoredIds(window.sessionStorage, sessionIdsStorageKey)
    const storedDraftState = readStoredObject(window.localStorage, draftStateStorageKey)
    queueMicrotask(() => {
      applyStoredDraftState({storedDraftState, storedSessionIds})
    })
  }, [
    applyStoredDraftState,
    draftStateStorageKey,
    sessionIdsStorageKey,
    userId,
  ])

  useEffect(() => {
    if (!userId || typeof window === 'undefined' || !draftStateStorageKey) return
    writeStoredObject(window.localStorage, draftStateStorageKey, {
      autoStep,
      quizTemplateMode,
      generatedQuizSignature,
    })
  }, [autoStep, draftStateStorageKey, generatedQuizSignature, quizTemplateMode, userId])

  return {
    clearSessionIds,
    persistSessionIds,
    sessionImageIds,
    sessionImageIdsRef,
    setSessionImageIds,
  }
}
