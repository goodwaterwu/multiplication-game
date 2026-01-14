import { useState, useEffect, useRef } from 'react';
import { generateQuestions, MAX_HEARTS, TOTAL_LEVELS, type Question } from '@/lib/game';
import { audio } from '@/lib/audio';
import { Button } from '@/components/ui/button';
import { Heart, RefreshCw, Play, ArrowRight, ArrowLeft, Timer as TimerIcon, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

type GameState = 'menu' | 'playing' | 'level_complete' | 'game_over' | 'victory';

export default function Game() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [level, setLevel] = useState(1);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const [timer, setTimer] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showVictoryButton, setShowVictoryButton] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Background Music Control
  useEffect(() => {
    if (gameState === 'playing' && !isMuted) {
      audio.startBGM();
    } else {
      audio.stopBGM();
    }
    return () => audio.stopBGM();
  }, [gameState, isMuted]);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameState === 'playing') {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // Initialize Level
  const startLevel = (lvl: number, initialHearts: number) => {
    // Note: audio.resume() should be called by the event handler invoking this
    audio.playClick();
    
    const qs = generateQuestions(lvl);
    setQuestions(qs);
    setCurrentQuestionIndex(0);
    setHearts(initialHearts);
    setCorrectCount(0);
    setWrongCount(0);
    setGameState('playing');
    setUserAnswer('');
    setFeedback('none');
    setTimer(0);
    setIsProcessing(false);
    setLevel(lvl);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleStartGame = async () => {
    await audio.resume(); // Force resume audio context on first interaction
    startLevel(1, MAX_HEARTS);
  };

  const handleNextLevel = () => {
    // Logic: Keep hearts, +1 bonus, max 3
    const nextHearts = Math.min(hearts + 1, MAX_HEARTS);
    startLevel(level + 1, nextHearts);
  };

  const handleRestartLevel = () => {
    // Restarting level resets hearts to full (fresh attempt)
    startLevel(level, MAX_HEARTS);
  };

  const handleRestartGame = () => {
    startLevel(1, MAX_HEARTS);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleAnswer = (answerStr: string) => {
    if (gameState !== 'playing' || isProcessing) return;
    
    if (!answerStr) return;

    const val = parseInt(answerStr);
    if (isNaN(val)) return;

    setIsProcessing(true); // Lock input

    const currentQ = questions[currentQuestionIndex];
    const correctAnswer = currentQ.a * currentQ.b;
    const isCorrect = val === correctAnswer;

    // Local variable to track the *updated* hearts for game over check
    // If wrong, hearts will decrease by 1
    const nextHearts = isCorrect ? hearts : hearts - 1;

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setFeedback('correct');
      if (!isMuted) audio.playCorrect();
    } else {
      setHearts(prev => prev - 1);
      setWrongCount(prev => prev + 1);
      setFeedback('wrong');
      if (!isMuted) audio.playWrong();
    }

    // Delay for feedback animation
    setTimeout(() => {
      setFeedback('none');
      setUserAnswer('');
      setIsProcessing(false);
      
      // Check Game Over condition with *nextHearts*
      if (!isCorrect && nextHearts <= 0) {
        setGameState('game_over');
        if (!isMuted) audio.playGameOver();
        return;
      } 
      
      // Check Level Complete condition
      if (currentQuestionIndex >= questions.length - 1) {
        if (level >= TOTAL_LEVELS) {
            setGameState('victory');
            setShowVictoryButton(false);
            if (!isMuted) audio.playVictory();
            setTimeout(() => setShowVictoryButton(true), 10000);
        } else {
            setGameState('level_complete');
            if (!isMuted) audio.playLevelComplete();
        }
      } else {
        // Next Question
        setCurrentQuestionIndex(prev => prev + 1);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnswer(userAnswer);
    }
  };

  const onNumpadClick = (num: number) => {
    if (!isMuted) audio.playClick();
    if (userAnswer.length < 3) {
      setUserAnswer(prev => prev + num.toString());
    }
  };

  const onBackspace = () => {
    if (!isMuted) audio.playClick();
    setUserAnswer(prev => prev.slice(0, -1));
  };

  // Render Helpers
  const currentQ = questions[currentQuestionIndex];

  // Format Timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative z-10 w-full h-[100dvh] flex flex-col items-center justify-between py-2 md:py-4 overflow-hidden">
      
      {/* HUD */}
      <div className={cn(
        "w-full max-w-2xl px-4 transition-opacity duration-300",
        gameState === 'playing' ? "opacity-100" : "opacity-0 pointer-events-none absolute"
      )}>
        <div className="flex justify-between items-center p-2 md:p-4 bg-black/50 border border-primary rounded-lg backdrop-blur-md box-shadow-neon">
          <div className="flex items-center gap-4">
            <div className="text-sm md:text-xl arcade-font text-primary whitespace-nowrap">LEVEL {level}</div>
            <div className="flex gap-1">
              {[...Array(MAX_HEARTS)].map((_, i) => (
                <Heart 
                  key={i} 
                  className={cn(
                    "w-5 h-5 md:w-8 md:h-8 transition-all", 
                    i < hearts ? "fill-destructive text-destructive" : "text-gray-700"
                  )} 
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={toggleMute} className="text-primary hover:text-primary/80">
                {isMuted ? <VolumeX /> : <Volume2 />}
             </Button>
            <div className="flex items-center gap-2 text-yellow-400 arcade-font text-sm md:text-xl">
              <TimerIcon className="w-4 h-4 md:w-6 md:h-6" />
              {formatTime(timer)}
            </div>
            <div className="text-sm md:text-xl arcade-font text-foreground w-16 text-right">
              {questions.length > 0 ? `${currentQuestionIndex + 1}/${questions.length}` : '0/0'}
            </div>
          </div>
        </div>
      </div>

      {/* CENTER CONTENT */}
      <div className="flex-1 w-full max-w-2xl flex items-center justify-center p-4">
        
        {/* MENU */}
        {gameState === 'menu' && (
          <Card className="w-full max-w-md p-4 md:p-8 bg-black/80 border-primary border-2 box-shadow-neon text-center animate-in zoom-in duration-300">
            <h1 className="text-lg md:text-[28px] font-bold mb-4 md:mb-8 text-primary arcade-font leading-relaxed text-shadow-neon">
              MULTIPLICATION<br/>ARCADE
            </h1>
            <Button 
              onClick={handleStartGame} 
              size="lg" 
              className="text-lg px-6 py-4 md:px-8 md:py-6 arcade-font bg-primary hover:bg-primary/80 text-black animate-pulse"
            >
              <Play className="mr-2 w-6 h-6" /> START GAME
            </Button>
            <div className="mt-4">
                <Button variant="ghost" onClick={toggleMute} className="text-muted-foreground">
                    {isMuted ? "Sound Off" : "Sound On"}
                </Button>
            </div>
          </Card>
        )}

        {/* PLAYING */}
        {gameState === 'playing' && currentQ && (
          <div className="flex flex-col items-center w-full">
            <div className={cn(
                "text-5xl md:text-6xl lg:text-7xl font-bold mb-2 md:mb-6 arcade-font transition-all duration-300 select-none",
                feedback === 'correct' ? "text-green-400 scale-110" : 
                feedback === 'wrong' ? "text-red-500 shake" : "text-foreground"
            )}>
                {currentQ.a} × {currentQ.b}
            </div>
            
            <div className="text-3xl md:text-5xl font-bold mb-4 md:mb-8 arcade-font text-primary">
               = ?
            </div>

            <div className="h-14 w-32 md:h-16 md:w-40 bg-black/50 border-2 border-foreground rounded flex items-center justify-center text-3xl md:text-4xl font-mono text-primary mb-2">
                {userAnswer}<span className="animate-pulse">_</span>
            </div>
            
            <input 
                ref={inputRef}
                className="opacity-0 absolute" 
                value={userAnswer}
                onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val) && val.length <= 3) setUserAnswer(val);
                }}
                onKeyDown={handleKeyDown}
                autoFocus
                disabled={isProcessing}
                inputMode="none" 
            />
          </div>
        )}

        {/* LEVEL COMPLETE */}
        {gameState === 'level_complete' && (
          <Card className="w-full max-w-md p-4 md:p-8 bg-black/80 border-green-400 border-2 box-shadow-neon text-center animate-in zoom-in">
            <h2 className="text-xl md:text-3xl font-bold mb-4 md:mb-6 text-green-400 arcade-font">
              你好棒<br/>EXCELLENT!
            </h2>
            <div className="space-y-2 mb-6 md:mb-8">
              <div className="text-lg md:text-xl font-mono">
                Correct: {correctCount}
              </div>
              <div className="text-lg md:text-xl font-mono text-destructive">
                Wrong: {wrongCount}
              </div>
              <div className="text-lg md:text-xl font-mono border-t border-gray-700 pt-2 mt-2">
                Total Answered: {correctCount + wrongCount} / {questions.length}
              </div>
              <div className="text-lg md:text-xl font-mono text-yellow-400">
                Time: {formatTime(timer)}
              </div>
            </div>
            <div className="flex flex-col gap-3 md:gap-4">
              <Button 
                onClick={handleRestartLevel} 
                variant="outline"
                className="w-full text-base md:text-lg py-4 md:py-6 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black arcade-font"
              >
                <RefreshCw className="mr-2" /> RESTART LEVEL
              </Button>
              <Button 
                onClick={handleNextLevel} 
                className="w-full text-base md:text-lg py-4 md:py-6 bg-green-500 hover:bg-green-600 text-black arcade-font"
              >
                NEXT LEVEL <ArrowRight className="ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* GAME OVER */}
        {gameState === 'game_over' && (
          <Card className="w-full max-w-md p-4 md:p-8 bg-black/80 border-destructive border-2 box-shadow-neon text-center animate-in zoom-in">
            <h2 className="text-2xl md:text-4xl font-bold mb-4 md:mb-6 text-destructive arcade-font">
              請再加油<br/>WHAT A PITY!
            </h2>
            <div className="text-lg md:text-2xl mb-4 md:mb-8 text-muted-foreground">
              Level {level} Failed
            </div>
             <div className="text-lg md:text-xl font-mono text-yellow-400 mb-4">
                Time: {formatTime(timer)}
              </div>
            <Button 
              onClick={handleRestartGame} 
              className="w-full text-base md:text-lg py-4 md:py-6 bg-primary hover:bg-primary/80 text-black arcade-font"
            >
              <RefreshCw className="mr-2" /> RESTART GAME
            </Button>
          </Card>
        )}
        
        {/* VICTORY */}
        {gameState === 'victory' && (
          <Card className="w-full max-w-md p-4 md:p-8 bg-black/80 border-primary border-2 box-shadow-neon text-center animate-in zoom-in">
            <h2 className={cn(
              "font-bold mb-4 md:mb-6 text-primary arcade-font animate-pulse transition-all duration-1000",
              showVictoryButton ? "text-2xl md:text-5xl" : "text-4xl md:text-7xl scale-110"
            )}>
              CONGRATULATIONS!
            </h2>
            <p className="text-lg md:text-xl mb-6 md:mb-8">You mastered the Multiplication Tables!</p>
            <div className="text-xl mb-8 text-yellow-400">
               Total Time: {formatTime(timer)}
            </div>
            
            {showVictoryButton ? (
              <Button 
                onClick={handleRestartGame} 
                className="w-full text-base md:text-lg py-4 md:py-6 bg-primary hover:bg-primary/80 text-black arcade-font animate-in fade-in duration-1000"
              >
                <RefreshCw className="mr-2" /> PLAY AGAIN
              </Button>
            ) : (
              <div className="h-16 flex items-center justify-center text-muted-foreground animate-pulse">
                ... CELEBRATING ...
              </div>
            )}
          </Card>
        )}
      </div>

      {/* NUMPAD */}
      {gameState === 'playing' && (
        <div className="w-full max-w-2xl px-4 pb-[17vh] shrink-0">
            <div className="grid grid-cols-3 gap-2 md:gap-4 w-full max-w-xs md:max-w-sm mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <Button 
                        key={num}
                        onClick={() => onNumpadClick(num)}
                        variant="outline"
                        className="h-12 md:h-14 lg:h-16 text-xl md:text-3xl font-bold border-primary text-primary hover:bg-primary hover:text-black transition-colors"
                        disabled={isProcessing}
                    >
                        {num}
                    </Button>
                ))}
                <Button 
                    onClick={onBackspace}
                    variant="destructive"
                    className="h-12 md:h-14 lg:h-16 text-lg font-bold flex flex-col items-center justify-center leading-none"
                    disabled={isProcessing}
                >
                    <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 mb-1" />
                    <span className="text-[10px] md:text-xs">DEL</span>
                </Button>
                <Button 
                    onClick={() => onNumpadClick(0)}
                    variant="outline"
                    className="h-12 md:h-14 lg:h-16 text-xl md:text-3xl font-bold border-primary text-primary hover:bg-primary hover:text-black"
                    disabled={isProcessing}
                >
                    0
                </Button>
                <Button 
                    onClick={() => handleAnswer(userAnswer)}
                    className="h-12 md:h-14 lg:h-16 text-base md:text-lg font-bold bg-green-500 hover:bg-green-600 text-black"
                    disabled={isProcessing}
                >
                    ENTER
                </Button>
            </div>
        </div>
      )}

    </div>
  );
}
