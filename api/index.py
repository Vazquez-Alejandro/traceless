import sys, os, json, traceback
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

r = {}

for mod in ["fastapi", "supabase", "pydantic", "dotenv", "httpx", "OpenSSL", "lxml", "zeep"]:
    try:
        __import__(mod)
        r[mod] = "ok"
    except Exception as e:
        r[mod] = str(e)

for mod, name in [("app.db", "db"), ("app.auth", "auth"), ("app.clientes", "clientes"),
                   ("app.facturas", "facturas"), ("app.afip", "afip"),
                   ("app.pdf", "pdf"), ("app.whatsapp", "whatsapp")]:
    try:
        __import__(mod)
        r[name] = "ok"
    except Exception as e:
        r[name] = traceback.format_exc()

r["python_version"] = sys.version
r["path"] = sys.path

def app(environ, start_response):
    body = json.dumps(r).encode()
    start_response("200 OK", [("Content-Type", "application/json")])
    return [body]
