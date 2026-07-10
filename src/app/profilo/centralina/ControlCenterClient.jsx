'use client'

import Link from 'next/link'
import {useEffect, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import styles from './controlCenter.module.scss'

const MANUAL_CHECKS = [
  {key: 'pwa-install', label: 'Installazione e apertura PWA da Home'},
  {key: 'safe-area', label: 'Safe-area e top bar su iPhone reale'},
  {key: 'qr-second-device', label: 'QR table-live con un secondo dispositivo'},
  {key: 'background-refresh', label: 'Ritorno da background e refresh durante una domanda'},
  {key: 'forced-close', label: 'Chiusura forzata PWA con partecipante attivo'},
  {key: 'stripe-checkout', label: 'Checkout Stripe completo e ritorno success/cancel'},
]

const TOOL_LINKS = [
  {href: '/admin', label: 'Amministrazione', description: 'Corsi, produttori e catalogo vini'},
  {href: '/profilo/crediti', label: 'Crediti e Stripe', description: 'Transazioni e andamento ricavi'},
  {href: '/landingpage', label: 'Landing interna', description: 'Controllo landing anche da autenticato'},
  {href: '/changelog', label: 'Changelog', description: 'Versioni e modifiche pubblicate'},
]

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function StatusBadge({status, label}) {
  const safeStatus = ['ok', 'warning', 'error', 'off', 'info', 'passed'].includes(status)
    ? status
    : 'info'
  const text =
    label ||
    ({
      ok: 'OK',
      passed: 'Superato',
      warning: 'Attenzione',
      error: 'Errore',
      off: 'Non attivo',
      info: 'Info',
    }[safeStatus] ?? 'Info')

  return <span className={`${styles.statusBadge} ${styles[safeStatus]}`}>{text}</span>
}

function SectionHeader({eyebrow, title, description}) {
  return (
    <header className={styles.sectionHeader}>
      {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </header>
  )
}

export default function ControlCenterClient({initialSnapshot}) {
  const router = useRouter()
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [runningScope, setRunningScope] = useState('')
  const [runtimeError, setRuntimeError] = useState('')
  const [visionStatus, setVisionStatus] = useState({status: 'idle', detail: ''})
  const [manualChecks, setManualChecks] = useState({})

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('admin_control_center_manual_checks') || '{}')
      setManualChecks(saved && typeof saved === 'object' ? saved : {})
    } catch {
      setManualChecks({})
    }
  }, [])

  const completedManualChecks = useMemo(
    () => MANUAL_CHECKS.filter((check) => manualChecks[check.key]).length,
    [manualChecks],
  )

  const runChecks = async (scope) => {
    if (runningScope) return
    setRunningScope(scope)
    setRuntimeError('')
    try {
      const response = await fetch(`/api/admin/control-center?scope=${scope}`, {
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload) {
        throw new Error(payload?.error || 'Controlli non disponibili')
      }
      setSnapshot(payload)
    } catch (error) {
      setRuntimeError(error?.message || 'Controlli non disponibili')
    } finally {
      setRunningScope('')
    }
  }

  const runVisionCheck = async () => {
    if (visionStatus.status === 'running') return
    setVisionStatus({status: 'running', detail: 'Controllo OpenAI in corso…'})
    try {
      const response = await fetch('/api/auto-tasting/vision-health', {cache: 'no-store'})
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'OpenAI non raggiungibile')
      }
      setVisionStatus({
        status: 'ok',
        detail: `${payload.message}${payload.model ? ` · ${payload.model}` : ''}`,
      })
    } catch (error) {
      setVisionStatus({status: 'error', detail: error?.message || 'Test AI fallito'})
    }
  }

  const toggleManualCheck = (key) => {
    setManualChecks((current) => {
      const next = {...current, [key]: !current[key]}
      localStorage.setItem('admin_control_center_manual_checks', JSON.stringify(next))
      return next
    })
  }

  const resetManualChecks = () => {
    setManualChecks({})
    localStorage.removeItem('admin_control_center_manual_checks')
  }

  const overallLabel =
    snapshot.status === 'ok'
      ? 'Tutto operativo'
      : snapshot.status === 'warning'
        ? 'Richiede attenzione'
        : 'Intervento necessario'

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <TopBar title="Centralina app" onBack={() => router.push('/profilo')} maxWidth="980px" />

        <section className={`${styles.hero} ${styles[snapshot.status]}`}>
          <div className={styles.heroStatus}>
            <span className={styles.pulse} aria-hidden="true" />
            <div>
              <span className={styles.eyebrow}>Super admin</span>
              <h1>{overallLabel}</h1>
            </div>
          </div>
          <div className={styles.deploymentGrid}>
            <div>
              <span>Versione</span>
              <strong>{snapshot.deployment.version}</strong>
            </div>
            <div>
              <span>Ambiente</span>
              <strong>{snapshot.deployment.environment}</strong>
            </div>
            <div>
              <span>Commit</span>
              <strong>{snapshot.deployment.commit || 'locale'}</strong>
            </div>
            <div>
              <span>Ultimo check</span>
              <strong>{formatDate(snapshot.generatedAt)}</strong>
            </div>
          </div>
          <div className={styles.heroActions}>
            <button
              type="button"
              className="btn primary btn-small"
              onClick={() => runChecks('quick')}
              disabled={Boolean(runningScope)}>
              {runningScope === 'quick' ? 'Controllo…' : 'Controllo rapido'}
            </button>
            <button
              type="button"
              className="btn secondary btn-small"
              onClick={() => runChecks('deep')}
              disabled={Boolean(runningScope)}>
              {runningScope === 'deep' ? 'Analisi…' : 'Analisi completa'}
            </button>
          </div>
          <p className={styles.runMeta}>
            {snapshot.scope === 'deep' ? 'Analisi completa' : 'Controllo rapido'} in{' '}
            {snapshot.durationMs} ms
          </p>
          {runtimeError ? <p className={styles.errorMessage}>{runtimeError}</p> : null}
        </section>

        <section className={styles.section}>
          <SectionHeader
            eyebrow="Panoramica"
            title="Numeri operativi"
            description="Conteggi anonimi e segnali utili per capire subito cosa sta succedendo."
          />
          <div className={styles.metricsGrid}>
            {snapshot.metrics.map((metric) => (
              <article key={metric.key} className={`${styles.metricCard} ${styles[metric.status]}`}>
                <span>{metric.label}</span>
                <strong>{metric.value ?? '—'}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader
            eyebrow="Runtime"
            title="Servizi e database"
            description="Ogni controllo è realmente eseguito sul deployment corrente."
          />
          <div className={styles.checkList}>
            {snapshot.services.map((service) => (
              <div key={service.key} className={styles.checkRow}>
                <div>
                  <strong>{service.label}</strong>
                  <span>{service.detail}</span>
                </div>
                <div className={styles.checkMeta}>
                  <span>{service.durationMs} ms</span>
                  <StatusBadge status={service.status} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader
            eyebrow="Configurazione"
            title="Feature collegate"
            description="Mostra solo se una variabile è presente. Nessun valore o segreto viene inviato al browser."
          />
          <div className={styles.configGrid}>
            {snapshot.configuration.map((group) => (
              <article key={group.key} className={styles.configCard}>
                <div className={styles.configHeader}>
                  <div>
                    <h3>{group.label}</h3>
                    <p>
                      {group.configuredCount}/{group.totalCount} configurate
                    </p>
                  </div>
                  <StatusBadge status={group.status} />
                </div>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <span className={item.configured ? styles.itemOk : styles.itemMissing}>
                        {item.configured ? 'Configurata' : 'Manca'}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader
            eyebrow="Test su richiesta"
            title="AI e riconoscimento"
            description="Il test esegue una piccola richiesta reale a OpenAI. Avvialo solo quando serve."
          />
          <div className={styles.actionTest}>
            <div>
              <strong>OpenAI Vision</strong>
              <span>{visionStatus.detail || 'Non ancora verificato in questa sessione.'}</span>
            </div>
            <div className={styles.actionTestControls}>
              <StatusBadge
                status={
                  visionStatus.status === 'idle'
                    ? 'off'
                    : visionStatus.status === 'running'
                      ? 'info'
                      : visionStatus.status
                }
                label={visionStatus.status === 'running' ? 'In corso' : undefined}
              />
              <button
                type="button"
                className="btn ai btn-small"
                onClick={runVisionCheck}
                disabled={visionStatus.status === 'running'}>
                Test AI
              </button>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader
            eyebrow="Ultimo E2E"
            title="Flusso table-live"
            description="Validazione completa con sessioni QA eliminate automaticamente a fine test."
          />
          <div className={styles.reportCard}>
            <div className={styles.reportHeader}>
              <div>
                <strong>Host + guest · instant + end</strong>
                <span>{formatDate(snapshot.reports.tableLive.lastRunAt)}</span>
              </div>
              <StatusBadge status={snapshot.reports.tableLive.status} />
            </div>
            <div className={styles.reportChecks}>
              {snapshot.reports.tableLive.checks.map((check) => (
                <span key={check}>✓ {check}</span>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader
            eyebrow="Dispositivi reali"
            title="Checklist manuale"
            description="Resta salvata solo su questo dispositivo e completa i test automatici."
          />
          <div className={styles.manualHeader}>
            <strong>
              {completedManualChecks}/{MANUAL_CHECKS.length} completati
            </strong>
            <button type="button" className="btn btn-only-text" onClick={resetManualChecks}>
              Azzera
            </button>
          </div>
          <div className={styles.manualList}>
            {MANUAL_CHECKS.map((check) => (
              <label key={check.key} className={styles.manualRow}>
                <input
                  type="checkbox"
                  checked={Boolean(manualChecks[check.key])}
                  onChange={() => toggleManualCheck(check.key)}
                />
                <span>{check.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader eyebrow="Scorciatoie" title="Strumenti operativi" />
          <div className={styles.toolsGrid}>
            {TOOL_LINKS.map((tool) => (
              <Link key={tool.href} href={tool.href} className={styles.toolCard}>
                <strong>{tool.label}</strong>
                <span>{tool.description}</span>
                <span className={styles.toolArrow}>→</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
