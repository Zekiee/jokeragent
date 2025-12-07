export enum Role {
  CIVILIAN = 'CIVILIAN',
  SPY = 'SPY',
  BLANK = 'BLANK' // Optional extension
}

export enum GameStage {
  SETUP = 'SETUP',
  LOADING = 'LOADING',
  REVEAL = 'REVEAL',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Player {
  id: number;
  role: Role;
  word: string;
  isAlive: boolean;
  isRevealed: boolean;
}

export interface WordPair {
  civilian: string;
  spy: string;
}

export interface GameSettings {
  totalPlayers: number;
  spyCount: number;
  topic?: string;
}
