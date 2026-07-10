import {requireSuperAdmin} from '@/lib/courseAdmin'
import {getControlCenterSnapshot} from '@/lib/adminControlCenter'
import ControlCenterClient from './ControlCenterClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Centralina app',
}

export default async function ControlCenterPage() {
  await requireSuperAdmin('/profilo')
  const initialSnapshot = await getControlCenterSnapshot({scope: 'quick'})

  return <ControlCenterClient initialSnapshot={initialSnapshot} />
}
