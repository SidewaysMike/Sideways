import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, BookOpen, Target, BarChart3, Crown, User, Plus, Clock, CheckCircle2, Zap, Brain, Trophy, Star } from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('studybuddy_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, name) => {
    try {
      const response = await axios.post(`${API}/users`, { email, name });
      const userData = response.data;
      setUser(userData);
      localStorage.setItem('studybuddy_user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('studybuddy_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Components
const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, name);
      navigate('/dashboard');
    } catch (error) {
      alert('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">StudyBuddy AI</h1>
          <p className="text-gray-600">Your AI-powered study companion for academic success</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Get Started'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="text-center text-sm text-gray-600">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="font-medium">Free Tier Benefits</span>
              </div>
              <ul className="text-xs space-y-1">
                <li>• 5 AI study plans per month</li>
                <li>• Basic progress tracking</li>
                <li>• Study schedule generator</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, setUser } = useAuth();
  const [goals, setGoals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [goalsRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/study-goals/${user.id}`),
        axios.get(`${API}/analytics/${user.id}`)
      ]);
      setGoals(goalsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const upgradeSubscription = async () => {
    try {
      await axios.post(`${API}/upgrade-subscription/${user.id}`);
      const updatedUser = { ...user, subscription_tier: 'premium' };
      setUser(updatedUser);
      localStorage.setItem('studybuddy_user', JSON.stringify(updatedUser));
      alert('Subscription upgraded successfully!');
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      alert('Failed to upgrade subscription');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-indigo-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">StudyBuddy AI</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user.subscription_tier === 'free' && (
                <button
                  onClick={upgradeSubscription}
                  className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all"
                >
                  <Crown className="w-4 h-4" />
                  <span>Upgrade to Premium</span>
                </button>
              )}
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
                {user.subscription_tier === 'premium' && (
                  <Crown className="w-4 h-4 text-yellow-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Usage Banner for Free Users */}
        {user.subscription_tier === 'free' && (
          <div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Free Tier Usage</h3>
                <p className="text-indigo-100">
                  You've used {user.usage_count}/5 AI study plans this month
                </p>
                <div className="w-full bg-indigo-300 rounded-full h-2 mt-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all"
                    style={{ width: `${(user.usage_count / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
              <button
                onClick={upgradeSubscription}
                className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        )}

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-blue-500 mb-2" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{analytics.total_study_hours}h</h3>
              <p className="text-gray-600">Total Study Time</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-green-500 mb-2" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{analytics.active_goals}</h3>
              <p className="text-gray-600">Active Goals</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center">
                <CheckCircle2 className="w-8 h-8 text-purple-500 mb-2" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{analytics.completion_rate}%</h3>
              <p className="text-gray-600">Completion Rate</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center">
                <Zap className="w-8 h-8 text-orange-500 mb-2" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{analytics.streak_days}</h3>
              <p className="text-gray-600">Day Streak</p>
            </div>
          </div>
        )}

        {/* Study Goals Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">My Study Goals</h2>
            <Link
              to="/create-goal"
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Goal</span>
            </Link>
          </div>

          {goals.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No study goals yet</h3>
              <p className="text-gray-600 mb-4">Create your first study goal to get started with AI-powered planning</p>
              <Link
                to="/create-goal"
                className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Goal</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map((goal) => (
                <div key={goal.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 mb-2">{goal.subject}</h3>
                  <p className="text-sm text-gray-600 mb-3">Target: {goal.target_date}</p>
                  <p className="text-sm text-gray-600 mb-3">{goal.study_hours_per_day}h/day • {goal.difficulty_level}</p>
                  <Link
                    to={`/study-plan/${goal.id}`}
                    className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>View Study Plan</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CreateGoal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    subject: '',
    target_date: '',
    study_hours_per_day: 2,
    difficulty_level: 'intermediate',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user.subscription_tier === 'free' && user.usage_count >= 5) {
      alert('You have reached your free tier limit. Please upgrade to premium.');
      return;
    }
    
    setIsLoading(true);
    try {
      await axios.post(`${API}/study-goals?user_id=${user.id}`, formData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Failed to create study goal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Study Goal</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., Calculus, Spanish, History"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Date
              </label>
              <input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({...formData, target_date: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Study Hours
              </label>
              <select
                value={formData.study_hours_per_day}
                onChange={(e) => setFormData({...formData, study_hours_per_day: parseFloat(e.target.value)})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value={0.5}>30 minutes</option>
                <option value={1}>1 hour</option>
                <option value={1.5}>1.5 hours</option>
                <option value={2}>2 hours</option>
                <option value={3}>3 hours</option>
                <option value={4}>4 hours</option>
                <option value={5}>5+ hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <select
                value={formData.difficulty_level}
                onChange={(e) => setFormData({...formData, difficulty_level: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows="3"
                placeholder="Any specific topics, exam dates, or preferences..."
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const StudyPlan = () => {
  const { user } = useAuth();
  const [goalId, setGoalId] = useState(window.location.pathname.split('/').pop());
  const [plan, setPlan] = useState(null);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchGoalAndPlan();
  }, [goalId]);

  const fetchGoalAndPlan = async () => {
    try {
      // Fetch goal details
      const goalsRes = await axios.get(`${API}/study-goals/${user.id}`);
      const currentGoal = goalsRes.data.find(g => g.id === goalId);
      setGoal(currentGoal);

      // Try to fetch existing plan
      try {
        const planRes = await axios.get(`${API}/study-plans/${goalId}?user_id=${user.id}`);
        setPlan(planRes.data);
      } catch (planError) {
        // Plan doesn't exist yet
        setPlan(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async () => {
    if (user.subscription_tier === 'free' && user.usage_count >= 5) {
      alert('You have reached your free tier limit. Please upgrade to premium for unlimited AI study plans.');
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(`${API}/generate-study-plan/${goalId}?user_id=${user.id}`);
      setPlan(response.data);
      
      // Update user usage count in context
      const updatedUser = { ...user, usage_count: user.usage_count + 1 };
      localStorage.setItem('studybuddy_user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error generating plan:', error);
      if (error.response?.status === 429) {
        alert('You have reached your free tier limit. Please upgrade to premium.');
      } else {
        alert('Failed to generate study plan. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-700 mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          
          {goal && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{goal.subject} Study Plan</h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>Target: {goal.target_date}</span>
                <span>•</span>
                <span>{goal.study_hours_per_day}h/day</span>
                <span>•</span>
                <span className="capitalize">{goal.difficulty_level}</span>
              </div>
              {goal.description && (
                <p className="mt-3 text-gray-700">{goal.description}</p>
              )}
            </div>
          )}
        </div>

        {!plan ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Brain className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-4">Generate AI Study Plan</h2>
            <p className="text-gray-600 mb-6">
              Let our AI create a personalized study plan tailored to your goal, timeline, and learning style.
            </p>
            
            {user.subscription_tier === 'free' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-800 text-sm">
                  <strong>Free Tier:</strong> You have {5 - user.usage_count} AI study plans remaining this month
                </p>
              </div>
            )}
            
            <button
              onClick={generatePlan}
              disabled={generating}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Study Plan'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Personalized Study Plan</h2>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700">{plan.plan}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Weekly Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(plan.schedule).map(([day, activity]) => (
                  <div key={day} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 capitalize mb-2">{day}</h4>
                    <p className="text-sm text-gray-600">{activity}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/create-goal" element={<ProtectedRoute><CreateGoal /></ProtectedRoute>} />
          <Route path="/study-plan/:goalId" element={<ProtectedRoute><StudyPlan /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-3xl mb-6">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            StudyBuddy AI
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform your learning with AI-powered study plans. Get personalized schedules, 
            track progress, and achieve your academic goals faster.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <span>Start Learning Smarter</span>
            <Brain className="w-5 h-5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <Target className="w-12 h-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-3">AI Study Plans</h3>
            <p className="text-gray-600">
              Get personalized study schedules created by advanced AI based on your goals, timeline, and learning style.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <BarChart3 className="w-12 h-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-3">Progress Tracking</h3>
            <p className="text-gray-600">
              Monitor your study sessions, completion rates, and stay motivated with detailed analytics and insights.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <Trophy className="w-12 h-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-3">Goal Achievement</h3>
            <p className="text-gray-600">
              Set clear academic goals and follow structured plans designed to help you succeed in your studies.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-12 shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple Pricing</h2>
            <p className="text-gray-600">Choose the plan that works best for your learning journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Free Tier</h3>
              <div className="text-3xl font-bold text-gray-900 mb-4">$0<span className="text-lg text-gray-600">/month</span></div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                  5 AI study plans per month
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                  Basic progress tracking
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                  Study schedule generator
                </li>
              </ul>
              <Link
                to="/login"
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center block"
              >
                Get Started Free
              </Link>
            </div>

            <div className="border-2 border-indigo-500 rounded-2xl p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-indigo-500 text-white px-4 py-2 rounded-full text-sm font-medium">Most Popular</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Premium</h3>
              <div className="text-3xl font-bold text-gray-900 mb-4">$9.99<span className="text-lg text-gray-600">/month</span></div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                  Unlimited AI study plans
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                  Advanced analytics & insights
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                  Priority support
                </li>
                <li className="flex items-center text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                  Custom study techniques
                </li>
              </ul>
              <Link
                to="/login"
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors text-center block"
              >
                Start Premium Trial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return children;
};

export default App;