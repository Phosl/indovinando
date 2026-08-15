import Image from 'next/image'
import {ButtonLink} from '@/components/ui/Button'
import GuideSlideDeck from './GuideSlideDeck'
import styles from './info.module.scss'

const asArray = (value) => (Array.isArray(value) ? value : [])

function SectionHeading({eyebrow, title, description, align = 'center'}) {
  return (
    <div className={`${styles.sectionHeading} ${align === 'left' ? styles.sectionHeadingLeft : ''}`}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h2>{title}</h2>
      {description ? <p className={styles.sectionDescription}>{description}</p> : null}
    </div>
  )
}

export function GuideHero({t}) {
  const navigation = asArray(t('navigation'))

  return (
    <>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>{t('hero.eyebrow')}</p>
          <h1>{t('hero.title')}</h1>
          <p className={styles.heroDescription}>{t('hero.description')}</p>
          <ul className={styles.heroProof}>
            {asArray(t('hero.proofItems')).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className={styles.heroActions}>
            <ButtonLink href="#video" variant="success-filled">
              {t('hero.primaryCta')}
            </ButtonLink>
            <ButtonLink href="/demo" variant="neutral">
              {t('hero.secondaryCta')}
            </ButtonLink>
          </div>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <Image
            src="/onboarding/onboarding_01.svg"
            alt=""
            width={360}
            height={360}
            priority
          />
        </div>
      </header>

      <nav className={styles.sectionNav} aria-label={t('navigationLabel')}>
        {navigation.map((item) => (
          <a key={item.id} href={`#${item.id}`}>
            {item.label}
          </a>
        ))}
      </nav>
    </>
  )
}

export function GuidePresentationSection({t, commonT}) {
  return (
    <section id="presentation" className={styles.section}>
      <SectionHeading
        eyebrow={t('presentation.eyebrow')}
        title={t('presentation.title')}
        description={t('presentation.description')}
      />
      <GuideSlideDeck
        slides={asArray(t('slides'))}
        labels={{
          title: t('presentation.title'),
          slide: t('slide'),
          goToSlide: t('goToSlide'),
          swipeHint: t('swipeHint'),
          back: commonT('back'),
          next: commonT('next'),
          complete: t('presentation.complete'),
        }}
      />
    </section>
  )
}

export function GuideVideoSection({t, language}) {
  const videoSrc = `/guide/indovinando-guide-${language}.mp4`
  const videoPoster = `/guide/indovinando-guide-${language}-poster.jpg`

  return (
    <section id="video" className={styles.section}>
      <SectionHeading
        eyebrow={t('video.eyebrow')}
        title={t('video.title')}
        description={t('video.description')}
      />
      <div className={styles.videoGrid}>
        <div className={styles.videoShell}>
          <video
            key={videoSrc}
            className={styles.video}
            controls
            playsInline
            preload="metadata"
            poster={videoPoster}
            aria-label={t('video.playerLabel')}>
            <source src={videoSrc} type="video/mp4" />
            {t('video.unsupported')}
          </video>
          <p className={styles.videoCaption}>{t('video.caption')}</p>
        </div>
        <div className={styles.transcriptCard}>
          <h3>{t('video.transcriptTitle')}</h3>
          <ol>
            {asArray(t('video.steps')).map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <span>{step.description}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

export function GuideTastingSection({t}) {
  return (
    <section id="tasting" className={styles.section}>
      <SectionHeading
        eyebrow={t('tasting.eyebrow')}
        title={t('tasting.title')}
        description={t('tasting.description')}
      />
      <ol className={styles.stepGrid}>
        {asArray(t('tasting.steps')).map((step, index) => (
          <li key={step.title} className={styles.stepCard}>
            <span className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function GuideCreationSection({t}) {
  return (
    <section className={`${styles.section} ${styles.sectionPanel}`}>
      <SectionHeading
        eyebrow={t('creation.eyebrow')}
        title={t('creation.title')}
        description={t('creation.description')}
      />
      <div className={styles.cardGrid}>
        {asArray(t('creation.modes')).map((mode) => (
          <article key={mode.title} className={styles.featureCard}>
            <span className={styles.cardIcon} aria-hidden="true">
              {mode.icon}
            </span>
            <p className={styles.cardLabel}>{mode.label}</p>
            <h3>{mode.title}</h3>
            <p>{mode.description}</p>
            <ul className={styles.checkList}>
              {asArray(mode.points).map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}

export function GuideCreditsSection({t}) {
  return (
    <section id="credits" className={styles.section}>
      <div className={styles.splitSection}>
        <div>
          <SectionHeading
            eyebrow={t('credits.eyebrow')}
            title={t('credits.title')}
            description={t('credits.description')}
            align="left"
          />
          <ul className={styles.checkList}>
            {asArray(t('credits.points')).map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className={styles.note}>{t('credits.note')}</p>
          <ButtonLink href="/profilo/crediti" variant="success-filled">
            {t('credits.cta')}
          </ButtonLink>
        </div>
        <div className={styles.creditRules}>
          {asArray(t('credits.rules')).map((rule) => (
            <article key={rule.title} className={styles.creditCard}>
              <span aria-hidden="true">{rule.icon}</span>
              <div>
                <h3>{rule.title}</h3>
                <p>{rule.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function GuideLearningSection({t}) {
  return (
    <section id="learning" className={`${styles.section} ${styles.sectionPanel}`}>
      <SectionHeading
        eyebrow={t('learning.eyebrow')}
        title={t('learning.title')}
        description={t('learning.description')}
      />
      <div className={styles.cardGrid}>
        {asArray(t('learning.items')).map((item) => (
          <article key={item.title} className={styles.featureCard}>
            <span className={styles.cardIcon} aria-hidden="true">
              {item.icon}
            </span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <ButtonLink href={item.href} variant="neutral" size="small">
              {item.cta}
            </ButtonLink>
          </article>
        ))}
      </div>
    </section>
  )
}

export function GuideBusinessSection({t}) {
  return (
    <section id="business" className={styles.section}>
      <SectionHeading
        eyebrow={t('audiences.eyebrow')}
        title={t('audiences.title')}
        description={t('audiences.description')}
      />
      <div className={styles.audienceGrid}>
        {asArray(t('audiences.items')).map((audience) => (
          <article key={audience.title} className={styles.audienceCard}>
            <span className={styles.cardIcon} aria-hidden="true">
              {audience.icon}
            </span>
            <h3>{audience.title}</h3>
            <p>{audience.description}</p>
          </article>
        ))}
      </div>

      <div className={styles.businessHeading}>
        <SectionHeading
          eyebrow={t('business.eyebrow')}
          title={t('business.title')}
          description={t('business.description')}
        />
      </div>
      <div className={styles.businessGrid}>
        {asArray(t('business.models')).map((model) => (
          <article key={model.title} className={styles.businessCard}>
            <span
              className={`${styles.modelStatus} ${
                model.tone === 'active'
                  ? styles.modelStatusActive
                  : model.tone === 'ready'
                    ? styles.modelStatusReady
                    : styles.modelStatusFuture
              }`}>
              {model.status}
            </span>
            <h3>{model.title}</h3>
            <p>{model.description}</p>
            <ul className={styles.checkList}>
              {asArray(model.points).map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className={styles.businessNote}>{t('business.note')}</p>
    </section>
  )
}

export function GuideFinalCta({t}) {
  return (
    <section className={styles.finalCta}>
      <p className={styles.eyebrow}>{t('finalCta.eyebrow')}</p>
      <h2>{t('finalCta.title')}</h2>
      <p>{t('finalCta.description')}</p>
      <div className={styles.heroActions}>
        <ButtonLink href="/demo" variant="success-filled">
          {t('finalCta.primaryCta')}
        </ButtonLink>
        <ButtonLink href="/auth?mode=register&next=/game/create" variant="neutral">
          {t('finalCta.secondaryCta')}
        </ButtonLink>
      </div>
    </section>
  )
}
