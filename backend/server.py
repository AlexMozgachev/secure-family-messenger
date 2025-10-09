from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import json
import base64
import asyncio
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'secure_messenger')]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production-' + str(uuid.uuid4()))
ALGORITHM = "HS256"
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Secure Messenger API")
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except:
                self.disconnect(user_id)
    
    async def broadcast(self, message: dict, room_id: str, exclude_user: str = None):
        # Get room members
        room = await db.rooms.find_one({"id": room_id})
        if room:
            for member_id in room.get('members', []):
                if member_id != exclude_user:
                    await self.send_personal_message(message, member_id)

manager = ConnectionManager()

# ==================== MODELS ====================

class UserCreate(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    display_name: Optional[str] = None
    public_key: Optional[str] = None  # E2EE public key
    avatar_url: Optional[str] = None
    is_blocked: bool = False
    is_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

class AdminCreate(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = None

class Room(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: Optional[str] = None
    type: str = "direct"  # direct, group
    members: List[str] = []
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    sender_id: str
    encrypted_content: str  # E2EE encrypted message
    message_type: str = "text"  # text, file, image, audio, video
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_edited: bool = False
    edited_at: Optional[datetime] = None

class KeyBundle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    public_key: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlockedIP(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ip_address: str
    reason: str = "Failed login attempts"
    blocked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    blocked_by: Optional[str] = None  # admin user_id or 'system'
    expires_at: Optional[datetime] = None

class DeviceSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    device_name: str
    ip_address: str
    user_agent: str
    last_active: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    gps_updated_at: Optional[datetime] = None

class LoginAttempt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ip_address: str
    username: Optional[str] = None
    success: bool
    attempted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GPSUpdate(BaseModel):
    latitude: float
    longitude: float

class IPBlockRequest(BaseModel):
    ip_addresses: List[str]
    reason: str = "Manual block"
    expires_hours: Optional[int] = None

class InstallRequest(BaseModel):
    admin_username: str
    admin_password: str
    admin_display_name: Optional[str] = None
    server_name: str = "Secure Messenger"

class InstallStatus(BaseModel):
    installed: bool
    message: str
    admin_username: Optional[str] = None
    server_url: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class RoomCreate(BaseModel):
    name: Optional[str] = None
    type: str = "direct"
    member_ids: List[str] = []

class MessageCreate(BaseModel):
    room_id: str
    encrypted_content: str
    message_type: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None

class PublicKeyUpdate(BaseModel):
    public_key: str

# ==================== UTILITIES ====================

def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=30)):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    payload = verify_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_data = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Parse datetime if needed
    if isinstance(user_data.get('created_at'), str):
        user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
    if isinstance(user_data.get('last_login'), str):
        user_data['last_login'] = datetime.fromisoformat(user_data['last_login'])
    
    return User(**user_data)

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==================== INSTALLATION ENDPOINTS ====================

@api_router.get("/install/status", response_model=InstallStatus)
async def get_install_status():
    """Check if the system is installed"""
    admin_count = await db.users.count_documents({"is_admin": True})
    
    if admin_count > 0:
        return InstallStatus(
            installed=True,
            message="System is already installed",
            server_url=os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        )
    
    return InstallStatus(
        installed=False,
        message="System is not installed. Please run installation."
    )

@api_router.post("/install", response_model=InstallStatus)
async def install_system(install_req: InstallRequest):
    """Install the system and create admin account"""
    # Check if already installed
    admin_count = await db.users.count_documents({"is_admin": True})
    if admin_count > 0:
        raise HTTPException(status_code=400, detail="System is already installed")
    
    # Create admin user
    hashed_password = pwd_context.hash(install_req.admin_password)
    admin_user = User(
        username=install_req.admin_username,
        display_name=install_req.admin_display_name or install_req.admin_username,
        is_admin=True,
        is_blocked=False
    )
    
    admin_dict = admin_user.model_dump()
    admin_dict['password'] = hashed_password
    admin_dict['created_at'] = admin_dict['created_at'].isoformat()
    if admin_dict.get('last_login'):
        admin_dict['last_login'] = admin_dict['last_login'].isoformat()
    
    await db.users.insert_one(admin_dict)
    
    # Create system settings
    settings = {
        "id": str(uuid.uuid4()),
        "server_name": install_req.server_name,
        "installed_at": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }
    await db.settings.insert_one(settings)
    
    return InstallStatus(
        installed=True,
        message="Installation completed successfully",
        admin_username=install_req.admin_username,
        server_url=os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    )

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_create: UserCreate):
    """Register a new user"""
    # Check if username exists
    existing = await db.users.find_one({"username": user_create.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create user
    hashed_password = pwd_context.hash(user_create.password)
    user = User(
        username=user_create.username,
        display_name=user_create.display_name or user_create.username,
        is_admin=False
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hashed_password
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    
    return TokenResponse(access_token=access_token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_login: UserLogin):
    """Login user"""
    user_data = await db.users.find_one({"username": user_login.username}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not pwd_context.verify(user_login.password, user_data['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if blocked
    if user_data.get('is_blocked', False):
        raise HTTPException(status_code=403, detail="Account is blocked")
    
    # Update last login
    await db.users.update_one(
        {"id": user_data['id']},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Parse datetime
    if isinstance(user_data.get('created_at'), str):
        user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
    if isinstance(user_data.get('last_login'), str):
        user_data['last_login'] = datetime.fromisoformat(user_data['last_login'])
    
    user = User(**user_data)
    access_token = create_access_token(data={"sub": user.id})
    
    return TokenResponse(access_token=access_token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user"""
    return current_user

# ==================== USER ENDPOINTS ====================

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    """Get all users (excluding passwords)"""
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        if isinstance(user.get('last_login'), str):
            user['last_login'] = datetime.fromisoformat(user['last_login'])
    
    return [User(**u) for u in users]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Get user by ID"""
    user_data = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_data.get('created_at'), str):
        user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
    if isinstance(user_data.get('last_login'), str):
        user_data['last_login'] = datetime.fromisoformat(user_data['last_login'])
    
    return User(**user_data)

@api_router.put("/users/public-key", response_model=User)
async def update_public_key(key_update: PublicKeyUpdate, current_user: User = Depends(get_current_user)):
    """Update user's E2EE public key"""
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"public_key": key_update.public_key}}
    )
    
    # Store in key bundles
    key_bundle = KeyBundle(
        user_id=current_user.id,
        public_key=key_update.public_key
    )
    key_dict = key_bundle.model_dump()
    key_dict['uploaded_at'] = key_dict['uploaded_at'].isoformat()
    await db.key_bundles.insert_one(key_dict)
    
    current_user.public_key = key_update.public_key
    return current_user

@api_router.get("/users/{user_id}/public-key")
async def get_user_public_key(user_id: str, current_user: User = Depends(get_current_user)):
    """Get user's E2EE public key"""
    user_data = await db.users.find_one({"id": user_id}, {"_id": 0, "public_key": 1})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"user_id": user_id, "public_key": user_data.get('public_key')}

# ==================== ROOM ENDPOINTS ====================

@api_router.post("/rooms", response_model=Room)
async def create_room(room_create: RoomCreate, current_user: User = Depends(get_current_user)):
    """Create a new chat room"""
    members = list(set([current_user.id] + room_create.member_ids))
    
    # For direct chats, check if room already exists
    if room_create.type == "direct" and len(members) == 2:
        existing_room = await db.rooms.find_one({
            "type": "direct",
            "members": {"$all": members, "$size": 2}
        }, {"_id": 0})
        
        if existing_room:
            if isinstance(existing_room.get('created_at'), str):
                existing_room['created_at'] = datetime.fromisoformat(existing_room['created_at'])
            if isinstance(existing_room.get('last_activity'), str):
                existing_room['last_activity'] = datetime.fromisoformat(existing_room['last_activity'])
            return Room(**existing_room)
    
    room = Room(
        name=room_create.name,
        type=room_create.type,
        members=members,
        created_by=current_user.id
    )
    
    room_dict = room.model_dump()
    room_dict['created_at'] = room_dict['created_at'].isoformat()
    room_dict['last_activity'] = room_dict['last_activity'].isoformat()
    
    await db.rooms.insert_one(room_dict)
    
    return room

@api_router.get("/rooms", response_model=List[Room])
async def get_rooms(current_user: User = Depends(get_current_user)):
    """Get all rooms for current user"""
    rooms = await db.rooms.find(
        {"members": current_user.id},
        {"_id": 0}
    ).sort("last_activity", -1).to_list(1000)
    
    for room in rooms:
        if isinstance(room.get('created_at'), str):
            room['created_at'] = datetime.fromisoformat(room['created_at'])
        if isinstance(room.get('last_activity'), str):
            room['last_activity'] = datetime.fromisoformat(room['last_activity'])
    
    return [Room(**r) for r in rooms]

@api_router.get("/rooms/{room_id}", response_model=Room)
async def get_room(room_id: str, current_user: User = Depends(get_current_user)):
    """Get room by ID"""
    room_data = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room_data:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Check if user is member
    if current_user.id not in room_data['members']:
        raise HTTPException(status_code=403, detail="Not a member of this room")
    
    if isinstance(room_data.get('created_at'), str):
        room_data['created_at'] = datetime.fromisoformat(room_data['created_at'])
    if isinstance(room_data.get('last_activity'), str):
        room_data['last_activity'] = datetime.fromisoformat(room_data['last_activity'])
    
    return Room(**room_data)

# ==================== MESSAGE ENDPOINTS ====================

@api_router.post("/messages", response_model=Message)
async def create_message(message_create: MessageCreate, current_user: User = Depends(get_current_user)):
    """Send a message"""
    # Verify room membership
    room = await db.rooms.find_one({"id": message_create.room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if current_user.id not in room['members']:
        raise HTTPException(status_code=403, detail="Not a member of this room")
    
    message = Message(
        room_id=message_create.room_id,
        sender_id=current_user.id,
        encrypted_content=message_create.encrypted_content,
        message_type=message_create.message_type,
        file_url=message_create.file_url,
        file_name=message_create.file_name,
        file_size=message_create.file_size
    )
    
    message_dict = message.model_dump()
    message_dict['created_at'] = message_dict['created_at'].isoformat()
    if message_dict.get('edited_at'):
        message_dict['edited_at'] = message_dict['edited_at'].isoformat()
    
    await db.messages.insert_one(message_dict)
    
    # Update room last activity
    await db.rooms.update_one(
        {"id": message_create.room_id},
        {"$set": {"last_activity": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Broadcast to room members via WebSocket
    await manager.broadcast(
        {
            "type": "new_message",
            "message": message_dict
        },
        message_create.room_id,
        exclude_user=current_user.id
    )
    
    return message

@api_router.get("/rooms/{room_id}/messages", response_model=List[Message])
async def get_messages(room_id: str, limit: int = 50, before: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get messages for a room"""
    # Verify room membership
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if current_user.id not in room['members']:
        raise HTTPException(status_code=403, detail="Not a member of this room")
    
    query = {"room_id": room_id}
    if before:
        query["id"] = {"$lt": before}
    
    messages = await db.messages.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Reverse to get chronological order
    messages.reverse()
    
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
        if isinstance(msg.get('edited_at'), str):
            msg['edited_at'] = datetime.fromisoformat(msg['edited_at'])
    
    return [Message(**m) for m in messages]

# ==================== ADMIN ENDPOINTS ====================

@api_router.get("/admin/users", response_model=List[User])
async def admin_get_users(current_admin: User = Depends(get_current_admin)):
    """Admin: Get all users"""
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        if isinstance(user.get('last_login'), str):
            user['last_login'] = datetime.fromisoformat(user['last_login'])
    
    return [User(**u) for u in users]

@api_router.post("/admin/users", response_model=User)
async def admin_create_user(user_create: UserCreate, current_admin: User = Depends(get_current_admin)):
    """Admin: Create a new user"""
    # Check if username exists
    existing = await db.users.find_one({"username": user_create.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = pwd_context.hash(user_create.password)
    user = User(
        username=user_create.username,
        display_name=user_create.display_name or user_create.username
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hashed_password
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    return user

@api_router.put("/admin/users/{user_id}/block")
async def admin_block_user(user_id: str, current_admin: User = Depends(get_current_admin)):
    """Admin: Block a user"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_blocked": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User blocked successfully"}

@api_router.put("/admin/users/{user_id}/unblock")
async def admin_unblock_user(user_id: str, current_admin: User = Depends(get_current_admin)):
    """Admin: Unblock a user"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_blocked": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User unblocked successfully"}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_admin: User = Depends(get_current_admin)):
    """Admin: Delete a user"""
    result = await db.users.delete_one({"id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

@api_router.put("/admin/users/{user_id}/password")
async def admin_reset_password(user_id: str, new_password: str = Form(...), current_admin: User = Depends(get_current_admin)):
    """Admin: Reset user password"""
    hashed_password = pwd_context.hash(new_password)
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": hashed_password}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Password reset successfully"}

@api_router.put("/admin/users/{user_id}/role")
async def admin_change_role(user_id: str, is_admin: bool = Form(...), current_admin: User = Depends(get_current_admin)):
    """Admin: Change user role"""
    # Prevent self role change
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_admin": is_admin}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Role changed successfully"}

@api_router.get("/admin/stats")
async def admin_get_stats(current_admin: User = Depends(get_current_admin)):
    """Admin: Get system statistics"""
    total_users = await db.users.count_documents({})
    total_rooms = await db.rooms.count_documents({})
    total_messages = await db.messages.count_documents({})
    blocked_users = await db.users.count_documents({"is_blocked": True})
    
    return {
        "total_users": total_users,
        "total_rooms": total_rooms,
        "total_messages": total_messages,
        "blocked_users": blocked_users
    }

# ==================== WEBSOCKET ====================

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket messages if needed
            message = json.loads(data)
            
            if message.get('type') == 'ping':
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(user_id)

# ==================== FILE UPLOAD ====================

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload a file"""
    # In production, upload to S3 or similar
    # For now, save locally
    
    file_id = str(uuid.uuid4())
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else ''
    file_name = f"{file_id}.{file_ext}"
    
    # Create uploads directory
    uploads_dir = Path("/app/backend/uploads")
    uploads_dir.mkdir(exist_ok=True)
    
    file_path = uploads_dir / file_name
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    return {
        "file_url": f"/api/files/{file_name}",
        "file_name": file.filename,
        "file_size": len(content)
    }

@api_router.get("/files/{file_name}")
async def get_file(file_name: str):
    """Get uploaded file"""
    from fastapi.responses import FileResponse
    
    file_path = Path("/app/backend/uploads") / file_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        await db.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
