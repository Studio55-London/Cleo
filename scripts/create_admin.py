#!/usr/bin/env python3
"""
Create or promote admin user for Cleo

Usage:
    python scripts/create_admin.py create --username admin --email admin@okcleo.ai --password "YourSecurePassword123!"
    python scripts/create_admin.py promote --email user@example.com
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import argparse
from app import app
from models import db, User


def create_admin(username: str, email: str, password: str):
    """Create a new admin user"""
    with app.app_context():
        # Check if user already exists
        existing = User.query.filter(
            (User.username == username) | (User.email == email)
        ).first()

        if existing:
            print(f"Error: User with username '{username}' or email '{email}' already exists")
            return False

        # Create new admin user
        user = User(
            username=username,
            email=email,
            full_name="Administrator",
            is_admin=True,
            is_active=True,
            email_verified=True,  # Skip email verification for admin
        )
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        print(f"Admin user created successfully!")
        print(f"  Username: {username}")
        print(f"  Email: {email}")
        print(f"  Admin: Yes")
        print(f"  Email Verified: Yes")
        return True


def promote_user(email: str):
    """Promote existing user to admin"""
    with app.app_context():
        user = User.query.filter_by(email=email).first()

        if not user:
            print(f"Error: No user found with email '{email}'")
            return False

        if user.is_admin:
            print(f"User '{user.username}' is already an admin")
            return True

        user.is_admin = True
        user.email_verified = True  # Also verify email
        db.session.commit()

        print(f"User promoted to admin!")
        print(f"  Username: {user.username}")
        print(f"  Email: {user.email}")
        print(f"  Admin: Yes")
        return True


def list_admins():
    """List all admin users"""
    with app.app_context():
        admins = User.query.filter_by(is_admin=True).all()

        if not admins:
            print("No admin users found")
            return

        print(f"Admin users ({len(admins)}):")
        for admin in admins:
            verified = "Yes" if admin.email_verified else "No"
            print(f"  - {admin.username} ({admin.email}) [Verified: {verified}]")


def main():
    parser = argparse.ArgumentParser(description="Cleo Admin User Management")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Create command
    create_parser = subparsers.add_parser("create", help="Create new admin user")
    create_parser.add_argument("--username", "-u", required=True, help="Username")
    create_parser.add_argument("--email", "-e", required=True, help="Email address")
    create_parser.add_argument("--password", "-p", required=True, help="Password")

    # Promote command
    promote_parser = subparsers.add_parser("promote", help="Promote existing user to admin")
    promote_parser.add_argument("--email", "-e", required=True, help="Email of user to promote")

    # List command
    subparsers.add_parser("list", help="List all admin users")

    args = parser.parse_args()

    if args.command == "create":
        create_admin(args.username, args.email, args.password)
    elif args.command == "promote":
        promote_user(args.email)
    elif args.command == "list":
        list_admins()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
