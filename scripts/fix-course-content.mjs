#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

// Pattern replacements for placeholder text
const placeholderPatterns = [
  {
    search:
      /In questa prima parte ti accompagno con esempi semplici e linguaggio pratico, così costruisci una base chiara prima di passare alle domande\./g,
    replace:
      'Qui trovi esempi pratici legati a situazioni reali di degustazione, cosi trasformi la teoria in scelte concrete nel bicchiere.',
  },
  {
    search:
      /Tra poco trovi domande progressive: prima controllo delle basi, poi applicazione pratica\. Se sbagli non è un problema, puoi riprovare e migliorare il punteggio\./g,
    replace:
      'Nel quiz vedrai domande che testano questo concetto. Prenditi il tempo per capirlo bene.',
  },
  {
    search:
      /In this first part I will accompany you with simple examples and practical language, so you build a clear foundation before moving on to the questions\./g,
    replace:
      'You will find practical examples tied to real tasting situations, so theory becomes concrete choices in the glass.',
  },
  {
    search:
      /Soon you will find progressive questions: first checking the basics, then practical application\. If you make a mistake it's not a problem, you can try again and improve your score\./g,
    replace:
      'In the quiz you will find questions that test this concept step by step. Take your time and focus on understanding it.',
  },
]

// Function to fix course files
function fixCourseFile(filePath) {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    let modified = false
    const isEnglish = filePath.includes('/en/')
    const emptyParagraphFallback = isEnglish
      ? 'You will find practical examples tied to real tasting situations, so theory becomes concrete choices in the glass.'
      : 'Qui trovi esempi pratici legati a situazioni reali di degustazione, cosi trasformi la teoria in scelte concrete nel bicchiere.'

    content.lessons?.forEach((lesson) => {
      lesson.slides?.forEach((slide) => {
        if (Array.isArray(slide.paragraphs)) {
          slide.paragraphs = slide.paragraphs.map((para) => {
            let updated = para
            placeholderPatterns.forEach(({search, replace}) => {
              if (search.test(updated)) {
                updated = updated.replace(search, replace)
                modified = true
              }
            })
            if (typeof updated === 'string' && updated.trim() === '') {
              updated = emptyParagraphFallback
              modified = true
            }
            return updated
          })
        }
      })
    })

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2))
      console.log(`✓ Fixed: ${filePath}`)
      return true
    }
    return false
  } catch (err) {
    console.error(`✗ Error processing ${filePath}:`, err.message)
    return false
  }
}

// Main execution
const corsDir = path.join(process.cwd(), 'public/corsi')
const levels = [1, 2, 3, 4, 5, 6]
let fixed = 0

// Process Italian versions
console.log('Processing Italian course files...')
levels.forEach((level) => {
  const filePath = path.join(corsDir, `corso_livello_${level}.json`)
  if (fs.existsSync(filePath)) {
    if (fixCourseFile(filePath)) fixed++
  }
})

// Process English versions
console.log('Processing English course files...')
levels.forEach((level) => {
  const filePath = path.join(corsDir, `en/corso_livello_${level}.json`)
  if (fs.existsSync(filePath)) {
    if (fixCourseFile(filePath)) fixed++
  }
})

console.log(`\n${fixed} files processed and fixed!`)
