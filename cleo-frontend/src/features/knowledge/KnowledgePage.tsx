import { useState } from 'react'
import { Upload, Search, FileText, Network } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DocumentList,
  UploadDocumentDialog,
  DeleteDocumentDialog,
  KnowledgeSearch,
  KnowledgeGraphView,
} from '@/components/knowledge'
import { useDocuments } from '@/api'
import type { Document } from '@/types'

export function KnowledgePage() {
  const { data: documents, isLoading } = useDocuments()
  const [activeTab, setActiveTab] = useState('documents')
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
            <p className="text-sm text-foreground-secondary mt-1">
              Manage documents and explore your knowledge graph
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="border-b border-border px-6">
          <TabsList className="h-12">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="graph" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Knowledge Graph
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="documents" className="flex-1 overflow-hidden m-0">
          <div className="p-6 pb-0">
            <div className="relative max-w-sm mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 px-6 pb-6">
            <DocumentList
              documents={documents}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onDelete={setDeletingDocument}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="search" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              <KnowledgeSearch />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="graph" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              <KnowledgeGraphView />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <DeleteDocumentDialog
        open={!!deletingDocument}
        onOpenChange={(open) => !open && setDeletingDocument(null)}
        document={deletingDocument}
      />
    </div>
  )
}
