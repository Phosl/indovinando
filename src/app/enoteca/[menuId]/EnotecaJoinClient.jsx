'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabaseClient'
import styles from './enotecaJoin.module.scss'

export default function EnotecaJoinClient({
  menuId,
  menuName,
  menuDescription,
  menuLocation,
  bottleCount,
}) {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [tableName, setTableName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [existingSession, setExistingSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  const sessionKey = `enoteca_session_${menuId}`

  // On mount: check if player already has a session saved
  useEffect(() => {
    const savedId = localStorage.getItem(sessionKey)
    if (!savedId) { setCheckingSession(false); return }

    supabaseClient
      .from('enoteca_tasting_sessions')
      .select('id, nickname, current_bottle_index, status')
      .eq('id', savedId)
      .single()
      .then(({ data }) => {
        if (data) setExistingSession(data)
        setCheckingSession(false)
      })
  }, [sessionKey])

  const handleResume = () => {
    router.push(`/enoteca/${menuId}/play`)
  }

  const handleStart = async (e) => {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (!trimmed) { setError('Inserisci un nickname'); return }

    setError(null)
    setLoading(true)

    const { data: session, error: err } = await supabaseClient
      .from('enoteca_tasting_sessions')
      .insert({
        menu_id: menuId,
        nickname: trimmed,
        table_name: tableName.trim() || null,
      })
      .select('id')
      .single()

    if (err || !session) {
      setError("Errore durante l'avvio. Riprova.")
      setLoading(false)
      return
    }

    localStorage.setItem(sessionKey, session.id)
    router.push(`/enoteca/${menuId}/play`)
  }

  if (checkingSession) {
    return <div className={styles.loading}>Caricamento…</div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.wineBadge}>🍷</span>
          <h1 className={styles.menuName}>{menuName}</h1>
          {menuLocation && <p className={styles.location}>{menuLocation}</p>}
          {menuDescription && <p className={styles.description}>{menuDescription}</p>}
          <p className={styles.bottleCount}>{bottleCount} {bottleCount === 1 ? 'bottiglia' : 'bottiglie'}</p>
        </div>

        {existingSession && existingSession.status !== 'completed' ? (
          <div className={styles.resumeSection}>
            <p className={styles.resumeText}>
              Bentornato/a, <strong>{existingSession.nickname}</strong>! Hai una degustazione in corso.
            </p>
            <button className={styles.btnPrimary} onClick={handleResume}>
              Riprendi degustazione
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => { localStorage.removeItem(sessionKey); setExistingSession(null) }}
            >
              Inizia una nuova sessione
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleStart}>
            <div className={styles.field}>
              <label htmlFor="nickname">Nickname *</label>
              <input
                id="nickname"
                type="text"
                placeholder="Il tuo nome o nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={40}
                autoComplete="off"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="table">Tavolo (opzionale)</label>
              <input
                id="table"
                type="text"
                placeholder="es. Tavolo 3, Sala A…"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                maxLength={40}
                autoComplete="off"
              />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.btnPrimary} type="submit" disabled={loading}>
              {loading ? 'Avvio…' : '🍷 Inizia la degustazione'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
