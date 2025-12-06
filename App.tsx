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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            谁是卧底
          </h1>
          <p className="text-gray-400 text-lg">AI 出题 • 聚会神器</p>
        </div>

        <div className="space-y-6 bg-gray-800/50 p-6 md:p-8 rounded-2xl border border-gray-700 backdrop-blur-sm shadow-xl">
          <div className="space-y-3">
            <label className="flex justify-between text-sm font-medium text-gray-300">
              <span>玩家人数</span>
              <span className="text-purple-400 font-bold">{settings.totalPlayers} 人</span>
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
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-colors"
            />
          </div>

          <div className="space-y-3">
            <label className="flex justify-between text-sm font-medium text-gray-300">
              <span>卧底人数</span>
              <span className="text-pink-400 font-bold">{settings.spyCount} 人</span>
            </label>
            <input
              type="range"
              min={1}
              max={Math.floor((settings.totalPlayers - 1) / 2)}
              value={settings.spyCount}
              onChange={(e) => setSettings(s => ({ ...s, spyCount: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 transition-colors"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              自定义题目主题 (可选)
            </label>
            <input
              type="text"
              placeholder="例如：水果、明星、抽象概念..."
              value={settings.topic}
              onChange={(e) => setSettings(s => ({ ...s, topic: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-white placeholder-gray-600"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-800 rounded-xl text-red-200 flex items-center gap-2 animate-in fade-in zoom-in duration-300">
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
    </div>
  );

  const renderReveal = () => {
    const currentPlayer = players[currentPlayerReveal];
    
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-300">身份确认</h2>
            <p className="text-gray-500 mt-2">请将设备传给 <span className="text-purple-400 font-bold text-xl block sm:inline mt-1 sm:mt-0">玩家 {currentPlayer.id}</span></p>
          </div>

          <div className="perspective-1000 w-full flex justify-center">
            <div 
              className="relative w-full aspect-[3/4] max-h-[500px] cursor-pointer group"
              onClick={() => setIsRevealingWord(!isRevealingWord)}
            >
              <div className={`w-full h-full transition-all duration-500 transform-style-3d bg-gray-800 rounded-3xl border-2 border-gray-700 shadow-2xl flex items-center justify-center p-6 ${isRevealingWord ? 'bg-gradient-to-br from-indigo-900 to-purple-900 border-purple-500 scale-[1.02]' : 'hover:border-gray-600'}`}>
                 {!isRevealingWord ? (
                   <div className="text-center space-y-4">
                      <div className="w-24 h-24 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                        <Users size={40} className="text-gray-400" />
                      </div>
                      <p className="text-gray-400 text-xl font-medium">点击查看词语</p>
                      <p className="text-xs text-gray-600 uppercase tracking-[0.2em]">TAP TO REVEAL</p>
                   </div>
                 ) : (
                   <div className="text-center animate-in fade-in zoom-in duration-300 flex flex-col items-center justify-center h-full">
                      <p className="text-gray-400 text-sm mb-4 uppercase tracking-wider">你的词语是</p>
                      <h3 className="text-4xl sm:text-5xl font-black text-white tracking-wide break-words drop-shadow-lg">
                        {currentPlayer.word}
                      </h3>
                      <p className="text-purple-300/50 text-xs mt-12 absolute bottom-8">再次点击隐藏</p>
                   </div>
                 )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {isRevealingWord ? (
              <Button onClick={handleRevealNext} fullWidth className="animate-in fade-in slide-in-from-bottom-2">
                {currentPlayerReveal === players.length - 1 ? "所有玩家已查看，开始游戏" : "记住了，传给下一位"}
              </Button>
            ) : (
              <div className="h-12 flex items-center justify-center">
                <p className="text-center text-gray-500 text-sm">
                  请确保只有你自己能看到屏幕
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGame = () => (
    <div className="min-h-screen w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-gray-800/80 p-4 sm:p-5 rounded-2xl backdrop-blur-md sticky top-4 z-20 border border-gray-700/50 shadow-lg gap-4 sm:gap-0">
        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-start">
          <div>
            <h2 className="font-bold text-white text-lg">游戏进行中</h2>
            <div className="flex gap-4 text-xs text-gray-400 mt-1">
               <span className="flex items-center gap-1.5"><Users size={14} className="text-indigo-400"/> {players.filter(p => p.isAlive).length} 存活</span>
               <span className="flex items-center gap-1.5 text-pink-400"><EyeOff size={14}/> {settings.spyCount} 卧底</span>
            </div>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setStage(GameStage.SETUP)} className="text-sm px-4 py-2 !rounded-xl w-full sm:w-auto">
          结束游戏
        </Button>
      </header>

      {/* 确认票出弹窗 */}
      {confirmKillId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-6 transform scale-100 animate-in zoom-in-95 duration-200">
              <div className="text-center">
                 <div className="w-20 h-20 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-red-900/40">
                    <Skull size={36} />
                 </div>
                 <h3 className="text-2xl font-bold text-white mb-2">确认票出?</h3>
                 <p className="text-gray-400">
                    玩家 <span className="text-white font-bold text-lg bg-gray-700 px-2 py-0.5 rounded ml-1">{confirmKillId}</span> 将被淘汰出局。
                 </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
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

      {/* 响应式网格布局：手机2列，平板3-4列，PC 5列 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-28">
        {players.map(player => (
          <div 
            key={player.id} 
            className={`relative p-4 sm:p-5 rounded-2xl border transition-all duration-300 group ${
              !player.isAlive 
                ? 'bg-red-950/20 border-red-900/30 opacity-60' 
                : 'bg-gray-800 border-gray-700 hover:border-purple-500/50 hover:bg-gray-800/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-900/10'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold ${!player.isAlive ? 'bg-red-900/40 text-red-300' : 'bg-gray-700/80 text-gray-400'}`}>
                #{player.id}
              </span>
              {!player.isAlive && (
                <div className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">
                   OUT
                </div>
              )}
            </div>
            
            <div className="text-center py-2 sm:py-4">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto flex items-center justify-center mb-3 sm:mb-4 transition-colors ${
                !player.isAlive 
                  ? 'bg-red-900/20 text-red-800 ring-2 ring-red-900/20' 
                  : 'bg-gray-700/50 text-gray-300 group-hover:bg-gray-700 group-hover:text-white group-hover:scale-110 duration-300'
              }`}>
                <span className={`text-xl sm:text-2xl font-bold`}>{player.id}</span>
              </div>
              <p className={`text-sm font-medium ${player.isAlive ? 'text-gray-300' : 'text-red-400'}`}>
                {player.isAlive ? '存活' : '已淘汰'}
              </p>
            </div>

            {player.isAlive ? (
              <button
                onClick={() => setConfirmKillId(player.id)}
                className="w-full mt-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 group-hover:border-red-500/40"
              >
                <Skull size={16} /> 票出
              </button>
            ) : (
               <div className="h-[46px] mt-3 flex items-center justify-center border border-dashed border-gray-700/50 rounded-xl">
                 <Skull size={18} className="text-gray-700" />
               </div>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-lg z-10 pointer-events-none">
        <div className="pointer-events-auto bg-gray-900/90 backdrop-blur-md text-gray-300 px-6 py-4 rounded-2xl text-sm border border-gray-700/50 shadow-2xl flex items-center justify-center text-center leading-relaxed">
           <span className="opacity-80">依次描述词语 <span className="text-gray-500 mx-2">→</span> 投票 <span className="text-gray-500 mx-2">→</span> 票出嫌疑最大的玩家</span>
        </div>
      </div>
    </div>
  );

  const renderGameOver = () => (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg p-6 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
        <div className="mb-10 relative">
          <div className={`absolute inset-0 blur-3xl opacity-20 rounded-full scale-150 ${winner === Role.CIVILIAN ? 'bg-indigo-500' : 'bg-pink-500'}`}></div>
          <Crown size={100} className={`relative z-10 mb-6 drop-shadow-lg ${winner === Role.CIVILIAN ? 'text-indigo-400' : 'text-pink-400'}`} />
          <h2 className="text-6xl font-black text-white relative z-10 mb-3 tracking-tight">
            {winner === Role.CIVILIAN ? "平民获胜" : "卧底胜利"}
          </h2>
          <p className="text-gray-400 text-lg">精彩的博弈！</p>
        </div>

        <div className="w-full bg-gray-800/80 rounded-3xl p-8 border border-gray-700/50 backdrop-blur-sm mb-8 space-y-6 shadow-xl">
           <div className="flex justify-between items-center border-b border-gray-700/50 pb-5">
              <span className="text-gray-400 font-medium">平民词</span>
              <span className="text-2xl font-bold text-indigo-400">{words?.civilian}</span>
           </div>
           <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium">卧底词</span>
              <span className="text-2xl font-bold text-pink-400">{words?.spy}</span>
           </div>
        </div>

        <div className="w-full space-y-4">
          <h3 className="text-left text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">卧底名单</h3>
          {players.filter(p => p.role === Role.SPY).map(p => (
             <div key={p.id} className="flex items-center justify-between bg-gray-900/80 p-4 rounded-xl border border-gray-800 shadow-sm">
                <span className="text-gray-200 font-medium flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">{p.id}</div>
                  玩家 {p.id}
                </span>
                <span className="text-xs bg-pink-500/10 text-pink-400 px-3 py-1.5 rounded-full font-bold border border-pink-500/20">卧底</span>
             </div>
          ))}
        </div>

        <div className="mt-12 w-full">
          <Button onClick={handleRestart} fullWidth className="py-4 text-lg shadow-xl shadow-purple-900/20">再来一局</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#111827] text-white selection:bg-purple-500/30 selection:text-purple-200">
      {stage === GameStage.SETUP || stage === GameStage.LOADING ? renderSetup() : null}
      {stage === GameStage.REVEAL ? renderReveal() : null}
      {stage === GameStage.PLAYING ? renderGame() : null}
      {stage === GameStage.GAME_OVER ? renderGameOver() : null}
    </div>
  );
};

export default App;