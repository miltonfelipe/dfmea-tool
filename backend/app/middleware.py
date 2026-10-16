"""Security headers and request-size limit (plain ASGI middleware)."""
import json

# The built React app only loads its own scripts and styles, plus Google Fonts
# (imported from App.css). React sets inline styles through the DOM, which CSP
# doesn't restrict. Blob URLs are used for .dfmea / CSV downloads.
CONTENT_SECURITY_POLICY = "; ".join([
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
])
# FastAPI's Swagger/ReDoc pages load assets from a CDN; leave them without CSP.
_DOCS_PATHS = ("/docs", "/redoc", "/openapi.json")

_COMMON_HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
    (b"cross-origin-opener-policy", b"same-origin"),
    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
]


class SecurityHeaders:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        path = scope["path"]

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers += _COMMON_HEADERS
                if not path.startswith(_DOCS_PATHS):
                    headers.append((b"content-security-policy", CONTENT_SECURITY_POLICY.encode()))
                if path.startswith("/api/"):
                    headers.append((b"cache-control", b"no-store"))  # don't cache project data
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)



class BodySizeLimit:
    """Reject request bodies over max_bytes with 413, whether or not they send
    a Content-Length header."""

    def __init__(self, app, max_bytes: int):
        self.app = app
        self.max_bytes = max_bytes

    async def _reject(self, send, status=413, detail=None):
        detail = detail or f"Request body too large (limit {self.max_bytes // (1024 * 1024)} MB)"
        body = json.dumps({"detail": detail}).encode()
        await send({"type": "http.response.start", "status": status,
                    "headers": [(b"content-type", b"application/json"),
                                (b"content-length", str(len(body)).encode())]})
        await send({"type": "http.response.body", "body": body})

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        length = dict(scope.get("headers", [])).get(b"content-length")
        if length is not None:
            try:
                if int(length) > self.max_bytes:
                    return await self._reject(send)
            except ValueError:
                return await self._reject(send, 400, "Invalid Content-Length")

        # Chunked bodies: once over the limit, tell the app the client went away,
        # drop whatever it answers (FastAPI turns body errors into its own 400)
        # and send 413 instead.
        received = 0
        exceeded = False
        started = False

        async def limited_receive():
            nonlocal received, exceeded
            if exceeded:
                return {"type": "http.disconnect"}
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    exceeded = True
                    return {"type": "http.disconnect"}
            return message

        async def guarded_send(message):
            nonlocal started
            if exceeded and not started:
                return
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, guarded_send)
        except Exception:
            if not exceeded:
                raise
        if exceeded and not started:
            await self._reject(send)
