"""
Cleo - AI Agent Workspace Application
Flask Backend with Spaces API

Supports deployment to:
- Local development (SQLite + ChromaDB)
- Azure production (PostgreSQL + pgvector + Azure Blob Storage)
"""
import os
import logging
import secrets
from datetime import datetime, timedelta
from flask import Flask, render_template, jsonify, request, redirect, url_for, session
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, get_jwt, create_access_token, create_refresh_token
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from models import db, User, Agent, Job, Activity, Space, Message, Document, DocumentChunk, Entity, Relation, Integration, Skill, Task, Notification, CalendarEvent, TaskTemplate, OAuthAccount, TokenBlocklist, seed_integrations
from services.task_service import TaskService
from services.calendar_service import CalendarService
from services.notification_service import NotificationService
from services.template_service import TaskTemplateService
from services.auth.jwt_service import JWTService
from services.auth.email_service import EmailService
from services.auth.oauth_service import OAuthService
from agents import get_agent, list_agent_names, agent_count
from knowledge_processor import get_processor
from integrations.todoist_helper import get_todoist_context
from skills.skill_manager import init_skill_manager, get_skill_manager
from skills.skill_parser import SkillParser, SkillParserError
from werkzeug.utils import secure_filename
import json

# Import configuration
from config.settings import (
    DATABASE_URI, SECRET_KEY, DEBUG, IS_AZURE, IS_PRODUCTION,
    USE_PGVECTOR, BLOB_STORAGE_ENABLED, LOG_LEVEL, LOCAL_DOCUMENT_PATH,
    JWT_SECRET_KEY, JWT_ACCESS_TOKEN_EXPIRES_SECONDS, JWT_REFRESH_TOKEN_EXPIRES_SECONDS,
    MAX_FAILED_LOGIN_ATTEMPTS, ACCOUNT_LOCKOUT_MINUTES, REDIS_URL, RATE_LIMIT_ENABLED,
    RATE_LIMITS, FRONTEND_URL, GOOGLE_OAUTH_ENABLED, MICROSOFT_OAUTH_ENABLED, EMAIL_ENABLED
)

# Configure logging
log_handlers = [logging.StreamHandler()]
if not IS_PRODUCTION:
    # Only write to file in development
    os.makedirs('data', exist_ok=True)
    log_handlers.append(logging.FileHandler('data/cleo.log'))

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=log_handlers
)
logger = logging.getLogger(__name__)

# Log startup environment
logger.info(f"Starting Cleo - Environment: {'Azure Production' if IS_AZURE else 'Local Development'}")
logger.info(f"Database: {'PostgreSQL' if 'postgresql' in DATABASE_URI else 'SQLite'}")
logger.info(f"Vector Store: {'pgvector' if USE_PGVECTOR else 'ChromaDB'}")
logger.info(f"Blob Storage: {'Azure Blob' if BLOB_STORAGE_ENABLED else 'Local'}")

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# PostgreSQL connection pool settings for production
if 'postgresql' in DATABASE_URI:
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 5,
        'pool_recycle': 300,
        'pool_pre_ping': True,
        'connect_args': {
            'connect_timeout': 30,
            'options': '-c statement_timeout=60000'  # 60 second statement timeout
        }
    }

# File upload configuration
app.config['UPLOAD_FOLDER'] = str(LOCAL_DOCUMENT_PATH) if not BLOB_STORAGE_ENABLED else 'data/knowledge/documents'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'doc', 'txt', 'md'}

# Ensure upload directory exists (for local storage)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize extensions
db.init_app(app)
CORS(app)

# Import vector store based on configuration
if USE_PGVECTOR:
    from vector_store_pgvector import get_vector_store
    logger.info("Using pgvector for vector search")
else:
    from vector_store import get_vector_store
    logger.info("Using ChromaDB for vector search")

# Import blob storage service
from services.blob_storage_service import get_blob_storage_service

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login"""
    return db.session.get(User, int(user_id))

# ============================================================================
# JWT AUTHENTICATION CONFIGURATION
# ============================================================================
app.config['JWT_SECRET_KEY'] = JWT_SECRET_KEY
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(seconds=JWT_ACCESS_TOKEN_EXPIRES_SECONDS)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(seconds=JWT_REFRESH_TOKEN_EXPIRES_SECONDS)
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

# Initialize JWT
jwt = JWTManager(app)

@jwt.token_in_blocklist_loader
def check_if_token_in_blocklist(jwt_header, jwt_payload):
    """Check if token is in blocklist (revoked)"""
    jti = jwt_payload.get('jti')
    token = TokenBlocklist.query.filter_by(jti=jti).first()
    return token is not None

@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    """Load user from JWT identity"""
    identity = jwt_data['sub']
    return User.query.get(identity)

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    """Handle expired tokens"""
    return jsonify({
        'success': False,
        'error': 'Token has expired',
        'code': 'TOKEN_EXPIRED'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    """Handle invalid tokens"""
    return jsonify({
        'success': False,
        'error': 'Invalid token',
        'code': 'INVALID_TOKEN'
    }), 401

@jwt.unauthorized_loader
def unauthorized_callback(error):
    """Handle missing tokens"""
    return jsonify({
        'success': False,
        'error': 'Authorization required',
        'code': 'AUTH_REQUIRED'
    }), 401

# ============================================================================
# RATE LIMITING CONFIGURATION
# ============================================================================
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    storage_uri=REDIS_URL,
    enabled=RATE_LIMIT_ENABLED,
    default_limits=[RATE_LIMITS.get('api_default', '100/minute')]
)

# Initialize auth services
email_service = EmailService()
oauth_service = OAuthService()

# ===================================
# Web Routes
# ===================================

@app.route('/')
def index():
    """Main Spaces interface"""
    return render_template('spaces.html')

@app.route('/dashboard')
def dashboard():
    """Legacy dashboard (if exists)"""
    return render_template('dashboard.html')

# ===================================
# Helper Functions
# ===================================

def get_personal_agent_ids():
    """Get all agent IDs with Personal tier"""
    personal_agents = Agent.query.filter(
        db.func.lower(Agent.type) == 'personal'
    ).all()
    return [agent.id for agent in personal_agents]


def create_default_personal_space(user_id=None):
    """Create a default Personal space with all Personal tier agents"""
    # Check if Personal space already exists
    existing = Space.query.filter_by(name='Personal').first()
    if existing:
        # Update with any new Personal agents
        current_ids = set(existing.get_agents())
        personal_ids = set(get_personal_agent_ids())
        if personal_ids - current_ids:  # New agents to add
            existing.set_agents(list(current_ids | personal_ids))
            db.session.commit()
            logger.info(f"Updated Personal space with new agents: {personal_ids - current_ids}")
        return existing

    # Create new Personal space
    personal_agent_ids = get_personal_agent_ids()
    space = Space(
        name='Personal',
        description='Your personal space with Coach and HealthFit agents for personal development, goal setting, health, and wellness.'
    )
    space.set_agents(personal_agent_ids)
    db.session.add(space)
    db.session.commit()
    logger.info(f"Created default Personal space with agents: {personal_agent_ids}")
    return space


def sync_personal_agents_to_spaces():
    """Ensure all Personal spaces have all Personal tier agents"""
    personal_agent_ids = set(get_personal_agent_ids())
    personal_spaces = Space.query.filter_by(name='Personal').all()

    for space in personal_spaces:
        current_ids = set(space.get_agents())
        if personal_agent_ids - current_ids:  # Missing agents
            space.set_agents(list(current_ids | personal_agent_ids))
            logger.info(f"Synced Personal space {space.id} with agents: {personal_agent_ids}")

    if personal_spaces:
        db.session.commit()


# ===================================
# API Routes - JWT Authentication
# ===================================

@app.route('/api/auth/register', methods=['POST'])
@limiter.limit(RATE_LIMITS.get('register', '3/minute'))
def register():
    """Register a new user with email verification"""
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('full_name', '')

        if not username or not email or not password:
            return jsonify({
                'success': False,
                'message': 'Username, email, and password are required'
            }), 400

        # Validate password strength
        if len(password) < 8:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 8 characters long'
            }), 400

        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({
                'success': False,
                'message': 'Username already exists'
            }), 400

        if User.query.filter_by(email=email).first():
            return jsonify({
                'success': False,
                'message': 'Email already exists'
            }), 400

        # Create new user
        user = User(username=username, email=email, full_name=full_name)
        user.set_password(password)
        user.email_verified = not EMAIL_ENABLED  # Auto-verify if email not configured

        db.session.add(user)
        db.session.flush()  # Get user ID

        # Send verification email if email service is enabled
        if EMAIL_ENABLED:
            verification_token = user.generate_verification_token()
            db.session.commit()
            email_service.send_verification_email(user.email, user.full_name or user.username, verification_token)
            logger.info(f"New user registered (pending verification): {username}")

            return jsonify({
                'success': True,
                'message': 'Registration successful. Please check your email to verify your account.',
                'requires_verification': True
            })
        else:
            # Email disabled - auto-verify and return tokens
            db.session.commit()

            # Create default Personal space for the user
            create_default_personal_space(user.id)

            # Generate JWT tokens
            access_token = create_access_token(identity=user.id, additional_claims={
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin
            })
            refresh_token = create_refresh_token(identity=user.id)

            user.last_login = datetime.now()
            db.session.commit()

            logger.info(f"New user registered: {username}")

            return jsonify({
                'success': True,
                'user': user.to_dict(),
                'access_token': access_token,
                'refresh_token': refresh_token,
                'token_type': 'Bearer',
                'expires_in': JWT_ACCESS_TOKEN_EXPIRES_SECONDS,
                'message': 'Registration successful'
            })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Registration error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/auth/login', methods=['POST'])
@limiter.limit(RATE_LIMITS.get('login', '5/minute'))
def login():
    """Log in a user with JWT tokens"""
    try:
        data = request.get_json()
        email_or_username = data.get('email') or data.get('username')
        password = data.get('password')

        if not email_or_username or not password:
            return jsonify({
                'success': False,
                'message': 'Email/username and password are required'
            }), 400

        # Find user by email or username
        user = User.query.filter(
            (User.email == email_or_username) | (User.username == email_or_username)
        ).first()

        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid credentials'
            }), 401

        # Check if account is locked
        if user.is_locked():
            return jsonify({
                'success': False,
                'message': 'Account is temporarily locked. Please try again later.',
                'code': 'ACCOUNT_LOCKED'
            }), 403

        # Check password
        if not user.check_password(password):
            user.record_failed_login(MAX_FAILED_LOGIN_ATTEMPTS, ACCOUNT_LOCKOUT_MINUTES)
            db.session.commit()

            if user.is_locked():
                return jsonify({
                    'success': False,
                    'message': 'Too many failed attempts. Account is temporarily locked.',
                    'code': 'ACCOUNT_LOCKED'
                }), 403

            return jsonify({
                'success': False,
                'message': 'Invalid credentials'
            }), 401

        # Check if account is active
        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Account is disabled',
                'code': 'ACCOUNT_DISABLED'
            }), 403

        # Check email verification
        if not user.email_verified:
            return jsonify({
                'success': False,
                'message': 'Please verify your email address',
                'code': 'EMAIL_NOT_VERIFIED'
            }), 403

        # Reset failed login attempts on successful login
        user.reset_login_attempts()
        user.last_login = datetime.now()
        db.session.commit()

        # Generate JWT tokens
        access_token = create_access_token(identity=user.id, additional_claims={
            'username': user.username,
            'email': user.email,
            'is_admin': user.is_admin
        })
        refresh_token = create_refresh_token(identity=user.id)

        logger.info(f"User logged in: {user.username}")

        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': JWT_ACCESS_TOKEN_EXPIRES_SECONDS,
            'message': 'Login successful'
        })

    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    """Log out and revoke the current JWT token"""
    try:
        jwt_data = get_jwt()
        jti = jwt_data['jti']
        user_id = get_jwt_identity()
        token_type = jwt_data.get('type', 'access')
        expires_at = datetime.fromtimestamp(jwt_data['exp'])

        # Add token to blocklist
        blocked_token = TokenBlocklist(
            jti=jti,
            token_type=token_type,
            user_id=user_id,
            revoked_at=datetime.now(),
            expires_at=expires_at
        )
        db.session.add(blocked_token)
        db.session.commit()

        logger.info(f"User logged out: {user_id}")

        return jsonify({
            'success': True,
            'message': 'Logout successful'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Logout error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit("30/minute")
def refresh_token():
    """Refresh access token using refresh token"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or not user.is_active:
            return jsonify({
                'success': False,
                'message': 'User not found or inactive'
            }), 401

        # Generate new access token
        access_token = create_access_token(identity=user.id, additional_claims={
            'username': user.username,
            'email': user.email,
            'is_admin': user.is_admin
        })

        return jsonify({
            'success': True,
            'access_token': access_token,
            'token_type': 'Bearer',
            'expires_in': JWT_ACCESS_TOKEN_EXPIRES_SECONDS
        })

    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user_jwt():
    """Get current authenticated user info (JWT)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        return jsonify({
            'success': True,
            'user': user.to_dict()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/auth/verify-email', methods=['POST'])
@limiter.limit(RATE_LIMITS.get('email_verification', '5/hour'))
def verify_email():
    """Verify email address with token"""
    try:
        data = request.get_json()
        token = data.get('token')

        if not token:
            return jsonify({
                'success': False,
                'message': 'Verification token is required'
            }), 400

        # Find user by verification token
        user = User.query.filter_by(email_verification_token=token).first()

        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid or expired verification token'
            }), 400

        # Verify email
        user.email_verified = True
        user.email_verification_token = None
        user.email_verification_sent_at = None
        db.session.commit()

        # Create default Personal space for the user
        create_default_personal_space(user.id)

        # Generate JWT tokens
        access_token = create_access_token(identity=user.id, additional_claims={
            'username': user.username,
            'email': user.email,
            'is_admin': user.is_admin
        })
        refresh_token = create_refresh_token(identity=user.id)

        user.last_login = datetime.now()
        db.session.commit()

        # Send welcome email
        if EMAIL_ENABLED:
            email_service.send_welcome_email(user.email, user.full_name or user.username)

        logger.info(f"Email verified for user: {user.username}")

        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': JWT_ACCESS_TOKEN_EXPIRES_SECONDS,
            'message': 'Email verified successfully'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Email verification error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/auth/resend-verification', methods=['POST'])
@limiter.limit(RATE_LIMITS.get('email_verification', '5/hour'))
def resend_verification():
    """Resend verification email"""
    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400

        user = User.query.filter_by(email=email).first()

        if not user:
            # Don't reveal whether email exists
            return jsonify({
                'success': True,
                'message': 'If the email exists, a verification link has been sent'
            })

        if user.email_verified:
            return jsonify({
                'success': False,
                'message': 'Email is already verified'
            }), 400

        # Generate new verification token
        verification_token = user.generate_verification_token()
        db.session.commit()

        # Send verification email
        if EMAIL_ENABLED:
            email_service.send_verification_email(user.email, user.full_name or user.username, verification_token)

        return jsonify({
            'success': True,
            'message': 'Verification email sent'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Resend verification error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/auth/forgot-password', methods=['POST'])
@limiter.limit(RATE_LIMITS.get('password_reset', '3/hour'))
def forgot_password():
    """Request password reset email"""
    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400

        user = User.query.filter_by(email=email).first()

        # Always return success to prevent email enumeration
        if user and EMAIL_ENABLED:
            reset_token = user.generate_password_reset_token()
            db.session.commit()
            email_service.send_password_reset_email(user.email, user.full_name or user.username, reset_token)

        return jsonify({
            'success': True,
            'message': 'If the email exists, a password reset link has been sent'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Forgot password error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset password with token"""
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('password')

        if not token or not new_password:
            return jsonify({
                'success': False,
                'message': 'Token and new password are required'
            }), 400

        if len(new_password) < 8:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 8 characters long'
            }), 400

        # Find user by reset token
        user = User.query.filter_by(password_reset_token=token).first()

        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid or expired reset token'
            }), 400

        # Check if token is expired
        if user.password_reset_expires_at and user.password_reset_expires_at < datetime.now():
            return jsonify({
                'success': False,
                'message': 'Reset token has expired'
            }), 400

        # Update password
        user.set_password(new_password)
        user.clear_password_reset_token()
        user.reset_login_attempts()  # Reset any lockout
        db.session.commit()

        # Send notification email
        if EMAIL_ENABLED:
            email_service.send_password_changed_notification(user.email, user.full_name or user.username)

        logger.info(f"Password reset for user: {user.username}")

        return jsonify({
            'success': True,
            'message': 'Password reset successfully. You can now log in with your new password.'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Password reset error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ===================================
# OAuth Routes
# ===================================

@app.route('/api/auth/oauth/<provider>/authorize', methods=['GET'])
def oauth_authorize(provider):
    """Get OAuth authorization URL"""
    try:
        if provider not in ['google', 'microsoft']:
            return jsonify({
                'success': False,
                'message': 'Invalid OAuth provider'
            }), 400

        if provider == 'google' and not GOOGLE_OAUTH_ENABLED:
            return jsonify({
                'success': False,
                'message': 'Google OAuth is not configured'
            }), 400

        if provider == 'microsoft' and not MICROSOFT_OAUTH_ENABLED:
            return jsonify({
                'success': False,
                'message': 'Microsoft OAuth is not configured'
            }), 400

        # Generate state for CSRF protection
        state = secrets.token_urlsafe(32)
        session['oauth_state'] = state

        auth_url = oauth_service.get_authorization_url(provider, state)

        return jsonify({
            'success': True,
            'authorization_url': auth_url
        })

    except Exception as e:
        logger.error(f"OAuth authorize error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/auth/oauth/<provider>/callback', methods=['GET'])
def oauth_callback(provider):
    """Handle OAuth callback"""
    try:
        code = request.args.get('code')
        state = request.args.get('state')
        error = request.args.get('error')

        if error:
            return redirect(f"{FRONTEND_URL}/login?error={error}")

        if not code:
            return redirect(f"{FRONTEND_URL}/login?error=no_code")

        # Exchange code for tokens
        tokens = oauth_service.exchange_code_for_tokens(provider, code)

        # Get user info
        user_info = oauth_service.get_user_info(provider, tokens['access_token'])

        # Find or create user
        user = oauth_service.find_or_create_user(provider, user_info, tokens)

        # Generate JWT tokens
        access_token = create_access_token(identity=user.id, additional_claims={
            'username': user.username,
            'email': user.email,
            'is_admin': user.is_admin
        })
        refresh_token = create_refresh_token(identity=user.id)

        # Redirect to frontend with tokens
        callback_url = f"{FRONTEND_URL}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"

        logger.info(f"OAuth login successful for user: {user.username} via {provider}")

        return redirect(callback_url)

    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        return redirect(f"{FRONTEND_URL}/login?error=oauth_failed")


@app.route('/api/auth/oauth/providers', methods=['GET'])
def oauth_providers():
    """Get available OAuth providers"""
    return jsonify({
        'success': True,
        'providers': {
            'google': {
                'enabled': GOOGLE_OAUTH_ENABLED,
                'name': 'Google'
            },
            'microsoft': {
                'enabled': MICROSOFT_OAUTH_ENABLED,
                'name': 'Microsoft'
            }
        }
    })


# ===================================
# API Routes - Agents
# ===================================

@app.route('/api/agents', methods=['GET'])
def get_agents():
    """Get all available agents"""
    try:
        agents = Agent.query.all()
        agents_list = []

        for agent in agents:
            agents_list.append({
                'id': agent.id,
                'name': agent.name,
                'tier': agent.type,  # master, personal, team, worker, expert
                'status': 'online'
            })

        return jsonify({
            'success': True,
            'agents': agents_list
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/agents/<agent_name>', methods=['GET'])
def get_agent_info(agent_name):
    """Get specific agent information"""
    try:
        agent = Agent.query.filter_by(name=agent_name).first()

        if not agent:
            return jsonify({
                'success': False,
                'message': 'Agent not found'
            }), 404

        return jsonify({
            'success': True,
            'agent': {
                'id': agent.id,
                'name': agent.name,
                'tier': agent.type,
                'status': 'online'
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# ===================================
# API Routes - Spaces
# ===================================

@app.route('/api/spaces', methods=['GET'])
def get_spaces():
    """Get all spaces with custom ordering: Chat with Cleo first, Personal second, then alphabetically"""
    try:
        spaces = Space.query.all()

        # Custom sort: "Chat with Cleo" first, "Personal" second, then alphabetical
        def space_sort_key(space):
            name = space.name.lower()
            if name == 'chat with cleo':
                return (0, '')  # First
            elif name == 'personal':
                return (1, '')  # Second
            else:
                return (2, name)  # Alphabetical

        spaces.sort(key=space_sort_key)
        spaces_list = [space.to_dict() for space in spaces]

        return jsonify({
            'success': True,
            'spaces': spaces_list
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/spaces', methods=['POST'])
def create_space():
    """Create a new space"""
    try:
        data = request.get_json()

        if not data.get('name'):
            return jsonify({
                'success': False,
                'message': 'Space name is required'
            }), 400

        # Create new space
        space = Space(
            name=data['name'],
            description=data.get('description', '')
        )

        # Set master agent if provided
        if data.get('master_agent_id'):
            master_agent = db.session.get(Agent, int(data['master_agent_id']))
            if master_agent:
                space.master_agent_id = master_agent.id
            else:
                return jsonify({
                    'success': False,
                    'message': 'Master agent not found'
                }), 404

        # Set agent IDs
        agent_ids = data.get('agent_ids', [])
        space.set_agents([int(aid) for aid in agent_ids])

        # Save to database
        db.session.add(space)
        db.session.commit()

        return jsonify({
            'success': True,
            'space': space.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/spaces/<space_id>', methods=['GET'])
def get_space(space_id):
    """Get a specific space with messages"""
    try:
        # Find space
        space = db.session.get(Space, int(space_id))

        if not space:
            return jsonify({
                'success': False,
                'message': 'Space not found'
            }), 404

        # Get messages
        messages = Message.query.filter_by(space_id=int(space_id)).order_by(Message.timestamp).all()
        messages_list = [msg.to_dict() for msg in messages]

        return jsonify({
            'success': True,
            'space': space.to_dict(),
            'messages': messages_list
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/spaces/<space_id>', methods=['PUT'])
def update_space(space_id):
    """Update a space"""
    try:
        data = request.get_json()

        # Find space
        space = db.session.get(Space, int(space_id))

        if not space:
            return jsonify({
                'success': False,
                'message': 'Space not found'
            }), 404

        # Update fields
        if 'name' in data:
            space.name = data['name']
        if 'description' in data:
            space.description = data['description']

        # Update master agent if provided
        if 'master_agent_id' in data:
            if data['master_agent_id'] is None:
                space.master_agent_id = None
            else:
                master_agent = db.session.get(Agent, int(data['master_agent_id']))
                if master_agent:
                    space.master_agent_id = master_agent.id
                else:
                    return jsonify({
                        'success': False,
                        'message': 'Master agent not found'
                    }), 404

        space.updated_at = datetime.now()

        db.session.commit()

        return jsonify({
            'success': True,
            'space': space.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/spaces/<space_id>', methods=['DELETE'])
def delete_space(space_id):
    """Delete a space"""
    try:
        # Find space
        space = db.session.get(Space, int(space_id))

        if not space:
            return jsonify({
                'success': False,
                'message': 'Space not found'
            }), 404

        # Delete space (cascade will delete messages)
        db.session.delete(space)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Space deleted'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# ===================================
# API Routes - Space Agents
# ===================================

@app.route('/api/spaces/<space_id>/agents', methods=['POST'])
def add_agents_to_space(space_id):
    """Add agents to a space"""
    try:
        data = request.get_json()
        agent_ids = data.get('agent_ids', [])

        # Find space
        space = db.session.get(Space, int(space_id))

        if not space:
            return jsonify({
                'success': False,
                'message': 'Space not found'
            }), 404

        # Get existing agent IDs
        existing_ids = space.get_agents()

        # Add new agents
        for agent_id in agent_ids:
            if int(agent_id) not in existing_ids:
                # Verify agent exists
                agent = db.session.get(Agent, int(agent_id))
                if agent:
                    existing_ids.append(int(agent_id))

        # Update space
        space.set_agents(existing_ids)
        space.updated_at = datetime.now()

        db.session.commit()

        return jsonify({
            'success': True,
            'space': space.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/spaces/<space_id>/agents/<agent_id>', methods=['DELETE'])
def remove_agent_from_space(space_id, agent_id):
    """Remove an agent from a space"""
    try:
        # Find space
        space = db.session.get(Space, int(space_id))

        if not space:
            return jsonify({
                'success': False,
                'message': 'Space not found'
            }), 404

        # Get agent IDs and remove the specified one
        agent_ids = space.get_agents()
        agent_ids = [aid for aid in agent_ids if aid != int(agent_id)]

        # Update space
        space.set_agents(agent_ids)
        space.updated_at = datetime.now()

        db.session.commit()

        return jsonify({
            'success': True,
            'space': space.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# ===================================
# API Routes - Messages
# ===================================

@app.route('/api/spaces/<space_id>/messages', methods=['POST'])
def send_message(space_id):
    """Send a message in a space"""
    try:
        data = request.get_json()
        message_text = data.get('message', '').strip()
        mentions = data.get('mentions', [])

        if not message_text:
            return jsonify({
                'success': False,
                'message': 'Message is required'
            }), 400

        # Find space
        space = db.session.get(Space, int(space_id))

        if not space:
            return jsonify({
                'success': False,
                'message': 'Space not found'
            }), 404

        # Create and save user message
        user_msg = Message(
            space_id=int(space_id),
            role='user',
            author='Andrew Smart',
            content=message_text
        )
        if mentions:
            user_msg.set_mentions(mentions)

        db.session.add(user_msg)
        db.session.commit()

        user_message = user_msg.to_dict()

        # Get response from agent(s)
        agent_response = None

        # Determine which agent to use
        target_agent = None

        # Get space agents as dict
        space_dict = space.to_dict()
        space_agents = space_dict['agents']

        if mentions and len(mentions) > 0:
            # If @mentioned, use the first mentioned agent
            mentioned_agent_name = mentions[0].lower()

            # Find the agent in the space
            for agent_info in space_agents:
                if agent_info['name'].lower() == mentioned_agent_name:
                    target_agent = agent_info
                    break

            # If mentioned agent not in space, try to get it anyway (for flexibility)
            if not target_agent:
                agent_db = Agent.query.filter(
                    db.func.lower(Agent.name) == mentioned_agent_name
                ).first()

                if agent_db:
                    target_agent = {
                        'name': agent_db.name,
                        'tier': agent_db.type,
                        'id': agent_db.id
                    }

        elif space_agents:
            # No @mention, use first agent in space
            target_agent = space_agents[0]

        if target_agent:
            agent_name = target_agent['name'].lower()

            # Try to get agent instance
            agent_instance = get_agent(agent_name)

            if agent_instance:
                try:
                    # Send message to agent (strip @mentions for cleaner context)
                    clean_message = message_text
                    for mention in mentions:
                        clean_message = clean_message.replace(f'@{mention}', mention)

                    # Query knowledge base for relevant context (RAG)
                    knowledge_context = None
                    retrieved_sources = []

                    try:
                        vector_store = get_vector_store()
                        search_results = vector_store.search(clean_message, n_results=3)

                        if search_results:
                            # Build context from retrieved documents
                            context_parts = []
                            for idx, result in enumerate(search_results, 1):
                                doc_id = result['metadata'].get('document_id')
                                document = db.session.get(Document, doc_id)

                                if document:
                                    context_parts.append(
                                        f"[Source {idx}: {document.name}]\n{result['content']}\n"
                                    )
                                    retrieved_sources.append({
                                        'document_id': document.id,
                                        'document_name': document.name,
                                        'chunk_index': result['metadata'].get('chunk_index'),
                                        'relevance': result['relevance']
                                    })

                            if context_parts:
                                knowledge_context = (
                                    "The following information from the knowledge base may be relevant:\n\n" +
                                    "\n".join(context_parts) +
                                    "\n---\n\n"
                                )
                    except Exception as e:
                        logger.warning(f"Knowledge retrieval failed: {e}")

                    # Get integration context (Todoist tasks if connected)
                    integration_context = None
                    try:
                        # Check if Todoist is connected and get tasks
                        todoist_integration = Integration.query.filter_by(name='todoist').first()
                        if todoist_integration and todoist_integration.status == 'connected':
                            todoist_config = todoist_integration.get_config()
                            api_token = todoist_config.get('api_token')
                            if api_token:
                                # Only fetch Todoist context if message mentions tasks/todo/todoist
                                task_keywords = ['task', 'todo', 'todoist', 'priority', 'due', 'deadline', 'schedule', 'what do i have', 'what am i working on', 'my tasks', 'assignments']
                                if any(kw in clean_message.lower() for kw in task_keywords):
                                    integration_context = get_todoist_context(api_token)
                                    logger.info("Todoist context injected into agent message")
                    except Exception as e:
                        logger.warning(f"Integration context retrieval failed: {e}")

                    # Prepare message for agent (with knowledge and integration context)
                    agent_message = clean_message
                    context_parts_list = []

                    if knowledge_context:
                        context_parts_list.append(knowledge_context)

                    if integration_context:
                        context_parts_list.append(integration_context)

                    if context_parts_list:
                        agent_message = "\n".join(context_parts_list) + "\nUser question: " + clean_message

                    # Send to agent
                    response_text = agent_instance.run(agent_message)

                    # Create and save agent response
                    agent_msg = Message(
                        space_id=int(space_id),
                        role='agent',
                        author=target_agent['name'],
                        agent_name=target_agent['name'],
                        agent_tier=target_agent['tier'],
                        content=response_text
                    )

                    # Store retrieved sources in metadata for citations
                    if retrieved_sources:
                        agent_msg.set_citations(retrieved_sources)

                    db.session.add(agent_msg)
                    db.session.commit()

                    agent_response = agent_msg.to_dict()

                except Exception as e:
                    app.logger.error(f"Error running agent {agent_name}: {e}")

                    # Create error message
                    error_msg = Message(
                        space_id=int(space_id),
                        role='agent',
                        author='System',
                        agent_name='System',
                        agent_tier='master',
                        content=f"Sorry, I encountered an error: {str(e)}"
                    )

                    db.session.add(error_msg)
                    db.session.commit()

                    agent_response = error_msg.to_dict()

        return jsonify({
            'success': True,
            'message': user_message,
            'response': agent_response
        })

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error in send_message: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/spaces/<space_id>/messages', methods=['GET'])
def get_messages(space_id):
    """Get messages in a space with pagination and search"""
    try:
        # Find space
        space = db.session.get(Space, int(space_id))

        if not space:
            return jsonify({
                'success': False,
                'message': 'Space not found'
            }), 404

        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '', type=str)

        # Validate pagination parameters
        if page < 1:
            page = 1
        if per_page < 1 or per_page > 100:
            per_page = 50

        # Build query
        query = Message.query.filter_by(space_id=int(space_id))

        # Apply search filter if provided
        if search:
            search_pattern = f'%{search}%'
            query = query.filter(
                db.or_(
                    Message.content.ilike(search_pattern),
                    Message.author.ilike(search_pattern),
                    Message.agent_name.ilike(search_pattern)
                )
            )

        # Order by timestamp descending (newest first)
        query = query.order_by(Message.timestamp.desc())

        # Apply pagination
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        messages_list = [msg.to_dict() for msg in pagination.items]

        return jsonify({
            'success': True,
            'messages': messages_list,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# ===================================
# API Routes - Agents (Update/Delete)
# ===================================

@app.route('/api/agents/<int:agent_id>', methods=['PUT'])
def update_agent(agent_id):
    """Update an agent"""
    try:
        agent = db.session.get(Agent, agent_id)

        if not agent:
            return jsonify({
                'success': False,
                'message': 'Agent not found'
            }), 404

        data = request.get_json()

        # Update fields
        if 'name' in data:
            agent.name = data['name']
        if 'description' in data:
            agent.description = data['description']
        if 'status' in data:
            agent.status = data['status']

        db.session.commit()

        return jsonify({
            'success': True,
            'agent': agent.to_dict(),
            'message': 'Agent updated successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/agents/<int:agent_id>', methods=['DELETE'])
def delete_agent(agent_id):
    """Delete an agent"""
    try:
        agent = db.session.get(Agent, agent_id)

        if not agent:
            return jsonify({
                'success': False,
                'message': 'Agent not found'
            }), 404

        # Prevent deletion of seeded agents (optional check)
        if agent.id <= 31:  # First 31 are seeded agents
            return jsonify({
                'success': False,
                'message': 'Cannot delete system agents'
            }), 403

        db.session.delete(agent)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Agent deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ===================================
# API Routes - Jobs (Full CRUD)
# ===================================

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    """Get all jobs"""
    try:
        jobs = Job.query.order_by(Job.created_at.desc()).all()
        jobs_list = [job.to_dict() for job in jobs]

        return jsonify({
            'success': True,
            'jobs': jobs_list
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/jobs/<int:job_id>', methods=['GET'])
def get_job(job_id):
    """Get a specific job"""
    try:
        job = db.session.get(Job, job_id)

        if not job:
            return jsonify({
                'success': False,
                'message': 'Job not found'
            }), 404

        return jsonify({
            'success': True,
            'job': job.to_dict()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/jobs', methods=['POST'])
def create_job():
    """Create a new job"""
    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('agent_id'):
            return jsonify({
                'success': False,
                'message': 'agent_id is required'
            }), 400

        if not data.get('name'):
            return jsonify({
                'success': False,
                'message': 'name is required'
            }), 400

        # Check if agent exists
        agent = db.session.get(Agent, data['agent_id'])
        if not agent:
            return jsonify({
                'success': False,
                'message': 'Agent not found'
            }), 404

        # Create job
        job = Job(
            agent_id=data['agent_id'],
            name=data['name'],
            description=data.get('description', ''),
            frequency=data.get('frequency', 'manual'),
            cron_expression=data.get('cron_expression'),
            sop=data.get('sop', ''),
            status=data.get('status', 'active')
        )

        db.session.add(job)
        db.session.commit()

        return jsonify({
            'success': True,
            'job': job.to_dict(),
            'message': 'Job created successfully'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/jobs/<int:job_id>', methods=['PUT'])
def update_job(job_id):
    """Update a job"""
    try:
        job = db.session.get(Job, job_id)

        if not job:
            return jsonify({
                'success': False,
                'message': 'Job not found'
            }), 404

        data = request.get_json()

        # Update fields
        if 'name' in data:
            job.name = data['name']
        if 'description' in data:
            job.description = data['description']
        if 'frequency' in data:
            job.frequency = data['frequency']
        if 'cron_expression' in data:
            job.cron_expression = data['cron_expression']
        if 'sop' in data:
            job.sop = data['sop']
        if 'status' in data:
            job.status = data['status']
        if 'last_run' in data:
            job.last_run = data['last_run']
        if 'next_run' in data:
            job.next_run = data['next_run']

        db.session.commit()

        return jsonify({
            'success': True,
            'job': job.to_dict(),
            'message': 'Job updated successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/jobs/<int:job_id>', methods=['DELETE'])
def delete_job(job_id):
    """Delete a job"""
    try:
        job = db.session.get(Job, job_id)

        if not job:
            return jsonify({
                'success': False,
                'message': 'Job not found'
            }), 404

        db.session.delete(job)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Job deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ===================================
# API Routes - Activities (CRUD)
# ===================================

@app.route('/api/activities', methods=['GET'])
def get_activities():
    """Get all activities with optional filtering"""
    try:
        # Get query parameters for filtering
        agent_id = request.args.get('agent_id', type=int)
        job_id = request.args.get('job_id', type=int)
        status = request.args.get('status')
        limit = request.args.get('limit', 50, type=int)

        # Build query
        query = Activity.query

        if agent_id:
            query = query.filter_by(agent_id=agent_id)
        if job_id:
            query = query.filter_by(job_id=job_id)
        if status:
            query = query.filter_by(status=status)

        # Order by most recent first and limit
        activities = query.order_by(Activity.created_at.desc()).limit(limit).all()
        activities_list = [activity.to_dict() for activity in activities]

        return jsonify({
            'success': True,
            'activities': activities_list
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/activities/<int:activity_id>', methods=['GET'])
def get_activity(activity_id):
    """Get a specific activity"""
    try:
        activity = db.session.get(Activity, activity_id)

        if not activity:
            return jsonify({
                'success': False,
                'message': 'Activity not found'
            }), 404

        return jsonify({
            'success': True,
            'activity': activity.to_dict()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/activities', methods=['POST'])
def create_activity():
    """Create a new activity"""
    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('agent_id'):
            return jsonify({
                'success': False,
                'message': 'agent_id is required'
            }), 400

        if not data.get('title'):
            return jsonify({
                'success': False,
                'message': 'title is required'
            }), 400

        # Create activity
        activity = Activity(
            agent_id=data['agent_id'],
            job_id=data.get('job_id'),
            title=data['title'],
            summary=data.get('summary', ''),
            output_data=data.get('output_data'),
            status=data.get('status', 'success')
        )

        db.session.add(activity)
        db.session.commit()

        return jsonify({
            'success': True,
            'activity': activity.to_dict(),
            'message': 'Activity created successfully'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/activities/<int:activity_id>', methods=['PUT'])
def update_activity(activity_id):
    """Update an activity"""
    try:
        activity = db.session.get(Activity, activity_id)

        if not activity:
            return jsonify({
                'success': False,
                'message': 'Activity not found'
            }), 404

        data = request.get_json()

        # Update fields
        if 'title' in data:
            activity.title = data['title']
        if 'summary' in data:
            activity.summary = data['summary']
        if 'output_data' in data:
            activity.output_data = data['output_data']
        if 'status' in data:
            activity.status = data['status']

        db.session.commit()

        return jsonify({
            'success': True,
            'activity': activity.to_dict(),
            'message': 'Activity updated successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/activities/<int:activity_id>', methods=['DELETE'])
def delete_activity(activity_id):
    """Delete an activity"""
    try:
        activity = db.session.get(Activity, activity_id)

        if not activity:
            return jsonify({
                'success': False,
                'message': 'Activity not found'
            }), 404

        db.session.delete(activity)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Activity deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ===================================
# API Routes - Messages (Update/Delete)
# ===================================

@app.route('/api/messages/<int:message_id>', methods=['GET'])
def get_message(message_id):
    """Get a specific message"""
    try:
        message = db.session.get(Message, message_id)

        if not message:
            return jsonify({
                'success': False,
                'message': 'Message not found'
            }), 404

        return jsonify({
            'success': True,
            'message': message.to_dict()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/messages/<int:message_id>', methods=['PUT'])
def update_message(message_id):
    """Update a message"""
    try:
        message = db.session.get(Message, message_id)

        if not message:
            return jsonify({
                'success': False,
                'message': 'Message not found'
            }), 404

        data = request.get_json()

        # Update content
        if 'content' in data:
            message.content = data['content']

        db.session.commit()

        return jsonify({
            'success': True,
            'message': message.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/messages/<int:message_id>', methods=['DELETE'])
def delete_message(message_id):
    """Delete a message"""
    try:
        message = db.session.get(Message, message_id)

        if not message:
            return jsonify({
                'success': False,
                'message': 'Message not found'
            }), 404

        db.session.delete(message)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Message deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ===================================
# API Routes - Users (Update/Delete)
# ===================================

@app.route('/api/users', methods=['GET'])
@login_required
def get_users():
    """Get all users (admin only)"""
    try:
        # Check if current user is admin
        if not current_user.is_admin:
            return jsonify({
                'success': False,
                'message': 'Unauthorized: Admin access required'
            }), 403

        users = User.query.all()
        users_list = [user.to_dict() for user in users]

        return jsonify({
            'success': True,
            'users': users_list
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/users/<int:user_id>', methods=['GET'])
@login_required
def get_user(user_id):
    """Get a specific user"""
    try:
        # Users can only view their own profile unless they're admin
        if current_user.id != user_id and not current_user.is_admin:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 403

        user = db.session.get(User, user_id)

        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        return jsonify({
            'success': True,
            'user': user.to_dict()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    """Update a user"""
    try:
        # Users can only update their own profile unless they're admin
        if current_user.id != user_id and not current_user.is_admin:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 403

        user = db.session.get(User, user_id)

        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        data = request.get_json()

        # Update fields
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'email' in data:
            # Check if email is already taken
            existing_user = User.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({
                    'success': False,
                    'message': 'Email already in use'
                }), 400
            user.email = data['email']

        # Only allow password change for own account
        if 'password' in data and current_user.id == user_id:
            user.set_password(data['password'])

        # Only admin can change admin status
        if 'is_admin' in data and current_user.is_admin:
            user.is_admin = data['is_admin']

        # Only admin can change active status
        if 'is_active' in data and current_user.is_admin:
            user.is_active = data['is_active']

        db.session.commit()

        logger.info(f"User updated: {user.username}")

        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'message': 'User updated successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    """Delete a user (admin only)"""
    try:
        # Only admin can delete users
        if not current_user.is_admin:
            return jsonify({
                'success': False,
                'message': 'Unauthorized: Admin access required'
            }), 403

        # Prevent self-deletion
        if current_user.id == user_id:
            return jsonify({
                'success': False,
                'message': 'Cannot delete your own account'
            }), 400

        user = db.session.get(User, user_id)

        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        username = user.username
        db.session.delete(user)
        db.session.commit()

        logger.info(f"User deleted: {username}")

        return jsonify({
            'success': True,
            'message': 'User deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ===================================
# API Routes - System
# ===================================

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get system status - also used as health check endpoint"""
    try:
        # Test database connectivity
        db_status = 'connected'
        try:
            db.session.execute(db.text('SELECT 1'))
        except Exception as db_err:
            db_status = f'error: {str(db_err)[:50]}'

        return jsonify({
            'success': True,
            'status': 'online',
            'agents_count': agent_count(),
            'spaces_count': Space.query.count(),
            'version': '2.0',
            'environment': {
                'is_azure': IS_AZURE,
                'is_production': IS_PRODUCTION,
                'database': 'postgresql' if 'postgresql' in DATABASE_URI else 'sqlite',
                'database_status': db_status,
                'vector_store': 'pgvector' if USE_PGVECTOR else 'chromadb',
                'blob_storage': 'azure_blob' if BLOB_STORAGE_ENABLED else 'local'
            }
        })

    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# ===================================
# API Routes - Integrations (CRUD)
# ===================================

@app.route('/api/integrations', methods=['GET'])
def get_integrations():
    """Get all integrations"""
    try:
        category = request.args.get('category')

        query = Integration.query
        if category:
            query = query.filter_by(category=category)

        integrations = query.order_by(Integration.category, Integration.display_name).all()

        return jsonify({
            'success': True,
            'integrations': [i.to_dict() for i in integrations]
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/integrations/<integration_id>', methods=['GET'])
def get_integration(integration_id):
    """Get a specific integration"""
    try:
        # Support lookup by ID or name
        if integration_id.isdigit():
            integration = db.session.get(Integration, int(integration_id))
        else:
            integration = Integration.query.filter_by(name=integration_id).first()

        if not integration:
            return jsonify({
                'success': False,
                'message': 'Integration not found'
            }), 404

        return jsonify({
            'success': True,
            'integration': integration.to_dict()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/integrations', methods=['POST'])
def create_integration():
    """Create a new integration"""
    try:
        data = request.get_json()

        if not data.get('name'):
            return jsonify({
                'success': False,
                'message': 'Integration name is required'
            }), 400

        # Check if integration already exists
        existing = Integration.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({
                'success': False,
                'message': 'Integration with this name already exists'
            }), 400

        integration = Integration(
            name=data['name'],
            display_name=data.get('display_name', data['name'].title()),
            description=data.get('description', ''),
            category=data.get('category', 'other'),
            icon=data.get('icon', 'default'),
            enabled=data.get('enabled', False)
        )

        if data.get('config'):
            integration.set_config(data['config'])

        db.session.add(integration)
        db.session.commit()

        logger.info(f"Created integration: {integration.name}")

        return jsonify({
            'success': True,
            'integration': integration.to_dict(),
            'message': 'Integration created successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/integrations/<integration_id>', methods=['PUT'])
def update_integration(integration_id):
    """Update an integration"""
    try:
        # Support lookup by ID or name
        if integration_id.isdigit():
            integration = db.session.get(Integration, int(integration_id))
        else:
            integration = Integration.query.filter_by(name=integration_id).first()

        if not integration:
            return jsonify({
                'success': False,
                'message': 'Integration not found'
            }), 404

        data = request.get_json()

        # Update fields
        if 'display_name' in data:
            integration.display_name = data['display_name']
        if 'description' in data:
            integration.description = data['description']
        if 'category' in data:
            integration.category = data['category']
        if 'icon' in data:
            integration.icon = data['icon']
        if 'enabled' in data:
            integration.enabled = data['enabled']
        if 'status' in data:
            integration.status = data['status']
        if 'error_message' in data:
            integration.error_message = data['error_message']

        # Update config (merge with existing)
        if 'config' in data:
            existing_config = integration.get_config()
            existing_config.update(data['config'])
            integration.set_config(existing_config)

        db.session.commit()

        logger.info(f"Updated integration: {integration.name}")

        return jsonify({
            'success': True,
            'integration': integration.to_dict(),
            'message': 'Integration updated successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/integrations/<integration_id>', methods=['DELETE'])
def delete_integration(integration_id):
    """Delete an integration"""
    try:
        # Support lookup by ID or name
        if integration_id.isdigit():
            integration = db.session.get(Integration, int(integration_id))
        else:
            integration = Integration.query.filter_by(name=integration_id).first()

        if not integration:
            return jsonify({
                'success': False,
                'message': 'Integration not found'
            }), 404

        name = integration.name
        db.session.delete(integration)
        db.session.commit()

        logger.info(f"Deleted integration: {name}")

        return jsonify({
            'success': True,
            'message': f'Integration {name} deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/integrations/<integration_id>/connect', methods=['POST'])
def connect_integration(integration_id):
    """Connect/enable an integration with configuration"""
    try:
        # Support lookup by ID or name
        if integration_id.isdigit():
            integration = db.session.get(Integration, int(integration_id))
        else:
            integration = Integration.query.filter_by(name=integration_id).first()

        if not integration:
            return jsonify({
                'success': False,
                'message': 'Integration not found'
            }), 404

        data = request.get_json() or {}

        # Update config if provided
        if 'config' in data:
            existing_config = integration.get_config()
            existing_config.update(data['config'])
            integration.set_config(existing_config)

        # Validate and test connection based on integration type
        config = integration.get_config()
        validation_result = validate_integration_config(integration.name, config)

        if validation_result['valid']:
            integration.enabled = True
            integration.status = 'connected'
            integration.error_message = None
            integration.last_sync = datetime.utcnow()
            message = f'{integration.display_name} connected successfully'
        else:
            integration.enabled = False
            integration.status = 'error'
            integration.error_message = validation_result['message']
            message = validation_result['message']

        db.session.commit()

        return jsonify({
            'success': validation_result['valid'],
            'integration': integration.to_dict(),
            'message': message
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/integrations/<integration_id>/disconnect', methods=['POST'])
def disconnect_integration(integration_id):
    """Disconnect/disable an integration"""
    try:
        # Support lookup by ID or name
        if integration_id.isdigit():
            integration = db.session.get(Integration, int(integration_id))
        else:
            integration = Integration.query.filter_by(name=integration_id).first()

        if not integration:
            return jsonify({
                'success': False,
                'message': 'Integration not found'
            }), 404

        integration.enabled = False
        integration.status = 'disconnected'
        integration.error_message = None

        db.session.commit()

        logger.info(f"Disconnected integration: {integration.name}")

        return jsonify({
            'success': True,
            'integration': integration.to_dict(),
            'message': f'{integration.display_name} disconnected'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/integrations/<integration_id>/test', methods=['POST'])
def test_integration(integration_id):
    """Test an integration connection"""
    try:
        # Support lookup by ID or name
        if integration_id.isdigit():
            integration = db.session.get(Integration, int(integration_id))
        else:
            integration = Integration.query.filter_by(name=integration_id).first()

        if not integration:
            return jsonify({
                'success': False,
                'message': 'Integration not found'
            }), 404

        config = integration.get_config()
        result = test_integration_connection(integration.name, config)

        if result['success']:
            integration.status = 'connected'
            integration.error_message = None
            integration.last_sync = datetime.utcnow()
        else:
            integration.status = 'error'
            integration.error_message = result.get('message', 'Connection test failed')

        db.session.commit()

        return jsonify({
            'success': result['success'],
            'integration': integration.to_dict(),
            'message': result.get('message', 'Connection test completed'),
            'details': result.get('details')
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


def validate_integration_config(integration_name, config):
    """Validate integration configuration"""
    validators = {
        'todoist': lambda c: bool(c.get('api_token')),
        'telegram': lambda c: bool(c.get('bot_token')),
        'microsoft_graph': lambda c: all([
            c.get('tenant_id'),
            c.get('client_id'),
            c.get('client_secret')
        ]),
        'google_calendar': lambda c: bool(c.get('credentials')),
        'slack': lambda c: bool(c.get('bot_token')),
        'notion': lambda c: bool(c.get('api_key'))
    }

    required_fields = {
        'todoist': ['api_token'],
        'telegram': ['bot_token'],
        'microsoft_graph': ['tenant_id', 'client_id', 'client_secret'],
        'google_calendar': ['credentials'],
        'slack': ['bot_token'],
        'notion': ['api_key']
    }

    validator = validators.get(integration_name)
    fields = required_fields.get(integration_name, [])

    if not validator:
        return {'valid': True, 'message': 'Configuration saved'}

    if validator(config):
        return {'valid': True, 'message': 'Configuration valid'}
    else:
        missing = [f for f in fields if not config.get(f)]
        return {
            'valid': False,
            'message': f'Missing required fields: {", ".join(missing)}'
        }


def test_integration_connection(integration_name, config):
    """Test actual connection to integration service"""
    try:
        if integration_name == 'todoist':
            if not config.get('api_token'):
                return {'success': False, 'message': 'API token not configured'}
            # Test Todoist API
            import requests
            response = requests.get(
                'https://api.todoist.com/rest/v2/projects',
                headers={'Authorization': f'Bearer {config["api_token"]}'},
                timeout=10
            )
            if response.status_code == 200:
                projects = response.json()
                return {
                    'success': True,
                    'message': f'Connected! Found {len(projects)} projects',
                    'details': {'projects_count': len(projects)}
                }
            else:
                return {'success': False, 'message': f'API error: {response.status_code}'}

        elif integration_name == 'telegram':
            if not config.get('bot_token'):
                return {'success': False, 'message': 'Bot token not configured'}
            # Test Telegram Bot API
            import requests
            response = requests.get(
                f'https://api.telegram.org/bot{config["bot_token"]}/getMe',
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('ok'):
                    bot_info = data.get('result', {})
                    return {
                        'success': True,
                        'message': f'Connected to bot: @{bot_info.get("username")}',
                        'details': {'bot_username': bot_info.get('username')}
                    }
            return {'success': False, 'message': 'Invalid bot token'}

        elif integration_name == 'microsoft_graph':
            if not all([config.get('tenant_id'), config.get('client_id'), config.get('client_secret')]):
                return {'success': False, 'message': 'Missing Azure AD credentials'}
            # Would need to implement OAuth flow - return placeholder
            return {
                'success': True,
                'message': 'Configuration saved. OAuth flow required for full connection.',
                'details': {'requires_oauth': True}
            }

        else:
            return {
                'success': True,
                'message': 'Configuration saved',
                'details': {}
            }

    except Exception as e:
        return {'success': False, 'message': f'Connection error: {str(e)}'}


# ===================================
# API Routes - Skills
# ===================================

@app.route('/api/skills', methods=['GET'])
def get_skills():
    """Get all skills"""
    try:
        skills = Skill.query.all()
        return jsonify({
            'success': True,
            'skills': [s.to_dict() for s in skills]
        })
    except Exception as e:
        logger.error(f"Error getting skills: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/skills/<int:skill_id>', methods=['GET'])
def get_skill(skill_id):
    """Get a specific skill"""
    try:
        skill = Skill.query.get(skill_id)
        if not skill:
            return jsonify({
                'success': False,
                'message': 'Skill not found'
            }), 404

        return jsonify({
            'success': True,
            'skill': skill.to_dict()
        })
    except Exception as e:
        logger.error(f"Error getting skill: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/skills', methods=['POST'])
def create_skill():
    """Create a new skill"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        # Validate required fields
        required = ['displayName', 'description', 'content']
        missing = [f for f in required if not data.get(f)]
        if missing:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing)}'
            }), 400

        # Parse and validate content
        try:
            frontmatter, body = SkillParser.parse(data['content'])
        except SkillParserError as e:
            return jsonify({
                'success': False,
                'message': f'Invalid skill content: {str(e)}'
            }), 400

        # Check for duplicate name
        name = frontmatter['name']
        existing = Skill.query.filter_by(name=name).first()
        if existing:
            return jsonify({
                'success': False,
                'message': f'Skill with name "{name}" already exists'
            }), 400

        # Create skill
        skill = Skill(
            name=name,
            display_name=data['displayName'],
            description=data['description'],
            content=data['content'],
            agent_id=data.get('agentId'),
            is_global=data.get('isGlobal', False),
            is_active=True,
            category=data.get('category'),
            version=frontmatter.get('version', '1.0.0'),
            author=frontmatter.get('author', 'Cleo')
        )
        skill.set_triggers(data.get('triggers', []))

        db.session.add(skill)
        db.session.commit()

        logger.info(f"Created skill: {name}")

        return jsonify({
            'success': True,
            'skill': skill.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating skill: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/skills/<int:skill_id>', methods=['PUT'])
def update_skill(skill_id):
    """Update a skill"""
    try:
        skill = Skill.query.get(skill_id)
        if not skill:
            return jsonify({
                'success': False,
                'message': 'Skill not found'
            }), 404

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        # Update content if provided
        if 'content' in data:
            try:
                frontmatter, body = SkillParser.parse(data['content'])
                skill.name = frontmatter['name']
                skill.content = data['content']
                skill.version = frontmatter.get('version', skill.version)
            except SkillParserError as e:
                return jsonify({
                    'success': False,
                    'message': f'Invalid skill content: {str(e)}'
                }), 400

        # Update other fields
        if 'displayName' in data:
            skill.display_name = data['displayName']
        if 'description' in data:
            skill.description = data['description']
        if 'agentId' in data:
            skill.agent_id = data['agentId']
        if 'isGlobal' in data:
            skill.is_global = data['isGlobal']
            if data['isGlobal']:
                skill.agent_id = None
        if 'isActive' in data:
            skill.is_active = data['isActive']
        if 'category' in data:
            skill.category = data['category']
        if 'triggers' in data:
            skill.set_triggers(data['triggers'])

        skill.updated_at = datetime.utcnow()
        db.session.commit()

        logger.info(f"Updated skill: {skill.name}")

        return jsonify({
            'success': True,
            'skill': skill.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating skill: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/skills/<int:skill_id>', methods=['DELETE'])
def delete_skill(skill_id):
    """Delete a skill"""
    try:
        skill = Skill.query.get(skill_id)
        if not skill:
            return jsonify({
                'success': False,
                'message': 'Skill not found'
            }), 404

        name = skill.name
        db.session.delete(skill)
        db.session.commit()

        logger.info(f"Deleted skill: {name}")

        return jsonify({
            'success': True,
            'message': f'Skill "{name}" deleted'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting skill: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/skills/global', methods=['GET'])
def get_global_skills():
    """Get all global skills"""
    try:
        skills = Skill.query.filter_by(is_global=True, is_active=True).all()
        return jsonify({
            'success': True,
            'skills': [s.to_dict() for s in skills]
        })
    except Exception as e:
        logger.error(f"Error getting global skills: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/skills/categories', methods=['GET'])
def get_skill_categories():
    """Get available skill categories"""
    categories = [
        {'id': 'productivity', 'name': 'Productivity', 'description': 'Task and workflow management'},
        {'id': 'communication', 'name': 'Communication', 'description': 'Meetings, emails, and collaboration'},
        {'id': 'analysis', 'name': 'Analysis', 'description': 'Data analysis and insights'},
        {'id': 'coordination', 'name': 'Coordination', 'description': 'Multi-agent coordination'},
        {'id': 'planning', 'name': 'Planning', 'description': 'Project and strategic planning'},
        {'id': 'research', 'name': 'Research', 'description': 'Information gathering and synthesis'},
        {'id': 'writing', 'name': 'Writing', 'description': 'Content creation and editing'},
        {'id': 'finance', 'name': 'Finance', 'description': 'Financial analysis and reporting'},
        {'id': 'legal', 'name': 'Legal', 'description': 'Legal documentation and compliance'},
        {'id': 'marketing', 'name': 'Marketing', 'description': 'Marketing strategy and content'},
        {'id': 'technical', 'name': 'Technical', 'description': 'Technical documentation and code'},
        {'id': 'other', 'name': 'Other', 'description': 'Miscellaneous skills'}
    ]
    return jsonify({
        'success': True,
        'categories': categories
    })


@app.route('/api/skills/templates/<category>', methods=['GET'])
def get_skill_template(category):
    """Get a skill template for a category"""
    try:
        template = SkillParser.get_template(category)
        return jsonify({
            'success': True,
            'template': template,
            'category': category
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/agents/<int:agent_id>/skills', methods=['GET'])
def get_agent_skills(agent_id):
    """Get skills for a specific agent (includes global skills)"""
    try:
        agent = Agent.query.get(agent_id)
        if not agent:
            return jsonify({
                'success': False,
                'message': 'Agent not found'
            }), 404

        # Get agent-specific skills
        agent_skills = Skill.query.filter_by(agent_id=agent_id, is_active=True).all()

        # Get global skills
        global_skills = Skill.query.filter_by(is_global=True, is_active=True).all()

        # Combine and deduplicate
        all_skills = agent_skills + global_skills

        return jsonify({
            'success': True,
            'skills': [s.to_dict() for s in all_skills],
            'agentSkills': [s.to_dict() for s in agent_skills],
            'globalSkills': [s.to_dict() for s in global_skills]
        })
    except Exception as e:
        logger.error(f"Error getting agent skills: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/agents/<int:agent_id>/skills', methods=['POST'])
def assign_skill_to_agent(agent_id):
    """Assign a skill to an agent"""
    try:
        agent = Agent.query.get(agent_id)
        if not agent:
            return jsonify({
                'success': False,
                'message': 'Agent not found'
            }), 404

        data = request.get_json()
        skill_id = data.get('skillId')

        if not skill_id:
            return jsonify({
                'success': False,
                'message': 'Skill ID required'
            }), 400

        skill = Skill.query.get(skill_id)
        if not skill:
            return jsonify({
                'success': False,
                'message': 'Skill not found'
            }), 404

        if skill.is_global:
            return jsonify({
                'success': False,
                'message': 'Cannot assign global skill to specific agent'
            }), 400

        skill.agent_id = agent_id
        db.session.commit()

        return jsonify({
            'success': True,
            'skill': skill.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error assigning skill: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/agents/<int:agent_id>/skills/<int:skill_id>', methods=['DELETE'])
def unassign_skill_from_agent(agent_id, skill_id):
    """Remove skill assignment from an agent"""
    try:
        skill = Skill.query.get(skill_id)
        if not skill:
            return jsonify({
                'success': False,
                'message': 'Skill not found'
            }), 404

        if skill.agent_id != agent_id:
            return jsonify({
                'success': False,
                'message': 'Skill is not assigned to this agent'
            }), 400

        skill.agent_id = None
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Skill unassigned from agent'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error unassigning skill: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ===================================
# API Routes - Knowledge Base
# ===================================

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/knowledge/upload', methods=['POST'])
def upload_document():
    """Upload and process a document"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file provided'
            }), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400

        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'message': f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400

        # Secure the filename
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        # Check if file already exists
        if os.path.exists(file_path):
            # Add timestamp to make unique
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{int(datetime.now().timestamp())}{ext}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        # Save file
        file.save(file_path)
        file_size = os.path.getsize(file_path)
        file_type = filename.rsplit('.', 1)[1].lower()

        # Create document record
        document = Document(
            name=filename,
            file_path=file_path,
            file_type=file_type,
            file_size=file_size,
            status='processing'
        )

        db.session.add(document)
        db.session.commit()

        # Process document
        try:
            processor = get_processor()

            # Extract text
            text_content, metadata = processor.extract_text(file_path)
            document.content = text_content

            # Chunk text
            chunks = processor.chunk_text(text_content, metadata)

            # Save chunks
            for chunk_data in chunks:
                chunk = DocumentChunk(
                    document_id=document.id,
                    chunk_index=chunk_data['chunk_index'],
                    content=chunk_data['content'],
                    token_count=chunk_data['token_count'],
                    chunk_metadata=json.dumps(chunk_data['metadata'])
                )
                db.session.add(chunk)

            # Extract entities
            entities = processor.extract_entities(text_content)
            entity_map = {}

            for entity_data in entities:
                entity = Entity(
                    name=entity_data['name'],
                    entity_type=entity_data['type'],
                    mention_count=entity_data['mentions'],
                    source_chunks=json.dumps([])  # Will be updated later
                )
                db.session.add(entity)
                entity_map[entity_data['name']] = entity

            # Extract relations
            relations = processor.extract_relations(text_content, entities)

            for relation_data in relations:
                source_entity = entity_map.get(relation_data['source'])
                target_entity = entity_map.get(relation_data['target'])

                if source_entity and target_entity:
                    relation = Relation(
                        source_entity_id=source_entity.id,
                        target_entity_id=target_entity.id,
                        relation_type=relation_data['type'],
                        confidence=relation_data['confidence']
                    )
                    db.session.add(relation)

            # Generate and store vector embeddings
            try:
                vector_store = get_vector_store()
                vector_store.add_chunks(chunks, document.id)
                logger.info(f"Generated embeddings for {len(chunks)} chunks")
            except Exception as e:
                logger.error(f"Error generating embeddings: {e}")
                # Continue even if embedding fails

            # Update document status
            document.status = 'completed'
            document.chunk_count = len(chunks)
            document.entity_count = len(entities)
            document.processed_at = datetime.now()

            db.session.commit()

            logger.info(f"Document processed: {filename} ({len(chunks)} chunks, {len(entities)} entities)")

            return jsonify({
                'success': True,
                'document': {
                    'id': document.id,
                    'name': document.name,
                    'file_type': document.file_type,
                    'file_size': document.file_size,
                    'status': document.status,
                    'chunk_count': document.chunk_count,
                    'entity_count': document.entity_count,
                    'uploaded_at': document.uploaded_at.isoformat()
                },
                'message': 'Document uploaded and processed successfully'
            })

        except Exception as e:
            # Update document status to failed
            document.status = 'failed'
            db.session.commit()

            logger.error(f"Document processing failed: {e}")

            return jsonify({
                'success': False,
                'message': f'Document processing failed: {str(e)}'
            }), 500

    except Exception as e:
        db.session.rollback()
        logger.error(f"Document upload error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/knowledge/documents', methods=['GET'])
def get_documents():
    """Get all documents with statistics"""
    try:
        documents = Document.query.order_by(Document.uploaded_at.desc()).all()

        documents_list = []
        for doc in documents:
            documents_list.append({
                'id': doc.id,
                'name': doc.name,
                'file_type': doc.file_type,
                'file_size': doc.file_size,
                'status': doc.status,
                'chunk_count': doc.chunk_count,
                'entity_count': doc.entity_count,
                'uploaded_at': doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                'processed_at': doc.processed_at.isoformat() if doc.processed_at else None
            })

        # Calculate statistics
        total_chunks = db.session.query(db.func.count(DocumentChunk.id)).scalar()
        total_entities = db.session.query(db.func.count(Entity.id)).scalar()
        total_relations = db.session.query(db.func.count(Relation.id)).scalar()

        return jsonify({
            'success': True,
            'documents': documents_list,
            'stats': {
                'total_documents': len(documents_list),
                'total_chunks': total_chunks or 0,
                'total_entities': total_entities or 0,
                'total_relations': total_relations or 0
            }
        })

    except Exception as e:
        logger.error(f"Error fetching documents: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/knowledge/documents/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    """Delete a document and its associated data"""
    try:
        document = db.session.get(Document, doc_id)

        if not document:
            return jsonify({
                'success': False,
                'message': 'Document not found'
            }), 404

        # Delete the file from disk
        if os.path.exists(document.file_path):
            try:
                os.remove(document.file_path)
            except Exception as e:
                logger.warning(f"Failed to delete file {document.file_path}: {e}")

        # Delete from vector store
        try:
            vector_store = get_vector_store()
            vector_store.delete_document(doc_id)
            logger.info(f"Deleted embeddings for document {doc_id}")
        except Exception as e:
            logger.warning(f"Failed to delete embeddings: {e}")

        # Delete document (cascade will delete chunks)
        db.session.delete(document)
        db.session.commit()

        logger.info(f"Document deleted: {document.name}")

        return jsonify({
            'success': True,
            'message': 'Document deleted successfully'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting document: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/knowledge/search', methods=['POST'])
def search_knowledge():
    """Semantic search across knowledge base"""
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        n_results = data.get('n_results', 5)

        if not query:
            return jsonify({
                'success': False,
                'message': 'Query is required'
            }), 400

        # Perform semantic search
        vector_store = get_vector_store()
        results = vector_store.search(query, n_results=n_results)

        # Enrich results with document information
        enriched_results = []
        for result in results:
            doc_id = result['metadata'].get('document_id')
            document = db.session.get(Document, doc_id)

            if document:
                enriched_results.append({
                    'content': result['content'],
                    'relevance': result['relevance'],
                    'distance': result['distance'],
                    'chunk_index': result['metadata'].get('chunk_index'),
                    'document': {
                        'id': document.id,
                        'name': document.name,
                        'file_type': document.file_type,
                        'uploaded_at': document.uploaded_at.isoformat()
                    }
                })

        return jsonify({
            'success': True,
            'results': enriched_results,
            'query': query,
            'total_results': len(enriched_results)
        })

    except Exception as e:
        logger.error(f"Error searching knowledge base: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/knowledge/scan-folder', methods=['POST'])
def scan_folder():
    """Scan a folder and upload all supported documents"""
    try:
        data = request.get_json()
        folder_path = data.get('folder_path', '').strip()

        if not folder_path:
            return jsonify({
                'success': False,
                'message': 'Folder path is required'
            }), 400

        # Validate folder exists
        if not os.path.exists(folder_path):
            return jsonify({
                'success': False,
                'message': 'Folder does not exist'
            }), 404

        if not os.path.isdir(folder_path):
            return jsonify({
                'success': False,
                'message': 'Path is not a directory'
            }), 400

        # Supported file extensions
        supported_extensions = {'.pdf', '.docx', '.txt', '.md'}

        # Scan folder recursively
        discovered_files = []
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                file_path = os.path.join(root, file)
                _, ext = os.path.splitext(file)
                if ext.lower() in supported_extensions:
                    discovered_files.append({
                        'path': file_path,
                        'name': file,
                        'size': os.path.getsize(file_path),
                        'extension': ext.lower()
                    })

        if not discovered_files:
            return jsonify({
                'success': True,
                'message': 'No supported documents found in folder',
                'discovered': 0,
                'files': []
            })

        # Process each file
        uploaded_files = []
        failed_files = []

        for file_info in discovered_files:
            try:
                # Check if file already exists in database
                existing_doc = db.session.query(Document).filter_by(
                    name=file_info['name'],
                    file_path=file_info['path']
                ).first()

                if existing_doc:
                    logger.info(f"Skipping duplicate: {file_info['name']}")
                    continue

                # Process the document
                processor = KnowledgeProcessor()

                # Extract text
                text = processor.extract_text(file_info['path'])
                if not text:
                    failed_files.append({
                        'name': file_info['name'],
                        'error': 'Failed to extract text'
                    })
                    continue

                # Chunk text
                chunks = processor.chunk_text(text)
                if not chunks:
                    failed_files.append({
                        'name': file_info['name'],
                        'error': 'Failed to create chunks'
                    })
                    continue

                # Extract entities
                entities = processor.extract_entities(text)

                # Create document record
                document = Document(
                    name=file_info['name'],
                    file_path=file_info['path'],
                    file_type=file_info['extension'].replace('.', ''),
                    file_size=file_info['size']
                )
                db.session.add(document)
                db.session.flush()

                # Create chunk records
                for chunk_data in chunks:
                    chunk = DocumentChunk(
                        document_id=document.id,
                        chunk_index=chunk_data['chunk_index'],
                        content=chunk_data['content'],
                        token_count=chunk_data['token_count'],
                        chunk_metadata=json.dumps({
                            'start_char': chunk_data.get('start_char', 0),
                            'end_char': chunk_data.get('end_char', len(chunk_data['content']))
                        })
                    )
                    db.session.add(chunk)

                # Create entity records
                for entity_name, entity_type in entities:
                    entity = Entity(
                        document_id=document.id,
                        name=entity_name,
                        entity_type=entity_type
                    )
                    db.session.add(entity)

                db.session.commit()

                # Generate and store vector embeddings
                try:
                    vector_store = get_vector_store()
                    vector_store.add_chunks(chunks, document.id)
                    logger.info(f"Generated embeddings for {len(chunks)} chunks")
                except Exception as e:
                    logger.error(f"Error generating embeddings: {e}")

                uploaded_files.append({
                    'name': file_info['name'],
                    'id': document.id,
                    'chunks': len(chunks),
                    'entities': len(entities)
                })

            except Exception as e:
                logger.error(f"Error processing {file_info['name']}: {e}")
                failed_files.append({
                    'name': file_info['name'],
                    'error': str(e)
                })

        return jsonify({
            'success': True,
            'message': f'Scanned folder and processed {len(uploaded_files)} documents',
            'discovered': len(discovered_files),
            'uploaded': len(uploaded_files),
            'failed': len(failed_files),
            'files': uploaded_files,
            'errors': failed_files
        })

    except Exception as e:
        logger.error(f"Error scanning folder: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/knowledge/graph', methods=['GET'])
def get_knowledge_graph():
    """Get graph data for knowledge visualization"""
    try:
        # Get all documents
        documents = Document.query.all()

        # Build nodes (documents)
        nodes = []
        for doc in documents:
            nodes.append({
                'id': f'doc_{doc.id}',
                'label': doc.name,
                'type': 'document',
                'file_type': doc.file_type,
                'size': doc.file_size,
                'chunks': db.session.query(DocumentChunk).filter_by(document_id=doc.id).count(),
                'uploaded_at': doc.uploaded_at.isoformat()
            })

        # Build edges (document similarities based on vector embeddings)
        edges = []
        vector_store = get_vector_store()

        # For each document, find similar documents
        for doc in documents[:20]:  # Limit to first 20 for performance
            # Get a sample chunk from this document
            sample_chunk = db.session.query(DocumentChunk).filter_by(
                document_id=doc.id,
                chunk_index=0
            ).first()

            if sample_chunk:
                # Search for similar chunks
                similar = vector_store.search(sample_chunk.content, n_results=5)

                for result in similar:
                    similar_doc_id = result['metadata'].get('document_id')

                    # Don't create self-edges
                    if similar_doc_id and similar_doc_id != doc.id:
                        # Create edge if relevance is high enough
                        if result['relevance'] > 0.3:
                            edges.append({
                                'source': f'doc_{doc.id}',
                                'target': f'doc_{similar_doc_id}',
                                'weight': result['relevance'],
                                'label': f"{int(result['relevance'] * 100)}% similar"
                            })

        return jsonify({
            'success': True,
            'graph': {
                'nodes': nodes,
                'edges': edges
            },
            'stats': {
                'total_documents': len(documents),
                'total_relationships': len(edges)
            }
        })

    except Exception as e:
        logger.error(f"Error generating knowledge graph: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/knowledge/search/advanced', methods=['POST'])
def advanced_search_knowledge():
    """Advanced search with filters"""
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        file_types = data.get('file_types', [])  # List of file types to filter
        date_from = data.get('date_from')  # ISO date string
        date_to = data.get('date_to')  # ISO date string
        n_results = data.get('n_results', 10)

        if not query:
            return jsonify({
                'success': False,
                'message': 'Query is required'
            }), 400

        # Perform semantic search
        vector_store = get_vector_store()
        results = vector_store.search(query, n_results=n_results * 2)  # Get more to filter

        # Filter and enrich results
        filtered_results = []
        for result in results:
            doc_id = result['metadata'].get('document_id')
            document = db.session.get(Document, doc_id)

            if not document:
                continue

            # Apply file type filter
            if file_types and document.file_type not in file_types:
                continue

            # Apply date range filter
            if date_from:
                try:
                    from datetime import datetime
                    date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                    if document.uploaded_at < date_from_obj:
                        continue
                except:
                    pass

            if date_to:
                try:
                    from datetime import datetime
                    date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                    if document.uploaded_at > date_to_obj:
                        continue
                except:
                    pass

            filtered_results.append({
                'content': result['content'],
                'relevance': result['relevance'],
                'distance': result['distance'],
                'chunk_index': result['metadata'].get('chunk_index'),
                'document': {
                    'id': document.id,
                    'name': document.name,
                    'file_type': document.file_type,
                    'file_size': document.file_size,
                    'uploaded_at': document.uploaded_at.isoformat()
                }
            })

            # Stop once we have enough results
            if len(filtered_results) >= n_results:
                break

        return jsonify({
            'success': True,
            'results': filtered_results,
            'query': query,
            'filters': {
                'file_types': file_types,
                'date_from': date_from,
                'date_to': date_to
            },
            'total_results': len(filtered_results)
        })

    except Exception as e:
        logger.error(f"Error in advanced search: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/knowledge/export', methods=['POST'])
def export_search_results():
    """Export search results to CSV"""
    try:
        import csv
        from io import StringIO
        from datetime import datetime

        data = request.get_json()
        results = data.get('results', [])

        if not results:
            return jsonify({
                'success': False,
                'message': 'No results to export'
            }), 400

        # Create CSV in memory
        output = StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow([
            'Document Name',
            'File Type',
            'Relevance Score',
            'Chunk Content',
            'Uploaded At'
        ])

        # Write data rows
        for result in results:
            doc = result.get('document', {})
            writer.writerow([
                doc.get('name', ''),
                doc.get('file_type', ''),
                f"{result.get('relevance', 0):.2f}",
                result.get('content', '')[:500],  # Limit content length
                doc.get('uploaded_at', '')
            ])

        # Get CSV content
        csv_content = output.getvalue()
        output.close()

        # Return as downloadable file
        from flask import make_response
        response = make_response(csv_content)
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename=knowledge_search_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'

        return response

    except Exception as e:
        logger.error(f"Error exporting search results: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ===================================
# API Routes - Tasks (AscendoreQ Integration)
# ===================================

@app.route('/api/tasks', methods=['GET'])
def list_tasks():
    """List all tasks with optional filtering"""
    try:
        space_id = request.args.get('space_id', type=int)
        status = request.args.get('status', type=str)
        priority = request.args.get('priority', type=str)
        limit = request.args.get('limit', 100, type=int)

        tasks = TaskService.list_tasks(
            space_id=space_id,
            status_filter=status,
            priority_filter=priority,
            limit=limit
        )

        return jsonify({
            'success': True,
            'tasks': [task.to_dict() for task in tasks],
            'count': len(tasks)
        })

    except Exception as e:
        logger.error(f"Error listing tasks: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Create a new task"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        if not data.get('space_id'):
            return jsonify({
                'success': False,
                'message': 'space_id is required'
            }), 400

        if not data.get('title'):
            return jsonify({
                'success': False,
                'message': 'title is required'
            }), 400

        # Parse due_date if provided
        due_date = None
        if data.get('due_date'):
            try:
                due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid due_date format. Use ISO format.'
                }), 400

        task = TaskService.create_task(
            space_id=data['space_id'],
            title=data['title'],
            description=data.get('description'),
            priority=data.get('priority', 'medium'),
            due_date=due_date
        )

        logger.info(f"Created task: {task.title} in space {task.space_id}")

        return jsonify({
            'success': True,
            'task': task.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating task: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    """Get a specific task by ID"""
    try:
        task = TaskService.get_task(task_id)

        if not task:
            return jsonify({
                'success': False,
                'message': 'Task not found'
            }), 404

        return jsonify({
            'success': True,
            'task': task.to_dict()
        })

    except Exception as e:
        logger.error(f"Error getting task {task_id}: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Update a task"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        # Parse due_date if provided
        if 'due_date' in data and data['due_date']:
            try:
                data['due_date'] = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid due_date format. Use ISO format.'
                }), 400

        task = TaskService.update_task(task_id, data)

        if not task:
            return jsonify({
                'success': False,
                'message': 'Task not found'
            }), 404

        logger.info(f"Updated task: {task.id} - {task.title}")

        return jsonify({
            'success': True,
            'task': task.to_dict()
        })

    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating task {task_id}: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task"""
    try:
        success = TaskService.delete_task(task_id)

        if not success:
            return jsonify({
                'success': False,
                'message': 'Task not found'
            }), 404

        logger.info(f"Deleted task: {task_id}")

        return jsonify({
            'success': True,
            'message': 'Task deleted'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting task {task_id}: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/tasks/<int:task_id>/complete', methods=['POST'])
def complete_task(task_id):
    """Mark a task as completed"""
    try:
        task = TaskService.complete_task(task_id)

        if not task:
            return jsonify({
                'success': False,
                'message': 'Task not found'
            }), 404

        logger.info(f"Completed task: {task.id} - {task.title}")

        return jsonify({
            'success': True,
            'task': task.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error completing task {task_id}: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/tasks/stats', methods=['GET'])
def get_task_stats():
    """Get task statistics"""
    try:
        space_id = request.args.get('space_id', type=int)

        stats = TaskService.get_task_stats(space_id)

        return jsonify({
            'success': True,
            'stats': stats
        })

    except Exception as e:
        logger.error(f"Error getting task stats: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/tasks/overdue', methods=['GET'])
def get_overdue_tasks():
    """Get overdue tasks"""
    try:
        space_id = request.args.get('space_id', type=int)

        tasks = TaskService.get_overdue_tasks(space_id)

        return jsonify({
            'success': True,
            'tasks': [task.to_dict() for task in tasks],
            'count': len(tasks)
        })

    except Exception as e:
        logger.error(f"Error getting overdue tasks: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/spaces/<int:space_id>/tasks', methods=['GET'])
def get_space_tasks(space_id):
    """Get all tasks for a specific space"""
    try:
        # Verify space exists
        space = Space.query.get(space_id)
        if not space:
            return jsonify({
                'success': False,
                'message': 'Space not found'
            }), 404

        status = request.args.get('status', type=str)
        priority = request.args.get('priority', type=str)

        tasks = TaskService.list_tasks(
            space_id=space_id,
            status_filter=status,
            priority_filter=priority
        )

        stats = TaskService.get_task_stats(space_id)

        return jsonify({
            'success': True,
            'tasks': [task.to_dict() for task in tasks],
            'stats': stats,
            'space': space.to_dict()
        })

    except Exception as e:
        logger.error(f"Error getting tasks for space {space_id}: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ===================================
# Phase 2: Subtask Endpoints
# ===================================

@app.route('/api/tasks/<int:task_id>/subtasks', methods=['GET'])
def get_subtasks(task_id):
    """Get all subtasks for a task"""
    try:
        task = TaskService.get_task(task_id)
        if not task:
            return jsonify({
                'success': False,
                'message': 'Task not found'
            }), 404

        subtasks = TaskService.get_subtasks(task_id)

        return jsonify({
            'success': True,
            'subtasks': [s.to_dict() for s in subtasks],
            'parent_task': task.to_dict()
        })

    except Exception as e:
        logger.error(f"Error getting subtasks for task {task_id}: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/tasks/<int:task_id>/subtasks', methods=['POST'])
def create_subtask(task_id):
    """Create a subtask under a parent task"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400

        title = data.get('title')
        if not title:
            return jsonify({
                'success': False,
                'message': 'Title is required'
            }), 400

        # Parse due date if provided
        due_date = None
        if data.get('due_date'):
            try:
                due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid due_date format'
                }), 400

        subtask = TaskService.create_subtask(
            parent_task_id=task_id,
            title=title,
            description=data.get('description'),
            priority=data.get('priority', 'medium'),
            due_date=due_date
        )

        return jsonify({
            'success': True,
            'subtask': subtask.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
    except Exception as e:
        logger.error(f"Error creating subtask for task {task_id}: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/tasks/<int:task_id>/subtasks/reorder', methods=['PUT'])
def reorder_subtasks(task_id):
    """Reorder subtasks within a parent task"""
    try:
        data = request.get_json()
        if not data or 'subtask_ids' not in data:
            return jsonify({
                'success': False,
                'message': 'subtask_ids array is required'
            }), 400

        TaskService.reorder_subtasks(task_id, data['subtask_ids'])

        return jsonify({
            'success': True,
            'message': 'Subtasks reordered successfully'
        })

    except Exception as e:
        logger.error(f"Error reordering subtasks for task {task_id}: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/tasks/<int:task_id>/with-subtasks', methods=['GET'])
def get_task_with_subtasks(task_id):
    """Get a task with all its subtasks included"""
    try:
        task_data = TaskService.get_task_with_subtasks(task_id)
        if not task_data:
            return jsonify({
                'success': False,
                'message': 'Task not found'
            }), 404

        return jsonify({
            'success': True,
            'task': task_data
        })

    except Exception as e:
        logger.error(f"Error getting task with subtasks {task_id}: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ===================================
# Phase 2: Recurrence Endpoints
# ===================================

@app.route('/api/tasks/<int:task_id>/recurrence', methods=['PUT'])
def update_task_recurrence(task_id):
    """Update recurrence settings for a task"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400

        # Parse end date if provided
        end_date = None
        if data.get('recurrence_end_date'):
            try:
                end_date = datetime.fromisoformat(data['recurrence_end_date'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid recurrence_end_date format'
                }), 400

        task = TaskService.update_recurrence(
            task_id=task_id,
            recurrence_type=data.get('recurrence_type'),
            recurrence_interval=data.get('recurrence_interval'),
            recurrence_days=data.get('recurrence_days'),
            recurrence_end_date=end_date
        )

        if not task:
            return jsonify({
                'success': False,
                'message': 'Task not found'
            }), 404

        return jsonify({
            'success': True,
            'task': task.to_dict()
        })

    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
    except Exception as e:
        logger.error(f"Error updating recurrence for task {task_id}: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/tasks/<int:task_id>/complete-recurring', methods=['POST'])
def complete_recurring_task(task_id):
    """Complete a recurring task and create next instance"""
    try:
        next_task = TaskService.complete_recurring_task(task_id)

        return jsonify({
            'success': True,
            'message': 'Task completed',
            'next_task': next_task.to_dict() if next_task else None
        })

    except Exception as e:
        logger.error(f"Error completing recurring task {task_id}: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/tasks/recurring', methods=['GET'])
def get_recurring_tasks():
    """Get all recurring tasks"""
    try:
        space_id = request.args.get('space_id', type=int)

        tasks = TaskService.get_recurring_tasks(space_id=space_id)

        return jsonify({
            'success': True,
            'tasks': [task.to_dict() for task in tasks]
        })

    except Exception as e:
        logger.error(f"Error getting recurring tasks: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ===================================
# Error Handlers
# ===================================

@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 Not Found: {request.url}")
    return jsonify({
        'success': False,
        'message': 'Resource not found',
        'error': 'NOT_FOUND'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 Internal Error: {error}", exc_info=True)
    db.session.rollback()  # Rollback any failed database transactions
    return jsonify({
        'success': False,
        'message': 'Internal server error. Please try again.',
        'error': 'INTERNAL_ERROR'
    }), 500


# ===================================
# API Routes - Calendar Events (Phase 4)
# ===================================

@app.route('/api/calendar/events', methods=['GET'])
def list_calendar_events():
    """List calendar events with optional filtering"""
    try:
        space_id = request.args.get('space_id', type=int)
        task_id = request.args.get('task_id', type=int)
        event_type = request.args.get('event_type', type=str)
        start_date = request.args.get('start_date', type=str)
        end_date = request.args.get('end_date', type=str)
        limit = request.args.get('limit', 100, type=int)

        # Parse dates if provided
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None

        events = CalendarService.list_events(
            space_id=space_id,
            task_id=task_id,
            event_type=event_type,
            start_date=start_dt,
            end_date=end_dt,
            limit=limit
        )

        return jsonify({
            'success': True,
            'events': [e.to_dict() for e in events]
        })
    except Exception as e:
        logger.error(f"Error listing calendar events: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/calendar/events/range', methods=['GET'])
def get_calendar_events_range():
    """Get calendar events for a date range (for calendar view)"""
    try:
        start_date = request.args.get('start_date', type=str)
        end_date = request.args.get('end_date', type=str)
        space_id = request.args.get('space_id', type=int)

        if not start_date or not end_date:
            return jsonify({'success': False, 'message': 'start_date and end_date are required'}), 400

        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)

        events = CalendarService.get_events_for_range(start_dt, end_dt, space_id)

        return jsonify({
            'success': True,
            'events': [e.to_dict() for e in events]
        })
    except Exception as e:
        logger.error(f"Error getting calendar events range: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/calendar/events', methods=['POST'])
def create_calendar_event():
    """Create a new calendar event"""
    try:
        data = request.get_json()

        if not data.get('title') or not data.get('start_time') or not data.get('end_time'):
            return jsonify({'success': False, 'message': 'title, start_time, and end_time are required'}), 400

        start_time = datetime.fromisoformat(data['start_time'])
        end_time = datetime.fromisoformat(data['end_time'])
        recurrence_end = datetime.fromisoformat(data['recurrence_end']) if data.get('recurrence_end') else None

        event = CalendarService.create_event(
            title=data['title'],
            start_time=start_time,
            end_time=end_time,
            space_id=data.get('space_id'),
            task_id=data.get('task_id'),
            description=data.get('description'),
            location=data.get('location'),
            all_day=data.get('all_day', False),
            timezone=data.get('timezone', 'UTC'),
            event_type=data.get('event_type', 'event'),
            color=data.get('color'),
            reminder_minutes=data.get('reminder_minutes'),
            attendees=data.get('attendees'),
            is_recurring=data.get('is_recurring', False),
            recurrence_rule=data.get('recurrence_rule'),
            recurrence_end=recurrence_end
        )

        return jsonify({
            'success': True,
            'event': event.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error creating calendar event: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/calendar/events/<int:event_id>', methods=['GET'])
def get_calendar_event(event_id):
    """Get a specific calendar event"""
    try:
        event = CalendarService.get_event(event_id)
        if not event:
            return jsonify({'success': False, 'message': 'Event not found'}), 404

        return jsonify({
            'success': True,
            'event': event.to_dict()
        })
    except Exception as e:
        logger.error(f"Error getting calendar event: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/calendar/events/<int:event_id>', methods=['PUT'])
def update_calendar_event(event_id):
    """Update a calendar event"""
    try:
        data = request.get_json()

        # Convert datetime strings if present
        if 'start_time' in data:
            data['start_time'] = datetime.fromisoformat(data['start_time'])
        if 'end_time' in data:
            data['end_time'] = datetime.fromisoformat(data['end_time'])
        if 'recurrence_end' in data and data['recurrence_end']:
            data['recurrence_end'] = datetime.fromisoformat(data['recurrence_end'])

        event = CalendarService.update_event(event_id, data)
        if not event:
            return jsonify({'success': False, 'message': 'Event not found'}), 404

        return jsonify({
            'success': True,
            'event': event.to_dict()
        })
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error updating calendar event: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/calendar/events/<int:event_id>', methods=['DELETE'])
def delete_calendar_event(event_id):
    """Delete a calendar event"""
    try:
        success = CalendarService.delete_event(event_id)
        if not success:
            return jsonify({'success': False, 'message': 'Event not found'}), 404

        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error deleting calendar event: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/calendar/events/from-task/<int:task_id>', methods=['POST'])
def create_event_from_task(task_id):
    """Create a calendar event from a task's due date"""
    try:
        data = request.get_json() or {}
        duration = data.get('duration_minutes', 60)

        event = CalendarService.create_event_from_task(task_id, duration)

        return jsonify({
            'success': True,
            'event': event.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error creating event from task: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/calendar/stats', methods=['GET'])
def get_calendar_stats():
    """Get calendar statistics"""
    try:
        space_id = request.args.get('space_id', type=int)
        stats = CalendarService.get_calendar_stats(space_id=space_id)
        return jsonify({'success': True, 'stats': stats})
    except Exception as e:
        logger.error(f"Error getting calendar stats: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# ===================================
# API Routes - Notifications (Phase 5)
# ===================================

@app.route('/api/notifications', methods=['GET'])
def list_notifications():
    """List notifications with optional filtering"""
    try:
        user_id = request.args.get('user_id', type=int)
        space_id = request.args.get('space_id', type=int)
        notification_type = request.args.get('type', type=str)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        limit = request.args.get('limit', 50, type=int)

        notifications = NotificationService.list_notifications(
            user_id=user_id,
            space_id=space_id,
            notification_type=notification_type,
            unread_only=unread_only,
            limit=limit
        )

        return jsonify({
            'success': True,
            'notifications': [n.to_dict() for n in notifications]
        })
    except Exception as e:
        logger.error(f"Error listing notifications: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/notifications', methods=['POST'])
def create_notification():
    """Create a new notification"""
    try:
        data = request.get_json()

        if not data.get('title') or not data.get('type'):
            return jsonify({'success': False, 'message': 'title and type are required'}), 400

        scheduled_for = None
        if data.get('scheduled_for'):
            scheduled_for = datetime.fromisoformat(data['scheduled_for'])

        notification = NotificationService.create_notification(
            title=data['title'],
            notification_type=data['type'],
            message=data.get('message'),
            user_id=data.get('user_id'),
            task_id=data.get('task_id'),
            space_id=data.get('space_id'),
            priority=data.get('priority', 'normal'),
            action_url=data.get('action_url'),
            action_data=data.get('action_data'),
            scheduled_for=scheduled_for
        )

        return jsonify({
            'success': True,
            'notification': notification.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/notifications/<int:notification_id>', methods=['GET'])
def get_notification(notification_id):
    """Get a specific notification"""
    try:
        notification = NotificationService.get_notification(notification_id)
        if not notification:
            return jsonify({'success': False, 'message': 'Notification not found'}), 404

        return jsonify({
            'success': True,
            'notification': notification.to_dict()
        })
    except Exception as e:
        logger.error(f"Error getting notification: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        notification = NotificationService.mark_as_read(notification_id)
        if not notification:
            return jsonify({'success': False, 'message': 'Notification not found'}), 404

        return jsonify({
            'success': True,
            'notification': notification.to_dict()
        })
    except Exception as e:
        logger.error(f"Error marking notification read: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/notifications/read-all', methods=['POST'])
def mark_all_notifications_read():
    """Mark all notifications as read"""
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id')

        count = NotificationService.mark_all_as_read(user_id)

        return jsonify({
            'success': True,
            'count': count
        })
    except Exception as e:
        logger.error(f"Error marking all notifications read: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/notifications/<int:notification_id>/dismiss', methods=['POST'])
def dismiss_notification(notification_id):
    """Dismiss a notification"""
    try:
        notification = NotificationService.dismiss(notification_id)
        if not notification:
            return jsonify({'success': False, 'message': 'Notification not found'}), 404

        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error dismissing notification: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/notifications/dismiss-all', methods=['POST'])
def dismiss_all_notifications():
    """Dismiss all notifications"""
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id')

        count = NotificationService.dismiss_all(user_id)

        return jsonify({
            'success': True,
            'count': count
        })
    except Exception as e:
        logger.error(f"Error dismissing all notifications: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/notifications/<int:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    """Delete a notification"""
    try:
        success = NotificationService.delete_notification(notification_id)
        if not success:
            return jsonify({'success': False, 'message': 'Notification not found'}), 404

        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/notifications/unread-count', methods=['GET'])
def get_unread_notification_count():
    """Get count of unread notifications"""
    try:
        user_id = request.args.get('user_id', type=int)
        count = NotificationService.get_unread_count(user_id)
        return jsonify({'success': True, 'count': count})
    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/notifications/stats', methods=['GET'])
def get_notification_stats():
    """Get notification statistics"""
    try:
        user_id = request.args.get('user_id', type=int)
        stats = NotificationService.get_notification_stats(user_id)
        return jsonify({'success': True, 'stats': stats})
    except Exception as e:
        logger.error(f"Error getting notification stats: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# ===================================
# API Routes - Task Templates (Phase 6)
# ===================================

@app.route('/api/templates', methods=['GET'])
def list_task_templates():
    """List task templates with optional filtering"""
    try:
        space_id = request.args.get('space_id', type=int)
        category = request.args.get('category', type=str)
        include_global = request.args.get('include_global', 'true').lower() == 'true'
        limit = request.args.get('limit', 100, type=int)

        templates = TaskTemplateService.list_templates(
            space_id=space_id,
            category=category,
            include_global=include_global,
            limit=limit
        )

        return jsonify({
            'success': True,
            'templates': [t.to_dict() for t in templates]
        })
    except Exception as e:
        logger.error(f"Error listing templates: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/templates', methods=['POST'])
def create_task_template():
    """Create a new task template"""
    try:
        data = request.get_json()

        if not data.get('name') or not data.get('title_template'):
            return jsonify({'success': False, 'message': 'name and title_template are required'}), 400

        template = TaskTemplateService.create_template(
            name=data['name'],
            title_template=data['title_template'],
            description=data.get('description'),
            description_template=data.get('description_template'),
            default_priority=data.get('default_priority', 'medium'),
            default_due_offset_days=data.get('default_due_offset_days'),
            default_recurrence_type=data.get('default_recurrence_type'),
            default_recurrence_interval=data.get('default_recurrence_interval', 1),
            default_recurrence_days=data.get('default_recurrence_days'),
            subtask_templates=data.get('subtask_templates'),
            category=data.get('category'),
            tags=data.get('tags'),
            icon=data.get('icon'),
            color=data.get('color'),
            space_id=data.get('space_id'),
            is_global=data.get('is_global', False)
        )

        return jsonify({
            'success': True,
            'template': template.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error creating template: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/templates/<int:template_id>', methods=['GET'])
def get_task_template(template_id):
    """Get a specific task template"""
    try:
        template = TaskTemplateService.get_template(template_id)
        if not template:
            return jsonify({'success': False, 'message': 'Template not found'}), 404

        return jsonify({
            'success': True,
            'template': template.to_dict()
        })
    except Exception as e:
        logger.error(f"Error getting template: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/templates/<int:template_id>', methods=['PUT'])
def update_task_template(template_id):
    """Update a task template"""
    try:
        data = request.get_json()

        template = TaskTemplateService.update_template(template_id, data)
        if not template:
            return jsonify({'success': False, 'message': 'Template not found'}), 404

        return jsonify({
            'success': True,
            'template': template.to_dict()
        })
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error updating template: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/templates/<int:template_id>', methods=['DELETE'])
def delete_task_template(template_id):
    """Delete a task template"""
    try:
        success = TaskTemplateService.delete_template(template_id)
        if not success:
            return jsonify({'success': False, 'message': 'Template not found'}), 404

        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error deleting template: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/templates/<int:template_id>/apply', methods=['POST'])
def apply_task_template(template_id):
    """Create a task from a template"""
    try:
        data = request.get_json()

        if not data.get('space_id'):
            return jsonify({'success': False, 'message': 'space_id is required'}), 400

        due_date = None
        if data.get('due_date'):
            due_date = datetime.fromisoformat(data['due_date'])

        task = TaskTemplateService.apply_template(
            template_id=template_id,
            space_id=data['space_id'],
            title_vars=data.get('title_vars'),
            description_vars=data.get('description_vars'),
            due_date=due_date,
            create_subtasks=data.get('create_subtasks', True)
        )

        return jsonify({
            'success': True,
            'task': task.to_dict(include_subtasks=True)
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error applying template: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/templates/<int:template_id>/duplicate', methods=['POST'])
def duplicate_task_template(template_id):
    """Create a copy of an existing template"""
    try:
        data = request.get_json() or {}
        new_name = data.get('name')

        template = TaskTemplateService.duplicate_template(template_id, new_name)

        return jsonify({
            'success': True,
            'template': template.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error duplicating template: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/templates/categories', methods=['GET'])
def get_template_categories():
    """Get all template categories"""
    try:
        categories = TaskTemplateService.get_template_categories()
        return jsonify({'success': True, 'categories': categories})
    except Exception as e:
        logger.error(f"Error getting template categories: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/templates/popular', methods=['GET'])
def get_popular_templates():
    """Get most frequently used templates"""
    try:
        limit = request.args.get('limit', 10, type=int)
        templates = TaskTemplateService.get_popular_templates(limit)
        return jsonify({
            'success': True,
            'templates': [t.to_dict() for t in templates]
        })
    except Exception as e:
        logger.error(f"Error getting popular templates: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/templates/recent', methods=['GET'])
def get_recent_templates():
    """Get recently used templates"""
    try:
        limit = request.args.get('limit', 10, type=int)
        templates = TaskTemplateService.get_recent_templates(limit)
        return jsonify({
            'success': True,
            'templates': [t.to_dict() for t in templates]
        })
    except Exception as e:
        logger.error(f"Error getting recent templates: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/templates/search', methods=['GET'])
def search_templates():
    """Search templates by name, description, or tags"""
    try:
        query = request.args.get('q', '')
        space_id = request.args.get('space_id', type=int)

        if not query:
            return jsonify({'success': False, 'message': 'Search query is required'}), 400

        templates = TaskTemplateService.search_templates(query, space_id)
        return jsonify({
            'success': True,
            'templates': [t.to_dict() for t in templates]
        })
    except Exception as e:
        logger.error(f"Error searching templates: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/templates/seed', methods=['POST'])
def seed_default_templates():
    """Seed default task templates"""
    try:
        templates = TaskTemplateService.seed_default_templates()
        return jsonify({
            'success': True,
            'message': f'Created {len(templates)} default templates',
            'templates': [t.to_dict() for t in templates]
        })
    except Exception as e:
        logger.error(f"Error seeding templates: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.errorhandler(Exception)
def handle_exception(error):
    """Handle uncaught exceptions"""
    logger.error(f"Unhandled exception: {error}", exc_info=True)
    db.session.rollback()

    # Return JSON for API requests, HTML for web requests
    if request.path.startswith('/api/'):
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': 'UNEXPECTED_ERROR'
        }), 500
    else:
        return render_template('error.html', error=str(error)), 500

# ===================================
# Application Entry Point
# ===================================

if __name__ == '__main__':
    with app.app_context():
        # Create database tables if they don't exist
        db.create_all()

        # Ensure agents are seeded
        if Agent.query.count() == 0:
            print("[INFO] Database is empty, seeding agents...")
            from models import seed_agents
            seed_agents()

        # Create default Personal space and sync Personal agents
        create_default_personal_space()
        sync_personal_agents_to_spaces()

        # Seed default integrations
        seed_integrations()

        print("\n" + "=" * 70)
        print("CLEO - AI AGENT WORKSPACE")
        print("=" * 70)
        print(f"Registered Agents: {agent_count()}")
        print(f"Agent Names: {', '.join(list_agent_names())}")
        print("\nStarting Flask server...")
        print("Access the app at: http://localhost:8080")
        print("=" * 70 + "\n")

    # Run the app
    app.run(
        host='0.0.0.0',
        port=8080,
        debug=True
    )
