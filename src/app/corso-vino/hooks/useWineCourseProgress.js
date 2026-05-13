'use client'

import {useState, useEffect, useCallback} from 'react'
import {supabaseClient} from '@/lib/supabaseClient'

const STORAGE_KEY = 'wine_course_progress'

/**
 * Manages per-lesson completion state.
 * - Guest: localStorage only.
 * - Registered user: Supabase DB as source of truth, localStorage as cache.
 *
 * Progress shape (in memory / localStorage):
 * {
 *   "level-1": {
 *     "level-1-lesson-1": { completed: true, score: 4, attempts: 1, completedAt: "..." },
 *     ...
 *   }
 * }
 */

/** Convert flat DB rows → nested progress object */
function rowsToProgress(rows) {
  return rows.reduce((acc, row) => {
    if (!acc[row.level_id]) acc[row.level_id] = {}
    acc[row.level_id][row.lesson_id] = {
      completed: row.completed,
      score: row.score,
      maxScore: row.max_score,
      attempts: row.attempts,
      completedAt: row.completed_at,
    }
    return acc
  }, {})
}

export function useWineCourseProgress() {
  const [progress, setProgress] = useState({})
  const [loaded, setLoaded] = useState(false)
  const [userId, setUserId] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadProgress() {
      // 1. Read localStorage synchronously — set loaded immediately, no network needed
      let local = {}
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) local = JSON.parse(raw)
      } catch {}

      if (cancelled) return
      setProgress(local)
      setLoaded(true)

      // 2. Get session from local storage (no network call)
      let uid = null
      try {
        const {
          data: {session},
        } = await supabaseClient.auth.getSession()
        uid = session?.user?.id ?? null
      } catch {}

      if (cancelled) return
      setUserId(uid)
      setAuthChecked(true)

      if (!uid) return

      // 3. Fetch DB in background to get authoritative progress
      try {
        const {data: rows, error} = await supabaseClient
          .from('wine_course_progress')
          .select('level_id, lesson_id, completed, score, max_score, attempts, completed_at')
          .eq('user_id', uid)

        if (cancelled || error) return

        const dbProgress = rowsToProgress(rows ?? [])
        const merged = {...local}
        for (const [levelId, lessons] of Object.entries(dbProgress)) {
          merged[levelId] = {...(merged[levelId] ?? {}), ...lessons}
        }

        setProgress(merged)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        } catch {}
      } catch {}
    }

    loadProgress()

    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback((next) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }, [])

  /** Call after a lesson is completed. Keeps the best score across attempts. */
  const completeLesson = useCallback(
    (levelId, lessonId, score, maxScore) => {
      setProgress((prev) => {
        const level = prev[levelId] ?? {}
        const existing = level[lessonId] ?? {}
        const bestScore = Math.max(score, existing.score ?? 0)
        const storedMaxScore = maxScore ?? existing.maxScore ?? 0
        const attempts = (existing.attempts ?? 0) + 1
        const completedAt = new Date().toISOString()

        const next = {
          ...prev,
          [levelId]: {
            ...level,
            [lessonId]: {
              completed: true,
              score: bestScore,
              maxScore: storedMaxScore,
              attempts,
              completedAt,
            },
          },
        }
        persist(next)

        // Sync to DB if logged in (fire-and-forget)
        if (userId) {
          supabaseClient
            .from('wine_course_progress')
            .upsert(
              {
                user_id: userId,
                level_id: levelId,
                lesson_id: lessonId,
                completed: true,
                score: bestScore,
                max_score: storedMaxScore,
                attempts,
                completed_at: completedAt,
                updated_at: completedAt,
              },
              {onConflict: 'user_id,level_id,lesson_id'},
            )
            .then(({error}) => {
              if (error) console.error('[wine-course] DB sync error:', error.message)
            })
        }

        return next
      })
    },
    [persist, userId],
  )

  /** Returns the stored progress for a single lesson, or null. */
  const getLessonProgress = useCallback(
    (levelId, lessonId) => progress[levelId]?.[lessonId] ?? null,
    [progress],
  )

  /**
   * Returns 'completed' | 'unlocked' for a lesson.
   */
  const getLessonStatus = useCallback(
    (level, lessonIndex) => {
      const lessonId = level.lessonIds[lessonIndex]
      const lp = progress[level.id]?.[lessonId]
      if (lp?.completed) return 'completed'
      return 'unlocked'
    },
    [progress],
  )

  /**
   * Levels are always unlocked.
   */
  const getLevelStatus = useCallback(() => 'unlocked', [])

  /** Returns how many lessons are completed in a given level. */
  const getLevelCompletedCount = useCallback(
    (level) => level.lessonIds.filter((id) => progress[level.id]?.[id]?.completed).length,
    [progress],
  )

  /** Returns array of lesson states: 'passed' | 'review' | 'incomplete' for a whole level. */
  const getLevelLessonsStatus = useCallback(
    (level, passThreshold = 0.75) => {
      return level.lessonIds.map((lessonId) => {
        const lp = progress[level.id]?.[lessonId]
        if (!lp?.completed) return 'incomplete'
        if (lp.maxScore > 0) {
          const pct = lp.score / lp.maxScore
          return pct >= passThreshold ? 'passed' : 'review'
        }
        return 'passed'
      })
    },
    [progress],
  )

  return {
    progress,
    loaded,
    userId,
    authChecked,
    completeLesson,
    getLessonProgress,
    getLessonStatus,
    getLevelStatus,
    getLevelCompletedCount,
    getLevelLessonsStatus,
  }
}
