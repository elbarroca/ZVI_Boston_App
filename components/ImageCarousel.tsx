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
  saveButton?: React.ReactNode;
};

export default function ImageCarousel({ media, onImagePress, height = 300, saveButton }: ImageCarouselProps) {
  if (!media || media.length === 0) {
    return (
      <View style={[styles.placeholderContainer, { height }]}>
        <Ionicons name="image-outline" size={48} color="#9CA3AF" />
        <Text style={styles.placeholderText}>No Media Available</Text>
      </View>
    );
  }

  const firstItem = media[0];

  return (
    <View style={[styles.container, { height }]}>
      <Pressable onPress={() => onImagePress(0)} style={styles.imageWrapper}>
        <Image
          source={{ uri: firstItem.url }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        {firstItem.type === 'video' && (
          <View style={styles.videoPlayOverlay}>
            <Ionicons name="play-circle" size={60} color="white" />
          </View>
        )}
        {media.length > 1 && (
          <View style={styles.multipleImagesIndicator}>
            <Ionicons name="images" size={20} color="white" />
            <Text style={styles.multipleImagesText}>{media.length}</Text>
          </View>
        )}
        {saveButton && (
          <View style={styles.saveButtonOverlay}>
            {saveButton}
          </View>
        )}
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
    bottom: 16,
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
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
  saveButtonOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
});