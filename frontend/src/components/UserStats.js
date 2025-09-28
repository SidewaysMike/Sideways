import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserStats = ({ user, onBack }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/user-stats/${user.id}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <div className="text-white text-xl font-bold neon-text">Loading Stats...</div>
        </div>
      </div>
    );
  }

  const levelProgress = ((user.games_played || 0) % 100);
  const gamesForNextLevel = ((user.level || 1) * 100) - (user.games_played || 0);

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
      
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            onClick={onBack}
            className="bg-gray-800 hover:bg-gray-700 text-white"
            data-testid="back-to-dashboard-btn"
          >
            ← Back to Dashboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white neon-text mb-2">
              📊 Player Statistics
            </h1>
            <p className="text-gray-300">Your complete gaming profile</p>
          </div>
          
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>

        {/* Player Overview */}
        <Card className="neon-card mb-8">
          <CardHeader>
            <CardTitle className="text-center text-white text-2xl flex items-center justify-center space-x-2">
              <span>👤</span>
              <span>{user.username}</span>
              {user.vip_status && <span>👑</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  💰 {user.credits?.toFixed(0) || 0}
                </div>
                <div className="text-gray-300">Current Credits</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  🏆 {user.level || 1}
                </div>
                <div className="text-gray-300">Player Level</div>
                <div className="mt-2">
                  <Progress value={levelProgress} className="h-2" />
                  <div className="text-xs text-gray-400 mt-1">
                    {gamesForNextLevel > 0 ? `${gamesForNextLevel} games to next level` : 'Max level!'}
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  💎 {user.total_winnings?.toFixed(0) || 0}
                </div>
                <div className="text-gray-300">Total Winnings</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  🎮 {user.games_played || 0}
                </div>
                <div className="text-gray-300">Games Played</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Statistics */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Game Statistics */}
            <Card className="neon-card">
              <CardHeader>
                <CardTitle className="text-white text-xl">🎰 Game Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-white">
                  <span>Total Spins:</span>
                  <span className="font-bold text-cyan-400">{stats.stats.total_spins}</span>
                </div>
                
                <div className="flex justify-between text-white">
                  <span>Winning Spins:</span>
                  <span className="font-bold text-green-400">{stats.stats.total_wins}</span>
                </div>
                
                <div className="flex justify-between text-white">
                  <span>Win Rate:</span>
                  <span className="font-bold text-yellow-400">{stats.stats.win_rate}%</span>
                </div>
                
                <div className="flex justify-between text-white">
                  <span>Net Winnings:</span>
                  <span className={`font-bold ${stats.stats.net_winnings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.stats.net_winnings >= 0 ? '+' : ''}{stats.stats.net_winnings?.toFixed(0)}
                  </span>
                </div>
                
                <div className="mt-6">
                  <div className="text-white text-sm mb-2">Win Rate Progress</div>
                  <Progress value={stats.stats.win_rate} className="h-3" />
                  <div className="text-xs text-gray-400 mt-1">
                    {stats.stats.win_rate < 30 ? 'Keep playing!' : 
                     stats.stats.win_rate < 50 ? 'Good progress!' : 'Excellent win rate!'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="neon-card">
              <CardHeader>
                <CardTitle className="text-white text-xl">🕐 Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {stats.recent_spins.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No recent spins</p>
                  ) : (
                    stats.recent_spins.map((spin, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="text-sm text-gray-300">
                            {spin.reels ? spin.reels.join('') : '🎰'}
                          </div>
                          <div className="text-xs text-gray-400">
                            Bet: {spin.bet_amount}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${spin.is_win ? 'text-green-400' : 'text-red-400'}`}>
                            {spin.is_win ? `+${spin.payout?.toFixed(0)}` : `-${spin.bet_amount}`}
                          </div>
                          {spin.win_type && (
                            <div className="text-xs text-yellow-400 capitalize">
                              {spin.win_type}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Daily Bonus Info */}
            <Card className="neon-card">
              <CardHeader>
                <CardTitle className="text-white text-xl">🎁 Daily Bonus Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.can_claim_bonus ? (
                    <div className="text-center">
                      <div className="text-green-400 text-lg font-bold mb-2">✅ Bonus Available!</div>
                      <p className="text-gray-300">Your daily bonus is ready to claim.</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-orange-400 text-lg font-bold mb-2">⏰ Bonus Claimed</div>
                      {stats.next_daily_bonus && (
                        <p className="text-gray-300">
                          Next bonus: {new Date(stats.next_daily_bonus).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-blue-900/30 rounded-lg">
                    <div className="text-sm text-gray-300">
                      Daily bonus amount: <span className="text-yellow-400 font-bold">
                        {100 + ((user.level || 1) * 25)}{user.vip_status ? ' x2 (VIP)' : ''} credits
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="neon-card">
              <CardHeader>
                <CardTitle className="text-white text-xl">🏆 Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-3 rounded-lg ${user.games_played >= 10 ? 'bg-green-900/30' : 'bg-gray-800/30'}`}>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">🎯</span>
                      <div>
                        <div className="text-white font-bold">First Steps</div>
                        <div className="text-xs text-gray-400">Play 10 games</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {user.games_played >= 10 ? (
                        <span className="text-green-400 font-bold">✅ Complete</span>
                      ) : (
                        <span className="text-gray-400">{user.games_played}/10</span>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-3 rounded-lg ${user.games_played >= 100 ? 'bg-green-900/30' : 'bg-gray-800/30'}`}>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">🎮</span>
                      <div>
                        <div className="text-white font-bold">Dedicated Player</div>
                        <div className="text-xs text-gray-400">Play 100 games</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {user.games_played >= 100 ? (
                        <span className="text-green-400 font-bold">✅ Complete</span>
                      ) : (
                        <span className="text-gray-400">{user.games_played}/100</span>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-3 rounded-lg ${(user.total_winnings || 0) >= 1000 ? 'bg-green-900/30' : 'bg-gray-800/30'}`}>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">💰</span>
                      <div>
                        <div className="text-white font-bold">Big Winner</div>
                        <div className="text-xs text-gray-400">Win 1000+ credits</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {(user.total_winnings || 0) >= 1000 ? (
                        <span className="text-green-400 font-bold">✅ Complete</span>
                      ) : (
                        <span className="text-gray-400">{(user.total_winnings || 0).toFixed(0)}/1000</span>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-3 rounded-lg ${user.vip_status ? 'bg-green-900/30' : 'bg-gray-800/30'}`}>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">👑</span>
                      <div>
                        <div className="text-white font-bold">VIP Status</div>
                        <div className="text-xs text-gray-400">Reach level 5</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {user.vip_status ? (
                        <span className="text-green-400 font-bold">✅ Complete</span>
                      ) : (
                        <span className="text-gray-400">Level {user.level || 1}/5</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserStats;