import styles from './changelog.module.scss'
import {getServerLanguage} from '@/lib/i18n/server'
import {buildPageMetadata} from '@/lib/seo'

export async function generateMetadata() {
  const lang = await getServerLanguage()
  const isEn = lang === 'en'

  return buildPageMetadata({
    title: 'Changelog',
    description: isEn
      ? 'History of Indovinando updates and versions.'
      : 'Cronologia degli aggiornamenti e delle versioni di Indovinando',
    path: '/changelog',
    lang,
  })
}

const UI_TEXT = {
  it: {
    title: '📋 Changelog',
    subtitle: 'Cronologia degli aggiornamenti di Indovinando',
    autoLabel: 'Auto',
    activityTitle: 'Storico sviluppo',
    activitySubtitle: 'Giorni più attivi del changelog',
    lowActivity: 'Meno',
    highActivity: 'Più',
  },
  en: {
    title: '📋 Changelog',
    subtitle: 'History of Indovinando updates',
    autoLabel: 'Auto',
    activityTitle: 'Development history',
    activitySubtitle: 'Most active changelog days',
    lowActivity: 'Less',
    highActivity: 'More',
  },
}

const CHANGELOG = [
  {
    version: '1.52.13',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'fail closed across app data identity changes',
    ],
  },

  {
    version: '1.52.12',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'keep onboarding focus trap stable',
    ],
  },

  {
    version: '1.52.11',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'require remote onboarding persistence',
    ],
  },

  {
    version: '1.52.10',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'isolate onboarding state across auth changes',
    ],
  },

  {
    version: '1.52.9',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'harden onboarding persistence and layout',
    ],
  },

  {
    version: '1.52.8',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'persist onboarding preferences from game editor',
    ],
  },

  {
    version: '1.52.7',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'persist onboarding dismissals server first',
    ],
  },

  {
    version: '1.52.6',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'centralize onboarding preference sync',
    ],
  },

  {
    version: '1.52.5',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'retain onboarding device fallback',
    ],
  },

  {
    version: '1.52.4',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'require verified onboarding persistence',
    ],
  },

  {
    version: '1.52.3',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'deduplicate onboarding preference sync',
    ],
  },

  {
    version: '1.52.2',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'lock onboarding while saving preferences',
    ],
  },

  {
    version: '1.52.1',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'prevent duplicate onboarding dismissal requests',
    ],
  },

  {
    version: '1.52.0',
    date: '30 luglio 2026',
    label: 'Auto',
    changes: [
      'polish onboarding and persist dismissals',
      'confirm onboarding dismissal before closing',
    ],
  },

  {
    version: '1.51.2',
    date: '27 luglio 2026',
    label: 'Auto',
    changes: [
      'unify app loading skeletons',
    ],
  },

  {
    version: '1.51.1',
    date: '27 luglio 2026',
    label: 'Auto',
    changes: [
      'align tasting detail actions',
    ],
  },

  {
    version: '1.51.0',
    date: '27 luglio 2026',
    label: 'Auto',
    changes: [
      'prioritize host event setup',
    ],
  },

  {
    version: '1.50.0',
    date: '27 luglio 2026',
    label: 'Auto',
    changes: [
      'update Next.js security release',
      'streamline table-live sharing actions',
    ],
  },

  {
    version: '1.49.1',
    date: '27 luglio 2026',
    label: 'Auto',
    changes: [
      'improve game layout on short screens',
    ],
  },

  {
    version: '1.49.0',
    date: '27 luglio 2026',
    label: 'Auto',
    changes: [
      'add professional landing footer',
    ],
  },

  {
    version: '1.48.0',
    date: '27 luglio 2026',
    label: 'Auto',
    changes: [
      'prepare public experience for sharing',
      'simplify page transition motion',
    ],
  },

  {
    version: '1.47.1',
    date: '10 luglio 2026',
    label: 'Auto',
    changes: [
      'share the standard questionnaire with the demo',
    ],
  },

  {
    version: '1.47.0',
    date: '10 luglio 2026',
    label: 'Auto',
    changes: [
      'improve live gameplay, operations, and public demo',
    ],
  },

  {
    version: '1.46.5',
    date: '25 giugno 2026',
    label: 'Auto',
    changes: [
      'Polish public menus and partner UI',
    ],
  },

  {
    version: '1.46.4',
    date: '21 giugno 2026',
    label: 'Auto',
    changes: [
      'Fix auto quiz save validation',
    ],
  },

  {
    version: '1.46.3',
    date: '21 giugno 2026',
    label: 'Auto',
    changes: [
      'Harden Supabase security advisor fixes',
    ],
  },

  {
    version: '1.46.2',
    date: '19 giugno 2026',
    label: 'Auto',
    changes: [
      'vs code settings',
    ],
  },

  {
    version: '1.46.1',
    date: '18 giugno 2026',
    label: 'Auto',
    changes: [
      'colore theme',
    ],
  },

  {
    version: '1.46.0',
    date: '18 giugno 2026',
    label: 'Auto',
    changes: [
      'add internal preview page for super admins',
    ],
  },

  {
    version: '1.45.0',
    date: '18 giugno 2026',
    label: 'Auto',
    changes: [
      'add update prompt for new app versions',
    ],
  },

  {
    version: '1.44.9',
    date: '16 giugno 2026',
    label: 'Auto',
    changes: [
      '.',
    ],
  },

  {
    version: '1.44.8',
    date: '16 giugno 2026',
    label: 'Auto',
    changes: [
      'Fix table-live flow and loading backgrounds',
    ],
  },

  {
    version: '1.44.7',
    date: '13 giugno 2026',
    label: 'Auto',
    changes: [
      '.',
    ],
  },

  {
    version: '1.44.6',
    date: '11 giugno 2026',
    label: 'Auto',
    changes: [
      'Refactor automatic tasting creation flow into modular components',
    ],
  },

  {
    version: '1.44.5',
    date: '11 giugno 2026',
    label: 'Auto',
    changes: [
      'Improve app responsiveness with profile streaming, Google Maps cleanup, and course cover fallback fixes',
    ],
  },

  {
    version: '1.44.4',
    date: '11 giugno 2026',
    label: 'Auto',
    changes: [
      'Add Google Maps cleanup and speed up profile loading',
    ],
  },

  {
    version: '1.44.3',
    date: '11 giugno 2026',
    label: 'Auto',
    changes: [
      'Improve profile loading and fix course cover fallbacks',
    ],
  },

  {
    version: '1.44.2',
    date: '11 giugno 2026',
    label: 'Auto',
    changes: [
      'fix',
    ],
  },

  {
    version: '1.44.1',
    date: '11 giugno 2026',
    label: 'Auto',
    changes: [
      'Refine rankings navigation and move credit history into a dedicated page',
    ],
  },

  {
    version: '1.44.0',
    date: '11 giugno 2026',
    label: 'Auto',
    changes: [
      'add Stripe credit purchases, profile history, and admin transaction insights',
    ],
  },

  {
    version: '1.43.17',
    date: '11 giugno 2026',
    label: 'Auto',
    changes: [
      'update app recap and add Stripe credits monetization plan',
    ],
  },

  {
    version: '1.43.16',
    date: '11 giugno 2026',
    label: 'Auto',
    changes: [
      'Refine automatic tasting loading, delete feedback, and draft recovery',
    ],
  },

  {
    version: '1.43.15',
    date: '10 giugno 2026',
    label: 'Auto',
    changes: [
      'Preserve automatic tasting draft when leaving the wizard accidentally',
    ],
  },

  {
    version: '1.43.14',
    date: '10 giugno 2026',
    label: 'Auto',
    changes: [
      'Clarify automatic analysis progress during bottle-by-bottle batch scans',
    ],
  },

  {
    version: '1.43.13',
    date: '10 giugno 2026',
    label: 'Auto',
    changes: [
      'Add return-to-photo CTA in automatic bottle review step',
    ],
  },

  {
    version: '1.43.12',
    date: '10 giugno 2026',
    label: 'Auto',
    changes: [
      'Add profile credits display and increase default AI scan credits',
    ],
  },

  {
    version: '1.43.11',
    date: '10 giugno 2026',
    label: 'Auto',
    changes: [
      'Refine automatic tasting review flow and pre-release UI polish',
    ],
  },

  {
    version: '1.43.10',
    date: '10 giugno 2026',
    label: 'Auto',
    changes: [
      'Update GameCreateClient.jsx',
    ],
  },

  {
    version: '1.43.9',
    date: '10 giugno 2026',
    label: 'Auto',
    changes: [
      'Improve dashboard and tasting loading shells, and add warning CTA for incomplete bottles',
    ],
  },

  {
    version: '1.43.8',
    date: '10 giugno 2026',
    label: 'Auto',
    changes: [
      'Fix mobile onboarding dismiss and partner public profile flow',
    ],
  },

  {
    version: '1.43.7',
    date: '9 giugno 2026',
    label: 'Auto',
    changes: [
      'fix incompleteBadge',
    ],
  },

  {
    version: '1.43.6',
    date: '9 giugno 2026',
    label: 'Auto',
    changes: [
      'fix incompleteBadge',
    ],
  },

  {
    version: '1.43.5',
    date: '9 giugno 2026',
    label: 'Auto',
    changes: [
      'Stabilize drag and drop behavior in game editor',
    ],
  },

  {
    version: '1.43.4',
    date: '9 giugno 2026',
    label: 'Auto',
    changes: [
      'Fix guided bottle repair save flow',
    ],
  },

  {
    version: '1.43.3',
    date: '9 giugno 2026',
    label: 'Auto',
    changes: [
      'Fix bottom action bar rendering on game creation screens',
    ],
  },

  {
    version: '1.43.2',
    date: '9 giugno 2026',
    label: 'Auto',
    changes: [
      'Improve table live entry footer behavior on short viewports',
    ],
  },

  {
    version: '1.43.1',
    date: '9 giugno 2026',
    label: 'Auto',
    changes: [
      'Refine delayed-answer table live flow',
    ],
  },

  {
    version: '1.43.0',
    date: '9 giugno 2026',
    label: 'Auto',
    changes: [
      'polish game editor ordering UI and card interactions',
    ],
  },

  {
    version: '1.42.0',
    date: '9 giugno 2026',
    label: 'Auto',
    changes: [
      'refine game editor drag-and-drop controls and list actions',
    ],
  },

  {
    version: '1.41.0',
    date: '9 giugno 2026',
    label: 'Auto',
    changes: [
      'add public user precision rankings to community leaderboards',
    ],
  },

  {
    version: '1.40.1',
    date: '8 giugno 2026',
    label: 'Auto',
    changes: [
      'stabilize navigation transitions and clear repo lint errors',
    ],
  },

  {
    version: '1.40.0',
    date: '8 giugno 2026',
    label: 'Auto',
    changes: [
      'default first-time language selection from browser locale',
    ],
  },

  {
    version: '1.39.1',
    date: '8 giugno 2026',
    label: 'Auto',
    changes: [
      'refine landing page spacing and typography',
    ],
  },

  {
    version: '1.39.0',
    date: '7 giugno 2026',
    label: 'Auto',
    changes: [
      'improve course chapter covers with visual fallback',
    ],
  },

  {
    version: '1.38.0',
    date: '7 giugno 2026',
    label: 'Auto',
    changes: [
      'turn create-game onboarding into a full-screen experience',
    ],
  },

  {
    version: '1.37.0',
    date: '6 giugno 2026',
    label: 'Auto',
    changes: [
      'refine changelog presentation and add development activity timeline',
    ],
  },

  {
    version: '1.36.3',
    date: '6 giugno 2026',
    label: 'Auto',
    changes: [
      'recover safely from interrupted page transitions on mobile resume',
    ],
  },

  {
    version: '1.36.2',
    date: '6 giugno 2026',
    label: 'Auto',
    description: {
      it: 'Migliora il recupero quando l’app torna dal background o da una chiamata, evitando schermate vuote durante le transizioni pagina.',
      en: 'Improves recovery when the app returns from background or a call, avoiding blank screens during page transitions.',
    },
    changes: [
      'fix',
    ],
  },

  {
    version: '1.36.1',
    date: '6 giugno 2026',
    label: 'Auto',
    description: {
      it: 'Aggiunge protezioni al flusso di riconoscimento automatico e continua a rifinire il comportamento dei resume su mobile.',
      en: 'Adds safeguards to the automatic tasting flow and continues refining mobile resume behavior.',
    },
    changes: [
      'fix',
    ],
  },

  {
    version: '1.36.0',
    date: '6 giugno 2026',
    label: 'Auto',
    description: {
      it: 'Rifinitura ampia della schermata auto tasting: ricerca web più chiara, differenze riapribili, upload mobile più robusto e UI più pulita.',
      en: 'Broad polish pass on automatic tasting: clearer web search, reopenable diffs, stronger mobile uploads, and cleaner UI.',
    },
    changes: [
      'polish automatic tasting flow, web diff UX, and mobile upload resilience',
    ],
  },

  {
    version: '1.35.0',
    date: '6 giugno 2026',
    label: 'Auto',
    description: {
      it: 'Rende più affidabile il caricamento da mobile e migliora la leggibilità generale della schermata di riconoscimento bottiglie.',
      en: 'Makes mobile uploads more reliable and improves the overall readability of the bottle recognition screen.',
    },
    changes: [
      'refine automatic tasting UX and harden mobile upload flow',
    ],
  },

  {
    version: '1.34.0',
    date: '6 giugno 2026',
    label: 'Auto',
    description: {
      it: 'Sistema il salvataggio in catalogo, rafforza il flusso di verifica e riallinea anche la documentazione tecnica.',
      en: 'Fixes catalog save behavior, hardens the verify flow, and brings the technical documentation back in sync.',
    },
    changes: [
      'polish automatic tasting UX, fix catalog verify flow, and align docs',
      'add icon',
    ],
  },

  {
    version: '1.33.0',
    date: '6 giugno 2026',
    label: 'Auto',
    description: {
      it: 'Rende più curata la creazione del gioco, il cambio lingua nel profilo e l’ingresso nelle sessioni table-live.',
      en: 'Polishes game creation, profile language switching, and entry into table-live sessions.',
    },
    changes: [
      'polish creation flow, profile language UX, and table-live join',
    ],
  },

  {
    version: '1.32.0',
    date: '6 giugno 2026',
    label: 'Auto',
    changes: [
      'polish game creation UX, profile language switching, and table-live join flow',
    ],
  },

  {
    version: '1.31.1',
    date: '5 giugno 2026',
    label: 'Auto',
    changes: [
      'finetuning',
    ],
  },

  {
    version: '1.31.0',
    date: '5 giugno 2026',
    label: 'Auto',
    changes: [
      'polish auto tasting, live flows, and i18n coverage',
      'fix translation',
    ],
  },

  {
    version: '1.30.7',
    date: '5 giugno 2026',
    label: 'Auto',
    changes: [
      'fix avatar, fix translation',
    ],
  },

  {
    version: '1.30.6',
    date: '5 giugno 2026',
    label: 'Auto',
    changes: [
      'fix websearch token',
    ],
  },

  {
    version: '1.30.5',
    date: '5 giugno 2026',
    label: 'Auto',
    changes: [
      'fix web search',
    ],
  },

  {
    version: '1.30.4',
    date: '5 giugno 2026',
    label: 'Auto',
    changes: [
      'debug websearch',
    ],
  },

  {
    version: '1.30.3',
    date: '5 giugno 2026',
    label: 'Auto',
    changes: [
      'fixing mobile websearch',
    ],
  },

  {
    version: '1.30.2',
    date: '4 giugno 2026',
    label: 'Auto',
    changes: [
      'fix background color',
    ],
  },

  {
    version: '1.30.1',
    date: '4 giugno 2026',
    label: 'Auto',
    changes: [
      'add changelog desc',
    ],
  },

  {
    version: '1.30.0',
    date: '4 giugno 2026',
    label: 'Auto',
    description: {
      it: 'Grande passaggio di consolidamento su auto tasting, catalogo vini, generazione quiz e traduzioni, con più stabilità nel riconoscimento e più chiarezza nella UI.',
      en: 'Major consolidation pass across automatic tasting, wine catalog sync, quiz generation, and translations, with more stable recognition and clearer UI.',
    },
    changes: [
      'stabilize auto tasting, catalog sync, i18n, and product UX polish',
    ],
  },

  {
    version: '1.29.5',
    date: '4 giugno 2026',
    label: 'Auto',
    changes: [
      'fix Translation',
    ],
  },

  {
    version: '1.29.4',
    date: '3 giugno 2026',
    label: 'Auto',
    changes: [
      'fix clean documentation',
    ],
  },

  {
    version: '1.29.3',
    date: '3 giugno 2026',
    label: 'Auto',
    changes: [
      'documentation',
    ],
  },

  {
    version: '1.29.2',
    date: '3 giugno 2026',
    label: 'Auto',
    changes: [
      'update doc for DB migration',
    ],
  },

  {
    version: '1.29.1',
    date: '3 giugno 2026',
    label: 'Auto',
    changes: [
      'icebucket update + import-wine-chunks-from-storage.mjs',
    ],
  },

  {
    version: '1.29.0',
    date: '2 giugno 2026',
    label: 'Auto',
    changes: [
      'harden import pipeline and add legacy schema fallbacks',
    ],
  },

  {
    version: '1.28.5',
    date: '1 giugno 2026',
    label: 'Auto',
    changes: [
      'I18N Inline Text Audit',
    ],
  },

  {
    version: '1.28.4',
    date: '1 giugno 2026',
    label: 'Auto',
    changes: [
      'fix z index dashboard card',
    ],
  },

  {
    version: '1.28.3',
    date: '1 giugno 2026',
    label: 'Auto',
    changes: [
      'fix login and logout problem and style dashboard page',
    ],
  },

  {
    version: '1.28.2',
    date: '1 giugno 2026',
    label: 'Auto',
    changes: [
      'fix  tasting icon and illustration',
    ],
  },

  {
    version: '1.28.1',
    date: '1 giugno 2026',
    label: 'Auto',
    changes: [
      'refine dashboard button',
    ],
  },

  {
    version: '1.28.0',
    date: '1 giugno 2026',
    label: 'Auto',
    changes: [
      'added loading in login page',
    ],
  },

  {
    version: '1.27.8',
    date: '1 giugno 2026',
    label: 'Auto',
    changes: [
      'fix splash screen',
    ],
  },

  {
    version: '1.27.7',
    date: '1 giugno 2026',
    label: 'Auto',
    changes: [
      'fix splash',
    ],
  },

  {
    version: '1.27.6',
    date: '1 giugno 2026',
    label: 'Auto',
    changes: [
      'test splash',
    ],
  },

  {
    version: '1.27.5',
    date: '1 giugno 2026',
    label: 'Auto',
    changes: [
      'progress upload reale su mobile e fallback per referer vuoto',
    ],
  },

  {
    version: '1.27.4',
    date: '1 giugno 2026',
    label: 'Auto',
    changes: [
      'fix TableLiveSessionClient start game',
    ],
  },

  {
    version: '1.27.3',
    date: '1 giugno 2026',
    label: 'Auto',
    changes: [
      'sessione per tab con cleanup sicuro e API idempotenti',
    ],
  },

  {
    version: '1.27.2',
    date: '31 maggio 2026',
    label: 'Auto',
    changes: [
      'design: dashboard card',
    ],
  },

  {
    version: '1.27.1',
    date: '31 maggio 2026',
    label: 'Auto',
    changes: [
      '.',
    ],
  },

  {
    version: '1.27.0',
    date: '30 maggio 2026',
    label: 'Auto',
    changes: [
      'align live and table result icons, tune topbar exit button, and reduce audio start delay',
    ],
  },

  {
    version: '1.26.9',
    date: '30 maggio 2026',
    label: 'Auto',
    changes: [
      'fix',
    ],
  },

  {
    version: '1.26.8',
    date: '30 maggio 2026',
    label: 'Auto',
    changes: [
      'revert(ui): restore classic CTA button in create game card',
    ],
  },

  {
    version: '1.26.7',
    date: '30 maggio 2026',
    label: 'Auto',
    changes: [
      'ix(table-live): align endgame flow with live and fix leaderboard routing"',
    ],
  },

  {
    version: '1.26.6',
    date: '30 maggio 2026',
    label: 'Auto',
    changes: [
      '"fix(table-live): align endgame flow with live and add dedicated leaderboard page" -m "Prevent last-question auto-skip, keep answer feedback visible, and route final standings to /table-live/session/[id]/leaderboard. Add table-live leaderboard page/client with host/guest end actions (Fine gioco / Registrati). Improve table-live event/settings and session lobby UX polish, nav visibility, and topbar spacing."',
      'align event/session UX, fix final-round flow, and polish navigation/layout" -m "Improve table-live event/settings pages (compact layout, topbar spacing, link/QR flow, regenerate confirm). Refine session lobby controls and player cards. Fix guest last-question results transition and host final leaderboard behavior. Tune bottom-nav visibility on table-live routes and keep event page focused."',
    ],
  },

  {
    version: '1.26.5',
    date: '30 maggio 2026',
    label: 'Auto',
    changes: [
      'git add -A git commit -m "feat: automatic tasting wizard, vision/catalog pipeline, and shared create-game card"',
    ],
  },

  {
    version: '1.26.4',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'stabilize catalog producer detail matching, fix admin course lang switching/fallback, extend bottom nav on admin routes, and harden wine import sync docs/pipeline',
      'optimize course route fetching and align course/level/lesson skeletons with current layouts',
      'speed up navigation by removing page transition leave delay (LEAVE_MS = 0)',
    ],
  },

  {
    version: '1.26.3',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'parallelize server fetches on dashboard/my-games/profile and fix info modal bottom-nav overlap',
    ],
  },

  {
    version: '1.26.2',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'Refine onboarding UX: add reopen guide, unify modal actions, and polish create/info flows',
    ],
  },

  {
    version: '1.26.1',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'Refactor game creation routes and loading states to reduce bottom-nav flicker',
    ],
  },

  {
    version: '1.26.0',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'unify i18n sources and refresh bottom nav icons',
    ],
  },

  {
    version: '1.25.0',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'add global bottom nav with route guards and refine game creation wizard transitions',
    ],
  },

  {
    version: '1.24.3',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'fix logo e dashboard card',
    ],
  },

  {
    version: '1.24.2',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'centralizza rilevamento mobile in deviceUtils e aggiorna GamePlayView con watcher viewport',
    ],
  },

  {
    version: '1.24.1',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'ui(modals): fullscreen per aggiungi domanda/bottiglia con footer fisso e navigazione semplificata (freccia back + CTA primaria)',
    ],
  },

  {
    version: '1.24.0',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'sposta storico partite su pagina dedicata con card migliorate, avatar game e filtri a pill per nome partita',
    ],
  },

  {
    version: '1.23.4',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'restyle my games and create mode card',
    ],
  },

  {
    version: '1.23.3',
    date: '28 maggio 2026',
    label: 'Auto',
    changes: [
      'fixing style',
    ],
  },

  {
    version: '1.23.2',
    date: '16 maggio 2026',
    label: 'Auto',
    changes: [
      'fix question list',
    ],
  },

  {
    version: '1.23.1',
    date: '16 maggio 2026',
    label: 'Auto',
    changes: [
      'migliora stile card domande, visualizzazione opzioni e pulizia codice',
    ],
  },

  {
    version: '1.23.0',
    date: '16 maggio 2026',
    label: 'Auto',
    changes: [
      'modale info questionario con animazione, icona help, preferenza non mostrare più e riapertura manuale',
    ],
  },

  {
    version: '1.22.1',
    date: '16 maggio 2026',
    label: 'Auto',
    changes: [
      'improve guide copy, reset create-game step state, and anchor topbar lesson progress',
    ],
  },

  {
    version: '1.22.0',
    date: '16 maggio 2026',
    label: 'Auto',
    changes: [
      'improve profile options layout and bottle creation flow',
    ],
  },

  {
    version: '1.21.2',
    date: '15 maggio 2026',
    label: 'Auto',
    changes: [
      'start game editor wizard from step 1 for all modes',
    ],
  },

  {
    version: '1.21.1',
    date: '15 maggio 2026',
    label: 'Auto',
    changes: [
      'eliminate step 1 flash on quick-create and edit mode by initializing step state eagerly',
    ],
  },

  {
    version: '1.21.0',
    date: '15 maggio 2026',
    label: 'Auto',
    changes: [
      'add language switcher to home page under changelog, verify translations complete (296 keys both IT/EN)',
    ],
  },

  {
    version: '1.20.1',
    date: '14 maggio 2026',
    label: 'Auto',
    changes: [
      'reduce click latency and smooth internal navigation',
    ],
  },

  {
    version: '1.20.0',
    date: '14 maggio 2026',
    label: 'Auto',
    changes: [
      'smooth create-game navigation and wizard transitions',
    ],
  },

  {
    version: '1.19.0',
    date: '14 maggio 2026',
    label: 'Auto',
    changes: [
      'improve route transitions and fix lesson back navigation',
    ],
  },

  {
    version: '1.18.8',
    date: '14 maggio 2026',
    label: 'Auto',
    changes: [
      'move  illustator file',
    ],
  },

  {
    version: '1.18.7',
    date: '14 maggio 2026',
    label: 'Auto',
    changes: [
      'app icon',
    ],
  },

  {
    version: '1.18.6',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'memoize click handlers for mobile UX fluidity',
    ],
  },

  {
    version: '1.18.5',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'memoize onClick handlers in CourseClient and ProfileClient to reduce render cascades',
    ],
  },

  {
    version: '1.18.4',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'install CTA login con bottom sheet e harden PWA head/manifest',
    ],
  },

  {
    version: '1.18.3',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'fix icon',
    ],
  },

  {
    version: '1.18.2',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'new app icon',
    ],
  },

  {
    version: '1.18.1',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'corso pallini con stato lezione (verde/arancione/grigio)',
    ],
  },

  {
    version: '1.18.0',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiungi tasto condividi per installazione da home',
    ],
  },

  {
    version: '1.17.8',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'ripristina splash/meta iOS nel head renderizzato',
    ],
  },

  {
    version: '1.17.7',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'tab slider scrollabile e animazioni domande ripristinate',
    ],
  },

  {
    version: '1.17.6',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'revert(enoteca): annulla fix slider domande nella card',
    ],
  },

  {
    version: '1.17.5',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'contiene slider domande dentro la card su mobile',
    ],
  },

  {
    version: '1.17.4',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'renderizza tutti i link splash iOS nel head del RootLayout',
    ],
  },

  {
    version: '1.17.3',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiungi fallback splash iOS per iPhone mini/zoom e dpr3',
    ],
  },

  {
    version: '1.17.2',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'configura startup image iPhone 12 via metadata layout',
    ],
  },

  {
    version: '1.17.1',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiorna ICEBUCKET con idee offline future',
    ],
  },

  {
    version: '1.17.0',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'pre-cacha tutti i JSON dei corsi all\'installazione del SW',
    ],
  },

  {
    version: '1.16.3',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'offline page con link a corso vino, SW cacha pagine corso già visitate',
    ],
  },

  {
    version: '1.16.2',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'auto-reload pagina offline quando torna la rete',
    ],
  },

  {
    version: '1.16.1',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiornamenti sw.js, offline.html e ICEBUCKET',
    ],
  },

  {
    version: '1.16.0',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'offline minimale + pagina offline + ICEBUCKET.md con migliorie future',
    ],
  },

  {
    version: '1.15.0',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiunte vibrazioni haptic per risposta corretta/errata/combo in tutti i giochi',
    ],
  },

  {
    version: '1.14.2',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiorna manifest icons e layout metadata per favicon/apple-touch-icon corretti',
    ],
  },

  {
    version: '1.14.1',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'favicon e app icon ora servite solo da /app_icon, head aggiornata per compatibilità',
    ],
  },

  {
    version: '1.14.0',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiunti splash screen Apple automatici e favicon, migliorata gestione head',
    ],
  },

  {
    version: '1.13.30',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Add enoteca leaderboard and PWA install entrypoint',
    ],
  },

  {
    version: '1.13.29',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Refactor live and enoteca share details UI',
    ],
  },

  {
    version: '1.13.28',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Update docs and fix live avatar rendering',
    ],
  },

  {
    version: '1.13.27',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Polish course/live UI and fix SVG avatar selection',
    ],
  },

  {
    version: '1.13.26',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Polish sharing QR flows, copyright page, and wine course progress UI',
    ],
  },

  {
    version: '1.13.25',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Improve host invite share actions layout',
    ],
  },

  {
    version: '1.13.24',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Polish Enoteca/live sharing flows and navigation',
    ],
  },

  {
    version: '1.13.23',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'fix back button no logged user',
    ],
  },

  {
    version: '1.13.22',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: ['Refine course UX, guest navigation, and loading skeletons'],
  },

  {
    version: '1.13.21',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Polish course progress and lesson flow'],
  },

  {
    version: '1.13.20',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Auth mascot for password reset and improve avatar mapping'],
  },

  {
    version: '1.13.19',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Format live session avatar helper'],
  },

  {
    version: '1.13.18',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Fix live avatar constraint for SVG avatars'],
  },

  {
    version: '1.13.17',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Fix host avatar persistence in live session start'],
  },

  {
    version: '1.13.16',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Fix storico filters and spacing'],
  },

  {
    version: '1.13.15',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: [
      'UI/UX: corso mascotte, auth exit button, password reset copy, loading and form polish',
    ],
  },

  {
    version: '1.13.14',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: [
      'UX: homepage card buttons, forgot password, guest mode fix, InfoModal, ScrollToTop, BottleAnswersSelector redesign, auth form restyle',
    ],
  },

  {
    version: '1.13.13',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['UI polish: skeleton loading, fix deploy imports, fix corso vino level loading'],
  },

  {
    version: '1.13.12',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['force-add PageLayout.module.css (was ignored by gitignore)'],
  },

  {
    version: '1.13.11',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['page layout problem'],
  },

  {
    version: '1.13.10',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['fix css import'],
  },

  {
    version: '1.13.9',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Update GameCreateClient.jsx'],
  },

  {
    version: '1.13.8',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['fix style'],
  },

  {
    version: '1.13.7',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['add button variant'],
  },

  {
    version: '1.13.6',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['fix enoteca header'],
  },

  {
    version: '1.13.5',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: [
      'fix top bar padding',
      'UI polish: dashboard gradients bottom, miei giochi tabs pill, game card bigger name + uniform buttons, avatar picker row, SVG avatar fixes, corso vino badges, leaderboard/TopBar avatar unification, bugfixes',
    ],
  },

  {
    version: '1.13.4',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['UX: step scelta tipo gioco in /game/create + miglioramento grafico wizard'],
  },

  {
    version: '1.13.3',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['UX: skeleton loading su live session lobby e classifica live'],
  },

  {
    version: '1.13.2',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: [
      'host allPlayersCompleted gate + remove last supabaseClient calls from useRoundPlay',
      'route all live_round_answers DB ops through server routes',
      'remove dead HostLiveClient (/host route never used)',
      'guest last-bottle UX + remove dead roundAnchorAt state',
      'remove roundAnchorAt filter from handleAnswerInsert to fix end-game deadlock',
      'fixed',
    ],
  },

  {
    version: '1.13.1',
    date: '11 maggio 2026',
    label: 'Auto',
    changes: ['enoteca hanging on load for authenticated users + doc update'],
  },

  {
    version: '1.13.0',
    date: '11 maggio 2026',
    label: 'Auto',
    changes: ['storico - filtro per gioco con pills'],
  },

  {
    version: '1.12.0',
    date: '11 maggio 2026',
    label: 'Auto',
    changes: ['TopBar in storico e changelog'],
  },

  {
    version: '1.11.0',
    date: '11 maggio 2026',
    label: 'Auto',
    changes: ['storico partite live - snapshot, pagina /dashboard/storico'],
  },

  {
    version: '1.10.9',
    date: '11 maggio 2026',
    label: 'Auto',
    changes: ['live session - classifica overlay, t shadow, standings API'],
  },

  {
    version: '1.10.8',
    date: '11 maggio 2026',
    label: 'Auto',
    changes: ['i18n: deep copy cleanup and full IT/EN text optimization'],
  },

  {
    version: '1.10.7',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['rimossi i tentativi sperimentali sul check host e sulla latenza'],
  },

  {
    version: '1.10.6',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['precaricate le opzioni corrette host per ridurre la latenza al check'],
  },

  {
    version: '1.10.5',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['evitato il blocco del check host nello stato "checking"'],
  },

  {
    version: '1.10.4',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['mantenuto il check host attivo con fallback runtime'],
  },

  {
    version: '1.10.3',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: [
      'semplificato il percorso check host rimuovendo wrapper timeout e fallback API non necessari',
    ],
  },

  {
    version: '1.10.2',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['formattazione automatica changelog'],
  },

  {
    version: '1.10.1',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['stabilizzato il flusso di avvio e caricamento in Enoteca'],
  },

  {
    version: '1.10.0',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ["uniformata la versione dell'app tra home e changelog"],
  },

  {
    version: '1.9.2',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['complete i18n dictionary migration and logout cleanup'],
  },

  {
    version: '1.9.1',
    date: '10 maggio 2026',
    label: 'i18n & Session',
    changes: [
      'Rimossi i flag isEn/isEnglish dal runtime app in favore di dizionari centralizzati',
      'Migrazione testi live/corso/dashboard verso useT o pickLangText con nuove chiavi locale',
      'Logout rinforzato: pulizia storage/cookie/cache/IndexedDB e redirect alla home',
      'Refactor wineCourseContent con fallback localizzati da dizionario (it/en)',
    ],
  },

  {
    version: '1.9.0',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: [
      'Live UX fixes, i18n/dashboard updates, and changelog note for host check latency',
      'course admin editor with Supabase Storage backend',
    ],
  },

  {
    version: '1.8.1',
    date: '10 maggio 2026',
    label: 'Live UX',
    changes: [
      'Fix gating classifica finale: il pulsante resta disabilitato finché non hanno completato tutti i partecipanti del round corrente',
      'Migliorata UX transizione verso classifica finale',
      "Nota aperta: la velocità di feedback del pulsante 'Check' per host non è ancora pienamente risolta",
    ],
  },

  {
    version: '1.8.0',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['fix live session creation and game save timeout blocking'],
  },

  {
    version: '1.7.1',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['format changelog automation script'],
  },

  {
    version: '1.7.0',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['improve all wine course lessons and answer balance'],
  },

  {
    version: '1.6.2',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['automate changelog update on pre-push'],
  },

  {
    version: '1.6.0',
    date: '10 maggio 2026',
    label: 'UX & Mobile',
    changes: [
      'Homepage semplificata: 3 pulsanti (Accedi/Registrati, Corso Vino, Come funziona) in colonna',
      'Pagina /auth dedicata per il form di login e registrazione (rimossa dalla homepage)',
      'Modale ospite nel Corso Vino al posto del banner inline',
      'Fix skeleton loading su mobile: nessun elemento esce fuori dai box (maxWidth: 100%)',
      'Fix key prop mancante nei card skeleton della dashboard',
      'Pulsante Changelog aggiunto nel profilo utente',
      'Fix header profilo su mobile: pulsanti Indietro e Logout affiancati orizzontalmente',
    ],
  },
  {
    version: '1.5.1',
    date: '9 maggio 2026',
    label: 'Corso Vino UX',
    changes: [
      'Schermata risultato lezione semplificata: mantenuto un solo pulsante principale in basso',
      'Aggiunto nel top header il pulsante "Tutte le lezioni" / "All lessons"',
      'Rimosso il pulsante "Ripeti lezione" dalla schermata finale della lezione',
      'Elenco lezioni livello: aumentata la visibilità delle lezioni completate con badge "Ripeti/Repeat" e contrasto migliorato',
    ],
  },
  {
    version: '1.5.0',
    date: '9 maggio 2026',
    label: 'Performance & UX',
    changes: [
      'React.memo su tutti i componenti presentazionali per ridurre i re-render',
      "Leaderboard nell'overlay aggiornata ogni 3 secondi mentre è aperta",
      'Supporto tasto Invio per Check e Continue da tastiera',
      'Ottimizzazioni CSS mobile: touch-action, overscroll-behavior, will-change, -webkit-tap-highlight-color',
      'Pagina classifica finale mobile-first (max 640px, podio a colonna singola su small screen)',
      'Pulsante "Torna alla Dashboard" sempre full-width su mobile',
      'Miglioramento logging errori su useRoundPlay (ora mostra il messaggio reale)',
    ],
  },
  {
    version: '1.4.0',
    date: '8 maggio 2026',
    label: 'Risultati e Leaderboard Live',
    changes: [
      'Sezione "🏆 Leaderboard Live" nei risultati bottiglia con proiezione punteggi e badge +N verde',
      "Fix double-count: snapshot dei punteggi congelato all'apertura di ogni bottiglia",
      'Badge "tu" inline viola per il giocatore corrente nella classifica',
      'Riga risposta con colore di sfondo e bordo sinistro colorato (verde corretto, rosso errato)',
      'Punti visualizzati come pill verde (+25 🔥 se combo)',
      'Unico pulsante "Vedi classifica" sull\'ultima bottiglia (rimosso "Termina")',
      'Host sempre reindirizzato alla classifica anche in caso di errore nel sync',
    ],
  },
  {
    version: '1.3.0',
    date: '7 maggio 2026',
    label: 'Multiplayer — Funzionalità sociali',
    changes: [
      'Indicatore di progresso: "X/N giocatori pronti..." nella schermata risultati',
      "Kick player: l'host può rimuovere un giocatore dalla partita dal pannello classifica",
      'Auto-reconnect: il giocatore che rientra viene reindirizzato direttamente al gioco se già in sessione',
      'Pulizia automatica sessioni terminate da più di 24 ore',
      'Polling fallback live_sessions ogni 3s nel client (copertura se Realtime non è attivo)',
    ],
  },
  {
    version: '1.2.0',
    date: '6 maggio 2026',
    label: 'Stabilità Realtime',
    changes: [
      'Fix blocco su "Attendi che tutti i giocatori finiscano": live_sessions aggiunta alla pubblicazione Realtime',
      'Polling ogni 2s sulle risposte mentre si aspetta il completamento del round',
      'Re-fetch risposte dal DB su ogni INSERT (evita lo strip delle righe altrui via RLS)',
      'Channel Realtime stabili: nessun re-subscribe inutile tra i render',
    ],
  },
  {
    version: '1.1.0',
    date: '5 maggio 2026',
    label: 'Gameplay & UX',
    changes: [
      'Sistema combo: risposte consecutive corrette danno +5/+10/+15 punti bonus',
      'Toast animato 🔥💥⚡️🤯 alla conquista di un combo',
      'Reveal bottiglia alla fine del round (nome, produttore, annata)',
      'Riepilogo risposte per domanda con esito corretto/errato',
      "Schermata di transizione con coriandoli tra una bottiglia e l'altra",
      'Pannello di uscita con modale di conferma',
      'Suoni audio: risposta corretta, errata, bottiglia completata (toggle ON/OFF)',
    ],
  },
  {
    version: '1.0.0',
    date: '4 maggio 2026',
    label: 'Launch',
    changes: [
      'Editor giochi: crea partite con bottiglie, domande a scelta multipla e risposte corrette',
      'Sessioni live multiplayer con Supabase Realtime',
      'Schermata quiz mobile-first con animazioni slide tra le domande',
      'Leaderboard in tempo reale accessibile durante la partita',
      'Leaderboard finale con podio 🥇🥈🥉 alla fine della sessione',
      'Foglio di stampa per condivisione fisica delle domande',
      'Dashboard host con lista partite e gestione sessioni',
      'Autenticazione utente (Supabase Auth)',
      'Skeleton loading su tutte le route data-fetching',
    ],
  },
]

const LABEL_COLORS = {
  'i18n & Session': '#0ea5e9',
  'Corso Vino UX': '#0f766e',
  'Performance & UX': '#6b2f8e',
  'Risultati e Leaderboard Live': '#2563eb',
  'Multiplayer — Funzionalità sociali': '#d97706',
  'Stabilità Realtime': '#dc2626',
  'Gameplay & UX': '#16a34a',
  Launch: '#374151',
}

const LABEL_TRANSLATIONS = {
  'i18n & Session': 'i18n & Session',
  'Corso Vino UX': 'Wine Course UX',
  'Performance & UX': 'Performance & UX',
  'Risultati e Leaderboard Live': 'Live Results & Leaderboard',
  'Multiplayer — Funzionalità sociali': 'Multiplayer — Social Features',
  'Stabilità Realtime': 'Realtime Stability',
  'Gameplay & UX': 'Gameplay & UX',
  Launch: 'Launch',
  Auto: 'Auto',
}

const IT_TO_EN_MONTH = {
  gennaio: 'January',
  febbraio: 'February',
  marzo: 'March',
  aprile: 'April',
  maggio: 'May',
  giugno: 'June',
  luglio: 'July',
  agosto: 'August',
  settembre: 'September',
  ottobre: 'October',
  novembre: 'November',
  dicembre: 'December',
}

const IT_MONTH_TO_INDEX = {
  gennaio: 0,
  febbraio: 1,
  marzo: 2,
  aprile: 3,
  maggio: 4,
  giugno: 5,
  luglio: 6,
  agosto: 7,
  settembre: 8,
  ottobre: 9,
  novembre: 10,
  dicembre: 11,
}

function formatEntryDate(date, lang) {
  if (lang !== 'en') return date
  const parts = String(date).trim().split(' ')
  if (parts.length !== 3) return date

  const [day, month, year] = parts
  const monthEn = IT_TO_EN_MONTH[month.toLowerCase()]
  if (!monthEn) return date
  return `${monthEn} ${day}, ${year}`
}

function formatEntryLabel(label, lang) {
  if (lang !== 'en') return label
  return LABEL_TRANSLATIONS[label] ?? label
}

function formatEntryDescription(description, lang) {
  if (!description) return null
  if (typeof description === 'string') return description
  return description[lang] ?? description.it ?? description.en ?? null
}

function parseItalianDate(dateString) {
  const parts = String(dateString || '').trim().split(' ')
  if (parts.length !== 3) return null
  const day = Number(parts[0])
  const month = IT_MONTH_TO_INDEX[parts[1]?.toLowerCase()]
  const year = Number(parts[2])
  if (!Number.isFinite(day) || month == null || !Number.isFinite(year)) return null
  return new Date(year, month, day)
}

function formatDayKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getActivityText(count, lang) {
  if (lang === 'en') {
    if (count === 0) return 'No updates'
    if (count === 1) return '1 update'
    return `${count} updates`
  }

  if (count === 0) return 'Nessun aggiornamento'
  if (count === 1) return '1 aggiornamento'
  return `${count} aggiornamenti`
}

function buildActivityDays(entries) {
  const parsedDates = entries
    .map((entry) => parseItalianDate(entry.date))
    .filter(Boolean)
    .sort((a, b) => a - b)

  if (parsedDates.length === 0) return []

  const counts = new Map()
  entries.forEach((entry) => {
    const parsed = parseItalianDate(entry.date)
    if (!parsed) return
    const key = formatDayKey(parsed)
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  const start = new Date(parsedDates[0])
  const end = new Date(parsedDates[parsedDates.length - 1])
  const days = []
  const cursor = new Date(start)

  while (cursor <= end) {
    const day = new Date(cursor)
    const key = formatDayKey(day)
    days.push({
      key,
      count: counts.get(key) || 0,
      date: day,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

export default async function ChangelogPage() {
  const lang = await getServerLanguage()
  const text = lang === 'en' ? UI_TEXT.en : UI_TEXT.it
  const activityDays = buildActivityDays(CHANGELOG)
  const maxActivity = Math.max(1, ...activityDays.map((day) => day.count))

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{text.title}</h1>
          <p className={styles.subtitle}>{text.subtitle}</p>
        </div>

        {activityDays.length > 0 ? (
          <section className={styles.activityCard}>
            <div className={styles.activityHeader}>
              <div>
                <h2 className={styles.activityTitle}>{text.activityTitle}</h2>
                <p className={styles.activitySubtitle}>{text.activitySubtitle}</p>
              </div>
              <div className={styles.activityLegend}>
                <span>{text.lowActivity}</span>
                <div className={styles.activityLegendScale} aria-hidden="true">
                  {[0, 1, 2, 3].map((level) => (
                    <span
                      key={level}
                      className={styles.activityLegendCell}
                      data-level={level}
                    />
                  ))}
                </div>
                <span>{text.highActivity}</span>
              </div>
            </div>

            <div className={styles.activityScroller}>
              <div className={styles.activityDaysRow} role="img" aria-label={text.activityTitle}>
                {activityDays.map((day) => {
                  const filledTicks =
                    day.count === 0 ? 0 : Math.max(1, Math.round((day.count / maxActivity) * 5))
                  return (
                    <div
                      key={day.key}
                      className={styles.activityDayCard}
                      title={`${day.key} — ${getActivityText(day.count, lang)}`}>
                      <div className={styles.activityTicks} aria-hidden="true">
                        {Array.from({length: 5}).map((_, tickIndex) => (
                          <span
                            key={tickIndex}
                            className={styles.activityTick}
                            data-filled={tickIndex >= 5 - filledTicks}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        ) : null}

        <div className={styles.timeline}>
          {CHANGELOG.map((entry) => {
            const description = formatEntryDescription(entry.description, lang)
            const [primaryChange, ...secondaryChanges] = entry.changes

            return (
              <div key={entry.version} className={styles.entry}>
                <div className={styles.entryMeta}>
                  <span className={styles.version}>v{entry.version}</span>
                  <span className={styles.date}>{formatEntryDate(entry.date, lang)}</span>
                </div>
                <div className={styles.entryBody}>
                  <div className={styles.entryMetaInline}>
                    <span className={styles.version}>v{entry.version}</span>
                    <span className={styles.date}>{formatEntryDate(entry.date, lang)}</span>
                  </div>
                  <div className={styles.entryHeader}>
                    <span
                      className={styles.label}
                      style={{background: LABEL_COLORS[entry.label] ?? '#374151'}}>
                      {formatEntryLabel(entry.label, lang)}
                    </span>
                  </div>
                  {primaryChange ? <h3 className={styles.entryTitle}>{primaryChange}</h3> : null}
                  {description ? <p className={styles.description}>{description}</p> : null}
                  {secondaryChanges.length > 0 ? (
                    <ul className={styles.changeList}>
                      {secondaryChanges.map((change, i) => (
                        <li key={i} className={styles.changeItem}>
                          {change}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
