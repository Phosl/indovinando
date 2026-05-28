'use client'

import dynamic from 'next/dynamic'

const DashboardInfoFab = dynamic(() => import('./DashboardInfoFab'), {ssr: false})

export default function DashboardInfoFabWrapper(props) {
  return <DashboardInfoFab {...props} />
}
