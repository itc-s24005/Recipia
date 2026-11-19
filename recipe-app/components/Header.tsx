
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchContext } from '@/components/search-context'
import Image from 'next/image'

type Allergen = {
  id: number
  name: string
}

type Props = {
  userName?: string
}

export default function Header({ userName }: Props) {
  const router = useRouter()

  const [allergens, setAllergens] = useState<Allergen[]>([])
  const [isAllergyOpen, setIsAllergyOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const {
    selectedAllergens,
    setSelectedAllergens,
    keyword,
    setKeyword,
  } = useSearchContext()

  // アレルギー情報を取得
  useEffect(() => {
    const fetchAllergens = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('allergens')
        .select('id, name')
        .order('id', { ascending: true })

      if (error) {
        console.error('アレルギー取得エラー:', error)
        return
      }

      setAllergens(data ?? [])
    }

    fetchAllergens()
  }, [])
  // ログインユーザーのプロフィール画像を取得
useEffect(() => {
  const fetchAvatar = async () => {
    const supabase = createClient()

    // ログインユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setAvatarUrl(null)
      return
    }

    // profilesテーブルからアイコン画像を取得
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('プロフィール画像取得エラー:', error)
      return
    }

    setAvatarUrl(data?.avatar_url ?? null)
  }

  fetchAvatar()
}, [])

  // アレルギー選択・解除
  const handleAllergenChange = (id: number) => {
    setSelectedAllergens((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  // 検索処理
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // アレルギー選択は必須
    if (selectedAllergens.length === 0) {
      alert('アレルギーを1つ以上選択してください。')
      return
    }

    const params = new URLSearchParams()

    // キーワードは任意
    if (keyword.trim()) {
      params.set('q', keyword.trim())
    }

    // 選択したアレルギー
    params.set('allergens', selectedAllergens.join(','))

    // 検索結果ページへ移動
    setIsAllergyOpen(false)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <header className="fixed top-0 left-0 z-50 w-full bg-white px-6 py-5 shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">

        {/* ロゴ */}
        <Link href="/" className="shrink-0">
          <Image
            src="/logo.png"
            alt="Recipiaのロゴ"
            width={150}
            height={50}
            priority
            className="h-12 w-auto object-contain"
          />
        </Link>



{/* 検索フォーム */}
<form
  onSubmit={handleSearch}
  className="flex min-w-0 flex-1 flex-row items-center gap-2"
>
  {/* キーワード入力 */}
  <input
    type="text"
    value={keyword}
    onChange={(e) => setKeyword(e.target.value)}
    placeholder="レシピ名・説明文・材料名で検索（任意）"
    className="h-12 min-w-0 flex-1 rounded-lg border border-gray-300 px-4 outline-none focus:border-[#55a66b]"
  />

  {/* 検索ボタン */}
  <button
    type="submit"
    disabled={selectedAllergens.length === 0}
    className="h-12 shrink-0 rounded-lg bg-[#55a66b] px-5 font-bold text-white hover:bg-[#438c57] disabled:cursor-not-allowed disabled:bg-gray-400"
  >
    検索
  </button>

  {/* アレルギー選択 */}
  <div className="relative shrink-0 w-52">
    <button
      type="button"
      onClick={() => setIsAllergyOpen(!isAllergyOpen)}
      className="flex h-12 w-full items-center justify-between rounded-lg bg-[#fff0df] px-4 font-bold text-[#26364a] hover:bg-[#ffe9d2]"
    >
      <span>アレルギー指定欄</span>
      <span>{isAllergyOpen ? '▲' : '▼'}</span>
    </button>

    
{isAllergyOpen && (
  <div className="absolute right-0 top-full z-[60] mt-2 w-[min(1100px,calc(100vw-40px))] rounded-xl bg-[#fff0df] p-5 shadow-lg">

    <div className="grid grid-cols-5 gap-4">

      {allergens.map((allergen) => (
        <label
          key={allergen.id}
          className="flex min-h-[48px] cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-3 text-sm text-[#26364a] hover:bg-gray-50"
        >
          <input
            type="checkbox"
            checked={selectedAllergens.includes(allergen.id)}
            onChange={() => handleAllergenChange(allergen.id)}
            className="h-4 w-4 shrink-0 accent-[#55a66b]"
          />

          <span>{allergen.name}</span>
        </label>
      ))}

    </div>

    <button
      type="button"
      onClick={() => setSelectedAllergens([])}
      className="mt-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
    >
      選択を解除
    </button>

  </div>
)}

  </div>
</form>



{/* マイページ */}
<Link
  href="/my"
  title={`${userName ?? 'ユーザー'}さんのマイページ`}
  className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e5f3e8] text-xl text-[#438c57]"
>
  {avatarUrl ? (
    <img
      src={avatarUrl}
      alt="プロフィール画像"
      className="h-full w-full object-cover"
    />
  ) : (
    '👤'
  )}
</Link>
        

      </div>
    </header>
  )
}
