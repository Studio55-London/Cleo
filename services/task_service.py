"""
Task Service - Business logic for task management
Ported from AscendoreQ integration
Phase 2: Added subtask and recurrence support
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import func
from models import db, Task, Space
import json


class TaskService:
    """Service class for task management operations"""

    @staticmethod
    def create_task(
        space_id: int,
        title: str,
        description: Optional[str] = None,
        priority: str = 'medium',
        due_date: Optional[datetime] = None,
        parent_task_id: Optional[int] = None,
        recurrence_type: Optional[str] = None,
        recurrence_interval: int = 1,
        recurrence_days: Optional[List[int]] = None,
        recurrence_end_date: Optional[datetime] = None
    ) -> Task:
        """
        Create a new task in a space.

        Args:
            space_id: ID of the space to add task to
            title: Task title
            description: Optional task description
            priority: Task priority (low, medium, high)
            due_date: Optional due date
            parent_task_id: Optional parent task ID for subtasks
            recurrence_type: Optional recurrence type (daily, weekly, monthly)
            recurrence_interval: Interval for recurrence (default 1)
            recurrence_days: Days of week for weekly recurrence (0=Mon, 6=Sun)
            recurrence_end_date: Optional end date for recurrence

        Returns:
            Created Task object

        Raises:
            ValueError: If space doesn't exist or invalid priority
        """
        # Validate space exists
        space = Space.query.get(space_id)
        if not space:
            raise ValueError(f"Space with id {space_id} not found")

        # Validate priority
        valid_priorities = ['low', 'medium', 'high']
        if priority not in valid_priorities:
            raise ValueError(f"Invalid priority. Must be one of: {valid_priorities}")

        # Validate recurrence type
        valid_recurrence = [None, 'daily', 'weekly', 'monthly']
        if recurrence_type not in valid_recurrence:
            raise ValueError(f"Invalid recurrence type. Must be one of: {valid_recurrence}")

        # Validate parent task if provided
        if parent_task_id:
            parent_task = Task.query.get(parent_task_id)
            if not parent_task:
                raise ValueError(f"Parent task with id {parent_task_id} not found")
            if parent_task.space_id != space_id:
                raise ValueError("Parent task must be in the same space")

        # Get position for subtask
        position = 0
        if parent_task_id:
            max_pos = db.session.query(func.max(Task.position)).filter(
                Task.parent_task_id == parent_task_id
            ).scalar()
            position = (max_pos or 0) + 1

        task = Task(
            space_id=space_id,
            title=title,
            description=description,
            priority=priority,
            due_date=due_date,
            status='todo',
            parent_task_id=parent_task_id,
            position=position,
            recurrence_type=recurrence_type,
            recurrence_interval=recurrence_interval,
            recurrence_end_date=recurrence_end_date
        )

        # Set recurrence days if provided
        if recurrence_days:
            task.set_recurrence_days(recurrence_days)

        # Calculate next occurrence for recurring tasks
        if recurrence_type and due_date:
            task.next_occurrence = TaskService._calculate_next_occurrence(
                due_date, recurrence_type, recurrence_interval, recurrence_days
            )

        db.session.add(task)
        db.session.commit()

        return task

    @staticmethod
    def get_task(task_id: int) -> Optional[Task]:
        """
        Get a task by ID.

        Args:
            task_id: Task ID

        Returns:
            Task object or None if not found
        """
        return Task.query.get(task_id)

    @staticmethod
    def list_tasks(
        space_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        priority_filter: Optional[str] = None,
        parent_task_id: Optional[int] = None,
        include_subtasks: bool = False,
        top_level_only: bool = True,
        limit: int = 100
    ) -> List[Task]:
        """
        List tasks with optional filters.

        Args:
            space_id: Filter by space ID
            status_filter: Filter by status (todo, in_progress, completed)
            priority_filter: Filter by priority (low, medium, high)
            parent_task_id: Filter by parent task ID (for getting subtasks)
            include_subtasks: Whether to include subtask data in results
            top_level_only: Only return tasks without parents (default True)
            limit: Maximum number of tasks to return

        Returns:
            List of Task objects
        """
        query = Task.query

        if space_id is not None:
            query = query.filter(Task.space_id == space_id)

        if status_filter:
            query = query.filter(Task.status == status_filter)

        if priority_filter:
            query = query.filter(Task.priority == priority_filter)

        # Filter for subtasks of specific parent
        if parent_task_id is not None:
            query = query.filter(Task.parent_task_id == parent_task_id)
        elif top_level_only:
            # Only get top-level tasks (no parent)
            query = query.filter(Task.parent_task_id == None)

        # Order by priority (high first), then by due date, then by created date
        priority_order = func.case(
            (Task.priority == 'high', 1),
            (Task.priority == 'medium', 2),
            (Task.priority == 'low', 3),
            else_=4
        )

        query = query.order_by(
            priority_order,
            Task.due_date.asc().nullslast(),
            Task.created_at.desc()
        )

        return query.limit(limit).all()

    @staticmethod
    def update_task(task_id: int, updates: Dict[str, Any]) -> Optional[Task]:
        """
        Update a task.

        Args:
            task_id: Task ID
            updates: Dictionary of fields to update

        Returns:
            Updated Task object or None if not found

        Raises:
            ValueError: If invalid field values provided
        """
        task = Task.query.get(task_id)
        if not task:
            return None

        # Validate priority if being updated
        if 'priority' in updates:
            valid_priorities = ['low', 'medium', 'high']
            if updates['priority'] not in valid_priorities:
                raise ValueError(f"Invalid priority. Must be one of: {valid_priorities}")

        # Validate status if being updated
        if 'status' in updates:
            valid_statuses = ['todo', 'in_progress', 'completed']
            if updates['status'] not in valid_statuses:
                raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")

            # Auto-set completed_at when marking as completed
            if updates['status'] == 'completed' and task.status != 'completed':
                task.completed_at = datetime.utcnow()
            elif updates['status'] != 'completed':
                task.completed_at = None

        # Apply updates
        allowed_fields = ['title', 'description', 'priority', 'status', 'due_date']
        for field, value in updates.items():
            if field in allowed_fields:
                setattr(task, field, value)

        task.updated_at = datetime.utcnow()
        db.session.commit()

        return task

    @staticmethod
    def delete_task(task_id: int) -> bool:
        """
        Delete a task.

        Args:
            task_id: Task ID

        Returns:
            True if deleted, False if not found
        """
        task = Task.query.get(task_id)
        if not task:
            return False

        db.session.delete(task)
        db.session.commit()

        return True

    @staticmethod
    def complete_task(task_id: int) -> Optional[Task]:
        """
        Mark a task as completed.

        Args:
            task_id: Task ID

        Returns:
            Updated Task object or None if not found
        """
        return TaskService.update_task(task_id, {'status': 'completed'})

    @staticmethod
    def get_task_stats(space_id: Optional[int] = None) -> Dict[str, int]:
        """
        Get task statistics.

        Args:
            space_id: Optional space ID to filter by

        Returns:
            Dictionary with counts by status
        """
        query = db.session.query(
            Task.status,
            func.count(Task.id).label('count')
        )

        if space_id is not None:
            query = query.filter(Task.space_id == space_id)

        query = query.group_by(Task.status)

        results = query.all()

        stats = {
            'todo': 0,
            'in_progress': 0,
            'completed': 0,
            'total': 0
        }

        for status, count in results:
            if status in stats:
                stats[status] = count
                stats['total'] += count

        return stats

    @staticmethod
    def get_overdue_tasks(space_id: Optional[int] = None) -> List[Task]:
        """
        Get tasks that are past their due date and not completed.

        Args:
            space_id: Optional space ID to filter by

        Returns:
            List of overdue Task objects
        """
        query = Task.query.filter(
            Task.due_date < datetime.utcnow(),
            Task.status != 'completed'
        )

        if space_id is not None:
            query = query.filter(Task.space_id == space_id)

        return query.order_by(Task.due_date.asc()).all()

    # ===================================
    # Phase 2: Subtask Methods
    # ===================================

    @staticmethod
    def create_subtask(
        parent_task_id: int,
        title: str,
        description: Optional[str] = None,
        priority: str = 'medium',
        due_date: Optional[datetime] = None
    ) -> Task:
        """
        Create a subtask under a parent task.

        Args:
            parent_task_id: ID of the parent task
            title: Subtask title
            description: Optional description
            priority: Priority level
            due_date: Optional due date

        Returns:
            Created subtask

        Raises:
            ValueError: If parent task not found
        """
        parent = Task.query.get(parent_task_id)
        if not parent:
            raise ValueError(f"Parent task with id {parent_task_id} not found")

        return TaskService.create_task(
            space_id=parent.space_id,
            title=title,
            description=description,
            priority=priority,
            due_date=due_date,
            parent_task_id=parent_task_id
        )

    @staticmethod
    def get_subtasks(parent_task_id: int) -> List[Task]:
        """
        Get all subtasks of a parent task.

        Args:
            parent_task_id: Parent task ID

        Returns:
            List of subtasks ordered by position
        """
        return Task.query.filter(
            Task.parent_task_id == parent_task_id
        ).order_by(Task.position).all()

    @staticmethod
    def reorder_subtasks(parent_task_id: int, subtask_ids: List[int]) -> bool:
        """
        Reorder subtasks within a parent task.

        Args:
            parent_task_id: Parent task ID
            subtask_ids: List of subtask IDs in new order

        Returns:
            True if successful
        """
        subtasks = Task.query.filter(
            Task.parent_task_id == parent_task_id
        ).all()

        subtask_map = {s.id: s for s in subtasks}

        for position, subtask_id in enumerate(subtask_ids):
            if subtask_id in subtask_map:
                subtask_map[subtask_id].position = position

        db.session.commit()
        return True

    @staticmethod
    def get_task_with_subtasks(task_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a task with all its subtasks included.

        Args:
            task_id: Task ID

        Returns:
            Task dict with subtasks or None
        """
        task = Task.query.get(task_id)
        if not task:
            return None

        return task.to_dict(include_subtasks=True)

    # ===================================
    # Phase 2: Recurrence Methods
    # ===================================

    @staticmethod
    def _calculate_next_occurrence(
        current_date: datetime,
        recurrence_type: str,
        interval: int = 1,
        recurrence_days: Optional[List[int]] = None
    ) -> datetime:
        """
        Calculate the next occurrence date for a recurring task.

        Args:
            current_date: Current/starting date
            recurrence_type: Type of recurrence (daily, weekly, monthly)
            interval: Interval between occurrences
            recurrence_days: Days of week for weekly recurrence

        Returns:
            Next occurrence datetime
        """
        if recurrence_type == 'daily':
            return current_date + timedelta(days=interval)

        elif recurrence_type == 'weekly':
            if recurrence_days:
                # Find next matching day of week
                current_dow = current_date.weekday()
                days_ahead = None

                for day in sorted(recurrence_days):
                    if day > current_dow:
                        days_ahead = day - current_dow
                        break

                if days_ahead is None:
                    # Next week
                    days_ahead = 7 - current_dow + min(recurrence_days)

                return current_date + timedelta(days=days_ahead)
            else:
                return current_date + timedelta(weeks=interval)

        elif recurrence_type == 'monthly':
            # Add months
            month = current_date.month + interval
            year = current_date.year + (month - 1) // 12
            month = ((month - 1) % 12) + 1
            day = min(current_date.day, 28)  # Safe day for all months
            return datetime(year, month, day, current_date.hour, current_date.minute)

        return current_date + timedelta(days=1)

    @staticmethod
    def complete_recurring_task(task_id: int) -> Optional[Task]:
        """
        Complete a recurring task and create the next instance.

        Args:
            task_id: Task ID

        Returns:
            The newly created next occurrence, or None
        """
        task = Task.query.get(task_id)
        if not task:
            return None

        # Mark current as completed
        task.status = 'completed'
        task.completed_at = datetime.utcnow()

        # Check if this is a recurring task that should continue
        if not task.recurrence_type or task.is_recurring_instance:
            db.session.commit()
            return None

        # Check if we've passed the end date
        if task.recurrence_end_date and datetime.utcnow() > task.recurrence_end_date:
            db.session.commit()
            return None

        # Calculate next due date
        base_date = task.due_date or datetime.utcnow()
        next_due = TaskService._calculate_next_occurrence(
            base_date,
            task.recurrence_type,
            task.recurrence_interval,
            task.get_recurrence_days()
        )

        # Check if next occurrence is past end date
        if task.recurrence_end_date and next_due > task.recurrence_end_date:
            db.session.commit()
            return None

        # Create next occurrence
        next_task = Task(
            space_id=task.space_id,
            title=task.title,
            description=task.description,
            priority=task.priority,
            due_date=next_due,
            status='todo',
            recurrence_type=task.recurrence_type,
            recurrence_interval=task.recurrence_interval,
            recurrence_days=task.recurrence_days,
            recurrence_end_date=task.recurrence_end_date,
            original_task_id=task.original_task_id or task.id,
            is_recurring_instance=True
        )

        # Calculate next occurrence for the new task
        next_task.next_occurrence = TaskService._calculate_next_occurrence(
            next_due,
            task.recurrence_type,
            task.recurrence_interval,
            task.get_recurrence_days()
        )

        db.session.add(next_task)
        db.session.commit()

        return next_task

    @staticmethod
    def get_recurring_tasks(space_id: Optional[int] = None) -> List[Task]:
        """
        Get all recurring tasks (template tasks, not instances).

        Args:
            space_id: Optional space ID filter

        Returns:
            List of recurring Task objects
        """
        query = Task.query.filter(
            Task.recurrence_type != None,
            Task.is_recurring_instance == False
        )

        if space_id is not None:
            query = query.filter(Task.space_id == space_id)

        return query.order_by(Task.created_at.desc()).all()

    @staticmethod
    def update_recurrence(
        task_id: int,
        recurrence_type: Optional[str] = None,
        recurrence_interval: Optional[int] = None,
        recurrence_days: Optional[List[int]] = None,
        recurrence_end_date: Optional[datetime] = None
    ) -> Optional[Task]:
        """
        Update recurrence settings for a task.

        Args:
            task_id: Task ID
            recurrence_type: New recurrence type (or None to remove)
            recurrence_interval: New interval
            recurrence_days: New days for weekly recurrence
            recurrence_end_date: New end date

        Returns:
            Updated Task or None
        """
        task = Task.query.get(task_id)
        if not task:
            return None

        # Validate recurrence type
        valid_recurrence = [None, 'daily', 'weekly', 'monthly']
        if recurrence_type not in valid_recurrence:
            raise ValueError(f"Invalid recurrence type. Must be one of: {valid_recurrence}")

        task.recurrence_type = recurrence_type

        if recurrence_interval is not None:
            task.recurrence_interval = recurrence_interval

        if recurrence_days is not None:
            task.set_recurrence_days(recurrence_days)

        task.recurrence_end_date = recurrence_end_date

        # Recalculate next occurrence
        if recurrence_type and task.due_date:
            task.next_occurrence = TaskService._calculate_next_occurrence(
                task.due_date,
                recurrence_type,
                task.recurrence_interval,
                task.get_recurrence_days()
            )
        else:
            task.next_occurrence = None

        task.updated_at = datetime.utcnow()
        db.session.commit()

        return task
