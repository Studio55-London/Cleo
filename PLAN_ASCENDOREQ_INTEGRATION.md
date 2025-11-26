# Implementation Plan: AscendoreQ Features Integration into Cleo

## Executive Summary

This plan outlines the integration of key features from AscendoreQ-Old into Cleo, focusing on:
- Task Management System
- Service Layer Architecture
- Hybrid Search Capabilities
- External LLM Integration (Claude, OpenAI, Gemini)
- Statistics Dashboard

**Estimated Total Effort:** ~32 hours across 4 phases

---

## Gap Analysis Summary

| Feature | Cleo Status | AscendoreQ | Priority |
|---------|-------------|------------|----------|
| Agent Management | Full | N/A | Done |
| Knowledge Base (GraphRAG) | Full | Limited | Done |
| Spaces | Basic | Full | Medium |
| **Task Management** | **Missing** | Full | **High** |
| Vector Search | Yes | Yes | Done |
| **Hybrid Search** | **Missing** | Yes | **High** |
| **External LLMs** | **Missing** | Full | **High** |
| **Service Layer** | **Missing** | Yes | **High** |
| API Key Management | Missing | Yes | Medium |
| Statistics Dashboard | Minimal | Full | Medium |

---

## Phase 1: Foundation - Service Layer & Task Management

### 1.1 Create Service Layer Architecture

**Files to create:**
```
services/
├── __init__.py
├── space_service.py
├── task_service.py
├── knowledge_service.py
└── base_service.py
```

**base_service.py:**
```python
class BaseService:
    """Base class for all services with common patterns"""
    def __init__(self, db_session):
        self.db = db_session

    def validate_required(self, data, required_fields):
        """Validate required fields exist"""
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            raise ValueError(f"Missing required fields: {missing}")
```

**space_service.py:**
- `create_space(name, description, agent_ids, master_agent_id)`
- `get_space(space_id)`
- `list_spaces()`
- `update_space(space_id, updates)`
- `delete_space(space_id)` - with cascade protection
- `ensure_default_space()` - create if not exists
- `get_space_stats(space_id)` - message count, agent count

**task_service.py:**
- `create_task(space_id, title, description, priority, due_date)`
- `get_task(task_id)`
- `list_tasks(space_id, status_filter, priority_filter)`
- `update_task(task_id, updates)`
- `delete_task(task_id)`
- `get_task_stats(space_id)` - counts by status
- `complete_task(task_id)` - sets completed_at timestamp

### 1.2 Database Schema Updates

**New Task Model (models.py):**
```python
class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    space_id = db.Column(db.Integer, db.ForeignKey('spaces.id'), nullable=False)
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    priority = db.Column(db.String(20), default='medium')  # low, medium, high
    status = db.Column(db.String(20), default='todo')  # todo, in_progress, completed
    due_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    # Relationships
    space = db.relationship('Space', backref=db.backref('tasks', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'space_id': self.space_id,
            'title': self.title,
            'description': self.description,
            'priority': self.priority,
            'status': self.status,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
```

**Update Space Model:**
```python
# Add to Space model
is_default = db.Column(db.Boolean, default=False)
```

**Migration:**
```bash
flask db migrate -m "Add Task model and Space.is_default"
flask db upgrade
```

### 1.3 Task API Endpoints (app.py)

```python
# Task Management Endpoints
@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Create a new task"""

@app.route('/api/tasks', methods=['GET'])
def list_tasks():
    """List tasks with optional filters: space_id, status, priority"""

@app.route('/api/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    """Get task by ID"""

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Update task fields"""

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete task"""

@app.route('/api/tasks/stats', methods=['GET'])
def get_task_stats():
    """Get task statistics by space"""
```

### 1.4 Frontend Task Components

**New files:**
```
cleo-frontend/src/
├── features/tasks/
│   ├── TasksPage.tsx
│   └── index.ts
├── components/tasks/
│   ├── TaskCard.tsx
│   ├── TaskList.tsx
│   ├── TaskFilters.tsx
│   ├── CreateTaskModal.tsx
│   ├── EditTaskModal.tsx
│   ├── DeleteTaskDialog.tsx
│   └── index.ts
├── api/hooks/
│   └── useTasks.ts
└── types/
    └── models.ts (add Task types)
```

**TypeScript Types:**
```typescript
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in_progress' | 'completed'

export interface Task {
  id: number
  space_id: number
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface CreateTaskInput {
  space_id: number
  title: string
  description?: string
  priority?: TaskPriority
  due_date?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  priority?: TaskPriority
  status?: TaskStatus
  due_date?: string
}

export interface TaskStats {
  total: number
  todo: number
  in_progress: number
  completed: number
}
```

**API Hooks (useTasks.ts):**
```typescript
export function useTasks(spaceId?: number, status?: TaskStatus)
export function useTask(taskId: number)
export function useTaskStats(spaceId?: number)
export function useCreateTask()
export function useUpdateTask()
export function useDeleteTask()
```

**UI Components:**
- TaskCard: Display task with status badge, priority indicator, due date
- TaskList: Grid/list view with drag-drop status changes
- TaskFilters: Filter by status, priority, space
- CreateTaskModal: Form with title, description, priority, due date
- TasksPage: Full page with filters, list, and create button

**Navigation Update (Sidebar.tsx):**
```typescript
<NavItem
  to="/tasks"
  icon={CheckSquare}
  label="Tasks"
  isActive={location.pathname === '/tasks'}
/>
```

**Route (App.tsx):**
```typescript
<Route path="tasks" element={<TasksPage />} />
```

---

## Phase 2: Hybrid Search Implementation

### 2.1 Knowledge Service Enhancement

**knowledge_service.py:**
```python
class KnowledgeService:
    def __init__(self, vector_store, knowledge_processor):
        self.vector_store = vector_store
        self.knowledge_processor = knowledge_processor

    def search(self, query, search_type='hybrid', max_results=5, space_id=None):
        """
        Unified search interface

        Args:
            query: Search query text
            search_type: 'vector', 'graph', or 'hybrid'
            max_results: Maximum results to return
            space_id: Optional space filter
        """
        if search_type == 'vector':
            return self._vector_search(query, max_results)
        elif search_type == 'graph':
            return self._graph_search(query, max_results)
        else:  # hybrid
            return self._hybrid_search(query, max_results)

    def _vector_search(self, query, max_results):
        """Semantic similarity search via ChromaDB"""
        return self.vector_store.search(query, n_results=max_results)

    def _graph_search(self, query, max_results):
        """Entity/relationship-based search"""
        # Extract entities from query
        # Find related entities and documents
        # Return ranked results

    def _hybrid_search(self, query, max_results):
        """Combined vector + graph search with weighted scoring"""
        vector_results = self._vector_search(query, max_results * 2)
        graph_results = self._graph_search(query, max_results * 2)
        return self._merge_results(vector_results, graph_results, max_results)

    def _merge_results(self, vector_results, graph_results, max_results):
        """Merge and rank results from both search types"""
        # Weight: 60% vector, 40% graph (configurable)
        # Deduplicate by document_id
        # Re-rank by combined score
```

### 2.2 API Endpoint Updates

**Update /api/knowledge/search:**
```python
@app.route('/api/knowledge/search', methods=['POST'])
def search_knowledge():
    data = request.json
    query = data.get('query')
    search_type = data.get('search_type', 'hybrid')  # NEW
    max_results = data.get('max_results', 5)

    results = knowledge_service.search(
        query=query,
        search_type=search_type,
        max_results=max_results
    )

    return jsonify({
        'query': query,
        'search_type': search_type,
        'results': results,
        'total': len(results)
    })
```

### 2.3 Frontend Search Options

**Update KnowledgeSearch.tsx:**
```typescript
// Add search type selector
<Select value={searchType} onValueChange={setSearchType}>
  <SelectTrigger>
    <SelectValue placeholder="Search type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="hybrid">Hybrid (Recommended)</SelectItem>
    <SelectItem value="vector">Vector (Semantic)</SelectItem>
    <SelectItem value="graph">Graph (Relationships)</SelectItem>
  </SelectContent>
</Select>
```

---

## Phase 3: External LLM Integration

### 3.1 External LLM Service

**external_llm_service.py:**
```python
from anthropic import Anthropic
from openai import OpenAI
import google.generativeai as genai

class ExternalLLMService:
    def __init__(self):
        self.providers = {}
        self._init_providers()

    def _init_providers(self):
        """Initialize available providers from config"""
        if os.getenv('ANTHROPIC_API_KEY'):
            self.providers['claude'] = ClaudeClient()
        if os.getenv('OPENAI_API_KEY'):
            self.providers['openai'] = OpenAIClient()
        if os.getenv('GOOGLE_API_KEY'):
            self.providers['gemini'] = GeminiClient()

    def query(self, prompt, provider='claude', context=None, max_tokens=4096):
        """Query an external LLM with optional context"""
        if provider not in self.providers:
            raise ValueError(f"Provider {provider} not configured")

        client = self.providers[provider]

        if context:
            prompt = f"Context:\n{context}\n\nQuestion: {prompt}"

        return client.generate(prompt, max_tokens=max_tokens)

    def get_available_providers(self):
        """Return list of configured providers"""
        return list(self.providers.keys())


class ClaudeClient:
    def __init__(self):
        self.client = Anthropic()

    def generate(self, prompt, max_tokens=4096):
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text


class OpenAIClient:
    def __init__(self):
        self.client = OpenAI()

    def generate(self, prompt, max_tokens=4096):
        response = self.client.chat.completions.create(
            model="gpt-4",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content


class GeminiClient:
    def __init__(self):
        genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
        self.model = genai.GenerativeModel('gemini-pro')

    def generate(self, prompt, max_tokens=4096):
        response = self.model.generate_content(prompt)
        return response.text
```

### 3.2 API Key Management

**Database Model:**
```python
class LLMConfig(db.Model):
    __tablename__ = 'llm_configs'

    id = db.Column(db.Integer, primary_key=True)
    provider = db.Column(db.String(50), unique=True)  # claude, openai, gemini
    api_key_hash = db.Column(db.String(255))  # Hashed for security
    is_configured = db.Column(db.Boolean, default=False)
    last_tested = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
```

**API Endpoints:**
```python
@app.route('/api/settings/llm-providers', methods=['GET'])
def get_llm_providers():
    """Get status of all LLM providers"""

@app.route('/api/settings/llm-providers/<provider>', methods=['PUT'])
def update_llm_provider(provider):
    """Update API key for a provider"""

@app.route('/api/settings/llm-providers/<provider>/test', methods=['POST'])
def test_llm_provider(provider):
    """Test connection to provider"""

@app.route('/api/external-llm/query', methods=['POST'])
def query_external_llm():
    """Query external LLM with optional knowledge context"""
```

### 3.3 Frontend LLM Settings

**New Component: LLMProvidersSettings.tsx**
```typescript
interface LLMProvider {
  name: string
  displayName: string
  isConfigured: boolean
  lastTested: string | null
}

export function LLMProvidersSettings() {
  // List providers
  // API key input (masked)
  // Test connection button
  // Status indicator
}
```

**Update IntegrationsPage to include LLM Providers section**

---

## Phase 4: Statistics & Polish

### 4.1 Statistics Endpoints

```python
@app.route('/api/stats', methods=['GET'])
def get_system_stats():
    """Get comprehensive system statistics"""
    return jsonify({
        'spaces': {
            'total': Space.query.count(),
            'with_messages': db.session.query(Space).join(Message).distinct().count()
        },
        'messages': {
            'total': Message.query.count(),
            'by_role': {
                'user': Message.query.filter_by(role='user').count(),
                'agent': Message.query.filter_by(role='agent').count()
            }
        },
        'tasks': {
            'total': Task.query.count(),
            'by_status': {
                'todo': Task.query.filter_by(status='todo').count(),
                'in_progress': Task.query.filter_by(status='in_progress').count(),
                'completed': Task.query.filter_by(status='completed').count()
            }
        },
        'knowledge': {
            'documents': Document.query.count(),
            'chunks': DocumentChunk.query.count(),
            'entities': Entity.query.count(),
            'relations': Relation.query.count()
        },
        'agents': {
            'total': Agent.query.count(),
            'by_tier': db.session.query(Agent.type, func.count()).group_by(Agent.type).all()
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Detailed health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'services': {
            'database': 'up',
            'vector_store': 'up' if vector_store_healthy() else 'down',
            'llm': 'up' if llm_healthy() else 'down'
        },
        'version': '1.0.0'
    })
```

### 4.2 Stats Dashboard Component

**New Component: StatsDashboard.tsx**
```typescript
export function StatsDashboard() {
  const { data: stats } = useSystemStats()

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatsCard title="Spaces" value={stats.spaces.total} />
      <StatsCard title="Messages" value={stats.messages.total} />
      <StatsCard title="Tasks" value={stats.tasks.total} />
      <StatsCard title="Documents" value={stats.knowledge.documents} />

      <TaskStatusChart data={stats.tasks.by_status} />
      <KnowledgeChart data={stats.knowledge} />
    </div>
  )
}
```

### 4.3 UI Enhancements

1. **Add Tasks to RightSidebar** - Show tasks for current space
2. **Add Stats to Dashboard** - System overview
3. **Improve Space Management** - Better create/edit modals
4. **Add Search Type to Chat** - Let users choose search strategy

---

## Implementation Order

### Week 1: Foundation
- [ ] Create services/ directory structure
- [ ] Implement BaseService
- [ ] Add Task model to models.py
- [ ] Run database migration
- [ ] Implement TaskService
- [ ] Add task API endpoints

### Week 2: Task UI
- [ ] Create Task TypeScript types
- [ ] Create useTasks.ts hooks
- [ ] Build TaskCard component
- [ ] Build TaskList component
- [ ] Build CreateTaskModal
- [ ] Build EditTaskModal
- [ ] Build TasksPage
- [ ] Add Tasks route and navigation

### Week 3: Hybrid Search & External LLM
- [ ] Implement KnowledgeService
- [ ] Add hybrid search logic
- [ ] Update search endpoints
- [ ] Create ExternalLLMService
- [ ] Add LLMConfig model
- [ ] Implement provider clients
- [ ] Add settings endpoints

### Week 4: Polish
- [ ] Add LLM settings UI
- [ ] Create StatsDashboard
- [ ] Add stats endpoints
- [ ] Integrate tasks into RightSidebar
- [ ] Testing and bug fixes
- [ ] Documentation updates

---

## File Changes Summary

### New Files
```
Backend:
- services/__init__.py
- services/base_service.py
- services/space_service.py
- services/task_service.py
- services/knowledge_service.py
- services/external_llm_service.py

Frontend:
- src/features/tasks/TasksPage.tsx
- src/features/tasks/index.ts
- src/components/tasks/TaskCard.tsx
- src/components/tasks/TaskList.tsx
- src/components/tasks/TaskFilters.tsx
- src/components/tasks/CreateTaskModal.tsx
- src/components/tasks/EditTaskModal.tsx
- src/components/tasks/DeleteTaskDialog.tsx
- src/components/tasks/index.ts
- src/api/hooks/useTasks.ts
- src/components/stats/StatsDashboard.tsx
- src/components/stats/StatsCard.tsx
- src/components/integrations/LLMProvidersSettings.tsx
```

### Modified Files
```
Backend:
- models.py (add Task, LLMConfig models)
- app.py (add task, stats, llm endpoints)
- knowledge_processor.py (hybrid search)

Frontend:
- src/types/models.ts (add Task types)
- src/api/endpoints.ts (add task, stats endpoints)
- src/api/hooks/index.ts (export new hooks)
- src/App.tsx (add Tasks route)
- src/components/layout/Sidebar.tsx (add Tasks nav)
- src/components/layout/RightSidebar.tsx (show tasks)
- src/features/knowledge/KnowledgeSearch.tsx (search type)
- src/features/integrations/IntegrationsPage.tsx (LLM section)
```

---

## Success Criteria

1. **Task Management**
   - Users can create, edit, delete tasks
   - Tasks can be filtered by status/priority
   - Tasks are space-scoped
   - Task stats are visible

2. **Hybrid Search**
   - Users can choose search type
   - Hybrid search combines vector + graph
   - Results show relevance scores

3. **External LLM**
   - Users can configure API keys
   - Multiple providers supported
   - Keys are securely stored

4. **Statistics**
   - System stats endpoint works
   - Dashboard shows key metrics
   - Health check is comprehensive

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Database migration issues | Test migration on copy first |
| Breaking existing functionality | Extensive testing before each merge |
| API key security | Hash keys, never expose in logs |
| Performance with hybrid search | Add caching, async processing |
| Frontend build issues | Incremental component development |

---

## Notes

- Keep existing agent functionality intact
- Maintain backward compatibility with current API
- Use existing UI component patterns (shadcn/ui)
- Follow existing code style and conventions
- Test thoroughly before deploying
