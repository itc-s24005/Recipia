
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      alert('ログアウトに失敗しました')
      console.error(error)
      return
    }

    router.replace('/login')
    router.refresh()
  }

  return (
    <button onClick={handleLogout}>
      ログアウト
    </button>
  )
}
