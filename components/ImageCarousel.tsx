// components/ImageCarousel.tsx
import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

type MediaItem = {
    url: string;
    type: 'image' | 'video' | 'virtualTour';
};

type ImageCarouselProps = {
  media: MediaItem[];
  onImagePress: (index: number) => void;
  height?: number;
};

export default function ImageCarousel({ media, onImagePress, height = 300 }: ImageCarouselProps) {
  if (!media || media.length === 0) {
    return (
      <View style={[styles.placeholderContainer, { height }]}>
        <Ionicons name="image-outline" size={48} color="#9CA3AF" />
        <Text style={styles.placeholderText}>No Media Available</Text>
      </View>
    );
  }

  // For single image, just show it directly
  if (media.length === 1) {
    return (
      <View style={[styles.container, { height }]}>
        <Pressable onPress={() => onImagePress(0)} style={styles.imageWrapper}>
          <Image
            source={{ uri: media[0].url }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
        </Pressable>
      </View>
    );
  }

  // For multiple images, show first image with indicator
  return (
    <View style={[styles.container, { height }]}>
      <Pressable onPress={() => onImagePress(0)} style={styles.imageWrapper}>
        {media[0].type === 'video' ? (
          // Video thumbnail with play button
          <View style={styles.videoContainer}>
            <Image
              source={{ uri: media[0].url.replace(/\.[^/.]+$/, '_thumb.jpg') }}
              style={styles.image}
              contentFit="cover"
              transition={300}
            />
            <View style={styles.videoPlayOverlay}>
              <Ionicons name="play-circle" size={50} color="white" />
              <Text style={styles.videoText}>Tap to Play Video</Text>
            </View>
          </View>
        ) : (
          // Regular image
          <Image
            source={{ uri: media[0].url }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
        )}
        {/* Multiple images indicator - top right */}
        <View style={styles.multipleImagesIndicator}>
          <Ionicons name="images" size={20} color="white" />
          <Text style={styles.multipleImagesText}>{media.length}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#E5E7EB',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  multipleImagesIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  multipleImagesText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  videoText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  placeholderText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
});