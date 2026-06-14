import {createServerSupabase} from '@/lib/supabaseServer'
import {requireSuperAdmin} from '@/lib/courseAdmin'
import {formatAppDate} from '@/lib/dateFormat'
import {getLocaleText} from '@/lib/i18n/getLocaleText'
import {getServerLanguage} from '@/lib/i18n/server'
import Link from 'next/link'
import ViniFiltersClient from '../catalog/ViniFiltersClient'
import styles from '../catalog/catalog.module.scss'

export const metadata = {
  title: 'Admin - Vini',
}

const PAGE_SIZE = 100
const SELECT_WITH_QUIZ_REGION =
  'id, name, producer, country, region, quiz_region, appellation, quiz_appellation, type, grapes, vintage, abv, price, price_min, price_max, currency, price_band, quiz_price_band, body, acidity, last_updated'
const SELECT_LEGACY_COMPAT =
  'id, name, producer, country, region, appellation, type, grapes, vintage, abv, price, currency, last_updated'

function formatRowMeta(row) {
  return [row.country, row.region].filter(Boolean).join(' - ') || 'Origine N/A'
}

function formatPrice(row) {
  const currency = row.currency ? ` ${row.currency}` : ''
  if (row.price_min != null && row.price_max != null) {
    if (row.price_min === row.price_max) return `${row.price_min}${currency}`
    return `${row.price_min}-${row.price_max}${currency}`
  }
  if (row.price != null) return `${row.price}${currency}`
  return 'N/A'
}

function formatGrapes(grapes) {
  if (!Array.isArray(grapes) || !grapes.length) return 'N/A'
  return grapes.join(', ')
}

export default async function AdminViniPage({searchParams}) {
  await requireSuperAdmin()

  const lang = await getServerLanguage()
  const t = getLocaleText(lang, 'admin.catalog', {})
  const params = await searchParams
  const supabase = await createServerSupabase()
  const q = String(params?.q || '').trim()
  const producer = String(params?.producer || '').trim()
  const type = String(params?.type || '').trim()
  const country = String(params?.country || '').trim()
  const requestedPage = Math.max(1, Number.parseInt(String(params?.page || '1'), 10) || 1)

  const applyFilters = (baseQuery) => {
    let nextQuery = baseQuery
    if (q) nextQuery = nextQuery.ilike('name', `%${q}%`)
    if (producer) nextQuery = nextQuery.ilike('producer', `%${producer}%`)
    if (type) nextQuery = nextQuery.eq('type', type)
    if (country) nextQuery = nextQuery.ilike('country', `%${country}%`)
    return nextQuery
  }

  const fetchPage = async (pageNumber, selectClause = SELECT_WITH_QUIZ_REGION) => {
    const from = (pageNumber - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const baseQuery = supabase
      .from('wine_catalog')
      .select(selectClause, {count: 'exact'})
      .order('last_updated', {ascending: false, nullsFirst: false})
      .range(from, to)
    return applyFilters(baseQuery)
  }

  let effectivePage = requestedPage
  let activeSelect = SELECT_WITH_QUIZ_REGION
  let {data: rows, error, count} = await fetchPage(effectivePage, activeSelect)

  // Backward compatibility: older wine_catalog views may miss newer quiz/catalog columns.
  if (error?.code === '42703') {
    activeSelect = SELECT_LEGACY_COMPAT
    const fallback = await fetchPage(effectivePage, activeSelect)
    rows = fallback.data
    error = fallback.error
    count = fallback.count
  }

  const totalRows = count || 0
  const totalPages = totalRows ? Math.max(1, Math.ceil(totalRows / PAGE_SIZE)) : 1
  if (!error && totalRows > 0 && effectivePage > totalPages) {
    effectivePage = totalPages
    const fallbackResult = await fetchPage(effectivePage, activeSelect)
    rows = fallbackResult.data
    error = fallbackResult.error
  }

  const currentPage = Math.min(effectivePage, totalPages)
  const from = (currentPage - 1) * PAGE_SIZE
  const pageStart = totalRows ? from + 1 : 0
  const pageEnd = totalRows ? Math.min(from + (rows || []).length, totalRows) : 0

  const makePageHref = (nextPage) => {
    const searchParams = new URLSearchParams()
    if (q) searchParams.set('q', q)
    if (producer) searchParams.set('producer', producer)
    if (type) searchParams.set('type', type)
    if (country) searchParams.set('country', country)
    searchParams.set('page', String(nextPage))
    return `/admin/vini?${searchParams.toString()}`
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>{t.winesListTitle || 'Lista vini'}</h2>
          <p className={styles.hint}>
            {totalRows
              ? (t.resultsRange || 'Mostrati {start}-{end} di {total} risultati.')
                  .replace('{start}', String(pageStart))
                  .replace('{end}', String(pageEnd))
                  .replace('{total}', String(totalRows))
              : t.noCatalogResults || 'Nessun risultato nel catalogo.'}
          </p>
        </div>
        <ViniFiltersClient q={q} producer={producer} type={type} country={country} />

        {error ? <p className={styles.empty}>{`${t.errorLabel || 'Errore'}: ${error.message}`}</p> : null}
        {!error && !(rows || []).length ? (
          <p className={styles.empty}>{t.noWinesFound || 'Nessun vino trovato.'}</p>
        ) : null}

        {!error && !!(rows || []).length ? (
          <div className={styles.list}>
            {(rows || []).map((row) => (
              <article key={row.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <div>
                    <p className={styles.title}>
                      {row.name}
                      {row.producer ? ` - ${row.producer}` : ''}
                    </p>
                    <p className={styles.subtitle}>{row.appellation || t.appellationEmpty || 'Appellation N/A'}</p>
                  </div>
                  <p className={styles.metaText}>
                    {formatAppDate(row.last_updated, lang) || t.dateEmpty || 'Data N/A'}
                  </p>
                </div>

                <div className={styles.pillRow}>
                  <span className={`${styles.pill} ${styles.pillStrong}`}>
                    {(t.typeLabel || 'Tipo') + ': '} {row.type || 'N/A'}
                  </span>
                  <span className={styles.pill}>{(t.vintageLabel || 'Annata') + ': '} {row.vintage || 'N/A'}</span>
                  <span className={styles.pill}>{(t.priceLabel || 'Prezzo') + ': '} {formatPrice(row)}</span>
                  {row.price_band || row.quiz_price_band ? (
                    <span className={styles.pill}>
                      {(t.bandLabel || 'Fascia') + ': '} {row.price_band || row.quiz_price_band}
                    </span>
                  ) : null}
                </div>

                <div className={styles.grid}>
                  <div className={styles.gridItem}>
                    <span className={styles.label}>{t.countryRegionLabel || 'Paese / Regione'}</span>
                    <span className={styles.value}>{formatRowMeta(row)}</span>
                  </div>
                  {row.quiz_region || row.quiz_appellation ? (
                    <div className={styles.gridItem}>
                      <span className={styles.label}>{t.quizAreaLabel || 'Quiz zona'}</span>
                      <span className={styles.value}>
                        {[row.quiz_region, row.quiz_appellation].filter(Boolean).join(' / ')}
                      </span>
                    </div>
                  ) : null}
                  <div className={styles.gridItem}>
                    <span className={styles.label}>{t.grapesLabel || 'Vitigni'}</span>
                    <span className={styles.value}>{formatGrapes(row.grapes)}</span>
                  </div>
                  <div className={styles.gridItem}>
                    <span className={styles.label}>ABV</span>
                    <span className={styles.value}>{row.abv != null ? `${row.abv}%` : 'N/A'}</span>
                  </div>
                  {row.body || row.acidity ? (
                    <div className={styles.gridItem}>
                      <span className={styles.label}>{t.bodyAcidityLabel || 'Corpo / Acidità'}</span>
                      <span className={styles.value}>
                        {[row.body, row.acidity].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!error && totalPages > 1 ? (
          <div className={styles.pagination}>
            <Link
              aria-disabled={currentPage <= 1}
              tabIndex={currentPage <= 1 ? -1 : 0}
              scroll={true}
              href={currentPage <= 1 ? '/admin/vini' : makePageHref(currentPage - 1)}
              className={`${styles.pageButton} ${currentPage <= 1 ? styles.pageButtonDisabled : ''}`}>
              {t.backPagination || 'Indietro'}
            </Link>
            <span className={styles.pageInfo}>
              {(t.pageInfo || 'Pagina {current} di {total}')
                .replace('{current}', String(currentPage))
                .replace('{total}', String(totalPages))}
            </span>
            <Link
              aria-disabled={currentPage >= totalPages}
              tabIndex={currentPage >= totalPages ? -1 : 0}
              scroll={true}
              href={
                currentPage >= totalPages ? makePageHref(totalPages) : makePageHref(currentPage + 1)
              }
              className={`${styles.pageButton} ${currentPage >= totalPages ? styles.pageButtonDisabled : ''}`}>
              {t.nextPagination || 'Avanti'}
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  )
}
