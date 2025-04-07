/**
 * Enhanced API client for handling requests in both regular and iframe contexts
 */

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  credentials?: RequestCredentials;
}

/**
 * Detects if the current context is within an iframe
 */
export const isInIframe = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window !== window.parent;
  } catch (e) {
    // If we can't access window.parent due to CORS, we're likely in a cross-origin iframe
    return true;
  }
};

/**
 * Enhanced fetch API client with iframe support
 */
export async function apiClient<T = any>(url: string, options: ApiOptions = {}): Promise<T> {
  // For relative URLs, ensure we have the full URL when in an iframe
  if (url.startsWith('/') && isInIframe()) {
    // Use the current origin as the base
    const baseUrl = window.location.origin;
    url = `${baseUrl}${url}`;
  }

  // Default options for all requests
  const defaultOptions: ApiOptions = {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    }
  };

  // Merge options
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    }
  };

  // Add special handling for iframe context
  if (isInIframe()) {
    // Ensure SameSite=None for iframe contexts
    if (document.cookie) {
      console.log('[API Client] Using cookies in iframe context');
    } else {
      console.log('[API Client] No cookies available in iframe context');
    }
  }

  // For POST, PUT, PATCH requests with a body
  if (mergedOptions.body && 
      ['POST', 'PUT', 'PATCH'].includes(mergedOptions.method || '') && 
      typeof mergedOptions.body !== 'string') {
    mergedOptions.body = JSON.stringify(mergedOptions.body);
  }

  try {
    console.log(`[API Client] ${mergedOptions.method} ${url}`);
    const response = await fetch(url, mergedOptions as RequestInit);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.indexOf('application/json') !== -1) {
      const data = await response.json();
      
      // If the request was not successful, throw an error
      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }
      
      return data as T;
    } else {
      // For non-JSON responses, return the response object
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return response as unknown as T;
    }
  } catch (error) {
    console.error(`[API Client] Error fetching ${url}:`, error);
    throw error;
  }
} 