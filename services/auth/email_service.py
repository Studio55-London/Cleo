"""
Email Service for Cleo

Handles sending transactional emails using SendGrid:
- Email verification
- Password reset
- Welcome emails
"""

import os
from flask import current_app

# SendGrid imports
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Email, To, Content
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False


class EmailService:
    """Service for sending transactional emails"""

    def __init__(self):
        self.api_key = os.getenv('SENDGRID_API_KEY')
        self.from_email = os.getenv('SENDGRID_FROM_EMAIL', 'noreply@okcleo.ai')
        self.from_name = os.getenv('SENDGRID_FROM_NAME', 'Cleo AI')
        self.frontend_url = os.getenv('FRONTEND_URL', 'https://www.okcleo.ai')

    def _send_email(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """
        Send an email using SendGrid.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML body
            text_content: Plain text body (optional)

        Returns:
            True if sent successfully
        """
        if not SENDGRID_AVAILABLE:
            current_app.logger.warning("SendGrid not available - email not sent")
            return False

        if not self.api_key:
            current_app.logger.warning("SENDGRID_API_KEY not configured - email not sent")
            return False

        try:
            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )

            if text_content:
                message.add_content(Content("text/plain", text_content))

            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)

            if response.status_code in [200, 201, 202]:
                current_app.logger.info(f"Email sent to {to_email}: {subject}")
                return True
            else:
                current_app.logger.error(f"Email send failed: {response.status_code}")
                return False

        except Exception as e:
            current_app.logger.error(f"Error sending email: {e}")
            return False

    def send_verification_email(self, user_email: str, user_name: str, verification_token: str) -> bool:
        """
        Send email verification link.

        Args:
            user_email: User's email address
            user_name: User's display name
            verification_token: The verification token

        Returns:
            True if sent successfully
        """
        verify_url = f"{self.frontend_url}/verify-email?token={verification_token}"

        subject = "Verify your Cleo account"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ text-align: center; padding: 20px 0; }}
                .logo {{ font-size: 32px; font-weight: bold; color: #6366f1; }}
                .button {{ display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
                .button:hover {{ background: #4f46e5; }}
                .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">Cleo</div>
                </div>
                <h2>Welcome to Cleo, {user_name}!</h2>
                <p>Thanks for signing up. Please verify your email address to get started.</p>
                <p style="text-align: center;">
                    <a href="{verify_url}" class="button">Verify Email Address</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #6366f1;">{verify_url}</p>
                <p>This link will expire in 24 hours.</p>
                <div class="footer">
                    <p>If you didn't create an account with Cleo, you can safely ignore this email.</p>
                    <p>&copy; {os.getenv('CURRENT_YEAR', '2024')} Cleo AI. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Welcome to Cleo, {user_name}!

        Thanks for signing up. Please verify your email address to get started.

        Click here to verify: {verify_url}

        This link will expire in 24 hours.

        If you didn't create an account with Cleo, you can safely ignore this email.
        """

        return self._send_email(user_email, subject, html_content, text_content)

    def send_password_reset_email(self, user_email: str, user_name: str, reset_token: str) -> bool:
        """
        Send password reset link.

        Args:
            user_email: User's email address
            user_name: User's display name
            reset_token: The password reset token

        Returns:
            True if sent successfully
        """
        reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"

        subject = "Reset your Cleo password"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ text-align: center; padding: 20px 0; }}
                .logo {{ font-size: 32px; font-weight: bold; color: #6366f1; }}
                .button {{ display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
                .button:hover {{ background: #4f46e5; }}
                .warning {{ background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 8px; margin: 20px 0; }}
                .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">Cleo</div>
                </div>
                <h2>Password Reset Request</h2>
                <p>Hi {user_name},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <p style="text-align: center;">
                    <a href="{reset_url}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #6366f1;">{reset_url}</p>
                <div class="warning">
                    <strong>This link will expire in 24 hours.</strong>
                </div>
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                <div class="footer">
                    <p>&copy; {os.getenv('CURRENT_YEAR', '2024')} Cleo AI. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Password Reset Request

        Hi {user_name},

        We received a request to reset your password. Click the link below to create a new password:

        {reset_url}

        This link will expire in 24 hours.

        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        """

        return self._send_email(user_email, subject, html_content, text_content)

    def send_welcome_email(self, user_email: str, user_name: str) -> bool:
        """
        Send welcome email after verification.

        Args:
            user_email: User's email address
            user_name: User's display name

        Returns:
            True if sent successfully
        """
        subject = "Welcome to Cleo - Your AI Agent Workspace"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ text-align: center; padding: 20px 0; }}
                .logo {{ font-size: 32px; font-weight: bold; color: #6366f1; }}
                .button {{ display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
                .feature {{ margin: 15px 0; padding-left: 20px; border-left: 3px solid #6366f1; }}
                .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">Cleo</div>
                </div>
                <h2>Welcome aboard, {user_name}! 🎉</h2>
                <p>Your email has been verified and your Cleo account is now active.</p>
                <p>Here's what you can do with Cleo:</p>
                <div class="feature">
                    <strong>AI Agent Workspace</strong><br>
                    Collaborate with specialized AI agents to get work done.
                </div>
                <div class="feature">
                    <strong>Knowledge Base</strong><br>
                    Upload documents and let AI help you search and analyze.
                </div>
                <div class="feature">
                    <strong>Task Management</strong><br>
                    Create, track, and complete tasks with AI assistance.
                </div>
                <p style="text-align: center;">
                    <a href="{self.frontend_url}" class="button">Get Started</a>
                </p>
                <div class="footer">
                    <p>&copy; {os.getenv('CURRENT_YEAR', '2024')} Cleo AI. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Welcome aboard, {user_name}!

        Your email has been verified and your Cleo account is now active.

        Here's what you can do with Cleo:

        - AI Agent Workspace: Collaborate with specialized AI agents to get work done.
        - Knowledge Base: Upload documents and let AI help you search and analyze.
        - Task Management: Create, track, and complete tasks with AI assistance.

        Get started: {self.frontend_url}
        """

        return self._send_email(user_email, subject, html_content, text_content)

    def send_password_changed_notification(self, user_email: str, user_name: str) -> bool:
        """
        Send notification that password was changed.

        Args:
            user_email: User's email address
            user_name: User's display name

        Returns:
            True if sent successfully
        """
        subject = "Your Cleo password was changed"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ text-align: center; padding: 20px 0; }}
                .logo {{ font-size: 32px; font-weight: bold; color: #6366f1; }}
                .warning {{ background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 8px; margin: 20px 0; }}
                .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">Cleo</div>
                </div>
                <h2>Password Changed</h2>
                <p>Hi {user_name},</p>
                <p>Your Cleo password was successfully changed.</p>
                <div class="warning">
                    <strong>If you didn't make this change,</strong> please contact support immediately at support@okcleo.ai
                </div>
                <div class="footer">
                    <p>&copy; {os.getenv('CURRENT_YEAR', '2024')} Cleo AI. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Password Changed

        Hi {user_name},

        Your Cleo password was successfully changed.

        If you didn't make this change, please contact support immediately at support@okcleo.ai
        """

        return self._send_email(user_email, subject, html_content, text_content)
