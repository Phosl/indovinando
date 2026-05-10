#!/usr/bin/env node
import {readdirSync, readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'

const ROOTS = ['public/corsi', 'public/corsi/en']

function asParagraphs(value) {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function asKeyPoints(value) {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean)
  return []
}

function toSlideObject(slide, idx, lessonTitle) {
  if (typeof slide === 'string') {
    return {
      id: `s${idx + 1}`,
      title: lessonTitle,
      paragraphs: [slide],
      keyPoints: [],
    }
  }

  return {
    id: slide?.id ?? `s${idx + 1}`,
    title: slide?.title ?? lessonTitle,
    paragraphs: asParagraphs(slide?.paragraphs),
    keyPoints: asKeyPoints(slide?.keyPoints),
  }
}

function extractLessonIntro(lesson, isEnglish) {
  if (typeof lesson?.intro === 'string' && lesson.intro.trim()) return lesson.intro.trim()
  if (lesson?.intro && typeof lesson.intro === 'object') {
    const fromParagraphs = asParagraphs(lesson.intro.paragraphs)
    if (fromParagraphs[0]) return fromParagraphs[0]
    if (typeof lesson.intro.title === 'string' && lesson.intro.title.trim())
      return lesson.intro.title.trim()
  }
  return isEnglish
    ? 'In this lesson, you will connect theory and tasting evidence step by step.'
    : 'In questa lezione collegherai teoria e segnali sensoriali passo dopo passo.'
}

function extractLessonFinal(lesson, isEnglish) {
  if (typeof lesson?.final === 'string' && lesson.final.trim()) return lesson.final.trim()
  return isEnglish
    ? 'Now use the quiz to consolidate key concepts and verify your understanding.'
    : 'Ora usa il quiz per consolidare i concetti chiave e verificare la comprensione.'
}

function deriveQuestionKeyPoints(lesson, isEnglish) {
  const qs = Array.isArray(lesson?.questions) ? lesson.questions : []
  const pts = qs
    .slice(0, 3)
    .map((q) => q?.question ?? q?.text)
    .filter(Boolean)
    .map((q) => String(q).replace(/\?+$/g, '').trim())

  if (pts.length > 0) return pts

  return isEnglish
    ? ['Identify the core concept', 'Compare plausible options', 'Choose based on evidence']
    : [
        'Individua il concetto centrale',
        'Confronta le opzioni plausibili',
        'Scegli in base agli indizi',
      ]
}

function buildSupplementalSlide(lesson, isEnglish) {
  const intro = extractLessonIntro(lesson, isEnglish)
  const finalText = extractLessonFinal(lesson, isEnglish)

  return {
    id: 's2',
    title: isEnglish ? 'Practical application' : 'Applicazione pratica',
    paragraphs: [
      isEnglish
        ? 'Use the following questions to connect definitions, context, and sensory clues.'
        : 'Usa le domande seguenti per collegare definizioni, contesto e indizi sensoriali.',
      finalText,
    ],
    keyPoints: deriveQuestionKeyPoints(lesson, isEnglish),
    ctaHref: undefined,
    ctaLabel: undefined,
    _introRef: intro,
  }
}

function ensureDidacticSlides(lesson, isEnglish) {
  const rawSlides = Array.isArray(lesson.slides) ? lesson.slides : []
  let slides = rawSlides.map((s, i) => toSlideObject(s, i, lesson.title))

  if (slides.length === 0) {
    slides = [
      {
        id: 's1',
        title: lesson.title,
        paragraphs: [extractLessonIntro(lesson, isEnglish)],
        keyPoints: deriveQuestionKeyPoints(lesson, isEnglish),
      },
      buildSupplementalSlide(lesson, isEnglish),
    ]
  } else if (slides.length === 1) {
    const supplemental = buildSupplementalSlide(lesson, isEnglish)
    supplemental.id = 's2'
    slides.push(supplemental)
  }

  if (slides.length > 3) slides = slides.slice(0, 3)

  slides = slides.map((s, idx) => {
    const next = {
      ...s,
      id: `s${idx + 1}`,
      title: s.title || lesson.title,
      paragraphs: asParagraphs(s.paragraphs),
      keyPoints: asKeyPoints(s.keyPoints),
    }

    if (next.paragraphs.length === 0) {
      next.paragraphs = [
        idx === 0 ? extractLessonIntro(lesson, isEnglish) : extractLessonFinal(lesson, isEnglish),
      ]
    }

    return next
  })

  return slides
}

function rotateAnswers(question, lessonIndex, questionIndex) {
  const type = String(question?.type ?? 'mcq').toLowerCase()
  if (type === 'true_false') return question
  if (!Array.isArray(question?.answers) || typeof question?.correct !== 'number') return question

  const answers = [...question.answers]
  const n = answers.length
  if (n < 2) return question

  let offset = (lessonIndex + questionIndex + 1) % n
  if (offset === 0) offset = 1

  const rotated = answers.slice(offset).concat(answers.slice(0, offset))
  const newCorrect = (question.correct - offset + n) % n

  return {
    ...question,
    answers: rotated,
    correct: newCorrect,
  }
}

function processFile(filePath, isEnglish) {
  const raw = readFileSync(filePath, 'utf8')
  const json = JSON.parse(raw)

  json.lessons = (json.lessons ?? []).map((lesson, lessonIndex) => {
    const nextLesson = {...lesson}
    nextLesson.slides = ensureDidacticSlides(nextLesson, isEnglish)
    nextLesson.questions = (nextLesson.questions ?? []).map((q, qIndex) =>
      rotateAnswers(q, lessonIndex, qIndex),
    )
    return nextLesson
  })

  writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`)
}

function main() {
  for (const root of ROOTS) {
    const absRoot = path.resolve(process.cwd(), root)
    const files = readdirSync(absRoot)
      .filter((f) => /^corso_livello_\d+\.json$/i.test(f))
      .sort()
    const isEnglish = root.endsWith('/en')

    for (const file of files) {
      processFile(path.join(absRoot, file), isEnglish)
    }
  }

  console.log('Course enhancement completed for IT and EN files.')
}

main()
