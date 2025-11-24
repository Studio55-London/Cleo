"""
Cleo Database Models
SQLite database schema for agents, jobs, activities, spaces, messages, and users
"""
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from pathlib import Path
import json

db = SQLAlchemy()


class User(UserMixin, db.Model):
    """User model for authentication"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    last_login = db.Column(db.DateTime)

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check password against hash"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Convert user to dictionary (without sensitive data)"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

    def __repr__(self):
        return f'<User {self.username}>'


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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    messages = db.relationship('Message', backref='space', lazy=True, cascade='all, delete-orphan')

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

        return {
            'id': str(self.id),
            'name': self.name,
            'description': self.description or '',
            'agents': agent_list,
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

    # Relationships
    chunks = db.relationship('DocumentChunk', backref='document', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'file_type': self.file_type,
            'size': self.format_file_size(),
            'status': self.status,
            'chunks': self.chunk_count,
            'entities': self.entity_count,
            'uploaded_at': self.uploaded_at.isoformat(),
            'processed_at': self.processed_at.isoformat() if self.processed_at else None
        }

    def format_file_size(self):
        """Format file size in human-readable format"""
        if not self.file_size:
            return "Unknown"

        for unit in ['B', 'KB', 'MB', 'GB']:
            if self.file_size < 1024.0:
                return f"{self.file_size:.1f} {unit}"
            self.file_size /= 1024.0
        return f"{self.file_size:.1f} TB"

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
    embedding = db.Column(db.Text)  # JSON-serialized vector embedding
    metadata = db.Column(db.Text)  # JSON metadata (page number, section, etc.)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_embedding(self, vector):
        """Store embedding as JSON"""
        import json
        self.embedding = json.dumps(vector)

    def get_embedding(self):
        """Retrieve embedding as list"""
        import json
        return json.loads(self.embedding) if self.embedding else None

    def set_metadata(self, data):
        """Store metadata as JSON"""
        import json
        self.metadata = json.dumps(data)

    def get_metadata(self):
        """Retrieve metadata as dict"""
        import json
        return json.loads(self.metadata) if self.metadata else {}

    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'chunk_index': self.chunk_index,
            'content': self.content[:200] + '...' if len(self.content) > 200 else self.content,
            'token_count': self.token_count,
            'metadata': self.get_metadata()
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
