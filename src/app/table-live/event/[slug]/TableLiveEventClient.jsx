'use client'

import {useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import AvatarDisplay from '@/components/AvatarDisplay'
import styles from './tableLiveEvent.module.scss'

function persistPlayer(sessionId, payload, avatarId) {
  try {
    localStorage.setItem(
      `table_live_player_${sessionId}`,
      JSON.stringify({
        playerId: payload.playerId,
        playerToken: payload.playerToken,
        nickname: payload.nickname,
        avatarId,
      }),
    )
  } catch {}
}

export default function TableLiveEventClient({eventSlug, eventTitle, gameName}) {
  const router = useRouter()
  const [step, setStep] = useState('home') // home | create | join
  const [nickname, setNickname] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [selectedAvatarId, setSelectedAvatarId] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const title = useMemo(() => `${eventTitle} · ${gameName}`, [eventTitle, gameName])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!nickname.trim()) {
      setError('Inserisci un nickname')
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/table-live/session/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          eventSlug,
          nickname: nickname.trim(),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.sessionId) {
        setError(payload?.error || 'Impossibile creare la partita')
        return
      }
      persistPlayer(payload.sessionId, payload, selectedAvatarId)
      router.push(`/table-live/session/${payload.sessionId}`)
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!nickname.trim()) {
      setError('Inserisci un nickname')
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/table-live/session/join', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          eventSlug,
          nickname: nickname.trim(),
          joinCode: joinCode.trim(),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.sessionId) {
        setError(payload?.error || 'Impossibile entrare nella partita')
        return
      }
      persistPlayer(payload.sessionId, payload, selectedAvatarId)
      router.push(`/table-live/session/${payload.sessionId}`)
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBarWrap}>
        <TopBar title="Live Tavoli" onBack={() => router.push('/')} />
      </div>
      <main className={styles.container}>
        <header className={styles.header}>
          <img src="/logo.svg" alt="Indovinando Logo" className={styles.logo} />
          <h1>{eventTitle}</h1>
          <p>{gameName}</p>
        </header>

        {step === 'home' ? (
          <section className={styles.card}>
            <label>Inserisci il codice partita</label>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D+/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="0000"
            />
            <button
              className="btn primary"
              type="button"
              onClick={() => {
                if (!joinCode.trim()) {
                  setError('Inserisci il codice partita')
                  return
                }
                setError('')
                setStep('join')
              }}>
              Partecipa
            </button>
            <hr className={styles.orSeparator} />
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                setError('')
                setStep('create')
              }}>
              Crea partita
            </button>
            {error ? <p className={styles.error}>{error}</p> : null}
          </section>
        ) : null}

        {step === 'create' ? (
          <form className={styles.card} onSubmit={handleCreate}>
            <h2>Crea partita</h2>
            <label>Nickname</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={40}
              placeholder="Es. Marco"
            />
            <label>Avatar</label>
            <div className={styles.avatarGrid}>
              {Array.from({length: 10}).map((_, idx) => {
                const avatarId = idx + 1
                return (
                  <button
                    key={avatarId}
                    type="button"
                    className={`${styles.avatarButton} ${
                      selectedAvatarId === avatarId ? styles.avatarSelected : ''
                    }`}
                    onClick={() => setSelectedAvatarId(avatarId)}>
                    <AvatarDisplay avatarId={avatarId} size={28} />
                  </button>
                )
              })}
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
            <button className="btn success" type="submit" disabled={loading}>
              {loading ? 'Creazione...' : 'Crea e inizia'}
            </button>
            <button className="btn secondary" type="button" onClick={() => setStep('home')}>
              Indietro
            </button>
          </form>
        ) : null}

        {step === 'join' ? (
          <form className={styles.card} onSubmit={handleJoin}>
            <h2>Partecipa</h2>
            <label>Codice partita</label>
            <div className={styles.codeValue}>{joinCode}</div>
            <label>Nickname</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={40}
              placeholder="Es. Giulia"
            />
            <label>Avatar</label>
            <div className={styles.avatarGrid}>
              {Array.from({length: 10}).map((_, idx) => {
                const avatarId = idx + 1
                return (
                  <button
                    key={avatarId}
                    type="button"
                    className={`${styles.avatarButton} ${
                      selectedAvatarId === avatarId ? styles.avatarSelected : ''
                    }`}
                    onClick={() => setSelectedAvatarId(avatarId)}>
                    <AvatarDisplay avatarId={avatarId} size={28} />
                  </button>
                )
              })}
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
            <button className="btn success" type="submit" disabled={loading}>
              {loading ? 'Ingresso...' : 'Partecipa'}
            </button>
            <button className="btn secondary" type="button" onClick={() => setStep('home')}>
              Indietro
            </button>
          </form>
        ) : null}

        <p className={styles.hint}>Evento: {title}</p>
      </main>
      <button className={styles.discoverAppBtn} type="button" onClick={() => router.push('/auth')}>
        Scopri l&apos;app
      </button>
    </div>
  )
}
