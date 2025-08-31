import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, FlatList, Dimensions, Alert, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

// Try to import expo-av, but provide fallback if not available
let Video: any = null;
let ResizeMode: any = null;
try {
  const expoAv = require('expo-av');
  Video = expoAv.Video;
  ResizeMode = expoAv.ResizeMode;
} catch (error) {
  // Video will remain null, showing fallback UI
}

type MediaItem = {
    url: string;
    type: 'image' | 'video' | 'virtualTour';
};

type ImageGalleryModalProps = {
    visible: boolean;
    media: MediaItem[];
    initialIndex: number;
    onClose: () => void;
};

// Helper function to get video thumbnail URL
const getVideoThumbnail = (videoUrl: string): string => {
    // For Supabase Storage, you can use the video URL with a thumbnail parameter
    // Or store thumbnail URLs separately in your database
    // For now, return the video URL (most video services provide thumbnail access)
    return videoUrl.replace(/\.[^/.]+$/, '_thumb.jpg'); // Fallback pattern
};

// Video component with fallback
const VideoPlayer: React.FC<{
    source: { uri: string };
    style: any;
    onPlaybackStatusUpdate?: (status: any) => void;
}> = ({ source, style, onPlaybackStatusUpdate }) => {
    if (!Video) {
        return (
            <View style={[style, styles.videoFallback]}>
                <Ionicons name="videocam-off" size={60} color="white" />
                <Text style={styles.videoFallbackText}>Video playback unavailable</Text>
            </View>
        );
    }

    return (
        <Video
            source={source}
            style={style}
            resizeMode={ResizeMode?.CONTAIN || 'contain'}
            shouldPlay
            isLooping={false}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        />
    );
};

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
    visible,
    media,
    initialIndex,
    onClose
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (visible && flatListRef.current) {
            flatListRef.current.scrollToIndex({
                index: initialIndex,
                animated: false
            });
            setCurrentIndex(initialIndex);
        }
    }, [visible, initialIndex]);

    const handleScroll = (event: any) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        const roundIndex = Math.round(index);
        setCurrentIndex(roundIndex);
    };

    const goToPrevious = () => {
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setCurrentIndex(newIndex);
            flatListRef.current?.scrollToIndex({
                index: newIndex,
                animated: true
            });
        }
    };

    const goToNext = () => {
        if (currentIndex < media.length - 1) {
            const newIndex = currentIndex + 1;
            setCurrentIndex(newIndex);
            flatListRef.current?.scrollToIndex({
                index: newIndex,
                animated: true
            });
        }
    };

    const [playingVideoIndex, setPlayingVideoIndex] = useState<number | null>(null);

    const handleMediaPress = (index: number) => {
        const item = media[index];
        if (item.type === 'video') {
            if (!Video) {
                Alert.alert(
                    'Video Unavailable',
                    'Video playback is not available on this device.',
                    [{ text: 'OK' }]
                );
                return;
            }
            // Toggle video playback
            setPlayingVideoIndex(playingVideoIndex === index ? null : index);
        } else if (item.type === 'virtualTour') {
            Alert.alert(
                'Virtual Tour',
                'Virtual tour functionality coming soon!',
                [{ text: 'OK' }]
            );
        }
    };

    if (!visible) return null;

    return (
        <View style={styles.container}>
            {/* Header with close button and counter */}
            <View style={styles.header}>
                <Pressable style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={28} color="white" />
                </Pressable>
                <View style={styles.counter}>
                    <Text style={styles.counterText}>
                        {currentIndex + 1} / {media.length}
                    </Text>
                </View>
            </View>

            {/* Main image gallery */}
            <FlatList
                ref={flatListRef}
                data={media}
                keyExtractor={(item, index) => `gallery-${index}-${item.url}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                renderItem={({ item, index }) => (
                    <Pressable
                        style={styles.imageContainer}
                        onPress={() => handleMediaPress(index)}
                    >
                                                {item.type === 'video' ? (
                            playingVideoIndex === index ? (
                                <View style={styles.videoContainer}>
                                    <VideoPlayer
                                        source={{ uri: item.url }}
                                        style={styles.video}
                                        onPlaybackStatusUpdate={(status: any) => {
                                            if (status.isLoaded && status.didJustFinish) {
                                                setPlayingVideoIndex(null);
                                            }
                                        }}
                                    />
                                    <Pressable
                                        style={styles.videoOverlay}
                                        onPress={() => setPlayingVideoIndex(null)}
                                    >
                                        <Ionicons name="pause-circle" size={60} color="white" />
                                        <Text style={styles.videoOverlayText}>Tap to Stop</Text>
                                    </Pressable>
                                </View>
                            ) : (
                                <>
                                    <Image
                                        source={{ uri: getVideoThumbnail(item.url) }}
                                        style={styles.image}
                                        contentFit="contain"
                                        placeholder={require('../assets/splash.png')}
                                        placeholderContentFit="contain"
                                    />
                                    <View style={styles.mediaTypeIndicator}>
                                        <Ionicons name="play-circle" size={50} color="white" />
                                        <Text style={styles.mediaTypeText}>
                                            {Video ? 'Tap to Play' : 'Video Unavailable'}
                                        </Text>
                                    </View>
                                </>
                            )
                        ) : (
                            <Image
                                source={{ uri: item.url }}
                                style={styles.image}
                                contentFit="contain"
                                placeholder={require('../assets/splash.png')}
                                placeholderContentFit="contain"
                            />
                        )}
                        {item.type === 'virtualTour' && (
                            <View style={styles.mediaTypeIndicator}>
                                <Ionicons name="eye" size={50} color="white" />
                                <Text style={styles.mediaTypeText}>Virtual Tour</Text>
                            </View>
                        )}
                    </Pressable>
                )}
            />

            {/* Navigation arrows */}
            {media.length > 1 && (
                <>
                    {currentIndex > 0 && (
                        <Pressable style={[styles.navArrow, styles.leftArrow]} onPress={goToPrevious}>
                            <Ionicons name="chevron-back" size={30} color="white" />
                        </Pressable>
                    )}
                    {currentIndex < media.length - 1 && (
                        <Pressable style={[styles.navArrow, styles.rightArrow]} onPress={goToNext}>
                            <Ionicons name="chevron-forward" size={30} color="white" />
                        </Pressable>
                    )}
                </>
            )}
        </View>
    );
};



const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 10,
        zIndex: 10,
    },
    closeButton: {
        padding: 10,
    },
    counter: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    counterText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    imageContainer: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    videoContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    videoOverlayText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 10,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    videoFallback: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    videoFallbackText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 10,
        textAlign: 'center',
    },
    navArrow: {
        position: 'absolute',
        top: '50%',
        transform: [{ translateY: -15 }],
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    leftArrow: {
        left: 20,
    },
    rightArrow: {
        right: 20,
    },
    mediaTypeIndicator: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -25 }, { translateY: -25 }],
        alignItems: 'center',
        justifyContent: 'center',
    },
    mediaTypeText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 5,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
});

// Import Platform for iOS detection
import { Platform } from 'react-native';

export default ImageGalleryModal;
