
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  recipeId: number
  recipeUserId: string
}

export default function FavoriteButton({
  recipeId,
  recipeUserId,
}: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  // お気に入り状態を取得
  useEffect(() => {
    const fetchFavorite = async () => {
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error(userError)
      }

      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      const { data, error } = await supabase
        .from('favorites')
        .select('recipe_id')
        .eq('user_id', user.id)
        .eq('recipe_id', recipeId)
        .maybeSingle()

      if (error) {
        console.error('お気に入り取得エラー:', error)
      } else {
        setIsFavorite(!!data)
      }

      setLoading(false)
    }

    fetchFavorite()
  }, [recipeId])

  // お気に入り登録・解除
  const handleFavorite = async () => {
    if (!userId) {
      alert('お気に入り登録にはログインしてください。')
      return
    }

    // 自分のレシピにはお気に入りできない
    if (userId === recipeUserId) return

    if (processing) return

    setProcessing(true)

    const supabase = createClient()

    try {
      if (isFavorite) {
        // お気に入り解除
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('recipe_id', recipeId)

        if (error) throw error

        setIsFavorite(false)
      } else {
        // お気に入り登録
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: userId,
            recipe_id: recipeId,
          })

        if (error) throw error

        setIsFavorite(true)
      }
    } catch (error) {
      console.error('お気に入り処理エラー:', error)
      alert('お気に入りの処理に失敗しました。')
    } finally {
      setProcessing(false)
    }
  }

  // ログイン状態の確認中は表示しない
  if (loading) {
    return null
  }

  // 自分のレシピなら表示しない
  if (userId === recipeUserId) {
    return null
  }

  return (
    <button
      type="button"
      onClick={handleFavorite}
      disabled={processing}
      aria-label={
        isFavorite ? 'お気に入りを解除' : 'お気に入りに登録'
      }
      className="flex h-12 w-12 items-center justify-center
        rounded-full shadow-md
        transition-all duration-200
        hover:scale-110 hover:shadow-lg
        disabled:opacity-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 141.732 141.731"
        className={`h-8 w-8 ${
          isFavorite
          ? 'text-[#669D53]'
          : 'text-gray-400'
        }`}
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M108.214,129.557l0.203-0.003l-0.217-0.008L108.214,129.557z
          M33.518,129.557l0.013-0.011l-0.216,0.008L33.518,129.557z
          M108.417,129.554l0.197,0.003c4.199,0,7.603-3.404,7.603-7.604
          l-0.003-0.197l0.003-0.203V70.866V20.179c0-4.42-3.583-8.003-8.003-8.003
          H33.518c-4.421,0-8.003,3.583-8.003,8.003v50.687v50.687l0.002,0.203
          l-0.002,0.197c0,4.199,3.404,7.604,7.603,7.604l0.198-0.003l0.216-0.008
          c1.47-0.08,2.828-0.576,3.961-1.375l0.027,0.052l30.938-23.303
          c0.625-0.604,1.473-0.974,2.409-0.974c0.936,0,1.785,0.37,2.409,0.974
          l30.938,23.303l0.027-0.052c1.134,0.799,2.491,1.295,3.961,1.375
          L108.417,129.554z M70.866,32.984c1.609,0,6.426,13.912,7.489,14.686
          c1.064,0.776,15.742,1.073,16.238,2.609c0.498,1.534-11.202,10.431-11.607,11.685
          c-0.405,1.251,3.847,15.348,2.545,16.297
          c-1.302,0.95-13.353-7.464-14.665-7.464
          c-1.313,0-13.363,8.414-14.665,7.464
          c-1.302-0.949,2.95-15.046,2.545-16.297
          c-0.405-1.254-12.106-10.15-11.607-11.685
          c0.496-1.537,15.174-1.833,16.239-2.609
          C64.44,46.896,69.257,32.984,70.866,32.984z"
        />
      </svg>
    </button>
  )
}
