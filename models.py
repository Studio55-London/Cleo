"""
Cleo Database Models
Database schema for agents, jobs, activities, spaces, messages, and users
Supports both SQLite (local development) and PostgreSQL with pgvector (production)
"""
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from pathlib import Path
import json
import os

db = SQLAlchemy()

# Check if we're using PostgreSQL with pgvector
USE_PGVECTOR = os.getenv("USE_PGVECTOR", "false").lower() == "true"

# Conditionally import pgvector Vector type
try:
    if USE_PGVECTOR:
        from pgvector.sqlalchemy import Vector
        VECTOR_TYPE = Vector(384)  # Dimension for all-MiniLM-L6-v2 embeddings
    else:
        VECTOR_TYPE = None
except ImportError:
    VECTOR_TYPE = None


class User(UserMixin, db.Model):
    """User model for authentication"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)  # Nullable for OAuth-only users
    full_name = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    last_login = db.Column(db.DateTime)

    # Email Verification
    email_verified = db.Column(db.Boolean, default=False)
    email_verification_token = db.Column(db.String(255), nullable=True)
    email_verification_sent_at = db.Column(db.DateTime, nullable=True)

    # Password Reset
    password_reset_token = db.Column(db.String(255), nullable=True)
    password_reset_expires_at = db.Column(db.DateTime, nullable=True)

    # Account Lockout
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)

    # JWT Token Management
    refresh_token_jti = db.Column(db.String(255), nullable=True)

    # Relationships
    oauth_accounts = db.relationship('OAuthAccount', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check password against hash"""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def is_locked(self):
        """Check if account is currently locked"""
        if self.locked_until is None:
            return False
        return datetime.now() < self.locked_until

    def record_failed_login(self, max_attempts=5, lockout_minutes=30):
        """Record a failed login attempt and lock account if needed"""
        self.failed_login_attempts = (self.failed_login_attempts or 0) + 1
        if self.failed_login_attempts >= max_attempts:
            from datetime import timedelta
            self.locked_until = datetime.now() + timedelta(minutes=lockout_minutes)

    def reset_login_attempts(self):
        """Reset failed login attempts after successful login"""
        self.failed_login_attempts = 0
        self.locked_until = None

    def generate_verification_token(self):
        """Generate email verification token"""
        import secrets
        self.email_verification_token = secrets.token_urlsafe(32)
        self.email_verification_sent_at = datetime.now()
        return self.email_verification_token

    def generate_password_reset_token(self, expires_hours=24):
        """Generate password reset token"""
        import secrets
        from datetime import timedelta
        self.password_reset_token = secrets.token_urlsafe(32)
        self.password_reset_expires_at = datetime.now() + timedelta(hours=expires_hours)
        return self.password_reset_token

    def clear_password_reset_token(self):
        """Clear password reset token after use"""
        self.password_reset_token = None
        self.password_reset_expires_at = None

    def to_dict(self):
        """Convert user to dictionary (without sensitive data)"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'is_admin': self.is_admin,
            'email_verified': self.email_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'has_password': self.password_hash is not None,
            'oauth_providers': [acc.provider for acc in self.oauth_accounts] if self.oauth_accounts else []
        }

    def __repr__(self):
        return f'<User {self.username}>'


class OAuthAccount(db.Model):
    """OAuth provider accounts linked to users"""
    __tablename__ = 'oauth_accounts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    provider = db.Column(db.String(50), nullable=False)  # google, microsoft
    provider_user_id = db.Column(db.String(255), nullable=False)
    provider_email = db.Column(db.String(255))
    access_token = db.Column(db.Text)
    refresh_token = db.Column(db.Text)
    token_expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # Unique constraint on provider + provider_user_id
    __table_args__ = (
        db.UniqueConstraint('provider', 'provider_user_id', name='uq_oauth_provider_user'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'provider': self.provider,
            'provider_email': self.provider_email,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<OAuthAccount {self.provider} for User {self.user_id}>'


class TokenBlocklist(db.Model):
    """Blocklist for revoked JWT tokens"""
    __tablename__ = 'token_blocklist'

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(255), nullable=False, unique=True, index=True)
    token_type = db.Column(db.String(20), nullable=False)  # access, refresh
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    revoked_at = db.Column(db.DateTime, default=datetime.now, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)

    def __repr__(self):
        return f'<TokenBlocklist {self.jti[:8]}... ({self.token_type})>'


class Agent(db.Model):
    """AI Agent definition"""
    __tablename__ = 'agents'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # master, personal, team, worker, expert
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='active')  # active, inactive
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    jobs = db.relationship('Job', backref='agent', lazy=True, cascade='all, delete-orphan')
    activities = db.relationship('Activity', backref='agent', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'description': self.description,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f'<Agent {self.name}>'


class Job(db.Model):
    """Scheduled job for an agent"""
    __tablename__ = 'jobs'

    id = db.Column(db.Integer, primary_key=True)
    agent_id = db.Column(db.Integer, db.ForeignKey('agents.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    frequency = db.Column(db.String(50), default='manual')  # manual, once, daily, weekly, monthly, custom
    cron_expression = db.Column(db.String(100))  # For custom schedules
    sop = db.Column(db.Text)  # Standard Operating Procedure / Instructions
    status = db.Column(db.String(20), default='active')  # active, paused, completed
    last_run = db.Column(db.DateTime)
    next_run = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    activities = db.relationship('Activity', backref='job', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'agent_id': self.agent_id,
            'agent_name': self.agent.name if self.agent else None,
            'name': self.name,
            'description': self.description,
            'frequency': self.frequency,
            'cron_expression': self.cron_expression,
            'sop': self.sop,
            'status': self.status,
            'last_run': self.last_run.isoformat() if self.last_run else None,
            'next_run': self.next_run.isoformat() if self.next_run else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f'<Job {self.name}>'


class Activity(db.Model):
    """Activity log for agent executions"""
    __tablename__ = 'activities'

    id = db.Column(db.Integer, primary_key=True)
    agent_id = db.Column(db.Integer, db.ForeignKey('agents.id'), nullable=False)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    summary = db.Column(db.Text)
    output_data = db.Column(db.Text)  # JSON string for structured data
    status = db.Column(db.String(20), default='success')  # success, failed, warning
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'agent_id': self.agent_id,
            'agent_name': self.agent.name if self.agent else None,
            'job_id': self.job_id,
            'job_name': self.job.name if self.job else None,
            'title': self.title,
            'summary': self.summary,
            'output_data': self.output_data,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
        }

    def __repr__(self):
        return f'<Activity {self.title}>'


class Space(db.Model):
    """Collaborative workspace for agents and users"""
    __tablename__ = 'spaces'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    agent_ids = db.Column(db.Text)  # JSON string of agent IDs
    master_agent_id = db.Column(db.Integer, db.ForeignKey('agents.id'), nullable=True)  # Master agent for this space
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    messages = db.relationship('Message', backref='space', lazy=True, cascade='all, delete-orphan')
    master_agent = db.relationship('Agent', foreign_keys=[master_agent_id])

    def get_agents(self):
        """Get list of agent IDs in this space"""
        if not self.agent_ids:
            return []
        try:
            return json.loads(self.agent_ids)
        except:
            return []

    def set_agents(self, agent_list):
        """Set list of agent IDs for this space"""
        self.agent_ids = json.dumps(agent_list)

    def to_dict(self):
        """Convert space to dictionary with full agent details"""
        agent_list = []
        agent_ids = self.get_agents()

        for agent_id in agent_ids:
            agent = Agent.query.get(agent_id)
            if agent:
                agent_list.append({
                    'id': agent.id,
                    'name': agent.name,
                    'tier': agent.type
                })

        # Get master agent info
        master_agent_info = None
        if self.master_agent_id and self.master_agent:
            master_agent_info = {
                'id': self.master_agent.id,
                'name': self.master_agent.name,
                'tier': self.master_agent.type,
                'description': self.master_agent.description
            }

        return {
            'id': str(self.id),
            'name': self.name,
            'description': self.description or '',
            'agents': agent_list,
            'master_agent_id': self.master_agent_id,
            'master_agent': master_agent_info,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'unread': 0  # TODO: Implement unread count
        }

    def __repr__(self):
        return f'<Space {self.name}>'


class Message(db.Model):
    """Message in a space (from user or agent)"""
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    space_id = db.Column(db.Integer, db.ForeignKey('spaces.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' or 'agent'
    author = db.Column(db.String(100), nullable=False)
    agent_name = db.Column(db.String(100))  # For agent messages
    agent_tier = db.Column(db.String(50))   # For agent messages
    content = db.Column(db.Text, nullable=False)
    mentions = db.Column(db.Text)  # JSON string of mentioned agents
    citations = db.Column(db.Text)  # JSON string of retrieved document sources
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def get_mentions(self):
        """Get list of mentions"""
        if not self.mentions:
            return []
        try:
            return json.loads(self.mentions)
        except:
            return []

    def set_mentions(self, mentions_list):
        """Set list of mentions"""
        self.mentions = json.dumps(mentions_list)

    def get_citations(self):
        """Get list of document citations"""
        if not self.citations:
            return []
        try:
            return json.loads(self.citations)
        except:
            return []

    def set_citations(self, citations_list):
        """Set list of document citations"""
        self.citations = json.dumps(citations_list)

    def to_dict(self):
        """Convert message to dictionary"""
        result = {
            'id': self.id,
            'role': self.role,
            'author': self.author,
            'content': self.content,
            'timestamp': self.timestamp.isoformat()
        }

        # Add agent-specific fields
        if self.role == 'agent' and self.agent_name:
            result['agent_name'] = self.agent_name
            result['agent_tier'] = self.agent_tier

        # Add mentions if present
        mentions = self.get_mentions()
        if mentions:
            result['mentions'] = mentions

        # Add citations if present
        citations = self.get_citations()
        if citations:
            result['citations'] = citations

        return result

    def __repr__(self):
        return f'<Message {self.role} in Space {self.space_id}>'


# ===================================
# Knowledge Base Models (GraphRAG)
# ===================================

class Document(db.Model):
    """Uploaded document for knowledge base"""
    __tablename__ = 'documents'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    filename = db.Column(db.String(255))  # Original filename
    title = db.Column(db.String(500))  # Document title (extracted or provided)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50))  # pdf, docx, txt, md
    file_size = db.Column(db.Integer)  # in bytes
    content = db.Column(db.Text)  # Extracted text content
    status = db.Column(db.String(20), default='processing')  # processing, ready, error
    chunk_count = db.Column(db.Integer, default=0)
    entity_count = db.Column(db.Integer, default=0)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime)

    # Azure Blob Storage fields
    storage_type = db.Column(db.String(20), default='local')  # local, azure_blob
    blob_name = db.Column(db.String(500))  # Azure Blob Storage name
    blob_url = db.Column(db.String(1000))  # Azure Blob URL (without SAS token)
    blob_container = db.Column(db.String(100))  # Container name

    # Relationships
    chunks = db.relationship('DocumentChunk', backref='document', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'filename': self.filename,
            'title': self.title,
            'file_type': self.file_type,
            'size': self.format_file_size(),
            'status': self.status,
            'chunks': self.chunk_count,
            'entities': self.entity_count,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'storage_type': self.storage_type,
            'blob_name': self.blob_name
        }

    def format_file_size(self):
        """Format file size in human-readable format"""
        size = self.file_size
        if not size:
            return "Unknown"

        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"

    def __repr__(self):
        return f'<Document {self.name}>'


class DocumentChunk(db.Model):
    """Text chunk from a document with embeddings"""
    __tablename__ = 'document_chunks'

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    chunk_index = db.Column(db.Integer, nullable=False)  # Order in document
    content = db.Column(db.Text, nullable=False)  # The actual text chunk
    token_count = db.Column(db.Integer)
    embedding = db.Column(db.Text)  # JSON-serialized vector embedding (SQLite fallback)
    chunk_metadata = db.Column(db.Text)  # JSON metadata (page number, section, etc.)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # pgvector embedding column for PostgreSQL production
    # This column is added via Alembic migration when USE_PGVECTOR=true
    # embedding_vector = db.Column(Vector(384))  # Added dynamically

    # Additional fields for Azure Blob Storage
    blob_name = db.Column(db.String(500))  # Azure Blob Storage reference
    filename = db.Column(db.String(255))  # Original filename for this chunk's document

    def set_embedding(self, vector):
        """Store embedding as JSON (SQLite) or update pgvector column (PostgreSQL)"""
        if USE_PGVECTOR and hasattr(self, 'embedding_vector'):
            # For pgvector, the embedding is stored directly
            self.embedding_vector = vector
        else:
            # For SQLite, store as JSON string
            self.embedding = json.dumps(vector)

    def get_embedding(self):
        """Retrieve embedding as list"""
        if USE_PGVECTOR and hasattr(self, 'embedding_vector') and self.embedding_vector is not None:
            # pgvector returns numpy array or list
            emb = self.embedding_vector
            return list(emb) if hasattr(emb, '__iter__') else None
        # Fall back to JSON column
        return json.loads(self.embedding) if self.embedding else None

    def set_metadata(self, data):
        """Store metadata as JSON"""
        self.chunk_metadata = json.dumps(data)

    def get_metadata(self):
        """Retrieve metadata as dict"""
        return json.loads(self.chunk_metadata) if self.chunk_metadata else {}

    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'chunk_index': self.chunk_index,
            'content': self.content[:200] + '...' if len(self.content) > 200 else self.content,
            'token_count': self.token_count,
            'metadata': self.get_metadata(),
            'has_embedding': self.get_embedding() is not None
        }

    def __repr__(self):
        return f'<DocumentChunk {self.id} from Document {self.document_id}>'


class Entity(db.Model):
    """Extracted entity from knowledge graph"""
    __tablename__ = 'entities'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    entity_type = db.Column(db.String(50))  # person, organization, location, concept, etc.
    description = db.Column(db.Text)
    properties = db.Column(db.Text)  # JSON-serialized properties
    source_chunks = db.Column(db.Text)  # JSON list of chunk IDs
    mention_count = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships for outgoing relations
    outgoing_relations = db.relationship('Relation',
                                        foreign_keys='Relation.source_entity_id',
                                        backref='source_entity',
                                        lazy=True,
                                        cascade='all, delete-orphan')

    # Relationships for incoming relations
    incoming_relations = db.relationship('Relation',
                                        foreign_keys='Relation.target_entity_id',
                                        backref='target_entity',
                                        lazy=True,
                                        cascade='all, delete-orphan')

    def set_properties(self, props):
        """Store properties as JSON"""
        import json
        self.properties = json.dumps(props)

    def get_properties(self):
        """Retrieve properties as dict"""
        import json
        return json.loads(self.properties) if self.properties else {}

    def set_source_chunks(self, chunks):
        """Store source chunk IDs as JSON"""
        import json
        self.source_chunks = json.dumps(chunks)

    def get_source_chunks(self):
        """Retrieve source chunk IDs as list"""
        import json
        return json.loads(self.source_chunks) if self.source_chunks else []

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.entity_type,
            'description': self.description,
            'properties': self.get_properties(),
            'mention_count': self.mention_count,
            'created_at': self.created_at.isoformat()
        }

    def __repr__(self):
        return f'<Entity {self.name} ({self.entity_type})>'


class Relation(db.Model):
    """Relationship between entities in knowledge graph"""
    __tablename__ = 'relations'

    id = db.Column(db.Integer, primary_key=True)
    source_entity_id = db.Column(db.Integer, db.ForeignKey('entities.id'), nullable=False)
    target_entity_id = db.Column(db.Integer, db.ForeignKey('entities.id'), nullable=False)
    relation_type = db.Column(db.String(100), nullable=False)  # works_for, located_in, etc.
    properties = db.Column(db.Text)  # JSON-serialized additional properties
    source_chunks = db.Column(db.Text)  # JSON list of chunk IDs where relation was found
    confidence = db.Column(db.Float, default=1.0)  # Confidence score
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_properties(self, props):
        """Store properties as JSON"""
        import json
        self.properties = json.dumps(props)

    def get_properties(self):
        """Retrieve properties as dict"""
        import json
        return json.loads(self.properties) if self.properties else {}

    def set_source_chunks(self, chunks):
        """Store source chunk IDs as JSON"""
        import json
        self.source_chunks = json.dumps(chunks)

    def get_source_chunks(self):
        """Retrieve source chunk IDs as list"""
        import json
        return json.loads(self.source_chunks) if self.source_chunks else []

    def to_dict(self):
        return {
            'id': self.id,
            'source': self.source_entity_id,
            'target': self.target_entity_id,
            'type': self.relation_type,
            'properties': self.get_properties(),
            'confidence': self.confidence
        }

    def __repr__(self):
        return f'<Relation {self.source_entity_id} -{self.relation_type}-> {self.target_entity_id}>'


class Skill(db.Model):
    """Agent Skill definition following Claude SKILL.md format"""
    __tablename__ = 'skills'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)  # lowercase-hyphenated identifier
    display_name = db.Column(db.String(100), nullable=False)  # Human-readable name
    description = db.Column(db.String(1024), nullable=False)  # What it does & when to use
    content = db.Column(db.Text, nullable=False)  # Full SKILL.md content
    agent_id = db.Column(db.Integer, db.ForeignKey('agents.id'), nullable=True)
    is_global = db.Column(db.Boolean, default=False)  # Available to all agents
    is_active = db.Column(db.Boolean, default=True)
    category = db.Column(db.String(50))  # productivity, communication, analysis, etc.
    triggers = db.Column(db.Text)  # JSON array of keywords that activate this skill
    version = db.Column(db.String(20), default='1.0.0')
    author = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    agent = db.relationship('Agent', backref=db.backref('skills', lazy='dynamic'))

    def get_triggers(self):
        """Get list of trigger keywords"""
        if not self.triggers:
            return []
        try:
            return json.loads(self.triggers)
        except:
            return []

    def set_triggers(self, triggers_list):
        """Set list of trigger keywords"""
        self.triggers = json.dumps(triggers_list)

    def to_dict(self):
        """Convert skill to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'displayName': self.display_name,
            'description': self.description,
            'content': self.content,
            'agentId': self.agent_id,
            'agentName': self.agent.name if self.agent else None,
            'isGlobal': self.is_global,
            'isActive': self.is_active,
            'category': self.category,
            'triggers': self.get_triggers(),
            'version': self.version,
            'author': self.author,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

    def to_summary(self):
        """Get minimal summary for system prompt injection"""
        return {
            'name': self.name,
            'description': self.description
        }

    def __repr__(self):
        return f'<Skill {self.name}>'


class Integration(db.Model):
    """Integration configuration for external services"""
    __tablename__ = 'integrations'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)  # todoist, telegram, microsoft_graph, etc.
    display_name = db.Column(db.String(200))  # Human-readable name
    description = db.Column(db.Text)
    category = db.Column(db.String(100))  # productivity, communication, calendar, etc.
    icon = db.Column(db.String(100))  # Icon identifier or SVG
    enabled = db.Column(db.Boolean, default=False)
    config = db.Column(db.Text)  # JSON string for configuration (API keys, settings, etc.)
    status = db.Column(db.String(50), default='disconnected')  # connected, disconnected, error
    last_sync = db.Column(db.DateTime)
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def get_config(self):
        """Get configuration as dictionary"""
        if not self.config:
            return {}
        try:
            return json.loads(self.config)
        except:
            return {}

    def set_config(self, config_dict):
        """Set configuration from dictionary"""
        self.config = json.dumps(config_dict)

    def to_dict(self, include_secrets=False):
        """Convert to dictionary"""
        config = self.get_config()
        # Mask sensitive fields unless explicitly requested
        if not include_secrets:
            masked_config = {}
            for key, value in config.items():
                if any(secret in key.lower() for secret in ['key', 'token', 'secret', 'password']):
                    masked_config[key] = '***' if value else ''
                else:
                    masked_config[key] = value
            config = masked_config

        return {
            'id': self.id,
            'name': self.name,
            'display_name': self.display_name,
            'description': self.description,
            'category': self.category,
            'icon': self.icon,
            'enabled': self.enabled,
            'config': config,
            'status': self.status,
            'last_sync': self.last_sync.isoformat() if self.last_sync else None,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Integration {self.name} ({self.status})>'


class Task(db.Model):
    """Task management for spaces - from AscendoreQ integration"""
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    space_id = db.Column(db.Integer, db.ForeignKey('spaces.id'), nullable=False)
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    priority = db.Column(db.String(20), default='medium')  # low, medium, high
    status = db.Column(db.String(20), default='todo')  # todo, in_progress, completed
    due_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    # Phase 2: Recurrence fields
    recurrence_type = db.Column(db.String(20))  # none, daily, weekly, monthly, custom
    recurrence_interval = db.Column(db.Integer, default=1)  # Every N days/weeks/months
    recurrence_days = db.Column(db.Text)  # JSON array of days for weekly (0=Mon, 6=Sun)
    recurrence_end_date = db.Column(db.DateTime)  # When recurrence stops
    next_occurrence = db.Column(db.DateTime)  # Next scheduled occurrence
    is_recurring_instance = db.Column(db.Boolean, default=False)  # True if created from recurrence
    original_task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'))  # Reference to original recurring task

    # Phase 2: Subtask fields
    parent_task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'))  # Parent task for subtasks
    position = db.Column(db.Integer, default=0)  # Order position within parent

    # Relationships
    space = db.relationship('Space', backref=db.backref('tasks', lazy=True, cascade='all, delete-orphan'))
    subtasks = db.relationship('Task',
                               backref=db.backref('parent_task', remote_side=[id]),
                               foreign_keys=[parent_task_id],
                               lazy=True,
                               cascade='all, delete-orphan')
    recurring_instances = db.relationship('Task',
                                          backref=db.backref('original_task', remote_side=[id]),
                                          foreign_keys=[original_task_id],
                                          lazy=True)

    def get_recurrence_days(self):
        """Get list of recurrence days"""
        if not self.recurrence_days:
            return []
        try:
            return json.loads(self.recurrence_days)
        except:
            return []

    def set_recurrence_days(self, days_list):
        """Set list of recurrence days"""
        self.recurrence_days = json.dumps(days_list)

    def get_subtask_count(self):
        """Get count of subtasks"""
        return len(self.subtasks) if self.subtasks else 0

    def get_completed_subtask_count(self):
        """Get count of completed subtasks"""
        if not self.subtasks:
            return 0
        return len([s for s in self.subtasks if s.status == 'completed'])

    def to_dict(self, include_subtasks=False):
        """Convert task to dictionary"""
        result = {
            'id': self.id,
            'space_id': self.space_id,
            'space_name': self.space.name if self.space else None,
            'title': self.title,
            'description': self.description,
            'priority': self.priority,
            'status': self.status,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            # Recurrence fields
            'recurrence_type': self.recurrence_type,
            'recurrence_interval': self.recurrence_interval,
            'recurrence_days': self.get_recurrence_days(),
            'recurrence_end_date': self.recurrence_end_date.isoformat() if self.recurrence_end_date else None,
            'next_occurrence': self.next_occurrence.isoformat() if self.next_occurrence else None,
            'is_recurring_instance': self.is_recurring_instance,
            'original_task_id': self.original_task_id,
            # Subtask fields
            'parent_task_id': self.parent_task_id,
            'position': self.position,
            'subtask_count': self.get_subtask_count(),
            'completed_subtask_count': self.get_completed_subtask_count(),
        }

        if include_subtasks and self.subtasks:
            result['subtasks'] = [s.to_dict(include_subtasks=False) for s in sorted(self.subtasks, key=lambda x: x.position)]

        return result

    def __repr__(self):
        return f'<Task {self.title[:30]}... ({self.status})>'


# ===================================
# Phase 5: Notification Model
# ===================================

class Notification(db.Model):
    """User notifications for tasks, reminders, and system events"""
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Null for system-wide
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=True)
    space_id = db.Column(db.Integer, db.ForeignKey('spaces.id'), nullable=True)

    # Notification content
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text)
    notification_type = db.Column(db.String(50), nullable=False)  # task_due, task_overdue, reminder, system, mention
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent

    # Status tracking
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime)
    is_dismissed = db.Column(db.Boolean, default=False)
    dismissed_at = db.Column(db.DateTime)

    # Action links
    action_url = db.Column(db.String(500))  # URL to navigate to when clicked
    action_data = db.Column(db.Text)  # JSON for additional action data

    # Scheduling
    scheduled_for = db.Column(db.DateTime)  # When to show the notification
    sent_at = db.Column(db.DateTime)  # When notification was actually sent

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    task = db.relationship('Task', backref=db.backref('notifications', lazy=True, cascade='all, delete-orphan'))
    space = db.relationship('Space', backref=db.backref('notifications', lazy=True, cascade='all, delete-orphan'))

    def get_action_data(self):
        """Get action data as dictionary"""
        if not self.action_data:
            return {}
        try:
            return json.loads(self.action_data)
        except:
            return {}

    def set_action_data(self, data):
        """Set action data from dictionary"""
        self.action_data = json.dumps(data)

    def mark_read(self):
        """Mark notification as read"""
        self.is_read = True
        self.read_at = datetime.utcnow()

    def mark_dismissed(self):
        """Mark notification as dismissed"""
        self.is_dismissed = True
        self.dismissed_at = datetime.utcnow()

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'task_id': self.task_id,
            'space_id': self.space_id,
            'title': self.title,
            'message': self.message,
            'type': self.notification_type,
            'priority': self.priority,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'is_dismissed': self.is_dismissed,
            'action_url': self.action_url,
            'action_data': self.get_action_data(),
            'scheduled_for': self.scheduled_for.isoformat() if self.scheduled_for else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'task': self.task.to_dict() if self.task else None,
            'space_name': self.space.name if self.space else None,
        }

    def __repr__(self):
        return f'<Notification {self.title} ({self.notification_type})>'


# ===================================
# Phase 6: Task Template Model
# ===================================

class TaskTemplate(db.Model):
    """Reusable task templates for quick task creation"""
    __tablename__ = 'task_templates'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)

    # Template defaults
    title_template = db.Column(db.String(500), nullable=False)  # Can include {placeholders}
    description_template = db.Column(db.Text)
    default_priority = db.Column(db.String(20), default='medium')
    default_due_offset_days = db.Column(db.Integer)  # Days from creation to due date

    # Recurrence defaults
    default_recurrence_type = db.Column(db.String(20))
    default_recurrence_interval = db.Column(db.Integer, default=1)
    default_recurrence_days = db.Column(db.Text)  # JSON array

    # Subtask templates
    subtask_templates = db.Column(db.Text)  # JSON array of subtask templates

    # Organization
    category = db.Column(db.String(100))  # work, personal, meeting, project, etc.
    tags = db.Column(db.Text)  # JSON array of tags
    icon = db.Column(db.String(50))  # Icon identifier
    color = db.Column(db.String(20))  # Hex color code

    # Ownership
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    space_id = db.Column(db.Integer, db.ForeignKey('spaces.id'))  # Space-specific template
    is_global = db.Column(db.Boolean, default=False)  # Available to all users/spaces
    is_active = db.Column(db.Boolean, default=True)

    # Usage tracking
    use_count = db.Column(db.Integer, default=0)
    last_used_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    space = db.relationship('Space', backref=db.backref('task_templates', lazy=True))

    def get_subtask_templates(self):
        """Get subtask templates as list"""
        if not self.subtask_templates:
            return []
        try:
            return json.loads(self.subtask_templates)
        except:
            return []

    def set_subtask_templates(self, templates):
        """Set subtask templates from list"""
        self.subtask_templates = json.dumps(templates)

    def get_tags(self):
        """Get tags as list"""
        if not self.tags:
            return []
        try:
            return json.loads(self.tags)
        except:
            return []

    def set_tags(self, tags_list):
        """Set tags from list"""
        self.tags = json.dumps(tags_list)

    def get_recurrence_days(self):
        """Get recurrence days as list"""
        if not self.default_recurrence_days:
            return []
        try:
            return json.loads(self.default_recurrence_days)
        except:
            return []

    def set_recurrence_days(self, days_list):
        """Set recurrence days from list"""
        self.default_recurrence_days = json.dumps(days_list)

    def increment_usage(self):
        """Track template usage"""
        self.use_count = (self.use_count or 0) + 1
        self.last_used_at = datetime.utcnow()

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'title_template': self.title_template,
            'description_template': self.description_template,
            'default_priority': self.default_priority,
            'default_due_offset_days': self.default_due_offset_days,
            'default_recurrence_type': self.default_recurrence_type,
            'default_recurrence_interval': self.default_recurrence_interval,
            'default_recurrence_days': self.get_recurrence_days(),
            'subtask_templates': self.get_subtask_templates(),
            'category': self.category,
            'tags': self.get_tags(),
            'icon': self.icon,
            'color': self.color,
            'space_id': self.space_id,
            'is_global': self.is_global,
            'is_active': self.is_active,
            'use_count': self.use_count,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<TaskTemplate {self.name}>'


# ===================================
# Phase 4: Calendar Event Model
# ===================================

class CalendarEvent(db.Model):
    """Calendar events linked to tasks or standalone"""
    __tablename__ = 'calendar_events'

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=True)
    space_id = db.Column(db.Integer, db.ForeignKey('spaces.id'), nullable=True)

    # Event details
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    location = db.Column(db.String(500))

    # Timing
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    all_day = db.Column(db.Boolean, default=False)
    timezone = db.Column(db.String(50), default='UTC')

    # Recurrence (for calendar-specific recurrence separate from tasks)
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_rule = db.Column(db.String(500))  # iCal RRULE format
    recurrence_end = db.Column(db.DateTime)

    # Event type and status
    event_type = db.Column(db.String(50), default='event')  # event, meeting, deadline, reminder, block
    status = db.Column(db.String(20), default='confirmed')  # confirmed, tentative, cancelled

    # Visual customization
    color = db.Column(db.String(20))  # Hex color code

    # External sync
    external_id = db.Column(db.String(255))  # ID from external calendar (Google, Outlook)
    external_source = db.Column(db.String(50))  # google_calendar, microsoft_365, etc.
    sync_status = db.Column(db.String(20), default='local')  # local, synced, error
    last_synced_at = db.Column(db.DateTime)

    # Reminders
    reminder_minutes = db.Column(db.Text)  # JSON array of minutes before event [5, 15, 60]

    # Attendees (for meetings)
    attendees = db.Column(db.Text)  # JSON array of attendee info

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    task = db.relationship('Task', backref=db.backref('calendar_events', lazy=True, cascade='all, delete-orphan'))
    space = db.relationship('Space', backref=db.backref('calendar_events', lazy=True))

    def get_reminder_minutes(self):
        """Get reminder minutes as list"""
        if not self.reminder_minutes:
            return [15]  # Default 15 minutes
        try:
            return json.loads(self.reminder_minutes)
        except:
            return [15]

    def set_reminder_minutes(self, minutes_list):
        """Set reminder minutes from list"""
        self.reminder_minutes = json.dumps(minutes_list)

    def get_attendees(self):
        """Get attendees as list"""
        if not self.attendees:
            return []
        try:
            return json.loads(self.attendees)
        except:
            return []

    def set_attendees(self, attendees_list):
        """Set attendees from list"""
        self.attendees = json.dumps(attendees_list)

    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'space_id': self.space_id,
            'title': self.title,
            'description': self.description,
            'location': self.location,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'all_day': self.all_day,
            'timezone': self.timezone,
            'is_recurring': self.is_recurring,
            'recurrence_rule': self.recurrence_rule,
            'recurrence_end': self.recurrence_end.isoformat() if self.recurrence_end else None,
            'event_type': self.event_type,
            'status': self.status,
            'color': self.color,
            'external_id': self.external_id,
            'external_source': self.external_source,
            'sync_status': self.sync_status,
            'reminder_minutes': self.get_reminder_minutes(),
            'attendees': self.get_attendees(),
            'task': self.task.to_dict() if self.task else None,
            'space_name': self.space.name if self.space else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<CalendarEvent {self.title} ({self.start_time})>'


def seed_integrations():
    """Seed default integrations"""
    if Integration.query.count() > 0:
        return

    default_integrations = [
        {
            'name': 'todoist',
            'display_name': 'Todoist',
            'description': 'Sync tasks, create projects, and manage your to-do lists with Todoist integration.',
            'category': 'productivity',
            'icon': 'todoist'
        },
        {
            'name': 'telegram',
            'display_name': 'Telegram Bot',
            'description': 'Access Cleo on the go via Telegram. Chat with your agents from anywhere.',
            'category': 'communication',
            'icon': 'telegram'
        },
        {
            'name': 'microsoft_graph',
            'display_name': 'Microsoft 365',
            'description': 'Connect to Outlook calendar, email, and Microsoft 365 services.',
            'category': 'calendar',
            'icon': 'microsoft'
        },
        {
            'name': 'google_calendar',
            'display_name': 'Google Calendar',
            'description': 'Sync your Google Calendar events and manage schedules.',
            'category': 'calendar',
            'icon': 'google'
        },
        {
            'name': 'slack',
            'display_name': 'Slack',
            'description': 'Receive notifications and interact with Cleo through Slack.',
            'category': 'communication',
            'icon': 'slack'
        },
        {
            'name': 'notion',
            'display_name': 'Notion',
            'description': 'Connect your Notion workspace for document and knowledge management.',
            'category': 'productivity',
            'icon': 'notion'
        }
    ]

    for integration_data in default_integrations:
        integration = Integration(**integration_data)
        db.session.add(integration)

    db.session.commit()
    print(f"[SUCCESS] Seeded {len(default_integrations)} integrations")


def init_db(app=None):
    """Initialize the database"""
    if app:
        db.init_app(app)
        with app.app_context():
            db.create_all()
            print("[SUCCESS] Database initialized successfully")
            seed_agents()
    else:
        # Standalone initialization
        from flask import Flask
        from config.settings import DATABASE_URI, SECRET_KEY

        app = Flask(__name__)
        app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URI
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['SECRET_KEY'] = SECRET_KEY

        db.init_app(app)
        with app.app_context():
            db.create_all()
            print("[SUCCESS] Database initialized successfully")
            seed_agents()


def seed_agents():
    """Seed database with initial agent records"""
    # Check if agents already exist
    if Agent.query.count() > 0:
        print("[INFO]  Agents already seeded")
        return

    agents = [
        # Master
        {'name': 'Cleo', 'type': 'master', 'description': 'Master orchestrator'},

        # Personal
        {'name': 'Coach', 'type': 'personal', 'description': 'Personal development coach'},
        {'name': 'HealthFit', 'type': 'personal', 'description': 'Health and fitness advisor'},

        # Team
        {'name': 'DecideWrightMD', 'type': 'team', 'description': 'Decision support MD'},
        {'name': 'S55MD', 'type': 'team', 'description': 'Studio55 MD'},
        {'name': 'SparkwireMediaMD', 'type': 'team', 'description': 'Media MD'},
        {'name': 'ThinTanksMD', 'type': 'team', 'description': 'Research MD'},
        {'name': 'AscendoreMD', 'type': 'team', 'description': 'Business MD'},
        {'name': 'BoxzeroMD', 'type': 'team', 'description': 'Strategic MD'},

        # Worker
        {'name': 'EA', 'type': 'worker', 'description': 'Executive Assistant'},
        {'name': 'Legal', 'type': 'worker', 'description': 'Legal Expert'},
        {'name': 'CMO', 'type': 'worker', 'description': 'Chief Marketing Officer'},
        {'name': 'CC', 'type': 'worker', 'description': 'Content Creator'},
        {'name': 'CCO', 'type': 'worker', 'description': 'Chief Consultancy Officer'},
        {'name': 'CPO', 'type': 'worker', 'description': 'Chief Product Officer'},
        {'name': 'FD', 'type': 'worker', 'description': 'Finance Director'},
        {'name': 'CSO', 'type': 'worker', 'description': 'Chief Sales Officer'},
        {'name': 'SysAdmin', 'type': 'worker', 'description': 'System Administrator'},

        # Expert
        {'name': 'RegTech', 'type': 'expert', 'description': 'Regulatory Technology Expert'},
        {'name': 'DataScience', 'type': 'expert', 'description': 'Data Science Expert'},
        {'name': 'CyberSecurity', 'type': 'expert', 'description': 'Cybersecurity Expert'},
        {'name': 'ESG', 'type': 'expert', 'description': 'ESG Expert'},
        {'name': 'AIEthics', 'type': 'expert', 'description': 'AI Ethics Expert'},
        {'name': 'FinancialModeling', 'type': 'expert', 'description': 'Financial Modeling Expert'},
        {'name': 'MarketingStrategist', 'type': 'expert', 'description': 'Marketing Strategy Expert'},
        {'name': 'Copywriter', 'type': 'expert', 'description': 'Copywriting Expert'},
        {'name': 'Designer', 'type': 'expert', 'description': 'Design Expert'},
        {'name': 'TechnicalWriter', 'type': 'expert', 'description': 'Technical Writing Expert'},
        {'name': 'StrategyRisk', 'type': 'expert', 'description': 'Strategy & Risk Expert'},
    ]

    for agent_data in agents:
        agent = Agent(**agent_data)
        db.session.add(agent)

    db.session.commit()
    print(f"[SUCCESS] Seeded {len(agents)} agents")


if __name__ == "__main__":
    init_db()
