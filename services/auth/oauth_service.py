"""
OAuth Service for Cleo

Handles OAuth2 authentication with:
- Google Sign-In
- Microsoft 365 (Azure AD)
"""

import os
from datetime import datetime
from urllib.parse import urlencode
import requests
from flask import current_app, url_for

from models import db, User, OAuthAccount


class OAuthService:
    """Service for OAuth2 authentication"""

    # OAuth provider configurations
    PROVIDERS = {
        'google': {
            'authorize_url': 'https://accounts.google.com/o/oauth2/v2/auth',
            'token_url': 'https://oauth2.googleapis.com/token',
            'userinfo_url': 'https://www.googleapis.com/oauth2/v2/userinfo',
            'scopes': ['openid', 'email', 'profile'],
        },
        'microsoft': {
            'authorize_url': 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
            'token_url': 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
            'userinfo_url': 'https://graph.microsoft.com/v1.0/me',
            'scopes': ['openid', 'email', 'profile', 'User.Read'],
        }
    }

    def __init__(self):
        # Google OAuth settings
        self.google_client_id = os.getenv('GOOGLE_CLIENT_ID')
        self.google_client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

        # Microsoft OAuth settings
        self.microsoft_client_id = os.getenv('AZURE_CLIENT_ID')
        self.microsoft_client_secret = os.getenv('AZURE_CLIENT_SECRET')
        self.microsoft_tenant_id = os.getenv('AZURE_TENANT_ID', 'common')

        # Frontend URL for redirects
        self.frontend_url = os.getenv('FRONTEND_URL', 'https://www.okcleo.ai')

    def get_authorization_url(self, provider: str, state: str = None) -> str:
        """
        Get the OAuth authorization URL for a provider.

        Args:
            provider: 'google' or 'microsoft'
            state: Optional state parameter for CSRF protection

        Returns:
            Authorization URL to redirect user to
        """
        if provider not in self.PROVIDERS:
            raise ValueError(f"Unknown provider: {provider}")

        config = self.PROVIDERS[provider]

        if provider == 'google':
            client_id = self.google_client_id
            if not client_id:
                raise ValueError("GOOGLE_CLIENT_ID not configured")
        else:  # microsoft
            client_id = self.microsoft_client_id
            if not client_id:
                raise ValueError("AZURE_CLIENT_ID not configured")

        # Build callback URL
        callback_url = f"{os.getenv('API_URL', 'https://api.okcleo.ai')}/api/auth/oauth/{provider}/callback"

        # Build authorization URL
        params = {
            'client_id': client_id,
            'redirect_uri': callback_url,
            'response_type': 'code',
            'scope': ' '.join(config['scopes']),
            'access_type': 'offline',  # For refresh token
            'prompt': 'consent',  # Force consent to get refresh token
        }

        if state:
            params['state'] = state

        authorize_url = config['authorize_url']
        if provider == 'microsoft':
            authorize_url = authorize_url.format(tenant=self.microsoft_tenant_id)

        return f"{authorize_url}?{urlencode(params)}"

    def exchange_code_for_tokens(self, provider: str, code: str) -> dict:
        """
        Exchange authorization code for access/refresh tokens.

        Args:
            provider: 'google' or 'microsoft'
            code: Authorization code from OAuth callback

        Returns:
            Dict with access_token, refresh_token, expires_in
        """
        if provider not in self.PROVIDERS:
            raise ValueError(f"Unknown provider: {provider}")

        config = self.PROVIDERS[provider]

        if provider == 'google':
            client_id = self.google_client_id
            client_secret = self.google_client_secret
        else:  # microsoft
            client_id = self.microsoft_client_id
            client_secret = self.microsoft_client_secret

        callback_url = f"{os.getenv('API_URL', 'https://api.okcleo.ai')}/api/auth/oauth/{provider}/callback"

        token_url = config['token_url']
        if provider == 'microsoft':
            token_url = token_url.format(tenant=self.microsoft_tenant_id)

        data = {
            'client_id': client_id,
            'client_secret': client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': callback_url,
        }

        response = requests.post(token_url, data=data)

        if response.status_code != 200:
            current_app.logger.error(f"OAuth token exchange failed: {response.text}")
            raise Exception(f"Failed to exchange code: {response.text}")

        return response.json()

    def get_user_info(self, provider: str, access_token: str) -> dict:
        """
        Get user info from OAuth provider.

        Args:
            provider: 'google' or 'microsoft'
            access_token: OAuth access token

        Returns:
            Dict with id, email, name, picture
        """
        if provider not in self.PROVIDERS:
            raise ValueError(f"Unknown provider: {provider}")

        config = self.PROVIDERS[provider]

        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(config['userinfo_url'], headers=headers)

        if response.status_code != 200:
            current_app.logger.error(f"OAuth userinfo failed: {response.text}")
            raise Exception(f"Failed to get user info: {response.text}")

        data = response.json()

        # Normalize response across providers
        if provider == 'google':
            return {
                'id': data.get('id'),
                'email': data.get('email'),
                'name': data.get('name'),
                'picture': data.get('picture'),
            }
        else:  # microsoft
            return {
                'id': data.get('id'),
                'email': data.get('mail') or data.get('userPrincipalName'),
                'name': data.get('displayName'),
                'picture': None,  # Microsoft Graph doesn't return picture in basic profile
            }

    def find_or_create_user(self, provider: str, user_info: dict, tokens: dict) -> User:
        """
        Find existing user or create new one from OAuth info.

        Args:
            provider: 'google' or 'microsoft'
            user_info: User info from get_user_info()
            tokens: Token response from exchange_code_for_tokens()

        Returns:
            User object (existing or newly created)
        """
        provider_user_id = user_info['id']
        email = user_info['email']
        name = user_info.get('name', '')

        # First, check if we have an existing OAuth account
        oauth_account = OAuthAccount.query.filter_by(
            provider=provider,
            provider_user_id=provider_user_id
        ).first()

        if oauth_account:
            # Update tokens
            oauth_account.access_token = tokens.get('access_token')
            oauth_account.refresh_token = tokens.get('refresh_token', oauth_account.refresh_token)
            if tokens.get('expires_in'):
                from datetime import timedelta
                oauth_account.token_expires_at = datetime.now() + timedelta(seconds=tokens['expires_in'])
            oauth_account.updated_at = datetime.now()
            db.session.commit()

            # Update last login
            user = oauth_account.user
            user.last_login = datetime.now()
            db.session.commit()

            return user

        # Check if user exists with this email
        user = User.query.filter_by(email=email).first()

        if user:
            # Link OAuth account to existing user
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider=provider,
                provider_user_id=provider_user_id,
                provider_email=email,
                access_token=tokens.get('access_token'),
                refresh_token=tokens.get('refresh_token'),
            )
            if tokens.get('expires_in'):
                from datetime import timedelta
                oauth_account.token_expires_at = datetime.now() + timedelta(seconds=tokens['expires_in'])

            db.session.add(oauth_account)
            user.last_login = datetime.now()
            db.session.commit()

            return user

        # Create new user
        # Generate unique username from email
        base_username = email.split('@')[0].lower()
        username = base_username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}{counter}"
            counter += 1

        user = User(
            username=username,
            email=email,
            full_name=name,
            email_verified=True,  # OAuth emails are pre-verified
            is_active=True,
        )
        db.session.add(user)
        db.session.flush()  # Get user ID

        # Create OAuth account
        oauth_account = OAuthAccount(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=email,
            access_token=tokens.get('access_token'),
            refresh_token=tokens.get('refresh_token'),
        )
        if tokens.get('expires_in'):
            from datetime import timedelta
            oauth_account.token_expires_at = datetime.now() + timedelta(seconds=tokens['expires_in'])

        db.session.add(oauth_account)
        db.session.commit()

        return user

    def unlink_provider(self, user_id: int, provider: str) -> bool:
        """
        Unlink an OAuth provider from a user account.

        Args:
            user_id: User ID
            provider: Provider to unlink

        Returns:
            True if successful
        """
        user = User.query.get(user_id)
        if not user:
            return False

        # Check if user has other auth methods
        has_password = user.password_hash is not None
        oauth_count = OAuthAccount.query.filter_by(user_id=user_id).count()

        # Don't allow unlinking if it's the only auth method
        if not has_password and oauth_count <= 1:
            raise ValueError("Cannot unlink the only authentication method")

        # Delete the OAuth account
        OAuthAccount.query.filter_by(
            user_id=user_id,
            provider=provider
        ).delete()
        db.session.commit()

        return True

    def is_provider_configured(self, provider: str) -> bool:
        """Check if a provider is properly configured."""
        if provider == 'google':
            return bool(self.google_client_id and self.google_client_secret)
        elif provider == 'microsoft':
            return bool(self.microsoft_client_id and self.microsoft_client_secret)
        return False
