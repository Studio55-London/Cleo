import { useState } from 'react'
import { Bookmark, Clock, Tag } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

type TabType = 'timeline' | 'topics'

interface SavedItem {
  id: string
  title: string
  content: string
  timestamp: string
  tags?: string[]
}

export function TopicsPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('timeline')
  const [savedItems] = useState<SavedItem[]>([])

  return (
    <div className="flex flex-col h-full">
      {/* Tab Buttons */}
      <div className="flex gap-2 px-4 py-3 border-b border-border">
        <Button
          variant={activeTab === 'timeline' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('timeline')}
          className="flex-1"
        >
          <Clock className="h-4 w-4 mr-1" />
          Timeline
        </Button>
        <Button
          variant={activeTab === 'topics' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('topics')}
          className="flex-1"
        >
          <Tag className="h-4 w-4 mr-1" />
          Topics
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {savedItems.length === 0 ? (
          <div className="text-center py-8">
            <Bookmark className="h-10 w-10 mx-auto mb-3 text-foreground-tertiary" />
            <p className="text-sm text-foreground-secondary">No saved results yet</p>
            <p className="text-xs text-foreground-tertiary mt-1">
              {activeTab === 'timeline'
                ? 'Your saved items will appear here chronologically'
                : 'Organize saved items by topic'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border border-border hover:bg-background-hover transition-colors cursor-pointer"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-foreground-tertiary mt-1 line-clamp-2">
                  {item.content}
                </p>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs rounded-full bg-primary-light text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-foreground-tertiary mt-2">
                  {new Date(item.timestamp).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
