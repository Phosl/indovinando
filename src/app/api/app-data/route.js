import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getWineCourseData} from '@/lib/wineCourseContent'
import {getAppVersion} from '@/lib/appVersion'
import {normalizeAiScanCredits} from '@/lib/aiScanCredits'

const PROFILE_COLUMNS = [
  'username',
  'avatar_emoji',
  'super_admin',
  'profile_type',
  'experience_level',
  'favorite_wine_types',
  'favorite_countries',
  'city',
  'province',
  'newsletter_opt_in',
  'business_name',
  'business_type',
  'business_description',
  'business_website',
  'business_phone',
  'business_address',
  'business_latitude',
  'business_longitude',
  'business_logo_path',
  'business_logo_url',
  'is_partner_public',
  'partner_slug',
  'profile_completed_at',
  'profile_prompt_dismissed_at',
  'ai_scan_credits_total',
  'ai_scan_credits_bonus',
  'ai_scan_credits_used',
].join(', ')

export async function GET() {
  const supabase = await createServerSupabase()
  const [lang, authResult] = await Promise.all([getServerLanguage(), supabase.auth.getUser()])
  const user = authResult.data?.user

  if (!user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401})
  }

  const [profileResult, gamesResult, courseResult, completedLessonsResult, appVersion] =
    await Promise.all([
      supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).maybeSingle(),
      supabase.from('games').select('id', {count: 'exact', head: true}).eq('created_by', user.id),
      getWineCourseData(lang).catch(() => ({levels: []})),
      supabase
        .from('wine_course_progress')
        .select('id', {count: 'exact', head: true})
        .eq('user_id', user.id)
        .eq('completed', true),
      getAppVersion(),
    ])

  const profile = profileResult.data || null
  const levels = courseResult.levels || []
  const totalLessons = levels.reduce((sum, level) => sum + (level.lessonIds?.length || 0), 0)
  const completedLessons = completedLessonsResult.count || 0
  const progressPct =
    totalLessons > 0 ? Math.round(Math.min(100, (completedLessons / totalLessons) * 100)) : 0

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email || '',
    },
    profile,
    gamesCount: gamesResult.count || 0,
    credits: normalizeAiScanCredits(profile || {}),
    courseProgress: {
      totalLessons,
      completedLessons,
      progressPct,
      hasStartedCourse: completedLessons > 0,
    },
    appVersion,
  })
}
