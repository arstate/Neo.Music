export interface VideoResult {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

export enum VideoQuality {
  ZERO = 'zero',   // 10p (Custom internal mapping to tiny)
  TINY = 'tiny',   // 144p
  SMALL = 'small', // 240p
  MEDIUM = 'medium', // 360p
  LARGE = 'large', // 480p
  HD720 = 'hd720', // 720p
}

export enum AudioQuality {
  LOW = 'small',   // 144p - Saves most data
  MID = 'medium',  // 360p - Balanced
  HIGH = 'hd720',  // 720p - Best Audio
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