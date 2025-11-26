import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ChatView } from '@/features/chat'
import { AgentsPage } from '@/features/agents'
import { KnowledgePage } from '@/features/knowledge'
import { IntegrationsPage } from '@/features/integrations'
import { SkillsPage } from '@/features/skills'
import { TasksPage } from '@/features/tasks'

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<ChatView />} />
        <Route path="chat/:spaceId" element={<ChatView />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
      </Route>
    </Routes>
  )
}

export default App
