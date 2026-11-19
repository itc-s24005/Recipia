'use client'

import { useState } from 'react'
import Link from 'next/link'
import UserRecipeList from '@/components/UserRecipeList'
import type { RecipeCardData } from '@/components/RecipeCard'

export type FavoriteRecipe = {
  id: number
  title: string
  image_url: string
  created_at: string
}

type Props = {
  userId: string
  initialRecipes: RecipeCardData[]
  initialHasMore: boolean
  favoriteRecipes: FavoriteRecipe[]
}

export default function MyRecipeTabs({
  userId,
  initialRecipes,
  initialHasMore,
  favoriteRecipes,
}: Props) {
  const [activeTab, setActiveTab] = useState<'posted' | 'favorite'>('posted')
  const [favoriteDisplayCount, setFavoriteDisplayCount] = useState(6)

  return (
    <section className="mt-10">
      {/* タブ切り替え */}
      <div className="mb-6 flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('posted')}
          className={`flex-1 border-b-2 px-4 py-3 text-center font-bold transition ${
            activeTab === 'posted'
              ? 'border-[#55a66c] text-[#55a66c]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          投稿したレシピ
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('favorite')}
          className={`flex-1 border-b-2 px-4 py-3 text-center font-bold transition ${
            activeTab === 'favorite'
              ? 'border-[#55a66c] text-[#55a66c]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          お気に入り登録したレシピ
        </button>
      </div>

      {/* 投稿したレシピ */}
      {activeTab === 'posted' && (
        <>
          <div className="mb-6 text-right">
            <span className="text-sm text-gray-500">
              全 {initialRecipes.length}
              {initialHasMore ? '件以上' : '件'}
            </span>
          </div>

          <UserRecipeList
            key={`my-${userId}`}
            userId={userId}
            initialRecipes={initialRecipes}
            initialHasMore={initialHasMore}
          />
        </>
      )}

      {/* お気に入り登録したレシピ */}
      {activeTab === 'favorite' && (
        <>
          <div className="mb-6 text-right">
            <span className="text-sm text-gray-500">
              全 {favoriteRecipes.length} 件
            </span>
          </div>

          {favoriteRecipes.length === 0 ? (
            <div className="rounded-xl bg-white py-12 text-center text-gray-500">
              まだお気に入り登録したレシピはありません。
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {favoriteRecipes.slice(0, favoriteDisplayCount).map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/recipe/${recipe.id}`}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="aspect-square bg-gray-100">
                    {recipe.image_url ? (
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        画像なし
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="line-clamp-2 font-bold text-gray-800">
                      {recipe.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
        )}

        {/* もっと見るボタン */}
        {favoriteDisplayCount < favoriteRecipes.length && (
          <div className="py-6 text-center">
            <button
              type="button"
              onClick={() =>
                setFavoriteDisplayCount((prev) => prev + 6)
              }
              className="rounded-full border border-gray-300 px-8 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              もっとみる
            </button>
          </div>
        )}
      </>
    )}
    </section>
  )
}