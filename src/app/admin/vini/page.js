import TopBarBack from '@/components/TopBarBack'
import {createServerSupabase} from '@/lib/supabaseServer'
import {formatAppDate} from '@/lib/dateFormat'
import Link from 'next/link'
import styles from '../catalog/catalog.module.scss'

export const metadata = {
  title: 'Admin - Vini',
}

function formatRowMeta(row) {
  return [row.country, row.region].filter(Boolean).join(' - ') || 'Origine N/A'
}

function formatPrice(row) {
  if (row.price == null) return 'N/A'
  return `${row.price}${row.currency ? ` ${row.currency}` : ''}`
}

function formatGrapes(grapes) {
  if (!Array.isArray(grapes) || !grapes.length) return 'N/A'
  return grapes.join(', ')
}

export default async function AdminViniPage({searchParams}) {
  const params = await searchParams
  const supabase = await createServerSupabase()
  const q = String(params?.q || '').trim()
  const producer = String(params?.producer || '').trim()
  const type = String(params?.type || '').trim()

  let query = supabase
    .from('wine_catalog')
    .select(
      'id, name, producer, country, region, appellation, type, grapes, vintage, abv, price, currency, last_updated'
    )
    .order('last_updated', {ascending: false, nullsFirst: false})
    .limit(500)
  if (q) query = query.ilike('name', `%${q}%`)
  if (producer) query = query.ilike('producer', `%${producer}%`)
  if (type) query = query.eq('type', type)
  const {data: rows, error} = await query

  return (
    <main className={styles.page}>
      <TopBarBack title="Admin - Vini" href="/admin" />

      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Lista vini</h2>
          <p className={styles.hint}>Ultimi 500 record aggiornati del catalogo.</p>
        </div>
        <form className={styles.filters} method="get">
          <div className={styles.field}>
            <p className={styles.fieldLabel}>Nome vino</p>
            <input className={styles.input} name="q" defaultValue={q} placeholder="Es. Barolo" />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>Produttore</p>
            <input className={styles.input} name="producer" defaultValue={producer} placeholder="Es. Antinori" />
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
            <Link href="/admin/vini" className="btn neutral small">
              Reset
            </Link>
          </div>
        </form>

        {error ? <p className={styles.empty}>Errore: {error.message}</p> : null}
        {!error && !(rows || []).length ? <p className={styles.empty}>Nessun vino trovato.</p> : null}

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
                    <span className={styles.value}>{formatRowMeta(row)}</span>
                  </div>
                  <div className={styles.gridItem}>
                    <span className={styles.label}>Vitigni</span>
                    <span className={styles.value}>{formatGrapes(row.grapes)}</span>
                  </div>
                  <div className={styles.gridItem}>
                    <span className={styles.label}>ABV</span>
                    <span className={styles.value}>{row.abv != null ? `${row.abv}%` : 'N/A'}</span>
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
