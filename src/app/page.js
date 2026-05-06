import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'

export default async function Home() {
  const supabase = await createServerSupabase()
  const {data} = await supabase.auth.getUser()

  // Se loggato, redirect a dashboard
  if (data.user) {
    redirect('/dashboard')
  }

  return (
    <main className="flex-container">
      <div className="flex-column">
        <h1>Welcome to Indovinando</h1>
        <p>A simple game to discover wine</p>
        <div>
          <a href="/auth" className="primary">
            Login o Registrati
          </a>
        </div>
      </div>
    </main>
  )
}
