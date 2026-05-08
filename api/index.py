"""
Vercel serverless entry point.
Vercel looks for a FastAPI/ASGI app in api/index.py exposed as `app`.
"""
import sys
import os

# Make sure the project root is in the path so we can import from backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.main import app  # noqa: F401  — Vercel needs `app` in this module
