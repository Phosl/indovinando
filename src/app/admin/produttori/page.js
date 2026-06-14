import Link from 'next/link'
import {createServerSupabase} from '@/lib/supabaseServer'
import {requireSuperAdmin} from '@/lib/courseAdmin'
import ProduttoriFiltersClient from '../catalog/ProduttoriFiltersClient'
import styles from '../catalog/catalog.module.scss'

export const metadata = {
  title: 'Admin - Produttori',
}

const PAGE_SIZE = 50

export default async function AdminProduttoriPage({searchParams}) {
  await requireSuperAdmin()

  const params = await searchParams
  const supabase = await createServerSupabase()
  const q = String(params?.q || '').trim()
  const page = Math.max(1, Number.parseInt(String(params?.page || '1'), 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let producersQuery = supabase
    .from('wine_producers')
    .select('id, name, country, region', {count: 'exact'})
    .order('name', {ascending: true})
    .range(from, to)
  if (q) producersQuery = producersQuery.ilike('name', `%${q}%`)

  const producersResult = await producersQuery

  const rows = producersResult.data || []
  const error = producersResult.error
  const totalRows = producersResult.count || 0
  const totalPages = totalRows ? Math.max(1, Math.ceil(totalRows / PAGE_SIZE)) : 1
  const currentPage = Math.min(page, totalPages)
  const pageStart = totalRows ? from + 1 : 0
  const pageEnd = totalRows ? Math.min(from + rows.length, totalRows) : 0

  const statsResult = rows.length
    ? await supabase
        .from('wine_catalog_producer_stats')
        .select('producer, wines_count')
        .in('producer', rows.map((row) => row.name).filter(Boolean))
    : {data: []}

  const statsByProducer = new Map((statsResult.data || []).map((s) => [s.producer, s.wines_count]))

  const makePageHref = (nextPage) => {
    const searchParams = new URLSearchParams()
    if (q) searchParams.set('q', q)
    searchParams.set('page', String(nextPage))
    return `/admin/produttori?${searchParams.toString()}`
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Lista produttori</h2>
          <p className={styles.hint}>
            {totalRows
              ? `Mostrati ${pageStart}-${pageEnd} di ${totalRows} produttori.`
              : 'Nessun produttore trovato.'}
          </p>
        </div>
        <ProduttoriFiltersClient q={q} />

        {error ? <p className={styles.empty}>Errore: {error.message}</p> : null}

        {!error && !(rows || []).length ? (
          <p className={styles.empty}>Nessun produttore trovato.</p>
        ) : null}

        {!error && !!(rows || []).length ? (
          <div className={styles.list}>
            {(rows || []).map((row) => (
              <Link
                key={row.id}
                href={`/admin/produttori/dettaglio?producerId=${encodeURIComponent(row.id)}`}
                className={`${styles.card} ${styles.cardLink}`}>
                <div className={styles.cardHead}>
                  <div>
                    <p className={styles.title}>{row.name || 'Produttore sconosciuto'}</p>
                    <p className={styles.subtitle}>
                      {[row.country, row.region].filter(Boolean).join(' - ') || 'Origine N/A'}
                    </p>
                  </div>
                  <p className={styles.metaText}>{statsByProducer.get(row.name) || 0} vini</p>
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        {!error && totalPages > 1 ? (
          <div className={styles.pagination}>
            <Link
              aria-disabled={currentPage <= 1}
              tabIndex={currentPage <= 1 ? -1 : 0}
              href={currentPage <= 1 ? '/admin/produttori' : makePageHref(currentPage - 1)}
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
