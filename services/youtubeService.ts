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

export const getSearchSuggestions = (query: string): Promise<string[]> => {
  return new Promise((resolve) => {
    if (!query.trim()) {
        resolve([]);
        return;
    }

    // JSONP implementation to bypass CORS on the suggestion API
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    const script = document.createElement('script');
    
    // Google Suggest URL
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