import os
import sys
from pathlib import Path

# Ensure api/ directory is on Python path so `from app.main import app` works
_api_dir = str(Path(__file__).resolve().parent)
if _api_dir not in sys.path:
    sys.path.insert(0, _api_dir)

# Set env vars if not already set via Vercel dashboard
if "DATABASE_URL" not in os.environ or not os.environ.get("DATABASE_URL", "").strip():
    os.environ["DATABASE_URL"] = (
        "postgresql+psycopg2://neondb_owner:npg_zKD9VAfdigO8@"
        "ep-lively-mouse-ayn844lb-pooler.c-5.us-east-2.aws.neon.tech"
        "/neondb?sslmode=require"
    )

if "JWT_SECRET" not in os.environ or not os.environ.get("JWT_SECRET", "").strip():
    os.environ["JWT_SECRET"] = "inventory-system-prod-secret-key-2024"

from app.main import app  # noqa: E402

handler = app
