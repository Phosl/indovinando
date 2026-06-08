'use client'

import {useCallback, useEffect, useRef, useState, useTransition} from 'react'
import {usePathname, useRouter} from 'next/navigation'
import styles from './catalog.module.scss'

const DEBOUNCE_MS = 320
const MIN_QUERY_LENGTH = 2

function isValidTextQuery(value) {
  const trimmed = value.trim()
  return trimmed.length === 0 || trimmed.length >= MIN_QUERY_LENGTH
}

export default function ViniFiltersClient({q = '', producer = '', type = '', country = ''}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [nameValue, setNameValue] = useState(q)
  const [producerValue, setProducerValue] = useState(producer)
  const [typeValue, setTypeValue] = useState(type)
  const [countryValue, setCountryValue] = useState(country)
  const skipFirstEffect = useRef(true)
  const hasInvalidQuery =
    !isValidTextQuery(nameValue) ||
    !isValidTextQuery(producerValue) ||
    !isValidTextQuery(countryValue)

  const pushFilters = useCallback(
    (nextValues) => {
      if (
        !isValidTextQuery(nextValues.nameValue) ||
        !isValidTextQuery(nextValues.producerValue) ||
        !isValidTextQuery(nextValues.countryValue)
      )
        return

      const params = new URLSearchParams()
      if (nextValues.nameValue.trim()) params.set('q', nextValues.nameValue.trim())
      if (nextValues.producerValue.trim()) params.set('producer', nextValues.producerValue.trim())
      if (nextValues.typeValue) params.set('type', nextValues.typeValue)
      if (nextValues.countryValue.trim()) params.set('country', nextValues.countryValue.trim())
      const query = params.toString()
      const target = query ? `${pathname}?${query}` : pathname
      startTransition(() => {
        router.replace(target, {scroll: false})
      })
    },
    [pathname, router],
  )

  useEffect(() => {
    if (skipFirstEffect.current) {
      skipFirstEffect.current = false
      return
    }

    const timeout = setTimeout(() => {
      pushFilters({nameValue, producerValue, typeValue, countryValue})
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [countryValue, nameValue, producerValue, pushFilters, typeValue])

  const handleSubmit = (event) => {
    event.preventDefault()
    pushFilters({nameValue, producerValue, typeValue, countryValue})
  }

  const handleReset = () => {
    setNameValue('')
    setProducerValue('')
    setTypeValue('')
    setCountryValue('')
    startTransition(() => {
      router.replace(pathname, {scroll: false})
    })
  }

  return (
    <>
      <form className={styles.filters} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <p className={styles.fieldLabel}>Nome vino</p>
          <input
            className={styles.input}
            name="q"
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
            placeholder="Es. Barolo"
            autoComplete="off"
          />
        </div>
        <div className={styles.field}>
          <p className={styles.fieldLabel}>Produttore</p>
          <input
            className={styles.input}
            name="producer"
            value={producerValue}
            onChange={(event) => setProducerValue(event.target.value)}
            placeholder="Es. Antinori"
            autoComplete="off"
          />
        </div>
        <div className={styles.field}>
          <p className={styles.fieldLabel}>Tipo</p>
          <select
            className={styles.select}
            name="type"
            value={typeValue}
            onChange={(event) => setTypeValue(event.target.value)}>
            <option value="">Tutti</option>
            <option value="red">Red</option>
            <option value="white">White</option>
            <option value="rose">Rose</option>
            <option value="sparkling">Sparkling</option>
            <option value="orange">Orange</option>
            <option value="dessert">Dessert</option>
            <option value="fortified">Fortified</option>
          </select>
        </div>
        <div className={styles.field}>
          <p className={styles.fieldLabel}>Paese</p>
          <input
            className={styles.input}
            name="country"
            value={countryValue}
            onChange={(event) => setCountryValue(event.target.value)}
            placeholder="Es. Italy"
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
