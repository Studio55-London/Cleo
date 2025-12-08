"""
Azure Configuration Module for Cleo
Handles Azure Key Vault integration and Azure-specific configuration
"""

import os
import logging
from typing import Optional, Dict, Any
from functools import lru_cache

logger = logging.getLogger(__name__)


class AzureConfig:
    """
    Azure configuration manager with Key Vault integration.

    In Azure App Service, secrets can be loaded either:
    1. Via Key Vault References in App Settings (recommended)
    2. Directly from Key Vault using Managed Identity

    This class provides a fallback mechanism for local development.
    """

    def __init__(self):
        self.key_vault_url = os.getenv('AZURE_KEY_VAULT_URL')
        self._secrets_client = None
        self._secrets_cache: Dict[str, str] = {}
        self._initialized = False

    def _init_key_vault_client(self):
        """Initialize Key Vault client with Managed Identity."""
        if self._initialized:
            return

        if not self.key_vault_url:
            logger.info("AZURE_KEY_VAULT_URL not set - using environment variables")
            self._initialized = True
            return

        try:
            from azure.identity import DefaultAzureCredential
            from azure.keyvault.secrets import SecretClient

            credential = DefaultAzureCredential()
            self._secrets_client = SecretClient(
                vault_url=self.key_vault_url,
                credential=credential
            )
            logger.info(f"Connected to Azure Key Vault: {self.key_vault_url}")
            self._initialized = True

        except ImportError:
            logger.warning("Azure SDK not installed - using environment variables")
            self._initialized = True
        except Exception as e:
            logger.error(f"Failed to connect to Key Vault: {e}")
            self._initialized = True

    def get_secret(self, secret_name: str, default: Optional[str] = None) -> Optional[str]:
        """
        Get a secret value from Key Vault or environment.

        Order of precedence:
        1. Cache (if previously retrieved)
        2. Environment variable (for local dev or App Settings with Key Vault References)
        3. Direct Key Vault lookup (for Managed Identity access)
        4. Default value

        Args:
            secret_name: Name of the secret (e.g., 'database-url')
            default: Default value if secret not found

        Returns:
            Secret value or default
        """
        # Check cache first
        if secret_name in self._secrets_cache:
            return self._secrets_cache[secret_name]

        # Convert secret name to env var format (e.g., 'database-url' -> 'DATABASE_URL')
        env_var_name = secret_name.upper().replace('-', '_')

        # Check environment variable
        value = os.getenv(env_var_name)
        if value:
            self._secrets_cache[secret_name] = value
            return value

        # Try Key Vault if configured
        self._init_key_vault_client()

        if self._secrets_client:
            try:
                secret = self._secrets_client.get_secret(secret_name)
                value = secret.value
                self._secrets_cache[secret_name] = value
                logger.debug(f"Retrieved secret '{secret_name}' from Key Vault")
                return value
            except Exception as e:
                logger.warning(f"Failed to get secret '{secret_name}' from Key Vault: {e}")

        return default

    def get_database_url(self) -> Optional[str]:
        """Get database connection URL."""
        return self.get_secret('database-url') or os.getenv('DATABASE_URL')

    def get_anthropic_api_key(self) -> Optional[str]:
        """Get Anthropic API key."""
        return self.get_secret('anthropic-api-key') or os.getenv('ANTHROPIC_API_KEY')

    def get_storage_connection_string(self) -> Optional[str]:
        """Get Azure Blob Storage connection string."""
        return self.get_secret('storage-connection-string') or os.getenv('AZURE_STORAGE_CONNECTION_STRING')

    def get_flask_secret_key(self) -> str:
        """Get Flask session secret key."""
        return self.get_secret('flask-secret-key') or os.getenv('SECRET_KEY', 'dev-secret-key')

    def is_azure_environment(self) -> bool:
        """Check if running in Azure environment."""
        return bool(
            os.getenv('WEBSITE_SITE_NAME') or  # App Service
            os.getenv('AZURE_KEY_VAULT_URL') or  # Key Vault configured
            os.getenv('CONTAINER_APP_NAME')  # Container Apps
        )

    def get_app_insights_connection_string(self) -> Optional[str]:
        """Get Application Insights connection string."""
        return os.getenv('APPLICATIONINSIGHTS_CONNECTION_STRING')

    def clear_cache(self):
        """Clear the secrets cache (useful for testing)."""
        self._secrets_cache.clear()


# Singleton instance
_azure_config: Optional[AzureConfig] = None


def get_azure_config() -> AzureConfig:
    """Get the singleton AzureConfig instance."""
    global _azure_config
    if _azure_config is None:
        _azure_config = AzureConfig()
    return _azure_config


# Convenience functions
def get_secret(secret_name: str, default: Optional[str] = None) -> Optional[str]:
    """Get a secret from Azure Key Vault or environment."""
    return get_azure_config().get_secret(secret_name, default)


def is_azure_environment() -> bool:
    """Check if running in Azure environment."""
    return get_azure_config().is_azure_environment()
