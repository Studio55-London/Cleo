"""
Calendar Service - Business logic for calendar event management
Phase 4: Calendar Integration
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import func, and_, or_
from models import db, CalendarEvent, Task, Space
import json


class CalendarService:
    """Service class for calendar event management operations"""

    @staticmethod
    def create_event(
        title: str,
        start_time: datetime,
        end_time: datetime,
        space_id: Optional[int] = None,
        task_id: Optional[int] = None,
        description: Optional[str] = None,
        location: Optional[str] = None,
        all_day: bool = False,
        timezone: str = 'UTC',
        event_type: str = 'event',
        color: Optional[str] = None,
        reminder_minutes: Optional[List[int]] = None,
        attendees: Optional[List[Dict]] = None,
        is_recurring: bool = False,
        recurrence_rule: Optional[str] = None,
        recurrence_end: Optional[datetime] = None
    ) -> CalendarEvent:
        """
        Create a new calendar event.

        Args:
            title: Event title
            start_time: Event start time
            end_time: Event end time
            space_id: Optional space ID
            task_id: Optional linked task ID
            description: Optional description
            location: Optional location
            all_day: Whether this is an all-day event
            timezone: Timezone string
            event_type: Type of event (event, meeting, deadline, reminder, block)
            color: Optional hex color code
            reminder_minutes: List of reminder times in minutes before event
            attendees: List of attendee dicts
            is_recurring: Whether event recurs
            recurrence_rule: iCal RRULE format string
            recurrence_end: End date for recurrence

        Returns:
            Created CalendarEvent object
        """
        # Validate space if provided
        if space_id:
            space = Space.query.get(space_id)
            if not space:
                raise ValueError(f"Space with id {space_id} not found")

        # Validate task if provided
        if task_id:
            task = Task.query.get(task_id)
            if not task:
                raise ValueError(f"Task with id {task_id} not found")

        # Validate event type
        valid_types = ['event', 'meeting', 'deadline', 'reminder', 'block']
        if event_type not in valid_types:
            raise ValueError(f"Invalid event type. Must be one of: {valid_types}")

        # Validate times
        if end_time < start_time:
            raise ValueError("End time must be after start time")

        event = CalendarEvent(
            title=title,
            start_time=start_time,
            end_time=end_time,
            space_id=space_id,
            task_id=task_id,
            description=description,
            location=location,
            all_day=all_day,
            timezone=timezone,
            event_type=event_type,
            color=color,
            is_recurring=is_recurring,
            recurrence_rule=recurrence_rule,
            recurrence_end=recurrence_end
        )

        if reminder_minutes:
            event.set_reminder_minutes(reminder_minutes)

        if attendees:
            event.set_attendees(attendees)

        db.session.add(event)
        db.session.commit()

        return event

    @staticmethod
    def get_event(event_id: int) -> Optional[CalendarEvent]:
        """Get an event by ID."""
        return CalendarEvent.query.get(event_id)

    @staticmethod
    def list_events(
        space_id: Optional[int] = None,
        task_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_type: Optional[str] = None,
        include_cancelled: bool = False,
        limit: int = 100
    ) -> List[CalendarEvent]:
        """
        List events with optional filters.

        Args:
            space_id: Filter by space
            task_id: Filter by task
            start_date: Filter events starting from this date
            end_date: Filter events ending before this date
            event_type: Filter by event type
            include_cancelled: Include cancelled events
            limit: Maximum events to return

        Returns:
            List of CalendarEvent objects
        """
        query = CalendarEvent.query

        if space_id is not None:
            query = query.filter(CalendarEvent.space_id == space_id)

        if task_id is not None:
            query = query.filter(CalendarEvent.task_id == task_id)

        if start_date:
            query = query.filter(CalendarEvent.start_time >= start_date)

        if end_date:
            query = query.filter(CalendarEvent.end_time <= end_date)

        if event_type:
            query = query.filter(CalendarEvent.event_type == event_type)

        if not include_cancelled:
            query = query.filter(CalendarEvent.status != 'cancelled')

        query = query.order_by(CalendarEvent.start_time.asc())

        return query.limit(limit).all()

    @staticmethod
    def get_events_for_range(
        start_date: datetime,
        end_date: datetime,
        space_id: Optional[int] = None
    ) -> List[CalendarEvent]:
        """
        Get all events that overlap with a date range.
        Useful for calendar views.

        Args:
            start_date: Range start
            end_date: Range end
            space_id: Optional space filter

        Returns:
            List of overlapping events
        """
        query = CalendarEvent.query.filter(
            and_(
                CalendarEvent.status != 'cancelled',
                or_(
                    # Event starts within range
                    and_(
                        CalendarEvent.start_time >= start_date,
                        CalendarEvent.start_time <= end_date
                    ),
                    # Event ends within range
                    and_(
                        CalendarEvent.end_time >= start_date,
                        CalendarEvent.end_time <= end_date
                    ),
                    # Event spans the entire range
                    and_(
                        CalendarEvent.start_time <= start_date,
                        CalendarEvent.end_time >= end_date
                    )
                )
            )
        )

        if space_id:
            query = query.filter(CalendarEvent.space_id == space_id)

        return query.order_by(CalendarEvent.start_time.asc()).all()

    @staticmethod
    def update_event(event_id: int, updates: Dict[str, Any]) -> Optional[CalendarEvent]:
        """
        Update a calendar event.

        Args:
            event_id: Event ID
            updates: Dictionary of fields to update

        Returns:
            Updated CalendarEvent or None if not found
        """
        event = CalendarEvent.query.get(event_id)
        if not event:
            return None

        # Validate event type if being updated
        if 'event_type' in updates:
            valid_types = ['event', 'meeting', 'deadline', 'reminder', 'block']
            if updates['event_type'] not in valid_types:
                raise ValueError(f"Invalid event type. Must be one of: {valid_types}")

        # Validate status if being updated
        if 'status' in updates:
            valid_statuses = ['confirmed', 'tentative', 'cancelled']
            if updates['status'] not in valid_statuses:
                raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")

        # Apply updates
        allowed_fields = [
            'title', 'description', 'location', 'start_time', 'end_time',
            'all_day', 'timezone', 'event_type', 'status', 'color',
            'is_recurring', 'recurrence_rule', 'recurrence_end'
        ]

        for field, value in updates.items():
            if field in allowed_fields:
                setattr(event, field, value)
            elif field == 'reminder_minutes' and value is not None:
                event.set_reminder_minutes(value)
            elif field == 'attendees' and value is not None:
                event.set_attendees(value)

        event.updated_at = datetime.utcnow()
        db.session.commit()

        return event

    @staticmethod
    def delete_event(event_id: int) -> bool:
        """Delete a calendar event."""
        event = CalendarEvent.query.get(event_id)
        if not event:
            return False

        db.session.delete(event)
        db.session.commit()
        return True

    @staticmethod
    def cancel_event(event_id: int) -> Optional[CalendarEvent]:
        """Mark an event as cancelled instead of deleting."""
        return CalendarService.update_event(event_id, {'status': 'cancelled'})

    @staticmethod
    def create_event_from_task(task_id: int, duration_minutes: int = 60) -> CalendarEvent:
        """
        Create a calendar event from a task's due date.

        Args:
            task_id: Task ID to create event from
            duration_minutes: Event duration in minutes

        Returns:
            Created CalendarEvent
        """
        task = Task.query.get(task_id)
        if not task:
            raise ValueError(f"Task with id {task_id} not found")

        if not task.due_date:
            raise ValueError("Task must have a due date to create calendar event")

        start_time = task.due_date
        end_time = start_time + timedelta(minutes=duration_minutes)

        return CalendarService.create_event(
            title=task.title,
            start_time=start_time,
            end_time=end_time,
            space_id=task.space_id,
            task_id=task.id,
            description=task.description,
            event_type='deadline',
            reminder_minutes=[15, 60]
        )

    @staticmethod
    def get_upcoming_events(
        hours_ahead: int = 24,
        space_id: Optional[int] = None
    ) -> List[CalendarEvent]:
        """Get events starting in the next N hours."""
        now = datetime.utcnow()
        end = now + timedelta(hours=hours_ahead)

        return CalendarService.list_events(
            space_id=space_id,
            start_date=now,
            end_date=end
        )

    @staticmethod
    def get_events_needing_reminders() -> List[Dict[str, Any]]:
        """
        Get events that need reminder notifications sent.

        Returns:
            List of dicts with event and reminder info
        """
        now = datetime.utcnow()
        reminders_needed = []

        # Get upcoming events in next 24 hours
        events = CalendarService.get_upcoming_events(hours_ahead=24)

        for event in events:
            reminder_minutes = event.get_reminder_minutes()
            for minutes in reminder_minutes:
                reminder_time = event.start_time - timedelta(minutes=minutes)
                # If reminder time is within the next minute
                if now <= reminder_time <= now + timedelta(minutes=1):
                    reminders_needed.append({
                        'event': event,
                        'minutes_before': minutes,
                        'reminder_time': reminder_time
                    })

        return reminders_needed

    @staticmethod
    def get_calendar_stats(
        space_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get statistics about calendar events."""
        query = CalendarEvent.query.filter(CalendarEvent.status != 'cancelled')

        if space_id:
            query = query.filter(CalendarEvent.space_id == space_id)

        if start_date:
            query = query.filter(CalendarEvent.start_time >= start_date)

        if end_date:
            query = query.filter(CalendarEvent.end_time <= end_date)

        # Count by type
        type_counts = db.session.query(
            CalendarEvent.event_type,
            func.count(CalendarEvent.id)
        ).filter(
            CalendarEvent.status != 'cancelled'
        ).group_by(CalendarEvent.event_type).all()

        # Total events
        total = query.count()

        # Upcoming events (next 7 days)
        upcoming = CalendarService.get_events_for_range(
            datetime.utcnow(),
            datetime.utcnow() + timedelta(days=7),
            space_id
        )

        return {
            'total': total,
            'by_type': {t: c for t, c in type_counts},
            'upcoming_count': len(upcoming),
            'next_event': upcoming[0].to_dict() if upcoming else None
        }
