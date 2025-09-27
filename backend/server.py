from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    subscription_tier: str = "free"  # free, premium
    usage_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    name: str

class StudyGoal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subject: str
    target_date: str
    study_hours_per_day: float
    difficulty_level: str  # beginner, intermediate, advanced
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudyGoalCreate(BaseModel):
    subject: str
    target_date: str
    study_hours_per_day: float
    difficulty_level: str
    description: Optional[str] = None

class StudyPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    goal_id: str
    plan_content: str
    weekly_schedule: dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudySession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    goal_id: str
    date: str
    duration_minutes: int
    completed: bool = False
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudySessionCreate(BaseModel):
    goal_id: str
    date: str
    duration_minutes: int
    completed: bool = False
    notes: Optional[str] = None

# Helper functions
def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

async def check_usage_limit(user_id: str):
    """Check if user has exceeded their usage limit"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["subscription_tier"] == "free" and user["usage_count"] >= 5:
        raise HTTPException(
            status_code=429, 
            detail="Free tier limit reached. Upgrade to premium for unlimited access."
        )
    
    return user

async def increment_usage(user_id: str):
    """Increment user's usage count"""
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"usage_count": 1}}
    )

# API Routes
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        return User(**existing_user)
    
    user = User(**user_data.dict())
    user_dict = prepare_for_mongo(user.dict())
    await db.users.insert_one(user_dict)
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.post("/study-goals", response_model=StudyGoal)
async def create_study_goal(goal_data: StudyGoalCreate, user_id: str):
    goal = StudyGoal(user_id=user_id, **goal_data.dict())
    goal_dict = prepare_for_mongo(goal.dict())
    await db.study_goals.insert_one(goal_dict)
    return goal

@api_router.get("/study-goals/{user_id}", response_model=List[StudyGoal])
async def get_user_study_goals(user_id: str):
    goals = await db.study_goals.find({"user_id": user_id}).to_list(100)
    return [StudyGoal(**goal) for goal in goals]

@api_router.post("/generate-study-plan/{goal_id}")
async def generate_study_plan(goal_id: str, user_id: str):
    user = await check_usage_limit(user_id)
    
    # Get the study goal
    goal = await db.study_goals.find_one({"id": goal_id, "user_id": user_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Study goal not found")
    
    # Check if plan already exists
    existing_plan = await db.study_plans.find_one({"goal_id": goal_id, "user_id": user_id})
    if existing_plan:
        return {"plan": existing_plan["plan_content"], "schedule": existing_plan["weekly_schedule"]}
    
    try:
        # Initialize AI chat
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"study_plan_{goal_id}",
            system_message="You are an expert study planner. Create detailed, personalized study plans that help students achieve their academic goals efficiently."
        ).with_model("openai", "gpt-4o-mini")
        
        # Create prompt for AI
        prompt = f"""
        Create a comprehensive study plan for the following goal:
        
        Subject: {goal['subject']}
        Target Date: {goal['target_date']}
        Daily Study Hours: {goal['study_hours_per_day']} hours
        Difficulty Level: {goal['difficulty_level']}
        Description: {goal.get('description', 'No additional description')}
        
        Please provide:
        1. A detailed study plan with weekly breakdown
        2. Daily tasks and milestones
        3. Recommended resources and study techniques
        4. Progress checkpoints
        
        Format the response as a detailed study guide that a student can follow step by step.
        """
        
        user_message = UserMessage(text=prompt)
        plan_content = await chat.send_message(user_message)
        
        # Create weekly schedule structure
        weekly_schedule = {
            "monday": f"Study {goal['subject']} - {goal['study_hours_per_day']} hours",
            "tuesday": f"Study {goal['subject']} - {goal['study_hours_per_day']} hours",
            "wednesday": f"Study {goal['subject']} - {goal['study_hours_per_day']} hours",
            "thursday": f"Study {goal['subject']} - {goal['study_hours_per_day']} hours",
            "friday": f"Study {goal['subject']} - {goal['study_hours_per_day']} hours",
            "saturday": f"Review and practice - {goal['study_hours_per_day'] * 0.5} hours",
            "sunday": "Rest day or light review"
        }
        
        # Save the generated plan
        study_plan = StudyPlan(
            user_id=user_id,
            goal_id=goal_id,
            plan_content=plan_content,
            weekly_schedule=weekly_schedule
        )
        
        plan_dict = prepare_for_mongo(study_plan.dict())
        await db.study_plans.insert_one(plan_dict)
        
        # Increment usage count
        await increment_usage(user_id)
        
        return {"plan": plan_content, "schedule": weekly_schedule}
        
    except Exception as e:
        logging.error(f"Error generating study plan: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate study plan")

@api_router.get("/study-plans/{goal_id}")
async def get_study_plan(goal_id: str, user_id: str):
    plan = await db.study_plans.find_one({"goal_id": goal_id, "user_id": user_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")
    return {"plan": plan["plan_content"], "schedule": plan["weekly_schedule"]}

@api_router.post("/study-sessions", response_model=StudySession)
async def create_study_session(session_data: StudySessionCreate, user_id: str):
    session = StudySession(user_id=user_id, **session_data.dict())
    session_dict = prepare_for_mongo(session.dict())
    await db.study_sessions.insert_one(session_dict)
    return session

@api_router.get("/study-sessions/{user_id}", response_model=List[StudySession])
async def get_user_study_sessions(user_id: str):
    sessions = await db.study_sessions.find({"user_id": user_id}).to_list(100)
    return [StudySession(**session) for session in sessions]

@api_router.get("/analytics/{user_id}")
async def get_user_analytics(user_id: str):
    # Get user's study sessions
    sessions = await db.study_sessions.find({"user_id": user_id}).to_list(1000)
    
    total_sessions = len(sessions)
    completed_sessions = len([s for s in sessions if s.get("completed", False)])
    total_study_minutes = sum(s.get("duration_minutes", 0) for s in sessions)
    
    # Get user's goals
    goals = await db.study_goals.find({"user_id": user_id}).to_list(100)
    
    analytics = {
        "total_study_hours": round(total_study_minutes / 60, 1),
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "completion_rate": round((completed_sessions / total_sessions * 100) if total_sessions > 0 else 0, 1),
        "active_goals": len(goals),
        "streak_days": 0  # TODO: Calculate actual streak
    }
    
    return analytics

@api_router.post("/upgrade-subscription/{user_id}")
async def upgrade_subscription(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_tier": "premium"}}
    )
    
    return {"message": "Subscription upgraded to premium successfully"}

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