"""SMTP email service for NatalNanny notifications."""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import Settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def is_configured(self) -> bool:
        return bool(self.settings.smtp_from_email and self.settings.smtp_from_password)

    def send_email(self, to_email: str, subject: str, body: str) -> tuple[bool, str | None]:
        if not self.is_configured():
            logger.warning("SMTP not configured — skipping email to %s", to_email)
            return False, "SMTP not configured"
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.settings.smtp_from_email
            msg["To"] = to_email
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port) as server:
                server.ehlo()
                server.starttls()
                server.login(self.settings.smtp_from_email, self.settings.smtp_from_password)
                server.sendmail(self.settings.smtp_from_email, to_email, msg.as_string())

            logger.info("Email sent to %s — %s", to_email, subject)
            return True, None
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", to_email, exc)
            return False, str(exc)

    def send_daily_reminder(self, to_email: str, first_name: str | None) -> tuple[bool, str | None]:
        greeting = first_name or "there"
        return self.send_email(
            to_email=to_email,
            subject="Your daily checkup reminder — Natal Nanny",
            body=f"Hey {greeting}, please do your daily checkup today From Natal Nanny",
        )

    def send_streak_alert(self, to_email: str, first_name: str | None) -> tuple[bool, str | None]:
        return self.send_email(
            to_email=to_email,
            subject="Complete your streak today — Natal Nanny",
            body="Hey, complete your streak today!",
        )

    def send_message_notification(
        self,
        to_email: str,
        first_name: str | None,
        sender_name: str,
    ) -> tuple[bool, str | None]:
        greeting = first_name or "there"
        return self.send_email(
            to_email=to_email,
            subject=f"New message from {sender_name} — Natal Nanny",
            body=f"Hey {greeting}, you have a new message from {sender_name} on Natal Nanny.",
        )
