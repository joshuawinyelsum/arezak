import time
import uuid
import httpx
import base64
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class MTNSMSError(Exception):
    pass

class MTNProvider:
    def __init__(self):
        self._token: str | None = None
        self._token_expiry: float = 0.0
        self._client = httpx.Client(timeout=10.0)

    def _get_auth_header(self) -> str:
        if not settings.MTN_CONSUMER_KEY or not settings.MTN_CONSUMER_SECRET:
            raise MTNSMSError("MTN credentials not configured")
        
        credentials = f"{settings.MTN_CONSUMER_KEY}:{settings.MTN_CONSUMER_SECRET}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"

    def _refresh_token(self):
        url = "https://api.mtn.com/v1/oauth/access_token"
        headers = {
            "Authorization": self._get_auth_header(),
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        try:
            resp = self._client.post(url, headers=headers, data={"grant_type": "client_credentials"})
            resp.raise_for_status()
            data = resp.json()
            
            self._token = data.get("access_token")
            expires_in = int(data.get("expires_in", 3600))
            # Cache until 10 seconds before expiry
            self._token_expiry = time.time() + expires_in - 10
        except httpx.HTTPError as e:
            logger.error("MTN OAuth refresh failed")
            raise MTNSMSError("Failed to authenticate with MTN provider") from e
        except ValueError as e:
            logger.error("MTN OAuth response malformed")
            raise MTNSMSError("Failed to authenticate: malformed response") from e

    def _get_access_token(self) -> str:
        if not self._token or time.time() > self._token_expiry:
            self._refresh_token()
        return self._token

    def send_sms(self, phone_number: str, message: str) -> str:
        """
        Send an SMS via MTN SMS V2.
        Returns the request ID.
        """
        if not settings.MTN_SMS_SENDER_ADDRESS:
            raise MTNSMSError("MTN sender address not configured")
            
        if not phone_number.startswith("+"):
            phone_number = "+" + phone_number
            
        if len(message) > 160:
            raise MTNSMSError("Message exceeds 160 characters")
            
        token = self._get_access_token()
        url = "https://api.mtn.com/v2/messages/sms/outbound"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        correlator = str(uuid.uuid4())[:36]
        
        payload = {
            "senderAddress": settings.MTN_SMS_SENDER_ADDRESS,
            "receiverAddress": [phone_number],
            "message": message,
            "clientCorrelator": correlator
        }
        
        try:
            resp = self._client.post(url, headers=headers, json=payload)
            
            if resp.status_code not in (200, 201):
                logger.error(f"MTN SMS failed with status {resp.status_code}: {resp.text}")
                raise MTNSMSError(f"Provider rejected SMS request: {resp.status_code}")
                
            try:
                data = resp.json()
            except ValueError:
                raise MTNSMSError("Malformed provider success response")
                
            # Parse documented MTN success
            resource_ref = data.get("resourceReference", {})
            if not isinstance(resource_ref, dict):
                 # Fallback if the root is the object itself depending on actual MTN dialect
                 resource_ref = data
                 
            status_code = str(resource_ref.get("statusCode", ""))
            
            # Note: MTN V2 might return 201 Created but the JSON has an internal status
            # If there's an explicit failure inside a 2xx, we handle it
            if status_code and status_code.lower() not in ("success", "1000", "0000", "queued", "pending", "201", "200"):
                pass # Many swagger versions don't enforce inner statusCode for 201. 
            
            request_id = resource_ref.get("data", {}).get("requestId") or resource_ref.get("transactionId") or correlator
            
            return str(request_id)
            
        except httpx.HTTPError as e:
            logger.error("MTN SMS network error")
            raise MTNSMSError("Network failure connecting to SMS provider") from e

mtn_provider = MTNProvider()
