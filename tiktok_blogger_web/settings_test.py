"""Test settings: SQLite in memory, no external services."""

from .settings import *  # noqa: F401,F403

SECRET_KEY = "test-only-secret-key"
DEBUG = False
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
