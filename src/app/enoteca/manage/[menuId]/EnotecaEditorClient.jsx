'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabaseClient'
import styles from './enotecaEditor.module.scss'

// ─── helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2)
}

function emptyOption(questionId, order) {
  return { _tmpId: uid(), question_id: questionId, text: '', is_correct: false, option_order: order }
}

function emptyQuestion(bottleId, order) {
  return { _tmpId: uid(), bottle_id: bottleId, text: '', question_order: order, options: [emptyOption(null, 0), emptyOption(null, 1)] }
}

function emptyBottle(menuId, order) {
  return {
    _tmpId: uid(),
    menu_id: menuId,
    name: '', producer: '', year: '', region: '', varietal: '', description: '',
    bottle_order: order,
    questions: [emptyQuestion(null, 0)],
  }
}

// ─── Build initial state from server props ───────────────────────────────────

function buildState(initialBottles, initialQuestions, initialOptions) {
  const optsByQuestion = {}
  for (const o of initialOptions) {
    if (!optsByQuestion[o.question_id]) optsByQuestion[o.question_id] = []
    optsByQuestion[o.question_id].push(o)
  }
  const qsByBottle = {}
  for (const q of initialQuestions) {
    if (!qsByBottle[q.bottle_id]) qsByBottle[q.bottle_id] = []
    qsByBottle[q.bottle_id].push({ ...q, options: optsByQuestion[q.id] ?? [] })
  }
  return initialBottles.map((b) => ({
    ...b,
    questions: (qsByBottle[b.id] ?? []).sort((a, b) => a.question_order - b.question_order),
  }))
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EnotecaEditorClient({ menu, initialBottles, initialQuestions, initialOptions }) {
  const router = useRouter()

  // Menu metadata
  const [menuName, setMenuName] = useState(menu.name)
  const [menuDesc, setMenuDesc] = useState(menu.description ?? '')
  const [menuLocation, setMenuLocation] = useState(menu.location ?? '')
  const [isPublished, setIsPublished] = useState(menu.is_published)

  // Bottles array (nested: bottle → questions → options)
  const [bottles, setBottles] = useState(() => buildState(initialBottles, initialQuestions, initialOptions))

  // UI state
  const [expandedBottle, setExpandedBottle] = useState(null)
  const [expandedQuestion, setExpandedQuestion] = useState({}) // { [bottleTmpOrId]: questionTmpOrId }
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [copyLink, setCopyLink] = useState(false)

  const menuId = menu.id
  const playerLink = typeof window !== 'undefined' ? `${window.location.origin}/enoteca/${menuId}` : `/enoteca/${menuId}`

  const markDirty = () => setDirty(true)

  // ── Bottle CRUD ─────────────────────────────────────────────────────────────

  const addBottle = () => {
    const b = emptyBottle(menuId, bottles.length)
    setBottles((prev) => [...prev, b])
    setExpandedBottle(b._tmpId)
    markDirty()
  }

  const removeBottle = (key) => {
    setBottles((prev) => prev.filter((b) => (b.id ?? b._tmpId) !== key))
    markDirty()
  }

  const updateBottle = (key, field, value) => {
    setBottles((prev) => prev.map((b) => (b.id ?? b._tmpId) === key ? { ...b, [field]: value } : b))
    markDirty()
  }

  const moveBottle = (key, dir) => {
    setBottles((prev) => {
      const idx = prev.findIndex((b) => (b.id ?? b._tmpId) === key)
      if (idx < 0) return prev
      const next = [...prev]
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
    markDirty()
  }

  // ── Question CRUD ───────────────────────────────────────────────────────────

  const addQuestion = (bottleKey) => {
    setBottles((prev) => prev.map((b) => {
      if ((b.id ?? b._tmpId) !== bottleKey) return b
      const q = emptyQuestion(b.id ?? null, b.questions.length)
      return { ...b, questions: [...b.questions, q] }
    }))
    markDirty()
  }

  const removeQuestion = (bottleKey, qKey) => {
    setBottles((prev) => prev.map((b) => {
      if ((b.id ?? b._tmpId) !== bottleKey) return b
      return { ...b, questions: b.questions.filter((q) => (q.id ?? q._tmpId) !== qKey) }
    }))
    markDirty()
  }

  const updateQuestion = (bottleKey, qKey, field, value) => {
    setBottles((prev) => prev.map((b) => {
      if ((b.id ?? b._tmpId) !== bottleKey) return b
      return { ...b, questions: b.questions.map((q) => (q.id ?? q._tmpId) === qKey ? { ...q, [field]: value } : q) }
    }))
    markDirty()
  }

  // ── Option CRUD ─────────────────────────────────────────────────────────────

  const addOption = (bottleKey, qKey) => {
    setBottles((prev) => prev.map((b) => {
      if ((b.id ?? b._tmpId) !== bottleKey) return b
      return {
        ...b, questions: b.questions.map((q) => {
          if ((q.id ?? q._tmpId) !== qKey) return q
          const o = emptyOption(q.id ?? null, q.options.length)
          return { ...q, options: [...q.options, o] }
        }),
      }
    }))
    markDirty()
  }

  const removeOption = (bottleKey, qKey, oKey) => {
    setBottles((prev) => prev.map((b) => {
      if ((b.id ?? b._tmpId) !== bottleKey) return b
      return {
        ...b, questions: b.questions.map((q) => {
          if ((q.id ?? q._tmpId) !== qKey) return q
          return { ...q, options: q.options.filter((o) => (o.id ?? o._tmpId) !== oKey) }
        }),
      }
    }))
    markDirty()
  }

  const updateOption = (bottleKey, qKey, oKey, field, value) => {
    setBottles((prev) => prev.map((b) => {
      if ((b.id ?? b._tmpId) !== bottleKey) return b
      return {
        ...b, questions: b.questions.map((q) => {
          if ((q.id ?? q._tmpId) !== qKey) return q
          return {
            ...q, options: q.options.map((o) => {
              if ((o.id ?? o._tmpId) !== oKey) return o
              // If setting is_correct=true, reset all others
              if (field === 'is_correct' && value === true) return { ...o, is_correct: true }
              return { ...o, [field]: value }
            }).map((o) => {
              // Clear other correct flags when one is set
              if (field === 'is_correct' && value === true && (o.id ?? o._tmpId) !== oKey) return { ...o, is_correct: false }
              return o
            }),
          }
        }),
      }
    }))
    markDirty()
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)

    try {
      // 1. Update menu metadata + published status
      const { error: menuErr } = await supabaseClient
        .from('enoteca_menus')
        .update({ name: menuName, description: menuDesc || null, location: menuLocation || null, is_published: isPublished, updated_at: new Date().toISOString() })
        .eq('id', menuId)
      if (menuErr) throw menuErr

      // 2. Upsert bottles, questions, options in sequence
      for (let bi = 0; bi < bottles.length; bi++) {
        const bottle = bottles[bi]
        const isNewBottle = !bottle.id

        // Upsert bottle
        const bottlePayload = {
          menu_id: menuId,
          name: bottle.name || 'Bottiglia senza nome',
          producer: bottle.producer || null,
          year: bottle.year ? parseInt(bottle.year, 10) : null,
          region: bottle.region || null,
          varietal: bottle.varietal || null,
          description: bottle.description || null,
          bottle_order: bi,
        }

        let bottleId = bottle.id
        if (isNewBottle) {
          const { data: newBottle, error: bErr } = await supabaseClient
            .from('enoteca_bottles')
            .insert(bottlePayload)
            .select('id')
            .single()
          if (bErr) throw bErr
          bottleId = newBottle.id
        } else {
          const { error: bErr } = await supabaseClient
            .from('enoteca_bottles')
            .update({ ...bottlePayload, bottle_order: bi })
            .eq('id', bottle.id)
          if (bErr) throw bErr
        }

        for (let qi = 0; qi < bottle.questions.length; qi++) {
          const q = bottle.questions[qi]
          const isNewQ = !q.id
          const qPayload = { bottle_id: bottleId, text: q.text || 'Domanda', question_order: qi }

          let questionId = q.id
          if (isNewQ) {
            const { data: newQ, error: qErr } = await supabaseClient
              .from('enoteca_questions')
              .insert(qPayload)
              .select('id')
              .single()
            if (qErr) throw qErr
            questionId = newQ.id
          } else {
            const { error: qErr } = await supabaseClient
              .from('enoteca_questions')
              .update(qPayload)
              .eq('id', q.id)
            if (qErr) throw qErr
          }

          for (let oi = 0; oi < q.options.length; oi++) {
            const o = q.options[oi]
            const isNewO = !o.id
            const oPayload = { question_id: questionId, text: o.text || 'Opzione', is_correct: o.is_correct, option_order: oi }

            if (isNewO) {
              const { error: oErr } = await supabaseClient.from('enoteca_options').insert(oPayload)
              if (oErr) throw oErr
            } else {
              const { error: oErr } = await supabaseClient.from('enoteca_options').update(oPayload).eq('id', o.id)
              if (oErr) throw oErr
            }
          }
        }
      }

      setDirty(false)
      // Reload to get fresh IDs from server
      router.refresh()
    } catch (err) {
      setSaveError(err?.message ?? 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }, [menuId, menuName, menuDesc, menuLocation, isPublished, bottles, router])

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(playerLink)
    setCopyLink(true)
    setTimeout(() => setCopyLink(false), 2000)
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
          ← Dashboard
        </button>
        <div className={styles.topBarActions}>
          {dirty && <span className={styles.dirtyBadge}>Non salvato</span>}
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio…' : '💾 Salva'}
          </button>
        </div>
      </div>

      <div className={styles.container}>
        {saveError && <div className={styles.errorBanner}>{saveError}</div>}

        {/* Menu metadata card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>📋 Dettagli menu</h2>
            <label className={styles.publishToggle}>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => { setIsPublished(e.target.checked); markDirty() }}
              />
              <span>{isPublished ? '🟢 Pubblicato' : '⚪ Bozza'}</span>
            </label>
          </div>

          <div className={styles.fields}>
            <div className={styles.field}>
              <label>Nome menu *</label>
              <input value={menuName} onChange={(e) => { setMenuName(e.target.value); markDirty() }} placeholder="Es. Degustazione Toscana 2026" />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Luogo</label>
                <input value={menuLocation} onChange={(e) => { setMenuLocation(e.target.value); markDirty() }} placeholder="Es. Ristorante Da Mario" />
              </div>
            </div>
            <div className={styles.field}>
              <label>Descrizione</label>
              <textarea value={menuDesc} onChange={(e) => { setMenuDesc(e.target.value); markDirty() }} placeholder="Descrizione opzionale del menu…" rows={2} />
            </div>
          </div>

          {isPublished && (
            <div className={styles.linkBox}>
              <span className={styles.linkUrl}>{playerLink}</span>
              <button className={styles.copyBtn} onClick={handleCopyLink}>
                {copyLink ? '✓ Copiato!' : '📋 Copia link'}
              </button>
            </div>
          )}
        </div>

        {/* Bottles */}
        <div className={styles.bottlesSection}>
          <div className={styles.sectionHeader}>
            <h2>🍾 Bottiglie ({bottles.length})</h2>
            <button className={styles.addBtn} onClick={addBottle}>+ Aggiungi bottiglia</button>
          </div>

          {bottles.length === 0 && (
            <div className={styles.emptyHint}>Aggiungi la prima bottiglia per iniziare.</div>
          )}

          {bottles.map((bottle, bi) => {
            const bKey = bottle.id ?? bottle._tmpId
            const isOpen = expandedBottle === bKey

            return (
              <div key={bKey} className={styles.bottleCard}>
                {/* Bottle header */}
                <div className={styles.bottleHeader}>
                  <div className={styles.bottleHeaderLeft}>
                    <span className={styles.bottleNum}>#{bi + 1}</span>
                    <button className={styles.bottleTitle} onClick={() => setExpandedBottle(isOpen ? null : bKey)}>
                      {bottle.name || <span className={styles.placeholder}>Nuova bottiglia</span>}
                      <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
                    </button>
                  </div>
                  <div className={styles.bottleHeaderActions}>
                    <button className={styles.iconBtn} onClick={() => moveBottle(bKey, 'up')} disabled={bi === 0} title="Sposta su">↑</button>
                    <button className={styles.iconBtn} onClick={() => moveBottle(bKey, 'down')} disabled={bi === bottles.length - 1} title="Sposta giù">↓</button>
                    <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => removeBottle(bKey)} title="Elimina bottiglia">✕</button>
                  </div>
                </div>

                {/* Bottle body */}
                {isOpen && (
                  <div className={styles.bottleBody}>
                    {/* Bottle fields */}
                    <div className={styles.bottleFields}>
                      <div className={styles.field}>
                        <label>Nome bottiglia *</label>
                        <input value={bottle.name} onChange={(e) => updateBottle(bKey, 'name', e.target.value)} placeholder="Es. Barolo Riserva" />
                      </div>
                      <div className={styles.fieldRow}>
                        <div className={styles.field}>
                          <label>Produttore</label>
                          <input value={bottle.producer ?? ''} onChange={(e) => updateBottle(bKey, 'producer', e.target.value)} placeholder="Es. Gaja" />
                        </div>
                        <div className={styles.fieldSmall}>
                          <label>Annata</label>
                          <input type="number" value={bottle.year ?? ''} onChange={(e) => updateBottle(bKey, 'year', e.target.value)} placeholder="2021" min="1900" max="2099" />
                        </div>
                      </div>
                      <div className={styles.fieldRow}>
                        <div className={styles.field}>
                          <label>Regione</label>
                          <input value={bottle.region ?? ''} onChange={(e) => updateBottle(bKey, 'region', e.target.value)} placeholder="Es. Piemonte" />
                        </div>
                        <div className={styles.field}>
                          <label>Vitigno</label>
                          <input value={bottle.varietal ?? ''} onChange={(e) => updateBottle(bKey, 'varietal', e.target.value)} placeholder="Es. Nebbiolo" />
                        </div>
                      </div>
                      <div className={styles.field}>
                        <label>Note di degustazione</label>
                        <textarea value={bottle.description ?? ''} onChange={(e) => updateBottle(bKey, 'description', e.target.value)} placeholder="Note che appaiono dopo il reveal…" rows={2} />
                      </div>
                    </div>

                    {/* Questions */}
                    <div className={styles.questionsSection}>
                      <div className={styles.questionsSectionHeader}>
                        <h4>Domande ({bottle.questions.length})</h4>
                        <button className={styles.addQBtn} onClick={() => addQuestion(bKey)}>+ Domanda</button>
                      </div>

                      {bottle.questions.map((q, qi) => {
                        const qKey = q.id ?? q._tmpId
                        const qOpen = expandedQuestion[bKey] === qKey

                        return (
                          <div key={qKey} className={styles.questionCard}>
                            <div className={styles.questionHeader}>
                              <button className={styles.questionTitle} onClick={() => setExpandedQuestion((prev) => ({ ...prev, [bKey]: qOpen ? null : qKey }))}>
                                <span className={styles.qNum}>D{qi + 1}</span>
                                <span className={styles.qText}>{q.text || <span className={styles.placeholder}>Nuova domanda</span>}</span>
                                <span className={styles.chevron}>{qOpen ? '▲' : '▼'}</span>
                              </button>
                              <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => removeQuestion(bKey, qKey)}>✕</button>
                            </div>

                            {qOpen && (
                              <div className={styles.questionBody}>
                                <div className={styles.field}>
                                  <label>Testo domanda *</label>
                                  <input value={q.text} onChange={(e) => updateQuestion(bKey, qKey, 'text', e.target.value)} placeholder="Es. Qual è il vitigno principale?" />
                                </div>

                                <div className={styles.optionsList}>
                                  <p className={styles.optionsLabel}>Risposte <span className={styles.optionsHint}>(seleziona la corretta)</span></p>
                                  {q.options.map((o, oi) => {
                                    const oKey = o.id ?? o._tmpId
                                    return (
                                      <div key={oKey} className={`${styles.optionRow} ${o.is_correct ? styles.optionRowCorrect : ''}`}>
                                        <input
                                          type="radio"
                                          name={`correct-${qKey}`}
                                          checked={o.is_correct}
                                          onChange={() => updateOption(bKey, qKey, oKey, 'is_correct', true)}
                                          title="Risposta corretta"
                                        />
                                        <input
                                          className={styles.optionInput}
                                          value={o.text}
                                          onChange={(e) => updateOption(bKey, qKey, oKey, 'text', e.target.value)}
                                          placeholder={`Opzione ${oi + 1}`}
                                        />
                                        <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => removeOption(bKey, qKey, oKey)}>✕</button>
                                      </div>
                                    )
                                  })}
                                  <button className={styles.addOptionBtn} onClick={() => addOption(bKey, qKey)}>+ Opzione</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {bottles.length > 0 && (
            <button className={styles.addBottleBottom} onClick={addBottle}>+ Aggiungi bottiglia</button>
          )}
        </div>

        {/* Bottom save */}
        <div className={styles.bottomBar}>
          {saveError && <span className={styles.errorInline}>{saveError}</span>}
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio…' : '💾 Salva tutto'}
          </button>
        </div>
      </div>
    </div>
  )
}
