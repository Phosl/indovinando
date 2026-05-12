import {notFound} from 'next/navigation'
import {getRawCourseJson} from '@/lib/courseAdmin'
import TopBarBack from '@/components/TopBarBack'
import styles from '../admin.module.scss'

export default async function AdminLevelPage({params}) {
  const {levelId} = await params
  const levelNum = parseInt(levelId, 10)
  if (!levelNum || levelNum < 1 || levelNum > 10) notFound()

  const [dataIt, dataEn] = await Promise.all([
    getRawCourseJson('it', levelNum),
    getRawCourseJson('en', levelNum),
  ])

  if (!dataIt) notFound()

  return (
    <main className={styles.page}>
      <TopBarBack title={`⚙️ Livello ${levelNum} — ${dataIt.title}`} href="/admin/corsi" />

      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Lezioni</h2>
          <p className={styles.hint}>
            Seleziona una lezione per modificarla. Le modifiche vengono salvate su Supabase Storage.
          </p>
        </div>

        {/* Lang tabs — static links */}
        <div className={styles.langTabs}>
          <span className={`${styles.langTab} ${styles.active}`}>🇮🇹 Italiano</span>
          <a href={`/admin/corsi/${levelNum}?lang=en`} className={styles.langTab}>
            🇬🇧 English
          </a>
        </div>

        <div className={styles.lessonList}>
          {(dataIt.lessons ?? []).map((lesson, i) => (
            <a
              key={lesson.id ?? i}
              href={`/admin/corsi/${levelNum}/${i + 1}`}
              className={styles.lessonCard}>
              <span className={styles.lessonNum}>#{i + 1}</span>
              <span className={styles.lessonTitle}>{lesson.title}</span>
              <span className={styles.lessonMeta}>
                {lesson.questions?.length ?? 0} domande ·{' '}
                {lesson.slides?.length ?? (lesson.intro ? 1 : 0)} slide
              </span>
              <span style={{color: 'var(--selected)', fontWeight: 900}}>›</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
