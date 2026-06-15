'use client'

import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'

/**
 * Thin client wrapper around TopBar that handles the back navigation.
 * Usable from server components that cannot pass function props.
 */
export default function TopBarBack({title, href}) {
  const router = useRouter()
  return <TopBar title={title} onBack={() => router.push(href)} safeAreaTop />
}
