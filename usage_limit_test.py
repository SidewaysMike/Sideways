#!/usr/bin/env python3
"""
Specific test for usage limit enforcement
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://helpmate-daily.preview.emergentagent.com')
API_BASE_URL = f"{BACKEND_URL}/api"

def test_usage_limit_with_different_goals():
    """Test usage limit with different goals to avoid existing plan issue"""
    print("🔍 Testing Usage Limit with Different Goals")
    
    session = requests.Session()
    
    # Create a new free tier user
    test_email = f"limit.test.{uuid.uuid4().hex[:8]}@studybuddy.com"
    user_data = {
        "email": test_email,
        "name": "Usage Limit Test User"
    }
    
    # Create user
    response = session.post(f"{API_BASE_URL}/users", json=user_data)
    if response.status_code != 200:
        print(f"❌ Could not create test user: {response.status_code}")
        return
        
    user_id = response.json()['id']
    print(f"✅ Created test user: {user_id}")
    
    # Create multiple goals and try to generate plans for each
    successful_generations = 0
    goal_ids = []
    
    for i in range(7):  # Try more than the limit (5)
        # Create a unique goal
        target_date = (datetime.now() + timedelta(days=30 + i)).strftime("%Y-%m-%d")
        goal_data = {
            "subject": f"Test Subject {i+1}",
            "target_date": target_date,
            "study_hours_per_day": 1.0 + (i * 0.1),
            "difficulty_level": "beginner"
        }
        
        goal_response = session.post(
            f"{API_BASE_URL}/study-goals", 
            json=goal_data,
            params={"user_id": user_id}
        )
        
        if goal_response.status_code != 200:
            print(f"❌ Could not create goal {i+1}: {goal_response.status_code}")
            continue
            
        goal_id = goal_response.json()['id']
        goal_ids.append(goal_id)
        print(f"✅ Created goal {i+1}: {goal_id}")
        
        # Try to generate study plan
        plan_response = session.post(
            f"{API_BASE_URL}/generate-study-plan/{goal_id}",
            params={"user_id": user_id}
        )
        
        print(f"   Plan generation attempt {i+1}: Status {plan_response.status_code}")
        
        if plan_response.status_code == 200:
            successful_generations += 1
            print(f"   ✅ Plan generated successfully ({successful_generations}/5)")
        elif plan_response.status_code == 429:
            print(f"   🚫 Usage limit reached after {successful_generations} generations")
            break
        else:
            print(f"   ❌ Unexpected error: {plan_response.status_code} - {plan_response.text}")
            
    # Check final user usage count
    user_response = session.get(f"{API_BASE_URL}/users/{user_id}")
    if user_response.status_code == 200:
        final_user = user_response.json()
        print(f"📊 Final usage count: {final_user['usage_count']}")
        print(f"📊 Subscription tier: {final_user['subscription_tier']}")
    
    # Evaluate results
    if successful_generations <= 5 and (len(goal_ids) > 5 and plan_response.status_code == 429):
        print(f"✅ Usage limit enforcement working correctly: {successful_generations} successful generations")
        return True
    else:
        print(f"❌ Usage limit not enforced properly: {successful_generations} generations, last status: {plan_response.status_code}")
        return False

def test_existing_plan_behavior():
    """Test that existing plans are returned without incrementing usage"""
    print("\n🔍 Testing Existing Plan Behavior")
    
    session = requests.Session()
    
    # Create a new user
    test_email = f"existing.plan.{uuid.uuid4().hex[:8]}@studybuddy.com"
    user_data = {
        "email": test_email,
        "name": "Existing Plan Test User"
    }
    
    response = session.post(f"{API_BASE_URL}/users", json=user_data)
    if response.status_code != 200:
        print(f"❌ Could not create test user: {response.status_code}")
        return
        
    user_id = response.json()['id']
    print(f"✅ Created test user: {user_id}")
    
    # Create a goal
    target_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    goal_data = {
        "subject": "Existing Plan Test Subject",
        "target_date": target_date,
        "study_hours_per_day": 2.0,
        "difficulty_level": "intermediate"
    }
    
    goal_response = session.post(
        f"{API_BASE_URL}/study-goals", 
        json=goal_data,
        params={"user_id": user_id}
    )
    
    if goal_response.status_code != 200:
        print(f"❌ Could not create goal: {goal_response.status_code}")
        return
        
    goal_id = goal_response.json()['id']
    print(f"✅ Created goal: {goal_id}")
    
    # Generate plan first time
    plan_response1 = session.post(
        f"{API_BASE_URL}/generate-study-plan/{goal_id}",
        params={"user_id": user_id}
    )
    
    if plan_response1.status_code != 200:
        print(f"❌ Could not generate initial plan: {plan_response1.status_code}")
        return
        
    print("✅ Generated initial plan")
    
    # Check usage count after first generation
    user_response1 = session.get(f"{API_BASE_URL}/users/{user_id}")
    usage_after_first = user_response1.json()['usage_count'] if user_response1.status_code == 200 else 0
    print(f"📊 Usage count after first generation: {usage_after_first}")
    
    # Try to generate the same plan again (should return existing)
    plan_response2 = session.post(
        f"{API_BASE_URL}/generate-study-plan/{goal_id}",
        params={"user_id": user_id}
    )
    
    if plan_response2.status_code != 200:
        print(f"❌ Could not retrieve existing plan: {plan_response2.status_code}")
        return
        
    print("✅ Retrieved existing plan")
    
    # Check usage count after second call
    user_response2 = session.get(f"{API_BASE_URL}/users/{user_id}")
    usage_after_second = user_response2.json()['usage_count'] if user_response2.status_code == 200 else 0
    print(f"📊 Usage count after second call: {usage_after_second}")
    
    # Evaluate
    if usage_after_first == usage_after_second:
        print("✅ Existing plan returned without incrementing usage count")
        return True
    else:
        print("❌ Usage count incremented even for existing plan")
        return False

if __name__ == "__main__":
    print("🚀 Starting Detailed Usage Limit Tests")
    print("=" * 60)
    
    # Test existing plan behavior first
    existing_plan_ok = test_existing_plan_behavior()
    
    # Test usage limit with different goals
    usage_limit_ok = test_usage_limit_with_different_goals()
    
    print("\n" + "=" * 60)
    print("🏁 DETAILED TEST SUMMARY")
    print("=" * 60)
    print(f"Existing Plan Behavior: {'✅ PASS' if existing_plan_ok else '❌ FAIL'}")
    print(f"Usage Limit Enforcement: {'✅ PASS' if usage_limit_ok else '❌ FAIL'}")