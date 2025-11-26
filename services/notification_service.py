"""
Notification Service - Business logic for notification management
Phase 5: Notifications & Reminders
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import func, and_, or_
from models import db, Notification, Task, Space
import json


class NotificationService:
    """Service class for notification management operations"""

    @staticmethod
    def create_notification(
        title: str,
        notification_type: str,
        message: Optional[str] = None,
        user_id: Optional[int] = None,
        task_id: Optional[int] = None,
        space_id: Optional[int] = None,
        priority: str = 'normal',
        action_url: Optional[str] = None,
        action_data: Optional[Dict] = None,
        scheduled_for: Optional[datetime] = None
    ) -> Notification:
        """
        Create a new notification.

        Args:
            title: Notification title
            notification_type: Type (task_due, task_overdue, reminder, system, mention)
            message: Optional detailed message
            user_id: Optional user ID to notify
            task_id: Optional linked task ID
            space_id: Optional space ID
            priority: Priority level (low, normal, high, urgent)
            action_url: URL to navigate to when clicked
            action_data: Additional action data
            scheduled_for: When to show the notification

        Returns:
            Created Notification object
        """
        # Validate notification type
        valid_types = ['task_due', 'task_overdue', 'reminder', 'system', 'mention', 'calendar']
        if notification_type not in valid_types:
            raise ValueError(f"Invalid notification type. Must be one of: {valid_types}")

        # Validate priority
        valid_priorities = ['low', 'normal', 'high', 'urgent']
        if priority not in valid_priorities:
            raise ValueError(f"Invalid priority. Must be one of: {valid_priorities}")

        notification = Notification(
            title=title,
            message=message,
            notification_type=notification_type,
            user_id=user_id,
            task_id=task_id,
            space_id=space_id,
            priority=priority,
            action_url=action_url,
            scheduled_for=scheduled_for
        )

        if action_data:
            notification.set_action_data(action_data)

        db.session.add(notification)
        db.session.commit()

        return notification

    @staticmethod
    def get_notification(notification_id: int) -> Optional[Notification]:
        """Get a notification by ID."""
        return Notification.query.get(notification_id)

    @staticmethod
    def list_notifications(
        user_id: Optional[int] = None,
        space_id: Optional[int] = None,
        notification_type: Optional[str] = None,
        unread_only: bool = False,
        include_dismissed: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        """
        List notifications with optional filters.

        Args:
            user_id: Filter by user
            space_id: Filter by space
            notification_type: Filter by type
            unread_only: Only return unread notifications
            include_dismissed: Include dismissed notifications
            limit: Maximum notifications to return

        Returns:
            List of Notification objects
        """
        query = Notification.query

        if user_id is not None:
            query = query.filter(
                or_(Notification.user_id == user_id, Notification.user_id == None)
            )

        if space_id is not None:
            query = query.filter(Notification.space_id == space_id)

        if notification_type:
            query = query.filter(Notification.notification_type == notification_type)

        if unread_only:
            query = query.filter(Notification.is_read == False)

        if not include_dismissed:
            query = query.filter(Notification.is_dismissed == False)

        # Order by priority and creation time
        priority_order = func.case(
            (Notification.priority == 'urgent', 1),
            (Notification.priority == 'high', 2),
            (Notification.priority == 'normal', 3),
            (Notification.priority == 'low', 4),
            else_=5
        )

        query = query.order_by(priority_order, Notification.created_at.desc())

        return query.limit(limit).all()

    @staticmethod
    def mark_as_read(notification_id: int) -> Optional[Notification]:
        """Mark a notification as read."""
        notification = Notification.query.get(notification_id)
        if not notification:
            return None

        notification.mark_read()
        db.session.commit()
        return notification

    @staticmethod
    def mark_all_as_read(user_id: Optional[int] = None) -> int:
        """
        Mark all notifications as read.

        Args:
            user_id: Optional user filter

        Returns:
            Number of notifications marked as read
        """
        query = Notification.query.filter(Notification.is_read == False)

        if user_id:
            query = query.filter(
                or_(Notification.user_id == user_id, Notification.user_id == None)
            )

        notifications = query.all()
        for n in notifications:
            n.mark_read()

        db.session.commit()
        return len(notifications)

    @staticmethod
    def dismiss(notification_id: int) -> Optional[Notification]:
        """Dismiss a notification."""
        notification = Notification.query.get(notification_id)
        if not notification:
            return None

        notification.mark_dismissed()
        db.session.commit()
        return notification

    @staticmethod
    def dismiss_all(user_id: Optional[int] = None) -> int:
        """Dismiss all notifications for a user."""
        query = Notification.query.filter(Notification.is_dismissed == False)

        if user_id:
            query = query.filter(
                or_(Notification.user_id == user_id, Notification.user_id == None)
            )

        notifications = query.all()
        for n in notifications:
            n.mark_dismissed()

        db.session.commit()
        return len(notifications)

    @staticmethod
    def delete_notification(notification_id: int) -> bool:
        """Delete a notification permanently."""
        notification = Notification.query.get(notification_id)
        if not notification:
            return False

        db.session.delete(notification)
        db.session.commit()
        return True

    @staticmethod
    def get_unread_count(user_id: Optional[int] = None) -> int:
        """Get count of unread notifications."""
        query = Notification.query.filter(
            Notification.is_read == False,
            Notification.is_dismissed == False
        )

        if user_id:
            query = query.filter(
                or_(Notification.user_id == user_id, Notification.user_id == None)
            )

        return query.count()

    @staticmethod
    def get_notification_stats(user_id: Optional[int] = None) -> Dict[str, Any]:
        """Get notification statistics."""
        base_filter = Notification.is_dismissed == False

        if user_id:
            base_filter = and_(
                base_filter,
                or_(Notification.user_id == user_id, Notification.user_id == None)
            )

        # Count by type
        type_counts = db.session.query(
            Notification.notification_type,
            func.count(Notification.id)
        ).filter(base_filter).group_by(Notification.notification_type).all()

        # Unread count
        unread = Notification.query.filter(
            base_filter,
            Notification.is_read == False
        ).count()

        # Total active
        total = Notification.query.filter(base_filter).count()

        # Urgent/high priority count
        urgent = Notification.query.filter(
            base_filter,
            Notification.is_read == False,
            Notification.priority.in_(['urgent', 'high'])
        ).count()

        return {
            'total': total,
            'unread': unread,
            'urgent': urgent,
            'by_type': {t: c for t, c in type_counts}
        }

    # ===================================
    # Task-Related Notifications
    # ===================================

    @staticmethod
    def create_task_due_notification(task: Task, minutes_before: int = 0) -> Notification:
        """Create a notification for a task due date."""
        title = f"Task due: {task.title}"
        if minutes_before > 0:
            title = f"Task due in {minutes_before} minutes: {task.title}"

        return NotificationService.create_notification(
            title=title,
            notification_type='task_due',
            message=task.description,
            task_id=task.id,
            space_id=task.space_id,
            priority='high' if task.priority == 'high' else 'normal',
            action_url=f"/tasks/{task.id}",
            action_data={'task_id': task.id}
        )

    @staticmethod
    def create_task_overdue_notification(task: Task) -> Notification:
        """Create a notification for an overdue task."""
        return NotificationService.create_notification(
            title=f"Task overdue: {task.title}",
            notification_type='task_overdue',
            message=f"This task was due on {task.due_date.strftime('%Y-%m-%d %H:%M')}",
            task_id=task.id,
            space_id=task.space_id,
            priority='urgent',
            action_url=f"/tasks/{task.id}",
            action_data={'task_id': task.id}
        )

    @staticmethod
    def check_and_create_due_notifications() -> List[Notification]:
        """
        Check for tasks due soon and create notifications.
        Should be run periodically (e.g., every 5 minutes).

        Returns:
            List of created notifications
        """
        created = []
        now = datetime.utcnow()

        # Tasks due in the next hour that haven't had notifications
        due_soon = Task.query.filter(
            Task.status != 'completed',
            Task.due_date != None,
            Task.due_date <= now + timedelta(hours=1),
            Task.due_date > now
        ).all()

        for task in due_soon:
            # Check if notification already exists
            existing = Notification.query.filter(
                Notification.task_id == task.id,
                Notification.notification_type == 'task_due',
                Notification.created_at > now - timedelta(hours=1)
            ).first()

            if not existing:
                minutes_until = int((task.due_date - now).total_seconds() / 60)
                notification = NotificationService.create_task_due_notification(
                    task, minutes_until
                )
                created.append(notification)

        # Overdue tasks
        overdue = Task.query.filter(
            Task.status != 'completed',
            Task.due_date != None,
            Task.due_date < now
        ).all()

        for task in overdue:
            # Check if overdue notification already exists today
            existing = Notification.query.filter(
                Notification.task_id == task.id,
                Notification.notification_type == 'task_overdue',
                Notification.created_at > now - timedelta(days=1)
            ).first()

            if not existing:
                notification = NotificationService.create_task_overdue_notification(task)
                created.append(notification)

        return created

    @staticmethod
    def create_system_notification(
        title: str,
        message: str,
        priority: str = 'normal'
    ) -> Notification:
        """Create a system-wide notification."""
        return NotificationService.create_notification(
            title=title,
            message=message,
            notification_type='system',
            priority=priority
        )

    @staticmethod
    def cleanup_old_notifications(days: int = 30) -> int:
        """
        Delete notifications older than specified days.

        Args:
            days: Age threshold in days

        Returns:
            Number of deleted notifications
        """
        cutoff = datetime.utcnow() - timedelta(days=days)

        deleted = Notification.query.filter(
            Notification.created_at < cutoff,
            or_(
                Notification.is_dismissed == True,
                Notification.is_read == True
            )
        ).delete()

        db.session.commit()
        return deleted
