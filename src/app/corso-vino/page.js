import levels from '@/data/wine-course/levels.json'
import CourseClient from './CourseClient'

export const metadata = {
  title: 'Corso di Vino | Indovinando',
  description: 'Impara il vino passo dopo passo con lezioni interattive stile Duolingo.',
}

export default function CorsoVino() {
  return <CourseClient levels={levels} />
}
