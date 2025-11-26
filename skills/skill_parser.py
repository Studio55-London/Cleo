"""
Skill Parser for SKILL.md files
Handles YAML frontmatter parsing and validation following Claude's format
"""
import re
import yaml
import logging
from typing import Dict, Tuple, Optional, List

logger = logging.getLogger(__name__)


class SkillParserError(Exception):
    """Custom exception for skill parsing errors"""
    pass


class SkillParser:
    """Parse and generate SKILL.md files with YAML frontmatter"""

    # Regex to match YAML frontmatter (content between --- markers)
    FRONTMATTER_PATTERN = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.DOTALL)

    # Valid name pattern: lowercase letters, numbers, and hyphens only
    NAME_PATTERN = re.compile(r'^[a-z0-9-]+$')

    # Maximum lengths per Claude's spec
    MAX_NAME_LENGTH = 64
    MAX_DESCRIPTION_LENGTH = 1024

    # Required fields in frontmatter
    REQUIRED_FIELDS = ['name', 'description']

    # Optional frontmatter fields
    OPTIONAL_FIELDS = ['version', 'author', 'tags', 'triggers']

    @classmethod
    def parse(cls, content: str) -> Tuple[Dict, str]:
        """
        Parse SKILL.md content into frontmatter dict and body

        Args:
            content: Raw SKILL.md file content

        Returns:
            Tuple of (frontmatter_dict, body_text)

        Raises:
            SkillParserError: If content is invalid
        """
        if not content or not content.strip():
            raise SkillParserError("Empty skill content")

        # Match frontmatter
        match = cls.FRONTMATTER_PATTERN.match(content)
        if not match:
            raise SkillParserError(
                "Invalid SKILL.md: Missing or malformed YAML frontmatter. "
                "File must start with '---' followed by YAML metadata and another '---'"
            )

        # Parse YAML frontmatter
        try:
            frontmatter = yaml.safe_load(match.group(1))
        except yaml.YAMLError as e:
            raise SkillParserError(f"Invalid YAML frontmatter: {e}")

        if not isinstance(frontmatter, dict):
            raise SkillParserError("Frontmatter must be a YAML dictionary")

        # Validate required fields
        for field in cls.REQUIRED_FIELDS:
            if field not in frontmatter:
                raise SkillParserError(f"Missing required field: {field}")

        # Validate name format
        name = frontmatter['name']
        if not isinstance(name, str):
            raise SkillParserError("Name must be a string")

        if len(name) > cls.MAX_NAME_LENGTH:
            raise SkillParserError(
                f"Name must be {cls.MAX_NAME_LENGTH} characters or less"
            )

        if not cls.NAME_PATTERN.match(name):
            raise SkillParserError(
                "Name must contain only lowercase letters, numbers, and hyphens"
            )

        # Validate description
        description = frontmatter['description']
        if not isinstance(description, str):
            raise SkillParserError("Description must be a string")

        if len(description) > cls.MAX_DESCRIPTION_LENGTH:
            raise SkillParserError(
                f"Description must be {cls.MAX_DESCRIPTION_LENGTH} characters or less"
            )

        # Extract body (everything after frontmatter)
        body = content[match.end():].strip()

        return frontmatter, body

    @classmethod
    def validate(cls, content: str) -> List[str]:
        """
        Validate SKILL.md content without raising exceptions

        Args:
            content: Raw SKILL.md file content

        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []

        try:
            cls.parse(content)
        except SkillParserError as e:
            errors.append(str(e))

        return errors

    @classmethod
    def generate(
        cls,
        name: str,
        description: str,
        body: str,
        version: str = "1.0.0",
        author: Optional[str] = None,
        tags: Optional[List[str]] = None,
        triggers: Optional[List[str]] = None
    ) -> str:
        """
        Generate SKILL.md content from components

        Args:
            name: Skill name (lowercase-hyphenated)
            description: Skill description
            body: Markdown body content
            version: Version string
            author: Author name
            tags: List of tags
            triggers: List of trigger keywords

        Returns:
            Complete SKILL.md content string
        """
        # Build frontmatter dict
        frontmatter = {
            'name': name,
            'description': description,
        }

        if version:
            frontmatter['version'] = version
        if author:
            frontmatter['author'] = author
        if tags:
            frontmatter['tags'] = tags
        if triggers:
            frontmatter['triggers'] = triggers

        # Generate YAML with nice formatting
        yaml_content = yaml.dump(
            frontmatter,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False
        )

        return f"---\n{yaml_content}---\n\n{body}"

    @classmethod
    def get_template(cls, category: str = "general") -> str:
        """
        Get a skill template for a given category

        Args:
            category: Skill category (general, productivity, communication, etc.)

        Returns:
            Template SKILL.md content
        """
        templates = {
            "general": cls._general_template(),
            "productivity": cls._productivity_template(),
            "communication": cls._communication_template(),
            "analysis": cls._analysis_template(),
            "coordination": cls._coordination_template(),
        }

        return templates.get(category, templates["general"])

    @classmethod
    def _general_template(cls) -> str:
        return cls.generate(
            name="my-skill-name",
            description="A clear description of what this skill does and when to use it. Write in third person.",
            body="""# My Skill Name

## Overview
Brief explanation of the skill's purpose and when it should be activated.

## Instructions
Step-by-step instructions for Claude to follow when this skill is active:

1. First, analyze the user's request
2. Then, apply the skill's methodology
3. Finally, present the results in the specified format

## Examples

### Example 1: Basic Usage
**User**: "Example user request"
**Response**: Example of how to respond using this skill

## Guidelines
- Always maintain a professional tone
- Focus on actionable recommendations
- Cite sources when applicable
""",
            version="1.0.0",
            author="Cleo",
            tags=["general"],
            triggers=[]
        )

    @classmethod
    def _productivity_template(cls) -> str:
        return cls.generate(
            name="task-management",
            description="Helps organize, prioritize, and track tasks. Use when user asks about task management, priorities, or workload organization.",
            body="""# Task Management

## Overview
This skill helps users organize and prioritize their tasks effectively using proven methodologies.

## Instructions
When the user asks about task management or prioritization:

1. **Gather Context**: Identify all tasks mentioned or available from integrations (Todoist, etc.)
2. **Categorize**: Group tasks by project, urgency, or type
3. **Prioritize**: Apply appropriate prioritization framework:
   - Eisenhower Matrix (Urgent/Important)
   - MoSCoW (Must/Should/Could/Won't)
   - Impact vs Effort
4. **Present**: Provide clear, actionable recommendations

## Output Format
Present prioritized tasks as:
```
## High Priority (Do First)
1. [Task Name] - [Reason for priority]

## Medium Priority (Schedule)
1. [Task Name] - [Suggested timeframe]

## Low Priority (Delegate/Defer)
1. [Task Name] - [Recommendation]
```

## Guidelines
- Always explain the reasoning behind priorities
- Consider deadlines and dependencies
- Suggest time blocking for focused work
- Identify tasks that can be batched together
""",
            version="1.0.0",
            author="Cleo",
            tags=["productivity", "planning", "tasks"],
            triggers=["prioritize", "organize", "tasks", "todo", "workload", "schedule"]
        )

    @classmethod
    def _communication_template(cls) -> str:
        return cls.generate(
            name="meeting-management",
            description="Helps prepare for, conduct, and follow up on meetings. Use when user mentions meetings, agendas, or follow-ups.",
            body="""# Meeting Management

## Overview
This skill assists with all aspects of meeting management from preparation to follow-up.

## Instructions

### Before Meeting
1. Review meeting context and attendees
2. Prepare agenda items
3. Gather relevant documents and data

### During Meeting
1. Track action items as they arise
2. Note key decisions made
3. Capture follow-up items

### After Meeting
1. Summarize key outcomes
2. List action items with owners and deadlines
3. Identify next steps

## Output Format
```
## Meeting Summary: [Title]
**Date**: [Date]
**Attendees**: [Names]

### Key Decisions
- [Decision 1]

### Action Items
| Task | Owner | Deadline |
|------|-------|----------|
| Task | Name  | Date     |

### Next Steps
- [Next step]
```

## Guidelines
- Keep summaries concise but complete
- Ensure all action items have clear owners
- Set realistic deadlines
""",
            version="1.0.0",
            author="Cleo",
            tags=["communication", "meetings", "collaboration"],
            triggers=["meeting", "agenda", "follow-up", "attendees", "minutes"]
        )

    @classmethod
    def _analysis_template(cls) -> str:
        return cls.generate(
            name="data-analysis",
            description="Provides structured data analysis and insights. Use when user needs to analyze information, metrics, or trends.",
            body="""# Data Analysis

## Overview
This skill provides frameworks for analyzing data and extracting meaningful insights.

## Instructions

1. **Understand the Question**: Clarify what insight the user is seeking
2. **Gather Data**: Collect relevant data points
3. **Analyze**: Apply appropriate analytical methods
4. **Synthesize**: Draw conclusions from the analysis
5. **Recommend**: Provide actionable recommendations

## Analytical Frameworks
- **Trend Analysis**: Identify patterns over time
- **Comparison**: Compare across categories or periods
- **Root Cause**: Identify underlying causes of issues
- **Forecasting**: Project future outcomes

## Output Format
```
## Analysis: [Topic]

### Key Findings
1. [Finding with supporting data]

### Insights
- [Insight derived from findings]

### Recommendations
1. [Actionable recommendation]

### Data Quality Notes
- [Any caveats about the data]
```

## Guidelines
- Always cite the source of data
- Acknowledge limitations and assumptions
- Present findings objectively
- Make recommendations actionable
""",
            version="1.0.0",
            author="Cleo",
            tags=["analysis", "data", "insights"],
            triggers=["analyze", "analysis", "metrics", "trends", "data", "insights"]
        )

    @classmethod
    def _coordination_template(cls) -> str:
        return cls.generate(
            name="agent-coordination",
            description="Coordinates tasks between multiple agents. Use when a task requires collaboration between different agent specialists.",
            body="""# Agent Coordination

## Overview
This skill enables effective coordination between multiple agents to complete complex tasks.

## Instructions

1. **Assess the Task**: Determine which agent capabilities are needed
2. **Plan Delegation**: Identify which agents should handle which parts
3. **Coordinate Handoffs**: Ensure smooth transitions between agents
4. **Synthesize Results**: Combine outputs into a coherent response

## Agent Selection Guide
- **Worker Agents**: For specific domain tasks (Legal, Finance, Marketing)
- **Expert Agents**: For specialized knowledge (RegTech, CyberSecurity)
- **Team Agents**: For business unit coordination
- **Personal Agents**: For individual productivity support

## Coordination Protocol
```
1. [User Request]
   |
2. [Analyze Required Capabilities]
   |
3. [Delegate to Specialist Agent(s)]
   |
4. [Collect Agent Outputs]
   |
5. [Synthesize Final Response]
```

## Guidelines
- Minimize unnecessary agent handoffs
- Clearly communicate context between agents
- Ensure consistency in final output
- Report which agents contributed to the response
""",
            version="1.0.0",
            author="Cleo",
            tags=["coordination", "delegation", "multi-agent"],
            triggers=["delegate", "coordinate", "team", "collaboration", "multiple agents"]
        )

    @classmethod
    def extract_metadata(cls, content: str) -> Optional[Dict]:
        """
        Extract just the metadata from SKILL.md without full validation

        Args:
            content: Raw SKILL.md content

        Returns:
            Metadata dict or None if parsing fails
        """
        try:
            frontmatter, _ = cls.parse(content)
            return frontmatter
        except SkillParserError:
            return None

    @classmethod
    def normalize_name(cls, name: str) -> str:
        """
        Convert a display name to a valid skill name

        Args:
            name: Display name (e.g., "Task Management")

        Returns:
            Normalized name (e.g., "task-management")
        """
        # Convert to lowercase
        normalized = name.lower()

        # Replace spaces and underscores with hyphens
        normalized = re.sub(r'[\s_]+', '-', normalized)

        # Remove any characters that aren't lowercase letters, numbers, or hyphens
        normalized = re.sub(r'[^a-z0-9-]', '', normalized)

        # Remove multiple consecutive hyphens
        normalized = re.sub(r'-+', '-', normalized)

        # Remove leading/trailing hyphens
        normalized = normalized.strip('-')

        # Truncate to max length
        return normalized[:cls.MAX_NAME_LENGTH]
