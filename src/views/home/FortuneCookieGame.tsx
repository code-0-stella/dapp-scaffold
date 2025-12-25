import { FC, useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

// ==================== FORTUNE DATA ====================
const LUCKY_FORTUNES = [
  "A surprise gift is coming your way!",
  "Today is your lucky day!",
  "Good fortune will find you soon",
  "Wealth and happiness await",
  "Your dreams are about to come true",
  "A wonderful opportunity approaches",
  "Love and joy surround you",
  "Success is written in your stars",
  "Great news is on the horizon",
  "Fortune favors you today",
  "Prosperity knocks at your door",
  "Magic happens when you believe",
];

const UNLUCKY_FORTUNES = [
  "Be careful what you wish for...",
  "A storm is brewing nearby",
  "Watch your step today",
  "Not everything is as it seems",
  "Patience will be tested soon",
  "An unexpected challenge awaits",
  "Beware of false promises",
  "Trouble lurks around the corner",
  "Your luck has run dry today",
  "Dark clouds gather overhead",
  "Proceed with extreme caution",
  "The universe says: try again later",
];

// ==================== SOUND UTILITIES ====================
const playSound = (type: 'break' | 'win' | 'lose') => {
  const sounds = {
    break: ['/game/break_0.wav', '/game/break_1.wav'],
    win: ['/game/win_0.wav', '/game/win_1.wav'],
    lose: ['/game/lose_0.wav', '/game/lose_1.wav'],
  };
  const soundList = sounds[type];
  const randomSound = soundList[Math.floor(Math.random() * soundList.length)];
  const audio = new Audio(randomSound);
  audio.volume = 0.5;
  audio.play().catch(() => {});
};

// ==================== HINT GENERATOR ====================
const generateHint = (fortune: string): string => {
  const words = fortune.split(' ');
  const hintTypes = [
    `Starts with: "${words.slice(0, 2).join(' ')}..."`,
    `Contains: "${words[Math.floor(words.length / 2)]}"`,
    `Ends with: "...${words.slice(-2).join(' ')}"`,
    `${fortune.length} characters long`,
  ];
  return hintTypes[Math.floor(Math.random() * hintTypes.length)];
};

// ==================== GAME STATES ====================
type GameState = 'betting' | 'peeking' | 'revealing' | 'result' | 'gameover';

// ==================== MAIN GAME COMPONENT ====================
export const FortuneCookieGame: FC = () => {
  // Core game state
  const [points, setPoints] = useState(100);
  const [bet, setBet] = useState(10);
  const [round, setRound] = useState(1);
  const [bestScore, setBestScore] = useState(100);
  const [gameState, setGameState] = useState<GameState>('betting');
  
  // Current round state
  const [currentFortune, setCurrentFortune] = useState('');
  const [isLucky, setIsLucky] = useState(true);
  const [hasPeeked, setHasPeeked] = useState(false);
  const [hint, setHint] = useState('');
  const [lastResult, setLastResult] = useState<'win' | 'lose' | null>(null);
  const [pointsDelta, setPointsDelta] = useState(0);
  
  // Animation states
  const [cookieShake, setCookieShake] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  // Initialize a new round
  const initRound = useCallback(() => {
    const lucky = Math.random() < 0.5;
    const fortunes = lucky ? LUCKY_FORTUNES : UNLUCKY_FORTUNES;
    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    
    setIsLucky(lucky);
    setCurrentFortune(fortune);
    setHasPeeked(false);
    setHint('');
    setGameState('betting');
    setLastResult(null);
    setPointsDelta(0);
  }, []);

  // Start game on mount (only once)
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initRound();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [initRound]);

  // Clamp bet to available points
  useEffect(() => {
    if (bet > points) {
      setBet(Math.max(5, points));
    }
  }, [points, bet]);

  // Handle bet change with increment of 5
  const adjustBet = (delta: number) => {
    setBet(prev => {
      const newBet = prev + delta;
      if (newBet < 5) return 5;
      if (newBet > points) return points;
      return newBet;
    });
  };

  // Set bet to specific amount
  const setQuickBet = (amount: number | 'all') => {
    if (amount === 'all') {
      setBet(points);
    } else {
      setBet(Math.min(amount, points));
    }
  };

  // Handle peek action
  const handlePeek = () => {
    if (hasPeeked || points < 10 || gameState !== 'betting') return;
    
    setPoints(prev => prev - 10);
    setHasPeeked(true);
    setHint(generateHint(currentFortune));
    setGameState('peeking');
    
    timerRef.current = setTimeout(() => {
      setGameState('betting');
    }, 3000);
  };

  // Handle guess
  const handleGuess = (guessedLucky: boolean) => {
    if (gameState === 'revealing' || gameState === 'result' || gameState === 'gameover') return;
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    setCookieShake(true);
    setGameState('revealing');
    playSound('break');
    
    setTimeout(() => {
      setCookieShake(false);
      const won = guessedLucky === isLucky;
      const delta = won ? bet : -bet;
      
      setLastResult(won ? 'win' : 'lose');
      setPointsDelta(delta);
      
      const newPoints = points + delta;
      setPoints(newPoints);
      if (newPoints > bestScore) setBestScore(newPoints);
      
      if (won) {
        playSound('win');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      } else {
        playSound('lose');
      }
      
      setGameState('result');
      
      timerRef.current = setTimeout(() => {
        if (newPoints <= 0) {
          setGameState('gameover');
        } else {
          setRound(prev => prev + 1);
          initRound();
        }
      }, 2500);
    }, 800);
  };

  // Restart game
  const restartGame = () => {
    setPoints(100);
    setBet(10);
    setRound(1);
    setBestScore(100);
    initRound();
  };

  // Game Over Screen
  if (gameState === 'gameover') {
    return (
      <div 
        className="relative w-full h-full flex flex-col items-center justify-center p-4"
        style={{
          backgroundImage: 'url(/game/bg-game.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 flex flex-col items-center gap-2 text-center">
          <Image 
            src="/game/loss-reward.png" 
            alt="Game Over" 
            width={80}
            height={80}
            className="w-20 h-20 object-contain animate-pulse"
          />
          <h1 className="text-2xl font-bold text-red-500 animate-bounce">
            GAME OVER
          </h1>
          <div className="space-y-1">
            <p className="text-sm text-gray-300">
              You survived <span className="text-yellow-400 font-bold">{round}</span> rounds!
            </p>
            <p className="text-base text-yellow-400">
              Best Score: <span className="font-bold">{bestScore}</span> 💰
            </p>
          </div>
          <button
            onClick={restartGame}
            className="mt-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-purple-500/50"
          >
            🔄 PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  // Main Game Screen
  return (
    <div 
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        backgroundImage: 'url(/game/bg-game.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute text-lg animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            >
              {['🎉', '✨', '🍀', '💰', '⭐'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}
      
      <div className="relative z-10 flex flex-col h-full p-2 justify-between">
        
        {/* HEADER - Points Display */}
        <div className="flex justify-between items-center">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 border border-yellow-500/30">
            <p className="text-[9px] text-gray-400 uppercase tracking-wide">Points</p>
            <p className="text-lg font-bold text-yellow-400 flex items-center gap-1">
              💰 {points}
              {pointsDelta !== 0 && (
                <span className={`text-xs ml-1 animate-pulse ${pointsDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pointsDelta > 0 ? '+' : ''}{pointsDelta}
                </span>
              )}
            </p>
          </div>
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-purple-500/30 text-right">
            <p className="text-[9px] text-gray-400">Round</p>
            <p className="text-base font-bold text-purple-400">{round}</p>
          </div>
        </div>

        {/* COOKIE AREA */}
        <div className="flex-1 flex flex-col items-center justify-center py-1">
          <div className={`relative transition-transform duration-200 ${cookieShake ? 'animate-shake' : 'animate-float'}`}>
            <Image
              src={gameState === 'result' ? '/game/cookie-cracked.png' : '/game/cookie-whole.png'}
              alt="Fortune Cookie"
              width={100}
              height={100}
              className="w-24 h-24 object-contain drop-shadow-2xl"
              style={{
                filter: 'drop-shadow(0 0 15px rgba(255, 200, 0, 0.5))',
              }}
            />
            
            {gameState === 'result' && lastResult && (
              <Image
                src={lastResult === 'win' ? '/game/win-reward.png' : '/game/loss-reward.png'}
                alt={lastResult === 'win' ? 'Winner!' : 'Lost'}
                width={48}
                height={48}
                className="absolute -top-4 -right-4 w-12 h-12 object-contain animate-bounce"
              />
            )}
          </div>

          {gameState === 'result' && (
            <div className={`mt-2 p-2 rounded-lg max-w-[240px] text-center ${
              isLucky ? 'bg-green-900/80 border border-green-500' : 'bg-red-900/80 border border-red-500'
            }`}>
              <p className={`text-[10px] uppercase tracking-wide mb-0.5 ${isLucky ? 'text-green-400' : 'text-red-400'}`}>
                {isLucky ? '🍀 LUCKY' : '💀 UNLUCKY'}
              </p>
              <p className="text-white italic text-xs">&ldquo;{currentFortune}&rdquo;</p>
              <p className={`mt-1 text-sm font-bold ${lastResult === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                {lastResult === 'win' ? `YOU WON +${bet}! 🎉` : `YOU LOST -${bet} 😢`}
              </p>
            </div>
          )}

          {(gameState === 'peeking' || (hasPeeked && gameState === 'betting')) && hint && (
            <div className="mt-2 p-1.5 bg-purple-900/80 rounded-lg border border-purple-400 max-w-[220px]">
              <p className="text-[9px] text-purple-300 uppercase mb-0.5">👁️ Peek Hint:</p>
              <p className="text-purple-200 text-[10px] italic">{hint}</p>
            </div>
          )}
        </div>

        {/* BETTING SECTION */}
        {(gameState === 'betting' || gameState === 'peeking') && (
          <div className="space-y-1.5">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 border border-white/10">
              <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1.5 text-center">Your Bet</p>
              
              <div className="flex justify-center gap-1.5 mb-1.5">
                <button
                  onClick={() => setQuickBet(10)}
                  disabled={10 > points}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    bet === 10 
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-md shadow-yellow-500/50 scale-105' 
                      : 10 > points
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                        : 'bg-gray-800 text-yellow-400 hover:bg-gray-700 border border-yellow-500/30'
                  }`}
                >
                  10
                </button>
                <button
                  onClick={() => setQuickBet(25)}
                  disabled={25 > points}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    bet === 25 
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-md shadow-yellow-500/50 scale-105' 
                      : 25 > points
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                        : 'bg-gray-800 text-yellow-400 hover:bg-gray-700 border border-yellow-500/30'
                  }`}
                >
                  25
                </button>
                <button
                  onClick={() => setQuickBet(50)}
                  disabled={50 > points}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    bet === 50 
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-md shadow-yellow-500/50 scale-105' 
                      : 50 > points
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                        : 'bg-gray-800 text-yellow-400 hover:bg-gray-700 border border-yellow-500/30'
                  }`}
                >
                  50
                </button>
                <button
                  onClick={() => setQuickBet('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    bet === points 
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md shadow-red-500/50 scale-105' 
                      : 'bg-gray-800 text-red-400 hover:bg-gray-700 border border-red-500/30'
                  }`}
                >
                  🎰 ALL
                </button>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => adjustBet(-5)}
                  disabled={bet <= 5}
                  className={`w-6 h-6 rounded-full font-bold text-sm transition-all ${
                    bet <= 5
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-800 text-yellow-400 hover:bg-gray-700 border border-yellow-500/30 active:scale-95'
                  }`}
                >
                  -
                </button>
                <div className="bg-black/80 rounded px-3 py-1 border border-yellow-500/50 min-w-[60px] text-center">
                  <span className="text-base font-bold text-yellow-400">{bet}</span>
                </div>
                <button
                  onClick={() => adjustBet(5)}
                  disabled={bet >= points}
                  className={`w-6 h-6 rounded-full font-bold text-sm transition-all ${
                    bet >= points
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-800 text-yellow-400 hover:bg-gray-700 border border-yellow-500/30 active:scale-95'
                  }`}
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handlePeek}
              disabled={hasPeeked || points < 10 || gameState !== 'betting'}
              className={`w-full py-1.5 rounded-lg font-bold text-xs transition-all ${
                hasPeeked || points < 10
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-[1.02] shadow-md shadow-purple-500/30'
              }`}
            >
              👁️ PEEK -10 {hasPeeked && '✓'}
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => handleGuess(true)}
                disabled={gameState !== 'betting' && gameState !== 'peeking'}
                className="flex-1 py-2 rounded-lg font-bold text-sm bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:scale-[1.02] transition-transform shadow-md shadow-green-500/30 active:scale-95"
              >
                🍀 LUCKY
              </button>
              <button
                onClick={() => handleGuess(false)}
                disabled={gameState !== 'betting' && gameState !== 'peeking'}
                className="flex-1 py-2 rounded-lg font-bold text-sm bg-gradient-to-br from-red-500 to-rose-600 text-white hover:scale-[1.02] transition-transform shadow-md shadow-red-500/30 active:scale-95"
              >
                💀 UNLUCKY
              </button>
            </div>
          </div>
        )}

        {gameState === 'revealing' && (
          <div className="text-center py-3">
            <p className="text-base text-yellow-400 animate-pulse">🥠 Cracking open...</p>
          </div>
        )}

        {gameState === 'result' && (
          <div className="text-center py-2">
            <p className="text-xs text-gray-400 animate-pulse">Next round starting...</p>
          </div>
        )}

        <div className="flex justify-center gap-3 text-[9px] text-gray-500">
          <span>Best: {bestScore} 💰</span>
          <span>|</span>
          <span>Bet: {bet} pts</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          20% { transform: translateX(-10px) rotate(-5deg); }
          40% { transform: translateX(10px) rotate(5deg); }
          60% { transform: translateX(-10px) rotate(-5deg); }
          80% { transform: translateX(10px) rotate(5deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default FortuneCookieGame;
