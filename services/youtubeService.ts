
import { YOUTUBE_API_KEYS, YOUTUBE_SEARCH_URL } from '../constants';
import { VideoResult } from '../types';

// Track current key index globally across the session
let currentKeyIndex = 0;

export const searchVideos = async (query: string, limit = 10): Promise<VideoResult[]> => {
  if (!query) return [];

  let attempts = 0;
  const maxAttempts = YOUTUBE_API_KEYS.length;

  // Robust Iterative Key Rotation
  while (attempts < maxAttempts) {
    const apiKey = YOUTUBE_API_KEYS[currentKeyIndex];
    
    try {
      const url = new URL(YOUTUBE_SEARCH_URL);
      url.searchParams.append('part', 'snippet');
      url.searchParams.append('maxResults', limit.toString());
      url.searchParams.append('q', query);
      url.searchParams.append('type', 'video');
      url.searchParams.append('key', apiKey);

      const response = await fetch(url.toString());
      
      // If the key is invalid, over quota (403), or rate limited (429), this throws
      if (!response.ok) {
        throw new Error(`HTTP Status ${response.status}`);
      }

      const data = await response.json();

      // Validate data structure to prevent crashes downstream
      // This prevents the "white screen" error when API returns valid JSON but no items (error object)
      if (!data || !data.items || !Array.isArray(data.items)) {
         // Maybe it's a quota error in JSON format?
         if (data && data.error) {
             throw new Error(`API Error: ${data.error.message}`);
         }
         throw new Error('Invalid API response: items array missing');
      }

      const validResults = data.items
        .filter((item: any) => item && item.id && item.id.videoId) // Strict filter: must have videoId
        .map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet?.title || 'Untitled',
          thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
          channelTitle: item.snippet?.channelTitle || 'Unknown Channel',
        }));

      // If we got here, it was successful. Return the results.
      return validResults;

    } catch (error) {
      // SAFE LOGGING: Ensure apiKey exists before slicing to prevent "slice of undefined" error
      const keySuffix = apiKey ? apiKey.slice(-4) : 'UNKNOWN';
      console.warn(`API Key ending in ...${keySuffix} failed (Index: ${currentKeyIndex}). Error: ${error}`);
      
      // Rotate to the next key immediately
      currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
      attempts++;
    }
  }

  // If loop finishes, all keys failed
  console.error('All YouTube API Keys exhausted or failed.');
  return [];
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
        // CLEANUP
        delete (window as any)[callbackName];
        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }

        // SAFETY: Wrap in try-catch because if Google returns unexpected JSON structure,
        // mapping access could throw and bubble up as "Script error" on mobile.
        try {
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
        } catch (e) {
            console.warn("JSONP parse error", e);
            resolve([]);
        }
    };

    script.onerror = () => {
        delete (window as any)[callbackName];
        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }
        resolve([]);
    };

    document.body.appendChild(script);
  });
};
