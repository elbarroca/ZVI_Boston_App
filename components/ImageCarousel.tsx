// components/ImageCarousel.tsx
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, useWindowDimensions, StyleSheet, ActivityIndicator, Text, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
} from 'react-native-reanimated';
import { supabase } from '@/config/supabase';
import { useTheme } from '@/context/theme-provider';
import { themeColors, ThemeColors } from '@/constants/theme';

type ImageCarouselProps = {
  imageUrls: string[];
};

function ImageCarousel({ imageUrls }: ImageCarouselProps) {
  const { theme } = useTheme();
  const colors = themeColors[theme];
  const styles = createStyles(colors);

  // Debug: Consolidated logging to prevent re-render issues
  const hasLogged = useRef(false);
  useEffect(() => {
    if (__DEV__ && !hasLogged.current) {
      hasLogged.current = true;
      console.log(`=== ImageCarousel First Mount ===`);
      console.log('Image URLs count:', imageUrls?.length || 0);

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_API_URL;
      if (supabaseUrl) {
        console.log('Supabase URL configured:', supabaseUrl);
      }
      console.log('========================');
    }
  }, []); // Only run once on mount

  const { width } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  // Simplified state management - removed individual image loading states to prevent infinite loops
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});
  const [loadedStates, setLoadedStates] = useState<Record<number, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<number, boolean>>({});

  // Cache for loaded images to prevent repeated loads
  const loadedImagesCache = useRef<Set<string>>(new Set());

  const scrollHandler = useAnimatedScrollHandler(event => {
    scrollX.value = event.contentOffset.x;
  });

  // Create a stable cache key for the image URLs
  const imageUrlsKey = useMemo(() => {
    if (!imageUrls || !Array.isArray(imageUrls)) return '';
    return imageUrls.join('|');
  }, [imageUrls]);

  // Simplified image URL processing - optimized for performance
  const processedImageUrls = useMemo(() => {
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return [];
    }

    return imageUrls
      .map((url) => {
        if (!url || typeof url !== 'string') return null;

        const cleanUrl = url.trim();
        if (!cleanUrl) return null;

        // If it's already a full URL, return as is
        if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
          return cleanUrl;
        }

        // Handle relative paths - try the most common Supabase pattern
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_API_URL;
        if (supabaseUrl) {
          const normalizedPath = cleanUrl.replace(/^\/+/, '').replace(/\\/g, '/');
          return `${supabaseUrl}/storage/v1/object/public/listings/${normalizedPath}`;
        }

        // Fallback to original URL
        return cleanUrl;
      })
      .filter((url): url is string => url !== null);
  }, [imageUrlsKey]); // Only re-process when URLs change



  // Remove problematic event handlers that cause infinite loops
  // Instead, use a simple approach without state updates on image events

  // Memoize renderItem to prevent unnecessary re-renders
  const renderImageItem = useCallback(({ item, index }: { item: string; index: number }) => {
    return (
      <View style={[styles.imageContainer, { width }]}>
        <Animated.Image
          source={{ uri: item }}
          style={styles.image}
          // Removed event handlers to prevent infinite loops
          // Platform-specific props
          {...(Platform.OS === 'web' ? {
            resizeMode: 'cover',
            accessibilityLabel: `Image ${index + 1} of ${processedImageUrls.length}`,
          } : {
            resizeMode: 'cover',
          })}
        />

        {/* Loading overlay - disabled to prevent infinite loops */}
        {false && loadingStates[index] && !loadedStates[index] && !errorStates[index] && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#00A896" />
            <Text style={styles.loadingText}>Loading image...</Text>
          </View>
        )}

        {/* Error state with retry option - disabled to prevent infinite loops */}
        {false && errorStates[index] && (
          <TouchableOpacity
            style={styles.errorContainer}
            onPress={() => {
              // Reset error state and retry loading
              setErrorStates(prev => ({ ...prev, [index]: false }));
              setLoadingStates(prev => ({ ...prev, [index]: true }));
              setLoadedStates(prev => ({ ...prev, [index]: false }));
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.errorText}>Failed to load image</Text>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [width, processedImageUrls.length]);

  // Show placeholder if no valid images
  if (!processedImageUrls || processedImageUrls.length === 0) {
    return (
      <View style={[styles.container, styles.placeholderContainer]}>
        <View style={styles.placeholderImage}>
          <Text style={styles.noImagesText}>No images available</Text>
          {__DEV__ && (
            <Text style={styles.debugText}>Debug: No images to display</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={processedImageUrls}
        keyExtractor={(item, index) => `carousel-image-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        // Platform-specific optimizations
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        renderItem={renderImageItem}
      />
      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {processedImageUrls.map((_, index) => (
          <PaginationDot key={index} index={index} scrollX={scrollX} width={width} />
        ))}
      </View>

        
    </View>
  );
}

// Separate component for pagination dots to prevent unnecessary re-renders
const PaginationDot = React.memo(({ index, scrollX, width }: { index: number; scrollX: any; width: number }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.3, 1, 0.3],
      'clamp'
    );
    const scale = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.8, 1.2, 0.8],
      'clamp'
    );
    return { opacity, transform: [{ scale }] };
  });

  return <Animated.View style={[createStyles({} as any).dot, animatedStyle]} />;
});

// Test component for carousel with sample images
export const TestImageCarousel = () => {
  return (
    <ImageCarousel
      imageUrls={[
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1616046229478-9901c5536a45?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1617806118233-5cf3b4681a8a?q=80&w=1964&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=2057&auto=format&fit=crop'
      ]}
    />
  );
};

export default React.memo(ImageCarousel);

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    height: 320, // Increased height for better spacing
    width: '100%', // Ensure the container takes full width
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSecondary, // Theme-aware fallback color
  },
  imageContainer: {
    position: 'relative',
    marginHorizontal: 4, // Add spacing between images
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover',
    borderRadius: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImagesText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  debugText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  loadingText: {
    color: colors.primary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  retryText: {
    color: colors.text,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },

  paginationContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: colors.shadow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.text, // Use theme text color for dots
    marginHorizontal: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});

