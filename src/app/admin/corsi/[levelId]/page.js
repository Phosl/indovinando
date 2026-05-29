import {notFound} from 'next/navigation'
import {getRawCourseJson} from '@/lib/courseAdmin'
import TopBarBack from '@/components/TopBarBack'
import Link from 'next/link'
import styles from '../admin.module.scss'

export default async function AdminLevelPage({params, searchParams}) {
  const {levelId} = await params
  const sp = await searchParams
  const lang = sp?.lang === 'en' ? 'en' : 'it'
  const levelNum = parseInt(levelId, 10)
  if (!levelNum || levelNum < 1 || levelNum > 10) notFound()

  let dataIt = null
  let dataEn = null
  try {
    dataIt = await getRawCourseJson('it', levelNum)
  } catch {}
  try {
    dataEn = await getRawCourseJson('en', levelNum)
  } catch {}

  if (!dataIt) notFound()
  const activeData = lang === 'en' && dataEn ? dataEn : dataIt

  return (
    <main className={styles.page}>
      <TopBarBack title={`⚙️ Livello ${levelNum} — ${activeData.title}`} href="/admin/corsi" />

      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Lezioni</h2>
          <p className={styles.hint}>
            Seleziona una lezione per modificarla. Le modifiche vengono salvate su Supabase Storage.
          </p>
        </div>

        {/* Lang tabs — static links */}
        <div className={styles.langTabs}>
          <Link
            href={`/admin/corsi/${levelNum}`}
            className={`${styles.langTab} ${lang === 'it' ? styles.active : ''}`}>
            🇮🇹 Italiano
          </Link>
          <Link
            href={`/admin/corsi/${levelNum}?lang=en`}
            className={`${styles.langTab} ${lang === 'en' ? styles.active : ''}`}>
            🇬🇧 English
          </Link>
        </div>

        <div className={styles.lessonList}>
          {(activeData.lessons ?? []).map((lesson, i) => (
            <Link
              key={lesson.id ?? i}
              href={`/admin/corsi/${levelNum}/${i + 1}${lang === 'en' ? '?lang=en' : ''}`}
              className={styles.lessonCard}>
              <span className={styles.lessonNum}>#{i + 1}</span>
              <span className={styles.lessonTitle}>{lesson.title}</span>
              <span className={styles.lessonMeta}>
                {lesson.questions?.length ?? 0} domande ·{' '}
                {lesson.slides?.length ?? (lesson.intro ? 1 : 0)} slide
              </span>
              <span style={{color: 'var(--selected)', fontWeight: 900}}>›</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
