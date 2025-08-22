// components/ImageCarousel.tsx
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { View, useWindowDimensions, StyleSheet, Text, ActivityIndicator, Modal, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useDerivedValue,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { imageCache, useLazyImage, persistentImageCache } from '@/lib/utils';

type ImageCarouselProps = {
  imageUrls: string[] | undefined;
  debugMode?: boolean; // Add debug mode prop
};

export default function ImageCarousel({ imageUrls, debugMode = false }: ImageCarouselProps) {
  const { width, height } = useWindowDimensions();
  const scrollX = useSharedValue(0);

  // Store valid imageUrls in a ref to avoid dependency issues
  const imageUrlsRef = useRef<string[] | null>(null);

  // Only update the ref when we have valid imageUrls
  if (imageUrls && Array.isArray(imageUrls) && (imageUrls?.length ?? 0) > 0) {
    imageUrlsRef.current = imageUrls;
  }

  // Early return if imageUrls is not available yet
  if (!imageUrls || !Array.isArray(imageUrls)) {
    return (
      <View style={[styles.container, styles.placeholderContainer]}>
        <Text style={styles.noImagesText}>Loading images...</Text>
      </View>
    );
  }

  // Full-screen viewer state
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [retryUrls, setRetryUrls] = useState<Record<number, string>>({});
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const fullScreenScrollX = useSharedValue(0);

  // Calculate current page index for animated dots
  const currentPageIndex = useDerivedValue(() => {
    return Math.round(scrollX.value / width);
  }, [scrollX, width]);

  const fullScreenCurrentPageIndex = useDerivedValue(() => {
    return Math.round(fullScreenScrollX.value / width);
  }, [fullScreenScrollX, width]);

  // Create animated styles for pagination dots - fixed number of hooks to avoid violations
  const MAX_IMAGES = 20; // Maximum expected images to avoid too many hooks
  const dotAnimatedStyles = Array.from({ length: MAX_IMAGES }, (_, index) => {
    return useAnimatedStyle(() => {
      // Only animate if this index is valid for current images
      const currentImageUrls = imageUrlsRef.current;
      if (!currentImageUrls || !Array.isArray(currentImageUrls) || index >= currentImageUrls.length) {
        return {
          opacity: 0.4,
          transform: [{ scale: 0.8 }],
          borderWidth: 0,
          borderColor: 'transparent',
          backgroundColor: 'white'
        };
      }

      const isActive = currentPageIndex.value === index;
      const inputRange = [
        (index - 1) * width,
        index * width,
        (index + 1) * width
      ];

      const opacity = interpolate(
        scrollX.value,
        inputRange,
        [0.4, 1, 0.4],
        'clamp'
      );

      const scale = interpolate(
        scrollX.value,
        inputRange,
        [0.8, 1.2, 0.8],
        'clamp'
      );

      return {
        opacity: isActive ? 1 : opacity,
        transform: [{ scale: isActive ? 1.2 : scale }],
        borderWidth: isActive ? 2 : 0,
        borderColor: isActive ? '#007AFF' : 'transparent',
        backgroundColor: isActive ? '#007AFF' : 'white'
      };
    });
  });

  // Create animated styles for full-screen pagination dots - fixed number of hooks to avoid violations
  const fullScreenDotAnimatedStyles = Array.from({ length: MAX_IMAGES }, (_, index) => {
    return useAnimatedStyle(() => {
      // Only animate if this index is valid for current images
      const currentImageUrls = imageUrlsRef.current;
      if (!currentImageUrls || !Array.isArray(currentImageUrls) || index >= currentImageUrls.length) {
        return {
          opacity: 0.4,
          transform: [{ scale: 0.8 }],
          borderWidth: 0,
          borderColor: 'transparent',
          backgroundColor: 'white'
        };
      }

      const isActive = fullScreenCurrentPageIndex.value === index;
      const inputRange = [
        (index - 1) * width,
        index * width,
        (index + 1) * width
      ];

      const opacity = interpolate(
        fullScreenScrollX.value,
        inputRange,
        [0.4, 1, 0.4],
        'clamp'
      );

      const scale = interpolate(
        fullScreenScrollX.value,
        inputRange,
        [0.8, 1.2, 0.8],
        'clamp'
      );

      return {
        opacity: isActive ? 1 : opacity,
        transform: [{ scale: isActive ? 1.2 : scale }],
        borderWidth: isActive ? 2 : 0,
        borderColor: isActive ? '#007AFF' : 'transparent',
        backgroundColor: isActive ? '#007AFF' : 'white'
      };
    });
  });

  // Debug logging
  const hasLogged = useRef(false);
  useEffect(() => {
    if (__DEV__ && !hasLogged.current) {
      hasLogged.current = true;
      console.log('=== ImageCarousel Debug ===');
      console.log('Image URLs received:', imageUrls);
      console.log('Number of images:', imageUrls?.length || 0);
      console.log('Image URLs type:', typeof imageUrls);
      console.log('Is array?', Array.isArray(imageUrls));
      if (imageUrls && Array.isArray(imageUrls) && (imageUrls?.length ?? 0) > 0) {
        imageUrls.forEach((url, index) => {
          console.log(`Image ${index + 1}:`, url);
        });
      }
      console.log('========================');
    }
  }, []); // No dependencies - only run once

  // Preload images for instant loading performance
  useEffect(() => {
    const currentImageUrls = imageUrlsRef.current;
    if (currentImageUrls && Array.isArray(currentImageUrls) && currentImageUrls.length > 0) {
      if (__DEV__) console.log(`ImageCarousel: Starting preload for ${currentImageUrls.length} images`);

      // Preload first 5 images with high/normal priority for better carousel experience
      const preloadPromises = currentImageUrls.slice(0, Math.min(5, currentImageUrls.length)).map((url, index) => {
        return imageCache.preloadImage(url, index === 0 ? 'high' : 'normal');
      });

      Promise.all(preloadPromises).then(() => {
        if (__DEV__) console.log('ImageCarousel: High priority preloading completed');

        // Preload remaining images with normal priority
        if (currentImageUrls.length > 3) {
          const remainingPromises = currentImageUrls.slice(3).map(url =>
            imageCache.preloadImage(url, 'normal')
          );
          return Promise.all(remainingPromises);
        }
      }).then(() => {
        if (__DEV__) console.log('ImageCarousel: All preloading completed');
      }).catch((error) => {
        if (__DEV__) console.warn('ImageCarousel: Preloading failed:', error);
      });
    }
  }, []); // Only run once when component mounts

  // This handler updates the shared value `scrollX` with the current scroll position.
  const scrollHandler = useAnimatedScrollHandler(event => {
    scrollX.value = event.contentOffset.x;
  });

  // Full-screen scroll handler
  const fullScreenScrollHandler = useAnimatedScrollHandler(event => {
    fullScreenScrollX.value = event.contentOffset.x;
    const index = Math.round(event.contentOffset.x / width);
    const currentImageUrls = imageUrlsRef.current;
    if (currentImageUrls && Array.isArray(currentImageUrls) && index !== currentImageIndex && index >= 0 && index < currentImageUrls.length) {
      runOnJS(setCurrentImageIndex)(index);
    }
  });

  // Handle opening full-screen view
  const openFullScreen = useCallback((index: number) => {
    // Safety check using ref value
    const currentImageUrls = imageUrlsRef.current;
    if (!currentImageUrls || !Array.isArray(currentImageUrls) || index < 0 || index >= currentImageUrls.length) {
      return;
    }

    setCurrentImageIndex(index);
    setIsFullScreen(true);
    fullScreenScrollX.value = index * width;
  }, [width]);

  // Handle closing full-screen view
  const closeFullScreen = useCallback(() => {
    setIsFullScreen(false);
  }, []);

  // Enhanced image load handler with state management
  const handleImageLoad = useCallback((index: number) => {
    // Safety check using ref value
    const currentImageUrls = imageUrlsRef.current;
    if (!currentImageUrls || !Array.isArray(currentImageUrls) || index < 0 || index >= currentImageUrls.length) {
      return;
    }

    // Prevent duplicate state updates
    setLoadingStates(prev => {
      if (prev[index] === false) return prev; // Already loaded, no update needed
      return { ...prev, [index]: false };
    });

    setLoadedImages(prev => {
      if (prev.has(index)) return prev; // Already in set, no update needed
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });

    // Throttle logging to prevent spam - only log once per image
    if (__DEV__ && !loadedImages.has(index)) {
      const cached = imageCache.isDiskCached(currentImageUrls[index]) || imageCache.isMemoryCached(currentImageUrls[index]);
      console.log(`ImageCarousel: Successfully loaded image ${index + 1}${cached ? ' (from cache)' : ''}`);
    }
  }, [loadedImages]);

  // Enhanced image error handler with retry logic
  const handleImageError = useCallback((index: number, error: any) => {
    // Safety check using ref value
    const currentImageUrls = imageUrlsRef.current;
    if (!currentImageUrls || !Array.isArray(currentImageUrls) || index < 0 || index >= currentImageUrls.length) {
      return;
    }

    // Prevent duplicate state updates
    setLoadingStates(prev => {
      if (prev[index] === false) return prev; // Already failed, no update needed
      return { ...prev, [index]: false };
    });

    setFailedImages(prev => {
      if (prev.has(index)) return prev; // Already in failed set, no update needed
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });

    // Throttle error logging - only log once per image
    if (__DEV__ && !failedImages.has(index)) {
      console.error(`ImageCarousel: Failed to load image ${index + 1}:`, error);
    }

    // Auto-retry with a different URL if available (for network resilience)
    const currentUrl = currentImageUrls[index];
    if (currentUrl && !retryUrls[index] && !failedImages.has(index)) {
      // Try to create a retry URL (add a cache-busting parameter)
      const retryUrl = `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}retry=${Date.now()}`;
      setRetryUrls(prev => ({ ...prev, [index]: retryUrl }));

      // Retry after a short delay
      setTimeout(() => {
        if (__DEV__) console.log(`ImageCarousel: Retrying image ${index + 1} with: ${retryUrl}`);
      }, 1000);
    }
  }, [retryUrls, failedImages]);

  // If there are no images, show a clean placeholder.
  const currentImageUrls = imageUrlsRef.current;
  if (currentImageUrls && Array.isArray(currentImageUrls) && currentImageUrls.length === 0) {
    return (
      <View style={[styles.container, styles.placeholderContainer]}>
        <Text style={styles.noImagesText}>No Images Available</Text>
        {__DEV__ && (
          <>
            <Text style={styles.debugText}>Debug: No images provided</Text>
            <Text style={styles.debugText}>Received: {JSON.stringify(currentImageUrls)}</Text>
            <Text style={styles.debugText}>Type: {typeof currentImageUrls}</Text>
            <Text style={styles.debugText}>Is Array: {Array.isArray(currentImageUrls) ? 'Yes' : 'No'}</Text>
          </>
        )}
      </View>
    );
  }

  // Debug mode: show simple image list instead of carousel
  if (debugMode) {
    return (
      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>ImageCarousel Debug Mode</Text>
        <Text style={styles.debugInfo}>Images: {(currentImageUrls && Array.isArray(currentImageUrls) ? currentImageUrls.length : 0)}</Text>
        {currentImageUrls && currentImageUrls.map((url, index) => (
          <View key={index} style={styles.debugImageContainer}>
            <Text style={styles.debugImageText}>Image {index + 1}</Text>
            <Text style={styles.debugUrlText} numberOfLines={1}>{url}</Text>
            <Image
              source={{ uri: url }}
              style={styles.debugImage}
              resizeMode="cover"
              onLoadStart={() => {
                if (__DEV__) console.log(`Debug: Started loading image ${index + 1}:`, url);
              }}
              onLoad={() => {
                if (__DEV__) console.log(`Debug: Successfully loaded image ${index + 1}:`, url);
              }}
              onError={(error) => {
                if (__DEV__) console.error(`Debug: Failed to load image ${index + 1}:`, url, error.nativeEvent);
              }}
            />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={currentImageUrls}
        keyExtractor={(item, index) => `carousel-image-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <Pressable
            style={{ width, height: 300 }}
            onPress={() => {
              // Safety check before opening full screen
              if (currentImageUrls && Array.isArray(currentImageUrls) && index >= 0 && index < currentImageUrls.length) {
                openFullScreen(index);
              }
            }}
          >
            <LazyImage
              source={{ uri: item }}
              style={styles.image}
              resizeMode="cover"
              priority={index === 0 ? 'high' : index <= 2 ? 'normal' : 'low'} // First 3 images load immediately, others lazy
              threshold={0.1}
              isCarouselImage={true} // Mark as carousel image for better loading
              onLoad={() => handleImageLoad(index)}
              onError={(error) => handleImageError(index, error.nativeEvent)}
            />
          </Pressable>
        )}
      />

      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {dotAnimatedStyles.slice(0, imageUrls?.length || 0).map((dotStyle, index) => (
          <Animated.View
            key={`dot-${index}`}
            style={[styles.dot, dotStyle]}
          />
        ))}
      </View>

      {/* Full-Screen Image Modal */}
      <Modal
        visible={isFullScreen}
        transparent={false}
        animationType="fade"
        onRequestClose={closeFullScreen}
      >
        <View style={styles.fullScreenContainer}>
          {/* Close Button */}
          <Pressable
            style={styles.closeButton}
            onPress={closeFullScreen}
          >
            <Ionicons name="close" size={28} color="white" />
          </Pressable>

          {/* Full-Screen Image Carousel */}
          <Animated.FlatList
            data={currentImageUrls}
            keyExtractor={(item, index) => `fullscreen-image-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={fullScreenScrollHandler}
            scrollEventThrottle={16}
            initialScrollIndex={currentImageIndex}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item, index }) => (
              <View style={{ width, height }}>
                <Image
                  source={{ uri: item }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                  onLoad={() => handleImageLoad(index)}
                  onError={(error) => handleImageError(index, error.nativeEvent)}
                />
              </View>
            )}
          />

          {/* Image Counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentImageIndex + 1} / {(currentImageUrls && Array.isArray(currentImageUrls) ? currentImageUrls.length : 0)}
            </Text>
          </View>

          {/* Full-Screen Pagination Dots */}
          <View style={styles.fullScreenPagination}>
            {fullScreenDotAnimatedStyles.slice(0, imageUrls?.length || 0).map((dotStyle, index) => (
              <Animated.View
                key={`fullscreen-dot-${index}`}
                style={[styles.dot, dotStyle]}
              />
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    width: '100%',
    backgroundColor: '#E5E7EB', // A light gray fallback color
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginHorizontal: 4,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImagesText: {
    color: '#6B7280',
    fontSize: 16,
  },
  debugText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  debugContainer: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  debugInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  debugImageContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  debugImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  debugUrlText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  debugImage: {
    width: '100%',
    height: 150,
    borderRadius: 4,
  },
  // Full-screen viewer styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  imageCounter: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  fullScreenPagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  // Loading and error states
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  retryText: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.8,
  },
});

// LazyImage Component with Persistent Caching
export const LazyImage: React.FC<{
  source: { uri: string };
  style: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  onLoad?: () => void;
  onError?: (error: any) => void;
  placeholder?: React.ReactNode;
  threshold?: number;
  priority?: 'high' | 'normal' | 'low'; // Priority for loading
  isCarouselImage?: boolean; // Whether this image is in a carousel
}> = React.memo(({
  source,
  style,
  resizeMode = 'cover',
  onLoad,
  onError,
  placeholder,
  threshold = 0.1,
  priority = 'normal',
  isCarouselImage = false
}) => {
  const [imageSource, setImageSource] = useState<{ uri: string; isLocal?: boolean }>({ uri: source.uri });
  const [isImageReady, setIsImageReady] = useState(false);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false);


  const {
    isVisible,
    hasLoaded,
    isLoading,
    imageRef,
    shouldLoad,
    handleLoadStart,
    handleLoad,
    handleError,
  } = useLazyImage(source.uri, threshold, priority);

  // Load image from persistent cache when component mounts
  useEffect(() => {
    const loadImageFromCache = async () => {
      if (isLoadingFromCache) return; // Prevent multiple simultaneous cache loads

      setIsLoadingFromCache(true);
      try {
        const cachedSource = await persistentImageCache.getImageSource(source.uri);
        setImageSource(cachedSource);

        if (__DEV__ && cachedSource.isLocal) {
          console.log(`LazyImage: Using cached image: ${source.uri}`);
        }
      } catch (error) {
        if (__DEV__) console.warn(`LazyImage: Failed to load from cache: ${source.uri}`, error);
      } finally {
        setIsLoadingFromCache(false);
      }
    };

    // Only load from cache if we don't already have a cached source and not already loading
    if (imageSource.uri === source.uri && !isLoadingFromCache) {
      loadImageFromCache();
    }
  }, [source.uri, imageSource.uri, isLoadingFromCache]);

  const handleImageLoad = useCallback(() => {
    if (isImageReady) return; // Prevent duplicate calls

    setIsImageReady(true);
    handleLoad();
    onLoad?.();
  }, [isImageReady, handleLoad, onLoad]);

  const handleImageError = useCallback((error: any) => {
    if (isImageReady) return; // Prevent duplicate calls

    setIsImageReady(true); // Mark as ready even on error to prevent further attempts
    handleError();
    onError?.(error);
  }, [isImageReady, handleError, onError]);

  // Priority loading logic - be more aggressive for carousel images
  const shouldUseLazyLoading = priority !== 'high' && !isCarouselImage;

  // Show placeholder if image is not visible or not loaded (only for non-priority images)
  // For carousel images, be more aggressive about loading
  if (shouldUseLazyLoading && (!shouldLoad)) {
    return (
      <View
        ref={imageRef}
        style={[style, { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }]}
      >
        {placeholder || (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="image-outline" size={32} color="#d1d5db" />
          </View>
        )}
      </View>
    );
  }

  return (
    <View ref={imageRef} style={style}>
      <Image
        source={imageSource}
        style={[
          style,
          {
            opacity: isImageReady ? 1 : 0,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }
        ]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />

      {/* Loading overlay */}
      {isLoading && !isImageReady && (
        <View style={[style, {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(243, 244, 246, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
        }]}>
          <ActivityIndicator size="small" color="#6b7280" />
        </View>
      )}
    </View>
  );
});

// LazyImageList Component for Feed Optimization
export const LazyImageList: React.FC<{
  images: Array<{ id: string; uri: string }>;
  renderItem: (item: { id: string; uri: string }, index: number) => React.ReactElement;
  onImageVisible?: (imageId: string) => void;
  preloadDistance?: number; // How many images ahead to preload
}> = ({ images, renderItem, onImageVisible, preloadDistance = 3 }) => {
  const [visibleImages, setVisibleImages] = useState<Set<string>>(new Set());
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // Preload images that are about to come into view
  const preloadUpcomingImages = async (currentIndex: number) => {
    const startIndex = currentIndex + 1;
    const endIndex = Math.min(currentIndex + preloadDistance + 1, images.length);

    for (let i = startIndex; i < endIndex; i++) {
      const image = images[i];
      if (!preloadedImages.has(image.id)) {
        try {
          // Use persistent cache for background preloading
          const isCached = await persistentImageCache.isCached(image.uri);
          if (!isCached) {
            await persistentImageCache.cacheImage(image.uri);
          }
          setPreloadedImages(prev => new Set(prev).add(image.id));
          if (__DEV__) console.log(`LazyImageList: Preloaded upcoming image: ${image.uri}`);
        } catch (error) {
          if (__DEV__) console.warn(`LazyImageList: Failed to preload ${image.uri}:`, error);
        }
      }
    }
  };

  // Handle image visibility
  const handleImageVisible = (imageId: string, index: number) => {
    setVisibleImages(prev => new Set(prev).add(imageId));
    onImageVisible?.(imageId);

    // Start preloading upcoming images
    preloadUpcomingImages(index);
  };

  return (
    <>
      {images.map((image, index) => (
        <View key={image.id}>
          {React.cloneElement(renderItem(image, index), {
            onImageVisible: () => handleImageVisible(image.id, index),
            isVisible: visibleImages.has(image.id),
            isPreloaded: preloadedImages.has(image.id),
          })}
        </View>
      ))}
    </>
  );
};

// Simple test component to debug image loading
export const SimpleImageTest = ({ imageUrls }: { imageUrls: string[] | undefined }) => {
  if (!imageUrls || !Array.isArray(imageUrls) || (imageUrls?.length ?? 0) === 0) {
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.noImagesText}>No images to test</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Simple Image Test ({(imageUrls?.length ?? 0)} images)
      </Text>
      {imageUrls.map((url, index) => (
        <View key={index} style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, marginBottom: 5 }}>
            Image {index + 1}: {url.substring(0, 50)}...
          </Text>
          <Image
            source={{ uri: url }}
            style={{ width: 200, height: 150, borderRadius: 8 }}
            resizeMode="cover"
            onLoadStart={() => console.log(`Test: Started loading ${index + 1}`)}
            onLoad={() => console.log(`Test: Successfully loaded ${index + 1}`)}
            onError={(error) => console.error(`Test: Failed to load ${index + 1}:`, error.nativeEvent)}
          />
        </View>
      ))}
    </View>
  );
};