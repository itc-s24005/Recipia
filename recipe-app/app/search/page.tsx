import { Suspense } from 'react'
import SearchPageContent from '@/components/search-page-content'

export default function SearchPage() {
  return (
    <Suspense fallback={<p>読み込み中...</p>}>
      <SearchPageContent />
    </Suspense>
  )
}