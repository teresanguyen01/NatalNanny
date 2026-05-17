"""Resend email service for sending daily check-in reminders."""
import logging
from typing import Optional
from pathlib import Path

import resend

from app.config import Settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Wrapper for Resend SDK to send email reminders.

    Features:
    - Graceful degradation when Resend not configured
    - Personalized messages using user's first name
    - Email masking in logs for privacy
    - HTML and plain-text email templates
    - Comprehensive error handling
    """

    def __init__(self, settings: Settings):
        """
        Initialize Resend client with API key from settings.

        Args:
            settings: Application settings containing Resend API key
        """
        self.settings = settings

        if self.is_configured():
            try:
                resend.api_key = settings.resend_api_key
                logger.info("Resend email service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Resend client: {e}")
                resend.api_key = None
        else:
            logger.warning(
                "Resend not configured - email reminders disabled. "
                "Set RESEND_API_KEY and RESEND_FROM_EMAIL in environment "
                "variables to enable."
            )

    def is_configured(self) -> bool:
        """
        Check if Resend credentials are properly configured.

        Returns:
            True if all required Resend settings are present
        """
        return bool(
            self.settings.resend_api_key
            and self.settings.resend_from_email
        )

    def send_reminder_email(
        self,
        to_email: str,
        user_first_name: Optional[str] = None
    ) -> tuple[bool, Optional[str]]:
        """
        Send a daily check-in reminder email to a user.

        Args:
            to_email: Recipient email address
            user_first_name: User's first name for personalization (optional)

        Returns:
            Tuple of (success: bool, error_msg: Optional[str])
            - (True, None) if email sent successfully
            - (False, "error message") if failed
        """
        if not resend.api_key:
            return False, "Resend client not initialized"

        # Personalize message with first name if available
        greeting_name = user_first_name if user_first_name else "there"

        # Load email templates
        html_body = self._get_html_template(greeting_name)
        text_body = self._get_text_template(greeting_name)

        try:
            logger.info(
                f"Attempting to send email to {self._mask_email(to_email)} "
                f"from {self.settings.resend_from_email}"
            )

            response = resend.Emails.send({
                "from": self.settings.resend_from_email,
                "to": to_email,
                "subject": "Time for your daily check-in with NatalNanny",
                "html": html_body,
                "text": text_body,
            })

            # Mask email for privacy in logs
            masked_email = self._mask_email(to_email)
            logger.info(
                f"✅ Email sent successfully to {masked_email} "
                f"(ID: {response.get('id', 'N/A')})"
            )

            return True, None

        except Exception as e:
            masked_email = self._mask_email(to_email)
            error_msg = f"Error sending email to {masked_email}: {str(e)}"
            logger.error(error_msg)
            return False, error_msg

    def _get_html_template(self, greeting_name: str) -> str:
        """
        Get HTML email template with personalized greeting.

        Args:
            greeting_name: User's first name or "there"

        Returns:
            HTML email content
        """
        dashboard_url = self.settings.app_dashboard_url
        settings_url = f"{self.settings.app_dashboard_url.rstrip('/dashboard')}/settings"

        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Check-in Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px 40px; text-align: center; border-bottom: 1px solid #e0e0e0;">
                            <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: 600;">🦘 NatalNanny</h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 18px; line-height: 1.5;">
                                Hi {greeting_name}! 👋
                            </p>

                            <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                Don't forget your daily check-in with NatalNanny today.<br>
                                Your wellness buddy is waiting!
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="margin: 0 auto;">
                                <tr>
                                    <td style="border-radius: 6px; background-color: #10b981;">
                                        <a href="{dashboard_url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                                            Complete Check-in
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 30px 0 0 0; color: #999999; font-size: 14px; line-height: 1.5;">
                                Taking a few minutes each day helps you stay on track with your postpartum wellness journey.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e0e0e0; background-color: #f9f9f9;">
                            <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                                NatalNanny - Your postpartum wellness companion
                            </p>
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                <a href="{settings_url}" target="_blank" style="color: #10b981; text-decoration: none;">
                                    Notification Settings
                                </a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    def _get_text_template(self, greeting_name: str) -> str:
        """
        Get plain-text email template with personalized greeting.

        Args:
            greeting_name: User's first name or "there"

        Returns:
            Plain-text email content
        """
        dashboard_url = self.settings.app_dashboard_url
        settings_url = f"{self.settings.app_dashboard_url.rstrip('/dashboard')}/settings"

        return f"""Hi {greeting_name}! 👋

Don't forget your daily check-in with NatalNanny today.
Your wellness buddy is waiting! 🦘

Complete your check-in: {dashboard_url}

Taking a few minutes each day helps you stay on track with your postpartum wellness journey.

---
NatalNanny - Your postpartum wellness companion
Manage notifications: {settings_url}"""

    @staticmethod
    def _mask_email(email: str) -> str:
        """
        Mask email address for privacy in logs.

        Example: alice@example.com → a***@example.com

        Args:
            email: Email address to mask

        Returns:
            Masked email string
        """
        if '@' not in email:
            return "***"

        local, domain = email.split('@', 1)
        if len(local) <= 1:
            return f"***@{domain}"

        # Show first char of local part
        return f"{local[0]}***@{domain}"
