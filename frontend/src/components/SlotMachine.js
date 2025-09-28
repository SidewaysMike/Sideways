import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SlotMachine = ({ user, onUpdateUser, onBack, soundManager, slotType = 'classic_3_reel' }) => {
  const [gameState, setGameState] = useState({
    reels: slotType === 'classic_3_reel' ? ['🍒', '🍋', '🍊'] : ['🍒', '🍋', '🍊', '⭐', '🔔'],
    isSpinning: false,
    betAmount: 10,
    lastWin: 0,
    winType: null,
    freeSpinsRemaining: 0,
    bonusMultiplier: 1
  });
  
  const [gameHistory, setGameHistory] = useState([]);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const spinButtonRef = useRef(null);

  const slotConfig = {
    classic_3_reel: {
      name: 'Classic 3-Reel Slots',
      icon: '🎰',
      reelCount: 3,
      minBet: 5,
      maxBet: 100
    },
    video_5_reel: {
      name: 'Video 5-Reel Slots',
      icon: '🎮', 
      reelCount: 5,
      minBet: 10,
      maxBet: 200
    },
    bonus_slots: {
      name: 'Bonus Feature Slots',
      icon: '🎁',
      reelCount: 5,
      minBet: 15,
      maxBet: 300
    }
  };

  const config = slotConfig[slotType];

  useEffect(() => {
    // Initialize reel count based on slot type
    const initialReels = slotType === 'classic_3_reel' 
      ? ['🍒', '🍋', '🍊'] 
      : ['🍒', '🍋', '🍊', '⭐', '🔔'];
    
    setGameState(prev => ({
      ...prev,
      reels: initialReels,
      betAmount: config.minBet
    }));
  }, [slotType]);

  const handleSpin = async () => {
    if (gameState.isSpinning) return;
    
    // Check if user has enough credits
    if (user.credits < gameState.betAmount) {
      toast.error('Insufficient credits! You need more coins to play.');
      soundManager.play('lose');
      return;
    }

    try {
      setGameState(prev => ({ ...prev, isSpinning: true, lastWin: 0, winType: null }));
      
      // Play spin sound
      soundManager.play('spin');
      
      // Simulate spinning animation
      const spinDuration = 2000 + Math.random() * 1000; // 2-3 seconds
      
      // Call backend API
      const response = await axios.post(`${API}/spin`, {
        user_id: user.id,
        slot_type: slotType,
        bet_amount: gameState.betAmount
      });
      
      const result = response.data;
      
      // Wait for spin animation
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          isSpinning: false,
          reels: result.reels,
          lastWin: result.payout,
          winType: result.win_type,
          freeSpinsRemaining: prev.freeSpinsRemaining + result.free_spins_awarded,
          bonusMultiplier: result.multiplier
        }));
        
        // Update user credits
        const newCredits = user.credits - gameState.betAmount + result.payout;
        onUpdateUser({ 
          credits: newCredits,
          total_winnings: (user.total_winnings || 0) + result.payout,
          games_played: (user.games_played || 0) + 1
        });
        
        // Add to game history
        setGameHistory(prev => [{
          id: Date.now(),
          reels: result.reels,
          bet: gameState.betAmount,
          win: result.payout,
          winType: result.win_type,
          timestamp: new Date()
        }, ...prev.slice(0, 9)]); // Keep last 10 games
        
        // Handle win/lose sounds and animations
        if (result.payout > 0) {
          if (result.win_type === 'jackpot') {
            soundManager.play('jackpot');
            setShowWinAnimation(true);
            setTimeout(() => setShowWinAnimation(false), 3000);
            toast.success(`🎉 JACKPOT! You won ${result.payout.toFixed(0)} credits!`);
          } else {
            soundManager.play('win');
            toast.success(`🎰 You won ${result.payout.toFixed(0)} credits!`);
          }
        } else {
          soundManager.play('lose');
        }
        
        // Handle bonus features
        if (result.bonus_triggered) {
          toast.success('🎁 Bonus round triggered!');
        }
        
        if (result.free_spins_awarded > 0) {
          toast.success(`🌟 ${result.free_spins_awarded} free spins awarded!`);
        }
        
      }, spinDuration);
      
    } catch (error) {
      console.error('Spin error:', error);
      setGameState(prev => ({ ...prev, isSpinning: false }));
      toast.error('Spin failed. Please try again.');
      soundManager.play('lose');
    }
  };

  const handleBetChange = (value) => {
    if (!gameState.isSpinning) {
      setGameState(prev => ({ ...prev, betAmount: value[0] }));
      soundManager.play('button');
    }
  };

  const getWinTypeColor = (winType) => {
    switch (winType) {
      case 'jackpot': return 'bg-gradient-to-r from-yellow-400 to-orange-500';
      case 'big': return 'bg-gradient-to-r from-green-400 to-blue-500';
      case 'medium': return 'bg-gradient-to-r from-blue-400 to-purple-500';
      case 'small': return 'bg-gradient-to-r from-purple-400 to-pink-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen p-4">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1660224328101-a5760747fb37)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.3)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-purple-900/40 to-black/70 z-0" />
      
      {/* Win Animation Overlay */}
      {showWinAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center win-celebration">
            <div className="jackpot-text mb-4">🎉 JACKPOT! 🎉</div>
            <div className="text-4xl text-yellow-400 font-bold">
              {gameState.lastWin.toFixed(0)} CREDITS!
            </div>
          </div>
        </div>
      )}
      
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            onClick={onBack}
            className="bg-gray-800 hover:bg-gray-700 text-white"
            data-testid="back-to-dashboard-btn"
          >
            ← Back to Dashboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white flex items-center justify-center space-x-2">
              <span>{config.icon}</span>
              <span>{config.name}</span>
            </h1>
            <p className="text-gray-300">Spin to win big!</p>
          </div>
          
          <div className="text-right">
            <div className="text-white text-lg">💰 Credits: <span className="font-bold text-yellow-400">{user.credits?.toFixed(0) || 0}</span></div>
            {gameState.freeSpinsRemaining > 0 && (
              <div className="free-spins-display mt-2">
                🌟 Free Spins: {gameState.freeSpinsRemaining}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Slot Machine */}
          <div className="lg:col-span-2">
            <Card className="neon-card">
              <CardHeader>
                <CardTitle className="text-center text-white text-xl">
                  🎰 Slot Machine
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Reels Display */}
                <div className={`grid ${config.reelCount === 3 ? 'grid-cols-3' : 'grid-cols-5'} gap-4 mb-6`}>
                  {gameState.reels.map((symbol, index) => (
                    <div 
                      key={index}
                      className={`slot-reel h-24 flex items-center justify-center text-4xl font-bold ${gameState.isSpinning ? 'spinning' : ''}`}
                      data-testid={`reel-${index}`}
                    >
                      {symbol}
                    </div>
                  ))}
                </div>

                {/* Win Display */}
                {gameState.lastWin > 0 && (
                  <div className="text-center mb-4">
                    <div className="payout-display inline-block">
                      🎉 WIN: {gameState.lastWin.toFixed(0)} CREDITS! 🎉
                    </div>
                    {gameState.winType && (
                      <Badge className={`ml-2 ${getWinTypeColor(gameState.winType)} text-white font-bold`}>
                        {gameState.winType.toUpperCase()}
                      </Badge>
                    )}
                    {gameState.bonusMultiplier > 1 && (
                      <div className="bonus-badge mt-2">
                        {gameState.bonusMultiplier}x MULTIPLIER!
                      </div>
                    )}
                  </div>
                )}

                {/* Bet Controls */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-white text-sm font-bold mb-2">
                      Bet Amount: <span className="text-yellow-400">{gameState.betAmount} credits</span>
                    </label>
                    <Slider
                      value={[gameState.betAmount]}
                      onValueChange={handleBetChange}
                      min={config.minBet}
                      max={Math.min(config.maxBet, user.credits || 0)}
                      step={5}
                      className="w-full"
                      disabled={gameState.isSpinning}
                      data-testid="bet-slider"
                    />
                    <div className="flex justify-between text-sm text-gray-400 mt-1">
                      <span>Min: {config.minBet}</span>
                      <span>Max: {Math.min(config.maxBet, user.credits || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Spin Button */}
                <Button
                  ref={spinButtonRef}
                  onClick={handleSpin}
                  disabled={gameState.isSpinning || user.credits < gameState.betAmount}
                  className="w-full h-16 text-xl neon-button"
                  data-testid="spin-btn"
                >
                  {gameState.isSpinning ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>SPINNING...</span>
                    </div>
                  ) : gameState.freeSpinsRemaining > 0 ? (
                    '🌟 FREE SPIN'
                  ) : (
                    `🎰 SPIN (${gameState.betAmount} credits)`
                  )}
                </Button>

                {user.credits < gameState.betAmount && (
                  <p className="text-center text-red-400 mt-2 text-sm">
                    💸 Not enough credits! Lower your bet or get more coins.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Game Stats */}
            <Card className="neon-card">
              <CardHeader>
                <CardTitle className="text-white text-lg">📊 Session Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-white">
                  <span>Games Played:</span>
                  <span className="font-bold">{gameHistory.length}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>Total Wagered:</span>
                  <span className="font-bold">{gameHistory.reduce((sum, game) => sum + game.bet, 0)}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>Total Won:</span>
                  <span className="font-bold text-green-400">{gameHistory.reduce((sum, game) => sum + game.win, 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>Win Rate:</span>
                  <span className="font-bold">
                    {gameHistory.length > 0 
                      ? `${((gameHistory.filter(g => g.win > 0).length / gameHistory.length) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Spins */}
            <Card className="neon-card">
              <CardHeader>
                <CardTitle className="text-white text-lg">🕐 Recent Spins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {gameHistory.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No spins yet</p>
                  ) : (
                    gameHistory.map((game) => (
                      <div key={game.id} className="flex items-center justify-between p-2 bg-black/30 rounded">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm">{game.reels.join('')}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${game.win > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {game.win > 0 ? `+${game.win.toFixed(0)}` : `-${game.bet}`}
                          </div>
                          {game.winType && (
                            <Badge className={`text-xs ${getWinTypeColor(game.winType)}`}>
                              {game.winType}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Paytable */}
            <Card className="neon-card">
              <CardHeader>
                <CardTitle className="text-white text-lg">💰 Paytable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {slotType === 'classic_3_reel' ? (
                    <>
                      <div className="flex justify-between text-white">
                        <span>💎💎💎</span>
                        <span className="text-yellow-400 font-bold">1000x</span>
                      </div>
                      <div className="flex justify-between text-white">
                        <span>7️⃣7️⃣7️⃣</span>
                        <span className="text-green-400 font-bold">500x</span>
                      </div>
                      <div className="flex justify-between text-white">
                        <span>⭐⭐⭐</span>
                        <span className="text-blue-400 font-bold">100x</span>
                      </div>
                      <div className="flex justify-between text-white">
                        <span>🔔🔔🔔</span>
                        <span className="text-purple-400 font-bold">50x</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-white">
                        <span>👑👑👑👑👑</span>
                        <span className="text-yellow-400 font-bold">5000x</span>
                      </div>
                      <div className="flex justify-between text-white">
                        <span>💎💎💎💎💎</span>
                        <span className="text-green-400 font-bold">2500x</span>
                      </div>
                      <div className="flex justify-between text-white">
                        <span>💰💰💰💰💰</span>
                        <span className="text-blue-400 font-bold">1000x</span>
                      </div>
                      <div className="flex justify-between text-white">
                        <span>🎁 Bonus Symbol</span>
                        <span className="text-orange-400 font-bold">Free Spins</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotMachine;