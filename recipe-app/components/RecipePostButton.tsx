
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RecipePostButton() {
  const pathname = usePathname();

  // ログインページでは非表示
  if (pathname === "/login") {
    return null;
  }

  // レシピ投稿ページでは非表示
  if (pathname === "/recipe/post") {
    return null;
  }

  // レシピ編集ページでは非表示
  if (pathname.startsWith("/recipe/edit/")) {
    return null;
  }

  return (
    <Link
      href="/recipe/post"
      aria-label="レシピを投稿する"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#55a66b] px-6 py-4 font-bold text-white shadow-lg transition hover:bg-[#438c57] hover:shadow-xl active:scale-95"
    >
      <span className="text-2xl leading-none">＋</span>
      <span>レシピを投稿</span>
    </Link>
  );
}
