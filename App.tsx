import React, { useState, useEffect, useCallback } from 'react';
import { GameStage, Player, Role, GameSettings, WordPair } from './types';
import { generateGameWords } from './services/geminiService';
import { Button } from './components/Button';
import { RefreshCw, Users, Eye, EyeOff, Skull, Crown, AlertTriangle } from 'lucide-react';

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 12;

const App: React.FC = () => {
  const [stage, setStage] = useState<GameStage>(GameStage.SETUP);
  const [settings, setSettings] = useState<GameSettings>({
    totalPlayers: 6,
    spyCount: 1,
    topic: ''
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [words, setWords] = useState<WordPair | null>(null);
  const [currentPlayerReveal, setCurrentPlayerReveal] = useState<number>(0);
  const [isRevealingWord, setIsRevealingWord] = useState<boolean>(false);
  const [winner, setWinner] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 新增：用于控制确认弹窗的状态
  const [confirmKillId, setConfirmKillId] = useState<number | null>(null);

  // -- LOGIC: Setup & Start --

  const handleStartGame = async () => {
    setStage(GameStage.LOADING);
    setError(null);
    try {
      const generatedWords = await generateGameWords(settings.topic);
      setWords(generatedWords);
      initializePlayers(generatedWords);
      setStage(GameStage.REVEAL);
    } catch (e) {
      setError("生成词语失败，请重试");
      setStage(GameStage.SETUP);
    }
  };

  const initializePlayers = (gameWords: WordPair) => {
    const newPlayers: Player[] = [];
    // Create array of roles
    const roles: Role[] = Array(settings.totalPlayers).fill(Role.CIVILIAN);
    for (let i = 0; i < settings.spyCount; i++) {
      roles[i] = Role.SPY;
    }
    
    // Shuffle roles (Fisher-Yates)
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // Assign to players
    for (let i = 0; i < settings.totalPlayers; i++) {
      newPlayers.push({
        id: i + 1,
        role: roles[i],
        word: roles[i] === Role.SPY ? gameWords.spy : gameWords.civilian,
        isAlive: true,
        isRevealed: false
      });
    }
    setPlayers(newPlayers);
    setCurrentPlayerReveal(0);
  };

  // -- LOGIC: Reveal Phase --

  const handleRevealNext = () => {
    setIsRevealingWord(false);
    if (currentPlayerReveal < players.length - 1) {
      setCurrentPlayerReveal(prev => prev + 1);
    } else {
      setStage(GameStage.PLAYING);
    }
  };

  // -- LOGIC: Gameplay Phase --

  const handleKillPlayer = (playerId: number) => {
    const updatedPlayers = players.map(p => 
      p.id === playerId ? { ...p, isAlive: false } : p
    );
    setPlayers(updatedPlayers);
    checkWinCondition(updatedPlayers);
  };

  const checkWinCondition = (currentPlayers: Player[]) => {
    const activeSpies = currentPlayers.filter(p => p.role === Role.SPY && p.isAlive).length;
    const activeCivilians = currentPlayers.filter(p => p.role === Role.CIVILIAN && p.isAlive).length;

    if (activeSpies === 0) {
      setWinner(Role.CIVILIAN);
      setStage(GameStage.GAME_OVER);
    } else if (activeSpies >= activeCivilians) {
      setWinner(Role.SPY);
      setStage(GameStage.GAME_OVER);
    }
  };

  const handleRestart = () => {
    setStage(GameStage.SETUP);
    setPlayers([]);
    setWords(null);
    setWinner(null);
    setCurrentPlayerReveal(0);
    setError(null);
    setConfirmKillId(null);
  };

  // -- RENDERING --

  const renderSetup = () => (
    <div className="max-w-md mx-auto space-y-8 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
          谁是卧底
        </h1>
        <p className="text-gray-400">AI 出题 • 聚会神器</p>
      </div>

      <div className="space-y-6 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 backdrop-blur-sm">
        <div className="space-y-2">
          <label className="flex justify-between text-sm font-medium text-gray-300">
            <span>玩家人数</span>
            <span className="text-purple-400">{settings.totalPlayers} 人</span>
          </label>
          <input
            type="range"
            min={MIN_PLAYERS}
            max={MAX_PLAYERS}
            value={settings.totalPlayers}
            onChange={(e) => {
              const count = parseInt(e.target.value);
              setSettings(s => ({ 
                ...s, 
                totalPlayers: count,
                // Ensure spies usually < half players, simple heuristic
                spyCount: Math.min(s.spyCount, Math.floor((count - 1) / 2)) || 1
              }));
            }}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        <div className="space-y-2">
          <label className="flex justify-between text-sm font-medium text-gray-300">
            <span>卧底人数</span>
            <span className="text-pink-400">{settings.spyCount} 人</span>
          </label>
          <input
            type="range"
            min={1}
            max={Math.floor((settings.totalPlayers - 1) / 2)}
            value={settings.spyCount}
            onChange={(e) => setSettings(s => ({ ...s, spyCount: parseInt(e.target.value) }))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            自定义题目主题 (可选)
          </label>
          <input
            type="text"
            placeholder="例如：水果、明星、通过图灵测试..."
            value={settings.topic}
            onChange={(e) => setSettings(s => ({ ...s, topic: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-white placeholder-gray-600"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-xl text-red-200 flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <Button onClick={handleStartGame} fullWidth disabled={stage === GameStage.LOADING}>
        {stage === GameStage.LOADING ? (
          <span className="flex items-center justify-center gap-2">
            <RefreshCw className="animate-spin" size={20} /> AI 正在思考题目...
          </span>
        ) : "开始游戏"}
      </Button>
    </div>
  );

  const renderReveal = () => {
    const currentPlayer = players[currentPlayerReveal];
    
    return (
      <div className="max-w-md mx-auto p-6 h-screen flex flex-col justify-center">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-300">身份确认</h2>
          <p className="text-gray-500 mt-2">请将手机传给 <span className="text-purple-400 font-bold text-xl">玩家 {currentPlayer.id}</span></p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center perspective-1000">
          <div 
            className="relative w-full aspect-[3/4] max-h-96 cursor-pointer group"
            onClick={() => setIsRevealingWord(!isRevealingWord)}
          >
            <div className={`w-full h-full transition-all duration-500 transform-style-3d bg-gray-800 rounded-3xl border-2 border-gray-700 shadow-2xl flex items-center justify-center p-6 ${isRevealingWord ? 'bg-gradient-to-br from-indigo-900 to-purple-900 border-purple-500' : ''}`}>
               {!isRevealingWord ? (
                 <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users size={32} className="text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-lg">点击查看词语</p>
                    <p className="text-xs text-gray-600 uppercase tracking-widest">TAP TO REVEAL</p>
                 </div>
               ) : (
                 <div className="text-center animate-in fade-in zoom-in duration-300">
                    <p className="text-gray-400 text-sm mb-2">你的词语是</p>
                    <h3 className="text-4xl font-black text-white tracking-wide break-words">
                      {currentPlayer.word}
                    </h3>
                    <p className="text-purple-300/50 text-xs mt-8">再次点击隐藏</p>
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {isRevealingWord && (
            <Button onClick={handleRevealNext} fullWidth>
              {currentPlayerReveal === players.length - 1 ? "所有玩家已查看，开始游戏" : "记住了，传给下一位"}
            </Button>
          )}
          {!isRevealingWord && (
            <p className="text-center text-gray-500 text-sm">
              请确保只有你自己能看到屏幕
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderGame = () => (
    <div className="max-w-2xl mx-auto p-4 min-h-screen flex flex-col">
      <header className="flex justify-between items-center mb-6 bg-gray-800/50 p-4 rounded-xl backdrop-blur-md sticky top-4 z-10 border border-gray-700/50 shadow-lg">
        <div>
          <h2 className="font-bold text-white">游戏进行中</h2>
          <div className="flex gap-4 text-xs text-gray-400 mt-1">
             <span className="flex items-center gap-1"><Users size={12}/> {players.filter(p => p.isAlive).length} 存活</span>
             <span className="flex items-center gap-1 text-pink-400"><EyeOff size={12}/> {settings.spyCount} 卧底</span>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setStage(GameStage.SETUP)} className="text-sm px-3 py-1.5 !rounded-lg">
          结束
        </Button>
      </header>

      {/* 确认票出弹窗 */}
      {confirmKillId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 transform scale-100">
              <div className="text-center">
                 <div className="w-16 h-16 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Skull size={32} />
                 </div>
                 <h3 className="text-xl font-bold text-white">确认票出?</h3>
                 <p className="text-gray-400 mt-2">
                    玩家 <span className="text-white font-bold text-lg">{confirmKillId}</span> 将被淘汰出局。
                 </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <Button variant="secondary" onClick={() => setConfirmKillId(null)}>
                    取消
                 </Button>
                 <Button variant="danger" onClick={() => {
                    handleKillPlayer(confirmKillId);
                    setConfirmKillId(null);
                 }}>
                    确认票出
                 </Button>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-24">
        {players.map(player => (
          <div 
            key={player.id} 
            className={`relative p-4 rounded-xl border transition-all duration-300 ${
              !player.isAlive 
                ? 'bg-red-950/20 border-red-900/40 opacity-70' 
                : 'bg-gray-800 border-gray-700 hover:border-purple-500/50'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className={`text-xs px-2 py-1 rounded font-mono ${!player.isAlive ? 'bg-red-900/40 text-red-300' : 'bg-gray-700 text-gray-300'}`}>
                #{player.id}
              </span>
              {!player.isAlive && (
                <div className="flex items-center gap-1 bg-red-900 text-red-100 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-800">
                   OUT
                </div>
              )}
            </div>
            
            <div className="text-center py-2">
              <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2 transition-colors ${!player.isAlive ? 'bg-red-900/20 text-red-700' : 'bg-gray-700'}`}>
                <span className={`text-lg font-bold ${!player.isAlive ? 'text-red-500' : 'text-gray-400'}`}>{player.id}</span>
              </div>
              <p className={`text-sm font-medium ${player.isAlive ? 'text-white' : 'text-red-400'}`}>
                {player.isAlive ? '存活' : '已淘汰'}
              </p>
            </div>

            {player.isAlive ? (
              <button
                onClick={() => setConfirmKillId(player.id)}
                className="w-full mt-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1 active:scale-95"
              >
                <Skull size={14} /> 票出
              </button>
            ) : (
               <div className="h-[38px] mt-2 flex items-center justify-center">
                 <Skull size={16} className="text-red-900/50" />
               </div>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none flex justify-center pb-8 z-10">
        <div className="pointer-events-auto bg-gray-800/90 backdrop-blur text-gray-300 px-6 py-3 rounded-full text-sm border border-gray-700 shadow-xl">
           依次描述词语 -> 投票 -> 票出最多的玩家
        </div>
      </div>
    </div>
  );

  const renderGameOver = () => (
    <div className="max-w-md mx-auto p-6 h-screen flex flex-col items-center justify-center text-center">
      <div className="mb-8 relative">
        <div className={`absolute inset-0 blur-3xl opacity-30 rounded-full ${winner === Role.CIVILIAN ? 'bg-indigo-500' : 'bg-pink-500'}`}></div>
        <Crown size={80} className={`relative z-10 mb-4 ${winner === Role.CIVILIAN ? 'text-indigo-400' : 'text-pink-400'}`} />
        <h2 className="text-5xl font-black text-white relative z-10 mb-2">
          {winner === Role.CIVILIAN ? "平民获胜" : "卧底胜利"}
        </h2>
        <p className="text-gray-400">精彩的博弈！</p>
      </div>

      <div className="w-full bg-gray-800/50 rounded-2xl p-6 border border-gray-700 backdrop-blur-sm mb-8 space-y-4">
         <div className="flex justify-between items-center border-b border-gray-700 pb-4">
            <span className="text-gray-400">平民词</span>
            <span className="text-xl font-bold text-indigo-400">{words?.civilian}</span>
         </div>
         <div className="flex justify-between items-center">
            <span className="text-gray-400">卧底词</span>
            <span className="text-xl font-bold text-pink-400">{words?.spy}</span>
         </div>
      </div>

      <div className="w-full space-y-3">
        <h3 className="text-left text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">卧底名单</h3>
        {players.filter(p => p.role === Role.SPY).map(p => (
           <div key={p.id} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-800">
              <span className="text-gray-300">玩家 {p.id}</span>
              <span className="text-xs bg-pink-900/30 text-pink-400 px-2 py-1 rounded">卧底</span>
           </div>
        ))}
      </div>

      <div className="mt-12 w-full">
        <Button onClick={handleRestart} fullWidth>再来一局</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#111827] text-white">
      {stage === GameStage.SETUP || stage === GameStage.LOADING ? renderSetup() : null}
      {stage === GameStage.REVEAL ? renderReveal() : null}
      {stage === GameStage.PLAYING ? renderGame() : null}
      {stage === GameStage.GAME_OVER ? renderGameOver() : null}
    </div>
  );
};

export default App;