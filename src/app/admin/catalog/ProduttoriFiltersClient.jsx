'use client'

import {useEffect, useRef, useState, useTransition} from 'react'
import {usePathname, useRouter} from 'next/navigation'
import styles from './catalog.module.scss'

const DEBOUNCE_MS = 320
const MIN_QUERY_LENGTH = 2

function isValidTextQuery(value) {
  const trimmed = value.trim()
  return trimmed.length === 0 || trimmed.length >= MIN_QUERY_LENGTH
}

export default function ProduttoriFiltersClient({q = ''}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [queryValue, setQueryValue] = useState(q)
  const skipFirstEffect = useRef(true)
  const hasInvalidQuery = !isValidTextQuery(queryValue)

  const pushFilters = (nextQuery) => {
    if (!isValidTextQuery(nextQuery)) return

    const params = new URLSearchParams()
    if (nextQuery.trim()) params.set('q', nextQuery.trim())
    const query = params.toString()
    const target = query ? `${pathname}?${query}` : pathname
    startTransition(() => {
      router.replace(target, {scroll: false})
    })
  }

  useEffect(() => {
    if (skipFirstEffect.current) {
      skipFirstEffect.current = false
      return
    }

    const timeout = setTimeout(() => {
      pushFilters(queryValue)
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [queryValue])

  const handleSubmit = (event) => {
    event.preventDefault()
    pushFilters(queryValue)
  }

  const handleReset = () => {
    setQueryValue('')
    startTransition(() => {
      router.replace(pathname, {scroll: false})
    })
  }

  return (
    <>
      <form className={styles.filters} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <p className={styles.fieldLabel}>Produttore</p>
          <input
            className={styles.input}
            name="q"
            value={queryValue}
            onChange={(event) => setQueryValue(event.target.value)}
            placeholder="Cerca produttore"
            autoComplete="off"
          />
        </div>
        <div className={styles.actions}>
          <button type="submit" className="btn success btn-small">
            Applica
          </button>
          <button type="button" onClick={handleReset} className="btn neutral btn-small">
            Reset
          </button>
        </div>
      </form>
      <span className={styles.searchStatus}>
        {isPending ? <span className={styles.searchRing} aria-hidden="true" /> : null}
        {/* {hasInvalidQuery ? 'Min 2 lettere' : isPending ? 'Ricerca...' : 'Auto'} */}
      </span>
    </>
  )
}
