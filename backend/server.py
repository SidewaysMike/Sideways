from fastapi import FastAPI, APIRouter, HTTPException, Request, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import random
import json
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Casino Slot Game API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enums
class SlotType(str, Enum):
    CLASSIC_3_REEL = "classic_3_reel"
    VIDEO_5_REEL = "video_5_reel"
    BONUS_SLOTS = "bonus_slots"

class GameEventType(str, Enum):
    SPIN = "spin"
    WIN = "win"
    BONUS = "bonus"
    FREE_SPIN = "free_spin"
    DAILY_BONUS = "daily_bonus"

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    credits: float = 1000.0  # Starting credits
    total_winnings: float = 0.0
    games_played: int = 0
    last_daily_bonus: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    level: int = 1
    vip_status: bool = False

class GameSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    slot_type: SlotType
    bet_amount: float
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    total_spins: int = 0
    total_winnings: float = 0.0
    bonus_rounds: int = 0
    free_spins_used: int = 0

class SpinResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    slot_type: SlotType
    bet_amount: float
    reels: List[str]  # The symbols on each reel
    payout: float
    is_win: bool
    win_type: Optional[str] = None  # "small", "medium", "big", "jackpot"
    multiplier: float = 1.0
    bonus_triggered: bool = False
    free_spins_awarded: int = 0
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DailyBonusRequest(BaseModel):
    user_id: str

class SpinRequest(BaseModel):
    user_id: str
    slot_type: SlotType
    bet_amount: float

class UserCreate(BaseModel):
    username: str

# Slot Machine Configuration
SLOT_SYMBOLS = {
    "classic_3_reel": ["🍒", "🍋", "🍊", "⭐", "🔔", "💎", "7️⃣"],
    "video_5_reel": ["🍒", "🍋", "🍊", "⭐", "🔔", "💎", "👑", "💰", "🎰", "🍀"],
    "bonus_slots": ["🍒", "🍋", "🍊", "⭐", "🔔", "💎", "👑", "💰", "🎰", "🍀", "🎁", "🌟"]
}

PAYTABLES = {
    "classic_3_reel": {
        "💎💎💎": 1000,  # Diamond jackpot
        "7️⃣7️⃣7️⃣": 500,   # Lucky sevens
        "⭐⭐⭐": 100,    # Three stars
        "🔔🔔🔔": 50,     # Three bells
        "🍒🍒🍒": 25,     # Three cherries
        "💎💎": 20,       # Two diamonds
        "7️⃣7️⃣": 15,      # Two sevens
        "⭐⭐": 10,       # Two stars
        "🍒🍒": 5,        # Two cherries
        "🍒": 2           # Single cherry
    },
    "video_5_reel": {
        "👑👑👑👑👑": 5000,  # Royal flush
        "💎💎💎💎💎": 2500,  # Diamond line
        "💰💰💰💰💰": 1000,  # Money bags
        "🎰🎰🎰🎰🎰": 500,   # Slot machines
        "👑👑👑👑": 200,     # Four crowns
        "💎💎💎💎": 150,     # Four diamonds
        "👑👑👑": 75,       # Three crowns
        "💎💎💎": 50,       # Three diamonds
        "💰💰💰": 25,       # Three money bags
        "🍀🍀🍀": 15,       # Three clovers
        "⭐⭐⭐": 10        # Three stars
    }
}

# Game Logic Functions
def generate_reels(slot_type: SlotType) -> List[str]:
    """Generate random reel results with house edge"""
    symbols = SLOT_SYMBOLS[slot_type.value]
    
    if slot_type == SlotType.CLASSIC_3_REEL:
        # Weighted selection for house edge (lower chance for high-value symbols)
        weights = [15, 12, 12, 8, 10, 3, 2]  # Cherry, Lemon, Orange, Star, Bell, Diamond, Seven
        return [random.choices(symbols, weights=weights)[0] for _ in range(3)]
    
    elif slot_type == SlotType.VIDEO_5_REEL:
        # More complex weighting for 5-reel
        weights = [12, 10, 10, 8, 8, 5, 2, 3, 4, 6]  # Weighted for house edge
        return [random.choices(symbols, weights=weights)[0] for _ in range(5)]
    
    else:  # bonus_slots
        weights = [10, 8, 8, 6, 6, 4, 2, 3, 4, 5, 2, 1]  # Even more variance
        return [random.choices(symbols, weights=weights)[0] for _ in range(5)]

def calculate_payout(reels: List[str], bet_amount: float, slot_type: SlotType) -> tuple[float, str, float, bool, int]:
    """Calculate payout, win type, multiplier, bonus triggered, and free spins"""
    paytable = PAYTABLES.get(slot_type.value, {})
    payout = 0.0
    win_type = None
    multiplier = 1.0
    bonus_triggered = False
    free_spins = 0
    
    # Check for exact matches in paytable
    reel_string = ''.join(reels)
    if reel_string in paytable:
        payout = paytable[reel_string] * bet_amount * multiplier
        
        # Determine win type based on payout amount
        if payout >= bet_amount * 100:
            win_type = "jackpot"
            multiplier = 1.5  # Jackpot bonus
        elif payout >= bet_amount * 50:
            win_type = "big"
        elif payout >= bet_amount * 10:
            win_type = "medium"
        else:
            win_type = "small"
    
    # Check for partial matches (works for both 3 and 5 reel)
    else:
        # Count symbol occurrences
        symbol_counts = {}
        for symbol in reels:
            symbol_counts[symbol] = symbol_counts.get(symbol, 0) + 1
        
        # Check for multiple occurrences
        for symbol, count in symbol_counts.items():
            if count >= 2:
                partial_key = symbol * count
                if partial_key in paytable:
                    payout = max(payout, paytable[partial_key] * bet_amount)
                    win_type = "small" if count == 2 else "medium"
    
    # Bonus features for bonus slots
    if slot_type == SlotType.BONUS_SLOTS:
        # Check for bonus symbols
        if "🎁" in reels:
            bonus_count = reels.count("🎁")
            if bonus_count >= 3:
                bonus_triggered = True
                free_spins = 10 + (bonus_count - 3) * 5
                payout *= 2  # Double payout for bonus
        
        # Check for scatter symbols (stars)
        if "🌟" in reels:
            scatter_count = reels.count("🌟")
            if scatter_count >= 2:
                free_spins += scatter_count * 2
    
    # Apply multiplier
    payout *= multiplier
    
    return payout, win_type, multiplier, bonus_triggered, free_spins

# API Routes
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    """Create a new user"""
    try:
        # Check if username already exists
        existing_user = await db.users.find_one({"username": user_data.username})
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        user = User(username=user_data.username)
        user_dict = user.dict()
        
        # Convert datetime to ISO string for MongoDB
        user_dict["created_at"] = user_dict["created_at"].isoformat()
        
        await db.users.insert_one(user_dict)
        return user
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Convert ISO string back to datetime
        if "created_at" in user and isinstance(user["created_at"], str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
        if "last_daily_bonus" in user and isinstance(user["last_daily_bonus"], str):
            user["last_daily_bonus"] = datetime.fromisoformat(user["last_daily_bonus"])
        
        return User(**user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user")

@api_router.post("/daily-bonus")
async def claim_daily_bonus(request: DailyBonusRequest):
    """Claim daily bonus credits"""
    try:
        user = await db.users.find_one({"id": request.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        now = datetime.now(timezone.utc)
        last_bonus = None
        
        if user.get("last_daily_bonus"):
            if isinstance(user["last_daily_bonus"], str):
                last_bonus = datetime.fromisoformat(user["last_daily_bonus"])
            else:
                last_bonus = user["last_daily_bonus"]
        
        # Check if 24 hours have passed since last bonus
        if last_bonus and (now - last_bonus).total_seconds() < 86400:  # 24 hours
            remaining_time = 86400 - (now - last_bonus).total_seconds()
            hours_remaining = int(remaining_time // 3600)
            minutes_remaining = int((remaining_time % 3600) // 60)
            raise HTTPException(
                status_code=400, 
                detail=f"Daily bonus already claimed. Next bonus in {hours_remaining}h {minutes_remaining}m"
            )
        
        # Calculate bonus amount (base 100 + level bonus)
        bonus_amount = 100 + (user.get("level", 1) * 25)
        if user.get("vip_status", False):
            bonus_amount *= 2  # VIP gets double bonus
        
        # Update user with bonus
        await db.users.update_one(
            {"id": request.user_id},
            {
                "$inc": {"credits": bonus_amount},
                "$set": {"last_daily_bonus": now.isoformat()}
            }
        )
        
        return {
            "bonus_amount": bonus_amount,
            "new_balance": user["credits"] + bonus_amount,
            "next_bonus_in_hours": 24
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error claiming daily bonus: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to claim daily bonus")

@api_router.post("/spin", response_model=SpinResult)
async def spin_slot(request: SpinRequest):
    """Spin the slot machine"""
    try:
        # Get user
        user = await db.users.find_one({"id": request.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user has enough credits
        if user["credits"] < request.bet_amount:
            raise HTTPException(status_code=400, detail="Insufficient credits")
        
        # Generate spin result
        reels = generate_reels(request.slot_type)
        payout, win_type, multiplier, bonus_triggered, free_spins = calculate_payout(
            reels, request.bet_amount, request.slot_type
        )
        
        # Create spin result
        spin_result = SpinResult(
            user_id=request.user_id,
            session_id="",  # Will be set by frontend for session tracking
            slot_type=request.slot_type,
            bet_amount=request.bet_amount,
            reels=reels,
            payout=payout,
            is_win=payout > 0,
            win_type=win_type,
            multiplier=multiplier,
            bonus_triggered=bonus_triggered,
            free_spins_awarded=free_spins
        )
        
        # Update user balance and stats
        new_credits = user["credits"] - request.bet_amount + payout
        new_total_winnings = user.get("total_winnings", 0) + payout
        new_games_played = user.get("games_played", 0) + 1
        
        # Level up logic (every 100 games)
        new_level = (new_games_played // 100) + 1
        vip_status = new_level >= 5  # VIP at level 5
        
        await db.users.update_one(
            {"id": request.user_id},
            {
                "$set": {
                    "credits": new_credits,
                    "total_winnings": new_total_winnings,
                    "games_played": new_games_played,
                    "level": new_level,
                    "vip_status": vip_status
                }
            }
        )
        
        # Store spin result in database
        spin_dict = spin_result.dict()
        spin_dict["timestamp"] = spin_dict["timestamp"].isoformat()
        await db.spin_results.insert_one(spin_dict)
        
        return spin_result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error spinning slot: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to spin slot")

@api_router.get("/user-stats/{user_id}")
async def get_user_stats(user_id: str):
    """Get comprehensive user statistics"""
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get recent spins
        recent_spins = await db.spin_results.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(10).to_list(length=None)
        
        # Calculate win rate
        total_spins = await db.spin_results.count_documents({"user_id": user_id})
        wins = await db.spin_results.count_documents({"user_id": user_id, "is_win": True})
        win_rate = (wins / total_spins * 100) if total_spins > 0 else 0
        
        # Calculate next daily bonus time
        next_bonus_available = None
        if user.get("last_daily_bonus"):
            last_bonus = datetime.fromisoformat(user["last_daily_bonus"]) if isinstance(user["last_daily_bonus"], str) else user["last_daily_bonus"]
            next_bonus_available = last_bonus + timedelta(hours=24)
        
        return {
            "user": {
                "id": user["id"],
                "username": user["username"],
                "credits": user["credits"],
                "level": user.get("level", 1),
                "vip_status": user.get("vip_status", False),
                "total_winnings": user.get("total_winnings", 0),
                "games_played": user.get("games_played", 0)
            },
            "stats": {
                "total_spins": total_spins,
                "total_wins": wins,
                "win_rate": round(win_rate, 2),
                "net_winnings": user.get("total_winnings", 0) - (total_spins * 10)  # Assuming avg bet of 10
            },
            "recent_spins": recent_spins,
            "next_daily_bonus": next_bonus_available.isoformat() if next_bonus_available else None,
            "can_claim_bonus": not next_bonus_available or datetime.now(timezone.utc) >= next_bonus_available
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user stats")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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
