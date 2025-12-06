from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import bcrypt
import jwt
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get("JWT_SECRET", "matcha_secret_key_2025")
JWT_ALGORITHM = "HS256"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    instagram_handle: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    instagram_handle: str
    profile_picture: Optional[str] = None
    verified: bool = False
    created_at: datetime

class TeaPost(BaseModel):
    target_instagram_handle: str
    content: str

class TeaResponse(BaseModel):
    id: str
    target_instagram_handle: str
    author_id: str
    author_name: str
    author_instagram: str
    content: str
    ai_moderation_flag: Optional[str] = None
    created_at: datetime

class ProfilePictureUpdate(BaseModel):
    profile_picture: str  # base64 encoded image

# Helper Functions
def create_token(user_id: str) -> str:
    """Create JWT token"""
    payload = {"user_id": user_id}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> str:
    """Decode JWT token and return user_id"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("user_id")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    token = credentials.credentials
    user_id = decode_token(token)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

async def moderate_content(content: str) -> Optional[str]:
    """Use GPT-5.1 to check if content is inappropriate"""
    try:
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id="moderation_check",
            system_message="You are a content moderator. Analyze the text and respond with ONLY 'SAFE' if the content is appropriate, or 'UNSAFE: [reason]' if it contains hate speech, harassment, explicit content, or is severely inappropriate."
        ).with_model("openai", "gpt-5.1")
        
        message = UserMessage(text=f"Moderate this content: {content}")
        response = await chat.send_message(message)
        
        if response.startswith("UNSAFE"):
            return response
        return None
    except Exception as e:
        logging.error(f"AI moderation failed: {str(e)}")
        return None

# Auth Routes
@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserRegister):
    """Register a new user"""
    # Check if email exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if instagram handle exists
    existing_handle = await db.users.find_one({"instagram_handle": user_data.instagram_handle})
    if existing_handle:
        raise HTTPException(status_code=400, detail="Instagram handle already taken")
    
    # Hash password
    hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())
    
    # Create user
    new_user = {
        "email": user_data.email,
        "password": hashed_password.decode('utf-8'),
        "name": user_data.name,
        "instagram_handle": user_data.instagram_handle,
        "profile_picture": None,
        "verified": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(new_user)
    token = create_token(str(result.inserted_id))
    
    return {
        "message": "User registered successfully",
        "token": token,
        "user": {
            "id": str(result.inserted_id),
            "email": user_data.email,
            "name": user_data.name,
            "instagram_handle": user_data.instagram_handle,
            "verified": False
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check password
    if not bcrypt.checkpw(credentials.password.encode('utf-8'), user["password"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(str(user["_id"]))
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "instagram_handle": user["instagram_handle"],
            "profile_picture": user.get("profile_picture"),
            "verified": user.get("verified", False)
        }
    }

# User Routes
@api_router.get("/users/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"],
        instagram_handle=current_user["instagram_handle"],
        profile_picture=current_user.get("profile_picture"),
        verified=current_user.get("verified", False),
        created_at=current_user["created_at"]
    )

@api_router.patch("/users/verify")
async def verify_user(current_user = Depends(get_current_user)):
    """Verify user account (simplified - in production would need actual verification)"""
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"verified": True}}
    )
    return {"message": "User verified successfully"}

@api_router.patch("/users/profile-picture")
async def update_profile_picture(
    data: ProfilePictureUpdate,
    current_user = Depends(get_current_user)
):
    """Update user profile picture"""
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"profile_picture": data.profile_picture}}
    )
    return {"message": "Profile picture updated successfully"}

@api_router.get("/users", response_model=List[UserResponse])
async def get_all_users():
    """Get all users for home feed"""
    users = await db.users.find().to_list(1000)
    return [
        UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            instagram_handle=user["instagram_handle"],
            profile_picture=user.get("profile_picture"),
            verified=user.get("verified", False),
            created_at=user["created_at"]
        )
        for user in users
    ]

@api_router.get("/users/{instagram_handle}", response_model=dict)
async def get_user_profile(instagram_handle: str):
    """Get user profile by Instagram handle"""
    user = await db.users.find_one({"instagram_handle": instagram_handle})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all tea about this user
    tea_posts = await db.tea.find({"target_instagram_handle": instagram_handle}).sort("created_at", -1).to_list(1000)
    
    tea_list = []
    for tea in tea_posts:
        author = await db.users.find_one({"_id": ObjectId(tea["author_id"])})
        tea_list.append(TeaResponse(
            id=str(tea["_id"]),
            target_instagram_handle=tea["target_instagram_handle"],
            author_id=tea["author_id"],
            author_name=author["name"] if author else "Unknown",
            author_instagram=author["instagram_handle"] if author else "unknown",
            content=tea["content"],
            ai_moderation_flag=tea.get("ai_moderation_flag"),
            created_at=tea["created_at"]
        ))
    
    return {
        "user": UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            instagram_handle=user["instagram_handle"],
            profile_picture=user.get("profile_picture"),
            verified=user.get("verified", False),
            created_at=user["created_at"]
        ),
        "tea": tea_list
    }

# Tea/Post Routes
@api_router.post("/tea", response_model=TeaResponse)
async def post_tea(tea_data: TeaPost, current_user = Depends(get_current_user)):
    """Post tea/gossip about someone (only verified users)"""
    if not current_user.get("verified", False):
        raise HTTPException(status_code=403, detail="Only verified users can post tea")
    
    # Check if target user exists
    target_user = await db.users.find_one({"instagram_handle": tea_data.target_instagram_handle})
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    # AI content moderation
    moderation_flag = await moderate_content(tea_data.content)
    
    # Create tea post
    new_tea = {
        "target_instagram_handle": tea_data.target_instagram_handle,
        "author_id": str(current_user["_id"]),
        "content": tea_data.content,
        "ai_moderation_flag": moderation_flag,
        "created_at": datetime.utcnow()
    }
    
    result = await db.tea.insert_one(new_tea)
    
    return TeaResponse(
        id=str(result.inserted_id),
        target_instagram_handle=tea_data.target_instagram_handle,
        author_id=str(current_user["_id"]),
        author_name=current_user["name"],
        author_instagram=current_user["instagram_handle"],
        content=tea_data.content,
        ai_moderation_flag=moderation_flag,
        created_at=new_tea["created_at"]
    )

@api_router.get("/tea/{instagram_handle}", response_model=List[TeaResponse])
async def get_tea_for_user(instagram_handle: str):
    """Get all tea for a specific user"""
    tea_posts = await db.tea.find({"target_instagram_handle": instagram_handle}).sort("created_at", -1).to_list(1000)
    
    tea_list = []
    for tea in tea_posts:
        author = await db.users.find_one({"_id": ObjectId(tea["author_id"])})
        tea_list.append(TeaResponse(
            id=str(tea["_id"]),
            target_instagram_handle=tea["target_instagram_handle"],
            author_id=tea["author_id"],
            author_name=author["name"] if author else "Unknown",
            author_instagram=author["instagram_handle"] if author else "unknown",
            content=tea["content"],
            ai_moderation_flag=tea.get("ai_moderation_flag"),
            created_at=tea["created_at"]
        ))
    
    return tea_list

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
