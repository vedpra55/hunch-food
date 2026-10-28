"""Hunch backend settings. Everything secret comes from the environment (.env locally, Secret Manager on GCP)."""

import os
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')


def env(name: str, default: str = '') -> str:
    return os.environ.get(name, default)


SECRET_KEY = env('DJANGO_SECRET_KEY', 'dev-only-not-secret')
DEBUG = env('DEBUG') == '1'
ALLOWED_HOSTS = [h for h in env('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h]

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.postgres',
    'corsheaders',
    'catalog',
    'accounts',
    'orders',
    'agent',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'accounts.middleware.PersonMiddleware',
]

ROOT_URLCONF = 'hunch.urls'
ASGI_APPLICATION = 'hunch.asgi.application'


def database_from_url(url: str) -> dict:
    u = urlparse(url)
    q = {k: v[0] for k, v in parse_qs(u.query).items()}
    return {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': u.path.lstrip('/') or 'postgres',
        'USER': u.username or '',
        'PASSWORD': u.password or '',
        'HOST': q.pop('host', u.hostname or ''),
        'PORT': str(u.port or 5432),
        'OPTIONS': q,
        'CONN_MAX_AGE': 60,
    }


DATABASES = {'default': database_from_url(env('DATABASE_URL', 'postgres://postgres@localhost:5432/hunch'))}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LANGUAGE_CODE = 'en-in'
TIME_ZONE = 'Asia/Kolkata'
USE_TZ = True

CORS_ALLOWED_ORIGINS = [o for o in env('CORS_ORIGINS', env('FRONTEND_URL', 'http://localhost:5173')).split(',') if o]
CORS_ALLOW_HEADERS = ['authorization', 'content-type', 'x-guest-id', 'x-dev-email', 'x-turn-id']

# --- Hunch ---
OPENAI_API_KEY = env('OPENAI_API_KEY') or env('OPENAI_KEY')
# One small model everywhere while testing: cost stays low.
OPENAI_MODEL = env('OPENAI_MODEL', 'gpt-6-luna')
OPENAI_EMBED_MODEL = env('OPENAI_EMBED_MODEL', 'text-embedding-3-small')
EMBED_DIMS = 512

SUPABASE_URL = env('SUPABASE_URL')
SUPABASE_ANON_KEY = env('SUPABASE_ANON_KEY')

DODO_PAYMENTS_API_KEY = env('DODO_PAYMENTS_API_KEY')
DODO_ENV = env('DODO_ENV', 'test_mode')
DODO_PRODUCT_ID = env('DODO_PRODUCT_ID')
DODO_WEBHOOK_SECRET = env('DODO_WEBHOOK_SECRET')
FRONTEND_URL = env('FRONTEND_URL', 'http://localhost:5173')

# Email sign-in before paying. Off while testing: a guest (browser id) with a name, phone and address can order.
AUTH_REQUIRED = env('AUTH_REQUIRED', '0') == '1'
# Dev only: `X-Dev-Email` signs a test user in without an OTP. Never on in production.
DEV_AUTH = DEBUG and env('DEV_AUTH', '1') == '1'

LOGGING = {
    'version': 1,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'loggers': {'hunch': {'handlers': ['console'], 'level': 'INFO'}},
}
