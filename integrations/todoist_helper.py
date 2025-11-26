"""
Todoist Integration Helper
Provides functions to fetch and manage Todoist tasks for agents
"""
import requests
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class TodoistHelper:
    """Helper class for Todoist API interactions"""

    BASE_URL = "https://api.todoist.com/rest/v2"

    def __init__(self, api_token: str):
        """
        Initialize Todoist helper with API token

        Args:
            api_token: Todoist API token
        """
        self.api_token = api_token
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Optional[Dict]:
        """Make a request to Todoist API"""
        url = f"{self.BASE_URL}/{endpoint}"
        try:
            response = requests.request(
                method,
                url,
                headers=self.headers,
                timeout=10,
                **kwargs
            )
            response.raise_for_status()
            return response.json() if response.content else {}
        except requests.exceptions.RequestException as e:
            logger.error(f"Todoist API error: {e}")
            return None

    def get_projects(self) -> List[Dict]:
        """Get all projects"""
        result = self._make_request("GET", "projects")
        return result if isinstance(result, list) else []

    def get_tasks(
        self,
        project_id: Optional[str] = None,
        filter_query: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """
        Get tasks from Todoist

        Args:
            project_id: Optional project ID to filter by
            filter_query: Optional Todoist filter query (e.g., "today", "overdue")
            limit: Maximum number of tasks to return

        Returns:
            List of task dictionaries
        """
        params = {}

        if project_id:
            params["project_id"] = project_id
        if filter_query:
            params["filter"] = filter_query

        result = self._make_request("GET", "tasks", params=params)
        tasks = result if isinstance(result, list) else []

        return tasks[:limit]

    def get_active_tasks(self, limit: int = 50) -> List[Dict]:
        """Get all active (non-completed) tasks"""
        return self.get_tasks(limit=limit)

    def get_today_tasks(self) -> List[Dict]:
        """Get tasks due today"""
        return self.get_tasks(filter_query="today")

    def get_overdue_tasks(self) -> List[Dict]:
        """Get overdue tasks"""
        return self.get_tasks(filter_query="overdue")

    def get_upcoming_tasks(self, days: int = 7) -> List[Dict]:
        """Get tasks due in the next N days"""
        return self.get_tasks(filter_query=f"due before: +{days} days")

    def format_tasks_for_context(self, tasks: List[Dict], title: str = "Tasks") -> str:
        """
        Format tasks into a readable context string for agents

        Args:
            tasks: List of task dictionaries from Todoist API
            title: Title for the task list

        Returns:
            Formatted string with task information
        """
        if not tasks:
            return f"[{title}]\nNo tasks found.\n"

        lines = [f"[{title}]"]

        for task in tasks:
            # Get task details
            content = task.get("content", "Untitled")
            description = task.get("description", "")
            priority = task.get("priority", 1)
            due = task.get("due")
            project_id = task.get("project_id")
            labels = task.get("labels", [])

            # Format priority
            priority_map = {4: "P1 (Urgent)", 3: "P2 (High)", 2: "P3 (Medium)", 1: "P4 (Low)"}
            priority_str = priority_map.get(priority, "")

            # Format due date
            due_str = ""
            if due:
                due_date = due.get("date", "")
                due_string = due.get("string", "")
                if due_string:
                    due_str = f" | Due: {due_string}"
                elif due_date:
                    due_str = f" | Due: {due_date}"

            # Format labels
            labels_str = f" | Labels: {', '.join(labels)}" if labels else ""

            # Build task line
            line = f"  - {content}"
            if priority_str:
                line += f" [{priority_str}]"
            if due_str:
                line += due_str
            if labels_str:
                line += labels_str
            if description:
                line += f"\n    Description: {description[:100]}..."

            lines.append(line)

        lines.append("")  # Empty line at end
        return "\n".join(lines)

    def get_context_summary(self) -> str:
        """
        Get a comprehensive Todoist context summary for agents

        Returns:
            Formatted string with today's tasks, overdue, and upcoming
        """
        sections = []

        # Get today's tasks
        today_tasks = self.get_today_tasks()
        sections.append(self.format_tasks_for_context(today_tasks, "Today's Tasks"))

        # Get overdue tasks
        overdue_tasks = self.get_overdue_tasks()
        if overdue_tasks:
            sections.append(self.format_tasks_for_context(overdue_tasks, "Overdue Tasks"))

        # Get upcoming tasks (next 7 days, excluding today)
        upcoming_tasks = self.get_upcoming_tasks(days=7)
        # Filter out today's tasks from upcoming
        today_ids = {t.get("id") for t in today_tasks}
        upcoming_tasks = [t for t in upcoming_tasks if t.get("id") not in today_ids]
        if upcoming_tasks:
            sections.append(self.format_tasks_for_context(upcoming_tasks[:10], "Upcoming Tasks (Next 7 Days)"))

        # Get project summary
        projects = self.get_projects()
        if projects:
            project_lines = ["[Projects]"]
            for p in projects[:10]:
                project_lines.append(f"  - {p.get('name', 'Unnamed')}")
            project_lines.append("")
            sections.append("\n".join(project_lines))

        return "\n".join(sections)


def get_todoist_context(api_token: str) -> Optional[str]:
    """
    Get Todoist context for agent consumption

    Args:
        api_token: Todoist API token

    Returns:
        Formatted context string or None if failed
    """
    try:
        helper = TodoistHelper(api_token)
        context = helper.get_context_summary()

        if context:
            return (
                "\n--- TODOIST INTEGRATION DATA ---\n"
                f"{context}"
                "--- END TODOIST DATA ---\n"
            )
        return None
    except Exception as e:
        logger.error(f"Failed to get Todoist context: {e}")
        return None


def get_todoist_tasks_context(api_token: str, filter_type: str = "all") -> Optional[str]:
    """
    Get filtered Todoist tasks for agent consumption

    Args:
        api_token: Todoist API token
        filter_type: Type of filter ("all", "today", "overdue", "upcoming")

    Returns:
        Formatted context string or None if failed
    """
    try:
        helper = TodoistHelper(api_token)

        if filter_type == "today":
            tasks = helper.get_today_tasks()
            title = "Today's Tasks from Todoist"
        elif filter_type == "overdue":
            tasks = helper.get_overdue_tasks()
            title = "Overdue Tasks from Todoist"
        elif filter_type == "upcoming":
            tasks = helper.get_upcoming_tasks()
            title = "Upcoming Tasks from Todoist"
        else:
            tasks = helper.get_active_tasks(limit=30)
            title = "Active Tasks from Todoist"

        return helper.format_tasks_for_context(tasks, title)
    except Exception as e:
        logger.error(f"Failed to get Todoist tasks: {e}")
        return None
