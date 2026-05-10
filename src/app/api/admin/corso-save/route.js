import {NextResponse} from 'next/server'
import {isSuperAdmin, getRawCourseJson} from '@/lib/courseAdmin'
import {createServerSupabase} from '@/lib/supabaseServer'

export async function POST(request) {
  // AuthZ check
  const admin = await isSuperAdmin()
  if (!admin) {
    return NextResponse.json({error: 'Not authorized'}, {status: 403})
  }

  const body = await request.json()
  const {lang, levelNum, lessonIndex, lesson} = body

  if (!lang || !levelNum || lessonIndex == null || !lesson) {
    return NextResponse.json({error: 'Missing required fields'}, {status: 400})
  }

  // Load full course JSON, patch the lesson, save back
  const rawData = await getRawCourseJson(lang, levelNum)
  if (!rawData) {
    return NextResponse.json({error: 'Course not found'}, {status: 404})
  }

  if (!rawData.lessons?.[lessonIndex]) {
    return NextResponse.json({error: 'Lesson index out of range'}, {status: 400})
  }

  // Patch lesson in place
  rawData.lessons[lessonIndex] = lesson

  const filePath =
    lang === 'it'
      ? `corso_livello_${levelNum}.json`
      : `${lang}/corso_livello_${levelNum}.json`

  const content = JSON.stringify(rawData, null, 2)

  const supabase = await createServerSupabase()
  const {error} = await supabase.storage
    .from('corsi')
    .upload(filePath, new Blob([content], {type: 'application/json'}), {
      upsert: true,
      contentType: 'application/json',
    })

  if (error) {
    return NextResponse.json({error: error.message}, {status: 500})
  }

  return NextResponse.json({ok: true, path: filePath})
}
