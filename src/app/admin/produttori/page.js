import Link from 'next/link'
import TopBarBack from '@/components/TopBarBack'
import {createServerSupabase} from '@/lib/supabaseServer'
import {requireSuperAdmin} from '@/lib/courseAdmin'
import styles from '../catalog/catalog.module.scss'

export const metadata = {
  title: 'Admin - Produttori',
}

export default async function AdminProduttoriPage({searchParams}) {
  await requireSuperAdmin()

  const params = await searchParams
  const supabase = await createServerSupabase()
  const q = String(params?.q || '').trim()

  let producersQuery = supabase
    .from('wine_producers')
    .select('id, name, country, region')
    .order('name', {ascending: true})
    .limit(5000)
  if (q) producersQuery = producersQuery.ilike('name', `%${q}%`)

  const [producersResult, statsResult] = await Promise.all([
    producersQuery,
    supabase.from('wine_catalog_producer_stats').select('producer, wines_count'),
  ])

  const rows = producersResult.data || []
  const error = producersResult.error
  const statsByProducer = new Map((statsResult.data || []).map((s) => [s.producer, s.wines_count]))

  return (
    <main className={styles.page}>
      <TopBarBack title="Admin - Produttori" href="/admin" />

      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Lista produttori</h2>
          <p className={styles.hint}>Vista aggregata dal catalogo vini.</p>
        </div>
        <form className={styles.filters} method="get">
          <div className={styles.field}>
            <p className={styles.fieldLabel}>Produttore</p>
            <input className={styles.input} name="q" defaultValue={q} placeholder="Cerca produttore" />
          </div>
          <div className={styles.actions}>
            <button type="submit" className="btn success small">
              Filtra
            </button>
            <Link href="/admin/produttori" className="btn neutral small">
              Reset
            </Link>
          </div>
        </form>

        {error ? <p className={styles.empty}>Errore: {error.message}</p> : null}

        {!error && !(rows || []).length ? <p className={styles.empty}>Nessun produttore trovato.</p> : null}

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
      </div>
    </main>
  )
}
