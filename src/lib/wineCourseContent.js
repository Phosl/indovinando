import 'server-only'

import {promises as fs} from 'fs'
import path from 'path'
import {normalizeLanguage} from './i18n/config'
import it from './i18n/locales/it.json'
import en from './i18n/locales/en.json'

const LEVEL_EMOJIS = {
  1: '😭​',
  2: '🍷',
  3: '🏅',
  4: '📜', // storia e cursiosita
  5: '🍽️', //Vino a tavola: le domande classiche
  6: '⚗️', //la chimica del vino
  7: '🌍', //Le zone
  8: '🥂', //champagne e spumanti
  9: '🍇', //le uve
  10: '✨​', //il livello più avanzato, per chi vuole diventare un vero esperto
}

function interpolate(template, vars = {}) {
  if (typeof template !== 'string') return template
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

function getWineCourseTexts(lang) {
  const locale = normalizeLanguage(lang) === 'en' ? en : it
  return locale.wineCourseContent || it.wineCourseContent || {}
}

function toOptionId(index, isTrueFalse, lang) {
  if (isTrueFalse) {
    if (normalizeLanguage(lang) === 'en') return index === 0 ? 'true' : 'false'
    return index === 0 ? 'vero' : 'falso'
  }
  return String.fromCharCode(97 + index)
}

function normalizeQuestion(question, index, lang) {
  const isTrueFalse = question.type === 'true_false'
  const type = isTrueFalse ? 'true_false' : 'multiple_choice'
  const txt = getWineCourseTexts(lang)

  const options = Array.isArray(question.options)
    ? question.options.map((opt, i) => ({
        id: opt.id ?? toOptionId(i, isTrueFalse, lang),
        text: opt.text ?? String(opt),
      }))
    : (question.answers ?? []).map((answer, i) => ({
        id: toOptionId(i, isTrueFalse, lang),
        text: String(answer),
      }))

  let correctId = question.correctId
  if (!correctId) {
    const idx = typeof question.correct === 'number' ? question.correct : 0
    correctId = options[idx]?.id ?? options[0]?.id
  }

  return {
    id: question.id ?? `q${index + 1}`,
    type,
    text:
      question.text ??
      question.question ??
      interpolate(txt.questionDefault || 'Question {index}', {index: index + 1}),
    options,
    correctId,
    feedback: {
      correct: question.feedback?.correct ?? (txt.feedbackCorrect || 'Corretto! Ottima risposta.'),
      wrong:
        question.feedback?.wrong ?? (txt.feedbackWrong || 'Non esatto. Riprova: puoi farcela.'),
    },
  }
}

function normalizeIntro(lesson, lang) {
  const txt = getWineCourseTexts(lang)

  if (typeof lesson.intro === 'object' && lesson.intro) {
    return {
      title: lesson.intro.title ?? lesson.title,
      paragraphs: Array.isArray(lesson.intro.paragraphs)
        ? lesson.intro.paragraphs
        : [lesson.intro.paragraphs ?? ''],
      keyPoints: Array.isArray(lesson.intro.keyPoints)
        ? lesson.intro.keyPoints
        : [
            txt.keyPointReinforce || 'Rispondi alle domande per consolidare i concetti.',
            txt.keyPointRepeat || 'Puoi ripetere la lezione quando vuoi.',
          ],
    }
  }

  return {
    title: lesson.title,
    paragraphs: [lesson.intro ?? (txt.interactiveLesson || 'Lesson interattiva sul vino.')],
    keyPoints: [
      txt.keyPointReinforce || 'Rispondi alle domande per consolidare i concetti.',
      txt.keyPointRepeat || 'Puoi ripetere la lezione quando vuoi.',
    ],
  }
}

function normalizeSlide(slide, lesson, index) {
  if (typeof slide === 'string') {
    return {
      id: `s${index + 1}`,
      title: lesson.title,
      paragraphs: [slide],
      keyPoints: [],
    }
  }

  return {
    id: slide.id ?? `s${index + 1}`,
    title: slide.title ?? lesson.title,
    paragraphs: Array.isArray(slide.paragraphs) ? slide.paragraphs : [slide.paragraphs ?? ''],
    keyPoints: Array.isArray(slide.keyPoints) ? slide.keyPoints : [],
  }
}

function normalizeDidacticSlides(lesson, lang) {
  const txt = getWineCourseTexts(lang)

  if (Array.isArray(lesson.slides) && lesson.slides.length > 0) {
    return lesson.slides.slice(0, 2).map((slide, index) => normalizeSlide(slide, lesson, index))
  }

  const introText =
    typeof lesson.intro === 'string'
      ? lesson.intro
      : (lesson.intro?.paragraphs?.[0] ?? (txt.interactiveLesson || 'Lesson interattiva sul vino.'))
  const closingText =
    lesson.final ??
    (txt.continueWithQuestions ||
      'Continue con le domande per fissare i concetti e verificare quanto hai appreso.')

  return [
    {
      id: 's1',
      title: lesson.title,
      paragraphs: [
        introText,
        txt.readCarefully ||
          'Leggi con attenzione questa parte: ti prepara a rispondere in modo consapevole alle domande del quiz.',
      ],
      keyPoints: [
        txt.observeConcepts || 'Osserva i concetti chiave della lezione.',
        txt.connectTheory || 'Collega teoria e situazioni reali.',
      ],
    },
    {
      id: 's2',
      title: txt.takeawaysTitle || 'Cosa porti a casa',
      paragraphs: [
        closingText,
        txt.nowMoveToQuestions ||
          'Ora passa alle domande: ti aiuteranno a consolidare i passaggi principali e fissare la terminologia.',
      ],
      keyPoints: [
        txt.goalUnderstand || 'Obiettivo: capire, non solo ricordare.',
        txt.keyPointRepeat || 'Puoi ripetere la lezione quando vuoi.',
      ],
    },
  ]
}

function normalizeLesson(rawLevel, lesson, lessonIndex, lang) {
  const levelNumber = Number(rawLevel.level)
  const lessonId = `level-${levelNumber}-lesson-${lessonIndex + 1}`
  const levelEmoji = rawLevel.emoji ?? LEVEL_EMOJIS[levelNumber] ?? '🍷'

  return {
    id: lessonId,
    levelId: `level-${levelNumber}`,
    order: lessonIndex + 1,
    title: lesson.title,
    // Lesson can override; otherwise inherit level emoji for consistent UX.
    emoji: lesson.emoji ?? levelEmoji,
    intro: normalizeIntro(lesson, lang),
    didacticSlides: normalizeDidacticSlides(lesson, lang),
    questions: (lesson.questions ?? []).map((question, i) => normalizeQuestion(question, i, lang)),
  }
}

function normalizeLevel(rawLevel, lang) {
  const levelNumber = Number(rawLevel.level)
  const lessons = (rawLevel.lessons ?? []).map((lesson, i) =>
    normalizeLesson(rawLevel, lesson, i, lang),
  )

  return {
    id: `level-${levelNumber}`,
    title: rawLevel.title,
    description: rawLevel.description,
    emoji: rawLevel.emoji ?? LEVEL_EMOJIS[levelNumber] ?? '🍷',
    order: levelNumber,
    lessonIds: lessons.map((lesson) => lesson.id),
    lessons,
  }
}

export async function getWineCourseData(lang = 'it') {
  const normalizedLang = normalizeLanguage(lang)

  // Try Supabase Storage first (production source of truth)
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (storageUrl) {
    try {
      const rawLevels = await Promise.all(
        Array.from({length: 10}, async (_, i) => {
          const levelNum = i + 1
          const filePath =
            normalizedLang === 'it'
              ? `corso_livello_${levelNum}.json`
              : `${normalizedLang}/corso_livello_${levelNum}.json`
          const url = `${storageUrl}/storage/v1/object/public/corsi/${filePath}`
          const res = await fetch(url, {next: {revalidate: 60}})
          if (!res.ok) throw new Error(`Storage fetch failed: ${res.status} ${url}`)
          return res.json()
        }),
      )
      const levels = rawLevels
        .map((level) => normalizeLevel(level, normalizedLang))
        .sort((a, b) => a.order - b.order)
        .map(({lessons, ...level}) => level)

      const lessonsById = rawLevels
        .map((level) => normalizeLevel(level, normalizedLang))
        .sort((a, b) => a.order - b.order)
        .flatMap((level) => level.lessons)
        .reduce((acc, lesson) => {
          acc[lesson.id] = lesson
          return acc
        }, {})

      return {levels, lessonsById}
    } catch {
      // Storage not yet populated or unreachable — fall through to filesystem
    }
  }

  // Fallback: read from /public/corsi (local dev or before Storage migration)
  const publicDir = path.join(process.cwd(), 'public')
  const coursesDir = path.join(publicDir, 'corsi')
  const localizedDir = path.join(coursesDir, normalizedLang)

  let sourceDir = coursesDir
  let allFiles = []
  let languageFiles = []

  try {
    languageFiles = await fs.readdir(localizedDir)
    if (languageFiles.length > 0) {
      sourceDir = localizedDir
      allFiles = languageFiles
    }
  } catch {
    // Fallback to root courses directory
  }

  try {
    if (allFiles.length === 0) allFiles = await fs.readdir(coursesDir)
  } catch {
    sourceDir = publicDir
    allFiles = await fs.readdir(publicDir)
  }

  const levelFiles = allFiles.filter((name) => /^corso_livello_\d+\.json$/i.test(name)).sort()

  const rawLevels = await Promise.all(
    levelFiles.map(async (fileName) => {
      const fullPath = path.join(sourceDir, fileName)
      const content = await fs.readFile(fullPath, 'utf8')
      return JSON.parse(content)
    }),
  )

  const levels = rawLevels
    .map((level) => normalizeLevel(level, normalizedLang))
    .sort((a, b) => a.order - b.order)
    .map(({lessons, ...level}) => level)

  const lessonsById = rawLevels
    .map((level) => normalizeLevel(level, normalizedLang))
    .sort((a, b) => a.order - b.order)
    .flatMap((level) => level.lessons)
    .reduce((acc, lesson) => {
      acc[lesson.id] = lesson
      return acc
    }, {})

  return {levels, lessonsById}
}
