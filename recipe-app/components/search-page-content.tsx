
'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'


type Recipe = {
  id: number
  title: string
  description: string | null
  image_url: string | null
  created_at: string
  likeCount: number
  profiles: {
    name: string
    avatar_url: string | null
  } | null
}

const DISPLAY_COUNT = 8

export default function SearchPageContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  // URLから検索条件を取得
  const initialKeyword = searchParams.get('q') ?? ''
  const initialAllergenParam = searchParams.get('allergens') ?? ''

  const initialAllergens = useMemo(
    () =>
      initialAllergenParam
        ? initialAllergenParam
            .split(',')
            .map(Number)
            .filter((id) => Number.isFinite(id))
        : [],
    [initialAllergenParam]
  )

  const [keyword, setKeyword] = useState(initialKeyword)
  const [selectedAllergens, setSelectedAllergens] =
    useState<number[]>(initialAllergens)

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [displayCount, setDisplayCount] = useState(DISPLAY_COUNT)
  const [sortType, setSortType] = useState<'newest' | 'popular'>('popular')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)


  // URLの検索条件を入力欄に反映
  useEffect(() => {
  if (initialAllergens.length > 0) {
    handleSearch(
      undefined,
      initialKeyword,
      initialAllergens
    )
  }
}, [initialKeyword, initialAllergens])

  // 検索処理
  const handleSearch = async (
    e?: FormEvent,
    searchKeyword = keyword,
    searchAllergens = selectedAllergens
  ) => {
    e?.preventDefault()

    const trimmedKeyword = searchKeyword.trim()

    // アレルゲンの選択は必須
    if (searchAllergens.length === 0) {
      setRecipes([])
      setSearched(false)
      return
    }

    setLoading(true)
    setDisplayCount(DISPLAY_COUNT)

    try {
      let recipeIds = new Set<number>()

      // キーワードが入力されている場合
      if (trimmedKeyword) {
        const escapedKeyword = trimmedKeyword.replace(
          /[\\%_]/g,
          '\\$&'
        )
        const pattern = `%${escapedKeyword}%`

        // レシピ名を検索
        const { data: titleData, error: titleError } =
        await supabase
        .from('recipes')
        .select('id')
        .ilike('title', pattern)

        if (titleError) throw titleError

        titleData?.forEach((recipe) => {
        recipeIds.add(recipe.id)
        })

        // 説明文を検索
        const { data: descriptionData, error: descriptionError } =
        await supabase
        .from('recipes')
        .select('id')
        .ilike('description', pattern)

        if (descriptionError) throw descriptionError

        descriptionData?.forEach((recipe) => {
          recipeIds.add(recipe.id)
        })

        // 材料名を検索
        const { data: ingredientData, error: ingredientError } =
          await supabase
            .from('recipe_ingredients')
            .select('recipe_id')
            .ilike('name', pattern)

        if (ingredientError) throw ingredientError

        ingredientData?.forEach((ingredient) => {
          recipeIds.add(ingredient.recipe_id)
        })
      } else {
        // キーワードがない場合は全レシピを検索対象にする
        const { data: allRecipeData, error: allRecipeError } =
          await supabase
            .from('recipes')
            .select('id')

        if (allRecipeError) throw allRecipeError

        allRecipeData?.forEach((recipe) => {
          recipeIds.add(recipe.id)
        })
      }

    // アレルゲンフィルター
if (searchAllergens.length > 0) {
  // 選択したアレルゲンを含むレシピIDを取得
  const { data: allergenData, error: allergenError } =
    await supabase
      .from('recipe_allergens')
      .select('recipe_id')
      .in('allergen_id', searchAllergens)

  if (allergenError) throw allergenError

  // 選択したアレルゲンを1つ以上含むレシピに絞り込む
  const matchedRecipeIds = new Set<number>(
    allergenData?.map((item) => item.recipe_id) ?? []
  )

  recipeIds = new Set(
    [...recipeIds].filter((id) => matchedRecipeIds.has(id))
  )
}

      // 検索結果がない場合
      if (recipeIds.size === 0) {
        setRecipes([])
        setSearched(true)
        return
      }

      // レシピ情報と投稿者情報を取得
      const { data: recipeData, error: recipeError } =
        await supabase
          .from('recipes')
          .select(`
            id,
            title,
            description,
            image_url,
            created_at,
            profiles!recipes_user_id_fkey (
              name,
              avatar_url
            )
          `)
          .in('id', [...recipeIds])
          .order('created_at', { ascending: false })
          .limit(1000)

      if (recipeError) throw recipeError

      // いいね情報を取得
      const resultIds =
        recipeData?.map((recipe) => recipe.id) ?? []

      const { data: likeData, error: likeError } =
        await supabase
          .from('likes')
          .select('recipe_id')
          .in('recipe_id', resultIds)

      if (likeError) throw likeError

      // いいね数を集計
      const likeCounts = new Map<number, number>()

      likeData?.forEach((like) => {
        likeCounts.set(
          like.recipe_id,
          (likeCounts.get(like.recipe_id) ?? 0) + 1
        )
      })

      // レシピ情報を整形
      const formattedRecipes: Recipe[] = (
        recipeData ?? []
      ).map((recipe) => {
        const profileData = recipe.profiles

        return {
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          image_url: recipe.image_url,
          created_at: recipe.created_at,
          profiles: (
            Array.isArray(profileData)
              ? profileData[0] ?? null
              : profileData
          ) as Recipe['profiles'],
          likeCount: likeCounts.get(recipe.id) ?? 0,
        }
      })

      setRecipes(formattedRecipes)
      setSearched(true)
    } catch (error: unknown) {
  console.error('レシピ検索エラー:', error)

  if (error instanceof Error) {
    console.error('エラーメッセージ:', error.message)
    console.error('スタック:', error.stack)
  } else {
    const err = error as {
      message?: unknown
      details?: unknown
      hint?: unknown
      code?: unknown
    }

    console.error('エラー詳細:', {
      message: err?.message,
      details: err?.details,
      hint: err?.hint,
      code: err?.code,
    })
  }

  setRecipes([])
  setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  // URLから画面を開いたときに自動検索
  useEffect(() => {
  if (initialAllergens.length > 0) {
    handleSearch()
  }
  }, [initialKeyword, initialAllergens])


  // 並び替え
  const sortedRecipes = [...recipes].sort((a, b) => {
    if (sortType === 'popular') {
      if (b.likeCount !== a.likeCount) {
        return b.likeCount - a.likeCount
      }
    }

    return (
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
    )
  })

  return (
    <div className="min-h-screen bg-[#f8f8f6]">


      {/* メイン */}
      <main className="mx-auto max-w-5xl px-4 pt-46 pb-7">


        {/* 検索結果件数 */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-800">
            検索結果：
            {searched
              ? `${sortedRecipes.length}件`
              : '検索してください'}
          </h2>
        </div>

        {/* 並び替え */}
        <div className="mb-5 flex gap-3">
          <button
            type="button"
            onClick={() => setSortType('popular')}
            className={`min-w-32 rounded-full px-6 py-2 text-sm font-bold transition ${
              sortType === 'popular'
                ? 'bg-[#55a66c] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            人気順
          </button>

          <button
            type="button"
            onClick={() => setSortType('newest')}
            className={`min-w-32 rounded-full px-6 py-2 text-sm font-bold transition ${
              sortType === 'newest'
                ? 'bg-[#55a66c] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            新着順
          </button>
        </div>

        {/* レシピ一覧 */}
        <section className="space-y-3">

          {loading ? (
            <p className="py-12 text-center text-gray-500">
              検索中...
            </p>
          ) : !searched ? (
            <p className="py-12 text-center text-gray-500">
              アレルゲンを1つ以上選択して検索してください。
            </p>
          ) : sortedRecipes.length === 0 ? (
            <p className="rounded-xl bg-white py-12 text-center text-gray-500">
              該当するレシピがありません。
            </p>
          ) : (
            <>
              {sortedRecipes
                .slice(0, displayCount)
                .map((recipe) => (
                  <Link
                    href={`/recipe/${recipe.id}`}
                    key={recipe.id}
                    className="flex min-h-32 overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
                  >
                    {/* 左側：レシピ画像 */}
                    <div className="w-32 shrink-0 bg-gray-100 sm:w-40">
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="h-full min-h-32 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-32 items-center justify-center text-sm text-gray-400">
                          画像なし
                        </div>
                      )}
                    </div>

                    {/* 右側：レシピ情報 */}
                    <div className="flex min-w-0 flex-1 flex-col justify-center p-4 sm:p-6">
                      <h3 className="mb-2 font-bold text-gray-800">
                        {recipe.title}
                      </h3>

                      <p className="line-clamp-2 text-sm text-gray-600">
                        {recipe.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                        <span>
                          投稿者：{recipe.profiles?.name ?? '不明'}
                        </span>

                        <span>
                          ♥ {recipe.likeCount}
                          {'　'}
                          {new Date(
                            recipe.created_at
                          ).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}

              {/* もっと見る */}
              {displayCount < sortedRecipes.length && (
                <div className="py-6 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      setDisplayCount(
                        (prev) => prev + DISPLAY_COUNT
                      )
                    }
                    className="rounded-lg border border-[#55a66c] bg-white px-10 py-3 font-bold text-[#55a66c] hover:bg-[#eef7f0]"
                  >
                    もっと見る
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
