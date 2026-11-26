
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'



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
  allergens: string[]
}

type Props = {
  userName: string
  userId: string
}

export default function HomePageContent({ userName, userId }: Props) {
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [isFollowingLoading, setIsFollowingLoading] = useState(true)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isRecipeLoading, setIsRecipeLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const DISPLAY_COUNT = 6

  // レシピごとの対応アレルギー食品を取得
const addAllergensToRecipes = async (recipeList: Recipe[]) => {
  if (recipeList.length === 0) return recipeList

  const supabase = createClient()

  const recipeIds = recipeList.map((recipe) => recipe.id)

  const { data, error } = await supabase
    .from('recipe_allergens')
    .select(`
      recipe_id,
      allergens(name)
    `)
    .in('recipe_id', recipeIds)

  if (error) {
    console.error('アレルギー食品取得エラー:', error)

    return recipeList.map((recipe) => ({
      ...recipe,
      allergens: [],
    }))
  }

  type RecipeAllergenRow = {
    recipe_id: number
    allergens: {
      name: string
    } | null
  }

  const rows = (data ?? []) as unknown as RecipeAllergenRow[]

  const allergenMap = new Map<number, string[]>()

  rows.forEach((row) => {
    if (!row.allergens) return

    const current = allergenMap.get(row.recipe_id) ?? []

    if (!current.includes(row.allergens.name)) {
      current.push(row.allergens.name)
    }

    allergenMap.set(row.recipe_id, current)
  })

  return recipeList.map((recipe) => ({
    ...recipe,
    allergens: allergenMap.get(recipe.id) ?? [],
  }))
}


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
    
    const recipesWithAllergens =
    await addAllergensToRecipes(fetchedRecipes)

    setRecipes(recipesWithAllergens.slice(0, DISPLAY_COUNT))
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

  try {
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
      .range(recipes.length, recipes.length + DISPLAY_COUNT)

    if (error) {
      console.error('追加レシピ取得エラー:', error)
      return
    }

    const newRecipes = (data ?? []) as unknown as Recipe[]

    const recipesWithAllergens =
    await addAllergensToRecipes(newRecipes)

    setRecipes((current) => [
      ...current,
    ...recipesWithAllergens.slice(0, DISPLAY_COUNT),
  ])

  setHasMore(newRecipes.length > DISPLAY_COUNT)

  } finally {
    setIsRecipeLoading(false)
  }
}

  return (
    <main className="min-h-screen bg-[#f8f8f5] pt-26 text-gray-800">

      <div className="mx-auto max-w-6xl px-6 py-8">


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
              {/* 対応アレルギー食品 */}
              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-gray-500">
                  対応アレルギー食品
                </p>
              <div className="flex flex-wrap gap-2">
                {recipe.allergens.length > 0 ? (
                  recipe.allergens.map((allergen) => (
                    <span
                    key={`${recipe.id}-${allergen}`}
                    className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700"
                    >
                      {allergen}
                    </span>
                    ))
                  ) : (
                  <span className="text-xs text-gray-400">
                    登録なし
                    </span>
                  )}
                </div>
              </div>

              {/* 投稿者アイコンとユーザー名 */}
              <div className="mt-3 flex items-center gap-2">
                {recipe.profiles?.avatar_url ? (
                  <img
                  src={recipe.profiles.avatar_url}
                  alt="ユーザーアイコン"
                  className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200">
                  <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5 text-gray-500"
                  >
                    <path
                    fillRule="evenodd"
                    d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM3 21a9 9 0 1 1 18 0H3Z"
                    clipRule="evenodd"
                    />
                  </svg>
                  </div>
                )}
                <span className="text-sm text-gray-500">
                  {recipe.profiles?.name ?? 'ユーザー'}
                </span>
                </div>
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
              className="rounded-full border border-gray-300 px-8 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRecipeLoading ? '読み込み中...' : 'もっとみる'}
          </button>
        </div>
      )}
    </>
  )}
</section>
      </div>
    </main>
  )
}
