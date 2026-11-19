
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  targetUserId: string
}

export default function FollowButton({ targetUserId }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const fetchFollowStatus = async () => {
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

      // 自分自身はフォローできない
      if (user.id === targetUserId) {
        setLoading(false)
        return
      }

      // フォロー状態を確認
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle()

      if (error) {
        console.error('フォロー状態取得エラー:', error)
      } else {
        setIsFollowing(!!data)
      }

      setLoading(false)
    }

    fetchFollowStatus()
  }, [targetUserId])

  // フォロー・フォロー解除
  const handleFollow = async () => {
    if (!userId) {
      alert('フォローするにはログインしてください。')
      return
    }

    if (userId === targetUserId || processing) return

    setProcessing(true)

    const supabase = createClient()

    try {
      if (isFollowing) {
        // フォロー解除
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', userId)
          .eq('following_id', targetUserId)

        if (error) throw error

        setIsFollowing(false)
      } else {
        // フォロー登録
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: userId,
            following_id: targetUserId,
          })

        if (error) throw error

        setIsFollowing(true)
      }
    } catch (error) {
      console.error('フォロー処理エラー:', error)
      alert('フォローの処理に失敗しました。')
    } finally {
      setProcessing(false)
    }
  }

  // 自分のプロフィールには表示しない
  if (userId === targetUserId) return null

  return (
    <button
      type="button"
      onClick={handleFollow}
      disabled={loading || processing}
      className={`rounded-full px-5 py-2 text-sm font-bold transition disabled:opacity-50 ${
        isFollowing
          ? 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-100'
          : 'bg-black text-white hover:bg-gray-800'
      }`}
    >
      {loading
        ? '読み込み中...'
        : isFollowing
          ? 'フォロー中'
          : 'フォロー'}
    </button>
  )
}
