"""
Cleo - AI Agent Workspace Application
Flask Backend with Spaces API
"""
import os
import logging
from datetime import datetime
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from models import db, Agent, Job, Activity, Space, Message
from agents import get_agent, list_agent_names, agent_count
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

# Initialize extensions
db.init_app(app)
CORS(app)

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
    """Get all messages in a space"""
    try:
        # Find space
        space = db.session.get(Space, int(space_id))

        if not space:
            return jsonify({
                'success': False,
                'message': 'Space not found'
            }), 404

        # Get messages from database
        messages = Message.query.filter_by(space_id=int(space_id)).order_by(Message.timestamp).all()
        messages_list = [msg.to_dict() for msg in messages]

        return jsonify({
            'success': True,
            'messages': messages_list
        })

    except Exception as e:
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
