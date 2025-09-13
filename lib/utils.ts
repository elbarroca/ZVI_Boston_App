import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Platform } from "react-native";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Platform-aware styling utilities
export const platformStyles = {
  // Web-specific styles that don't work on native
  webOnly: (styles: any) => Platform.select({
    web: styles,
    default: {}
  }),

  // Native-specific styles that don't work on web
  nativeOnly: (styles: any) => Platform.select({
    native: styles,
    default: {}
  }),

  // Platform-specific style overrides
  select: Platform.select,

  // Shadow styles that work on both platforms without deprecation warnings
  shadow: (elevation: number) => {
    const shadowMap = {
      1: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
      2: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      3: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
      4: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 4,
      },
      5: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 5,
      },
    };

    return shadowMap[elevation as keyof typeof shadowMap] || shadowMap[2];
  },
};

// Helper to create responsive styles
export const createResponsiveStyle = (styles: {
  base?: any;
  sm?: any;
  md?: any;
  lg?: any;
  xl?: any;
}) => {
  return {
    ...styles.base,
    ...Platform.select({
      web: {
        '@media (min-width: 640px)': styles.sm,
        '@media (min-width: 768px)': styles.md,
        '@media (min-width: 1024px)': styles.lg,
        '@media (min-width: 1280px)': styles.xl,
      },
      default: {}
    })
  };
};

// Debug utilities for troubleshooting issues
export const debugSaveStatus = async (userId: string, listingId: string) => {
  if (__DEV__) {
    console.log('=== DEBUG: Save Status Check ===');
    console.log('User ID:', userId);
    console.log('Listing ID:', listingId);
    console.log('=================================');
  }
};

export const debugImageLoading = (imageUrl: string, index: number) => {
  if (__DEV__) {
    console.log('=== DEBUG: Image Loading ===');
    console.log(`Image ${index}:`, imageUrl);
    console.log('URL is valid:', !!imageUrl);
    console.log('URL starts with http:', imageUrl?.startsWith('http'));
    console.log('===========================');
  }
};

// Global image cache system for instant loading
import { Image } from 'react-native';

class ImageCacheManager {
  private memoryCache = new Map<string, string>();
  private diskCache = new Set<string>();
  private preloadingQueue = new Set<string>();
  private maxMemoryCacheSize = 20; // Max images to keep in memory

  // Check if image is cached in memory
  isMemoryCached(url: string): boolean {
    return this.memoryCache.has(url);
  }

  // Check if image is cached on disk
  isDiskCached(url: string): boolean {
    return this.diskCache.has(url);
  }

  // Get cached image URI
  getCachedImage(url: string): string | null {
    return this.memoryCache.get(url) || null;
  }

  // Add to memory cache
  addToMemoryCache(url: string, cachedUri: string) {
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      // Remove oldest entry (simple LRU approximation)
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }
    this.memoryCache.set(url, cachedUri);
  }

  // Add to disk cache
  addToDiskCache(url: string) {
    this.diskCache.add(url);
  }

  // Preload single image with caching
  async preloadImage(url: string, priority: 'high' | 'normal' = 'normal'): Promise<void> {
    if (this.preloadingQueue.has(url) || this.isMemoryCached(url)) {
      return; // Already loading or cached
    }

    this.preloadingQueue.add(url);

    try {
      if (__DEV__) console.log(`Preloading image: ${url}`);

      // Use Image.prefetch for disk caching
      await Image.prefetch(url);
      this.addToDiskCache(url);

      // For high priority images, also keep in memory
      if (priority === 'high') {
        this.addToMemoryCache(url, url);
      }

      if (__DEV__) console.log(`Successfully preloaded: ${url}`);
    } catch (error) {
      if (__DEV__) console.warn(`Failed to preload image: ${url}`, error);
    } finally {
      this.preloadingQueue.delete(url);
    }
  }

  // Preload multiple images
  async preloadImages(urls: string[], priorityCount: number = 3): Promise<void> {
    const promises = urls.map((url, index) =>
      this.preloadImage(url, index < priorityCount ? 'high' : 'normal')
    );
    await Promise.allSettled(promises);
  }

  // Preload images for a listing (all images)
  async preloadListingImages(listingId: string, imageUrls: string[]): Promise<void> {
    if (__DEV__) console.log(`Preloading all images for listing ${listingId}: ${imageUrls.length} images`);

    // Preload first few with high priority, rest with normal
    const highPriority = imageUrls.slice(0, 3);
    const normalPriority = imageUrls.slice(3);

    await Promise.allSettled([
      ...highPriority.map(url => this.preloadImage(url, 'high')),
      ...normalPriority.map(url => this.preloadImage(url, 'normal'))
    ]);
  }

  // Clear cache (useful for memory management)
  clearMemoryCache() {
    this.memoryCache.clear();
    if (__DEV__) console.log('Memory cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      memoryCache: this.memoryCache.size,
      diskCache: this.diskCache.size,
      preloading: this.preloadingQueue.size,
    };
  }
}

// Global instance
export const imageCache = new ImageCacheManager();

// Lazy Loading Hook for Images
import { useState, useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';

export const useLazyImage = (imageUrl: string, threshold: number = 0.1, priority: 'high' | 'normal' | 'low' = 'normal') => {
  const [isVisible, setIsVisible] = useState(priority === 'high'); // High priority images are immediately visible
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const imageRef = useRef<any>(null);
  const { height: screenHeight } = useWindowDimensions();

  useEffect(() => {
    // Skip intersection observer for high priority images
    if (priority === 'high') {
      return;
    }

    let observer: IntersectionObserver | null = null;

    const observeImage = () => {
      if (imageRef.current && typeof window !== 'undefined' && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && !isVisible) {
                setIsVisible(true);
              } else if (entry.intersectionRatio > 0 && !isVisible) {
                // More aggressive detection for carousel images
                setIsVisible(true);
              }
            });
          },
          {
            threshold: Math.min(threshold, 0.01), // Lower threshold for better detection
            rootMargin: `${screenHeight * 0.3}px`, // More aggressive margin
          }
        );

        observer.observe(imageRef.current);
      } else {
        // Fallback for environments without IntersectionObserver
        const delay = priority === 'low' ? 500 : 100;
        setTimeout(() => setIsVisible(true), delay);
      }
    };

    if (!hasLoaded && !isVisible) {
      observeImage();

      // Fallback: Force visibility after a delay for better carousel support
      const fallbackDelay = priority === 'low' ? 1000 : priority === 'normal' ? 300 : 0;
      if (fallbackDelay > 0) {
        setTimeout(() => {
          if (!isVisible && !hasLoaded) {
            setIsVisible(true);
          }
        }, fallbackDelay);
      }
    }

    return () => {
      if (observer && imageRef.current) {
        observer.unobserve(imageRef.current);
        observer.disconnect();
      }
    };
  }, [threshold, screenHeight, hasLoaded, isVisible, priority]); // Removed imageUrl from dependencies to prevent unnecessary re-runs

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasLoaded(true);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasLoaded(true); // Mark as loaded even on error to prevent infinite loading
  };

  return {
    isVisible,
    hasLoaded,
    isLoading,
    imageRef,
    shouldLoad: isVisible && !hasLoaded,
    handleLoadStart,
    handleLoad,
    handleError,
  };
};

// Persistent Local Image Cache System
import * as FileSystem from 'expo-file-system/legacy';

class PersistentImageCache {
  private cacheDirectory: string;
  private maxCacheSize: number = 100 * 1024 * 1024; // 100MB
  private cacheIndex: Map<string, string> = new Map(); // url -> localPath
  private isWeb: boolean;
  private isSupported: boolean;

  constructor() {
    this.isWeb = Platform.OS === 'web';
    this.isSupported = !this.isWeb; // FileSystem not available on web

    if (this.isSupported) {
      this.cacheDirectory = `${FileSystem.documentDirectory}image_cache/`;
      this.initializeCache();
    } else {
      this.cacheDirectory = '';
    }
  }

  private async initializeCache() {
    if (!this.isSupported) return;

    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDirectory, { intermediates: true });
      }

      // Load existing cache index
      await this.loadCacheIndex();
    } catch (error) {
      if (__DEV__) console.error('PersistentImageCache: Failed to initialize:', error);
    }
  }

  private async loadCacheIndex() {
    if (!this.isSupported) return;

    try {
      const indexPath = `${this.cacheDirectory}cache_index.json`;
      const indexInfo = await FileSystem.getInfoAsync(indexPath);

      if (indexInfo.exists) {
        const indexData = await FileSystem.readAsStringAsync(indexPath);
        const index = JSON.parse(indexData);
        this.cacheIndex = new Map(Object.entries(index));


      }
    } catch (error) {
      if (__DEV__) console.error('PersistentImageCache: Failed to load cache index:', error);
    }
  }

  private async saveCacheIndex() {
    if (!this.isSupported) return;

    try {
      const indexPath = `${this.cacheDirectory}cache_index.json`;
      const indexData = JSON.stringify(Object.fromEntries(this.cacheIndex));
      await FileSystem.writeAsStringAsync(indexPath, indexData);
    } catch (error) {
      if (__DEV__) console.error('PersistentImageCache: Failed to save cache index:', error);
    }
  }

  private generateCacheKey(url: string): string {
    // Create a simple hash for the URL
    let hash = 0;
    if (!url) return 'invalid-url';
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getCachePath(cacheKey: string): string {
    return `${this.cacheDirectory}${cacheKey}`;
  }

  async isCached(url: string): Promise<boolean> {
    if (!this.isSupported) return false; // Web fallback
    const cacheKey = this.generateCacheKey(url);
    return this.cacheIndex.has(cacheKey);
  }

  async getCachedPath(url: string): Promise<string | null> {
    if (!this.isSupported) return null; // Web fallback

    const cacheKey = this.generateCacheKey(url);
    const localPath = this.cacheIndex.get(cacheKey);

    if (localPath) {
      // Verify file still exists
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        return localPath;
      } else {
        // Remove from index if file doesn't exist
        this.cacheIndex.delete(cacheKey);
        await this.saveCacheIndex();
        return null;
      }
    }

    return null;
  }

  async cacheImage(url: string): Promise<string | null> {
    if (!this.isSupported) return null; // Web fallback

    // Validate URL before attempting to cache
    if (!url || typeof url !== 'string') {
      if (__DEV__) console.warn('PersistentImageCache: Invalid URL provided:', url);
      return null;
    }

    // Skip blob URLs and other unsupported schemes
    if (url.startsWith('blob:') || url.startsWith('data:') || !url.startsWith('http')) {
      // Only log in development and only for non-blob URLs to reduce spam
      if (__DEV__ && !url.startsWith('blob:')) {
        console.warn(`PersistentImageCache: Skipping unsupported URL scheme: ${url}`);
      }
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey(url);
      const cachePath = this.getCachePath(cacheKey);

      if (__DEV__) console.log(`PersistentImageCache: Caching image: ${url}`);

      // Download image to cache
      const downloadResult = await FileSystem.downloadAsync(url, cachePath);

      if (downloadResult.status === 200) {
        this.cacheIndex.set(cacheKey, cachePath);
        await this.saveCacheIndex();

        if (__DEV__) console.log(`PersistentImageCache: Successfully cached: ${url}`);
        return cachePath;
      } else {
        if (__DEV__) console.warn(`PersistentImageCache: Failed to cache ${url}, status: ${downloadResult.status}`);
        return null;
      }
    } catch (error) {
      if (__DEV__) console.error(`PersistentImageCache: Failed to cache ${url}:`, error);
      return null;
    }
  }

  async getImageSource(url: string): Promise<{ uri: string; isLocal: boolean }> {
    if (!this.isSupported) {
      // Web fallback - just return original URL
      return { uri: url, isLocal: false };
    }

    // Validate URL before processing
    if (!url || typeof url !== 'string') {
      if (__DEV__) console.warn('PersistentImageCache: Invalid URL provided to getImageSource:', url);
      return { uri: url, isLocal: false };
    }

    // Skip caching for blob URLs and other unsupported schemes
    const isSupportedUrl = url.startsWith('http') && !url.startsWith('blob:') && !url.startsWith('data:');

    if (isSupportedUrl) {
      // First check if it's already cached
      const cachedPath = await this.getCachedPath(url);
      if (cachedPath) {
        if (__DEV__) console.log(`PersistentImageCache: Serving from cache: ${url}`);
        return { uri: cachedPath, isLocal: true };
      }
    }

    // If not cached (or not cacheable), return original URL and trigger background caching for supported URLs
    if (__DEV__) console.log(`PersistentImageCache: ${isSupportedUrl ? 'Not cached' : 'Skipping cache for'}, serving remote: ${url}`);

    // Start background caching only for supported URLs (don't await)
    if (isSupportedUrl) {
      this.cacheImage(url).catch(error => {
        if (__DEV__) console.warn(`PersistentImageCache: Background caching failed for ${url}:`, error);
      });
    }

    return { uri: url, isLocal: false };
  }

  async clearCache(): Promise<void> {
    try {
      if (__DEV__) console.log('PersistentImageCache: Clearing cache...');

      // Delete all cached files
      const cacheFiles = Array.from(this.cacheIndex.values());
      await Promise.all(
        cacheFiles.map(async (filePath) => {
          try {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
          } catch (error) {
            if (__DEV__) console.warn(`Failed to delete ${filePath}:`, error);
          }
        })
      );

      // Clear index
      this.cacheIndex.clear();
      await this.saveCacheIndex();

      if (__DEV__) console.log('PersistentImageCache: Cache cleared successfully');
    } catch (error) {
      if (__DEV__) console.error('PersistentImageCache: Failed to clear cache:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      let totalSize = 0;
      const cacheFiles = Array.from(this.cacheIndex.values());

      for (const filePath of cacheFiles) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          if (fileInfo.exists) {
            totalSize += fileInfo.size || 0;
          }
        } catch (error) {
          // Ignore individual file errors
        }
      }

      return totalSize;
    } catch (error) {
      if (__DEV__) console.error('PersistentImageCache: Failed to get cache size:', error);
      return 0;
    }
  }

  async cleanupCache(): Promise<void> {
    try {
      const currentSize = await this.getCacheSize();

      if (currentSize > this.maxCacheSize) {
        if (__DEV__) console.log(`PersistentImageCache: Cache size ${currentSize} exceeds limit ${this.maxCacheSize}, cleaning up...`);

        // Simple cleanup: remove oldest half of cached files
        const entries = Array.from(this.cacheIndex.entries());
        const toRemove = entries.slice(0, Math.floor(entries.length / 2));

        for (const [cacheKey, filePath] of toRemove) {
          try {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
            this.cacheIndex.delete(cacheKey);
          } catch (error) {
            if (__DEV__) console.warn(`Failed to delete ${filePath}:`, error);
          }
        }

        await this.saveCacheIndex();
        if (__DEV__) console.log(`PersistentImageCache: Cleaned up ${toRemove.length} files`);
      }
    } catch (error) {
      if (__DEV__) console.error('PersistentImageCache: Failed to cleanup cache:', error);
    }
  }

  getCacheStats() {
    return {
      cachedImages: this.cacheIndex.size,
      cacheDirectory: this.cacheDirectory,
    };
  }
}

// Global instance
export const persistentImageCache = new PersistentImageCache();

// Slug generation utility
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Remove special characters and replace with spaces
    .replace(/[^\w\s-]/g, '')
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

// Create URL-friendly slug with ID fallback
export function createListingUrl(title: string, id: string): string {
  const slug = generateSlug(title);
  // If slug is empty or too short, use ID
  if (!slug || slug.length < 3) {
    return id;
  }
  return slug;
}

// Validate image URL to prevent console errors
export function validateImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') {
    return 'https://picsum.photos/600/400?random=1';
  }

  // Check for blob URLs and other unsupported schemes
  if (url.startsWith('blob:') || url.startsWith('data:') || !url.startsWith('http')) {
    if (__DEV__) {
      // Only log the warning once per session to reduce spam
      const warningKey = `warned_${url.substring(0, 10)}`;
      if (!(global as any)[warningKey]) {
        console.warn('ImageCache: Skipping unsupported URL scheme:', url);
        (global as any)[warningKey] = true;
      }
    }
    return 'https://picsum.photos/600/400?random=2';
  }

  // Check if it's the problematic placeholder URL
  if (url.includes('placehold.co')) {
    // Replace with a working alternative
    return 'https://picsum.photos/600/400?random=3';
  }

  // Basic URL validation
  try {
    new URL(url);
    return url;
  } catch {
    if (__DEV__) {
      console.warn('ImageCache: Invalid URL format:', url);
    }
    return 'https://picsum.photos/600/400?random=4';
  }
}
