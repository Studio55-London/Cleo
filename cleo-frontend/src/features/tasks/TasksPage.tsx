import { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TaskList,
  TaskStats,
  CreateTaskModal,
  EditTaskModal,
  DeleteTaskDialog,
} from '@/components/tasks'
import {
  useTasks,
  useTaskStats,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useCreateSubtask,
} from '@/api'
import { useSpaces } from '@/api'
import type { Task, TaskStatus, TaskPriority, CreateTaskInput, UpdateTaskInput, CreateSubtaskInput } from '@/types'

type FilterStatus = TaskStatus | 'all'
type FilterPriority = TaskPriority | 'all'

export function TasksPage() {
  const { data: spaces } = useSpaces()
  const { data: stats, isLoading: statsLoading } = useTaskStats()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [filterSpaceId, setFilterSpaceId] = useState<string>('all')

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)

  // Build filters for the query
  const queryFilters = {
    spaceId: filterSpaceId !== 'all' ? parseInt(filterSpaceId) : undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
    priority: filterPriority !== 'all' ? filterPriority : undefined,
  }

  const { data: tasks, isLoading: tasksLoading } = useTasks(queryFilters)

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const completeTask = useCompleteTask()
  const createSubtask = useCreateSubtask()

  // Filter tasks by search query
  const filteredTasks = tasks?.filter((task) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      task.title.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.space_name?.toLowerCase().includes(query)
    )
  })

  const handleCreateTask = async (input: CreateTaskInput) => {
    await createTask.mutateAsync(input)
  }

  const handleUpdateTask = async (id: number, input: UpdateTaskInput) => {
    await updateTask.mutateAsync({ id, data: input })
  }

  const handleDeleteTask = async (task: Task) => {
    await deleteTask.mutateAsync(task.id)
  }

  const handleCompleteTask = async (task: Task) => {
    await completeTask.mutateAsync(task.id)
  }

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    await updateTask.mutateAsync({ id: task.id, data: { status } })
  }

  const handleAddSubtask = async (parentTaskId: number, data: CreateSubtaskInput) => {
    await createSubtask.mutateAsync({ parentTaskId, data })
  }

  const handleCompleteSubtask = async (subtask: Task) => {
    await completeTask.mutateAsync(subtask.id)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-sm text-foreground-secondary mt-1">
              Manage tasks across all spaces
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>

        {/* Stats */}
        <TaskStats stats={stats} isLoading={statsLoading} />

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={filterSpaceId}
            onValueChange={setFilterSpaceId}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Spaces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Spaces</SelectItem>
              {spaces?.map((space) => (
                <SelectItem key={space.id} value={space.id}>
                  {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as FilterStatus)}
          >
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterPriority}
            onValueChange={(v) => setFilterPriority(v as FilterPriority)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        <Tabs defaultValue="list" className="h-full flex flex-col">
          <TabsList className="w-fit mb-4">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="board">Board View</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="flex-1 overflow-hidden mt-0">
            <TaskList
              tasks={filteredTasks}
              isLoading={tasksLoading}
              onComplete={handleCompleteTask}
              onEdit={setEditingTask}
              onDelete={setDeletingTask}
              onStatusChange={handleStatusChange}
              onAddSubtask={handleAddSubtask}
              onCompleteSubtask={handleCompleteSubtask}
              emptyMessage={
                searchQuery
                  ? 'No tasks match your search'
                  : filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'No tasks match the current filters'
                  : 'No tasks yet'
              }
            />
          </TabsContent>

          <TabsContent value="board" className="flex-1 overflow-hidden mt-0">
            <div className="grid grid-cols-3 gap-4 h-full">
              {(['todo', 'in_progress', 'completed'] as TaskStatus[]).map((status) => (
                <div key={status} className="flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-semibold capitalize">
                      {status.replace('_', ' ')}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      ({filteredTasks?.filter((t) => t.status === status).length || 0})
                    </span>
                  </div>
                  <div className="flex-1 overflow-auto space-y-3">
                    {filteredTasks
                      ?.filter((task) => task.status === status)
                      .map((task) => (
                        <div
                          key={task.id}
                          className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                          onClick={() => setEditingTask(task)}
                        >
                          <p className="font-medium text-sm">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                task.priority === 'high'
                                  ? 'bg-red-500/10 text-red-500'
                                  : task.priority === 'medium'
                                  ? 'bg-yellow-500/10 text-yellow-500'
                                  : 'bg-green-500/10 text-green-500'
                              }`}
                            >
                              {task.priority}
                            </span>
                            {task.space_name && (
                              <span className="text-xs text-muted-foreground">
                                {task.space_name}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CreateTaskModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreate={handleCreateTask}
        defaultSpaceId={filterSpaceId !== 'all' ? parseInt(filterSpaceId) : undefined}
      />

      <EditTaskModal
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        onUpdate={handleUpdateTask}
      />

      <DeleteTaskDialog
        task={deletingTask}
        open={!!deletingTask}
        onOpenChange={(open) => !open && setDeletingTask(null)}
        onConfirm={handleDeleteTask}
      />
    </div>
  )
}
