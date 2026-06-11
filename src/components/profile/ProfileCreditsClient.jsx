'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'
import InfoModal from '@/components/InfoModal'
import Icon from '@/components/Icon'
import {useT} from '@/lib/i18n/useT'
import {normalizeAiScanCredits} from '@/lib/aiScanCredits'
import styles from '@/app/profilo/profilo.module.scss'

const CREDIT_PACK_OPTIONS = [
  {code: 'credits_10', credits: 10, amount: '€1.99'},
  {code: 'credits_30', credits: 30, amount: '€4.99'},
  {code: 'credits_100', credits: 100, amount: '€12.99'},
]

function ProfileToast({toast, onClose, closeLabel}) {
  useEffect(() => {
    if (!toast) return undefined
    const timeoutId = window.setTimeout(() => onClose(), toast.duration || 3200)
    return () => window.clearTimeout(timeoutId)
  }, [onClose, toast])

  if (!toast) return null

  return (
    <div className={styles.toastViewport} aria-live="polite">
      <div
        className={`${styles.toast} ${
          toast.tone === 'success'
            ? styles.toastSuccess
            : toast.tone === 'error'
              ? styles.toastError
              : styles.toastInfo
        }`}>
        <span className={styles.toastMessage}>{toast.message}</span>
        <button type="button" className={styles.toastClose} onClick={onClose} aria-label={closeLabel}>
          ×
        </button>
      </div>
    </div>
  )
}

function formatCreditsCurrency(amountCents = 0, currency = 'EUR') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: String(currency || 'EUR').toUpperCase(),
  }).format(Number(amountCents || 0) / 100)
}

function formatCreditsDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default function ProfileCreditsClient({
  profileData,
  myCreditOrders = [],
  adminCreditSnapshot = null,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = useT('profile')
  const tc = useT('common')
  const [showCreditsModal, setShowCreditsModal] = useState(false)
  const [activeCreditsTab, setActiveCreditsTab] = useState('mine')
  const [isBuyingCredits, setIsBuyingCredits] = useState(false)
  const [toast, setToast] = useState(null)

  const aiCredits = useMemo(() => normalizeAiScanCredits(profileData || {}), [profileData])
  const isSuperAdmin = profileData?.super_admin === true
  const hasCreditHistory = myCreditOrders.length > 0
  const adminChartMax = useMemo(() => {
    const values = (adminCreditSnapshot?.chart || []).map((item) => Number(item.revenueCents || 0))
    return Math.max(0, ...values)
  }, [adminCreditSnapshot])

  useEffect(() => {
    const stripeStatus = searchParams.get('stripe')
    if (!stripeStatus) return

    if (stripeStatus === 'success') {
      setToast({tone: 'success', message: t('creditsPurchaseSuccess')})
    } else if (stripeStatus === 'cancel') {
      setToast({tone: 'info', message: t('creditsPurchaseCancelled')})
    }

    router.replace(pathname, {scroll: false})
  }, [pathname, router, searchParams, t])

  const handleBuyCredits = useCallback(
    async (packCode) => {
      if (isBuyingCredits) return
      setIsBuyingCredits(true)

      try {
        const response = await fetch('/api/stripe/checkout-session', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({packCode}),
        })
        const result = await response.json().catch(() => ({}))

        if (!response.ok || !result?.url) {
          throw new Error(result?.error || t('creditsPurchaseError'))
        }

        window.location.href = result.url
      } catch (error) {
        setToast({
          tone: 'error',
          message: error?.message || t('creditsPurchaseError'),
          duration: 4200,
        })
      } finally {
        setIsBuyingCredits(false)
      }
    },
    [isBuyingCredits, t],
  )

  return (
    <>
      <ProfileToast toast={toast} onClose={() => setToast(null)} closeLabel={tc('close')} />

      <section className={styles.card}>
        <div className={styles.creditSectionHeader}>
          <div>
            <h2>{t('creditsPageTitle')}</h2>
            <p className={styles.quickInfoText}>{t('creditsPageDescription')}</p>
          </div>
          <span className={styles.creditsBadge}>{aiCredits.remaining}</span>
        </div>

        <div className={styles.creditsSummaryRow}>
          <span className={styles.labelWithIcon}>
            <Icon src="/icons/token.svg" size={18} />
            <span className={styles.creditsSummaryLabel}>{t('creditsAvailableLabel')}</span>
          </span>
          <strong className={styles.creditsSummaryValue}>
            {t('creditsPackTitle', {count: String(aiCredits.remaining)})}
          </strong>
        </div>

        <div className={styles.creditsActions}>
          <p className={styles.creditsHint}>{t('creditsHint')}</p>
          <button
            type="button"
            className={`btn success ${styles.buyCreditsBtn}`}
            onClick={() => setShowCreditsModal(true)}>
            {t('buyCredits')}
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.creditSectionHeader}>
          <div>
            <h2>{t('creditsHistoryTitle')}</h2>
            <p className={styles.quickInfoText}>
              {isSuperAdmin && activeCreditsTab === 'admin'
                ? t('creditsAdminDescription')
                : t('creditsHistoryDescription')}
            </p>
          </div>
        </div>

        {isSuperAdmin ? (
          <div className={styles.creditTabs} role="tablist" aria-label={t('creditsTabsLabel')}>
            <button
              type="button"
              role="tab"
              aria-selected={activeCreditsTab === 'mine'}
              className={`${styles.creditTabBtn} ${
                activeCreditsTab === 'mine' ? styles.creditTabBtnActive : ''
              }`}
              onClick={() => setActiveCreditsTab('mine')}>
              {t('creditsTabMine')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeCreditsTab === 'admin'}
              className={`${styles.creditTabBtn} ${
                activeCreditsTab === 'admin' ? styles.creditTabBtnActive : ''
              }`}
              onClick={() => setActiveCreditsTab('admin')}>
              {t('creditsTabAdmin')}
            </button>
          </div>
        ) : null}

        {activeCreditsTab === 'mine' ? (
          hasCreditHistory ? (
            <div className={styles.creditHistoryList}>
              {myCreditOrders.map((order) => (
                <div key={order.id} className={styles.creditHistoryItem}>
                  <div className={styles.creditHistoryMain}>
                    <strong className={styles.creditHistoryTitle}>
                      {t('creditsPackTitle', {count: String(order.credits_amount || 0)})}
                    </strong>
                    <span className={styles.creditHistoryMeta}>
                      {formatCreditsDate(order.completed_at || order.created_at)}
                    </span>
                  </div>
                  <div className={styles.creditHistorySide}>
                    <span className={styles.creditHistoryAmount}>
                      {formatCreditsCurrency(order.amount_cents, order.currency)}
                    </span>
                    <span
                      className={`${styles.creditHistoryStatus} ${
                        order.status === 'completed'
                          ? styles.creditHistoryStatusSuccess
                          : styles.creditHistoryStatusNeutral
                      }`}>
                      {order.status === 'completed' ? t('creditsStatusCompleted') : order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.creditEmptyState}>{t('creditsHistoryEmpty')}</p>
          )
        ) : adminCreditSnapshot ? (
          <div className={styles.adminCreditsPanel}>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{adminCreditSnapshot.totalCompletedOrders}</span>
                <span className={styles.statLabel}>{t('creditsAdminTotalOrders')}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{adminCreditSnapshot.totalCreditsSold}</span>
                <span className={styles.statLabel}>{t('creditsAdminTotalCredits')}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>
                  {formatCreditsCurrency(adminCreditSnapshot.totalRevenueCents)}
                </span>
                <span className={styles.statLabel}>{t('creditsAdminTotalRevenue')}</span>
              </div>
            </div>

            <div className={styles.creditChartCard}>
              <div className={styles.creditChartHeader}>
                <strong>{t('creditsAdminChartTitle')}</strong>
                <span>{t('creditsAdminChartHint')}</span>
              </div>
              <div className={styles.creditChart}>
                {(adminCreditSnapshot.chart || []).map((item) => {
                  const ratio =
                    adminChartMax > 0
                      ? Math.max(8, Math.round((item.revenueCents / adminChartMax) * 100))
                      : 8
                  return (
                    <div key={item.key} className={styles.creditChartCol}>
                      <span className={styles.creditChartValue}>
                        {formatCreditsCurrency(item.revenueCents)}
                      </span>
                      <span className={styles.creditChartBarWrap}>
                        <span className={styles.creditChartBar} style={{height: `${ratio}%`}} />
                      </span>
                      <span className={styles.creditChartLabel}>{item.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={styles.creditHistoryList}>
              {(adminCreditSnapshot.recentOrders || []).map((order) => (
                <div key={order.id} className={styles.creditHistoryItem}>
                  <div className={styles.creditHistoryMain}>
                    <strong className={styles.creditHistoryTitle}>
                      {t('creditsPackTitle', {count: String(order.credits_amount || 0)})}
                    </strong>
                    <span className={styles.creditHistoryMeta}>
                      {formatCreditsDate(order.completed_at || order.created_at)} · {order.user_id}
                    </span>
                  </div>
                  <div className={styles.creditHistorySide}>
                    <span className={styles.creditHistoryAmount}>
                      {formatCreditsCurrency(order.amount_cents, order.currency)}
                    </span>
                    <span
                      className={`${styles.creditHistoryStatus} ${
                        order.status === 'completed'
                          ? styles.creditHistoryStatusSuccess
                          : styles.creditHistoryStatusNeutral
                      }`}>
                      {order.status === 'completed' ? t('creditsStatusCompleted') : order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className={styles.creditEmptyState}>{t('creditsAdminEmpty')}</p>
        )}
      </section>

      <InfoModal
        isOpen={showCreditsModal}
        onClose={() => {
          if (isBuyingCredits) return
          setShowCreditsModal(false)
        }}
        title={t('creditsModalTitle')}
        icon="">
        <p>{t('creditsModalDescription')}</p>
        <div className={styles.creditPackList}>
          {CREDIT_PACK_OPTIONS.map((pack) => (
            <div key={pack.code} className={styles.creditPackCard}>
              <div className={styles.creditPackMeta}>
                <strong className={styles.creditPackTitle}>
                  {t('creditsPackTitle', {count: String(pack.credits)})}
                </strong>
                <span className={styles.creditPackSubtitle}>
                  {t('creditsPackSubtitle', {count: String(pack.credits)})}
                </span>
              </div>
              <div className={styles.creditPackAction}>
                <span className={styles.creditPackPrice}>{pack.amount}</span>
                <button
                  type="button"
                  className="btn success btn-small"
                  onClick={() => handleBuyCredits(pack.code)}
                  disabled={isBuyingCredits}>
                  {isBuyingCredits ? t('creditsPurchaseLoading') : t('creditsPurchaseAction')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </InfoModal>
    </>
  )
}
