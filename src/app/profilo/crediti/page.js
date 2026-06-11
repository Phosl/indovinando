import {redirect} from 'next/navigation'
import TopBar from '@/components/TopBar'
import ProfileCreditsClient from '@/components/profile/ProfileCreditsClient'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createAdminSupabase} from '@/lib/supabaseAdmin'
import {getServerLanguage} from '@/lib/i18n/server'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'
import styles from '../profilo.module.scss'

export const metadata = {
  title: 'Crediti',
}

export default async function ProfileCreditsPage() {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const locale = lang === 'en' ? en : it
  const profileText = locale.profile || it.profile
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth?next=/profilo/crediti')

  const [profileResult, myCreditOrdersResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, super_admin, ai_scan_credits_total, ai_scan_credits_bonus, ai_scan_credits_used')
      .eq('id', user.id)
      .single(),
    supabase
      .from('ai_credit_purchase_orders')
      .select(
        'id, pack_code, credits_amount, amount_cents, currency, status, completed_at, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', {ascending: false})
      .limit(30),
  ])

  const profile = profileResult.data || {}
  const myCreditOrders = myCreditOrdersResult.data || []
  const isSuperAdmin = profile?.super_admin === true
  let adminCreditSnapshot = null

  if (isSuperAdmin) {
    try {
      const admin = createAdminSupabase()
      const {data: allOrders = []} = await admin
        .from('ai_credit_purchase_orders')
        .select(
          'id, user_id, pack_code, credits_amount, amount_cents, currency, status, completed_at, created_at, metadata',
        )
        .order('created_at', {ascending: false})
        .limit(200)

      const completedOrders = allOrders.filter((order) => order.status === 'completed')
      const totalRevenueCents = completedOrders.reduce(
        (sum, order) => sum + Number(order.amount_cents || 0),
        0,
      )
      const totalCreditsSold = completedOrders.reduce(
        (sum, order) => sum + Number(order.credits_amount || 0),
        0,
      )

      const last14Days = Array.from({length: 14}, (_, index) => {
        const date = new Date()
        date.setHours(0, 0, 0, 0)
        date.setDate(date.getDate() - (13 - index))
        const key = date.toISOString().slice(0, 10)
        return {
          key,
          label: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
          revenueCents: 0,
          orders: 0,
        }
      })

      const dayMap = new Map(last14Days.map((item) => [item.key, item]))
      completedOrders.forEach((order) => {
        const sourceDate = order.completed_at || order.created_at
        if (!sourceDate) return
        const key = new Date(sourceDate).toISOString().slice(0, 10)
        const bucket = dayMap.get(key)
        if (!bucket) return
        bucket.revenueCents += Number(order.amount_cents || 0)
        bucket.orders += 1
      })

      adminCreditSnapshot = {
        totalOrders: allOrders.length,
        totalCompletedOrders: completedOrders.length,
        totalRevenueCents,
        totalCreditsSold,
        recentOrders: allOrders.slice(0, 30),
        chart: last14Days,
      }
    } catch (error) {
      console.error('[profile credits admin snapshot]', error)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <TopBar title={profileText.credits || 'Crediti'} back="/profilo" backLabel="Profilo" />
        <ProfileCreditsClient
          profileData={profile}
          myCreditOrders={myCreditOrders}
          adminCreditSnapshot={adminCreditSnapshot}
        />
      </div>
    </main>
  )
}
