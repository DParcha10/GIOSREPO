"""Test isolation: never touch the app's real database or the network tile service."""
import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="tiepoint-tests-")
os.environ.setdefault("TIEPOINT_DATABASE_URL", f"sqlite:///{os.path.join(_tmp, 'test.db')}")
os.environ.setdefault("TIEPOINT_REAL_TILES", "0")
