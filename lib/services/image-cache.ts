import { QueryClient } from '@tanstack/react-query';

class ImageCacheService {
  private static instance: ImageCacheService;
  private cache: Map<string, string>;
  private queryClient: QueryClient | null = null;
  
  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): ImageCacheService {
    if (!ImageCacheService.instance) {
      ImageCacheService.instance = new ImageCacheService();
    }
    return ImageCacheService.instance;
  }

  public setQueryClient(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  public async preloadImage(url: string): Promise<void> {
    if (this.cache.has(url)) return;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(url, url);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  public async preloadImages(urls: string[]): Promise<void> {
    await Promise.all(urls.map(url => this.preloadImage(url)));
  }

  public invalidateImage(url: string) {
    this.cache.delete(url);
    if (this.queryClient) {
      this.queryClient.invalidateQueries({ queryKey: ['image', url] });
    }
  }

  public clearCache() {
    this.cache.clear();
  }

  public isCached(url: string): boolean {
    return this.cache.has(url);
  }
}

export const imageCache = ImageCacheService.getInstance(); 