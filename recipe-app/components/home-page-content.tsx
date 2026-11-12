
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Allergen = {
  id: number
  name: string
}

type Recipe = {
  id: number
  user_id: string
  title: string
  description: string
  image_url: string
  created_at: string
  profiles: {
    name: string
    avatar_url: string | null
  } | null
}

type Props = {
  userName: string
  userId: string
}

export default function HomePageContent({ userName, userId }: Props) {
  const [allergens, setAllergens] = useState<Allergen[]>([])
  const [selectedAllergens, setSelectedAllergens] = useState<number[]>([])
  const [isAllergyOpen, setIsAllergyOpen] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [isFollowingLoading, setIsFollowingLoading] = useState(true)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isRecipeLoading, setIsRecipeLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const DISPLAY_COUNT = 6

  // Supabaseからアレルギー情報を取得
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

  // Supabaseからフォロー中ユーザーを取得
  useEffect(() => {
    const fetchFollowing = async () => {
        const supabase = createClient()

        const { data, error } = await supabase
          .from('follows')
          .select('following_id')
        .eq('follower_id', userId)

        if (error) {
          console.error('フォロー情報取得エラー:', error)
          setIsFollowingLoading(false)
          return
        }

        setFollowingIds(
          (data ?? []).map((follow) => follow.following_id)
        )

        setIsFollowingLoading(false)
    }

      fetchFollowing()
  }, [userId])


  // フォロー中ユーザーのレシピを取得
useEffect(() => {
  const fetchRecipes = async () => {
    if (followingIds.length === 0) {
      setRecipes([])
      setHasMore(false)
      return
    }

    setIsRecipeLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id,
        user_id,
        title,
        description,
        image_url,
        created_at,
        profiles!recipes_user_id_fkey (
          name,
          avatar_url
          )
      `)
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .range(0, DISPLAY_COUNT)

    if (error) {
      console.error('レシピ取得エラー:', error)
      setIsRecipeLoading(false)
      return
    }

    const fetchedRecipes = (data ?? []) as unknown as Recipe[]

    setRecipes(fetchedRecipes.slice(0, DISPLAY_COUNT))
    setHasMore(fetchedRecipes.length > DISPLAY_COUNT)
    setIsRecipeLoading(false)
  }

  if (!isFollowingLoading) {
    fetchRecipes()
  }
}, [followingIds, isFollowingLoading])


// 追加のレシピを取得
const handleLoadMore = async () => {
  if (isRecipeLoading || !hasMore) return

  setIsRecipeLoading(true)

  const supabase = createClient()

  const { data, error } = await supabase
    .from('recipes')
    .select(`
      id,
      user_id,
      title,
      description,
      image_url,
      created_at,
      profiles!recipes_user_id_fkey (
        name,
        avatar_url
      )
    `)
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .range(recipes.length,recipes.length + DISPLAY_COUNT)

  if (error) {
    console.error('追加レシピ取得エラー:', error)
    setIsRecipeLoading(false)
    return
  }

  const newRecipes = (data ?? []) as unknown as Recipe[]

  setRecipes((current) => [
    ...current,
    ...newRecipes.slice(0, DISPLAY_COUNT),
])

setHasMore(newRecipes.length > DISPLAY_COUNT)

}


  // アレルギー選択
  const toggleAllergen = (allergenId: number) => {
    setSelectedAllergens((current) =>
      current.includes(allergenId)
        ? current.filter((id) => id !== allergenId)
        : [...current, allergenId]
    )
  }

  // 検索処理
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // 検索処理はあとから実装
    console.log({
      keyword,
      selectedAllergens,
    })
  }

  return (
    <main className="min-h-screen bg-[#f8f8f5] text-gray-800">

      {/* ヘッダー */}
      <header className="bg-white px-6 py-5 shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">

          <Link
            href="/"
            className="text-3xl font-bold text-[#55a66b]"
          >
            Recipia
          </Link>

          <form
            onSubmit={handleSearch}
            className="flex min-w-[240px] flex-1"
          >
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="入力してください"
              className="w-full rounded-l-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#55a66b]"
            />

            <button
              type="submit"
              className="rounded-r-lg bg-[#55a66b] px-5 text-white hover:bg-[#438c57]"
            >
              検索
            </button>
          </form>

          <Link
            href="/mypage"
            title={`${userName}さんのマイページ`}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e5f3e8] text-xl text-[#438c57]"
          >
            👤
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* アレルギー指定欄 */}
        <section className="mb-10 overflow-hidden rounded-xl bg-[#fff0df]">

          <button
            type="button"
            onClick={() => setIsAllergyOpen(!isAllergyOpen)}
            className="flex w-full items-center justify-between px-6 py-5 text-left font-bold"
          >
            <span className="text-lg">アレルギー指定欄</span>

            <span className="text-xl">
              {isAllergyOpen ? '▲' : '▼'}
            </span>
          </button>

          {isAllergyOpen && (
            <div className="grid grid-cols-2 gap-4 px-6 pb-6 sm:grid-cols-3 md:grid-cols-5">

              {allergens.map((allergen) => (
                <label
                  key={allergen.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedAllergens.includes(allergen.id)}
                    onChange={() => toggleAllergen(allergen.id)}
                    className="h-4 w-4 accent-[#55a66b]"
                  />

                  <span>{allergen.name}</span>
                </label>
              ))}

              {allergens.length === 0 && (
                <p className="col-span-full text-sm text-gray-500">
                  アレルギー情報を読み込んでいます...
                </p>
              )}

            </div>
          )}
        </section>


{/* フォロー中ユーザーの最新レシピ */}
<section>
  <h2 className="mb-6 text-xl font-bold">
    フォロー中ユーザーの最新レシピ
  </h2>

  {isFollowingLoading || isRecipeLoading && recipes.length === 0 ? (
    <div className="flex min-h-[300px] items-center justify-center">
      <p>レシピを読み込み中...</p>
    </div>
  ) : followingIds.length === 0 ? (
    // フォローが0人の場合
    <div className="flex min-h-[380px] items-center justify-center">
      <p className="text-center text-lg font-bold text-gray-800">
        ユーザーをフォローすると、ここに新しいレシピが表示されます
      </p>
    </div>
  ) : recipes.length === 0 ? (
    // フォロー中ユーザーのレシピが0件の場合
    <div className="flex min-h-[300px] items-center justify-center">
      <p className="text-center text-lg font-bold text-gray-800">
        フォロー中のユーザーのレシピはありません。
      </p>
    </div>
  ) : (
    <>
      {/* レシピ一覧 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

        {recipes.map((recipe) => (
          <Link
            key={recipe.id}
            href={`/recipe/${recipe.id}`}
            className="overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
          >
            <div className="h-48 bg-gray-200">
              {recipe.image_url ? (
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  レシピ画像
                </div>
              )}
            </div>

            <div className="p-4">
              <p className="font-bold">
                {recipe.title}
              </p>

              <p className="mt-2 text-sm text-gray-500">
                投稿者：{recipe.profiles?.name ?? 'ユーザー'}
              </p>
            </div>
          </Link>
        ))}

      </div>

      {/* もっとみるボタン */}
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isRecipeLoading}
            className="rounded-lg bg-[#e99a52] px-10 py-3 font-bold text-white shadow-sm transition hover:bg-[#d9873e] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRecipeLoading ? '読み込み中...' : 'もっとみる'}
          </button>
        </div>
      )}
    </>
  )}
</section>


        {/* レシピ作成 */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">

          <Link
            href="/recipe/post"
            className="rounded-lg bg-[#e99a52] px-8 py-3 font-bold text-white hover:bg-[#d9873e]"
          >
            ＋ レシピ作成
          </Link>


        </div>
      </div>
    </main>
  )
}
