import { YOUTUBE_API_KEY, YOUTUBE_SEARCH_URL } from '../constants';
import { VideoResult } from '../types';

export const searchVideos = async (query: string): Promise<VideoResult[]> => {
  if (!query) return [];

  try {
    const url = new URL(YOUTUBE_SEARCH_URL);
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('maxResults', '10');
    url.searchParams.append('q', query);
    url.searchParams.append('type', 'video');
    url.searchParams.append('key', YOUTUBE_API_KEY);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
        console.error("YouTube API Error:", response.statusText);
        return [];
    }

    const data = await response.json();

    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      channelTitle: item.snippet.channelTitle,
    }));

  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return [];
  }
};