import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GameDashboard = ({ user, onViewChange, onUpdateUser, soundManager }) => {
  const [dailyBonusAvailable, setDailyBonusAvailable] = useState(true);
  const [timeUntilBonus, setTimeUntilBonus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkDailyBonusStatus();
    const interval = setInterval(checkDailyBonusStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);

  const checkDailyBonusStatus = async () => {
    try {
      const response = await axios.get(`${API}/user-stats/${user.id}`);
      const data = response.data;
      
      setDailyBonusAvailable(data.can_claim_bonus);
      
      if (!data.can_claim_bonus && data.next_daily_bonus) {
        const nextBonus = new Date(data.next_daily_bonus);
        const now = new Date();
        const timeDiff = nextBonus - now;
        
        if (timeDiff > 0) {
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeUntilBonus(`${hours}h ${minutes}m`);
        }
      }
    } catch (error) {
      console.error('Error checking daily bonus status:', error);
    }
  };

  const claimDailyBonus = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/daily-bonus`, {
        user_id: user.id
      });
      
      const data = response.data;
      onUpdateUser({ credits: data.new_balance });
      setDailyBonusAvailable(false);
      
      toast.success(`🎁 Daily bonus claimed! +${data.bonus_amount} credits!`);
      soundManager.play('win');
      
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to claim daily bonus');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slotType) => {
    soundManager.play('button');
    onViewChange('game', { slotType });
  };

  // Calculate level progress
  const gamesForNextLevel = ((user.level || 1) * 100) - (user.games_played || 0);
  const levelProgress = ((user.games_played || 0) % 100);

  return (
    <div className="min-h-screen p-6">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1660155232182-0022c2f81749)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.2)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-purple-900/30 to-black/80 z-0" />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-4 neon-text">
            Welcome back, <span className="text-cyan-400">{user.username}</span>! 🎰
          </h2>
          <p className="text-xl text-gray-300">
            Ready to spin and win big? Choose your game below!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="neon-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">💰 {user.credits?.toFixed(0) || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="neon-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">Player Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">🏆 Level {user.level || 1}</div>
              <div className="mt-2">
                <Progress value={levelProgress} className="h-2" />
                <div className="text-xs text-gray-400 mt-1">
                  {gamesForNextLevel > 0 ? `${gamesForNextLevel} games to next level` : 'Max level!'}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="neon-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">Total Winnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">💎 {user.total_winnings?.toFixed(0) || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="neon-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">Games Played</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">🎮 {user.games_played || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Bonus Section */}
        <Card className="neon-card mb-8">
          <CardHeader>
            <CardTitle className="text-center text-white flex items-center justify-center space-x-2">
              <span>🎁</span>
              <span>Daily Bonus</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {dailyBonusAvailable ? (
              <div>
                <p className="text-lg text-gray-300 mb-4">
                  Your daily bonus is ready! Get free credits now!
                </p>
                <Button
                  onClick={claimDailyBonus}
                  disabled={loading}
                  className="neon-button px-8 py-3 text-lg"
                  data-testid="claim-daily-bonus-btn"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Claiming...</span>
                    </div>
                  ) : (
                    `🎁 Claim ${100 + ((user.level || 1) * 25)}${user.vip_status ? ' x2 (VIP)' : ''} Credits`
                  )}
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-lg text-gray-400 mb-2">
                  Daily bonus already claimed!
                </p>
                {timeUntilBonus && (
                  <p className="text-cyan-400 font-bold">
                    Next bonus in: {timeUntilBonus}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Game Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Classic 3-Reel Slots */}
          <Card className="neon-card group cursor-pointer hover:scale-105 transition-all duration-300"
                onClick={() => handleSlotSelect('classic_3_reel')}
                data-testid="classic-slots-card">
            <CardHeader>
              <div className="text-6xl text-center mb-4">🎰</div>
              <CardTitle className="text-center text-white text-xl">
                Classic 3-Reel Slots
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300 mb-4">
                Traditional slot machine with simple gameplay and classic symbols.
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <div>💎 Diamond Jackpot: 1000x</div>
                <div>7️⃣ Lucky Sevens: 500x</div>
                <div>⭐ Three Stars: 100x</div>
              </div>
              <Button className="mt-4 w-full neon-button">
                🎲 Play Classic Slots
              </Button>
            </CardContent>
          </Card>

          {/* Video 5-Reel Slots */}
          <Card className="neon-card group cursor-pointer hover:scale-105 transition-all duration-300"
                onClick={() => handleSlotSelect('video_5_reel')}
                data-testid="video-slots-card">
            <CardHeader>
              <div className="text-6xl text-center mb-4">🎮</div>
              <CardTitle className="text-center text-white text-xl">
                Video 5-Reel Slots
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300 mb-4">
                Modern video slots with 5 reels and higher winning potential.
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <div>👑 Royal Flush: 5000x</div>
                <div>💎 Diamond Line: 2500x</div>
                <div>💰 Money Bags: 1000x</div>
              </div>
              <Button className="mt-4 w-full neon-button">
                🚀 Play Video Slots
              </Button>
            </CardContent>
          </Card>

          {/* Bonus Slots */}
          <Card className="neon-card group cursor-pointer hover:scale-105 transition-all duration-300"
                onClick={() => handleSlotSelect('bonus_slots')}
                data-testid="bonus-slots-card">
            <CardHeader>
              <div className="text-6xl text-center mb-4">🎁</div>
              <CardTitle className="text-center text-white text-xl">
                Bonus Feature Slots
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300 mb-4">
                Advanced slots with bonus rounds, free spins, and multipliers.
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <div>🎁 Bonus Rounds</div>
                <div>🌟 Free Spins</div>
                <div>⚡ Multipliers</div>
              </div>
              <Button className="mt-4 w-full neon-button">
                ⭐ Play Bonus Slots
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-400">
          <p>🎰 Play responsibly • 21+ only • Virtual credits for entertainment</p>
        </div>
      </div>
    </div>
  );
};

export default GameDashboard;