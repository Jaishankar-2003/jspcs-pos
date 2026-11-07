from fastapi import WebSocket
from typing import List, Dict, Any
from datetime import datetime, timezone

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[WebSocket, str] = {} # WebSocket -> user_id
        self.active_users: Dict[str, Dict[str, Any]] = {} # user_id -> user_data
        self.last_cleared_timestamp = None

    async def connect(self, websocket: WebSocket, user_id: str = None):
        await websocket.accept()
        user_id_str = str(user_id) if user_id else None
        if user_id_str:
            self.active_connections[websocket] = user_id_str
            print(f"DEBUG: WebSocket connected for user {user_id_str}")
        else:
            # For anonymous dashboard connections (though we should ideally auth them)
            self.active_connections[websocket] = None

    async def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            user_id = self.active_connections.pop(websocket)
            user_id_str = str(user_id) if user_id else None
            print(f"DEBUG: WebSocket disconnected. user_id: {user_id_str}")
            
            if user_id_str:
                # Check if this was the last connection for this user
                remaining_connections = [uid for uid in self.active_connections.values() if uid == user_id_str]
                if not remaining_connections:
                    print(f"DEBUG: Last connection closed for user {user_id_str}. Cleaning up session.")
                    await self.user_logout(user_id_str)

    async def broadcast(self, message: dict):
        # Convert datetime objects to string if any
        for key, value in message.items():
            if isinstance(value, datetime):
                message[key] = value.isoformat()
                
        for connection in list(self.active_connections.keys()):
            try:
                await connection.send_json(message)
            except Exception:
                pass

    async def user_login(self, user_id: str, username: str, role: str):
        user_id_str = str(user_id)
        self.active_users[user_id_str] = {
            "userId": user_id_str,
            "username": username,
            "role": role,
            "loginTime": datetime.now(timezone.utc).isoformat(),
            "status": "ONLINE"
        }
        await self.broadcast({
            "type": "USER_LOGIN",
            "user": self.active_users[user_id_str]
        })

    async def user_logout(self, user_id: str):
        user_id_str = str(user_id)
        # Clean up any leftover active_connections for this user
        to_close = [ws for ws, uid in self.active_connections.items() if uid == user_id_str]
        for ws in to_close:
            self.active_connections.pop(ws, None)

        if user_id_str in self.active_users:
            self.active_users.pop(user_id_str, None)
            await self.broadcast({
                "type": "USER_LOGOUT",
                "userId": user_id_str
            })

    def get_active_users(self):
        from app.session_store import sessions
        active_session_user_ids = set(sessions.values())
        
        # Purge any user from active_users who is not in active sessions
        stale_ids = [uid for uid in list(self.active_users.keys()) if uid not in active_session_user_ids]
        for sid in stale_ids:
            self.active_users.pop(sid, None)

        return list(self.active_users.values())

    async def clear_revenue(self):
        from datetime import datetime, timezone, timezone
        self.last_cleared_timestamp = datetime.now(timezone.utc)
        await self.broadcast({
            "type": "REVENUE_CLEARED"
        })

manager = ConnectionManager()
