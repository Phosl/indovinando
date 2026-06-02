import TopBarBack from '@/components/TopBarBack'
import {createServerSupabase} from '@/lib/supabaseServer'
import {requireSuperAdmin} from '@/lib/courseAdmin'
import {formatAppDate} from '@/lib/dateFormat'
import Link from 'next/link'
import ProduttoreDettaglioFiltersClient from '../../catalog/ProduttoreDettaglioFiltersClient'
import styles from '../../catalog/catalog.module.scss'

export const metadata = {
  title: 'Admin - Produttore',
}

const PAGE_SIZE = 100

function formatPrice(row) {
  if (row.price == null) return 'N/A'
  return `${row.price}${row.currency ? ` ${row.currency}` : ''}`
}

function formatGrapes(grapes) {
  if (!Array.isArray(grapes) || !grapes.length) return 'N/A'
  return grapes.join(', ')
}

export default async function AdminProduttoreDettaglioPage({searchParams}) {
  await requireSuperAdmin()

  const params = await searchParams
  const producerId = params?.producerId ? String(params.producerId).trim() : ''
  const producerFromQuery = params?.producer ? String(params.producer).trim() : ''
  const q = String(params?.q || '').trim()
  const type = String(params?.type || '').trim()
  const page = Math.max(1, Number.parseInt(String(params?.page || '1'), 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const supabase = await createServerSupabase()
  let producer = producerFromQuery

  if (producerId) {
    const {data: producerRow} = await supabase
      .from('wine_producers')
      .select('name')
      .eq('id', producerId)
      .single()
    producer = producerRow?.name || producerFromQuery
  }

  const baseSelect =
    'id, name, producer, appellation, type, country, region, grapes, vintage, abv, price, currency, last_updated'

  let query = supabase.from('wine_catalog').select(baseSelect, {count: 'exact'})
  if (producer) {
    query = query.eq('producer', producer)
  }
  if (q) query = query.ilike('name', `%${q}%`)
  if (type) query = query.eq('type', type)
  query = query.order('last_updated', {ascending: false, nullsFirst: false}).range(from, to)

  const {data: rows, error, count} = await query
  const totalRows = count || 0
  const totalPages = totalRows ? Math.max(1, Math.ceil(totalRows / PAGE_SIZE)) : 1
  const currentPage = Math.min(page, totalPages)
  const pageStart = totalRows ? from + 1 : 0
  const pageEnd = totalRows ? Math.min(from + (rows || []).length, totalRows) : 0

  const makePageHref = (nextPage) => {
    const searchParams = new URLSearchParams()
    if (producerId) searchParams.set('producerId', producerId)
    if (producerFromQuery) searchParams.set('producer', producerFromQuery)
    if (q) searchParams.set('q', q)
    if (type) searchParams.set('type', type)
    searchParams.set('page', String(nextPage))
    return `/admin/produttori/dettaglio?${searchParams.toString()}`
  }

  return (
    <main className={styles.page}>
      <TopBarBack
        title={producer ? `Produttore: ${producer}` : 'Produttore'}
        href="/admin/produttori"
      />

      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Lista bottiglie</h2>
          <p className={styles.hint}>
            {totalRows
              ? `Mostrate ${pageStart}-${pageEnd} di ${totalRows} bottiglie.`
              : 'Nessuna bottiglia trovata.'}
          </p>
        </div>
        <ProduttoreDettaglioFiltersClient producerId={producerId} q={q} type={type} />

        {error ? <p className={styles.empty}>Errore: {error.message}</p> : null}
        {!error && !(rows || []).length ? (
          <p className={styles.empty}>Nessuna bottiglia trovata.</p>
        ) : null}

        {!error && !!(rows || []).length ? (
          <div className={styles.list}>
            {(rows || []).map((row) => (
              <article key={row.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <div>
                    <p className={styles.title}>{row.name}</p>
                    <p className={styles.subtitle}>{row.appellation || 'Appellation N/A'}</p>
                  </div>
                  <p className={styles.metaText}>
                    {formatAppDate(row.last_updated, 'it') || 'Data N/A'}
                  </p>
                </div>

                <div className={styles.pillRow}>
                  <span className={`${styles.pill} ${styles.pillStrong}`}>
                    Tipo: {row.type || 'N/A'}
                  </span>
                  <span className={styles.pill}>Annata: {row.vintage || 'N/A'}</span>
                  <span className={styles.pill}>Prezzo: {formatPrice(row)}</span>
                </div>

                <div className={styles.grid}>
                  <div className={styles.gridItem}>
                    <span className={styles.label}>Paese / Regione</span>
                    <span className={styles.value}>
                      {[row.country, row.region].filter(Boolean).join(' - ') || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.gridItem}>
                    <span className={styles.label}>Vitigni</span>
                    <span className={styles.value}>{formatGrapes(row.grapes)}</span>
                  </div>
                  <div className={styles.gridItem}>
                    <span className={styles.label}>ABV</span>
                    <span className={styles.value}>{row.abv != null ? `${row.abv}%` : 'N/A'}</span>
                  </div>
                  <div className={styles.gridItem}>
                    <span className={styles.label}>Produttore</span>
                    <span className={styles.value}>{row.producer || 'N/A'}</span>
                  </div>
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
              href={currentPage <= 1 ? makePageHref(1) : makePageHref(currentPage - 1)}
              className={`${styles.pageButton} ${currentPage <= 1 ? styles.pageButtonDisabled : ''}`}>
              Indietro
            </Link>
            <span className={styles.pageInfo}>
              Pagina {currentPage} di {totalPages}
            </span>
            <Link
              aria-disabled={currentPage >= totalPages}
              tabIndex={currentPage >= totalPages ? -1 : 0}
              href={
                currentPage >= totalPages ? makePageHref(totalPages) : makePageHref(currentPage + 1)
              }
              className={`${styles.pageButton} ${currentPage >= totalPages ? styles.pageButtonDisabled : ''}`}>
              Avanti
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  )
}
