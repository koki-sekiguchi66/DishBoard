import os
import socket
from pathlib import Path
from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False') == 'True'

ALLOWED_HOSTS_str = os.getenv('ALLOWED_HOSTS', '')
ALLOWED_HOSTS = ALLOWED_HOSTS_str.split(',') if ALLOWED_HOSTS_str else []

# Database
POSTGRES_DB = os.environ.get('POSTGRES_DB')
POSTGRES_USER = os.environ.get('POSTGRES_USER')
POSTGRES_PASSWORD = os.environ.get('POSTGRES_PASSWORD')
DB_HOST = os.environ.get('DB_HOST', 'db')
DB_PORT = os.environ.get('DB_PORT', '5432')

def resolve_db_host(preferred_host):
    """
    Docker 開発時は preferred_host='db' を使う想定。
    起動環境で 'db' が解決できなければローカル用ホストにフォールバックする。
    環境変数 DB_HOST_LOCAL があればそれを優先。
    """
    local_override = os.environ.get('DB_HOST_LOCAL')
    if local_override:
        return local_override

    try:
        socket.gethostbyname(preferred_host)
        return preferred_host
    except OSError:
        return 'localhost'

# Postgres 情報があれば Postgres を使う
if POSTGRES_DB:
    db_host = resolve_db_host(DB_HOST)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': POSTGRES_DB,
            'USER': POSTGRES_USER or '',
            'PASSWORD': POSTGRES_PASSWORD or '',
            'HOST': db_host,
            'PORT': DB_PORT,
        }
    }
else:
    # フォールバック：SQLite を使う
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# CORS設定（開発環境では緩い設定）
CORS_ALLOWED_ORIGINS_str = os.getenv('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = CORS_ALLOWED_ORIGINS_str.split(',') if CORS_ALLOWED_ORIGINS_str else []

CORS_ALLOW_HEADERS = [
    'Authorization',
    'Content-Type',
]

# CSRF設定
CSRF_TRUSTED_ORIGINS_str = os.getenv('CSRF_TRUSTED_ORIGINS', '')
CSRF_TRUSTED_ORIGINS = CSRF_TRUSTED_ORIGINS_str.split(',') if CSRF_TRUSTED_ORIGINS_str else []