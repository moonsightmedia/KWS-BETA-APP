"""Bounded CPU image service. No photo storage, URL fetches or service-role key.

Each production/review process has its own GoTrue/public key and origin list.
Only verified GoTrue sessions with an existing setter/admin role may analyze.
"""
import base64
import binascii
import io
import json
import os
import socket
import threading
import time
import urllib.request
import uuid
from collections import OrderedDict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
from PIL import Image, UnidentifiedImageError
from model_contract import COLORS, VERSION, REVISION

LOCK = threading.BoundedSemaphore(1)
PORT = int(os.getenv('THUMBNAIL_PORT', '5227'))
BIND = os.getenv('THUMBNAIL_BIND', '127.0.0.1')
LOCAL = os.getenv('THUMBNAIL_LOCAL_ONLY') == 'true'
READY = False
MAX_BODY = 17_000_000
MAX_IMAGE = 12_000_000
MAX_PIXELS = 30_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
AUTH_TIMEOUT = 5
RATE_LIMIT = 30
RATE_WINDOW = 60
RATE_USERS = 4096
_RATES = OrderedDict()
_RATE_LOCK = threading.Lock()


def analyze(raw, color, point=None):
    # Auth/origin/HTTP tests do not need OpenCV, ONNX or model downloads.
    from detector_start_v3 import analyze as run
    return run(raw, color, point)


def plain_origin(value):
    parsed = urlsplit(value)
    if parsed.scheme not in ('https', 'http', 'capacitor') or not parsed.hostname:
        raise ValueError('Expected an explicit origin.')
    if parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment or '*' in value:
        raise ValueError('Expected an explicit origin without credentials or path.')
    if parsed.port is not None and not 1 <= parsed.port <= 65535:
        raise ValueError('Invalid origin port.')
    if parsed.scheme != 'https' and value not in ('http://localhost', 'capacitor://localhost'):
        raise ValueError('Non-HTTPS origin is not permitted.')
    return value


def allowed_origins():
    values = os.getenv('THUMBNAIL_ALLOWED_ORIGINS', '').split(',')
    return {plain_origin(value.strip()) for value in values if value.strip()}


def validate_configuration():
    if not 1024 <= PORT <= 65535:
        raise ValueError('Expected an unprivileged loopback port.')
    if BIND not in ('127.0.0.1', '0.0.0.0'):
        raise ValueError('Unsupported bind address.')
    if BIND == '0.0.0.0' and (LOCAL or os.getenv('THUMBNAIL_CONTAINER_PRIVATE') != 'true' or os.getenv('THUMBNAIL_ENVIRONMENT') not in ('production', 'review')):
        raise ValueError('Wildcard binding requires the explicitly private container deployment.')
    if LOCAL:
        if os.getenv('THUMBNAIL_ENVIRONMENT') in ('production', 'review'):
            raise ValueError('Local-only mode is forbidden for server deployments.')
        return
    base = os.environ['THUMBNAIL_AUTH_URL'].rstrip('/')
    if not base.startswith('https://') or plain_origin(base) != base:
        raise ValueError('Expected an explicit HTTPS auth origin.')
    key = os.environ['THUMBNAIL_PUBLIC_KEY']
    if not key or key.startswith('sb_secret_'):
        raise ValueError('Only a public Supabase key may be used.')
    if not key.startswith('sb_publishable_'):
        try:
            payload = json.loads(base64.urlsafe_b64decode(key.split('.')[1] + '==='))
        except (ValueError, IndexError, TypeError) as error:
            raise ValueError('Expected a public Supabase key.') from error
        # This is a configuration guard, not authentication by unverified JWT.
        if not isinstance(payload, dict) or payload.get('role') != 'anon':
            raise ValueError('Only an anon/public key may be used.')
    if not allowed_origins():
        raise ValueError('Configure explicit application/native origins.')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


AUTH_HTTP = urllib.request.build_opener(NoRedirect)


def auth_json(request):
    # Never follow an auth redirect while carrying the caller's Bearer header.
    with AUTH_HTTP.open(request, timeout=AUTH_TIMEOUT) as response:
        raw = response.read(65537)
        if len(raw) > 65536:
            raise ValueError('Unexpected auth response size.')
        return json.loads(raw)


def authenticated_user(header):
    if LOCAL:
        return 'local'
    if not header or not header.startswith('Bearer ') or not 1 <= len(header[7:]) <= 8192:
        return None
    try:
        base = os.environ['THUMBNAIL_AUTH_URL'].rstrip('/')
        if not base.startswith('https://') or plain_origin(base) != base:
            return None
        headers = {'Authorization': header, 'apikey': os.environ['THUMBNAIL_PUBLIC_KEY']}
        user = str(uuid.UUID(auth_json(urllib.request.Request(base + '/auth/v1/user', headers=headers))['id']))
        for role in ('setter', 'admin'):
            body = json.dumps({'_user_id': user, '_role': role}).encode()
            request = urllib.request.Request(base + '/rest/v1/rpc/has_role', data=body, headers={**headers, 'Content-Type': 'application/json'})
            if auth_json(request) is True:
                return user
    except Exception:
        return None
    return None


def authorized(header):
    return authenticated_user(header) is not None


def rate_allowed(user, now=None):
    now = time.monotonic() if now is None else now
    with _RATE_LOCK:
        for key in list(_RATES):
            if not _RATES[key] or _RATES[key][-1] <= now - RATE_WINDOW:
                del _RATES[key]
        if user not in _RATES:
            if len(_RATES) >= RATE_USERS:
                return False
            _RATES[user] = deque()
        entries = _RATES[user]
        while entries and entries[0] <= now - RATE_WINDOW:
            entries.popleft()
        if len(entries) >= RATE_LIMIT:
            return False
        entries.append(now)
        _RATES.move_to_end(user)
        return True


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def log_message(self, *args):
        pass

    def origin_allowed(self):
        origin = self.headers.get('Origin')
        if LOCAL:
            return not origin and self.headers.get('Host') in (f'127.0.0.1:{PORT}', f'localhost:{PORT}')
        return not origin or origin in allowed_origins()

    def reply(self, status, data):
        raw = b'' if status == 204 else json.dumps(data, ensure_ascii=False, allow_nan=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Vary', 'Origin')
        origin = self.headers.get('Origin')
        if not LOCAL and origin and origin in allowed_origins():
            self.send_header('Access-Control-Allow-Origin', origin)
        if status == 204:
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'authorization, content-type')
            self.send_header('Access-Control-Max-Age', '300')
        if status == 429:
            self.send_header('Retry-After', '2')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.close_connection = True
        try:
            self.wfile.write(raw)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, socket.timeout):
            pass

    def do_OPTIONS(self):
        headers = {value.strip().lower() for value in self.headers.get('Access-Control-Request-Headers', '').split(',') if value.strip()}
        if self.path != '/api/analyze' or LOCAL or not self.headers.get('Origin') or not self.origin_allowed() or self.headers.get('Access-Control-Request-Method') != 'POST' or not headers <= {'authorization', 'content-type'}:
            return self.reply(403, {'error': 'Origin oder Anfrage nicht freigegeben.'})
        self.reply(204, {})

    def do_GET(self):
        if not self.origin_allowed():
            return self.reply(403, {'error': 'Origin nicht freigegeben.'})
        if self.path == '/api/health':
            return self.reply(200 if READY else 503, {'ok': READY, 'version': VERSION, 'local_only': LOCAL, 'provider': 'CPUExecutionProvider', 'environment': os.getenv('THUMBNAIL_ENVIRONMENT', 'local'), 'model_revision': REVISION})
        self.reply(404, {'error': 'Nicht verfügbar.'})

    def do_POST(self):
        if self.path != '/api/analyze':
            return self.reply(404, {'error': 'Nicht verfügbar.'})
        if not self.origin_allowed():
            return self.reply(403, {'error': 'Origin nicht freigegeben.'})
        if self.headers.get('Transfer-Encoding') or len(self.headers.get_all('Content-Length', [])) != 1:
            return self.reply(400, {'error': 'Eine feste Inhaltslänge wird benötigt.'})
        if self.headers.get('Content-Type', '').split(';')[0].lower() != 'application/json':
            return self.reply(415, {'error': 'JSON erwartet.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            return self.reply(413, {'error': 'Foto zu groß (maximal 12 MB).'})
        user = authenticated_user(self.headers.get('Authorization'))
        if not user:
            return self.reply(403, {'error': 'Setter-Anmeldung erforderlich.'})
        if not rate_allowed(user):
            return self.reply(429, {'error': 'Zu viele Anfragen. Bitte kurz warten.'})
        if not LOCK.acquire(False):
            return self.reply(429, {'error': 'Erkennung beschäftigt. Bitte erneut versuchen.'})
        try:
            body = self.rfile.read(length)
            if len(body) != length:
                raise ValueError('Incomplete body')
            data = json.loads(body)
            if not isinstance(data, dict) or data.get('color') not in (*COLORS, 'manual'):
                raise ValueError('Invalid color')
            if not isinstance(data.get('image'), str):
                raise ValueError('Invalid photo')
            raw = base64.b64decode(data['image'], validate=True)
            if not raw or len(raw) > MAX_IMAGE:
                raise ValueError('Invalid size')
            point = data.get('point')
            if point is not None and (not isinstance(point, list) or len(point) != 2 or not all(type(value) in (int, float) and 0 <= value <= 1 for value in point)):
                raise ValueError('Invalid point')
            if data['color'] == 'manual' and point is None:
                raise ValueError('Manual point required')
            with Image.open(io.BytesIO(raw)) as image:
                if image.format not in ('JPEG', 'PNG', 'WEBP') or image.width * image.height > MAX_PIXELS or min(image.size) < 48:
                    raise ValueError('Invalid image')
                image.verify()
            self.reply(200, analyze(raw, data['color'], point))
        except (ValueError, TypeError, KeyError, binascii.Error, UnidentifiedImageError, Image.DecompressionBombError, socket.timeout):
            self.reply(400, {'error': 'JPG, PNG oder WebP bis 12 MB und gültige Farbe erwartet.'})
        except Exception:
            self.reply(500, {'error': 'Erkennung fehlgeschlagen. Das Original bleibt erhalten.'})
        finally:
            LOCK.release()


class BoundedHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 8

    def __init__(self, address, handler, max_workers=4):
        super().__init__(address, handler)
        self.workers = threading.BoundedSemaphore(max_workers)

    def process_request(self, request, client_address):
        if not self.workers.acquire(False):
            try:
                # Consume only a small bounded header before closing. Sending a
                # response immediately on accept can reset the socket while a
                # normal client is still writing its request line (notably on
                # Windows). Never read/allocate a photo on this overflow path.
                request.settimeout(0.1)
                header = b''
                while len(header) < 8192 and b'\r\n\r\n' not in header:
                    chunk = request.recv(min(1024, 8192 - len(header)))
                    if not chunk:
                        break
                    header += chunk
            except OSError:
                pass
            try:
                request.sendall(b'HTTP/1.0 429 Too Many Requests\r\nRetry-After: 2\r\nContent-Length: 0\r\nConnection: close\r\n\r\n')
            except OSError:
                pass
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except BaseException:
            self.workers.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.workers.release()


if __name__ == '__main__':
    validate_configuration()
    # Loading requires verified model hashes and an explicitly CPU-only provider.
    from sam_local import sessions
    sessions()
    READY = True
    print(f'Thumbnail service: {BIND}:{PORT}, {VERSION}, CPU only', flush=True)
    BoundedHTTPServer((BIND, PORT), Handler).serve_forever()
