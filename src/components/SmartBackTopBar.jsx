'use client'

import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'

export default function SmartBackTopBar({title, fallbackHref = '/'}) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    router.push(fallbackHref)
  }

  return <TopBar title={title} onBack={handleBack} />
}
