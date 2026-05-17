#!/usr/bin/env python3
"""
Test script for email reminder service.

Usage:
    python test_email_send.py <recipient_email> [first_name]

Example:
    python test_email_send.py alice@example.com Alice
    python test_email_send.py bob@example.com
"""

import sys
from app.config import get_settings
from app.services.email_service import EmailService


def main():
    if len(sys.argv) < 2:
        print("Usage: python test_email_send.py <recipient_email> [first_name]")
        print("\nExample:")
        print("  python test_email_send.py alice@example.com Alice")
        sys.exit(1)

    to_email = sys.argv[1]
    first_name = sys.argv[2] if len(sys.argv) > 2 else None

    print("=" * 60)
    print("NatalNanny Email Reminder Test")
    print("=" * 60)

    # Load settings
    settings = get_settings()

    # Check configuration
    print("\n📋 Configuration check:")
    print(f"  RESEND_API_KEY: {'✅ Set' if settings.resend_api_key else '❌ Not set'}")
    print(f"  RESEND_FROM_EMAIL: {settings.resend_from_email}")
    print(f"  APP_DASHBOARD_URL: {settings.app_dashboard_url}")

    if not settings.resend_api_key:
        print("\n❌ ERROR: RESEND_API_KEY not configured")
        print("   Set it in your .env file or environment variables")
        sys.exit(1)

    # Initialize email service
    print("\n🔌 Initializing EmailService...")
    email_service = EmailService(settings)

    if not email_service.is_configured():
        print("❌ ERROR: Email service not properly configured")
        sys.exit(1)

    print("✅ Email service initialized successfully")

    # Send test email
    print(f"\n📧 Sending test email to: {to_email}")
    if first_name:
        print(f"   Personalized for: {first_name}")

    success, error_msg = email_service.send_reminder_email(
        to_email=to_email,
        user_first_name=first_name
    )

    print("\n" + "=" * 60)
    if success:
        print("✅ SUCCESS: Email sent successfully!")
        print(f"\n   Check the inbox for: {to_email}")
        print("   (Also check spam/junk folder)")
    else:
        print("❌ FAILED: Email could not be sent")
        print(f"\n   Error: {error_msg}")
        sys.exit(1)
    print("=" * 60)


if __name__ == "__main__":
    main()
