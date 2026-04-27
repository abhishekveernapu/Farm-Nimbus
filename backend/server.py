from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from weather_service import WeatherService
from ai_recommendation_engine import AIRecommendationEngine
from notification_service import NotificationService
from translation_service import TranslationService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection — safe access with defaults
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'farm_nimbus')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'change-this-to-a-random-secret-key-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Expert secret key
EXPERT_SECRET_KEY = os.environ.get('EXPERT_SECRET_KEY', 'change-this-expert-secret-key')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer(auto_error=False)

# Initialize services
weather_service = WeatherService()
ai_engine = AIRecommendationEngine()
notification_service = NotificationService()
translation_service = TranslationService()

# Supported crop types (from AI engine)
SUPPORTED_CROPS = ai_engine.get_supported_crops()


# ============= LIFESPAN (replaces deprecated on_event) =============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle"""
    # Startup — create database indexes
    logger.info("Creating database indexes...")
    await db.users.create_index("id", unique=True)
    await db.users.create_index("phone_number", sparse=True)
    await db.users.create_index([("name", 1), ("location", 1)])
    await db.recommendations.create_index([("user_id", 1), ("timestamp", -1)])
    await db.notifications.create_index([("user_id", 1), ("timestamp", -1)])
    await db.auto_alerts.create_index([("user_id", 1), ("alert_date", 1)])
    logger.info("Database indexes created successfully")

    # Start background weather alert checker
    task = asyncio.create_task(periodic_weather_check())

    yield

    # Shutdown
    task.cancel()
    client.close()
    logger.info("Database connection closed")


# Create the main app with lifespan
app = FastAPI(lifespan=lifespan)

# Add CORS middleware BEFORE routes
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ============= AUTH HELPERS =============

def create_access_token(data: dict) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get the current authenticated user"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = verify_token(credentials.credentials)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def get_current_expert(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to verify expert JWT token"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Expert authentication required")

    payload = verify_token(credentials.credentials)
    role = payload.get("role")
    if role != "expert":
        raise HTTPException(status_code=403, detail="Expert access required")

    return payload


# ============= MODELS =============

class UserCreate(BaseModel):
    name: str
    location: str
    crop_type: str
    language: str = 'en'
    phone_number: Optional[str] = None  # For SMS/Voice alerts
    sms_enabled: bool = False
    voice_enabled: bool = False

    @field_validator('crop_type')
    @classmethod
    def validate_crop_type(cls, v):
        """Validate and normalize crop type against supported list"""
        crop_map = {name.lower(): name for name in SUPPORTED_CROPS}
        normalized = crop_map.get(v.lower().strip())
        if not normalized:
            raise ValueError(
                f"Unsupported crop type '{v}'. Supported crops: {', '.join(SUPPORTED_CROPS)}"
            )
        return normalized

    @field_validator('name', 'location')
    @classmethod
    def validate_not_empty(cls, v):
        """Ensure name and location are not empty or just whitespace"""
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field cannot be empty")
        if len(stripped) > 200:
            raise ValueError("Field must be 200 characters or less")
        return stripped

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: str
    crop_type: str
    language: str = 'en'
    phone_number: Optional[str] = None
    sms_enabled: bool = False
    voice_enabled: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    crop_type: Optional[str] = None
    language: Optional[str] = None
    phone_number: Optional[str] = None
    sms_enabled: Optional[bool] = None
    voice_enabled: Optional[bool] = None

    @field_validator('crop_type')
    @classmethod
    def validate_crop_type(cls, v):
        if v is None:
            return v
        crop_map = {name.lower(): name for name in SUPPORTED_CROPS}
        normalized = crop_map.get(v.lower().strip())
        if not normalized:
            raise ValueError(
                f"Unsupported crop type '{v}'. Supported crops: {', '.join(SUPPORTED_CROPS)}"
            )
        return normalized

class LoginRequest(BaseModel):
    """Login by phone number OR by name+location"""
    phone_number: Optional[str] = None
    name: Optional[str] = None
    location: Optional[str] = None

class ExpertLoginRequest(BaseModel):
    """Expert login with secret key"""
    secret_key: str

class LoginResponse(BaseModel):
    token: str
    user: dict

class SendSMSRequest(BaseModel):
    user_id: str
    message_type: str  # 'weather', 'alert', 'recommendation', 'custom'
    custom_message: Optional[str] = None

class SendVoiceRequest(BaseModel):
    user_id: str
    alert_type: str
    message: str

class ExpertAlertRequest(BaseModel):
    message: str
    target: str  # 'all' or a specific user_id

class WeatherResponse(BaseModel):
    current: dict
    forecast: List[dict]

class RecommendationResponse(BaseModel):
    user: dict
    weather: dict
    recommendations: List[dict]
    alerts: List[dict]

class CropInfo(BaseModel):
    name: str
    optimal_temp_min: float
    optimal_temp_max: float
    water_requirement: str
    growth_stages: List[str]


# ============= PUBLIC ROUTES (no auth required) =============

@api_router.get("/")
async def root():
    return {
        "message": "Farm-Nimbus AI Weather Intelligence API",
        "version": "1.0.0",
        "status": "operational"
    }

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.get("/crops")
async def get_crops():
    """Get list of supported crops with their information (public)"""
    crops_data = ai_engine.crop_rules
    
    crops = []
    for crop_name, crop_info in crops_data.items():
        crops.append({
            "name": crop_name,
            "optimal_temp_min": crop_info['optimal_temp'][0],
            "optimal_temp_max": crop_info['optimal_temp'][1],
            "optimal_humidity_min": crop_info['optimal_humidity'][0],
            "optimal_humidity_max": crop_info['optimal_humidity'][1],
            "water_requirement": crop_info['water_requirement'],
            "rain_tolerance": crop_info['rain_tolerance'],
            "growth_stages": crop_info['growth_stages']
        })
    
    return {"crops": crops, "count": len(crops)}


# ============= AUTH ROUTES =============

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    """Register a new farmer user"""
    try:
        user = User(**user_data.model_dump())
        user_dict = user.model_dump()
        
        # Check if user with same name and location already exists
        existing = await db.users.find_one({
            "name": user_dict["name"],
            "location": user_dict["location"]
        }, {"_id": 0})
        
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")
        
        await db.users.insert_one(user_dict)
        return user
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Login and get a JWT token — server-side user lookup"""
    found_user = None
    
    if login_data.phone_number:
        found_user = await db.users.find_one(
            {"phone_number": login_data.phone_number}, {"_id": 0}
        )
    elif login_data.name and login_data.location:
        # Case-insensitive lookup using regex
        found_user = await db.users.find_one({
            "name": {"$regex": f"^{login_data.name.strip()}$", "$options": "i"},
            "location": {"$regex": f"^{login_data.location.strip()}$", "$options": "i"}
        }, {"_id": 0})
    else:
        raise HTTPException(
            status_code=400, 
            detail="Provide either phone_number OR both name and location"
        )
    
    if not found_user:
        raise HTTPException(status_code=404, detail="User not found. Please check your details or register.")
    
    # Create JWT token
    token = create_access_token({"user_id": found_user["id"]})
    
    return {"token": token, "user": found_user}


# ============= PROTECTED USER ROUTES =============

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get user profile by ID"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    # Only allow users to update their own profile
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot update another user's profile")
    
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    return updated_user

@api_router.get("/users")
async def list_users(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """List all users (for admin/expert dashboard) — requires auth"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    verify_token(credentials.credentials) # Just ensure token is valid
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return {"users": users, "count": len(users)}


# ============= WEATHER ROUTES =============

@api_router.get("/weather/{location}")
async def get_weather(location: str, current_user: dict = Depends(get_current_user)):
    """Get current weather and forecast for a location"""
    try:
        current_weather = weather_service.get_current_weather(location)
        forecast = weather_service.get_forecast(location)
        
        if not current_weather:
            raise HTTPException(status_code=404, detail="Weather data not available")
        
        return {
            "current": current_weather,
            "forecast": forecast or []
        }
    except Exception as e:
        logging.error(f"Error fetching weather: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= RECOMMENDATION ROUTES =============

@api_router.get("/recommendations/{user_id}")
async def get_recommendations(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get personalized crop recommendations for a user"""
    try:
        # Get user profile
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get weather data
        current_weather = weather_service.get_current_weather(user['location'])
        forecast = weather_service.get_forecast(user['location'])
        
        if not current_weather:
            raise HTTPException(status_code=404, detail="Weather data not available")
        
        # Generate recommendations
        recommendations = ai_engine.generate_recommendations(
            current_weather, 
            user['crop_type'],
            user.get('language', 'en')
        )
        
        # Generate alerts
        alerts = ai_engine.get_alerts(
            forecast or [],
            user['crop_type'],
            user.get('language', 'en')
        )
        
        # Only store recommendation if one hasn't been stored in the last hour
        one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        recent = await db.recommendations.find_one({
            'user_id': user_id,
            'timestamp': {'$gte': one_hour_ago}
        })
        
        if not recent:
            recommendation_doc = {
                'user_id': user_id,
                'recommendations': recommendations,
                'alerts': alerts,
                'weather': current_weather,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            await db.recommendations.insert_one(recommendation_doc)
        
        return {
            "user": user,
            "weather": current_weather,
            "forecast": forecast[:3] if forecast else [],
            "recommendations": recommendations,
            "alerts": alerts
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= ALERTS ROUTES =============

@api_router.get("/alerts/{user_id}")
async def get_user_alerts(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get weather alerts for a user"""
    try:
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        forecast = weather_service.get_forecast(user['location'])
        alerts = ai_engine.get_alerts(
            forecast or [],
            user['crop_type'],
            user.get('language', 'en')
        )
        
        return {"alerts": alerts, "count": len(alerts)}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= EXPERT DASHBOARD ROUTES =============

@api_router.get("/dashboard/expert")
async def get_expert_dashboard(current_expert: dict = Depends(get_current_expert)):
    """Get aggregated data for expert monitoring dashboard"""
    try:
        # Get all users
        users = await db.users.find({}, {"_id": 0}).to_list(1000)
        
        # Get recent recommendations
        recent_recommendations = await db.recommendations.find(
            {}, {"_id": 0}
        ).sort("timestamp", -1).limit(50).to_list(50)
        
        # Aggregate statistics
        crop_distribution = {}
        location_distribution = {}
        
        for user in users:
            crop = user.get('crop_type', 'Unknown')
            location = user.get('location', 'Unknown')
            
            crop_distribution[crop] = crop_distribution.get(crop, 0) + 1
            location_distribution[location] = location_distribution.get(location, 0) + 1
        
        return {
            "total_users": len(users),
            "crop_distribution": crop_distribution,
            "location_distribution": location_distribution,
            "recent_recommendations": recent_recommendations[:10],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logging.error(f"Error fetching expert dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= STATISTICS ROUTES =============

@api_router.get("/stats")
async def get_statistics(current_user: dict = Depends(get_current_user)):
    """Get overall platform statistics"""
    try:
        total_users = await db.users.count_documents({})
        total_recommendations = await db.recommendations.count_documents({})
        
        return {
            "total_users": total_users,
            "total_recommendations": total_recommendations,
            "supported_crops": len(ai_engine.crop_rules),
            "supported_languages": 5,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logging.error(f"Error fetching statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= NOTIFICATION ROUTES =============

@api_router.get("/notifications/status")
async def get_notification_status(current_user: dict = Depends(get_current_user)):
    """Get SMS/Voice notification service status"""
    return notification_service.get_service_status()

@api_router.post("/notifications/sms/send")
async def send_sms_notification(request: SendSMSRequest, current_user: dict = Depends(get_current_user)):
    """Send SMS notification to a user"""
    try:
        # Get user
        user = await db.users.find_one({"id": request.user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.get('phone_number'):
            raise HTTPException(status_code=400, detail="User has no phone number registered")
        
        if not user.get('sms_enabled', False):
            raise HTTPException(status_code=400, detail="SMS notifications not enabled for this user")
        
        # Determine message type and send
        if request.message_type == 'weather':
            # Get weather and recommendations
            weather = weather_service.get_current_weather(user['location'])
            recommendations = ai_engine.generate_recommendations(
                weather, user['crop_type'], user.get('language', 'en')
            )
            result = notification_service.send_daily_weather_sms(
                user['phone_number'], user['name'], weather, recommendations
            )
        
        elif request.message_type == 'alert':
            # Get alerts
            forecast = weather_service.get_forecast(user['location'])
            alerts = ai_engine.get_alerts(
                forecast or [], user['crop_type'], user.get('language', 'en')
            )
            result = notification_service.send_weather_alert_sms(
                user['phone_number'], user['name'], user['crop_type'], alerts
            )
        
        elif request.message_type == 'custom' and request.custom_message:
            result = notification_service.send_sms(
                user['phone_number'], request.custom_message
            )
        
        else:
            raise HTTPException(status_code=400, detail="Invalid message type or missing custom message")
        
        # Log notification
        await db.notifications.insert_one({
            'user_id': user['id'],
            'type': 'sms',
            'message_type': request.message_type,
            'status': result.get('success', False),
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error sending SMS: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/notifications/voice/send")
async def send_voice_notification(request: SendVoiceRequest, current_user: dict = Depends(get_current_user)):
    """Send voice call notification to a user"""
    try:
        # Get user
        user = await db.users.find_one({"id": request.user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.get('phone_number'):
            raise HTTPException(status_code=400, detail="User has no phone number registered")
        
        if not user.get('voice_enabled', False):
            raise HTTPException(status_code=400, detail="Voice notifications not enabled for this user")
        
        # Send voice call
        result = notification_service.send_critical_voice_alert(
            user['phone_number'], user['name'], request.alert_type, request.message
        )
        
        # Log notification
        await db.notifications.insert_one({
            'user_id': user['id'],
            'type': 'voice',
            'alert_type': request.alert_type,
            'status': result.get('success', False),
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error sending voice call: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/notifications/auto-alert/{user_id}")
async def send_auto_alerts(user_id: str, current_user: dict = Depends(get_current_user)):
    """Automatically send SMS/Voice alerts based on weather conditions"""
    try:
        # Get user
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.get('phone_number'):
            return {"message": "User has no phone number. Alerts not sent."}
        
        # Get weather and alerts
        forecast = weather_service.get_forecast(user['location'])
        alerts = ai_engine.get_alerts(
            forecast or [], user['crop_type'], user.get('language', 'en')
        )
        
        results = {
            'sms_sent': False,
            'voice_sent': False,
            'alerts_count': len(alerts)
        }
        
        if not alerts:
            return {**results, 'message': 'No alerts to send'}
        
        # Send SMS if enabled
        if user.get('sms_enabled', False):
            sms_result = notification_service.send_weather_alert_sms(
                user['phone_number'], user['name'], user['crop_type'], alerts
            )
            results['sms_sent'] = sms_result.get('success', False)
            results['sms_status'] = sms_result
        
        # Send voice call for high severity alerts if enabled
        high_severity_alerts = [a for a in alerts if a.get('severity') == 'high']
        if high_severity_alerts and user.get('voice_enabled', False):
            first_alert = high_severity_alerts[0]
            voice_result = notification_service.send_critical_voice_alert(
                user['phone_number'], user['name'], 
                first_alert.get('type', 'Weather Alert'),
                first_alert.get('message', 'Check weather conditions')
            )
            results['voice_sent'] = voice_result.get('success', False)
            results['voice_status'] = voice_result
        
        return results
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error sending auto alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/notifications/history/{user_id}")
async def get_notification_history(user_id: str, limit: int = 50, current_user: dict = Depends(get_current_user)):
    """Get notification history for a user"""
    try:
        notifications = await db.notifications.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return {
            "user_id": user_id,
            "notifications": notifications,
            "count": len(notifications)
        }
    except Exception as e:
        logging.error(f"Error fetching notification history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= BACKGROUND WEATHER ALERT TASK =============

async def periodic_weather_check():
    """Background task: check weather every 6 hours and auto-send alerts"""
    INTERVAL_SECONDS = 6 * 60 * 60  # 6 hours
    await asyncio.sleep(60)  # Wait 60s after startup before first check
    while True:
        try:
            logger.info("Running periodic weather alert check...")
            result = await run_auto_weather_check()
            logger.info(f"Weather check complete: {result}")
        except asyncio.CancelledError:
            logger.info("Periodic weather check cancelled")
            break
        except Exception as e:
            logger.error(f"Error in periodic weather check: {e}")
        await asyncio.sleep(INTERVAL_SECONDS)


async def run_auto_weather_check() -> dict:
    """Check all farmers for severe weather and auto-send SMS alerts"""
    users = await db.users.find(
        {"sms_enabled": True, "phone_number": {"$exists": True, "$ne": ""}},
        {"_id": 0}
    ).to_list(1000)

    alerts_sent = 0
    farmers_checked = 0
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    for user in users:
        farmers_checked += 1
        try:
            forecast = weather_service.get_forecast(user['location'])
            severe = ai_engine.detect_severe_weather(forecast or [])

            if not severe:
                continue

            # Check if we already sent an alert today for this user
            existing = await db.auto_alerts.find_one({
                "user_id": user["id"],
                "alert_date": today
            })
            if existing:
                continue

            # Build message from severe events
            msg = f"⚠️ Farm-Nimbus URGENT for {user['name']}!\n\n"
            for evt in severe[:2]:
                msg += f"{evt['message']}\n\n"
            msg += "Stay safe. Check app for details."

            result = notification_service.send_sms(user['phone_number'], msg)

            if result.get('success'):
                alerts_sent += 1
                await db.auto_alerts.insert_one({
                    "user_id": user["id"],
                    "alert_date": today,
                    "events": severe,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

        except Exception as e:
            logger.error(f"Auto-alert error for user {user.get('id')}: {e}")

    return {"farmers_checked": farmers_checked, "alerts_sent": alerts_sent}


# (get_current_expert is defined in AUTH HELPERS above)


# ============= TRANSLATION ROUTES (public) =============

@api_router.get("/translations/{lang}")
async def get_translations(lang: str):
    """Get all translations for a language"""
    data = translation_service.get_all(lang)
    if not data:
        raise HTTPException(status_code=404, detail=f"Language '{lang}' not found")
    return data


@api_router.get("/translations/{lang}/{key:path}")
async def get_translation_key(lang: str, key: str):
    """Get a specific translation key"""
    value = translation_service.get_key(lang, key)
    return {"key": key, "value": value, "language": lang}


# ============= EXPERT AUTH ROUTE =============

@api_router.post("/auth/expert-login")
async def expert_login(request: ExpertLoginRequest):
    """Expert login with secret key — no user registration needed"""
    if request.secret_key != EXPERT_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Invalid expert secret key")

    token = create_access_token({"role": "expert", "user_id": "expert"})
    return {"token": token, "role": "expert"}


# ============= EXPERT ALERT ROUTES =============

@api_router.post("/notifications/expert/send-alert")
async def expert_send_alert(
    request: ExpertAlertRequest,
    expert: dict = Depends(get_current_expert)
):
    """Send custom SMS alert from expert to one or all farmers"""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    results = {"success": True, "sent_count": 0, "failed_count": 0, "details": []}

    if request.target == "all":
        users = await db.users.find(
            {"sms_enabled": True, "phone_number": {"$exists": True, "$ne": ""}},
            {"_id": 0}
        ).to_list(1000)
    else:
        user = await db.users.find_one({"id": request.target}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not user.get("phone_number"):
            raise HTTPException(status_code=400, detail="User has no phone number")
        users = [user]

    for user in users:
        msg = f"📢 Farm-Nimbus Expert Alert for {user['name']}:\n\n{request.message}"
        sms_result = notification_service.send_sms(user['phone_number'], msg)

        if sms_result.get('success'):
            results["sent_count"] += 1
        else:
            results["failed_count"] += 1

        results["details"].append({
            "user_id": user["id"],
            "name": user["name"],
            "success": sms_result.get("success", False)
        })

        # Log notification
        await db.notifications.insert_one({
            "user_id": user["id"],
            "type": "expert_sms",
            "message": request.message[:200],
            "status": sms_result.get("success", False),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    return results


@api_router.post("/alerts/auto-check")
async def manual_auto_check(expert: dict = Depends(get_current_expert)):
    """Manually trigger automated weather alert check (expert only)"""
    try:
        result = await run_auto_weather_check()
        return result
    except Exception as e:
        logging.error(f"Manual auto-check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Include the router in the main app
app.include_router(api_router)
