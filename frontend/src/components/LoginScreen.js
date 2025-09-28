import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setLoading(true);
    await onLogin(username.trim());
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background Casino Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1665340141992-f752117140cd)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.3) blur(1px)'
        }}
      />
      <div className="absolute inset-0 bg-black/50 z-0" />
      
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-6xl font-bold text-transparent bg-gradient-to-r from-pink-400 via-cyan-400 to-green-400 bg-clip-text casino-title mb-4">
            🎰 NEON SLOTS
          </h1>
          <p className="text-xl text-cyan-300 neon-text mb-2">Welcome to the ultimate casino experience!</p>
          <p className="text-gray-300">Enter your username to start playing</p>
        </div>

        {/* Login Card */}
        <Card className="neon-card">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-white">
              🎲 Enter the Casino
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-black/50 border-cyan-500/50 text-white placeholder-gray-400 text-center text-lg h-12"
                  maxLength={20}
                  disabled={loading}
                  data-testid="username-input"
                />
              </div>
              
              <Button
                type="submit"
                disabled={!username.trim() || loading}
                className="w-full h-12 text-lg neon-button"
                data-testid="login-btn"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Entering...</span>
                  </div>
                ) : (
                  '🚀 START PLAYING'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-400">
              <p>🎁 New players get <span className="text-yellow-400 font-bold">1000 FREE CREDITS</span></p>
              <p className="mt-2">💰 Daily bonuses • 🎰 Multiple slot games • 🏆 VIP rewards</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Features Preview */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="neon-card p-4">
            <div className="text-2xl mb-2">🎰</div>
            <div className="text-sm text-gray-300">Classic Slots</div>
          </div>
          <div className="neon-card p-4">
            <div className="text-2xl mb-2">🎮</div>
            <div className="text-sm text-gray-300">Video Slots</div>
          </div>
          <div className="neon-card p-4">
            <div className="text-2xl mb-2">🎁</div>
            <div className="text-sm text-gray-300">Bonus Games</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;