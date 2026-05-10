'use client'

import {useState, useCallback} from 'react'
import styles from '../../admin.module.scss'

// ─── helpers ───────────────────────────────────────────────

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function emptySlide() {
  return {title: '', paragraphs: [''], keyPoints: []}
}

function emptyQuestion() {
  return {
    type: 'mcq',
    question: '',
    answers: ['', '', ''],
    correct: 0,
    feedback: {correct: '', wrong: ''},
  }
}

// ─── Sub-components ────────────────────────────────────────

function SlideEditor({slide, index, onChange, onRemove}) {
  const update = (field, value) => onChange({...slide, [field]: value})

  const updateParagraph = (i, value) => {
    const p = [...(slide.paragraphs ?? [])]
    p[i] = value
    onChange({...slide, paragraphs: p})
  }

  const addParagraph = () => onChange({...slide, paragraphs: [...(slide.paragraphs ?? []), '']})

  const removeParagraph = (i) => {
    const p = (slide.paragraphs ?? []).filter((_, idx) => idx !== i)
    onChange({...slide, paragraphs: p})
  }

  const updateKeyPoint = (i, value) => {
    const kp = [...(slide.keyPoints ?? [])]
    kp[i] = value
    onChange({...slide, keyPoints: kp})
  }

  const addKeyPoint = () => onChange({...slide, keyPoints: [...(slide.keyPoints ?? []), '']})

  const removeKeyPoint = (i) => {
    const kp = (slide.keyPoints ?? []).filter((_, idx) => idx !== i)
    onChange({...slide, keyPoints: kp})
  }

  return (
    <div className={styles.slideCard}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>Slide {index + 1}</span>
        <button type="button" className={styles.removeBtn} onClick={onRemove} title="Rimuovi slide">
          🗑
        </button>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Titolo slide</label>
        <input
          className={styles.input}
          value={slide.title ?? ''}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Titolo..."
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Paragrafi</label>
        {(slide.paragraphs ?? []).map((p, i) => (
          <div key={i} className={styles.optionRow}>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={p}
              onChange={(e) => updateParagraph(i, e.target.value)}
              placeholder={`Paragrafo ${i + 1}...`}
            />
            <button type="button" className={styles.removeBtn} onClick={() => removeParagraph(i)}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className={styles.addBtn} onClick={addParagraph}>
          + Aggiungi paragrafo
        </button>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Punti chiave</label>
        {(slide.keyPoints ?? []).map((kp, i) => (
          <div key={i} className={styles.optionRow}>
            <input
              className={styles.input}
              value={kp}
              onChange={(e) => updateKeyPoint(i, e.target.value)}
              placeholder={`Punto chiave ${i + 1}...`}
            />
            <button type="button" className={styles.removeBtn} onClick={() => removeKeyPoint(i)}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className={styles.addBtn} onClick={addKeyPoint}>
          + Aggiungi punto chiave
        </button>
      </div>
    </div>
  )
}

function QuestionEditor({question, index, onChange, onRemove}) {
  const update = (field, value) => onChange({...question, [field]: value})

  const updateAnswer = (i, value) => {
    const answers = [...(question.answers ?? [])]
    answers[i] = value
    onChange({...question, answers})
  }

  const addAnswer = () => onChange({...question, answers: [...(question.answers ?? []), '']})

  const removeAnswer = (i) => {
    const answers = (question.answers ?? []).filter((_, idx) => idx !== i)
    const correct =
      question.correct >= i && question.correct > 0 ? question.correct - 1 : question.correct
    onChange({...question, answers, correct})
  }

  const isTrueFalse = question.type === 'true_false'

  return (
    <div className={styles.questionCard}>
      <div className={styles.questionHeader}>
        <span className={styles.questionNum}>Domanda {index + 1}</span>
        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
          <select
            className={styles.input}
            style={{width: 'auto', padding: '4px 8px'}}
            value={question.type ?? 'mcq'}
            onChange={(e) => update('type', e.target.value)}>
            <option value="mcq">Scelta multipla</option>
            <option value="true_false">Vero / Falso</option>
          </select>
          <button type="button" className={styles.removeBtn} onClick={onRemove}>
            🗑
          </button>
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Testo domanda</label>
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          value={question.question ?? question.text ?? ''}
          onChange={(e) => update('question', e.target.value)}
          placeholder="Scrivi la domanda..."
        />
      </div>

      {!isTrueFalse && (
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Opzioni{' '}
            <span style={{fontWeight: 500, textTransform: 'none'}}>
              — seleziona la risposta corretta
            </span>
          </label>
          {(question.answers ?? []).map((answer, i) => (
            <div key={i} className={styles.optionRow}>
              <input
                type="radio"
                name={`correct-${index}`}
                className={styles.correctRadio}
                checked={question.correct === i}
                onChange={() => update('correct', i)}
                title="Risposta corretta"
              />
              <input
                className={styles.input}
                value={answer}
                onChange={(e) => updateAnswer(i, e.target.value)}
                placeholder={`Opzione ${i + 1}...`}
              />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeAnswer(i)}
                disabled={(question.answers ?? []).length <= 2}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className={styles.addBtn} onClick={addAnswer}>
            + Aggiungi opzione
          </button>
        </div>
      )}

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Feedback corretto</label>
        <input
          className={styles.input}
          value={question.feedback?.correct ?? ''}
          onChange={(e) =>
            onChange({...question, feedback: {...question.feedback, correct: e.target.value}})
          }
          placeholder="Messaggio quando la risposta è corretta..."
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Feedback sbagliato</label>
        <input
          className={styles.input}
          value={question.feedback?.wrong ?? ''}
          onChange={(e) =>
            onChange({...question, feedback: {...question.feedback, wrong: e.target.value}})
          }
          placeholder="Messaggio quando la risposta è sbagliata..."
        />
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────

export default function LessonEditorClient({lang, levelNum, lessonIndex, initialLesson}) {
  const [lesson, setLesson] = useState(() => deepClone(initialLesson))
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null) // {type: 'success'|'error', msg: string}|null

  const updateField = (field, value) => setLesson((prev) => ({...prev, [field]: value}))

  // Slides
  const updateSlide = useCallback((i, slide) => {
    setLesson((prev) => {
      const slides = [...(prev.slides ?? [])]
      slides[i] = slide
      return {...prev, slides}
    })
  }, [])

  const addSlide = () =>
    setLesson((prev) => ({...prev, slides: [...(prev.slides ?? []), emptySlide()]}))

  const removeSlide = (i) =>
    setLesson((prev) => ({
      ...prev,
      slides: (prev.slides ?? []).filter((_, idx) => idx !== i),
    }))

  // Questions
  const updateQuestion = useCallback((i, q) => {
    setLesson((prev) => {
      const questions = [...(prev.questions ?? [])]
      questions[i] = q
      return {...prev, questions}
    })
  }, [])

  const addQuestion = () =>
    setLesson((prev) => ({
      ...prev,
      questions: [...(prev.questions ?? []), emptyQuestion()],
    }))

  const removeQuestion = (i) =>
    setLesson((prev) => ({
      ...prev,
      questions: (prev.questions ?? []).filter((_, idx) => idx !== i),
    }))

  const handleSave = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/admin/corso-save', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({lang, levelNum, lessonIndex, lesson}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore sconosciuto')
      setStatus({type: 'success', msg: '✅ Salvato con successo su Supabase Storage'})
    } catch (err) {
      setStatus({type: 'error', msg: `❌ ${err.message}`})
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.editorForm}>
      {/* ── Dati base lezione ── */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Informazioni lezione</span>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Titolo lezione</label>
          <input
            className={styles.input}
            value={lesson.title ?? ''}
            onChange={(e) => updateField('title', e.target.value)}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Intro (testo breve)</label>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={
              typeof lesson.intro === 'string'
                ? lesson.intro
                : (lesson.intro?.paragraphs?.[0] ?? '')
            }
            onChange={(e) => updateField('intro', e.target.value)}
            placeholder="Introduzione della lezione..."
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Final (frase conclusiva)</label>
          <input
            className={styles.input}
            value={lesson.final ?? ''}
            onChange={(e) => updateField('final', e.target.value)}
            placeholder="Frase conclusiva della lezione..."
          />
        </div>
      </div>

      {/* ── Slides ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>
            Slide didattiche ({(lesson.slides ?? []).length})
          </span>
        </div>

        {(lesson.slides ?? []).map((slide, i) => (
          <SlideEditor
            key={i}
            slide={slide}
            index={i}
            onChange={(s) => updateSlide(i, s)}
            onRemove={() => removeSlide(i)}
          />
        ))}

        <button type="button" className={styles.addBtn} onClick={addSlide}>
          + Aggiungi slide
        </button>
      </div>

      {/* ── Domande ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>Domande ({(lesson.questions ?? []).length})</span>
        </div>

        {(lesson.questions ?? []).map((q, i) => (
          <QuestionEditor
            key={i}
            question={q}
            index={i}
            onChange={(q) => updateQuestion(i, q)}
            onRemove={() => removeQuestion(i)}
          />
        ))}

        <button type="button" className={styles.addBtn} onClick={addQuestion}>
          + Aggiungi domanda
        </button>
      </div>

      {/* ── Save bar ── */}
      <div className={styles.saveBar}>
        {status && (
          <span className={`${styles.statusMsg} ${styles[status.type]}`}>{status.msg}</span>
        )}
        <button
          type="button"
          className="btn primary"
          onClick={handleSave}
          disabled={saving}
          style={{marginLeft: 'auto'}}>
          {saving ? 'Salvataggio...' : '💾 Salva lezione'}
        </button>
      </div>
    </div>
  )
}
