import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSearchKnowledgeMutation } from '@/api'
import type { SearchResult } from '@/types'

export function KnowledgeSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const searchMutation = useSearchKnowledgeMutation()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    try {
      const searchResults = await searchMutation.mutateAsync({ query })
      setResults(searchResults)
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
          <Input
            placeholder="Search your knowledge base..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={searchMutation.isPending}>
          {searchMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      </form>

      {results.length > 0 && (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {results.map((result, index) => (
              <SearchResultCard key={`${result.document_id}-${result.chunk_id}-${index}`} result={result} />
            ))}
          </div>
        </ScrollArea>
      )}

      {searchMutation.isSuccess && results.length === 0 && (
        <div className="text-center py-8 text-foreground-secondary">
          No results found for "{query}"
        </div>
      )}
    </div>
  )
}

interface SearchResultCardProps {
  result: SearchResult
}

function SearchResultCard({ result }: SearchResultCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium text-sm">{result.document_name}</h4>
          <Badge variant="secondary" className="text-xs">
            {Math.round(result.relevance_score * 100)}% match
          </Badge>
        </div>
        <p className="text-sm text-foreground-secondary line-clamp-3">
          {result.content}
        </p>
      </CardContent>
    </Card>
  )
}
