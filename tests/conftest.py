import os
import sys

os.environ.setdefault("DOLAR_MODE", "oficial")
os.environ.setdefault("ARCA_USE_REAL", "0")
os.environ.setdefault("ARCA_ENV", "homologacion")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
