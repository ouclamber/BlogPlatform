import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from decouple import config
from django.conf import settings

def _get_fernet_key() -> bytes:
    key = config("FIELD_ENCRYPTION_KEY", default=None)

    if key:
        if isinstance(key, str):
            key = key.encode()
        return key

    secret = settings.SECRET_KEY.encode()
    digest = hashlib.sha256(secret).digest()
    return base64.urlsafe_b64encode(digest)


_fernet = Fernet(_get_fernet_key())

def encrypt(value):
    if value is None or value == "":
        return None if value is None else ""
    if not isinstance(value, str):
        value = str(value)
    return _fernet.encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt(token):
    if token is None or token == "":
        return None if token is None else ""
    if not isinstance(token, str):
        token = str(token)
    try:
        return _fernet.decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return token

def _xor_bytes(data: bytes, key: bytes) -> bytes:
    return bytes(
        data[i] ^ key[i % len(key)]
        for i in range(len(data))
    )


def double_encrypt(value):
    if value is None or value == "":
        return None if value is None else ""

    secret = settings.SECRET_KEY.encode("utf-8")
    value_bytes = value.encode("utf-8")

    xored = _xor_bytes(value_bytes, secret)

    return _fernet.encrypt(xored).decode("utf-8")


def double_decrypt(token):
    if token is None or token == "":
        return None if token is None else ""

    try:
        xored = _fernet.decrypt(token.encode("utf-8"))

        secret = settings.SECRET_KEY.encode("utf-8")
        value_bytes = _xor_bytes(xored, secret)

        return value_bytes.decode("utf-8")
    except (InvalidToken, UnicodeDecodeError):
        return token

def blind_index(value: str) -> str:
    if not value:
        return ""

    secret = settings.SECRET_KEY.encode("utf-8")
    data = (value.lower().strip() + secret.decode()).encode("utf-8")
    return hashlib.sha256(data).hexdigest()