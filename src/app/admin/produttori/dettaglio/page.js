import TopBarBack from '@/components/TopBarBack'
import {createServerSupabase} from '@/lib/supabaseServer'
import {formatAppDate} from '@/lib/dateFormat'
import Link from 'next/link'
import styles from '../../catalog/catalog.module.scss'

export const metadata = {
  title: 'Admin - Produttore',
}

function formatPrice(row) {
  if (row.price == null) return 'N/A'
  return `${row.price}${row.currency ? ` ${row.currency}` : ''}`
}

function formatGrapes(grapes) {
  if (!Array.isArray(grapes) || !grapes.length) return 'N/A'
  return grapes.join(', ')
}

export default async function AdminProduttoreDettaglioPage({searchParams}) {
  const params = await searchParams
  const producerId = params?.producerId ? String(params.producerId).trim() : ''
  const producerFromQuery = params?.producer ? String(params.producer).trim() : ''
  const q = String(params?.q || '').trim()
  const type = String(params?.type || '').trim()
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

  let query = supabase.from('wine_catalog').select(baseSelect)
  if (producer) {
    query = query.eq('producer', producer)
  }
  if (q) query = query.ilike('name', `%${q}%`)
  if (type) query = query.eq('type', type)
  query = query.order('last_updated', {ascending: false, nullsFirst: false}).limit(500)

  const {data: rows, error} = await query

  return (
    <main className={styles.page}>
      <TopBarBack title={producer ? `Produttore: ${producer}` : 'Produttore'} href="/admin/produttori" />

      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Lista bottiglie</h2>
          <p className={styles.hint}>Dati principali utili per template quiz.</p>
        </div>
        <form className={styles.filters} method="get">
          <input type="hidden" name="producerId" value={producerId} />
          <div className={styles.field}>
            <p className={styles.fieldLabel}>Nome vino</p>
            <input className={styles.input} name="q" defaultValue={q} placeholder="Cerca bottiglia" />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>Tipo</p>
            <select className={styles.select} name="type" defaultValue={type}>
              <option value="">Tutti</option>
              <option value="red">Red</option>
              <option value="white">White</option>
              <option value="rose">Rosé</option>
              <option value="sparkling">Sparkling</option>
              <option value="orange">Orange</option>
              <option value="dessert">Dessert</option>
              <option value="fortified">Fortified</option>
            </select>
          </div>
          <div className={styles.actions}>
            <button type="submit" className="btn success small">
              Filtra
            </button>
            <Link
              href={`/admin/produttori/dettaglio?producerId=${encodeURIComponent(producerId)}`}
              className="btn neutral small">
              Reset
            </Link>
          </div>
        </form>

        {error ? <p className={styles.empty}>Errore: {error.message}</p> : null}
        {!error && !(rows || []).length ? <p className={styles.empty}>Nessuna bottiglia trovata.</p> : null}

        {!error && !!(rows || []).length ? (
          <div className={styles.list}>
            {(rows || []).map((row) => (
              <article key={row.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <div>
                    <p className={styles.title}>{row.name}</p>
                    <p className={styles.subtitle}>{row.appellation || 'Appellation N/A'}</p>
                  </div>
                  <p className={styles.metaText}>{formatAppDate(row.last_updated, 'it') || 'Data N/A'}</p>
                </div>

                <div className={styles.pillRow}>
                  <span className={`${styles.pill} ${styles.pillStrong}`}>Tipo: {row.type || 'N/A'}</span>
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
      </div>
    </main>
  )
}
