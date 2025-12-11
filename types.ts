export interface VideoResult {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

export enum VideoQuality {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  HD720 = 'hd720',
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
