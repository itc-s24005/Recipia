'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/Header'

export default function HeaderWrapper() {
  const pathname = usePathname()

  // ログイン画面ではヘッダーを表示しない
  if (pathname === '/login') {
    return null
  }

  return <Header />
}