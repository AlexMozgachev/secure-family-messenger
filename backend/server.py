import os
import jwt
import bcrypt
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, status, Body, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import motor.motor_asyncio
from bson import ObjectId
import shutil
from fastapi import UploadFile, File

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is not set")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# MongoDB
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client.get_default_database()

# FastAPI app
app = FastAPI(title="Secure Messenger API", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# WebSocket manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)

    async def send_message(self, message: dict, room_id: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending message: {e}")

manager = ConnectionManager()

# Модели
class UserCreate(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class RoomCreate(BaseModel):
    name: str
    type: str = "group"

class MessageCreate(BaseModel):
    content: str = ""
    image_url: Optional[str] = None

# Вспомогательные функции
def convert_objectid(obj):
    """Convert ObjectId to string for JSON serialization"""
    if isinstance(obj, dict):
        return {k: convert_objectid(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectid(item) for item in obj]
    elif isinstance(obj, ObjectId):
        return str(obj)
    return obj

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    user_id = payload.get("sub")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return convert_objectid(user)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

# ==================== УСТАНОВКА ====================
@app.get("/api/install/status")
async def install_status():
    settings = await db.settings.find_one({"key": "installed"})
    if settings and settings.get("value"):
        return {"installed": True, "message": "System is already installed"}
    return {"installed": False, "message": "System not installed"}

@app.post("/api/install")
async def install_system(data: dict):
    settings = await db.settings.find_one({"key": "installed"})
    if settings and settings.get("value"):
        raise HTTPException(status_code=400, detail="Already installed")
    
    admin = {
        "id": str(uuid.uuid4()),
        "username": data.get("admin_username"),
        "password": hash_password(data.get("admin_password")),
        "display_name": data.get("admin_display_name"),
        "is_admin": True,
        "is_blocked": False,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "public_key": None,
        "avatar_url": None
    }
    await db.users.insert_one(admin)
    
    await db.settings.insert_one({"key": "installed", "value": True})
    await db.settings.insert_one({"key": "server_name", "value": data.get("server_name")})
    
    return {"message": "Installation completed"}

# ==================== АВТОРИЗАЦИЯ ====================
@app.post("/api/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"username": data.username})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token_data = {"sub": user["id"], "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "display_name": user.get("display_name"),
            "is_admin": user.get("is_admin", False),
            "avatar_url": user.get("avatar_url")
        }
    }

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "display_name": current_user.get("display_name"),
        "is_admin": current_user.get("is_admin", False)
    }

# ==================== ПОЛЬЗОВАТЕЛИ ====================
@app.get("/api/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    users = await db.users.find().to_list(100)
    return [convert_objectid({
        "id": u["id"],
        "username": u["username"],
        "display_name": u.get("display_name"),
        "is_admin": u.get("is_admin", False),
        "is_blocked": u.get("is_blocked", False),
        "created_at": u.get("created_at")
    }) for u in users]

@app.post("/api/users")
async def create_user(data: UserCreate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = await db.users.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = {
        "id": str(uuid.uuid4()),
        "username": data.username,
        "password": hash_password(data.password),
        "display_name": data.display_name or data.username,
        "is_admin": False,
        "is_blocked": False,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "public_key": None,
        "avatar_url": None
    }
    await db.users.insert_one(user)
    return {"message": "User created", "user_id": user["id"]}

# ==================== КОМНАТЫ ====================
@app.get("/api/rooms")
async def get_rooms(current_user: dict = Depends(get_current_user)):
    rooms = await db.rooms.find({"members": current_user["id"]}).to_list(100)
    return [convert_objectid({
        "id": r["id"],
        "name": r["name"],
        "type": r.get("type", "group"),
        "members": r.get("members", []),
        "created_by": r.get("created_by"),
        "created_at": r.get("created_at"),
        "last_activity": r.get("last_activity")
    }) for r in rooms]

@app.post("/api/rooms")
async def create_room(data: RoomCreate, current_user: dict = Depends(get_current_user)):
    room = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "type": data.type,
        "members": [current_user["id"]],
        "created_by": current_user["id"],
        "created_at": datetime.utcnow(),
        "last_activity": datetime.utcnow(),
        "messages": []
    }
    await db.rooms.insert_one(room)
    return convert_objectid(room)

@app.post("/api/rooms/{room_id}/members")
async def add_room_member(
    room_id: str,
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    user_id = request.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$addToSet": {"members": user_id}}
    )
    
    return {"message": "Member added successfully"}

@app.delete("/api/rooms/{room_id}/members/{user_id}")
async def remove_room_member(
    room_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.rooms.update_one(
        {"id": room_id},
        {"$pull": {"members": user_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Member not found in room")
    
    return {"message": "Member removed successfully"}

@app.delete("/api/rooms/{room_id}")
async def delete_room(room_id: str, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.rooms.delete_one({"id": room_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")
    
    return {"message": "Room deleted"}

# ==================== СООБЩЕНИЯ ====================
@app.get("/api/rooms/{room_id}/messages")
async def get_messages(room_id: str, current_user: dict = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id, "members": current_user["id"]})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return convert_objectid(room.get("messages", []))

@app.post("/api/rooms/{room_id}/messages")
async def create_message(room_id: str, data: MessageCreate, current_user: dict = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id, "members": current_user["id"]})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Получаем данные отправителя
    sender = await db.users.find_one({"id": current_user["id"]})
    
    message = {
        "id": str(uuid.uuid4()),
        "sender_id": current_user["id"],
        "sender": {
            "username": sender.get("username"),
            "display_name": sender.get("display_name")
        },
        "content": data.content,
        "image_url": data.image_url,
        "created_at": datetime.utcnow().isoformat(),
        "edited_at": None,
        "deleted": False
    }
    
    await db.rooms.update_one(
        {"id": room_id},
        {
            "$push": {"messages": message},
            "$set": {"last_activity": datetime.utcnow().isoformat()}
        }
    )
    
    # Отправляем через WebSocket
    await manager.send_message(message, room_id)
    
    return convert_objectid(message)    
    # Отправляем сообщение через WebSocket
    await manager.send_message(message, room_id)
    
    return convert_objectid(message)
# ==================== АДМИН-ПАНЕЛЬ ====================
@app.get("/api/admin/users")
async def admin_get_users(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = await db.users.find().to_list(100)
    return [convert_objectid({
        "id": u["id"],
        "username": u["username"],
        "display_name": u.get("display_name"),
        "is_admin": u.get("is_admin", False),
        "is_blocked": u.get("is_blocked", False),
        "created_at": u.get("created_at"),
        "last_login": u.get("last_login")
    }) for u in users]

@app.post("/api/admin/users")
async def admin_create_user(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = await db.users.find_one({"username": data.get("username")})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = {
        "id": str(uuid.uuid4()),
        "username": data.get("username"),
        "password": hash_password(data.get("password")),
        "display_name": data.get("display_name", data.get("username")),
        "is_admin": data.get("is_admin", False),
        "is_blocked": False,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "public_key": None,
        "avatar_url": None
    }
    await db.users.insert_one(user)
    
    return {"message": "User created", "user_id": user["id"]}

@app.get("/api/admin/stats")
async def admin_stats(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    total_users = await db.users.count_documents({})
    total_rooms = await db.rooms.count_documents({})
    blocked_users = await db.users.count_documents({"is_blocked": True})
    
    return {
        "total_users": total_users,
        "total_rooms": total_rooms,
        "total_messages": 0,
        "blocked_users": blocked_users
    }

@app.get("/api/admin/system/monitoring")
async def system_monitoring(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return {
        "cpu_usage": 14.4,
        "ram_usage": 36.8,
        "disk_usage": 23,
        "uptime": 2.5,
        "network_in": 18.0,
        "network_out": 82.1
    }

# ==================== WEBSOCKET ====================
@app.websocket("/ws/rooms/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    print(f"WebSocket connected to room {room_id}")
    
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            print(f"Received: {data}")
    except WebSocketDisconnect:
        print(f"WebSocket disconnected from room {room_id}")
        manager.disconnect(websocket, room_id)

# ==================== ЗАПУСК ====================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
# ==================== ЗАГРУЗКА ФАЙЛОВ ====================
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    import tempfile
    import shutil
    import uuid
# Оптимизация изображения (опционально, требует Pillow)
# from PIL import Image
# img = Image.open(filepath)
# img.save(filepath, optimize=True, quality=85)
    
    # Создаём папку для загрузок
    upload_dir = os.path.join(tempfile.gettempdir(), "messenger_uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Получаем расширение файла
    original_filename = file.filename
    ext = original_filename.split(".")[-1].lower() if "." in original_filename else "jpg"
    
    # Разрешаем PNG, JPG, JPEG
   # if ext not in ['png', 'jpg', 'jpeg']:
   #     raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Only PNG, JPG, JPEG allowed")
    
    # Генерируем уникальное имя
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(upload_dir, filename)
    
    # Сохраняем файл
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Формируем URL
    file_url = f"/uploads/{filename}"
    
    print(f"File uploaded: {original_filename} -> {file_url}")
    
    return {"file_url": file_url, "filename": original_filename}
