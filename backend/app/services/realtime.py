"""Live push to connected browsers / phones over WebSocket.

One in-memory registry per server process. (With several server processes, put Redis pub/sub in front of
publish(); the rest of the app does not change.)
"""
import asyncio
import logging
import threading

from fastapi import WebSocket

log = logging.getLogger(__name__)


class Broadcaster:
    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = {}
        self._lock = threading.Lock()
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._loop = asyncio.get_running_loop()
        with self._lock:
            self._connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        with self._lock:
            sockets = self._connections.get(user_id)
            if sockets:
                sockets.discard(websocket)
                if not sockets:
                    self._connections.pop(user_id, None)

    def connected_users(self) -> set[int]:
        with self._lock:
            return set(self._connections)

    def publish(self, user_id: int, message: dict) -> None:
        """Send to every open connection of this user. Safe to call from any thread; never blocks."""
        with self._lock:
            sockets = list(self._connections.get(user_id, ()))
        if not sockets or self._loop is None or self._loop.is_closed():
            return
        for ws in sockets:
            future = asyncio.run_coroutine_threadsafe(ws.send_json(message), self._loop)
            future.add_done_callback(lambda f: f.exception() and log.warning("Push failed: %s", f.exception()))


broadcaster = Broadcaster()
