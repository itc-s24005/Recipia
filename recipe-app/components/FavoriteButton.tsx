
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  recipeId: number
}

export default function FavoriteButton({ recipeId }: Props) {
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

  
    return (
    <button
    type="button"
    onClick={handleFavorite}
    disabled={loading || processing}
    aria-label={
        isFavorite ? 'お気に入りを解除' : 'お気に入りに登録'
    }
    className={`flex h-12 w-12 items-center justify-center
        rounded-full shadow-md
        transition-all duration-200
        hover:scale-110 hover:shadow-lg
        disabled:opacity-50
        ${
          isFavorite
            ? 'border-yellow-400 text-yellow-400'
        : 'border-gray-500 text-gray-400 hover:border-yellow-400 hover:text-yellow-400'
    }`}
    >
    <span className="text-4xl">
        ★
    </span>
    </button>
    )
}
