#!/usr/bin/env python3
"""
Export SQLite database to JSON for migration to PostgreSQL

Usage:
    python scripts/export_sqlite.py --output data/export/
"""

import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from flask import Flask
from models import db, User, Agent, Job, Activity, Space, Message, Document, DocumentChunk, Entity, Relation, Integration, Skill, Task, Notification, CalendarEvent, TaskTemplate


def create_app():
    """Create Flask app for database access"""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///agents.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    return app


def serialize_datetime(obj):
    """JSON serializer for datetime objects"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def export_table(model, name, output_dir):
    """Export a single table to JSON"""
    records = model.query.all()
    data = []

    for record in records:
        if hasattr(record, 'to_dict'):
            row = record.to_dict()
        else:
            # Fallback: export all columns
            row = {}
            for column in model.__table__.columns:
                value = getattr(record, column.name)
                if isinstance(value, datetime):
                    value = value.isoformat()
                row[column.name] = value
        data.append(row)

    output_path = output_dir / f"{name}.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, default=serialize_datetime)

    print(f"  Exported {len(data)} {name} records")
    return len(data)


def main():
    parser = argparse.ArgumentParser(description='Export SQLite database to JSON')
    parser.add_argument('--output', '-o', default='data/export',
                        help='Output directory for JSON files')
    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    app = create_app()

    with app.app_context():
        print("Exporting SQLite database...")
        print(f"Output directory: {output_dir.absolute()}")
        print()

        tables = [
            (User, 'users'),
            (Agent, 'agents'),
            (Job, 'jobs'),
            (Activity, 'activities'),
            (Space, 'spaces'),
            (Message, 'messages'),
            (Document, 'documents'),
            (DocumentChunk, 'document_chunks'),
            (Entity, 'entities'),
            (Relation, 'relations'),
            (Integration, 'integrations'),
            (Skill, 'skills'),
            (Task, 'tasks'),
            (Notification, 'notifications'),
            (CalendarEvent, 'calendar_events'),
            (TaskTemplate, 'task_templates'),
        ]

        total = 0
        for model, name in tables:
            try:
                count = export_table(model, name, output_dir)
                total += count
            except Exception as e:
                print(f"  Error exporting {name}: {e}")

        print()
        print(f"Total records exported: {total}")
        print(f"Export complete! Files saved to: {output_dir.absolute()}")

        # Create metadata file
        metadata = {
            'exported_at': datetime.utcnow().isoformat(),
            'source': 'sqlite',
            'tables': [name for _, name in tables],
            'total_records': total
        }
        with open(output_dir / 'metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)


if __name__ == '__main__':
    main()
