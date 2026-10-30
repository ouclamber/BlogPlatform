"""Шифрование персональных данных в БД.

* ``encrypt`` / ``decrypt`` — Fernet (AES-128-CBC + HMAC-SHA256).
* ``blind_index`` — HMAC-SHA256 от нормализованного значения: позволяет искать
  по email, не храня его в открытом виде.

Ключи выводятся из ``FIELD_ENCRYPTION_KEY``. Раньше при его отсутствии всё
завязывалось на ``SECRET_KEY`` — тогда ротация SECRET_KEY делала зашифрованные
данные нечитаемыми, а поиск по email ломался. В production ключ теперь обязателен
(см. settings.py), фолбэк на SECRET_KEY оставлен только для разработки.

``double_encrypt`` / ``double_decrypt`` и ``legacy_blind_index`` — устаревшие
схемы. Они оставлены только для чтения старых данных в миграции 0006.
"""
import base64
import hashlib
import hmac
import logging
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger("users")


def _get_fernet_key() -> bytes:
    key = getattr(settings, "FIELD_ENCRYPTION_KEY", "") or ""
    if key:
        return key.encode() if isinstance(key, str) else key

    digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(digest)


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    return Fernet(_get_fernet_key())


@lru_cache(maxsize=1)
def _index_key() -> bytes:
    # Отдельный подключ для blind index (domain separation): компрометация
    # индекса не даёт ключ шифрования и наоборот.
    return hmac.new(_get_fernet_key(), b"blind-index-v2", hashlib.sha256).digest()


def reset_key_cache():
    """Сбросить кеш ключей (используется в тестах при override_settings)."""
    _fernet.cache_clear()
    _index_key.cache_clear()


def encrypt(value):
    if value is None or value == "":
        return None if value is None else ""
    if not isinstance(value, str):
        value = str(value)
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt(token):
    if token is None or token == "":
        return None if token is None else ""
    if not isinstance(token, str):
        token = str(token)
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except UnicodeDecodeError:
        logger.warning("Расшифрованное значение не является UTF-8 (устаревший формат?).")
        return ""
    except InvalidToken:
        # Исторически в колонке могли остаться незашифрованные значения
        # (до миграции 0004). Возвращаем как есть, но фиксируем в логах —
        # массовые предупреждения означают неверный FIELD_ENCRYPTION_KEY.
        logger.warning("Не удалось расшифровать значение поля (неверный ключ или открытые данные).")
        return token


def blind_index(value) -> str:
    if not value:
        return ""
    normalized = str(value).strip().lower().encode("utf-8")
    return hmac.new(_index_key(), normalized, hashlib.sha256).hexdigest()


# ------------------------------------------------------------------ legacy

def _xor_bytes(data: bytes, key: bytes) -> bytes:
    return bytes(data[i] ^ key[i % len(key)] for i in range(len(data)))


def double_encrypt(value):
    """Устаревшая схема (XOR с SECRET_KEY + Fernet). Не используйте для новых данных."""
    if value is None or value == "":
        return None if value is None else ""
    secret = settings.SECRET_KEY.encode("utf-8")
    xored = _xor_bytes(value.encode("utf-8"), secret)
    return _fernet().encrypt(xored).decode("utf-8")


def double_decrypt(token):
    if token is None or token == "":
        return None if token is None else ""
    try:
        xored = _fernet().decrypt(token.encode("utf-8"))
        secret = settings.SECRET_KEY.encode("utf-8")
        return _xor_bytes(xored, secret).decode("utf-8")
    except (InvalidToken, UnicodeDecodeError):
        return token


def legacy_blind_index(value) -> str:
    """Старый индекс sha256(value + SECRET_KEY) — только для миграции данных."""
    if not value:
        return ""
    data = (value.lower().strip() + settings.SECRET_KEY).encode("utf-8")
    return hashlib.sha256(data).hexdigest()
