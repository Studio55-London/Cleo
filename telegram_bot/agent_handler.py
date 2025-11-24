"""
Agent Handler for Cleo Telegram Bot
Integrates with Flask backend on port 8080
"""
import httpx
import sys
from pathlib import Path
from typing import Optional, Dict, List
import config

# Add parent directory to path
sys.path.insert(0, str(config.PROJECT_ROOT))


class CleoAgentHandler:
    """Handles agent routing via Cleo Flask backend"""

    def __init__(self):
        self.api_base_url = config.API_BASE_URL
        self.conversation_spaces = {}  # user_id -> space_id
        self.client = httpx.Client(timeout=60.0)

    async def get_agents(self) -> List[Dict]:
        """Fetch all agents from Cleo API"""
        try:
            response = self.client.get(f"{self.api_base_url}/agents")
            if response.status_code == 200:
                data = response.json()
                return data.get('agents', [])
            return []
        except Exception as e:
            print(f"Error fetching agents: {e}")
            return []

    def detect_agent_name(self, message: str) -> Optional[str]:
        """Detect which agent should handle the message based on keywords"""
        message_lower = message.lower()

        # Check for keywords in message
        for keyword, agent_name in config.AGENT_KEYWORDS.items():
            if keyword in message_lower:
                return agent_name

        # Default to Coach
        return config.DEFAULT_AGENT

    def get_agent_by_name(self, agents: List[Dict], name: str) -> Optional[Dict]:
        """Find agent by name"""
        for agent in agents:
            if agent.get('name', '').lower() == name.lower():
                return agent
        return None

    async def get_or_create_user_space(self, user_id: int) -> Optional[int]:
        """Get or create a dedicated space for this Telegram user"""
        # Check if we already have a space for this user
        if user_id in self.conversation_spaces:
            return self.conversation_spaces[user_id]

        try:
            # Try to find existing Telegram space for this user
            response = self.client.get(f"{self.api_base_url}/spaces")
            if response.status_code == 200:
                spaces = response.json().get('spaces', [])
                for space in spaces:
                    if space.get('name') == f"Telegram User {user_id}":
                        space_id = space.get('id')
                        self.conversation_spaces[user_id] = space_id
                        return space_id

            # Create new space for this user
            response = self.client.post(
                f"{self.api_base_url}/spaces",
                json={
                    "name": f"Telegram User {user_id}",
                    "description": f"Telegram conversation space for user {user_id}",
                    "agent_ids": [1, 2, 3]  # Include some default agents
                }
            )

            if response.status_code == 200:
                space_id = response.json().get('space', {}).get('id')
                self.conversation_spaces[user_id] = space_id
                return space_id

        except Exception as e:
            print(f"Error getting/creating space: {e}")

        return None

    async def send_message_to_agent(
        self,
        user_id: int,
        message: str,
        agent_name: Optional[str] = None
    ) -> str:
        """
        Send message to agent via Cleo Flask backend

        Args:
            user_id: Telegram user ID
            message: User message
            agent_name: Specific agent to use (optional)

        Returns:
            Agent response text
        """
        try:
            # Get agents list
            agents = await self.get_agents()

            if not agents:
                return "Sorry, no agents are available. Please ensure Cleo is running on http://localhost:8080"

            # Detect agent if not specified
            if not agent_name:
                agent_name = self.detect_agent_name(message)

            # Find agent by name
            agent = self.get_agent_by_name(agents, agent_name)

            if not agent:
                # Fallback to first agent
                agent = agents[0] if agents else None

            if not agent:
                return "Sorry, I couldn't determine which agent to use. Please try again."

            # Get or create space for this user
            space_id = await self.get_or_create_user_space(user_id)

            if not space_id:
                return "Sorry, I couldn't create a conversation space. Please try again."

            # Send message to space
            # First, add user message
            response = self.client.post(
                f"{self.api_base_url}/spaces/{space_id}/messages",
                json={
                    "content": message,
                    "author": f"telegram_{user_id}",
                    "agent_name": None
                }
            )

            if response.status_code != 200:
                return f"Sorry, I encountered an error posting your message."

            # Now get agent response
            agent_response_data = response.json().get('response', {})
            agent_response = agent_response_data.get('content', '')
            responding_agent = agent_response_data.get('agent_name', agent.get('name', 'Agent'))

            if agent_response:
                # Format response with agent name
                return f"**{responding_agent}:**\n\n{agent_response}"
            else:
                return "I received your message but got no response. Please try again."

        except httpx.ConnectError:
            return "⚠️ Cannot connect to Cleo backend. Please ensure it's running on http://localhost:8080"
        except Exception as e:
            print(f"Error sending message: {e}")
            import traceback
            traceback.print_exc()
            return f"I encountered an error processing your request: {str(e)}"

    async def create_todoist_task(
        self,
        task_content: str,
        project: str = "Inbox",
        priority: int = 2,
        due: str = None
    ) -> Dict:
        """Create a task via Todoist integration"""
        try:
            # Note: This would need a Todoist integration endpoint in Cleo backend
            # For now, return a placeholder
            return {
                "success": False,
                "message": "Todoist integration not yet implemented in Cleo backend. Coming soon!"
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }

    def reset_conversation(self, user_id: int):
        """Clear conversation history for a user by removing space reference"""
        if user_id in self.conversation_spaces:
            del self.conversation_spaces[user_id]

    async def get_agent_list_formatted(self) -> str:
        """Get formatted list of all agents"""
        agents = await self.get_agents()

        if not agents:
            return "No agents available."

        # Group by type (tier)
        tiers = {}
        for agent in agents:
            tier = agent.get('type', 'unknown')
            if tier not in tiers:
                tiers[tier] = []
            tiers[tier].append(agent.get('name', 'Unknown'))

        # Format output
        output = "**Available Agents:**\n\n"

        tier_names = {
            'master': '👑 Master',
            'personal': '🧘 Personal',
            'team': '👔 Team',
            'worker': '⚙️ Worker',
            'expert': '🎓 Expert'
        }

        for tier, tier_label in tier_names.items():
            if tier in tiers:
                output += f"**{tier_label}:**\n"
                for agent_name in tiers[tier]:
                    output += f"  • {agent_name}\n"
                output += "\n"

        output += f"Total: {len(agents)} agents"
        return output

    async def handle_command(self, command: str, args: List[str], user_id: int = 0) -> str:
        """Handle special bot commands"""

        if command == '/start':
            return """👋 Welcome to Cleo!

I'm your AI Agent Workspace with 31 specialized agents across 5 tiers.

🎯 **What I can do:**
• Personal coaching and planning
• Business strategy and decision support
• Team management and coordination
• Specialized expert consultations
• Multi-agent collaboration

💬 **How to use:**
Just message me naturally - I'll route to the right agent!

📋 **Commands:**
/help - Show commands
/agents - List all 31 agents
/task [description] - Create a task (coming soon)
/reset - Clear conversation

**Powered by Cleo AI Agent Workspace**"""

        elif command == '/help':
            return """**Cleo Help**

💬 **Natural Conversation:**
Just message me and I'll detect which agent to use.

Examples:
• "Help me set goals for next quarter" → Coach
• "Review this marketing strategy" → CMO
• "What's our financial position?" → FD

📋 **Create Tasks:**
/task Complete QRA marketing material _(coming soon)_

🎯 **Commands:**
/agents - List all 31 agents by tier
/reset - Clear conversation history
/help - This message

**Features:**
✓ 31 specialized agents (Master, Personal, Team, Worker, Expert)
✓ Intelligent keyword routing
✓ Session-based conversations
✓ Multi-agent collaboration"""

        elif command == '/agents':
            return await self.get_agent_list_formatted()

        elif command == '/reset':
            self.reset_conversation(user_id)
            return "🔄 Conversation history cleared! Starting fresh."

        elif command == '/task':
            if not args:
                return "Please provide task description.\n\nExample: `/task Complete website update by Friday`"

            task_description = ' '.join(args)

            result = await self.create_todoist_task(
                task_content=task_description
            )

            if result.get('success'):
                return f"✅ **Task Created!**\n\n{result.get('message', '')}"
            else:
                return f"ℹ️ {result.get('message', 'Task creation not yet available')}"

        else:
            return f"Unknown command: {command}\n\nType /help for available commands."

    def close(self):
        """Close HTTP client"""
        self.client.close()
