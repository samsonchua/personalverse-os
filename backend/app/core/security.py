import hmac
import hashlib
import base64
import json
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from app.core.config import settings

# bcrypt truncates at 72 bytes; encode explicitly so multi-byte UTF-8 passwords
# are measured in bytes, not characters.
_BCRYPT_MAX_BYTES = 72


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8")[:_BCRYPT_MAX_BYTES], hashed_password.encode("utf-8"))
    except ValueError:
        return False


def get_password_hash(password: str) -> str:
    hashed = bcrypt.hashpw(password.encode("utf-8")[:_BCRYPT_MAX_BYTES], bcrypt.gensalt())
    return hashed.decode("utf-8")


def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": str(subject), "exp": int(expire.timestamp())}

    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")

    signature_input = f"{header_b64}.{payload_b64}".encode()
    signature = hmac.new(settings.SECRET_KEY.encode(), signature_input, hashlib.sha256).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def decode_access_token(token: str) -> Optional[dict]:
    """Verifies signature and expiry, returns payload dict or None if invalid/expired."""
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError:
        return None

    signature_input = f"{header_b64}.{payload_b64}".encode()
    expected_signature = hmac.new(settings.SECRET_KEY.encode(), signature_input, hashlib.sha256).digest()
    expected_signature_b64 = base64.urlsafe_b64encode(expected_signature).decode().rstrip("=")

    if not hmac.compare_digest(signature_b64, expected_signature_b64):
        return None

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except (ValueError, json.JSONDecodeError):
        return None

    exp = payload.get("exp")
    if exp is None or datetime.now(timezone.utc).timestamp() > exp:
        return None

    return payload
