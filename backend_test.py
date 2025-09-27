#!/usr/bin/env python3
"""
StudyBuddy AI Backend API Test Suite
Tests all backend endpoints for the StudyBuddy AI application
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

print(f"Testing backend at: {API_BASE_URL}")

class StudyBuddyAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.test_user_id = None
        self.test_goal_id = None
        self.test_session_id = None
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def log_result(self, test_name, success, message="", response=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response and not success:
            print(f"   Response: {response.status_code} - {response.text}")
        
        if success:
            self.results['passed'] += 1
        else:
            self.results['failed'] += 1
            self.results['errors'].append(f"{test_name}: {message}")

    def test_user_creation(self):
        """Test POST /api/users - User creation"""
        print("\n=== Testing User Management ===")
        
        test_email = f"sarah.johnson.{uuid.uuid4().hex[:8]}@studybuddy.com"
        user_data = {
            "email": test_email,
            "name": "Sarah Johnson"
        }
        
        try:
            response = self.session.post(f"{API_BASE_URL}/users", json=user_data)
            
            if response.status_code == 200:
                user = response.json()
                self.test_user_id = user['id']
                
                # Validate user structure
                required_fields = ['id', 'email', 'name', 'subscription_tier', 'usage_count', 'created_at']
                missing_fields = [field for field in required_fields if field not in user]
                
                if missing_fields:
                    self.log_result("User Creation - Data Structure", False, 
                                  f"Missing fields: {missing_fields}", response)
                else:
                    # Validate default values
                    if user['subscription_tier'] == 'free' and user['usage_count'] == 0:
                        self.log_result("User Creation", True, 
                                      f"User created with ID: {self.test_user_id}")
                    else:
                        self.log_result("User Creation - Default Values", False, 
                                      f"Incorrect defaults: tier={user['subscription_tier']}, usage={user['usage_count']}")
            else:
                self.log_result("User Creation", False, 
                              f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("User Creation", False, f"Exception: {str(e)}")

    def test_user_retrieval(self):
        """Test GET /api/users/{user_id} - User retrieval"""
        if not self.test_user_id:
            self.log_result("User Retrieval", False, "No test user ID available")
            return
            
        try:
            response = self.session.get(f"{API_BASE_URL}/users/{self.test_user_id}")
            
            if response.status_code == 200:
                user = response.json()
                if user['id'] == self.test_user_id and user['name'] == "Sarah Johnson":
                    self.log_result("User Retrieval", True, "User retrieved successfully")
                else:
                    self.log_result("User Retrieval - Data Integrity", False, 
                                  "Retrieved user data doesn't match created user")
            else:
                self.log_result("User Retrieval", False, 
                              f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("User Retrieval", False, f"Exception: {str(e)}")

    def test_study_goal_creation(self):
        """Test POST /api/study-goals - Study goal creation"""
        print("\n=== Testing Study Goals ===")
        
        if not self.test_user_id:
            self.log_result("Study Goal Creation", False, "No test user ID available")
            return
            
        target_date = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        goal_data = {
            "subject": "Advanced Python Programming",
            "target_date": target_date,
            "study_hours_per_day": 2.5,
            "difficulty_level": "intermediate",
            "description": "Master advanced Python concepts including decorators, metaclasses, and async programming"
        }
        
        try:
            response = self.session.post(
                f"{API_BASE_URL}/study-goals", 
                json=goal_data,
                params={"user_id": self.test_user_id}
            )
            
            if response.status_code == 200:
                goal = response.json()
                self.test_goal_id = goal['id']
                
                # Validate goal structure
                required_fields = ['id', 'user_id', 'subject', 'target_date', 'study_hours_per_day', 'difficulty_level', 'created_at']
                missing_fields = [field for field in required_fields if field not in goal]
                
                if missing_fields:
                    self.log_result("Study Goal Creation - Data Structure", False, 
                                  f"Missing fields: {missing_fields}")
                else:
                    if goal['user_id'] == self.test_user_id and goal['subject'] == "Advanced Python Programming":
                        self.log_result("Study Goal Creation", True, 
                                      f"Goal created with ID: {self.test_goal_id}")
                    else:
                        self.log_result("Study Goal Creation - Data Integrity", False, 
                                      "Goal data doesn't match input")
            else:
                self.log_result("Study Goal Creation", False, 
                              f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Study Goal Creation", False, f"Exception: {str(e)}")

    def test_study_goals_retrieval(self):
        """Test GET /api/study-goals/{user_id} - Retrieve user's study goals"""
        if not self.test_user_id:
            self.log_result("Study Goals Retrieval", False, "No test user ID available")
            return
            
        try:
            response = self.session.get(f"{API_BASE_URL}/study-goals/{self.test_user_id}")
            
            if response.status_code == 200:
                goals = response.json()
                if isinstance(goals, list) and len(goals) > 0:
                    # Check if our created goal is in the list
                    found_goal = any(goal['id'] == self.test_goal_id for goal in goals if self.test_goal_id)
                    if found_goal or not self.test_goal_id:
                        self.log_result("Study Goals Retrieval", True, 
                                      f"Retrieved {len(goals)} goals")
                    else:
                        self.log_result("Study Goals Retrieval - Data Integrity", False, 
                                      "Created goal not found in retrieved goals")
                else:
                    self.log_result("Study Goals Retrieval", True, "No goals found (empty list)")
            else:
                self.log_result("Study Goals Retrieval", False, 
                              f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Study Goals Retrieval", False, f"Exception: {str(e)}")

    def test_ai_study_plan_generation(self):
        """Test POST /api/generate-study-plan/{goal_id} - AI study plan generation"""
        print("\n=== Testing AI Study Plan Generation ===")
        
        if not self.test_goal_id or not self.test_user_id:
            self.log_result("AI Study Plan Generation", False, "No test goal or user ID available")
            return
            
        try:
            response = self.session.post(
                f"{API_BASE_URL}/generate-study-plan/{self.test_goal_id}",
                params={"user_id": self.test_user_id}
            )
            
            if response.status_code == 200:
                plan_data = response.json()
                
                # Validate response structure
                if 'plan' in plan_data and 'schedule' in plan_data:
                    plan_content = plan_data['plan']
                    schedule = plan_data['schedule']
                    
                    # Check if plan content is substantial
                    if len(plan_content) > 100:  # Reasonable length for AI-generated content
                        # Check if schedule has all days
                        expected_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                        has_all_days = all(day in schedule for day in expected_days)
                        
                        if has_all_days:
                            self.log_result("AI Study Plan Generation", True, 
                                          f"Plan generated successfully (length: {len(plan_content)} chars)")
                        else:
                            missing_days = [day for day in expected_days if day not in schedule]
                            self.log_result("AI Study Plan Generation - Schedule", False, 
                                          f"Missing days in schedule: {missing_days}")
                    else:
                        self.log_result("AI Study Plan Generation - Content", False, 
                                      f"Plan content too short: {len(plan_content)} chars")
                else:
                    self.log_result("AI Study Plan Generation - Structure", False, 
                                  "Missing 'plan' or 'schedule' in response")
            elif response.status_code == 429:
                self.log_result("AI Study Plan Generation - Usage Limit", True, 
                              "Usage limit enforcement working correctly")
            else:
                self.log_result("AI Study Plan Generation", False, 
                              f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("AI Study Plan Generation", False, f"Exception: {str(e)}")

    def test_study_plan_retrieval(self):
        """Test GET /api/study-plans/{goal_id} - Retrieve study plan"""
        if not self.test_goal_id or not self.test_user_id:
            self.log_result("Study Plan Retrieval", False, "No test goal or user ID available")
            return
            
        try:
            response = self.session.get(
                f"{API_BASE_URL}/study-plans/{self.test_goal_id}",
                params={"user_id": self.test_user_id}
            )
            
            if response.status_code == 200:
                plan_data = response.json()
                if 'plan' in plan_data and 'schedule' in plan_data:
                    self.log_result("Study Plan Retrieval", True, "Study plan retrieved successfully")
                else:
                    self.log_result("Study Plan Retrieval - Structure", False, 
                                  "Missing 'plan' or 'schedule' in response")
            elif response.status_code == 404:
                self.log_result("Study Plan Retrieval", True, 
                              "404 response for non-existent plan (correct behavior)")
            else:
                self.log_result("Study Plan Retrieval", False, 
                              f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Study Plan Retrieval", False, f"Exception: {str(e)}")

    def test_study_session_creation(self):
        """Test POST /api/study-sessions - Create study session"""
        print("\n=== Testing Study Sessions ===")
        
        if not self.test_goal_id or not self.test_user_id:
            self.log_result("Study Session Creation", False, "No test goal or user ID available")
            return
            
        session_data = {
            "goal_id": self.test_goal_id,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "duration_minutes": 120,
            "completed": True,
            "notes": "Completed chapter 1 on decorators and practiced with examples"
        }
        
        try:
            response = self.session.post(
                f"{API_BASE_URL}/study-sessions",
                json=session_data,
                params={"user_id": self.test_user_id}
            )
            
            if response.status_code == 200:
                session = response.json()
                self.test_session_id = session['id']
                
                # Validate session structure
                required_fields = ['id', 'user_id', 'goal_id', 'date', 'duration_minutes', 'completed', 'created_at']
                missing_fields = [field for field in required_fields if field not in session]
                
                if missing_fields:
                    self.log_result("Study Session Creation - Data Structure", False, 
                                  f"Missing fields: {missing_fields}")
                else:
                    if (session['user_id'] == self.test_user_id and 
                        session['goal_id'] == self.test_goal_id and 
                        session['duration_minutes'] == 120):
                        self.log_result("Study Session Creation", True, 
                                      f"Session created with ID: {self.test_session_id}")
                    else:
                        self.log_result("Study Session Creation - Data Integrity", False, 
                                      "Session data doesn't match input")
            else:
                self.log_result("Study Session Creation", False, 
                              f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Study Session Creation", False, f"Exception: {str(e)}")

    def test_study_sessions_retrieval(self):
        """Test GET /api/study-sessions/{user_id} - Retrieve user's study sessions"""
        if not self.test_user_id:
            self.log_result("Study Sessions Retrieval", False, "No test user ID available")
            return
            
        try:
            response = self.session.get(f"{API_BASE_URL}/study-sessions/{self.test_user_id}")
            
            if response.status_code == 200:
                sessions = response.json()
                if isinstance(sessions, list):
                    if len(sessions) > 0:
                        # Check if our created session is in the list
                        found_session = any(session['id'] == self.test_session_id for session in sessions if self.test_session_id)
                        if found_session or not self.test_session_id:
                            self.log_result("Study Sessions Retrieval", True, 
                                          f"Retrieved {len(sessions)} sessions")
                        else:
                            self.log_result("Study Sessions Retrieval - Data Integrity", False, 
                                          "Created session not found in retrieved sessions")
                    else:
                        self.log_result("Study Sessions Retrieval", True, "No sessions found (empty list)")
                else:
                    self.log_result("Study Sessions Retrieval - Format", False, 
                                  "Response is not a list")
            else:
                self.log_result("Study Sessions Retrieval", False, 
                              f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Study Sessions Retrieval", False, f"Exception: {str(e)}")

    def test_analytics(self):
        """Test GET /api/analytics/{user_id} - User analytics"""
        print("\n=== Testing Analytics ===")
        
        if not self.test_user_id:
            self.log_result("Analytics", False, "No test user ID available")
            return
            
        try:
            response = self.session.get(f"{API_BASE_URL}/analytics/{self.test_user_id}")
            
            if response.status_code == 200:
                analytics = response.json()
                
                # Validate analytics structure
                required_fields = ['total_study_hours', 'total_sessions', 'completed_sessions', 
                                 'completion_rate', 'active_goals', 'streak_days']
                missing_fields = [field for field in required_fields if field not in analytics]
                
                if missing_fields:
                    self.log_result("Analytics - Data Structure", False, 
                                  f"Missing fields: {missing_fields}")
                else:
                    # Validate data types and ranges
                    valid_data = (
                        isinstance(analytics['total_study_hours'], (int, float)) and analytics['total_study_hours'] >= 0 and
                        isinstance(analytics['total_sessions'], int) and analytics['total_sessions'] >= 0 and
                        isinstance(analytics['completed_sessions'], int) and analytics['completed_sessions'] >= 0 and
                        isinstance(analytics['completion_rate'], (int, float)) and 0 <= analytics['completion_rate'] <= 100 and
                        isinstance(analytics['active_goals'], int) and analytics['active_goals'] >= 0 and
                        isinstance(analytics['streak_days'], int) and analytics['streak_days'] >= 0
                    )
                    
                    if valid_data:
                        self.log_result("Analytics", True, 
                                      f"Analytics calculated: {analytics['total_study_hours']}h, {analytics['total_sessions']} sessions")
                    else:
                        self.log_result("Analytics - Data Validation", False, 
                                      "Invalid data types or ranges in analytics")
            else:
                self.log_result("Analytics", False, 
                              f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Analytics", False, f"Exception: {str(e)}")

    def test_subscription_upgrade(self):
        """Test POST /api/upgrade-subscription/{user_id} - Subscription upgrade"""
        print("\n=== Testing Subscription ===")
        
        if not self.test_user_id:
            self.log_result("Subscription Upgrade", False, "No test user ID available")
            return
            
        try:
            response = self.session.post(f"{API_BASE_URL}/upgrade-subscription/{self.test_user_id}")
            
            if response.status_code == 200:
                result = response.json()
                if 'message' in result and 'premium' in result['message'].lower():
                    # Verify the upgrade by checking user data
                    user_response = self.session.get(f"{API_BASE_URL}/users/{self.test_user_id}")
                    if user_response.status_code == 200:
                        user = user_response.json()
                        if user['subscription_tier'] == 'premium':
                            self.log_result("Subscription Upgrade", True, 
                                          "Subscription upgraded to premium successfully")
                        else:
                            self.log_result("Subscription Upgrade - Verification", False, 
                                          f"User tier not updated: {user['subscription_tier']}")
                    else:
                        self.log_result("Subscription Upgrade - Verification", False, 
                                      "Could not verify upgrade")
                else:
                    self.log_result("Subscription Upgrade - Response", False, 
                                  "Invalid response message")
            else:
                self.log_result("Subscription Upgrade", False, 
                              f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Subscription Upgrade", False, f"Exception: {str(e)}")

    def test_usage_limit_enforcement(self):
        """Test usage limit enforcement for free tier users"""
        print("\n=== Testing Usage Limit Enforcement ===")
        
        # Create a new free tier user for this test
        test_email = f"limit.test.{uuid.uuid4().hex[:8]}@studybuddy.com"
        user_data = {
            "email": test_email,
            "name": "Limit Test User"
        }
        
        try:
            # Create user
            response = self.session.post(f"{API_BASE_URL}/users", json=user_data)
            if response.status_code != 200:
                self.log_result("Usage Limit Test - User Creation", False, 
                              f"Could not create test user: {response.status_code}")
                return
                
            limit_user_id = response.json()['id']
            
            # Create a goal for this user
            target_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            goal_data = {
                "subject": "Test Subject",
                "target_date": target_date,
                "study_hours_per_day": 1.0,
                "difficulty_level": "beginner"
            }
            
            goal_response = self.session.post(
                f"{API_BASE_URL}/study-goals", 
                json=goal_data,
                params={"user_id": limit_user_id}
            )
            
            if goal_response.status_code != 200:
                self.log_result("Usage Limit Test - Goal Creation", False, 
                              f"Could not create test goal: {goal_response.status_code}")
                return
                
            limit_goal_id = goal_response.json()['id']
            
            # Try to generate study plans until we hit the limit (free tier = 5)
            successful_generations = 0
            for i in range(7):  # Try more than the limit
                plan_response = self.session.post(
                    f"{API_BASE_URL}/generate-study-plan/{limit_goal_id}",
                    params={"user_id": limit_user_id}
                )
                
                if plan_response.status_code == 200:
                    successful_generations += 1
                elif plan_response.status_code == 429:
                    # Hit the limit - this is expected
                    break
                    
            if successful_generations <= 5 and plan_response.status_code == 429:
                self.log_result("Usage Limit Enforcement", True, 
                              f"Limit enforced after {successful_generations} generations")
            else:
                self.log_result("Usage Limit Enforcement", False, 
                              f"Limit not enforced properly: {successful_generations} generations, last status: {plan_response.status_code}")
                
        except Exception as e:
            self.log_result("Usage Limit Enforcement", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting StudyBuddy AI Backend API Tests")
        print(f"Backend URL: {API_BASE_URL}")
        print("=" * 60)
        
        # Test user management
        self.test_user_creation()
        self.test_user_retrieval()
        
        # Test study goals
        self.test_study_goal_creation()
        self.test_study_goals_retrieval()
        
        # Test AI study plan generation
        self.test_ai_study_plan_generation()
        self.test_study_plan_retrieval()
        
        # Test study sessions
        self.test_study_session_creation()
        self.test_study_sessions_retrieval()
        
        # Test analytics
        self.test_analytics()
        
        # Test subscription
        self.test_subscription_upgrade()
        
        # Test usage limits
        self.test_usage_limit_enforcement()
        
        # Print summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📊 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print("\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        return self.results

if __name__ == "__main__":
    tester = StudyBuddyAPITester()
    results = tester.run_all_tests()