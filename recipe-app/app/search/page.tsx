import { Suspense } from 'react'
import SearchPageContent from '@/components/search-page-content'
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "検索結果 - Recipia",
};

export default function SearchPage() {
  return (
    <Suspense fallback={<p>読み込み中...</p>}>
      <SearchPageContent />
    </Suspense>
  )
}