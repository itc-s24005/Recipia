
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  recipeId: number
}

export default function ReviewButton({ recipeId }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)

  // 写真選択
  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください。')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('写真は5MB以内にしてください。')
      return
    }

    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  // モーダルを閉じる
  const handleClose = () => {
    setIsOpen(false)
    setComment('')
    setImage(null)
    setPreview('')
  }

  // レビュー投稿
  const handleSubmit = async () => {
    if (!comment.trim()) {
      alert('レビューを入力してください。')
      return
    }

    setLoading(true)

    try {
      // ログインユーザーを取得
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        alert('レビューを投稿するにはログインしてください。')
        return
      }

      // すでにレビューを投稿しているか確認
const { data: existingReview, error: checkError } = await supabase
  .from('reviews')
  .select('user_id')
  .eq('user_id', user.id)
  .eq('recipe_id', recipeId)
  .maybeSingle()

if (checkError) {
  console.error(checkError)
  alert('レビューの確認に失敗しました。')
  return
}

if (existingReview) {
  alert('このレシピには、すでにレビューを投稿しています。')
  return
}

      let imageUrl: string | null = null
      let imagePath: string | null = null

      // 写真が選択されている場合はStorageにアップロード
      if (image) {
        const fileName = `${Date.now()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        imagePath = `${user.id}/${recipeId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(imagePath, image, {
            cacheControl: '3600',
            upsert: false,
            contentType: image.type,
          })

        if (uploadError) {
          console.error(uploadError)
          alert('写真のアップロードに失敗しました。')
          return
        }

        const { data } = supabase.storage
          .from('review-images')
          .getPublicUrl(imagePath)

        imageUrl = data.publicUrl
      }

      // reviewsテーブルに保存
      const { error: insertError } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          recipe_id: recipeId,
          comment: comment.trim(),
          image_url: imageUrl,
        })

      if (insertError) {
  // エラー内容を確認
  console.warn('レビュー保存エラー:', {
    message: insertError.message,
    details: insertError.details,
    hint: insertError.hint,
    code: insertError.code,
  })

  // DB保存に失敗した場合、アップロードした写真を削除
  if (imagePath) {
    await supabase.storage
      .from('review-images')
      .remove([imagePath])
  }

  alert(
    `レビューの投稿に失敗しました。\n\n` +
    `エラー内容：${insertError.message}\n` +
    `詳細：${insertError.details ?? 'なし'}`
  )

  return
}

      alert('レビューを投稿しました！')
      handleClose()
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-orange-300 px-6 py-3 font-semibold text-white transition hover:bg-orange-400"
      >
        レビューを書く
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-bold text-gray-800">
              レビューを書く
            </h2>

            {/* 写真アップロード */}
            <label className="mb-5 flex h-64 cursor-pointer flex-col items-center justify-center overflow-hidden bg-gray-100 text-gray-500 hover:bg-gray-200">
              {preview ? (
                <img
                  src={preview}
                  alt="レビュー写真のプレビュー"
                  className="h-full w-full object-contain"
                />
              ) : (
                <>
                  <span className="text-5xl">＋</span>
                  <span className="mt-4">
                    完成した写真をアップロード
                  </span>
                  <span className="mt-2 text-xs">
                    5MB以内の画像
                  </span>
                </>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            {image && (
              <button
                type="button"
                onClick={() => {
                  setImage(null)
                  setPreview('')
                }}
                className="mb-4 text-sm text-red-500 hover:underline"
              >
                写真を削除
              </button>
            )}

            {/* コメント入力 */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="レビューを書く"
              maxLength={1000}
              className="h-40 w-full resize-none rounded-md border border-gray-400 p-3 text-gray-700 outline-none focus:border-orange-400"
            />

            <p className="mt-1 text-right text-xs text-gray-400">
              {comment.length}/1000文字
            </p>

            {/* ボタン */}
            <div className="mt-5 flex gap-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-lg bg-orange-300 py-3 font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
              >
                {loading ? '投稿中...' : '投稿'}
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 rounded-lg bg-orange-300 py-3 font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
