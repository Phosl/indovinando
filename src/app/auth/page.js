import {redirect} from 'next/navigation'

export default async function AuthPage({searchParams}) {
  const resolved = await Promise.resolve(searchParams)
  const next = resolved?.next

  if (typeof next === 'string' && next.startsWith('/')) {
    redirect(`/?next=${encodeURIComponent(next)}`)
  }

  redirect('/')
}
