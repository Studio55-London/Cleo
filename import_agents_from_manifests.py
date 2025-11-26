"""
Import agents from Agent-Cleo Prompt-Manifest files
"""
import os
import re
from datetime import datetime, timezone
from app import app, db
from models import Agent, Space


def sync_personal_agent_to_spaces(agent_id):
    """Add a new Personal agent to all existing Personal spaces"""
    personal_spaces = Space.query.filter_by(name='Personal').all()
    for space in personal_spaces:
        current_ids = space.get_agents()
        if agent_id not in current_ids:
            current_ids.append(agent_id)
            space.set_agents(current_ids)
            print(f"  [SYNC] Added agent {agent_id} to Personal space {space.id}")
    if personal_spaces:
        db.session.commit()

def parse_manifest(file_path):
    """Parse a Prompt-Manifest.md file and extract agent info"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract agent name from first heading
    name_match = re.search(r'^#\s+(.+?)(?:\s+-\s+.+)?$', content, re.MULTILINE)
    name = name_match.group(1).strip() if name_match else None

    # Extract agent type
    type_match = re.search(r'\*\*(.+?Agent.*?)\*\*', content)
    agent_type = type_match.group(1).strip() if type_match else "Unknown"

    # Clean up agent type
    if "Personal Agent" in agent_type:
        agent_type = "Personal"
    elif "Team Agent" in agent_type or "Managing Director" in agent_type:
        agent_type = "Team"
    elif "Worker Agent" in agent_type:
        agent_type = "Worker"
    elif "Expert" in agent_type:
        agent_type = "Expert"

    # Extract purpose section
    purpose_match = re.search(r'##\s+Purpose\s+(.+?)(?=\n##|\Z)', content, re.DOTALL)
    purpose = purpose_match.group(1).strip() if purpose_match else "No description available"

    # Clean up purpose text (remove extra whitespace)
    purpose = re.sub(r'\s+', ' ', purpose)

    return {
        'name': name,
        'type': agent_type,
        'description': purpose
    }

def import_agents():
    """Import all agents from Prompt-Manifest files"""
    agent_cleo_path = r"C:\Users\AndrewSmart\Claude_Projects\Agent-Cleo"

    # Find all Prompt-Manifest.md files
    manifest_files = []
    for root, dirs, files in os.walk(agent_cleo_path):
        for file in files:
            if file == "Prompt-Manifest.md":
                manifest_files.append(os.path.join(root, file))

    print(f"Found {len(manifest_files)} Prompt-Manifest files\n")

    agents_created = []
    agents_skipped = []

    with app.app_context():
        for manifest_path in sorted(manifest_files):
            try:
                # Parse the manifest
                agent_data = parse_manifest(manifest_path)

                if not agent_data['name']:
                    print(f"[SKIP] Skipped (no name found): {manifest_path}")
                    agents_skipped.append(manifest_path)
                    continue

                # Check if agent already exists
                existing_agent = Agent.query.filter_by(name=agent_data['name']).first()
                if existing_agent:
                    print(f"[SKIP] Already exists: {agent_data['name']}")
                    agents_skipped.append(agent_data['name'])
                    continue

                # Create new agent
                new_agent = Agent(
                    name=agent_data['name'],
                    type=agent_data['type'],
                    description=agent_data['description'],
                    status='active',
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )

                db.session.add(new_agent)
                db.session.commit()

                print(f"[OK] Created: {agent_data['name']} ({agent_data['type']})")
                agents_created.append(agent_data['name'])

                # If Personal agent, sync to existing Personal spaces
                if agent_data['type'].lower() == 'personal':
                    sync_personal_agent_to_spaces(new_agent.id)

            except Exception as e:
                print(f"[ERROR] Error processing {manifest_path}: {str(e)}")
                db.session.rollback()
                agents_skipped.append(manifest_path)

    print(f"\n{'='*60}")
    print(f"Import Summary:")
    print(f"  [OK] Created: {len(agents_created)} agents")
    print(f"  [SKIP] Skipped: {len(agents_skipped)} agents")
    print(f"{'='*60}")

    if agents_created:
        print("\nAgents created:")
        for name in agents_created:
            print(f"  • {name}")

if __name__ == "__main__":
    import_agents()
