#!/usr/bin/env python3
"""
Test AI integration and plan content quality
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

def test_ai_plan_quality():
    """Test the quality and content of AI-generated study plans"""
    print("🤖 Testing AI Study Plan Quality")
    
    session = requests.Session()
    
    # Create a test user
    test_email = f"ai.test.{uuid.uuid4().hex[:8]}@studybuddy.com"
    user_data = {
        "email": test_email,
        "name": "AI Test User"
    }
    
    response = session.post(f"{API_BASE_URL}/users", json=user_data)
    if response.status_code != 200:
        print(f"❌ Could not create test user: {response.status_code}")
        return False
        
    user_id = response.json()['id']
    print(f"✅ Created test user: {user_id}")
    
    # Create a detailed study goal
    target_date = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
    goal_data = {
        "subject": "Machine Learning Fundamentals",
        "target_date": target_date,
        "study_hours_per_day": 3.0,
        "difficulty_level": "intermediate",
        "description": "Learn supervised learning, neural networks, and practical implementation with Python and scikit-learn"
    }
    
    goal_response = session.post(
        f"{API_BASE_URL}/study-goals", 
        json=goal_data,
        params={"user_id": user_id}
    )
    
    if goal_response.status_code != 200:
        print(f"❌ Could not create goal: {goal_response.status_code}")
        return False
        
    goal_id = goal_response.json()['id']
    print(f"✅ Created goal: {goal_id}")
    
    # Generate AI study plan
    print("🔄 Generating AI study plan...")
    plan_response = session.post(
        f"{API_BASE_URL}/generate-study-plan/{goal_id}",
        params={"user_id": user_id}
    )
    
    if plan_response.status_code != 200:
        print(f"❌ Could not generate plan: {plan_response.status_code} - {plan_response.text}")
        return False
        
    plan_data = plan_response.json()
    plan_content = plan_data.get('plan', '')
    schedule = plan_data.get('schedule', {})
    
    print(f"✅ Plan generated successfully")
    print(f"📊 Plan length: {len(plan_content)} characters")
    
    # Quality checks
    quality_checks = {
        "Substantial content": len(plan_content) > 500,
        "Contains subject reference": "machine learning" in plan_content.lower() or "ml" in plan_content.lower(),
        "Has weekly structure": any(day in schedule for day in ['monday', 'tuesday', 'wednesday']),
        "Schedule matches hours": any("3" in str(schedule.get(day, '')) for day in schedule),
        "Contains learning concepts": any(term in plan_content.lower() for term in ['learn', 'study', 'practice', 'understand']),
        "Has structured format": any(marker in plan_content for marker in ['1.', '2.', '-', '*', 'Week'])
    }
    
    print("\n🔍 Quality Assessment:")
    passed_checks = 0
    for check, result in quality_checks.items():
        status = "✅" if result else "❌"
        print(f"   {status} {check}")
        if result:
            passed_checks += 1
    
    print(f"\n📊 Quality Score: {passed_checks}/{len(quality_checks)} ({passed_checks/len(quality_checks)*100:.1f}%)")
    
    # Show sample of plan content
    print(f"\n📝 Plan Preview (first 300 chars):")
    print(f"   {plan_content[:300]}...")
    
    print(f"\n📅 Schedule Sample:")
    for day, activity in list(schedule.items())[:3]:
        print(f"   {day.capitalize()}: {activity}")
    
    return passed_checks >= 4  # At least 4/6 quality checks should pass

def test_emergent_llm_integration():
    """Test that the Emergent LLM integration is working"""
    print("\n🔗 Testing Emergent LLM Integration")
    
    # Check if the API key is configured
    from dotenv import load_dotenv
    load_dotenv('/app/backend/.env')
    
    emergent_key = os.environ.get('EMERGENT_LLM_KEY')
    if not emergent_key:
        print("❌ EMERGENT_LLM_KEY not configured")
        return False
    
    if emergent_key.startswith('sk-emergent-'):
        print("✅ EMERGENT_LLM_KEY is properly formatted")
    else:
        print("⚠️  EMERGENT_LLM_KEY format may be incorrect")
    
    # Test the integration by generating a plan
    session = requests.Session()
    
    # Create a simple test case
    test_email = f"integration.test.{uuid.uuid4().hex[:8]}@studybuddy.com"
    user_data = {"email": test_email, "name": "Integration Test User"}
    
    user_response = session.post(f"{API_BASE_URL}/users", json=user_data)
    if user_response.status_code != 200:
        print(f"❌ Could not create test user: {user_response.status_code}")
        return False
    
    user_id = user_response.json()['id']
    
    # Create a simple goal
    goal_data = {
        "subject": "Basic Mathematics",
        "target_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
        "study_hours_per_day": 1.0,
        "difficulty_level": "beginner"
    }
    
    goal_response = session.post(
        f"{API_BASE_URL}/study-goals", 
        json=goal_data,
        params={"user_id": user_id}
    )
    
    if goal_response.status_code != 200:
        print(f"❌ Could not create test goal: {goal_response.status_code}")
        return False
    
    goal_id = goal_response.json()['id']
    
    # Test plan generation
    plan_response = session.post(
        f"{API_BASE_URL}/generate-study-plan/{goal_id}",
        params={"user_id": user_id}
    )
    
    if plan_response.status_code == 200:
        print("✅ Emergent LLM integration working correctly")
        return True
    elif plan_response.status_code == 500:
        print(f"❌ Emergent LLM integration failed: {plan_response.text}")
        return False
    else:
        print(f"⚠️  Unexpected response: {plan_response.status_code}")
        return False

if __name__ == "__main__":
    print("🚀 Starting AI Integration Tests")
    print("=" * 60)
    
    # Test AI plan quality
    quality_ok = test_ai_plan_quality()
    
    # Test Emergent LLM integration
    integration_ok = test_emergent_llm_integration()
    
    print("\n" + "=" * 60)
    print("🏁 AI INTEGRATION TEST SUMMARY")
    print("=" * 60)
    print(f"AI Plan Quality: {'✅ PASS' if quality_ok else '❌ FAIL'}")
    print(f"Emergent LLM Integration: {'✅ PASS' if integration_ok else '❌ FAIL'}")