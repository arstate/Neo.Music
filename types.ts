export interface VideoResult {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

export enum VideoQuality {
  TINY = 'tiny',     // 144p (We treat this as 10p/Super Low)
  SMALL = 'small',   // 240p
  MEDIUM = 'medium', // 360p
  LARGE = 'large',   // 480p
  HD720 = 'hd720',
}

export enum AudioQuality {
  LOW = 'tiny',    // 144p - Saves MAX data
  MID = 'small',   // 240p - Balanced
  HIGH = 'medium', // 360p - Good Audio
}

export enum LoopMode {
  OFF = 'off',
  ONE = 'one',
  ALL = 'all', // Treated as Auto-Next in this context
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}