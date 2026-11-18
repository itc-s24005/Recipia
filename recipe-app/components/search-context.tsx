'use client'

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

type SearchContextValue = {
  selectedAllergens: number[]
  setSelectedAllergens: Dispatch<SetStateAction<number[]>>
  keyword: string
  setKeyword: Dispatch<SetStateAction<string>>
}

const SearchContext = createContext<SearchContextValue | null>(null)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [selectedAllergens, setSelectedAllergens] = useState<number[]>([])
  const [keyword, setKeyword] = useState('')

  return (
    <SearchContext.Provider
      value={{
        selectedAllergens,
        setSelectedAllergens,
        keyword,
        setKeyword,
      }}
    >
      {children}
    </SearchContext.Provider>
  )
}

export function useSearchContext() {
  const context = useContext(SearchContext)

  if (!context) {
    throw new Error('useSearchContext must be used within a SearchProvider')
  }

  return context
}
