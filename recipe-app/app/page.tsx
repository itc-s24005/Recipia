
import { Suspense } from 'react'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/logout-button'

async function AuthenticatedHome() {
  await connection()

  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <main style={{ padding: '40px' }}>
      <h1>Recipia</h1>
      <p>ログインに成功しました！</p>
      <p>
        ようこそ、{user.user_metadata.full_name ?? user.email} さん
      </p>
      <LogoutButton />
    </main>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<p>読み込み中...</p>}>
      <AuthenticatedHome />
    </Suspense>
  )
}
