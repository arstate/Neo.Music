
import { YOUTUBE_API_KEYS, YOUTUBE_SEARCH_URL } from '../constants';
import { VideoResult } from '../types';

// Track current key index globally across the session
let currentKeyIndex = 0;

export const searchVideos = async (query: string, attempt = 0): Promise<VideoResult[]> => {
  if (!query) return [];

  // Stop recursion if we've tried all keys
  if (attempt >= YOUTUBE_API_KEYS.length) {
    console.error('All YouTube API Keys exhausted or failed.');
    return [];
  }

  try {
    const currentKey = YOUTUBE_API_KEYS[currentKeyIndex];
    
    const url = new URL(YOUTUBE_SEARCH_URL);
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('maxResults', '10');
    url.searchParams.append('q', query);
    url.searchParams.append('type', 'video');
    url.searchParams.append('key', currentKey);

    const response = await fetch(url.toString());
    
    // Check for API errors (Quota exceeded is usually 403, Too Many Requests 429)
    if (!response.ok) {
        console.warn(`API Key index ${currentKeyIndex} failed with status ${response.status}. Switching key...`);
        
        // Rotate to next key
        currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
        
        // Retry recursively
        return searchVideos(query, attempt + 1);
    }

    const data = await response.json();

    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      channelTitle: item.snippet.channelTitle,
    }));

  } catch (error) {
    console.error('Network error fetching YouTube videos:', error);
    // Even on network error, try switching just in case it's a specific key issue
    currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
    return searchVideos(query, attempt + 1);
  }
};

export const getSearchSuggestions = (query: string): Promise<string[]> => {
  return new Promise((resolve) => {
    if (!query.trim()) {
        resolve([]);
        return;
    }

    // JSONP implementation to bypass CORS on the suggestion API
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    const script = document.createElement('script');
    
    // Google Suggest URL (Does not use API Key, so no rotation needed here)
    script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}&callback=${callbackName}`;

    (window as any)[callbackName] = (data: any) => {
        delete (window as any)[callbackName];
        if (document.body.contains(script)) {
            document.body.removeChild(script);
        }
        // data[1] contains the suggestions array: [ ["suggestion1", ...], ... ]
        // or sometimes simply ["suggestion", ...] depending on the client param.
        // With client=youtube, it usually returns [query, [sug1, sug2, ...], ...]
        if (data && data[1]) {
             const results = data[1].map((item: any) => {
                 return Array.isArray(item) ? item[0] : item;
             });
             resolve(results);
        } else {
            resolve([]);
        }
    };

    script.onerror = () => {
        delete (window as any)[callbackName];
        if (document.body.contains(script)) {
            document.body.removeChild(script);
        }
        resolve([]);
    };

    document.body.appendChild(script);
  });
};
