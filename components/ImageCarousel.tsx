// components/ImageCarousel.tsx
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { View, useWindowDimensions, StyleSheet, Text, ActivityIndicator, Modal, Pressable, Dimensions, Platform } from 'react-native';
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
  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
  const scrollX = useSharedValue(0);

  // Early return if imageUrls is not available yet
  if (!imageUrls || !Array.isArray(imageUrls)) {
    return (
      <View style={[styles.container, styles.placeholderContainer]}>
        <Text style={styles.noImagesText}>Loading images...</Text>
      </View>
    );
  }

  // Filter out invalid URLs and ensure we have valid image URLs
  const validImageUrls = imageUrls.filter(url =>
    url && typeof url === 'string' && (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:'))
  );

  // Store valid imageUrls in a ref to avoid dependency issues
  const imageUrlsRef = useRef<string[] | null>(null);

  // Only update the ref when we have valid imageUrls
  if (validImageUrls && validImageUrls.length > 0) {
    imageUrlsRef.current = validImageUrls;
  }

  // If no valid URLs, show placeholder
  if (validImageUrls.length === 0) {
    return (
      <View style={[styles.container, styles.placeholderContainer]}>
        <Text style={styles.noImagesText}>No Images Available</Text>
        {__DEV__ && (
          <>
            <Text style={styles.debugText}>Debug: Received {imageUrls.length} URLs</Text>
            <Text style={styles.debugText}>Valid URLs: {validImageUrls.length}</Text>
          </>
        )}
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
  const fullScreenFlatListRef = useRef<Animated.FlatList<any>>(null);

  // Calculate current page index for animated dots
  const currentPageIndex = useDerivedValue(() => {
    return Math.round(scrollX.value / width);
  }, [scrollX, width]);

  const fullScreenCurrentPageIndex = useDerivedValue(() => {
    return Math.round(fullScreenScrollX.value / screenWidth);
  }, [fullScreenScrollX, screenWidth]);

  // Create animated styles for pagination dots - fixed number of hooks to avoid violations
  const MAX_IMAGES = 20; // Maximum expected images to avoid too many hooks
  const dotAnimatedStyles = Array.from({ length: MAX_IMAGES }, (_, index) => {
    return useAnimatedStyle(() => {
      // Only animate if this index is valid for current images
      if (index >= validImageUrls.length) {
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
      if (index >= validImageUrls.length) {
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
        (index - 1) * screenWidth,
        index * screenWidth,
        (index + 1) * screenWidth
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

  // Preload images for instant loading performance
  useEffect(() => {
    if (validImageUrls.length > 0) {
      // Preload first 5 images with high/normal priority for better carousel experience
      const preloadPromises = validImageUrls.slice(0, Math.min(5, validImageUrls.length)).map((url, index) => {
        return imageCache.preloadImage(url, index === 0 ? 'high' : 'normal');
      });

      Promise.all(preloadPromises).then(() => {
        // Preload remaining images with normal priority
        if (validImageUrls.length > 3) {
          const remainingPromises = validImageUrls.slice(3).map(url =>
            imageCache.preloadImage(url, 'normal')
          );
          return Promise.all(remainingPromises);
        }
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
    const index = Math.round(event.contentOffset.x / screenWidth);
    if (index !== currentImageIndex && index >= 0 && index < validImageUrls.length) {
      runOnJS(setCurrentImageIndex)(index);
    }
  });

  // Handle opening full-screen view
  const openFullScreen = useCallback((index: number) => {
    // Safety check using ref value
    if (index < 0 || index >= validImageUrls.length) {
      if (__DEV__) console.warn(`ImageCarousel: Invalid index ${index}, valid range: 0-${validImageUrls.length - 1}`);
      return;
    }

    if (__DEV__) {
      console.log(`ImageCarousel: Opening full-screen for image ${index + 1}/${validImageUrls.length}`);
      console.log(`ImageCarousel: Image URI: ${validImageUrls[index]}`);
    }

    setCurrentImageIndex(index);
    setIsFullScreen(true);
    fullScreenScrollX.value = index * screenWidth;
  }, [screenWidth, validImageUrls]);

  // Scroll to the correct image when full-screen opens
  useEffect(() => {
    if (isFullScreen && validImageUrls.length > 0 && fullScreenFlatListRef.current && currentImageIndex >= 0) {
      // Single delayed scroll attempt for better Android reliability
      const timer = setTimeout(() => {
        if (fullScreenFlatListRef.current && isFullScreen && currentImageIndex < validImageUrls.length) {
          try {
            fullScreenFlatListRef.current.scrollToOffset({
              offset: currentImageIndex * screenWidth,
              animated: false, // No animation for immediate positioning
            });
            if (__DEV__) console.log(`ImageCarousel: Scrolled to image ${currentImageIndex + 1}`);
          } catch (error) {
            if (__DEV__) console.warn(`ImageCarousel: Scroll failed:`, error);
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isFullScreen, currentImageIndex, screenWidth, validImageUrls.length]);

  // Handle closing full-screen view
  const closeFullScreen = useCallback(() => {
    setIsFullScreen(false);
  }, []);

  // Enhanced image load handler with state management
  const handleImageLoad = useCallback((index: number) => {
    // Safety check using ref value
    if (index < 0 || index >= validImageUrls.length) {
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
  }, [validImageUrls]);

  // Enhanced image error handler with retry logic
  const handleImageError = useCallback((index: number, error: any) => {
    // Safety check using ref value
    if (index < 0 || index >= validImageUrls.length) {
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

    // Auto-retry with a different URL if available (for network resilience)
    const currentUrl = validImageUrls[index];
    if (currentUrl && !retryUrls[index] && !failedImages.has(index)) {
      // Try to create a retry URL (add a cache-busting parameter)
      const retryUrl = `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}retry=${Date.now()}`;
      setRetryUrls(prev => ({ ...prev, [index]: retryUrl }));

      // Retry after a short delay
      setTimeout(() => {
        // Retry logic without logging
      }, 1000);
    }
  }, [retryUrls, failedImages, validImageUrls]);

  // If there are no images, show a clean placeholder.
  if (validImageUrls.length === 0) {
    return (
      <View style={[styles.container, styles.placeholderContainer]}>
        <Text style={styles.noImagesText}>No Images Available</Text>
        {__DEV__ && (
          <>
            <Text style={styles.debugText}>Debug: No images provided</Text>
            <Text style={styles.debugText}>Received: {JSON.stringify(validImageUrls)}</Text>
            <Text style={styles.debugText}>Type: {typeof validImageUrls}</Text>
            <Text style={styles.debugText}>Is Array: {Array.isArray(validImageUrls) ? 'Yes' : 'No'}</Text>
          </>
        )}
      </View>
    );
  }

  // Debug mode: show simple image list instead of carousel
  if (debugMode && __DEV__) {
    return (
      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>ImageCarousel Debug Mode</Text>
        <Text style={styles.debugInfo}>Images: {validImageUrls.length}</Text>
        {validImageUrls.map((url, index) => (
          <View key={index} style={styles.debugImageContainer}>
            <Text style={styles.debugImageText}>Image {index + 1}</Text>
            <Text style={styles.debugUrlText} numberOfLines={1}>{url}</Text>
            <Image
              source={{ uri: url }}
              style={styles.debugImage}
              resizeMode="cover"
            />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={validImageUrls}
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
              if (validImageUrls && index >= 0 && index < validImageUrls.length) {
                openFullScreen(index);
              }
            }}
          >
            <LazyImage
              source={{ uri: item }}
              style={styles.image}
              resizeMode="cover"
              priority={index === 0 ? 'high' : index <= 2 ? 'normal' : 'low'} // First 3 images load immediately, others lazy
              isCarouselImage={true} // Mark as carousel image for better loading
              onLoad={() => handleImageLoad(index)}
              onError={(error) => handleImageError(index, error.nativeEvent)}
            />
          </Pressable>
        )}
      />

      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {dotAnimatedStyles.slice(0, validImageUrls.length).map((dotStyle, index) => (
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
        animationType={Platform.OS === 'android' ? 'slide' : 'fade'}
        onRequestClose={closeFullScreen}
        statusBarTranslucent={Platform.OS === 'android'}
        hardwareAccelerated={true}
      >
        <View style={styles.fullScreenContainer}>
          {(() => {
            if (isFullScreen && __DEV__) {
              console.log(`ImageCarousel: Modal rendering with ${validImageUrls.length} images, current index: ${currentImageIndex}`);
            }
            return null;
          })()}
          {/* Close Button */}
          <Pressable
            style={styles.closeButton}
            onPress={closeFullScreen}
          >
            <Ionicons name="close" size={28} color="white" />
          </Pressable>

          {/* Full-Screen Image Carousel */}
          <Animated.FlatList
            ref={fullScreenFlatListRef}
            data={validImageUrls}
            keyExtractor={(item, index) => `fullscreen-image-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={fullScreenScrollHandler}
            scrollEventThrottle={16}
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            windowSize={3}
            getItemLayout={(data, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            onScrollToIndexFailed={info => {
              const wait = new Promise(resolve => setTimeout(resolve, 500));
              wait.then(() => {
                if (fullScreenFlatListRef.current) {
                  fullScreenFlatListRef.current.scrollToOffset({ 
                    offset: screenWidth * info.index, 
                    animated: false 
                  });
                }
              });
            }}
            renderItem={({ item, index }) => {
              if (__DEV__) {
                console.log(`ImageCarousel: Rendering fullscreen item ${index + 1}/${validImageUrls.length}: ${item}`);
                console.log(`ImageCarousel: Screen dimensions: ${screenWidth}x${screenHeight}`);
              }
              return (
                <View style={{
                  width: screenWidth,
                  height: screenHeight,
                  backgroundColor: 'black',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative'
                }}>
                  <FullScreenImage
                    uri={item}
                    index={index}
                    onLoad={() => handleImageLoad(index)}
                    onError={(error) => handleImageError(index, error.nativeEvent)}
                  />
                </View>
              );
            }}
          />

          {/* Image Counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentImageIndex + 1} / {validImageUrls.length}
            </Text>
          </View>

          {/* Full-Screen Pagination Dots */}
          <View style={styles.fullScreenPagination}>
            {fullScreenDotAnimatedStyles.slice(0, validImageUrls.length).map((dotStyle, index) => (
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
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  fullScreenImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenLoadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  fullScreenErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenErrorText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  fullScreenErrorSubtext: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
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

// Simplified FullScreenImage Component
const FullScreenImage: React.FC<{
  uri: string;
  index: number;
  onLoad?: () => void;
  onError?: (error: any) => void;
}> = React.memo(({ uri, index, onLoad, onError }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    if (__DEV__) console.log(`FullScreenImage: Load started for image ${index + 1}:`, uri);
  }, [index, uri]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
    if (__DEV__) console.log(`FullScreenImage: Successfully loaded image ${index + 1}`);
  }, [onLoad, index]);

  const handleError = useCallback((error: any) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(error);
    if (__DEV__) console.error(`FullScreenImage: Failed to load image ${index + 1}:`, error.nativeEvent);
  }, [onError, index]);

  if (__DEV__) {
    console.log(`FullScreenImage[${index + 1}]: Rendering with URI:`, uri);
  }

  return (
    <View style={styles.fullScreenImageContainer}>
      <Image
        key={`fullscreen-${index}-${retryKey}`}
        source={{ uri }}
        style={styles.fullScreenImage}
        resizeMode="contain"
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.fullScreenLoadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.fullScreenLoadingText}>Loading image {index + 1}...</Text>
        </View>
      )}

      {/* Error state with retry */}
      {hasError && (
        <Pressable 
          style={styles.fullScreenErrorOverlay}
          onPress={() => {
            if (__DEV__) console.log(`FullScreenImage: Retrying image ${index + 1}`);
            setHasError(false);
            setIsLoading(true);
            setRetryKey(prev => prev + 1);
          }}
        >
          <Ionicons name="image-outline" size={64} color="#ffffff" />
          <Text style={styles.fullScreenErrorText}>Image {index + 1} unavailable</Text>
          <Text style={styles.fullScreenErrorSubtext}>Tap to retry</Text>
          {uri.includes('placehold.co') && (
            <Text style={[styles.fullScreenErrorSubtext, { marginTop: 8, fontSize: 12 }]}>
              Placeholder image not supported on mobile
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
});

// Simplified LazyImage Component for better reliability
export const LazyImage: React.FC<{
  source: { uri: string };
  style: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  onLoad?: () => void;
  onError?: (error: any) => void;
  placeholder?: React.ReactNode;
  priority?: 'high' | 'normal' | 'low'; // Priority for loading
  isCarouselImage?: boolean; // Whether this image is in a carousel
}> = React.memo(({
  source,
  style,
  resizeMode = 'cover',
  onLoad,
  onError,
  placeholder,
  priority = 'normal',
  isCarouselImage = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSource, setImageSource] = useState<{ uri: string }>(source);

  // Debug logging for image loading
  useEffect(() => {
    if (__DEV__) {
      console.log('LazyImage: Loading image:', source.uri);
      console.log('LazyImage: Priority:', priority);
      console.log('LazyImage: Is carousel image:', isCarouselImage);
    }
  }, [source.uri, priority, isCarouselImage]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    if (__DEV__) console.log('LazyImage: Load started for:', source.uri);
  }, [source.uri]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
    if (__DEV__) console.log('LazyImage: Successfully loaded:', source.uri);
  }, [onLoad, source.uri]);

  const handleError = useCallback((error: any) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(error);
    if (__DEV__) console.error('LazyImage: Failed to load:', source.uri, error.nativeEvent);
  }, [onError, source.uri]);

  // For carousel images, use original source directly (simplified approach)
  if (isCarouselImage) {
    return (
      <View style={style}>
        <Image
          source={source}
          style={style}
          resizeMode={resizeMode}
          onLoadStart={() => {
            if (__DEV__) console.log('Carousel Image: Load started for:', source.uri);
            setIsLoading(true);
            setHasError(false);
          }}
          onLoad={() => {
            if (__DEV__) console.log('Carousel Image: Successfully loaded:', source.uri);
            setIsLoading(false);
            setHasError(false);
            onLoad?.();
          }}
          onError={(error) => {
            if (__DEV__) console.error('Carousel Image: Failed to load:', source.uri, error.nativeEvent);
            setIsLoading(false);
            setHasError(true);
            onError?.(error);
          }}
        />

        {/* Loading overlay - only show if still loading and no error */}
        {isLoading && !hasError && (
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

        {/* Error state */}
        {hasError && (
          <View style={[style, {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
          }]}>
            <Ionicons name="image-outline" size={32} color="#ef4444" />
          </View>
        )}
      </View>
    );
  }

  // For non-carousel images, use simplified lazy loading
  return (
    <View style={style}>
      <Image
        source={source}
        style={style}
        resizeMode={resizeMode}
        onLoadStart={() => {
          if (__DEV__) console.log('Non-carousel Image: Load started for:', source.uri);
          setIsLoading(true);
          setHasError(false);
        }}
        onLoad={() => {
          if (__DEV__) console.log('Non-carousel Image: Successfully loaded:', source.uri);
          setIsLoading(false);
          setHasError(false);
          onLoad?.();
        }}
        onError={(error) => {
          if (__DEV__) console.error('Non-carousel Image: Failed to load:', source.uri, error.nativeEvent);
          setIsLoading(false);
          setHasError(true);
          onError?.(error);
        }}
      />

      {/* Loading overlay */}
      {isLoading && !hasError && (
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

      {/* Error state */}
      {hasError && (
        <View style={[style, {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          justifyContent: 'center',
          alignItems: 'center',
        }]}>
          <Ionicons name="image-outline" size={32} color="#ef4444" />
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
        } catch (error) {
          // Failed to preload - silently continue
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

