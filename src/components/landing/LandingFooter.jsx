import Image from 'next/image'
import Link from 'next/link'
import styles from './LandingFooter.module.scss'

const EXPLORE_LINKS = [
  {key: 'howItWorks', href: '/#come-funziona', fallbackLabel: 'Come funziona'},
  {key: 'demo', href: '/demo', fallbackLabel: 'Demo'},
  {key: 'partners', href: '/partner', fallbackLabel: 'Partner'},
  {key: 'rankings', href: '/classifiche', fallbackLabel: 'Classifiche'},
  {key: 'course', href: '/corso-vino', fallbackLabel: 'Corso vino'},
]

const PROJECT_LINKS = [
  {key: 'info', href: '/info', fallbackLabel: 'Informazioni'},
  {key: 'changelog', href: '/changelog', fallbackLabel: 'Novità'},
  {key: 'copyright', href: '/copyright', fallbackLabel: 'Copyright'},
]

export default function LandingFooter({text = {}}) {
  const year = new Date().getFullYear()
  const exploreLabels = text.exploreLinks || {}
  const projectLabels = text.projectLinks || {}

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.main}>
          <div className={styles.brand}>
            <Link
              href="/"
              className={styles.logoLink}
              aria-label={text.homeLabel || 'Indovinando'}>
              <Image
                src="/logo-header.svg"
                alt="Indovinando"
                className={styles.logo}
                width={520}
                height={153}
              />
            </Link>

            <p className={styles.description}>
              {text.description ||
                'La piattaforma per creare e vivere degustazioni alla cieca, dal primo QR alla classifica finale.'}
            </p>
          </div>

          <nav className={styles.column} aria-labelledby="footer-explore-title">
            <h2 id="footer-explore-title" className={styles.columnTitle}>
              {text.exploreTitle || 'Esplora'}
            </h2>
            <ul className={styles.linkList}>
              {EXPLORE_LINKS.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className={styles.link}>
                    {exploreLabels[item.key] || item.fallbackLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className={styles.column} aria-labelledby="footer-project-title">
            <h2 id="footer-project-title" className={styles.columnTitle}>
              {text.projectTitle || 'Progetto'}
            </h2>
            <ul className={styles.linkList}>
              {PROJECT_LINKS.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className={styles.link}>
                    {projectLabels[item.key] || item.fallbackLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section className={styles.column} aria-labelledby="footer-studio-title">
            <h2 id="footer-studio-title" className={styles.columnTitle}>
              {text.studioTitle || 'Studio'}
            </h2>
            <p className={styles.studioCredit}>
              {text.studioCredit || 'Design e sviluppo di'}{' '}
              <a
                href="https://harihari-studio.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
                aria-label={
                  text.studioLinkLabel || 'Hari Hari Studio, apre in una nuova scheda'
                }>
                {text.studioName || 'Hari Hari Studio'}
                <span className={styles.externalIcon} aria-hidden="true">
                  ↗
                </span>
              </a>
            </p>
            <address className={styles.address}>
              {text.address || 'Via Apiro 18, Roma'}
            </address>
          </section>
        </div>

        <div className={styles.bottom}>
          <p>
            © {year} {text.rights || 'Indovinando — Tutti i diritti riservati.'}
          </p>
          <Link href="/" className={styles.backHome}>
            {text.backHome || 'Torna alla home'}
          </Link>
        </div>
      </div>
    </footer>
  )
}
