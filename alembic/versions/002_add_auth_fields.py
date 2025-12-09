"""Add authentication fields and OAuth/token tables

Revision ID: 002_auth_fields
Revises: 001_pgvector
Create Date: 2024-12-09

This migration adds:
- Email verification fields to users
- Password reset fields to users
- Account lockout fields to users
- JWT refresh token tracking
- OAuth accounts table
- Token blocklist table
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_auth_fields'
down_revision: Union[str, None] = '001_pgvector'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add authentication fields and tables"""

    # Add email verification fields to users
    try:
        op.add_column('users', sa.Column('email_verified', sa.Boolean(), server_default='false', nullable=True))
    except Exception:
        pass

    try:
        op.add_column('users', sa.Column('email_verification_token', sa.String(255), nullable=True))
    except Exception:
        pass

    try:
        op.add_column('users', sa.Column('email_verification_sent_at', sa.DateTime(), nullable=True))
    except Exception:
        pass

    # Add password reset fields to users
    try:
        op.add_column('users', sa.Column('password_reset_token', sa.String(255), nullable=True))
    except Exception:
        pass

    try:
        op.add_column('users', sa.Column('password_reset_expires_at', sa.DateTime(), nullable=True))
    except Exception:
        pass

    # Add account lockout fields to users
    try:
        op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), server_default='0', nullable=True))
    except Exception:
        pass

    try:
        op.add_column('users', sa.Column('locked_until', sa.DateTime(), nullable=True))
    except Exception:
        pass

    # Add JWT refresh token JTI to users
    try:
        op.add_column('users', sa.Column('refresh_token_jti', sa.String(255), nullable=True))
    except Exception:
        pass

    # Make password_hash nullable (for OAuth-only users)
    try:
        op.alter_column('users', 'password_hash',
                        existing_type=sa.String(255),
                        nullable=True)
    except Exception:
        pass

    # Set existing users as email_verified=True (they existed before verification was required)
    try:
        op.execute("UPDATE users SET email_verified = true WHERE email_verified IS NULL OR email_verified = false")
    except Exception:
        pass

    # Create oauth_accounts table
    op.create_table('oauth_accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('provider_user_id', sa.String(255), nullable=False),
        sa.Column('provider_email', sa.String(255), nullable=True),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('provider', 'provider_user_id', name='uq_oauth_provider_user')
    )

    # Create index on user_id for oauth_accounts
    op.create_index('ix_oauth_accounts_user_id', 'oauth_accounts', ['user_id'])

    # Create token_blocklist table
    op.create_table('token_blocklist',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('jti', sa.String(255), nullable=False),
        sa.Column('token_type', sa.String(20), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create unique index on jti for fast blocklist lookups
    op.create_index('ix_token_blocklist_jti', 'token_blocklist', ['jti'], unique=True)

    print("Authentication fields and tables created successfully")


def downgrade() -> None:
    """Remove authentication fields and tables"""

    # Drop token_blocklist table
    try:
        op.drop_index('ix_token_blocklist_jti', table_name='token_blocklist')
    except Exception:
        pass

    try:
        op.drop_table('token_blocklist')
    except Exception:
        pass

    # Drop oauth_accounts table
    try:
        op.drop_index('ix_oauth_accounts_user_id', table_name='oauth_accounts')
    except Exception:
        pass

    try:
        op.drop_table('oauth_accounts')
    except Exception:
        pass

    # Remove JWT fields from users
    try:
        op.drop_column('users', 'refresh_token_jti')
    except Exception:
        pass

    # Remove account lockout fields from users
    try:
        op.drop_column('users', 'locked_until')
    except Exception:
        pass

    try:
        op.drop_column('users', 'failed_login_attempts')
    except Exception:
        pass

    # Remove password reset fields from users
    try:
        op.drop_column('users', 'password_reset_expires_at')
    except Exception:
        pass

    try:
        op.drop_column('users', 'password_reset_token')
    except Exception:
        pass

    # Remove email verification fields from users
    try:
        op.drop_column('users', 'email_verification_sent_at')
    except Exception:
        pass

    try:
        op.drop_column('users', 'email_verification_token')
    except Exception:
        pass

    try:
        op.drop_column('users', 'email_verified')
    except Exception:
        pass

    # Make password_hash non-nullable again
    try:
        op.alter_column('users', 'password_hash',
                        existing_type=sa.String(255),
                        nullable=False)
    except Exception:
        pass
