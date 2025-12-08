#!/usr/bin/env python3
"""
Import JSON data to PostgreSQL database

Usage:
    DATABASE_URL=<postgres-url> python scripts/import_postgres.py --input data/export/
"""

import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from models import db, User, Agent, Job, Activity, Space, Message, Document, DocumentChunk, Entity, Relation, Integration, Skill, Task, Notification, CalendarEvent, TaskTemplate


def create_app():
    """Create Flask app for database access"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL environment variable not set")
        print("Set it to your PostgreSQL connection string")
        sys.exit(1)

    # Handle postgres:// vs postgresql://
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)

    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    return app


def parse_datetime(value):
    """Parse datetime from ISO format string"""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return None


def import_table(model, name, input_dir, clear_existing=False):
    """Import a single table from JSON"""
    input_path = input_dir / f"{name}.json"

    if not input_path.exists():
        print(f"  Skipping {name} (file not found)")
        return 0

    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not data:
        print(f"  Skipping {name} (no data)")
        return 0

    if clear_existing:
        model.query.delete()
        db.session.commit()

    imported = 0
    for row in data:
        try:
            # Convert datetime strings back to datetime objects
            for column in model.__table__.columns:
                if column.name in row and isinstance(column.type, db.DateTime):
                    row[column.name] = parse_datetime(row.get(column.name))

            # Remove fields that are computed or not in the model
            valid_columns = {c.name for c in model.__table__.columns}
            clean_row = {k: v for k, v in row.items() if k in valid_columns}

            record = model(**clean_row)
            db.session.add(record)
            imported += 1

        except Exception as e:
            print(f"    Error importing row in {name}: {e}")
            continue

    db.session.commit()
    print(f"  Imported {imported} {name} records")
    return imported


def main():
    parser = argparse.ArgumentParser(description='Import JSON data to PostgreSQL')
    parser.add_argument('--input', '-i', default='data/export',
                        help='Input directory containing JSON files')
    parser.add_argument('--clear', '-c', action='store_true',
                        help='Clear existing data before import')
    args = parser.parse_args()

    input_dir = Path(args.input)
    if not input_dir.exists():
        print(f"Error: Input directory not found: {input_dir}")
        sys.exit(1)

    # Check for metadata
    metadata_path = input_dir / 'metadata.json'
    if metadata_path.exists():
        with open(metadata_path) as f:
            metadata = json.load(f)
        print(f"Importing data exported at: {metadata.get('exported_at', 'unknown')}")
        print(f"Source: {metadata.get('source', 'unknown')}")
        print()

    app = create_app()

    with app.app_context():
        print("Importing to PostgreSQL database...")
        print(f"Input directory: {input_dir.absolute()}")
        if args.clear:
            print("WARNING: Clearing existing data before import")
        print()

        # Import order matters due to foreign keys
        tables = [
            (User, 'users'),
            (Agent, 'agents'),
            (Space, 'spaces'),
            (Job, 'jobs'),
            (Activity, 'activities'),
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
                count = import_table(model, name, input_dir, args.clear)
                total += count
            except Exception as e:
                print(f"  Error importing {name}: {e}")
                db.session.rollback()

        print()
        print(f"Total records imported: {total}")
        print("Import complete!")

        # Reset sequences for PostgreSQL
        print()
        print("Resetting PostgreSQL sequences...")
        for model, name in tables:
            try:
                db.session.execute(db.text(f"""
                    SELECT setval(pg_get_serial_sequence('{name}', 'id'),
                                  COALESCE((SELECT MAX(id) FROM {name}), 1))
                """))
            except Exception as e:
                pass  # Table might not have id column or sequence
        db.session.commit()
        print("Sequences reset successfully")


if __name__ == '__main__':
    main()
