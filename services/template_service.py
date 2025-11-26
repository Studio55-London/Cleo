"""
Task Template Service - Business logic for task template management
Phase 6: Task Templates
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import func
from models import db, TaskTemplate, Task, Space
import json


class TaskTemplateService:
    """Service class for task template management operations"""

    @staticmethod
    def create_template(
        name: str,
        title_template: str,
        description: Optional[str] = None,
        description_template: Optional[str] = None,
        default_priority: str = 'medium',
        default_due_offset_days: Optional[int] = None,
        default_recurrence_type: Optional[str] = None,
        default_recurrence_interval: int = 1,
        default_recurrence_days: Optional[List[int]] = None,
        subtask_templates: Optional[List[Dict]] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        icon: Optional[str] = None,
        color: Optional[str] = None,
        space_id: Optional[int] = None,
        is_global: bool = False,
        created_by: Optional[int] = None
    ) -> TaskTemplate:
        """
        Create a new task template.

        Args:
            name: Template name
            title_template: Template for task title (can include {placeholders})
            description: Template description (what this template is for)
            description_template: Template for task description
            default_priority: Default priority for tasks created from template
            default_due_offset_days: Days from creation to due date
            default_recurrence_type: Default recurrence type
            default_recurrence_interval: Default recurrence interval
            default_recurrence_days: Default days for weekly recurrence
            subtask_templates: List of subtask template dicts
            category: Template category
            tags: List of tags
            icon: Icon identifier
            color: Hex color code
            space_id: Space-specific template
            is_global: Available to all users/spaces
            created_by: User ID who created the template

        Returns:
            Created TaskTemplate object
        """
        # Validate priority
        valid_priorities = ['low', 'medium', 'high']
        if default_priority not in valid_priorities:
            raise ValueError(f"Invalid priority. Must be one of: {valid_priorities}")

        # Validate recurrence type
        valid_recurrence = [None, 'daily', 'weekly', 'monthly']
        if default_recurrence_type not in valid_recurrence:
            raise ValueError(f"Invalid recurrence type. Must be one of: {valid_recurrence}")

        # Validate space if provided
        if space_id:
            space = Space.query.get(space_id)
            if not space:
                raise ValueError(f"Space with id {space_id} not found")

        template = TaskTemplate(
            name=name,
            description=description,
            title_template=title_template,
            description_template=description_template,
            default_priority=default_priority,
            default_due_offset_days=default_due_offset_days,
            default_recurrence_type=default_recurrence_type,
            default_recurrence_interval=default_recurrence_interval,
            category=category,
            icon=icon,
            color=color,
            space_id=space_id,
            is_global=is_global,
            created_by=created_by
        )

        if default_recurrence_days:
            template.set_recurrence_days(default_recurrence_days)

        if subtask_templates:
            template.set_subtask_templates(subtask_templates)

        if tags:
            template.set_tags(tags)

        db.session.add(template)
        db.session.commit()

        return template

    @staticmethod
    def get_template(template_id: int) -> Optional[TaskTemplate]:
        """Get a template by ID."""
        return TaskTemplate.query.get(template_id)

    @staticmethod
    def list_templates(
        space_id: Optional[int] = None,
        category: Optional[str] = None,
        include_global: bool = True,
        active_only: bool = True,
        limit: int = 100
    ) -> List[TaskTemplate]:
        """
        List templates with optional filters.

        Args:
            space_id: Filter by space (also includes global templates if include_global)
            category: Filter by category
            include_global: Include global templates in results
            active_only: Only return active templates
            limit: Maximum templates to return

        Returns:
            List of TaskTemplate objects
        """
        query = TaskTemplate.query

        if active_only:
            query = query.filter(TaskTemplate.is_active == True)

        if space_id is not None:
            if include_global:
                query = query.filter(
                    db.or_(
                        TaskTemplate.space_id == space_id,
                        TaskTemplate.is_global == True
                    )
                )
            else:
                query = query.filter(TaskTemplate.space_id == space_id)
        elif include_global:
            query = query.filter(TaskTemplate.is_global == True)

        if category:
            query = query.filter(TaskTemplate.category == category)

        # Order by usage count (most used first), then by name
        query = query.order_by(TaskTemplate.use_count.desc(), TaskTemplate.name.asc())

        return query.limit(limit).all()

    @staticmethod
    def update_template(template_id: int, updates: Dict[str, Any]) -> Optional[TaskTemplate]:
        """
        Update a task template.

        Args:
            template_id: Template ID
            updates: Dictionary of fields to update

        Returns:
            Updated TaskTemplate or None if not found
        """
        template = TaskTemplate.query.get(template_id)
        if not template:
            return None

        # Validate priority if being updated
        if 'default_priority' in updates:
            valid_priorities = ['low', 'medium', 'high']
            if updates['default_priority'] not in valid_priorities:
                raise ValueError(f"Invalid priority. Must be one of: {valid_priorities}")

        # Validate recurrence type if being updated
        if 'default_recurrence_type' in updates:
            valid_recurrence = [None, 'daily', 'weekly', 'monthly']
            if updates['default_recurrence_type'] not in valid_recurrence:
                raise ValueError(f"Invalid recurrence type. Must be one of: {valid_recurrence}")

        # Apply updates
        allowed_fields = [
            'name', 'description', 'title_template', 'description_template',
            'default_priority', 'default_due_offset_days', 'default_recurrence_type',
            'default_recurrence_interval', 'category', 'icon', 'color',
            'space_id', 'is_global', 'is_active'
        ]

        for field, value in updates.items():
            if field in allowed_fields:
                setattr(template, field, value)
            elif field == 'default_recurrence_days' and value is not None:
                template.set_recurrence_days(value)
            elif field == 'subtask_templates' and value is not None:
                template.set_subtask_templates(value)
            elif field == 'tags' and value is not None:
                template.set_tags(value)

        template.updated_at = datetime.utcnow()
        db.session.commit()

        return template

    @staticmethod
    def delete_template(template_id: int) -> bool:
        """Delete a template permanently."""
        template = TaskTemplate.query.get(template_id)
        if not template:
            return False

        db.session.delete(template)
        db.session.commit()
        return True

    @staticmethod
    def deactivate_template(template_id: int) -> Optional[TaskTemplate]:
        """Deactivate a template instead of deleting."""
        return TaskTemplateService.update_template(template_id, {'is_active': False})

    @staticmethod
    def apply_template(
        template_id: int,
        space_id: int,
        title_vars: Optional[Dict[str, str]] = None,
        description_vars: Optional[Dict[str, str]] = None,
        due_date: Optional[datetime] = None,
        create_subtasks: bool = True
    ) -> Task:
        """
        Create a task from a template.

        Args:
            template_id: Template ID to use
            space_id: Space to create task in
            title_vars: Variables to substitute in title template
            description_vars: Variables to substitute in description template
            due_date: Override due date (if None, uses offset from template)
            create_subtasks: Whether to create subtasks from template

        Returns:
            Created Task object
        """
        from services.task_service import TaskService

        template = TaskTemplate.query.get(template_id)
        if not template:
            raise ValueError(f"Template with id {template_id} not found")

        # Process title template
        title = template.title_template
        if title_vars:
            for key, value in title_vars.items():
                title = title.replace(f'{{{key}}}', value)

        # Process description template
        description = template.description_template
        if description and description_vars:
            for key, value in description_vars.items():
                description = description.replace(f'{{{key}}}', value)

        # Calculate due date
        if due_date is None and template.default_due_offset_days:
            due_date = datetime.utcnow() + timedelta(days=template.default_due_offset_days)

        # Create the main task
        task = TaskService.create_task(
            space_id=space_id,
            title=title,
            description=description,
            priority=template.default_priority,
            due_date=due_date,
            recurrence_type=template.default_recurrence_type,
            recurrence_interval=template.default_recurrence_interval,
            recurrence_days=template.get_recurrence_days() if template.default_recurrence_type == 'weekly' else None
        )

        # Create subtasks from template
        if create_subtasks:
            subtask_templates = template.get_subtask_templates()
            for i, subtask_data in enumerate(subtask_templates):
                subtask_title = subtask_data.get('title', f'Subtask {i+1}')
                if title_vars:
                    for key, value in title_vars.items():
                        subtask_title = subtask_title.replace(f'{{{key}}}', value)

                TaskService.create_subtask(
                    parent_task_id=task.id,
                    title=subtask_title,
                    description=subtask_data.get('description'),
                    priority=subtask_data.get('priority', template.default_priority)
                )

        # Increment usage count
        template.increment_usage()
        db.session.commit()

        return task

    @staticmethod
    def get_template_categories() -> List[str]:
        """Get all unique template categories."""
        categories = db.session.query(TaskTemplate.category).filter(
            TaskTemplate.category != None,
            TaskTemplate.is_active == True
        ).distinct().all()

        return sorted([c[0] for c in categories if c[0]])

    @staticmethod
    def get_popular_templates(limit: int = 10) -> List[TaskTemplate]:
        """Get most frequently used templates."""
        return TaskTemplate.query.filter(
            TaskTemplate.is_active == True,
            TaskTemplate.use_count > 0
        ).order_by(TaskTemplate.use_count.desc()).limit(limit).all()

    @staticmethod
    def get_recent_templates(limit: int = 10) -> List[TaskTemplate]:
        """Get recently used templates."""
        return TaskTemplate.query.filter(
            TaskTemplate.is_active == True,
            TaskTemplate.last_used_at != None
        ).order_by(TaskTemplate.last_used_at.desc()).limit(limit).all()

    @staticmethod
    def search_templates(query: str, space_id: Optional[int] = None) -> List[TaskTemplate]:
        """Search templates by name, description, or tags."""
        search = f"%{query}%"

        base_query = TaskTemplate.query.filter(
            TaskTemplate.is_active == True,
            db.or_(
                TaskTemplate.name.ilike(search),
                TaskTemplate.description.ilike(search),
                TaskTemplate.category.ilike(search),
                TaskTemplate.tags.ilike(search)
            )
        )

        if space_id:
            base_query = base_query.filter(
                db.or_(
                    TaskTemplate.space_id == space_id,
                    TaskTemplate.is_global == True
                )
            )

        return base_query.order_by(TaskTemplate.use_count.desc()).limit(20).all()

    @staticmethod
    def duplicate_template(template_id: int, new_name: Optional[str] = None) -> TaskTemplate:
        """Create a copy of an existing template."""
        original = TaskTemplate.query.get(template_id)
        if not original:
            raise ValueError(f"Template with id {template_id} not found")

        return TaskTemplateService.create_template(
            name=new_name or f"{original.name} (Copy)",
            title_template=original.title_template,
            description=original.description,
            description_template=original.description_template,
            default_priority=original.default_priority,
            default_due_offset_days=original.default_due_offset_days,
            default_recurrence_type=original.default_recurrence_type,
            default_recurrence_interval=original.default_recurrence_interval,
            default_recurrence_days=original.get_recurrence_days(),
            subtask_templates=original.get_subtask_templates(),
            category=original.category,
            tags=original.get_tags(),
            icon=original.icon,
            color=original.color,
            space_id=original.space_id,
            is_global=False  # Copies are not global by default
        )

    @staticmethod
    def seed_default_templates() -> List[TaskTemplate]:
        """Seed some common task templates."""
        defaults = [
            {
                'name': 'Daily Standup',
                'title_template': 'Daily Standup - {date}',
                'description': 'Daily team standup meeting template',
                'description_template': 'Standup meeting for {date}',
                'default_priority': 'medium',
                'default_recurrence_type': 'daily',
                'category': 'meetings',
                'icon': 'users',
                'color': '#3B82F6',
                'is_global': True,
                'subtask_templates': [
                    {'title': 'Review yesterday\'s progress', 'priority': 'medium'},
                    {'title': 'Share today\'s goals', 'priority': 'medium'},
                    {'title': 'Discuss blockers', 'priority': 'high'}
                ]
            },
            {
                'name': 'Weekly Review',
                'title_template': 'Weekly Review - Week of {date}',
                'description': 'End of week review template',
                'description_template': 'Review accomplishments and plan for next week',
                'default_priority': 'high',
                'default_recurrence_type': 'weekly',
                'default_recurrence_days': [4],  # Friday
                'category': 'planning',
                'icon': 'calendar-check',
                'color': '#10B981',
                'is_global': True,
                'subtask_templates': [
                    {'title': 'Review completed tasks', 'priority': 'medium'},
                    {'title': 'Update project status', 'priority': 'high'},
                    {'title': 'Plan next week\'s priorities', 'priority': 'high'},
                    {'title': 'Send weekly update', 'priority': 'medium'}
                ]
            },
            {
                'name': 'Bug Fix',
                'title_template': 'Fix: {issue}',
                'description': 'Bug fix task template',
                'description_template': 'Bug: {issue}\n\nSteps to reproduce:\n{steps}\n\nExpected behavior:\n{expected}',
                'default_priority': 'high',
                'category': 'development',
                'icon': 'bug',
                'color': '#EF4444',
                'is_global': True,
                'subtask_templates': [
                    {'title': 'Reproduce the bug', 'priority': 'high'},
                    {'title': 'Identify root cause', 'priority': 'high'},
                    {'title': 'Implement fix', 'priority': 'high'},
                    {'title': 'Write tests', 'priority': 'medium'},
                    {'title': 'Code review', 'priority': 'medium'}
                ]
            },
            {
                'name': 'Feature Request',
                'title_template': 'Feature: {feature_name}',
                'description': 'New feature implementation template',
                'default_priority': 'medium',
                'default_due_offset_days': 14,
                'category': 'development',
                'icon': 'sparkles',
                'color': '#8B5CF6',
                'is_global': True,
                'subtask_templates': [
                    {'title': 'Write requirements', 'priority': 'high'},
                    {'title': 'Design solution', 'priority': 'high'},
                    {'title': 'Implement feature', 'priority': 'high'},
                    {'title': 'Write tests', 'priority': 'medium'},
                    {'title': 'Update documentation', 'priority': 'low'},
                    {'title': 'Code review', 'priority': 'medium'}
                ]
            }
        ]

        created = []
        for template_data in defaults:
            # Check if template already exists
            existing = TaskTemplate.query.filter_by(name=template_data['name']).first()
            if not existing:
                template = TaskTemplateService.create_template(**template_data)
                created.append(template)

        return created
