
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  recipeId: number
  recipeUserId: string
}

export default function LikeButton({
  recipeId,
  recipeUserId,
}: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  // いいね情報を取得
  useEffect(() => {
    const fetchLikes = async () => {
      const supabase = createClient()

      // ログインユーザーを取得
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error(userError)
      }

      if (user) {
        setUserId(user.id)
      }

      // レシピのいいね数を取得
      const { count, error: countError } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('recipe_id', recipeId)

      if (countError) {
        console.error('いいね数取得エラー:', countError)
      } else {
        setLikeCount(count ?? 0)
      }

      // 自分がいいね済みか確認
      if (user) {
        const { data, error } = await supabase
          .from('likes')
          .select('recipe_id')
          .eq('recipe_id', recipeId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) {
          console.error('いいね状態取得エラー:', error)
        } else {
          setIsLiked(!!data)
        }
      }

      setLoading(false)
    }

    fetchLikes()
  }, [recipeId])

  // いいね・いいね解除
  const handleLike = async () => {
    // 自分のレシピにはいいねできない
    if (userId === recipeUserId) {
        alert('自分が投稿したレシピにはいいねできません。')
    return
    }
    if (!userId) {
      alert('いいねするにはログインしてください。')
      return
    }

    if (processing) return

    setProcessing(true)

    const supabase = createClient()

    try {
      if (isLiked) {
        // いいね解除
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('recipe_id', recipeId)
          .eq('user_id', userId)

        if (error) throw error

        setIsLiked(false)
        setLikeCount((prev) => Math.max(0, prev - 1))
      } else {
        // いいね登録
        const { error } = await supabase
          .from('likes')
          .insert({
            recipe_id: recipeId,
            user_id: userId,
          })

        if (error) throw error

        setIsLiked(true)
        setLikeCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error('いいね処理エラー:', error)
      alert('いいねの処理に失敗しました。')
    } finally {
      setProcessing(false)
    }
  }

  
return (
  <div className="flex items-center gap-2">
    <button
    type="button"
    onClick={handleLike}
    disabled={loading || processing || userId === recipeUserId}
    aria-label={isLiked ? 'いいねを解除' : 'いいねする'}
    className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md bg-white transition
        ${
            userId === recipeUserId
            ? 'cursor-not-allowed opacity-50'
            : 'hover:scale-105'
        }`}
    >
        <svg
            viewBox="0 0 24 24"
            className={`h-7 w-7 transition-colors ${
                isLiked
                ? 'fill-pink-400 stroke-pink-400'
                : 'fill-none stroke-gray-500'
            }`}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
        </svg>
    </button>

    <span className="text-sm text-gray-800">
      {loading ? '...' : likeCount}
    </span>
  </div>
)
}
