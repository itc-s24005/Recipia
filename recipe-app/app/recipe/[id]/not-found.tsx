import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8f8f5] px-4 text-center">
      <p className="text-6xl font-bold text-[#669D53]">
        404
      </p>

      <h1 className="mt-6 text-xl font-bold text-gray-800">
        このレシピは見つかりませんでした
      </h1>

      <p className="mt-3 text-sm text-gray-500">
        レシピが削除されたか、URLが間違っている可能性があります。
      </p>

      <Link
        href="/"
        className="mt-8 rounded-full bg-[#669D53] px-8 py-3 font-bold text-white hover:bg-[#d9873e]"
      >
        トップページに戻る
      </Link>
    </main>
  )
}