import styles from './copyright.module.scss'
import TopBarBack from '@/components/TopBarBack'
import {getServerLanguage} from '@/lib/i18n/server'
import {createServerSupabase} from '@/lib/supabaseServer'

export async function generateMetadata() {
  const lang = await getServerLanguage()
  const isEn = lang === 'en'

  return {
    title: isEn ? 'Copyright & IP Notice — Indovinando' : 'Copyright e tutela IP — Indovinando',
    description: isEn
      ? 'Legal notice for the name, logo, idea, and contents of Indovinando.'
      : 'Informativa legale su nome, logo, idea e contenuti di Indovinando.',
  }
}

const UI_TEXT = {
  it: {
    title: 'Copyright e tutela del progetto',
    intro:
      'Questa pagina definisce la tutela di nome, logo, idea e contenuti del progetto Indovinando.',
    sections: [
      {
        heading: 'Nome del progetto',
        body: "Il nome Indovinando e ogni sua variante grafica o testuale usata nell'app identificano il progetto in modo univoco. Non e consentito usare nomi uguali o confondibili per prodotti o servizi simili senza autorizzazione scritta del titolare.",
      },
      {
        heading: 'Logo e identita visiva',
        body: 'Il logo di Indovinando, le icone principali e gli elementi grafici distintivi sono protetti. Sono vietati copia, modifica, ridistribuzione o uso commerciale senza consenso esplicito del titolare.',
      },
      {
        heading: 'Idea, format e struttura del servizio',
        body: "L'idea creativa, il format di gioco, la struttura dei percorsi e l'organizzazione delle funzionalita sono parte del progetto originale. La replica sostanziale del concept, in tutto o in parte, per finalita commerciali o concorrenziali non e autorizzata.",
      },
      {
        heading: 'Contenuti e codice',
        body: 'Testi, materiali didattici, domande, immagini, layout, database e codice sorgente restano di proprieta dei rispettivi titolari dei diritti, salvo dove diversamente indicato. Ogni uso non autorizzato puo comportare azioni a tutela dei diritti.',
      },
      {
        heading: 'Licenze software e riuso del codice',
        body: 'Salvo diversa indicazione in file di licenza specifici, il codice sorgente del progetto e rilasciato con formula all rights reserved. Non sono consentiti copia, modifica, distribuzione, sublicenza, reverse engineering, uso commerciale o creazione di opere derivate senza preventiva autorizzazione scritta del titolare dei diritti.',
      },
      {
        heading: 'Contatti e autorizzazioni',
        body: "Per richieste di utilizzo del nome, del logo o di parti del progetto e necessario ottenere un'autorizzazione preventiva in forma scritta dal titolare.",
      },
    ],
    note: 'Tutti i diritti sono riservati. Qualsiasi utilizzo non espressamente autorizzato del nome, del logo, del concept, dei contenuti o del codice del progetto Indovinando e vietato e puo dare luogo ad azioni civili e penali nei limiti consentiti dalla normativa applicabile.',
  },
  en: {
    title: 'Copyright and project protection',
    intro:
      'This page outlines the protection of the Indovinando project name, logo, concept, and contents.',
    sections: [
      {
        heading: 'Project name',
        body: 'The name Indovinando and any textual or visual variants used in the app uniquely identify this project. The use of identical or confusingly similar names for related products or services is not allowed without prior written authorization from the rights holder.',
      },
      {
        heading: 'Logo and visual identity',
        body: 'The Indovinando logo, core icons, and distinctive visual elements are protected. Copying, modification, redistribution, or commercial use is prohibited without explicit consent from the rights holder.',
      },
      {
        heading: 'Concept, format, and service structure',
        body: 'The creative concept, game format, learning flow, and feature organization are part of the original project. Substantial replication of the concept, in whole or in part, for commercial or competitive purposes is not authorized.',
      },
      {
        heading: 'Content and source code',
        body: 'Texts, educational materials, questions, images, layouts, databases, and source code remain the property of their respective rights holders unless otherwise stated. Unauthorized use may result in legal action to protect these rights.',
      },
      {
        heading: 'Software licensing and code reuse',
        body: 'Unless otherwise stated in specific license files, the project source code is provided on an all rights reserved basis. Copying, modification, distribution, sublicensing, reverse engineering, commercial use, or creation of derivative works is not permitted without prior written authorization from the rights holder.',
      },
      {
        heading: 'Contacts and authorizations',
        body: 'Any use of the project name, logo, or project assets requires prior written permission from the rights holder.',
      },
    ],
    note: 'All rights reserved. Any use of the Indovinando project name, logo, concept, content, or code that is not expressly authorized is prohibited and may result in civil and criminal enforcement, as permitted by applicable law.',
  },
}

export default async function CopyrightPage() {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const {
    data: {user},
  } = await supabase.auth.getUser()
  const isEn = lang === 'en'
  const text = isEn ? UI_TEXT.en : UI_TEXT.it
  const backHref = user ? '/dashboard' : '/'

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <TopBarBack title={text.title} href={backHref} />

        <article className={styles.card}>
          <p className={styles.intro}>{text.intro}</p>

          {text.sections.map((section) => (
            <section key={section.heading} className={styles.section}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}

          <p className={styles.note}>{text.note}</p>
        </article>
      </div>
    </main>
  )
}
