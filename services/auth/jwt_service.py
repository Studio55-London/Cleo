"""
JWT Authentication Service for Cleo

Handles JWT token creation, validation, refresh, and blocklist management.
"""

from datetime import datetime, timedelta
from functools import wraps
from flask import current_app, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    verify_jwt_in_request
)

from models import db, User, TokenBlocklist


class JWTService:
    """Service for JWT token operations"""

    @staticmethod
    def create_tokens(user: User) -> dict:
        """
        Create access and refresh tokens for a user.

        Returns:
            dict with access_token, refresh_token, and expires_in
        """
        # Create access token with user identity
        access_token = create_access_token(
            identity=user.id,
            additional_claims={
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin
            }
        )

        # Create refresh token
        refresh_token = create_refresh_token(identity=user.id)

        # Get expiry time from config
        access_expires = current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', timedelta(minutes=15))
        if isinstance(access_expires, timedelta):
            expires_in = int(access_expires.total_seconds())
        else:
            expires_in = access_expires

        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': expires_in
        }

    @staticmethod
    def refresh_access_token() -> dict:
        """
        Create a new access token using the refresh token.

        Must be called within a request context with a valid refresh token.
        """
        identity = get_jwt_identity()
        user = User.query.get(identity)

        if not user:
            return None

        access_token = create_access_token(
            identity=user.id,
            additional_claims={
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin
            }
        )

        access_expires = current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', timedelta(minutes=15))
        if isinstance(access_expires, timedelta):
            expires_in = int(access_expires.total_seconds())
        else:
            expires_in = access_expires

        return {
            'access_token': access_token,
            'token_type': 'Bearer',
            'expires_in': expires_in
        }

    @staticmethod
    def revoke_token(jti: str, token_type: str, user_id: int, expires_at: datetime) -> bool:
        """
        Add a token to the blocklist.

        Args:
            jti: JWT ID from the token
            token_type: 'access' or 'refresh'
            user_id: ID of the user who owns the token
            expires_at: When the token expires

        Returns:
            True if successful
        """
        try:
            blocked_token = TokenBlocklist(
                jti=jti,
                token_type=token_type,
                user_id=user_id,
                revoked_at=datetime.now(),
                expires_at=expires_at
            )
            db.session.add(blocked_token)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error revoking token: {e}")
            return False

    @staticmethod
    def is_token_revoked(jwt_payload: dict) -> bool:
        """
        Check if a token has been revoked.

        This is used as a callback for Flask-JWT-Extended.
        """
        jti = jwt_payload.get('jti')
        token = TokenBlocklist.query.filter_by(jti=jti).first()
        return token is not None

    @staticmethod
    def revoke_all_user_tokens(user_id: int) -> bool:
        """
        Revoke all tokens for a user (logout from all devices).

        This adds a marker to block all tokens issued before now.
        In practice, this means we update the user's refresh_token_jti field
        which invalidates all previously issued refresh tokens.
        """
        try:
            user = User.query.get(user_id)
            if user:
                # Set a marker that invalidates old tokens
                user.refresh_token_jti = None
                db.session.commit()
                return True
            return False
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error revoking all tokens: {e}")
            return False

    @staticmethod
    def cleanup_expired_tokens() -> int:
        """
        Remove expired tokens from the blocklist.

        Returns:
            Number of tokens removed
        """
        try:
            result = TokenBlocklist.query.filter(
                TokenBlocklist.expires_at < datetime.now()
            ).delete()
            db.session.commit()
            return result
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error cleaning up tokens: {e}")
            return 0

    @staticmethod
    def get_current_user() -> User:
        """
        Get the current authenticated user from JWT.

        Must be called within a request context with a valid JWT.
        """
        try:
            verify_jwt_in_request()
            identity = get_jwt_identity()
            return User.query.get(identity)
        except Exception:
            return None


def jwt_required_verified(fn):
    """
    Decorator that requires a valid JWT AND verified email.

    Use this for endpoints that need email verification.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = JWTService.get_current_user()

        if not user:
            return jsonify({'error': 'User not found'}), 404

        if not user.email_verified:
            return jsonify({
                'error': 'Email not verified',
                'code': 'EMAIL_NOT_VERIFIED',
                'message': 'Please verify your email address to access this resource'
            }), 403

        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    """
    Decorator that requires admin privileges.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = JWTService.get_current_user()

        if not user:
            return jsonify({'error': 'User not found'}), 404

        if not user.is_admin:
            return jsonify({
                'error': 'Admin access required',
                'code': 'ADMIN_REQUIRED'
            }), 403

        return fn(*args, **kwargs)
    return wrapper
