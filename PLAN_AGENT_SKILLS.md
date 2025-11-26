# Agent Skills Implementation Plan for Cleo

## Overview

This plan implements Claude-style Agent Skills within Cleo, allowing users to create, edit, and manage skills for agents. Skills are stored as `SKILL.md` files following Anthropic's best practices and are used to guide agent behavior and inter-agent collaboration.

## Research Sources

- [Introducing Agent Skills | Anthropic](https://www.anthropic.com/news/skills)
- [Skill authoring best practices - Claude Docs](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
- [Agent Skills - Claude Code Docs](https://docs.claude.com/en/docs/claude-code/skills)
- [GitHub - anthropics/skills](https://github.com/anthropics/skills)

---

## Phase 1: Database & Backend Foundation

### 1.1 Create Skill Model (models.py)

Add a new `Skill` SQLAlchemy model:

```python
class Skill(db.Model):
    __tablename__ = 'skills'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)  # lowercase, hyphens only
    display_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(1024), nullable=False)
    content = db.Column(db.Text, nullable=False)  # Full SKILL.md content
    agent_id = db.Column(db.Integer, db.ForeignKey('agents.id'), nullable=True)
    is_global = db.Column(db.Boolean, default=False)  # Available to all agents
    is_active = db.Column(db.Boolean, default=True)
    category = db.Column(db.String(50))  # e.g., 'productivity', 'communication'
    triggers = db.Column(db.JSON)  # Keywords that activate this skill
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    agent = db.relationship('Agent', backref=db.backref('skills', lazy='dynamic'))
```

### 1.2 Update Agent Model

Add skill-related fields to existing Agent model:

```python
# Add to Agent model
skills_enabled = db.Column(db.Boolean, default=True)
```

### 1.3 Create Skills Directory Structure

```
skills/
├── __init__.py              # Skill loader and registry
├── skill_parser.py          # YAML frontmatter parser
├── skill_manager.py         # CRUD operations for skills
├── global/                  # Global skills available to all agents
│   ├── task-management/
│   │   └── SKILL.md
│   ├── meeting-scheduling/
│   │   └── SKILL.md
│   └── document-creation/
│       └── SKILL.md
└── agents/                  # Agent-specific skills
    ├── cleo/
    │   └── SKILL.md
    ├── coach/
    │   └── SKILL.md
    └── [agent-name]/
        └── SKILL.md
```

### 1.4 Flask API Endpoints (app.py)

```python
# Skills API Routes
GET    /api/skills                    # List all skills
GET    /api/skills/<id>               # Get specific skill
POST   /api/skills                    # Create new skill
PUT    /api/skills/<id>               # Update skill
DELETE /api/skills/<id>               # Delete skill
GET    /api/agents/<id>/skills        # Get skills for agent
POST   /api/agents/<id>/skills        # Assign skill to agent
DELETE /api/agents/<id>/skills/<sid>  # Remove skill from agent
GET    /api/skills/global             # List global skills
POST   /api/skills/<id>/export        # Export skill as SKILL.md file
POST   /api/skills/import             # Import SKILL.md file
```

---

## Phase 2: Skill Parser & Manager

### 2.1 SKILL.md Parser (skills/skill_parser.py)

```python
import yaml
import re
from typing import Dict, Optional, Tuple

class SkillParser:
    """Parse SKILL.md files with YAML frontmatter"""

    FRONTMATTER_PATTERN = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.DOTALL)

    @staticmethod
    def parse(content: str) -> Tuple[Dict, str]:
        """Parse SKILL.md content into frontmatter dict and body"""
        match = SkillParser.FRONTMATTER_PATTERN.match(content)
        if not match:
            raise ValueError("Invalid SKILL.md: Missing YAML frontmatter")

        frontmatter = yaml.safe_load(match.group(1))
        body = content[match.end():]

        # Validate required fields
        if 'name' not in frontmatter:
            raise ValueError("Missing required field: name")
        if 'description' not in frontmatter:
            raise ValueError("Missing required field: description")

        # Validate name format
        if not re.match(r'^[a-z0-9-]+$', frontmatter['name']):
            raise ValueError("Name must contain only lowercase letters, numbers, and hyphens")

        return frontmatter, body

    @staticmethod
    def generate(name: str, description: str, body: str, **kwargs) -> str:
        """Generate SKILL.md content from components"""
        frontmatter = {
            'name': name,
            'description': description,
            **kwargs
        }

        yaml_content = yaml.dump(frontmatter, default_flow_style=False)
        return f"---\n{yaml_content}---\n\n{body}"
```

### 2.2 Skill Manager (skills/skill_manager.py)

```python
import os
from pathlib import Path
from typing import List, Optional
from models import Skill, Agent, db
from skills.skill_parser import SkillParser

class SkillManager:
    """Manage skill files and database records"""

    SKILLS_DIR = Path("skills")
    GLOBAL_DIR = SKILLS_DIR / "global"
    AGENTS_DIR = SKILLS_DIR / "agents"

    def __init__(self):
        self._ensure_directories()

    def _ensure_directories(self):
        """Create skill directories if they don't exist"""
        self.GLOBAL_DIR.mkdir(parents=True, exist_ok=True)
        self.AGENTS_DIR.mkdir(parents=True, exist_ok=True)

    def create_skill(self, name: str, description: str, content: str,
                     agent_id: Optional[int] = None, is_global: bool = False,
                     category: str = None, triggers: List[str] = None) -> Skill:
        """Create a new skill and save to filesystem"""

        # Parse and validate content
        frontmatter, body = SkillParser.parse(content)

        # Create database record
        skill = Skill(
            name=frontmatter['name'],
            display_name=name,
            description=frontmatter['description'],
            content=content,
            agent_id=agent_id,
            is_global=is_global,
            category=category,
            triggers=triggers or []
        )

        db.session.add(skill)
        db.session.commit()

        # Save to filesystem
        self._save_skill_file(skill)

        return skill

    def _save_skill_file(self, skill: Skill):
        """Save skill to SKILL.md file"""
        if skill.is_global:
            skill_dir = self.GLOBAL_DIR / skill.name
        else:
            agent = Agent.query.get(skill.agent_id)
            skill_dir = self.AGENTS_DIR / agent.name.lower() / skill.name

        skill_dir.mkdir(parents=True, exist_ok=True)
        skill_file = skill_dir / "SKILL.md"
        skill_file.write_text(skill.content, encoding='utf-8')

    def get_skills_for_agent(self, agent_id: int) -> List[Skill]:
        """Get all skills applicable to an agent (agent-specific + global)"""
        agent_skills = Skill.query.filter_by(agent_id=agent_id, is_active=True).all()
        global_skills = Skill.query.filter_by(is_global=True, is_active=True).all()
        return agent_skills + global_skills

    def get_skill_summaries(self, agent_id: int) -> str:
        """Get skill name/description summaries for system prompt injection"""
        skills = self.get_skills_for_agent(agent_id)
        if not skills:
            return ""

        summaries = ["## Available Skills\n"]
        for skill in skills:
            summaries.append(f"- **{skill.name}**: {skill.description}")

        return "\n".join(summaries)

    def load_skill_content(self, skill_id: int) -> str:
        """Load full skill content when activated"""
        skill = Skill.query.get(skill_id)
        if not skill:
            raise ValueError(f"Skill not found: {skill_id}")
        return skill.content
```

---

## Phase 3: Agent Integration

### 3.1 Update ClaudeAgent (integrations/claude_provider.py)

Modify the agent to support skills:

```python
class ClaudeAgent:
    def __init__(self, name: str, instructions: str, tools=None,
                 model: str = "claude-sonnet-4-20250514", temperature: float = 0.7):
        self.name = name
        self.base_instructions = instructions
        self.tools = tools or []
        self.model = model
        self.temperature = temperature
        self.skill_manager = SkillManager()
        self._active_skills = []

    def _build_system_prompt(self, agent_id: int) -> str:
        """Build system prompt with skill summaries"""
        prompt_parts = [self.base_instructions]

        # Add skill summaries for discovery
        skill_summaries = self.skill_manager.get_skill_summaries(agent_id)
        if skill_summaries:
            prompt_parts.append("\n\n" + skill_summaries)
            prompt_parts.append("\nWhen a task matches a skill, load and follow its instructions.")

        return "\n".join(prompt_parts)

    def _detect_relevant_skills(self, message: str, agent_id: int) -> List[Skill]:
        """Detect which skills are relevant based on message content"""
        skills = self.skill_manager.get_skills_for_agent(agent_id)
        relevant = []

        message_lower = message.lower()
        for skill in skills:
            # Check trigger keywords
            if skill.triggers:
                if any(trigger.lower() in message_lower for trigger in skill.triggers):
                    relevant.append(skill)
                    continue

            # Check skill name/description match
            if skill.name in message_lower or any(
                word in message_lower for word in skill.description.lower().split()[:5]
            ):
                relevant.append(skill)

        return relevant

    def run(self, input_text: str, context: str = None, agent_id: int = None) -> str:
        """Run agent with skill support"""

        # Build system prompt with skills
        system_prompt = self._build_system_prompt(agent_id) if agent_id else self.base_instructions

        # Detect and load relevant skills
        if agent_id:
            relevant_skills = self._detect_relevant_skills(input_text, agent_id)
            if relevant_skills:
                skill_context = "\n\n## Active Skills\n"
                for skill in relevant_skills[:3]:  # Limit to top 3 relevant skills
                    skill_context += f"\n### {skill.name}\n{skill.content}\n"
                system_prompt += skill_context

        # Continue with normal execution...
```

### 3.2 Update Message Handler (app.py)

Modify the send_message endpoint to pass agent_id:

```python
# In send_message route
agent_db = Agent.query.filter_by(name=agent_name).first()
agent_id = agent_db.id if agent_db else None

response_text = agent_instance.run(
    agent_message,
    context=knowledge_context,
    agent_id=agent_id
)
```

---

## Phase 4: Frontend Implementation

### 4.1 New Components Structure

```
cleo-frontend/src/
├── components/
│   └── skills/
│       ├── SkillsPage.tsx           # Main skills management page
│       ├── SkillCard.tsx            # Individual skill card
│       ├── SkillGrid.tsx            # Grid layout for skills
│       ├── CreateSkillModal.tsx     # Create skill with editor
│       ├── EditSkillModal.tsx       # Edit existing skill
│       ├── DeleteSkillDialog.tsx    # Delete confirmation
│       ├── SkillEditor.tsx          # Markdown editor for SKILL.md
│       ├── SkillPreview.tsx         # Preview skill content
│       └── AssignSkillDialog.tsx    # Assign skill to agents
├── api/
│   └── hooks/
│       └── useSkills.ts             # React Query hooks
└── types/
    └── skill.ts                     # TypeScript types
```

### 4.2 TypeScript Types (types/skill.ts)

```typescript
export interface Skill {
  id: number;
  name: string;           // lowercase-hyphenated
  displayName: string;    // Human readable
  description: string;    // What it does & when to use
  content: string;        // Full SKILL.md content
  agentId: number | null;
  agentName?: string;
  isGlobal: boolean;
  isActive: boolean;
  category: string | null;
  triggers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillInput {
  name: string;
  displayName: string;
  description: string;
  content: string;
  agentId?: number;
  isGlobal?: boolean;
  category?: string;
  triggers?: string[];
}
```

### 4.3 API Hooks (api/hooks/useSkills.ts)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { Skill, CreateSkillInput } from '@/types/skill';

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/skills');
      return data.skills as Skill[];
    }
  });
}

export function useAgentSkills(agentId: number) {
  return useQuery({
    queryKey: ['skills', 'agent', agentId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/agents/${agentId}/skills`);
      return data.skills as Skill[];
    },
    enabled: !!agentId
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSkillInput) => {
      const { data } = await apiClient.post('/api/skills', input);
      return data.skill as Skill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    }
  });
}

// ... additional hooks for update, delete, assign
```

### 4.4 Create Skill Modal with Editor

```tsx
// CreateSkillModal.tsx - Key features:
// 1. Form fields for name, display name, description
// 2. Category selector (productivity, communication, analysis, etc.)
// 3. Trigger keywords input (comma-separated)
// 4. Agent selector (or global checkbox)
// 5. Markdown editor with SKILL.md template
// 6. Live preview panel
// 7. Validation for name format (lowercase, hyphens)
```

### 4.5 Skill Editor Component

```tsx
// SkillEditor.tsx - Markdown editor with:
// 1. Syntax highlighting
// 2. YAML frontmatter template
// 3. Section templates (## Instructions, ## Examples, ## Guidelines)
// 4. Live preview
// 5. Export/Import buttons
```

### 4.6 Add Skills Tab to Agent Edit

Modify `EditAgentModal.tsx` to include a Skills tab:

```tsx
// Add tab for managing agent-specific skills
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="skills">Skills</TabsTrigger>
  </TabsList>

  <TabsContent value="details">
    {/* Existing agent edit form */}
  </TabsContent>

  <TabsContent value="skills">
    <AgentSkillsManager agentId={agent.id} />
  </TabsContent>
</Tabs>
```

---

## Phase 5: Skill Templates & Defaults

### 5.1 Default Skill Templates

Create starter templates for common skill types:

```markdown
# skills/templates/productivity.md
---
name: task-prioritization
description: Helps prioritize tasks using Eisenhower matrix and urgency/importance scoring. Use when user asks about task priorities or workload management.
---

# Task Prioritization

## Instructions
When the user asks about prioritizing tasks or managing workload:

1. Gather all pending tasks from context (Todoist, mentioned tasks, etc.)
2. Apply the Eisenhower Matrix:
   - **Urgent + Important**: Do first
   - **Important + Not Urgent**: Schedule
   - **Urgent + Not Important**: Delegate
   - **Neither**: Eliminate

3. Consider additional factors:
   - Deadlines and due dates
   - Dependencies on other tasks
   - Energy levels and time of day
   - Strategic alignment with goals

## Output Format
Present prioritized tasks as:
1. [Priority Level] Task Name - Reason
2. ...

## Guidelines
- Always explain the reasoning behind priorities
- Suggest time blocks for important tasks
- Flag tasks that may need delegation
- Identify tasks that can be batched together
```

### 5.2 Pre-built Skills for Each Agent Type

Create default skills based on agent tier:

**Master (Cleo):**
- `agent-coordination`: Coordinating tasks between agents
- `context-synthesis`: Synthesizing information across conversations
- `goal-tracking`: Tracking progress on user goals

**Personal (Coach):**
- `goal-setting`: SMART goal creation
- `habit-tracking`: Building and tracking habits
- `reflection-prompting`: Guided self-reflection

**Team (MDs):**
- `project-planning`: Breaking down projects into tasks
- `team-delegation`: Delegating to worker agents
- `okr-management`: Setting and tracking OKRs

**Worker:**
- Domain-specific skills per agent role

**Expert:**
- Specialized knowledge skills per domain

---

## Phase 6: Inter-Agent Skill Sharing

### 6.1 Skill Discovery Protocol

When agents collaborate, they can discover each other's skills:

```python
def get_collaborative_skills(self, agent_ids: List[int]) -> Dict[str, List[Skill]]:
    """Get skills from multiple agents for collaboration"""
    skills_by_agent = {}
    for agent_id in agent_ids:
        agent = Agent.query.get(agent_id)
        skills_by_agent[agent.name] = self.get_skills_for_agent(agent_id)
    return skills_by_agent
```

### 6.2 Skill Invocation Syntax

Allow agents to explicitly invoke skills:

```
User: Help me plan my week
Cleo: I'll use the task-prioritization skill to help organize your week.

[Skill: task-prioritization activated]
Based on your Todoist tasks, here's your prioritized week...
```

---

## Phase 7: UI Navigation & Routing

### 7.1 Add Skills to Sidebar

Update sidebar navigation to include Skills:

```tsx
// In Sidebar.tsx
<SidebarItem
  icon={<Sparkles className="h-4 w-4" />}
  label="Skills"
  href="/skills"
/>
```

### 7.2 Route Configuration

```tsx
// In App.tsx or routes
<Route path="/skills" element={<SkillsPage />} />
<Route path="/skills/:id" element={<SkillDetailPage />} />
<Route path="/agents/:id/skills" element={<AgentSkillsPage />} />
```

---

## Implementation Order

### Sprint 1: Foundation (Backend)
1. [ ] Add Skill model to models.py
2. [ ] Create database migration
3. [ ] Implement skill_parser.py
4. [ ] Implement skill_manager.py
5. [ ] Add Flask API endpoints
6. [ ] Create skills directory structure

### Sprint 2: Agent Integration
1. [ ] Update ClaudeAgent with skill support
2. [ ] Implement skill detection logic
3. [ ] Modify message handler for skill context
4. [ ] Test skill injection into prompts

### Sprint 3: Frontend - Core UI
1. [ ] Create TypeScript types
2. [ ] Implement useSkills hooks
3. [ ] Build SkillsPage component
4. [ ] Build SkillCard and SkillGrid
5. [ ] Add sidebar navigation

### Sprint 4: Frontend - CRUD
1. [ ] Build CreateSkillModal with editor
2. [ ] Build EditSkillModal
3. [ ] Build DeleteSkillDialog
4. [ ] Implement SkillEditor with preview
5. [ ] Add validation

### Sprint 5: Agent Integration UI
1. [ ] Add Skills tab to EditAgentModal
2. [ ] Build AssignSkillDialog
3. [ ] Show agent skills on AgentCard
4. [ ] Implement skill toggle (active/inactive)

### Sprint 6: Templates & Polish
1. [ ] Create default skill templates
2. [ ] Pre-populate skills for existing agents
3. [ ] Add import/export functionality
4. [ ] UI polish and error handling
5. [ ] Documentation

---

## SKILL.md File Format Reference

```markdown
---
name: skill-name-here
description: Clear description of what this skill does and when to use it. Write in third person.
version: 1.0.0
author: Cleo
tags:
  - productivity
  - planning
triggers:
  - prioritize
  - urgent
  - important
---

# Skill Display Name

## Overview
Brief explanation of the skill's purpose.

## Instructions
Step-by-step instructions for Claude to follow when this skill is activated.

1. First step
2. Second step
3. Third step

## Examples

### Example 1: Basic Usage
**User**: "Help me prioritize my tasks"
**Agent Response**: [Example response]

### Example 2: Advanced Usage
**User**: "I'm overwhelmed with work"
**Agent Response**: [Example response]

## Guidelines
- Guideline 1
- Guideline 2
- Guideline 3

## Resources
Link to any additional resources or templates.
```

---

## Success Metrics

1. **Skill Creation**: Users can create skills via UI
2. **Skill Files**: Skills are saved as valid SKILL.md files
3. **Agent Behavior**: Skills visibly influence agent responses
4. **Inter-Agent**: Skills are shared appropriately between agents
5. **Performance**: Skill loading doesn't impact response time significantly

---

## Future Enhancements

1. **Skill Marketplace**: Share skills between Cleo instances
2. **Skill Analytics**: Track skill usage and effectiveness
3. **Auto-Skill Generation**: AI-assisted skill creation
4. **Skill Versioning**: Track skill changes over time
5. **Skill Dependencies**: Skills that require other skills
