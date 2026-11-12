
import { Suspense } from 'react'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomePageContent from '@/components/home-page-content'

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
    <HomePageContent
      userName={
        user.user_metadata.full_name ?? user.email ?? 'ユーザー'
      }
      userId={user.id}
    />
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<p>読み込み中...</p>}>
      <AuthenticatedHome />
    </Suspense>
  )
}
