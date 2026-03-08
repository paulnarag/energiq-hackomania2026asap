"""FastAPI wrapper for the SP AI Energy Coach analytics workflow.

This file proxies to hackomania/backend/api.py to enable running:
  uvicorn api:app --reload
from the project root.
"""

import sys
from pathlib import Path

# Add hackomania/backend to path and import the actual API
backend_path = Path(__file__).parent / "hackomania" / "backend"
sys.path.insert(0, str(backend_path))

# Load the backend API module
import importlib.util
spec = importlib.util.spec_from_file_location("backend_api", backend_path / "api.py")
backend_api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend_api)

# Expose the app from the backend
app = backend_api.app

