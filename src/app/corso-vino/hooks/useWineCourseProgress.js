'use client'

import {useState, useEffect, useCallback} from 'react'

const STORAGE_KEY = 'wine_course_progress'

/**
 * Manages per-lesson completion state in localStorage (guest-first, no auth required).
 *
 * Progress shape:
 * {
 *   "level-1": {
 *     "level-1-lesson-1": { completed: true, score: 4, attempts: 1, completedAt: "..." },
 *     ...
 *   }
 * }
 */
export function useWineCourseProgress() {
  const [progress, setProgress] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setProgress(JSON.parse(raw))
    } catch {
      // localStorage not available (SSR safety) – start with empty progress
    }
    setLoaded(true)
  }, [])

  const persist = useCallback((next) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }, [])

  /** Call after a lesson is completed. Keeps the best score across attempts. */
  const completeLesson = useCallback(
    (levelId, lessonId, score) => {
      setProgress((prev) => {
        const level = prev[levelId] ?? {}
        const existing = level[lessonId] ?? {}
        const next = {
          ...prev,
          [levelId]: {
            ...level,
            [lessonId]: {
              completed: true,
              score: Math.max(score, existing.score ?? 0),
              attempts: (existing.attempts ?? 0) + 1,
              completedAt: new Date().toISOString(),
            },
          },
        }
        persist(next)
        return next
      })
    },
    [persist],
  )

  /** Returns the stored progress for a single lesson, or null. */
  const getLessonProgress = useCallback(
    (levelId, lessonId) => progress[levelId]?.[lessonId] ?? null,
    [progress],
  )

  /**
   * Returns 'completed' | 'unlocked' | 'locked' for a lesson.
   * Lesson 0 within a level is always unlocked (if the level itself is unlocked).
   */
  const getLessonStatus = useCallback(
    (level, lessonIndex) => {
      const lessonId = level.lessonIds[lessonIndex]
      const lp = progress[level.id]?.[lessonId]
      if (lp?.completed) return 'completed'
      if (lessonIndex === 0) return 'unlocked'
      const prevId = level.lessonIds[lessonIndex - 1]
      if (progress[level.id]?.[prevId]?.completed) return 'unlocked'
      return 'locked'
    },
    [progress],
  )

  /**
   * Returns 'unlocked' | 'locked' for a level.
   * Level 0 is always unlocked; level N requires all lessons of level N-1 to be completed.
   */
  const getLevelStatus = useCallback(
    (levels, levelIndex) => {
      if (levelIndex === 0) return 'unlocked'
      const prev = levels[levelIndex - 1]
      const allDone = prev.lessonIds.every((id) => progress[prev.id]?.[id]?.completed)
      return allDone ? 'unlocked' : 'locked'
    },
    [progress],
  )

  /** Returns how many lessons are completed in a given level. */
  const getLevelCompletedCount = useCallback(
    (level) => level.lessonIds.filter((id) => progress[level.id]?.[id]?.completed).length,
    [progress],
  )

  return {
    progress,
    loaded,
    completeLesson,
    getLessonProgress,
    getLessonStatus,
    getLevelStatus,
    getLevelCompletedCount,
  }
}
