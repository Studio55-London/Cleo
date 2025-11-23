"""
Cleo Database Models
SQLite database schema for agents, jobs, activities, spaces, and messages
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from pathlib import Path
import json

db = SQLAlchemy()


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
