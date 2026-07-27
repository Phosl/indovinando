import Link from 'next/link'
import Image from 'next/image'
import {cache} from 'react'
import {notFound} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getLocaleText} from '@/lib/i18n/getLocaleText'
import {getPublicPartnerBySlug, mapProfileToPublicPartner} from '@/lib/partners'
import PartnerPageHeader from '@/components/partner/PartnerPageHeader'
import JsonLd from '@/components/JsonLd'
import {
  buildBreadcrumbStructuredData,
  buildPageMetadata,
  getSiteUrl,
} from '@/lib/seo'
import styles from '../partner.module.scss'

const getCachedPublicPartner = cache(async (slug, lang) => {
  const supabase = await createServerSupabase()
  return getPublicPartnerBySlug(supabase, slug, lang)
})

export async function generateMetadata({params}) {
  const {slug} = await params
  const lang = await getServerLanguage()
  const partner = slug ? await getCachedPublicPartner(slug, lang) : null

  if (!partner) {
    return buildPageMetadata({
      title: lang === 'en' ? 'Partner not found' : 'Partner non trovato',
      path: slug ? `/partner/${slug}` : '/partner',
      lang,
      noIndex: true,
    })
  }

  const location = partner.location ? ` a ${partner.location}` : ''
  const description =
    partner.description ||
    (lang === 'en'
      ? `${partner.name} is a ${partner.category.toLowerCase()} using Indovinando for wine tasting experiences.`
      : `${partner.name} è ${partner.category.toLowerCase()}${location} e usa Indovinando per le proprie esperienze di degustazione.`)

  return buildPageMetadata({
    title: `${partner.name} · ${partner.category}`,
    description,
    path: `/partner/${partner.slug}`,
    lang,
  })
}

export default async function PartnerDetailPage({params, searchParams}) {
  const {slug} = await params
  const resolvedSearchParams = await searchParams
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const {
    data: {user},
  } = await supabase.auth.getUser()
  const text = getLocaleText(lang, 'partnerPublic', {})
  const landingText = getLocaleText(lang, 'landing', {})
  const commonText = getLocaleText(lang, 'common', {})
  const previewMode = resolvedSearchParams?.preview === '1'
  let partner = await getCachedPublicPartner(slug, lang)

  if (!partner && previewMode && user) {
    const {data: ownProfile} = await supabase
      .from('profiles')
      .select(
        'id, username, profile_type, business_name, business_type, business_description, business_website, business_phone, business_address, business_latitude, business_longitude, business_logo_url, city, province, is_partner_public, partner_slug',
      )
      .eq('id', user.id)
      .single()

    if (ownProfile && String(ownProfile.partner_slug || '').trim() === slug) {
      partner = mapProfileToPublicPartner(ownProfile, lang)
    }
  }

  if (!partner) notFound()

  const mapQuery =
    partner.latitude !== null && partner.longitude !== null
      ? `${partner.latitude},${partner.longitude}`
      : partner.address || partner.location
  const mapEmbedUrl = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`
    : ''
  const mapLinkUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : ''
  const partnerUrl = getSiteUrl(`/partner/${partner.slug}`)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${partnerUrl}#business`,
    name: partner.name,
    description: partner.description || undefined,
    url: partnerUrl,
    image: partner.logoUrl || undefined,
    telephone: partner.phone || undefined,
    sameAs: partner.website ? [partner.website] : undefined,
    address:
      partner.address || partner.city || partner.province
        ? {
            '@type': 'PostalAddress',
            streetAddress: partner.address || undefined,
            addressLocality: partner.city || undefined,
            addressRegion: partner.province || undefined,
          }
        : undefined,
    geo:
      partner.latitude !== null && partner.longitude !== null
        ? {
            '@type': 'GeoCoordinates',
            latitude: partner.latitude,
            longitude: partner.longitude,
          }
        : undefined,
  }
  const breadcrumbData = buildBreadcrumbStructuredData([
    {name: 'Indovinando', path: '/'},
    {name: text.topBarTitle || 'Partner', path: '/partner'},
    {name: partner.name, path: `/partner/${partner.slug}`},
  ])

  return (
    <main className={styles.page}>
      <JsonLd data={[structuredData, breadcrumbData]} />
      <div className={styles.container}>
        <PartnerPageHeader
          isLoggedIn={Boolean(user)}
          title={text.topBarTitle || 'Partner'}
          backHref="/partner"
          navText={landingText.nav || {}}
          landingBackHref="/partner"
          landingBackLabel={commonText.back || 'Indietro'}
        />

        <section className={styles.detailHero}>
          <span className={styles.detailCategoryBadge}>{partner.category}</span>

          {partner.logoUrl ? (
            <div className={styles.detailLogoWrap}>
              <Image
                src={partner.logoUrl}
                alt={`Logo ${partner.name}`}
                className={styles.detailLogo}
                width={120}
                height={120}
                sizes="120px"
              />
            </div>
          ) : null}

          <div className={styles.detailHeroMain}>
            <h1>{partner.name}</h1>
            {partner.description ? <p>{partner.description}</p> : null}
          </div>

          <div className={styles.detailActions}>
            {partner.website ? (
              <a
                href={partner.website}
                target="_blank"
                rel="noreferrer"
                className="btn success btn-inline">
                {text.visitWebsite || 'Visita sito'}
              </a>
            ) : null}
            {partner.phone ? (
              <a href={`tel:${partner.phone}`} className="btn primary btn-inline">
                {text.callPartner || 'Chiama'}
              </a>
            ) : null}
          </div>
        </section>

        <section className={styles.detailGrid}>
          <article className={styles.infoCard}>
            <h2>{text.infoTitle || 'Informazioni attività'}</h2>
            <div className={styles.infoList}>
              <div>
                <span>{text.categoryLabel || 'Tipologia'}</span>
                <strong>{partner.category}</strong>
              </div>
              {partner.address ? (
                <div>
                  <span>{text.addressLabel || 'Indirizzo'}</span>
                  <strong>{partner.address}</strong>
                </div>
              ) : null}
              {partner.location ? (
                <div>
                  <span>{text.areaLabel || 'Zona'}</span>
                  <strong>{partner.location}</strong>
                </div>
              ) : null}
              {partner.phone ? (
                <div>
                  <span>{text.phoneLabel || 'Telefono'}</span>
                  <strong>{partner.phone}</strong>
                </div>
              ) : null}
              {partner.website ? (
                <div>
                  <span>{text.websiteLabel || 'Sito web'}</span>
                  <strong>{partner.website}</strong>
                </div>
              ) : null}
            </div>
          </article>

          <article className={styles.mapCard}>
            <div className={styles.mapCardHeader}>
              <h2>{text.mapTitle || 'Dove si trova'}</h2>
              {mapLinkUrl ? (
                <a
                  href={mapLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn tertiary btn-small btn-inline">
                  {text.openMap || 'Apri mappa'}
                </a>
              ) : null}
            </div>

            {mapEmbedUrl ? (
              <iframe
                title={`${partner.name} map`}
                src={mapEmbedUrl}
                loading="lazy"
                className={styles.mapFrame}
              />
            ) : (
              <div className={styles.mapEmpty}>
                <p>
                  {text.mapEmpty ||
                    'La mappa sarà disponibile appena il partner completerà la posizione.'}
                </p>
              </div>
            )}
          </article>
        </section>

        <section className={styles.backLinkRow}>
          <Link href="/partner" className="btn secondary btn-inline">
            {text.backToDirectory || 'Torna ai partner'}
          </Link>
        </section>
      </div>
    </main>
  )
}
