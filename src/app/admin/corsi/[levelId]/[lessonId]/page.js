import {notFound} from 'next/navigation'
import {getRawCourseJson} from '@/lib/courseAdmin'
import TopBar from '@/components/TopBar'
import LessonEditorClient from './LessonEditorClient'
import styles from '../../admin.module.scss'

export default async function AdminLessonEditorPage({params, searchParams}) {
  const {levelId, lessonId} = await params
  const sp = await searchParams
  const lang = sp?.lang === 'en' ? 'en' : 'it'

  const levelNum = parseInt(levelId, 10)
  const lessonIndex = parseInt(lessonId, 10) - 1 // 1-based in URL

  if (!levelNum || !lessonId || lessonIndex < 0) notFound()

  const rawData = await getRawCourseJson(lang, levelNum)
  if (!rawData) notFound()

  const lesson = rawData.lessons?.[lessonIndex]
  if (!lesson) notFound()

  return (
    <main className={styles.page}>
      <TopBar
        title={`✏️ ${lesson.title}`}
        back={`/admin/corsi/${levelNum}`}
        backLabel={`← Livello ${levelNum}`}
      />

      <div className={styles.container}>
        {/* Lang switcher */}
        <div className={styles.langTabs}>
          <a
            href={`/admin/corsi/${levelNum}/${lessonId}`}
            className={`${styles.langTab} ${lang === 'it' ? styles.active : ''}`}>
            🇮🇹 Italiano
          </a>
          <a
            href={`/admin/corsi/${levelNum}/${lessonId}?lang=en`}
            className={`${styles.langTab} ${lang === 'en' ? styles.active : ''}`}>
            🇬🇧 English
          </a>
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
