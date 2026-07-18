import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.main import app
except Exception:
    import traceback
    _err = traceback.format_exc()

    def app(environ, start_response):
        body = json.dumps({"import_error": _err, "type": "wsgi"}).encode()
        start_response("500 Internal Server Error", [("Content-Type", "application/json")])
        return [body]
