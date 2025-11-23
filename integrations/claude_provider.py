"""
Claude Provider for Microsoft Agent Framework
Integrates Anthropic Claude API with Agent Framework
"""
from anthropic import Anthropic, AsyncAnthropic
from typing import List, Dict, Any, Optional
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import ANTHROPIC_API_KEY, CLAUDE_MODEL, AGENT_CONFIG


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
    """

    def __init__(
        self,
        name: str,
        instructions: str,
        tools: List[Dict] = None,
        model: str = None,
        temperature: float = None
    ):
        """
        Initialize a Claude-powered agent

        Args:
            name: Agent name
            instructions: System instructions/personality
            tools: List of tool definitions
            model: Claude model to use
            temperature: Sampling temperature
        """
        self.name = name
        self.instructions = instructions
        self.tools = tools or []
        self.model = model or CLAUDE_MODEL
        self.temperature = temperature or AGENT_CONFIG.get('temperature', 0.7)

        # Initialize Claude provider
        self.provider = ClaudeProvider(model=self.model)

        # Conversation history (thread)
        self.messages = []

    def run(self, input_text: str, context: Dict = None) -> str:
        """
        Run the agent with input text (synchronous)

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

        # Call Claude API
        response = self.provider.create_message(
            messages=self.messages,
            system=self.instructions,
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

        # Call Claude API asynchronously
        response = await self.provider.create_message_async(
            messages=self.messages,
            system=self.instructions,
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
