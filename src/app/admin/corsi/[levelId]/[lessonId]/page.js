import {notFound} from 'next/navigation'
import {getRawCourseJson} from '@/lib/courseAdmin'
import TopBarBack from '@/components/TopBarBack'
import Link from 'next/link'
import LessonEditorClient from './LessonEditorClient'
import styles from '../../admin.module.scss'

export default async function AdminLessonEditorPage({params, searchParams}) {
  const {levelId, lessonId} = await params
  const sp = await searchParams
  const lang = sp?.lang === 'en' ? 'en' : 'it'

  const levelNum = parseInt(levelId, 10)
  const lessonIndex = parseInt(lessonId, 10) - 1 // 1-based in URL

  if (!levelNum || !lessonId || lessonIndex < 0) notFound()

  let rawData = null
  try {
    rawData = await getRawCourseJson(lang, levelNum)
  } catch {
    // Fallback to Italian if EN file is missing or unavailable
    try {
      rawData = await getRawCourseJson('it', levelNum)
    } catch {}
  }
  if (!rawData) notFound()

  const lesson = rawData.lessons?.[lessonIndex]
  if (!lesson) notFound()

  return (
    <main className={styles.page}>
      <TopBarBack
        title={`✏️ ${lesson.title}`}
        href={`/admin/corsi/${levelNum}${lang === 'en' ? '?lang=en' : ''}`}
      />

      <div className={styles.container}>
        {/* Lang switcher */}
        <div className={styles.langTabs}>
          <Link
            href={`/admin/corsi/${levelNum}/${lessonId}`}
            className={`${styles.langTab} ${lang === 'it' ? styles.active : ''}`}>
            🇮🇹 Italiano
          </Link>
          <Link
            href={`/admin/corsi/${levelNum}/${lessonId}?lang=en`}
            className={`${styles.langTab} ${lang === 'en' ? styles.active : ''}`}>
            🇬🇧 English
          </Link>
        </div>

        <LessonEditorClient
          lang={lang}
          levelNum={levelNum}
          lessonIndex={lessonIndex}
          initialLesson={lesson}
          levelTitle={rawData.title}
        />
      </div>
    </main>
  )
}
