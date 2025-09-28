import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import './App.css';

// Import components
import LoginScreen from './components/LoginScreen';
import GameDashboard from './components/GameDashboard';
import SlotMachine from './components/SlotMachine';
import UserStats from './components/UserStats';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Sound manager for casino effects
class SoundManager {
  constructor() {
    this.sounds = {};
    this.enabled = true;
    this.volume = 0.3;
    this.initializeSounds();
  }

  initializeSounds() {
    // Create audio contexts for casino sounds using data URLs (to avoid external dependencies)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Simple beep sound for buttons
    this.createBeepSound('button', 800, 0.1);
    this.createBeepSound('win', 1200, 0.3);
    this.createBeepSound('lose', 400, 0.2);
    this.createBeepSound('spin', 600, 0.5);
    this.createBeepSound('jackpot', 1600, 1.0);
  }

  createBeepSound(name, frequency, duration) {
    // Create simple synthetic casino sounds
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const playSound = () => {
      if (!this.enabled) return;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = name === 'jackpot' ? 'square' : 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    };
    
    this.sounds[name] = playSound;
  }

  play(soundName) {
    if (this.sounds[soundName] && this.enabled) {
      try {
        this.sounds[soundName]();
      } catch (error) {
        console.warn('Audio playback failed:', error);
      }
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }
}

// Global sound manager instance
const soundManager = new SoundManager();

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('login');
  const [currentSlotType, setCurrentSlotType] = useState('classic_3_reel');
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // Check for existing user in localStorage
    const savedUser = localStorage.getItem('casinoUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
        setCurrentView('dashboard');
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('casinoUser');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = async (username) => {
    try {
      setLoading(true);
      
      // Try to create user (will fail if exists, then we'll fetch)
      let userData;
      try {
        const response = await axios.post(`${API}/users`, { username });
        userData = response.data;
        toast.success(`Welcome ${username}! You've received 1000 free credits!`);
      } catch (error) {
        if (error.response?.status === 400) {
          // User exists, this is a login
          toast.success(`Welcome back, ${username}!`);
          // For now, we'll create a mock user object
          // In a real app, you'd have a separate login endpoint
          userData = {
            id: `user_${username}`,
            username,
            credits: 1000,
            level: 1,
            vip_status: false
          };
        } else {
          throw error;
        }
      }
      
      setCurrentUser(userData);
      localStorage.setItem('casinoUser', JSON.stringify(userData));
      setCurrentView('dashboard');
      soundManager.play('button');
      
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('casinoUser');
    setCurrentView('login');
    toast.info('Logged out successfully');
    soundManager.play('button');
  };

  const updateUserData = (newData) => {
    const updatedUser = { ...currentUser, ...newData };
    setCurrentUser(updatedUser);
    localStorage.setItem('casinoUser', JSON.stringify(updatedUser));
  };

  const handleViewChange = (view, options = {}) => {
    setCurrentView(view);
    if (options.slotType) {
      setCurrentSlotType(options.slotType);
    }
  };

  const toggleSound = () => {
    const newState = soundManager.toggle();
    setSoundEnabled(newState);
    toast.info(newState ? 'Sound enabled' : 'Sound disabled');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <div className="text-white text-xl font-bold neon-text">Loading Casino...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <div className="min-h-screen bg-casino-gradient">
          {/* Header */}
          {currentUser && (
            <header className="bg-black/50 backdrop-blur-sm border-b border-cyan-500/30 p-4">
              <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-transparent bg-gradient-to-r from-pink-400 via-cyan-400 to-green-400 bg-clip-text casino-title"
                      onClick={() => setCurrentView('dashboard')}
                      style={{ cursor: 'pointer' }}>
                    🎰 NEON SLOTS
                  </h1>
                  
                  <div className="flex items-center space-x-4 text-white">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 rounded-full">
                      <span className="font-bold text-black">💰 {currentUser.credits?.toFixed(0) || 0}</span>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full">
                      <span className="font-bold text-white">LVL {currentUser.level || 1}</span>
                    </div>
                    
                    {currentUser.vip_status && (
                      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-3 py-1 rounded-full">
                        <span className="font-bold text-black">👑 VIP</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={toggleSound}
                    className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                    data-testid="sound-toggle-btn"
                  >
                    <span className="text-xl">{soundEnabled ? '🔊' : '🔇'}</span>
                  </button>
                  
                  <button
                    onClick={() => setCurrentView('stats')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-bold"
                    data-testid="stats-btn"
                  >
                    📊 Stats
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold"
                    data-testid="logout-btn"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </header>
          )}
          
          {/* Main Content */}
          <main className="min-h-screen">
            <Routes>
              <Route path="/" element={
                currentView === 'login' ? (
                  <LoginScreen onLogin={handleLogin} />
                ) : currentView === 'dashboard' ? (
                  <GameDashboard 
                    user={currentUser} 
                    onViewChange={handleViewChange}
                    onUpdateUser={updateUserData}
                    soundManager={soundManager}
                  />
                ) : currentView === 'game' ? (
                  <SlotMachine 
                    user={currentUser}
                    onUpdateUser={updateUserData}
                    onBack={() => setCurrentView('dashboard')}
                    soundManager={soundManager}
                    slotType={currentSlotType}
                  />
                ) : currentView === 'stats' ? (
                  <UserStats 
                    user={currentUser}
                    onBack={() => setCurrentView('dashboard')}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              } />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d3f 100%)',
            border: '1px solid #00ffff',
            color: '#ffffff',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
          }
        }}
      />
    </div>
  );
}

export default App;
export { soundManager };
