"""CPU image service. No uploads, storage writes or URL fetching in HTTP requests.

Bind loopback; a production reverse proxy must preserve Authorization and enforce
body/rate/time limits. Production auth is verified against the configured GoTrue
and role RPC, never by decoding an unverified JWT.
"""
import base64, binascii, json, os, threading, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from PIL import Image, UnidentifiedImageError
from detector_start_v3 import analyze, COLORS, VERSION

LOCK = threading.BoundedSemaphore(1)
PORT = int(os.getenv('THUMBNAIL_PORT', '5227'))
LOCAL = os.getenv('THUMBNAIL_LOCAL_ONLY') == 'true'

def authorized(header):
    if LOCAL: return True
    if not header or not header.startswith('Bearer '): return False
    base = os.environ['THUMBNAIL_AUTH_URL'].rstrip('/')
    if not base.startswith('https://'): return False
    headers = {'Authorization': header, 'apikey': os.environ['THUMBNAIL_PUBLIC_KEY']}
    try:
        with urllib.request.urlopen(urllib.request.Request(base+'/auth/v1/user', headers=headers), timeout=10) as r:
            user = json.load(r)['id']
        for role in ['setter','admin']:
            body=json.dumps({'_user_id':user,'_role':role}).encode()
            request=urllib.request.Request(base+'/rest/v1/rpc/has_role',data=body,headers={**headers,'Content-Type':'application/json'})
            with urllib.request.urlopen(request,timeout=10) as r:
                if json.load(r) is True:return True
    except Exception: return False
    return False

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def reply(self,status,data):
        raw=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Length',str(len(raw)));self.end_headers()
        try:self.wfile.write(raw)
        except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass
    def do_GET(self):
        if self.path=='/api/health':return self.reply(200,{'ok':True,'version':VERSION,'local_only':LOCAL})
        self.reply(404,{'error':'Nicht verfügbar.'})
    def do_POST(self):
        if self.path!='/api/analyze':return self.reply(404,{'error':'Nicht verfügbar.'})
        # No CORS. Local requests must come through the explicitly configured Vite
        # proxy; hostile browser origins cannot reach the unauthenticated loopback.
        if LOCAL and (self.headers.get('Host') not in [f'127.0.0.1:{PORT}',f'localhost:{PORT}'] or self.headers.get('Origin')):
            return self.reply(403,{'error':'Lokale Anfrage erwartet.'})
        if not authorized(self.headers.get('Authorization')):return self.reply(403,{'error':'Setter-Anmeldung erforderlich.'})
        if self.headers.get('Content-Type','').split(';')[0]!='application/json':return self.reply(415,{'error':'JSON erwartet.'})
        try:length=int(self.headers.get('Content-Length','0'))
        except ValueError:length=0
        if length<=0 or length>17_000_000:return self.reply(413,{'error':'Foto zu groß (maximal 12 MB).'})
        if not LOCK.acquire(False):return self.reply(429,{'error':'Erkennung beschäftigt. Bitte erneut versuchen.'})
        try:
            data=json.loads(self.rfile.read(length))
            if not isinstance(data,dict) or (data.get('color') not in COLORS and not (data.get('color')=='manual' and data.get('point') is not None)):raise ValueError()
            raw=base64.b64decode(data.get('image',''),validate=True)
            if not raw or len(raw)>12_000_000:raise ValueError()
            point=data.get('point')
            if point is not None and (not isinstance(point,list) or len(point)!=2 or not all(type(x) in [int,float] and 0<=x<=1 for x in point)):raise ValueError()
            self.reply(200,analyze(raw,data['color'],point))
        except (ValueError,TypeError,KeyError,binascii.Error,UnidentifiedImageError,Image.DecompressionBombError):
            self.reply(400,{'error':'JPG, PNG oder WebP bis 12 MB und gültige Farbe erwartet.'})
        except Exception:self.reply(500,{'error':'Erkennung fehlgeschlagen. Das Original bleibt erhalten.'})
        finally:LOCK.release()

if __name__=='__main__':
    if not LOCAL and not all(os.getenv(k) for k in ['THUMBNAIL_AUTH_URL','THUMBNAIL_PUBLIC_KEY']):
        raise SystemExit('Configure auth, or explicitly enable THUMBNAIL_LOCAL_ONLY for loopback development.')
    print(f'Thumbnail service: 127.0.0.1:{PORT}, {VERSION}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()
