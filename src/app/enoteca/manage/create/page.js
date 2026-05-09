'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabaseClient'

export default function EnotecaCreatePage() {
  const router = useRouter()

  useEffect(() => {
    async function createAndRedirect() {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) { router.replace('/auth'); return }

      const { data: menu, error } = await supabaseClient
        .from('enoteca_menus')
        .insert({ user_id: user.id, name: 'Nuovo menu', is_published: false })
        .select('id')
        .single()

      if (error || !menu) { router.replace('/dashboard'); return }

      router.replace(`/enoteca/manage/${menu.id}`)
    }

    createAndRedirect()
  }, [router])

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 16 }}>
      Creazione menu…
    </div>
  )
}
