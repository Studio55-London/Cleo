"""
Claude Provider for Microsoft Agent Framework
Integrates Anthropic Claude API with Agent Framework
"""
from anthropic import Anthropic, AsyncAnthropic, APIError, APIConnectionError, RateLimitError
from typing import List, Dict, Any, Optional
import os
import sys
import logging
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import ANTHROPIC_API_KEY, CLAUDE_MODEL, AGENT_CONFIG

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


class ClaudeProvider:
    """
    Claude API provider for Agent Framework
    Handles communication with Anthropic Claude API
    """

    def __init__(self, model: str = None, api_key: str = None):
        """
        Initialize Claude provider

        Args:
            model: Claude model to use (default from settings)
            api_key: Anthropic API key (default from environment)
        """
        self.model = model or CLAUDE_MODEL
        self.api_key = api_key or ANTHROPIC_API_KEY

        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")

        # Initialize sync and async clients
        self.client = Anthropic(api_key=self.api_key)
        self.async_client = AsyncAnthropic(api_key=self.api_key)

        self.max_tokens = AGENT_CONFIG.get('max_tokens', 4096)
        self.temperature = AGENT_CONFIG.get('temperature', 0.7)

    def create_message(
        self,
        messages: List[Dict[str, str]],
        system: str = None,
        tools: List[Dict] = None,
        **kwargs
    ) -> Any:
        """
        Create a message using Claude API (synchronous)

        Args:
            messages: List of message dicts with 'role' and 'content'
            system: System prompt/instructions
            tools: List of tool definitions
            **kwargs: Additional parameters for Claude API

        Returns:
            Claude API response
        """
        params = {
            'model': self.model,
            'max_tokens': kwargs.get('max_tokens', self.max_tokens),
            'messages': messages,
        }

        # Add system prompt if provided
        if system:
            params['system'] = system

        # Add tools if provided
        if tools:
            params['tools'] = tools

        # Add optional parameters
        if 'temperature' in kwargs:
            params['temperature'] = kwargs['temperature']
        else:
            params['temperature'] = self.temperature

        # Make API call
        response = self.client.messages.create(**params)
        return response

    async def create_message_async(
        self,
        messages: List[Dict[str, str]],
        system: str = None,
        tools: List[Dict] = None,
        **kwargs
    ) -> Any:
        """
        Create a message using Claude API (asynchronous)

        Args:
            messages: List of message dicts with 'role' and 'content'
            system: System prompt/instructions
            tools: List of tool definitions
            **kwargs: Additional parameters for Claude API

        Returns:
            Claude API response
        """
        params = {
            'model': self.model,
            'max_tokens': kwargs.get('max_tokens', self.max_tokens),
            'messages': messages,
        }

        # Add system prompt if provided
        if system:
            params['system'] = system

        # Add tools if provided
        if tools:
            params['tools'] = tools

        # Add optional parameters
        if 'temperature' in kwargs:
            params['temperature'] = kwargs['temperature']
        else:
            params['temperature'] = self.temperature

        # Make async API call
        response = await self.async_client.messages.create(**params)
        return response

    def stream_message(
        self,
        messages: List[Dict[str, str]],
        system: str = None,
        tools: List[Dict] = None,
        **kwargs
    ):
        """
        Stream a message using Claude API

        Args:
            messages: List of message dicts
            system: System prompt
            tools: Tool definitions
            **kwargs: Additional parameters

        Yields:
            Chunks of the response as they arrive
        """
        params = {
            'model': self.model,
            'max_tokens': kwargs.get('max_tokens', self.max_tokens),
            'messages': messages,
        }

        if system:
            params['system'] = system

        if tools:
            params['tools'] = tools

        params['temperature'] = kwargs.get('temperature', self.temperature)

        with self.client.messages.stream(**params) as stream:
            for chunk in stream:
                yield chunk


class ClaudeAgent:
    """
    Base agent class using Claude
    Designed to work with Microsoft Agent Framework patterns
    Supports skill-based behavior modification
    """

    def __init__(
        self,
        name: str,
        instructions: str,
        tools: List[Dict] = None,
        model: str = None,
        temperature: float = None,
        agent_id: int = None,
        skill_manager = None
    ):
        """
        Initialize a Claude-powered agent

        Args:
            name: Agent name
            instructions: System instructions/personality
            tools: List of tool definitions
            model: Claude model to use
            temperature: Sampling temperature
            agent_id: Database agent ID for skill lookup
            skill_manager: SkillManager instance for skill retrieval
        """
        self.name = name
        self.base_instructions = instructions
        self.tools = tools or []
        self.model = model or CLAUDE_MODEL
        self.temperature = temperature or AGENT_CONFIG.get('temperature', 0.7)
        self.agent_id = agent_id
        self.skill_manager = skill_manager

        # Initialize Claude provider
        self.provider = ClaudeProvider(model=self.model)

        # Conversation history (thread)
        self.messages = []

        # Cache for active skills
        self._skills_cache = None
        self._skills_summary_cache = None

    @property
    def instructions(self) -> str:
        """
        Get combined instructions with skill summaries.
        Skills are added at the end of base instructions.
        """
        if not self.agent_id or not self.skill_manager:
            return self.base_instructions

        try:
            # Get skill summaries if not cached
            if self._skills_summary_cache is None:
                self._skills_summary_cache = self.skill_manager.get_skill_summaries(self.agent_id)

            if self._skills_summary_cache:
                return f"{self.base_instructions}\n\n{self._skills_summary_cache}"
        except Exception as e:
            logger.warning(f"[{self.name}] Failed to load skill summaries: {e}")

        return self.base_instructions

    def refresh_skills(self):
        """Refresh the skills cache - call when skills are updated"""
        self._skills_cache = None
        self._skills_summary_cache = None

    def get_active_skills(self) -> List[Any]:
        """Get active skills for this agent"""
        if not self.agent_id or not self.skill_manager:
            return []

        try:
            if self._skills_cache is None:
                self._skills_cache = self.skill_manager.get_skills_for_agent(self.agent_id)
            return self._skills_cache
        except Exception as e:
            logger.warning(f"[{self.name}] Failed to load skills: {e}")
            return []

    def detect_skills_for_message(self, message: str) -> List[Any]:
        """
        Detect which skills are relevant for a given user message.

        Args:
            message: User message to analyze

        Returns:
            List of relevant skills
        """
        if not self.agent_id or not self.skill_manager:
            return []

        try:
            return self.skill_manager.detect_relevant_skills(message, self.agent_id)
        except Exception as e:
            logger.warning(f"[{self.name}] Failed to detect skills: {e}")
            return []

    def _build_system_prompt_with_skills(self, input_text: str) -> str:
        """
        Build system prompt with relevant skill content injected.

        For progressive disclosure: skill summaries are always present,
        but full skill content is only included when relevant to the message.
        """
        system_prompt = self.instructions

        # Detect relevant skills for this specific message
        relevant_skills = self.detect_skills_for_message(input_text)

        if relevant_skills:
            skill_contents = []
            for skill in relevant_skills:
                skill_contents.append(f"\n## Active Skill: {skill.display_name}\n{skill.content}")

            if skill_contents:
                system_prompt += "\n\n# Active Skills for This Request\n"
                system_prompt += "The following skills are relevant to the user's current request. Follow their instructions:\n"
                system_prompt += "\n".join(skill_contents)

        return system_prompt

    def run(self, input_text: str, context: Dict = None) -> str:
        """
        Run the agent with input text (synchronous)

        Args:
            input_text: User input
            context: Additional context dict

        Returns:
            Agent response text
        """
        try:
            # Add user message to history
            self.messages.append({
                'role': 'user',
                'content': input_text
            })

            logger.info(f"[{self.name}] Processing user input: {input_text[:50]}...")

            # Build system prompt with skill injection
            system_prompt = self._build_system_prompt_with_skills(input_text)

            # Call Claude API
            response = self.provider.create_message(
                messages=self.messages,
                system=system_prompt,
                tools=self.tools if self.tools else None,
                temperature=self.temperature
            )

            # Extract assistant response
            assistant_message = response.content[0].text

            # Add to history
            self.messages.append({
                'role': 'assistant',
                'content': assistant_message
            })

            logger.info(f"[{self.name}] Successfully generated response")
            return assistant_message

        except RateLimitError as e:
            logger.error(f"[{self.name}] Rate limit exceeded: {e}")
            # Remove the user message from history since we failed
            if self.messages and self.messages[-1]['role'] == 'user':
                self.messages.pop()
            return "I'm experiencing high demand right now. Please try again in a moment."

        except APIConnectionError as e:
            logger.error(f"[{self.name}] Connection error: {e}")
            if self.messages and self.messages[-1]['role'] == 'user':
                self.messages.pop()
            return "I'm having trouble connecting to my AI service. Please check your internet connection and try again."

        except APIError as e:
            logger.error(f"[{self.name}] API error: {e}")
            if self.messages and self.messages[-1]['role'] == 'user':
                self.messages.pop()
            return f"I encountered an error while processing your request: {str(e)}"

        except Exception as e:
            logger.error(f"[{self.name}] Unexpected error: {e}", exc_info=True)
            if self.messages and self.messages[-1]['role'] == 'user':
                self.messages.pop()
            return "I encountered an unexpected error. Please try again."

    async def run_async(self, input_text: str, context: Dict = None) -> str:
        """
        Run the agent with input text (asynchronous)

        Args:
            input_text: User input
            context: Additional context dict

        Returns:
            Agent response text
        """
        # Add user message to history
        self.messages.append({
            'role': 'user',
            'content': input_text
        })

        # Build system prompt with skill injection
        system_prompt = self._build_system_prompt_with_skills(input_text)

        # Call Claude API asynchronously
        response = await self.provider.create_message_async(
            messages=self.messages,
            system=system_prompt,
            tools=self.tools if self.tools else None,
            temperature=self.temperature
        )

        # Extract assistant response
        assistant_message = response.content[0].text

        # Add to history
        self.messages.append({
            'role': 'assistant',
            'content': assistant_message
        })

        return assistant_message

    def reset(self):
        """Clear conversation history"""
        self.messages = []

    def get_history(self) -> List[Dict]:
        """Get conversation history"""
        return self.messages.copy()


# Test function
async def test_claude_provider():
    """Test Claude provider functionality"""
    print("Testing Claude Provider...")

    agent = ClaudeAgent(
        name="TestAgent",
        instructions="You are a helpful AI assistant. Be concise and friendly."
    )

    # Test sync
    print("\n--- Sync Test ---")
    response = agent.run("Hello! Who are you?")
    print(f"Response: {response}")

    # Test async
    print("\n--- Async Test ---")
    response = await agent.run_async("What can you help me with?")
    print(f"Response: {response}")

    print("\n✅ Claude provider test complete")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_claude_provider())
