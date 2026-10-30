"""
Django settings for blog_project project.

Все секреты и окружение-зависимые параметры читаются из переменных окружения
(.env). Небезопасные значения по умолчанию допускаются только при DEBUG=True.
"""

import sys
import tempfile
from datetime import timedelta
from pathlib import Path

from decouple import Csv, config
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# Запуск `manage.py test` — отдельный режим: быстрые хешеры, временный MEDIA_ROOT,
# без debug-toolbar и без лимитов запросов.
TESTING = len(sys.argv) > 1 and sys.argv[1] == "test"

SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# Отдельный ключ для шифрования полей. Не должен совпадать с SECRET_KEY:
# ротация SECRET_KEY (сессии, JWT) не должна ломать расшифровку данных в БД.
FIELD_ENCRYPTION_KEY = config("FIELD_ENCRYPTION_KEY", default="")

if not DEBUG and not TESTING:
    if len(SECRET_KEY) < 50 or SECRET_KEY.startswith(("your-", "django-insecure")):
        raise ImproperlyConfigured(
            "SECRET_KEY слишком короткий или шаблонный. Сгенерируйте новый: "
            "python -c \"from django.core.management.utils import "
            "get_random_secret_key as g; print(g())\""
        )
    if not FIELD_ENCRYPTION_KEY:
        raise ImproperlyConfigured(
            "FIELD_ENCRYPTION_KEY обязателен в production. Сгенерируйте: "
            "python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\""
        )

USE_DEBUG_TOOLBAR = DEBUG and not TESTING and config("USE_DEBUG_TOOLBAR", default=True, cast=bool)

INSTALLED_APPS = [
    "apps.users",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "drf_spectacular",

    "rest_framework",
    "rest_framework_simplejwt",
    # Без этого приложения BLACKLIST_AFTER_ROTATION молча не работал:
    # старые refresh-токены оставались валидными после ротации и logout.
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",

    "apps.posts",
    "apps.comments",
    "apps.media",
    "apps.likes",
    "apps.tags",
    "apps.categories",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# debug-toolbar раньше был включён всегда, в том числе в production.
if USE_DEBUG_TOOLBAR:
    INSTALLED_APPS.append("debug_toolbar")
    MIDDLEWARE.append("debug_toolbar.middleware.DebugToolbarMiddleware")

ROOT_URLCONF = "blog_project.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "blog_project.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": config("DB_ENGINE", default="django.db.backends.postgresql"),
        "NAME": config("DB_NAME", default="blog2"),
        "USER": config("DB_USER", default="postgres"),
        "PASSWORD": config("DB_PASSWORD", default=""),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
        # Переиспользуем соединения вместо нового TCP+auth на каждый запрос.
        "CONN_MAX_AGE": config("DB_CONN_MAX_AGE", default=60, cast=int),
        "CONN_HEALTH_CHECKS": True,
    }
}

# Тесты по умолчанию идут на SQLite в памяти: `python manage.py test` работает
# сразу, без запущенного PostgreSQL. Для прогона на PostgreSQL: TEST_DB=postgres
# (так делает CI и команда тестов в Docker).
if TESTING and config("TEST_DB", default="sqlite").lower() == "sqlite":
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test_db.sqlite3",
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

if TESTING:
    # PBKDF2 с 870 000 итераций делал тесты в разы медленнее.
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"
_extra_static = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [_extra_static] if _extra_static.exists() else []

MEDIA_URL = "/media/"
# Тесты раньше писали сотни файлов в реальную папку media/.
if TESTING:
    import atexit
    import shutil

    MEDIA_ROOT = Path(tempfile.mkdtemp(prefix="blog-test-media-"))
    atexit.register(shutil.rmtree, MEDIA_ROOT, ignore_errors=True)
else:
    MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "users.User"

# ---------------------------------------------------------------- uploads
MEDIA_MAX_FILE_SIZE_MB = config("MEDIA_MAX_FILE_SIZE_MB", default=10, cast=int)
AVATAR_MAX_FILE_SIZE_MB = config("AVATAR_MAX_FILE_SIZE_MB", default=5, cast=int)
COVER_MAX_FILE_SIZE_MB = config("COVER_MAX_FILE_SIZE_MB", default=10, cast=int)
MAX_TAGS_PER_POST = 10
DATA_UPLOAD_MAX_NUMBER_FIELDS = 200

# ---------------------------------------------------------------- CORS / CSRF
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
    cast=Csv(),
)
# Фронтенд авторизуется Bearer-токеном, куки кросс-доменно не нужны.
CORS_ALLOW_CREDENTIALS = False

CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = "Lax"

SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

if not DEBUG:
    SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    # За reverse-proxy (nginx/Traefik) без этого SECURE_SSL_REDIRECT зацикливается.
    if config("USE_X_FORWARDED_PROTO", default=False, cast=bool):
        SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "blog-default",
    }
}

# ---------------------------------------------------------------- DRF
_throttle_rates = {
    "anon": config("THROTTLE_ANON", default="300/min"),
    "user": config("THROTTLE_USER", default="600/min"),
    "login": config("THROTTLE_LOGIN", default="10/min"),
    "register": config("THROTTLE_REGISTER", default="10/hour"),
    "password_change": config("THROTTLE_PASSWORD_CHANGE", default="5/hour"),
}
if TESTING:
    # Тесты идут с одного IP и с общим кешем — лимиты проверяются отдельно.
    _throttle_rates = {key: "100000/min" for key in _throttle_rates}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.StandardPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": _throttle_rates,
}

SIMPLE_JWT = {
    # Короткий access-токен: его нельзя отозвать, поэтому окно компрометации минимально.
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=15, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": config("JWT_SIGNING_KEY", default=SECRET_KEY),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Blog Platform API",
    "DESCRIPTION": "API для блога: посты, теги, комментарии, лайки, медиа",
    "VERSION": "1.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "COMPONENT_NO_READ_ONLY_REQUIRED": True,
    "ENUM_NAME_OVERRIDES": {
        "UserRoleEnum": "apps.users.models.User.Role",
        "PostStatusEnum": "apps.posts.models.Post.Status",
    },
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "displayOperationId": True,
        "filter": True,
        "tryItOutEnabled": True,
    },
}

INTERNAL_IPS = ["127.0.0.1", "localhost"]

# ---------------------------------------------------------------- logging
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

LOG_LEVEL = config("LOG_LEVEL", default="INFO")


def _rotating_file(filename, level=None):
    handler = {
        "class": "logging.handlers.RotatingFileHandler",
        "filename": LOG_DIR / filename,
        "maxBytes": 10 * 1024 * 1024,
        "backupCount": 5,
        "formatter": "verbose",
        "encoding": "utf-8",
    }
    if level:
        handler["level"] = level
    return handler


_APP_LOGGERS = ("posts", "users", "comments", "likes", "media", "tags")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} [{name}:{lineno}] {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "simple": {
            "format": "[{asctime}] {levelname} {message}",
            "style": "{",
            "datefmt": "%H:%M:%S",
        },
    },
    "filters": {
        "require_debug_true": {"()": "django.utils.log.RequireDebugTrue"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
            "filters": ["require_debug_true"],
        },
        "django_file": _rotating_file("django.log", LOG_LEVEL),
        "errors_file": _rotating_file("errors.log", "ERROR"),
        **{f"{name}_file": _rotating_file(f"{name}.log") for name in _APP_LOGGERS},
    },
    "loggers": {
        "django": {
            "handlers": ["console", "django_file", "errors_file"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console", "django_file", "errors_file"],
            "level": "INFO",
            "propagate": False,
        },
        **{
            name: {
                "handlers": ["console", f"{name}_file", "errors_file"],
                "level": "INFO",
                "propagate": False,
            }
            for name in _APP_LOGGERS
        },
    },
    "root": {
        "handlers": ["console", "django_file", "errors_file"],
        "level": "INFO",
    },
}

if TESTING:
    # Не засоряем лог-файлы тестовыми событиями.
    LOGGING["loggers"].update(
        {name: {"handlers": [], "level": "CRITICAL", "propagate": False} for name in _APP_LOGGERS}
    )
