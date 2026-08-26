import os
import sys
from pathlib import Path

# Add backend to Python path for imports
_root = Path(__file__).resolve().parent
sys.path.insert(0, str(_root / "backend"))

# Ensure DATABASE_URL is set for Vercel (uses Neon pooler)
if "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = (
        "postgresql+psycopg2://neondb_owner:npg_zKD9VAfdigO8@"
        "ep-lively-mouse-ayn844lb-pooler.c-5.us-east-2.aws.neon.tech"
        "/neondb?sslmode=require"
    )

from app.main import app  # noqa: E402

handler = app
