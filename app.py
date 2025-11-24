"""
Cleo - AI Agent Workspace Application
Flask Backend with Spaces API
"""
import os
import logging
from datetime import datetime
from flask import Flask, render_template, jsonify, request, redirect, url_for, session
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from models import db, User, Agent, Job, Activity, Space, Message, Document, DocumentChunk, Entity, Relation
from agents import get_agent, list_agent_names, agent_count
from knowledge_processor import get_processor
from werkzeug.utils import secure_filename
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data/cleo.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///agents.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# File upload configuration
app.config['UPLOAD_FOLDER'] = 'data/knowledge/documents'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'doc', 'txt', 'md'}

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize extensions
db.init_app(app)
CORS(app)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login"""
    return db.session.get(User, int(user_id))

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
# API Routes - Authentication
# ===================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
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

        db.session.add(user)
        db.session.commit()

        # Log the user in
        login_user(user)
        user.last_login = datetime.now()
        db.session.commit()

        logger.info(f"New user registered: {username}")

        return jsonify({
            'success': True,
            'user': user.to_dict(),
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
def login():
    """Log in a user"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({
                'success': False,
                'message': 'Username and password are required'
            }), 400

        # Find user
        user = User.query.filter_by(username=username).first()

        if not user or not user.check_password(password):
            return jsonify({
                'success': False,
                'message': 'Invalid username or password'
            }), 401

        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Account is disabled'
            }), 403

        # Log the user in
        login_user(user)
        user.last_login = datetime.now()
        db.session.commit()

        logger.info(f"User logged in: {username}")

        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'message': 'Login successful'
        })

    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    """Log out the current user"""
    try:
        username = current_user.username
        logout_user()
        logger.info(f"User logged out: {username}")

        return jsonify({
            'success': True,
            'message': 'Logout successful'
        })

    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/auth/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current logged-in user info"""
    try:
        return jsonify({
            'success': True,
            'user': current_user.to_dict()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


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
    """Get all spaces"""
    try:
        spaces = Space.query.order_by(Space.updated_at.desc()).all()
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

                    # Send to agent
                    response_text = agent_instance.run(clean_message)

                    # Create and save agent response
                    agent_msg = Message(
                        space_id=int(space_id),
                        role='agent',
                        author=target_agent['name'],
                        agent_name=target_agent['name'],
                        agent_tier=target_agent['tier'],
                        content=response_text
                    )

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
    """Get system status"""
    try:
        return jsonify({
            'success': True,
            'status': 'online',
            'agents_count': agent_count(),
            'spaces_count': Space.query.count(),
            'version': '2.0'
        })

    except Exception as e:
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
                    metadata=json.dumps(chunk_data['metadata'])
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
# Helper Functions
# ===================================

def create_default_personal_space():
    """Create default Personal space with all personal tier agents"""
    try:
        # Check if Personal space already exists
        personal_space = Space.query.filter_by(name='Personal').first()

        if personal_space:
            print("[INFO] Personal space already exists")
            return personal_space

        # Get all personal tier agents
        personal_agents = Agent.query.filter_by(type='personal').all()

        if not personal_agents:
            print("[WARNING] No personal agents found")
            return None

        # Create Personal space
        personal_space = Space(
            name='Personal',
            description='Your personal workspace with Coach and HealthFit agents'
        )

        # Add all personal agents
        agent_ids = [agent.id for agent in personal_agents]
        personal_space.set_agents(agent_ids)

        db.session.add(personal_space)
        db.session.commit()

        print(f"[SUCCESS] Created Personal space with {len(personal_agents)} agents: {', '.join([a.name for a in personal_agents])}")
        return personal_space

    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Failed to create Personal space: {e}")
        return None

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

        # Create default Personal space
        create_default_personal_space()

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
