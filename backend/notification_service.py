import os
import re
import html
import time
from twilio.rest import Client
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """SMS and Voice notification service using Twilio with retry logic"""

    MAX_RETRIES = 3
    RETRY_BACKOFF = [1, 2, 4]  # seconds

    def __init__(self):
        self.account_sid = os.environ.get('TWILIO_ACCOUNT_SID', 'PLACEHOLDER_SID')
        self.auth_token = os.environ.get('TWILIO_AUTH_TOKEN', 'PLACEHOLDER_TOKEN')
        self.from_phone = os.environ.get('TWILIO_PHONE_NUMBER', '+1234567890')

        self.client = None
        self.enabled = False

        if (self.account_sid != 'PLACEHOLDER_SID' and
            self.auth_token != 'PLACEHOLDER_TOKEN' and
            self.from_phone != '+1234567890'):
            try:
                self.client = Client(self.account_sid, self.auth_token)
                self.enabled = True
                logger.info("Twilio notification service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
                self.enabled = False
        else:
            logger.warning("Twilio credentials not configured. SMS/Voice alerts disabled.")

    @staticmethod
    def validate_phone(phone: str) -> str:
        """Validate and normalize phone number to E.164 format"""
        cleaned = re.sub(r'[^0-9+]', '', phone.strip())
        if not cleaned.startswith('+'):
            if len(cleaned) == 10:
                cleaned = '+91' + cleaned  # Default to India
            else:
                cleaned = '+' + cleaned
        if not re.match(r'^\+[1-9]\d{6,14}$', cleaned):
            raise ValueError(f"Invalid phone number: {phone}")
        return cleaned

    def _retry(self, fn, *args, **kwargs) -> Dict:
        """Execute fn with exponential backoff retries"""
        last_error = None
        for attempt in range(self.MAX_RETRIES):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                last_error = e
                if attempt < self.MAX_RETRIES - 1:
                    wait = self.RETRY_BACKOFF[attempt]
                    logger.warning(f"Attempt {attempt+1} failed: {e}. Retrying in {wait}s...")
                    time.sleep(wait)
        return {'success': False, 'error': str(last_error)}

    def send_sms(self, to_phone: str, message: str) -> Dict:
        """Send SMS alert to farmer with retry logic"""
        if not self.enabled:
            logger.warning("Twilio not enabled. SMS not sent.")
            return {'success': False, 'message': 'Twilio credentials not configured', 'mock': True}

        try:
            to_phone = self.validate_phone(to_phone)
        except ValueError as e:
            return {'success': False, 'error': str(e)}

        def _do_send():
            msg = self.client.messages.create(body=message, from_=self.from_phone, to=to_phone)
            logger.info(f"SMS sent to {to_phone}: {msg.sid}")
            return {'success': True, 'sid': msg.sid, 'status': msg.status, 'to': to_phone}

        return self._retry(_do_send)

    def send_voice_call(self, to_phone: str, message: str) -> Dict:
        """Send voice call alert with retry logic"""
        if not self.enabled:
            return {'success': False, 'message': 'Twilio credentials not configured', 'mock': True}

        try:
            to_phone = self.validate_phone(to_phone)
        except ValueError as e:
            return {'success': False, 'error': str(e)}

        def _do_call():
            safe_message = html.escape(message)
            twiml = f'<Response><Say language="en-IN">{safe_message}</Say></Response>'
            call = self.client.calls.create(twiml=twiml, from_=self.from_phone, to=to_phone)
            logger.info(f"Voice call to {to_phone}: {call.sid}")
            return {'success': True, 'sid': call.sid, 'status': call.status, 'to': to_phone}

        return self._retry(_do_call)

    def send_weather_alert_sms(self, to_phone: str, user_name: str,
                               crop: str, alerts: List[Dict]) -> Dict:
        """Send formatted weather alert SMS"""
        if not alerts:
            return {'success': False, 'message': 'No alerts to send'}

        message = f"Farm-Nimbus Alert for {user_name}!\n\nCrop: {crop}\n\n"
        for alert in alerts[:3]:
            message += f"⚠️ {alert.get('type', 'Alert').upper()}\n"
            message += f"{alert.get('message', 'Weather alert')}\n"
            message += f"Date: {alert.get('date', 'Soon')}\n\n"
        message += "Check app for full details and recommendations."
        return self.send_sms(to_phone, message)

    def send_daily_weather_sms(self, to_phone: str, user_name: str,
                               weather: Dict, recommendations: List[Dict]) -> Dict:
        """Send daily weather update SMS"""
        message = f"Good morning {user_name}! 🌾\n\nToday's Weather:\n"
        message += f"🌡️ {weather.get('temperature', 'N/A')}°C ({weather.get('description', 'N/A')})\n"
        message += f"💧 Humidity: {weather.get('humidity', 'N/A')}%\n"
        message += f"💨 Wind: {weather.get('wind_speed', 'N/A')} m/s\n\n"
        if recommendations:
            top_rec = recommendations[0]
            message += f"📋 Today's Tip:\n{top_rec.get('message', 'Check app for recommendations')}\n\n"
        message += "Visit app for detailed forecast and more tips!"
        return self.send_sms(to_phone, message)

    def send_critical_voice_alert(self, to_phone: str, user_name: str,
                                  alert_type: str, message: str) -> Dict:
        """Send voice call for critical weather alerts"""
        voice_message = f"Hello {user_name}. This is Farm Nimbus with an urgent weather alert. "
        voice_message += f"{alert_type}. {message}. "
        voice_message += "Please check the Farm Nimbus app for detailed information and recommendations. Stay safe."
        return self.send_voice_call(to_phone, voice_message)

    def send_recommendation_sms(self, to_phone: str, user_name: str,
                               crop: str, recommendation: Dict) -> Dict:
        """Send specific recommendation SMS"""
        message = f"Farm-Nimbus Tip for {user_name} 🌾\n\nCrop: {crop}\n"
        message += f"Category: {recommendation.get('category', 'General').upper()}\n\n"
        message += f"📋 {recommendation.get('message', 'Check app for details')}\n\n"
        message += f"Priority: {recommendation.get('severity', 'medium').upper()}"
        return self.send_sms(to_phone, message)

    def get_service_status(self) -> Dict:
        """Get notification service status"""
        return {
            'enabled': self.enabled,
            'sms_available': self.enabled,
            'voice_available': self.enabled,
            'configured': self.account_sid != 'PLACEHOLDER_SID',
            'from_phone': self.from_phone if self.enabled else 'Not configured'
        }
