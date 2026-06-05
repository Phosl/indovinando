'use client'

import {useLanguage} from './LanguageProvider'
import styles from './LanguageSwitcher.module.scss'

export default function LanguageSwitcher({inline = false, className = ''}) {
  const {lang, setLang, isSwitching} = useLanguage()

  return (
    <div
      className={`${styles.switcher} ${inline ? styles.inline : ''} ${isSwitching ? styles.switching : ''} ${className}`.trim()}
      role="group"
      aria-label="Language switch">
      <button
        type="button"
        className={`${styles.button} ${lang === 'it' ? styles.active : ''}`}
        onClick={() => setLang('it')}
        aria-pressed={lang === 'it'}
        disabled={isSwitching}>
        ITA
      </button>
      <button
        type="button"
        className={`${styles.button} ${lang === 'en' ? styles.active : ''}`}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        disabled={isSwitching}>
        ENG
      </button>
    </div>
  )
}
