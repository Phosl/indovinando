import {redirect} from 'next/navigation'
import {isSuperAdmin} from '@/lib/courseAdmin'

export default async function AdminLayout({children}) {
  const admin = await isSuperAdmin()
  if (!admin) redirect('/dashboard')

  return <>{children}</>
}
