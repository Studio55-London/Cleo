import { useState } from 'react'
import {
  Upload,
  Search,
  FileText,
  Network,
  FolderOpen,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  DocumentList,
  UploadDocumentDialog,
  DeleteDocumentDialog,
  KnowledgeGraphView,
  CreateKnowledgeBaseModal,
} from '@/components/knowledge'
import {
  useDocuments,
  useKnowledgeBases,
  useKnowledgeBaseDocuments,
  useSpaces,
  useGlobalSpace,
} from '@/api'
import type { Document, KnowledgeBase, Space } from '@/types'

export function KnowledgePage() {
  const { data: documents, isLoading: documentsLoading } = useDocuments()
  const { data: knowledgeBases, isLoading: kbLoading } = useKnowledgeBases()
  const { data: spaces } = useSpaces()
  const { data: globalSpace } = useGlobalSpace()

  const [activeTab, setActiveTab] = useState('knowledge-bases')
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null)

  // Knowledge base management
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null)
  const [createKBOpen, setCreateKBOpen] = useState(false)

  // Get documents for selected KB
  const { data: kbDocuments, isLoading: kbDocsLoading } = useKnowledgeBaseDocuments(
    selectedKB?.id ?? 0
  )

  // Group knowledge bases by space
  const kbsBySpace = knowledgeBases?.reduce(
    (acc, kb) => {
      const spaceId = kb.space_id
      if (!acc[spaceId]) {
        acc[spaceId] = []
      }
      acc[spaceId].push(kb)
      return acc
    },
    {} as Record<number, KnowledgeBase[]>
  )

  // Filter knowledge bases by search query
  const filteredKbsBySpace = searchQuery
    ? Object.entries(kbsBySpace || {}).reduce(
        (acc, [spaceId, kbs]) => {
          const filtered = kbs.filter(
            (kb) =>
              kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              kb.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )
          if (filtered.length > 0) {
            acc[spaceId] = filtered
          }
          return acc
        },
        {} as Record<string, KnowledgeBase[]>
      )
    : kbsBySpace

  // Filter documents by search query
  const filteredDocuments = searchQuery
    ? documents?.filter(
        (doc) =>
          doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : documents

  const filteredKbDocuments = searchQuery
    ? kbDocuments?.filter(
        (doc) =>
          doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : kbDocuments

  const handleSelectKB = (kb: KnowledgeBase) => {
    setSelectedKB(kb)
  }

  const handleBackToKBList = () => {
    setSelectedKB(null)
  }

  const getSpaceName = (spaceId: number): string => {
    if (globalSpace?.id === spaceId) return 'Global'
    const space = spaces?.find((s: Space) => Number(s.id) === spaceId)
    return space?.name || `Space ${spaceId}`
  }

  // Determine page title based on context
  const getPageTitle = () => {
    if (activeTab === 'knowledge-bases' && selectedKB) {
      return selectedKB.name
    }
    return 'Knowledge Base'
  }

  const getPageDescription = () => {
    if (activeTab === 'knowledge-bases' && selectedKB) {
      return selectedKB.description || 'Manage documents in this knowledge base'
    }
    return 'Manage documents and explore your knowledge graph'
  }

  // Get search placeholder based on context
  const getSearchPlaceholder = () => {
    if (activeTab === 'knowledge-bases') {
      if (selectedKB) {
        return 'Search documents...'
      }
      return 'Search knowledge bases...'
    }
    if (activeTab === 'documents') {
      return 'Search documents...'
    }
    return 'Search...'
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            {activeTab === 'knowledge-bases' && selectedKB ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToKBList}
                  className="text-sm text-foreground-secondary hover:text-foreground"
                >
                  Knowledge Bases
                </button>
                <ChevronRight className="h-4 w-4 text-foreground-tertiary" />
                <h1 className="text-2xl font-bold">{selectedKB.name}</h1>
              </div>
            ) : (
              <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
            )}
            <p className="text-sm text-foreground-secondary mt-1">
              {getPageDescription()}
            </p>
          </div>
          {activeTab === 'knowledge-bases' && !selectedKB ? (
            <Button onClick={() => setCreateKBOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Knowledge Base
            </Button>
          ) : (
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          setActiveTab(tab)
          setSearchQuery('')
          // Reset selected KB when switching away from knowledge-bases tab
          if (tab !== 'knowledge-bases') {
            setSelectedKB(null)
          }
        }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="border-b border-border px-6 flex items-center justify-between">
          <TabsList className="h-12">
            <TabsTrigger value="knowledge-bases" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Knowledge Bases
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="graph" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Knowledge Graph
            </TabsTrigger>
          </TabsList>

          {/* Search box in tab bar */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
            <Input
              placeholder={getSearchPlaceholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Knowledge Bases Tab */}
        <TabsContent value="knowledge-bases" className="flex-1 overflow-hidden m-0">
          {selectedKB ? (
            // Show documents in selected KB
            <ScrollArea className="flex-1 p-6">
              <DocumentList
                documents={filteredKbDocuments}
                isLoading={kbDocsLoading}
                searchQuery={searchQuery}
                onDelete={setDeletingDocument}
              />
            </ScrollArea>
          ) : (
            // Show KB list
            <ScrollArea className="flex-1 p-6">
              {kbLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : Object.keys(filteredKbsBySpace || {}).length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 mx-auto text-foreground-tertiary mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchQuery ? 'No matching knowledge bases' : 'No knowledge bases yet'}
                  </h3>
                  <p className="text-sm text-foreground-secondary">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Knowledge bases will appear here'}
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(filteredKbsBySpace || {}).map(([spaceId, kbs]) => (
                    <div key={spaceId}>
                      <h3 className="text-sm font-medium text-foreground-secondary mb-4">
                        {getSpaceName(Number(spaceId))}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {kbs.map((kb) => (
                          <button
                            key={kb.id}
                            onClick={() => handleSelectKB(kb)}
                            className={cn(
                              'p-4 rounded-lg border border-border bg-background',
                              'hover:border-primary/50 hover:bg-background-secondary',
                              'transition-colors text-left'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-md bg-primary/10">
                                <FolderOpen className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground truncate">
                                  {kb.name}
                                </h4>
                                {kb.description && (
                                  <p className="text-sm text-foreground-secondary mt-1 line-clamp-2">
                                    {kb.description}
                                  </p>
                                )}
                                <p className="text-xs text-foreground-tertiary mt-2">
                                  {kb.document_count} document{kb.document_count !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="flex-1 p-6">
            <DocumentList
              documents={filteredDocuments}
              isLoading={documentsLoading}
              searchQuery={searchQuery}
              onDelete={setDeletingDocument}
            />
          </ScrollArea>
        </TabsContent>

        {/* Knowledge Graph Tab */}
        <TabsContent value="graph" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              <KnowledgeGraphView />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultKnowledgeBaseIds={selectedKB ? [selectedKB.id] : []}
      />
      <DeleteDocumentDialog
        open={!!deletingDocument}
        onOpenChange={(open) => !open && setDeletingDocument(null)}
        document={deletingDocument}
      />
      <CreateKnowledgeBaseModal
        open={createKBOpen}
        onOpenChange={setCreateKBOpen}
        spaceId={globalSpace?.id ?? 1}
      />
    </div>
  )
}
