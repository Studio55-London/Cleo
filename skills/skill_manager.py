"""
Skill Manager for Cleo
Handles CRUD operations and file system management for skills
"""
import os
import json
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime

from .skill_parser import SkillParser, SkillParserError

logger = logging.getLogger(__name__)


class SkillManager:
    """
    Manage skill files and database records

    Skills are stored both in the database and as SKILL.md files on disk.
    The database is the source of truth, with files for export/portability.
    """

    # Base directory for skill files
    BASE_DIR = Path(__file__).parent

    # Subdirectories
    GLOBAL_DIR = BASE_DIR / "global"
    AGENTS_DIR = BASE_DIR / "agents"
    TEMPLATES_DIR = BASE_DIR / "templates"

    def __init__(self, db=None, skill_model=None, agent_model=None):
        """
        Initialize the skill manager

        Args:
            db: SQLAlchemy database instance
            skill_model: Skill model class
            agent_model: Agent model class
        """
        self.db = db
        self.Skill = skill_model
        self.Agent = agent_model
        self._ensure_directories()

    def _ensure_directories(self):
        """Create skill directories if they don't exist"""
        self.GLOBAL_DIR.mkdir(parents=True, exist_ok=True)
        self.AGENTS_DIR.mkdir(parents=True, exist_ok=True)
        self.TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

    def create_skill(
        self,
        display_name: str,
        description: str,
        content: str,
        agent_id: Optional[int] = None,
        is_global: bool = False,
        category: Optional[str] = None,
        triggers: Optional[List[str]] = None,
        author: Optional[str] = None,
        save_file: bool = True
    ) -> Any:
        """
        Create a new skill

        Args:
            display_name: Human-readable skill name
            description: What the skill does and when to use it
            content: Full SKILL.md content
            agent_id: ID of agent to assign skill to (None for global)
            is_global: Whether skill is available to all agents
            category: Skill category (productivity, communication, etc.)
            triggers: Keywords that activate this skill
            author: Skill author name
            save_file: Whether to save as SKILL.md file

        Returns:
            Created Skill instance
        """
        # Parse and validate content
        try:
            frontmatter, body = SkillParser.parse(content)
        except SkillParserError as e:
            raise ValueError(f"Invalid skill content: {e}")

        # Extract name from frontmatter
        name = frontmatter['name']

        # Check for duplicate name
        existing = self.Skill.query.filter_by(name=name).first()
        if existing:
            raise ValueError(f"Skill with name '{name}' already exists")

        # Use frontmatter values if not explicitly provided
        if description is None:
            description = frontmatter.get('description', '')
        if triggers is None:
            triggers = frontmatter.get('triggers', [])
        if author is None:
            author = frontmatter.get('author', 'Cleo')

        # Create database record
        skill = self.Skill(
            name=name,
            display_name=display_name,
            description=description,
            content=content,
            agent_id=agent_id if not is_global else None,
            is_global=is_global,
            is_active=True,
            category=category,
            version=frontmatter.get('version', '1.0.0'),
            author=author
        )
        skill.set_triggers(triggers or [])

        self.db.session.add(skill)
        self.db.session.commit()

        # Save to filesystem
        if save_file:
            self._save_skill_file(skill)

        logger.info(f"Created skill: {name}")
        return skill

    def update_skill(
        self,
        skill_id: int,
        display_name: Optional[str] = None,
        description: Optional[str] = None,
        content: Optional[str] = None,
        agent_id: Optional[int] = None,
        is_global: Optional[bool] = None,
        is_active: Optional[bool] = None,
        category: Optional[str] = None,
        triggers: Optional[List[str]] = None
    ) -> Any:
        """
        Update an existing skill

        Args:
            skill_id: ID of skill to update
            (other args): Fields to update (None = no change)

        Returns:
            Updated Skill instance
        """
        skill = self.Skill.query.get(skill_id)
        if not skill:
            raise ValueError(f"Skill not found: {skill_id}")

        # If content changed, re-validate
        if content is not None:
            try:
                frontmatter, body = SkillParser.parse(content)
                skill.name = frontmatter['name']
                skill.content = content
                skill.version = frontmatter.get('version', skill.version)
            except SkillParserError as e:
                raise ValueError(f"Invalid skill content: {e}")

        # Update other fields
        if display_name is not None:
            skill.display_name = display_name
        if description is not None:
            skill.description = description
        if is_global is not None:
            skill.is_global = is_global
            if is_global:
                skill.agent_id = None
        if agent_id is not None and not skill.is_global:
            skill.agent_id = agent_id
        if is_active is not None:
            skill.is_active = is_active
        if category is not None:
            skill.category = category
        if triggers is not None:
            skill.set_triggers(triggers)

        skill.updated_at = datetime.utcnow()
        self.db.session.commit()

        # Update file
        self._save_skill_file(skill)

        logger.info(f"Updated skill: {skill.name}")
        return skill

    def delete_skill(self, skill_id: int) -> bool:
        """
        Delete a skill

        Args:
            skill_id: ID of skill to delete

        Returns:
            True if deleted successfully
        """
        skill = self.Skill.query.get(skill_id)
        if not skill:
            raise ValueError(f"Skill not found: {skill_id}")

        # Delete file
        self._delete_skill_file(skill)

        # Delete from database
        self.db.session.delete(skill)
        self.db.session.commit()

        logger.info(f"Deleted skill: {skill.name}")
        return True

    def get_skill(self, skill_id: int) -> Optional[Any]:
        """Get a skill by ID"""
        return self.Skill.query.get(skill_id)

    def get_skill_by_name(self, name: str) -> Optional[Any]:
        """Get a skill by name"""
        return self.Skill.query.filter_by(name=name).first()

    def get_all_skills(self, active_only: bool = False) -> List[Any]:
        """Get all skills"""
        query = self.Skill.query
        if active_only:
            query = query.filter_by(is_active=True)
        return query.all()

    def get_global_skills(self, active_only: bool = True) -> List[Any]:
        """Get all global skills"""
        query = self.Skill.query.filter_by(is_global=True)
        if active_only:
            query = query.filter_by(is_active=True)
        return query.all()

    def get_skills_for_agent(self, agent_id: int, include_global: bool = True) -> List[Any]:
        """
        Get all skills applicable to an agent

        Args:
            agent_id: Agent ID
            include_global: Whether to include global skills

        Returns:
            List of active skills for the agent
        """
        # Get agent-specific skills
        agent_skills = self.Skill.query.filter_by(
            agent_id=agent_id,
            is_active=True
        ).all()

        # Get global skills if requested
        if include_global:
            global_skills = self.get_global_skills(active_only=True)
            return agent_skills + global_skills

        return agent_skills

    def get_skills_by_category(self, category: str) -> List[Any]:
        """Get skills by category"""
        return self.Skill.query.filter_by(category=category, is_active=True).all()

    def get_skill_summaries(self, agent_id: int) -> str:
        """
        Get skill name/description summaries for system prompt injection

        Args:
            agent_id: Agent ID to get skills for

        Returns:
            Formatted string of skill summaries
        """
        skills = self.get_skills_for_agent(agent_id)
        if not skills:
            return ""

        summaries = ["## Available Skills\n"]
        summaries.append("When a task matches one of these skills, follow its instructions:\n")

        for skill in skills:
            summaries.append(f"- **{skill.name}**: {skill.description}")

        return "\n".join(summaries)

    def detect_relevant_skills(self, message: str, agent_id: int) -> List[Any]:
        """
        Detect which skills are relevant based on message content

        Args:
            message: User message to analyze
            agent_id: Agent ID to get skills for

        Returns:
            List of relevant skills
        """
        skills = self.get_skills_for_agent(agent_id)
        relevant = []
        message_lower = message.lower()

        for skill in skills:
            # Check trigger keywords
            triggers = skill.get_triggers()
            if triggers:
                if any(trigger.lower() in message_lower for trigger in triggers):
                    relevant.append(skill)
                    continue

            # Check skill name match
            if skill.name.replace('-', ' ') in message_lower:
                relevant.append(skill)

        return relevant

    def assign_skill_to_agent(self, skill_id: int, agent_id: int) -> Any:
        """
        Assign a skill to an agent

        Args:
            skill_id: Skill ID
            agent_id: Agent ID

        Returns:
            Updated skill
        """
        skill = self.Skill.query.get(skill_id)
        if not skill:
            raise ValueError(f"Skill not found: {skill_id}")

        if skill.is_global:
            raise ValueError("Cannot assign global skill to specific agent")

        agent = self.Agent.query.get(agent_id)
        if not agent:
            raise ValueError(f"Agent not found: {agent_id}")

        skill.agent_id = agent_id
        self.db.session.commit()

        # Update file location
        self._save_skill_file(skill)

        return skill

    def unassign_skill_from_agent(self, skill_id: int) -> Any:
        """
        Remove agent assignment from a skill

        Args:
            skill_id: Skill ID

        Returns:
            Updated skill
        """
        skill = self.Skill.query.get(skill_id)
        if not skill:
            raise ValueError(f"Skill not found: {skill_id}")

        old_agent_id = skill.agent_id
        skill.agent_id = None
        self.db.session.commit()

        # Delete old file and save new
        if old_agent_id:
            self._delete_skill_file_for_agent(skill.name, old_agent_id)
        self._save_skill_file(skill)

        return skill

    def import_skill_file(self, file_path: str, agent_id: Optional[int] = None) -> Any:
        """
        Import a skill from a SKILL.md file

        Args:
            file_path: Path to SKILL.md file
            agent_id: Agent to assign skill to (None for unassigned)

        Returns:
            Created Skill instance
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        content = path.read_text(encoding='utf-8')

        # Parse to get metadata
        frontmatter, body = SkillParser.parse(content)

        return self.create_skill(
            display_name=frontmatter['name'].replace('-', ' ').title(),
            description=frontmatter['description'],
            content=content,
            agent_id=agent_id,
            is_global=agent_id is None,
            category=frontmatter.get('category'),
            triggers=frontmatter.get('triggers', []),
            author=frontmatter.get('author'),
            save_file=True
        )

    def export_skill(self, skill_id: int) -> str:
        """
        Export a skill to SKILL.md content

        Args:
            skill_id: Skill ID

        Returns:
            SKILL.md content string
        """
        skill = self.Skill.query.get(skill_id)
        if not skill:
            raise ValueError(f"Skill not found: {skill_id}")

        return skill.content

    def _save_skill_file(self, skill: Any):
        """Save skill to SKILL.md file"""
        try:
            if skill.is_global:
                skill_dir = self.GLOBAL_DIR / skill.name
            elif skill.agent_id:
                agent = self.Agent.query.get(skill.agent_id)
                if agent:
                    skill_dir = self.AGENTS_DIR / agent.name.lower() / skill.name
                else:
                    skill_dir = self.GLOBAL_DIR / skill.name
            else:
                skill_dir = self.GLOBAL_DIR / skill.name

            skill_dir.mkdir(parents=True, exist_ok=True)
            skill_file = skill_dir / "SKILL.md"
            skill_file.write_text(skill.content, encoding='utf-8')
            logger.debug(f"Saved skill file: {skill_file}")
        except Exception as e:
            logger.warning(f"Failed to save skill file: {e}")

    def _delete_skill_file(self, skill: Any):
        """Delete skill file from filesystem"""
        try:
            if skill.is_global:
                skill_dir = self.GLOBAL_DIR / skill.name
            elif skill.agent_id:
                agent = self.Agent.query.get(skill.agent_id)
                if agent:
                    skill_dir = self.AGENTS_DIR / agent.name.lower() / skill.name
                else:
                    skill_dir = self.GLOBAL_DIR / skill.name
            else:
                skill_dir = self.GLOBAL_DIR / skill.name

            skill_file = skill_dir / "SKILL.md"
            if skill_file.exists():
                skill_file.unlink()
            if skill_dir.exists() and not any(skill_dir.iterdir()):
                skill_dir.rmdir()
            logger.debug(f"Deleted skill file: {skill_file}")
        except Exception as e:
            logger.warning(f"Failed to delete skill file: {e}")

    def _delete_skill_file_for_agent(self, skill_name: str, agent_id: int):
        """Delete skill file for a specific agent"""
        try:
            agent = self.Agent.query.get(agent_id)
            if agent:
                skill_dir = self.AGENTS_DIR / agent.name.lower() / skill_name
                skill_file = skill_dir / "SKILL.md"
                if skill_file.exists():
                    skill_file.unlink()
                if skill_dir.exists() and not any(skill_dir.iterdir()):
                    skill_dir.rmdir()
        except Exception as e:
            logger.warning(f"Failed to delete agent skill file: {e}")

    def get_categories(self) -> List[str]:
        """Get list of all skill categories"""
        return [
            "productivity",
            "communication",
            "analysis",
            "coordination",
            "planning",
            "research",
            "writing",
            "finance",
            "legal",
            "marketing",
            "technical",
            "other"
        ]

    def create_from_template(
        self,
        category: str,
        display_name: str,
        agent_id: Optional[int] = None
    ) -> Any:
        """
        Create a skill from a category template

        Args:
            category: Template category
            display_name: Human-readable name for the skill
            agent_id: Agent to assign skill to

        Returns:
            Created Skill instance
        """
        template_content = SkillParser.get_template(category)

        # Customize the template with the new name
        name = SkillParser.normalize_name(display_name)
        frontmatter, body = SkillParser.parse(template_content)

        # Generate new content with custom name
        new_content = SkillParser.generate(
            name=name,
            description=frontmatter['description'],
            body=body,
            version="1.0.0",
            author="Cleo",
            tags=frontmatter.get('tags', []),
            triggers=frontmatter.get('triggers', [])
        )

        return self.create_skill(
            display_name=display_name,
            description=frontmatter['description'],
            content=new_content,
            agent_id=agent_id,
            is_global=agent_id is None,
            category=category,
            triggers=frontmatter.get('triggers', [])
        )


# Singleton instance (initialized in app.py)
_skill_manager: Optional[SkillManager] = None


def get_skill_manager() -> SkillManager:
    """Get the skill manager instance"""
    global _skill_manager
    if _skill_manager is None:
        raise RuntimeError("SkillManager not initialized. Call init_skill_manager() first.")
    return _skill_manager


def init_skill_manager(db, skill_model, agent_model) -> SkillManager:
    """Initialize the skill manager singleton"""
    global _skill_manager
    _skill_manager = SkillManager(db, skill_model, agent_model)
    return _skill_manager
