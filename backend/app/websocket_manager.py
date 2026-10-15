from fastapi import WebSocket
from typing import List, Dict, Any
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[WebSocket, str] = {} # WebSocket -> user_id
        self.active_users: Dict[str, Dict[str, Any]] = {} # user_id -> user_data
        self.last_cleared_timestamp = None

    async def connect(self, websocket: WebSocket, user_id: str = None):
        await websocket.accept()
        if user_id:
            self.active_connections[websocket] = user_id
            print(f"DEBUG: WebSocket connected for user {user_id}")
        else:
            # For anonymous dashboard connections (though we should ideally auth them)
            self.active_connections[websocket] = None

    async def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            user_id = self.active_connections.pop(websocket)
            print(f"DEBUG: WebSocket disconnected. user_id: {user_id}")
            
            if user_id:
                # Check if this was the last connection for this user
                remaining_connections = [uid for uid in self.active_connections.values() if uid == user_id]
                if not remaining_connections:
                    print(f"DEBUG: Last connection closed for user {user_id}. Cleaning up session.")
                    await self.user_logout(user_id)

    async def broadcast(self, message: dict):
        # Convert datetime objects to string if any
        for key, value in message.items():
            if isinstance(value, datetime):
                message[key] = value.isoformat()
                
        for connection in self.active_connections.keys():
            try:
                await connection.send_json(message)
            except Exception:
                pass

    async def user_login(self, user_id: str, username: str, role: str):
        self.active_users[user_id] = {
            "userId": user_id,
            "username": username,
            "role": role,
            "loginTime": datetime.utcnow().isoformat(),
            "status": "ONLINE"
        }
        await self.broadcast({
            "type": "USER_LOGIN",
            "user": self.active_users[user_id]
        })

    async def user_logout(self, user_id: str):
        if user_id in self.active_users:
            user = self.active_users.pop(user_id)
            await self.broadcast({
                "type": "USER_LOGOUT",
                "userId": user_id
            })

    def get_active_users(self):
        return list(self.active_users.values())

    async def clear_revenue(self):
        from datetime import datetime, timezone
        self.last_cleared_timestamp = datetime.now(timezone.utc)
        await self.broadcast({
            "type": "REVENUE_CLEARED"
        })

manager = ConnectionManager()
