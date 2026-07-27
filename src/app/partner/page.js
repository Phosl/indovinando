import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getLocaleText} from '@/lib/i18n/getLocaleText'
import {listPublicPartners} from '@/lib/partners'
import PartnerPageHeader from '@/components/partner/PartnerPageHeader'
import PartnerPublicCard from '@/components/partner/PartnerPublicCard'
import JsonLd from '@/components/JsonLd'
import {buildPageMetadata, getSiteUrl} from '@/lib/seo'
import styles from './partner.module.scss'

export async function generateMetadata() {
  const lang = await getServerLanguage()

  return buildPageMetadata({
    title: lang === 'en' ? 'Wine tasting partners' : 'Partner per degustazioni',
    description:
      lang === 'en'
        ? 'Discover wine shops, restaurants, wineries, and wine businesses using Indovinando for their tasting experiences.'
        : 'Scopri enoteche, ristoranti, cantine e realtà del vino che usano Indovinando per organizzare esperienze di degustazione.',
    path: '/partner',
    lang,
  })
}

export default async function PartnersPage() {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const {
    data: {user},
  } = await supabase.auth.getUser()
  const text = getLocaleText(lang, 'partnerDirectory', {})
  const landingText = getLocaleText(lang, 'landing', {})
  const commonText = getLocaleText(lang, 'common', {})
  const partners = await listPublicPartners(supabase, lang)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: text.heading || 'Partner Indovinando',
    numberOfItems: partners.length,
    itemListElement: partners.map((partner, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: partner.name,
      url: getSiteUrl(`/partner/${encodeURIComponent(partner.slug)}`),
    })),
  }

  return (
    <main className={styles.page}>
      {partners.length ? <JsonLd data={structuredData} /> : null}
      <div className={styles.container}>
        <PartnerPageHeader
          isLoggedIn={Boolean(user)}
          title={text.title || 'Partner'}
          backHref="/"
          navText={landingText.nav || {}}
          landingBackHref="/"
          landingBackLabel={commonText.back || 'Indietro'}
        />

        <section className={styles.hero}>
          <span className={styles.eyebrow}>{text.eyebrow || 'Partner'}</span>
          <h1>{text.heading || 'Scopri le attività che usano Indovinando'}</h1>
          <p>
            {text.description ||
              'Enoteche, ristoranti e realtà del vino che hanno scelto di portare il gioco nelle loro degustazioni.'}
          </p>
        </section>

        {partners.length ? (
          <section className={styles.grid}>
            {partners.map((partner) => (
              <PartnerPublicCard
                key={partner.id}
                partner={partner}
                ctaLabel={text.cardCta || 'Apri scheda'}
              />
            ))}
          </section>
        ) : (
          <section className={styles.emptyCard}>
            <h2>{text.emptyTitle || 'I primi partner stanno arrivando'}</h2>
            <p>
              {text.emptyDescription ||
                'Presto qui troverai le schede pubbliche delle attività business che usano Indovinando.'}
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
