import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, FlatList, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useOrientation } from '@/hooks/useOrientation';
import { PanGestureHandler, PinchGestureHandler, TapGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

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

// Simplified zoomable image component with basic double-tap zoom
const ZoomableImage = ({ item, imageStyle }: { 
    item: MediaItem; 
    imageStyle: any; 
}) => {
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    // Reset zoom function
    const resetZoom = () => {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
    };

    // Handle double tap
    const handleDoubleTap = () => {
        console.log('Double tap detected! Current scale:', scale.value);
        if (scale.value > 1) {
            console.log('Resetting zoom...');
            resetZoom();
        } else {
            console.log('Zooming in to 2x...');
            scale.value = withSpring(2);
        }
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: scale.value },
                { translateX: translateX.value },
                { translateY: translateY.value },
            ],
        };
    });

    return (
        <Animated.View style={animatedStyle}>
            <Pressable onPress={handleDoubleTap}>
                <Image
                    source={{ uri: item.url }}
                    style={imageStyle}
                    contentFit="contain"
                    transition={200}
                />
            </Pressable>
        </Animated.View>
    );
};

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ visible, media, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const flatListRef = useRef<FlatList>(null);
    const orientation = useOrientation();

    // Create video player for video items
    const videoPlayer = useVideoPlayer(media.find(item => item.type === 'video')?.url || '', player => {
        player.loop = false;
        player.muted = false;
    });

    // Debug logging
    useEffect(() => {
        console.log('ImageGalleryModal - visible:', visible, 'media count:', media?.length, 'initialIndex:', initialIndex);
    }, [visible, media, initialIndex]);

    useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex);
            // Add a small delay to ensure orientation is settled
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
            }, 100);
        }
    }, [visible, initialIndex]);

    // Handle orientation changes - re-scroll to current index when orientation changes
    useEffect(() => {
        if (visible && !orientation.isTransitioning) {
            // Force layout recalculation and scroll to current position
            setTimeout(() => {
                try {
                    flatListRef.current?.scrollToIndex({ 
                        index: currentIndex, 
                        animated: false,
                        viewPosition: 0.5 // Center the item
                    });
                } catch (error) {
                    // Fallback to scroll to offset if index fails
                    flatListRef.current?.scrollToOffset({
                        offset: currentIndex * orientation.width,
                        animated: false
                    });
                }
            }, 100); // Slightly longer delay for orientation changes
        }
    }, [orientation.width, orientation.height, visible, currentIndex, orientation.isTransitioning]);

    const handleScroll = (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / orientation.width);
        if (index !== currentIndex) {
            setCurrentIndex(index);
        }
    };
    
    const renderItem = ({ item }: { item: MediaItem; index: number }) => {
        const containerStyle = {
            width: orientation.width,
            height: orientation.height,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
        };

        // Calculate optimal image size for landscape vs portrait
        const getImageStyle = () => {
            if (orientation.isLandscape) {
                // In landscape, allow images to use more of the screen
                return {
                    width: orientation.width,
                    height: orientation.height,
                    maxWidth: orientation.width,
                    maxHeight: orientation.height,
                };
            } else {
                // In portrait, normal sizing
                return {
                    width: orientation.width,
                    height: orientation.height,
                };
            }
        };

        if (item.type === 'video') {
            return (
                <View style={containerStyle}>
                    <VideoView
                        player={videoPlayer}
                        style={getImageStyle()}
                        contentFit="contain"
                        allowsFullscreen={false}
                        allowsPictureInPicture={false}
                        nativeControls={true}
                    />
                </View>
            );
        }

        return (
            <View style={containerStyle}>
                <ZoomableImage 
                    item={item} 
                    imageStyle={getImageStyle()} 
                />
            </View>
        );
    };

    if (!visible) return null;

    // Dynamic close button positioning based on orientation
    const getCloseButtonStyle = () => {
        const baseStyle = {
            position: 'absolute' as const,
            zIndex: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: 20,
            padding: 8,
        };

        if (orientation.isLandscape) {
            // In landscape, position considering potential notches/safe areas
            return {
                ...baseStyle,
                top: Platform.OS === 'ios' ? 20 : 20,
                right: 20,
            };
        } else {
            // In portrait, standard positioning
            return {
                ...baseStyle,
                top: Platform.OS === 'ios' ? 60 : 40,
                right: 20,
            };
        }
    };

    return (
        <View style={[styles.container, {
            width: orientation.width,
            height: orientation.height,
        }]}>
            <Pressable style={getCloseButtonStyle()} onPress={onClose}>
                <Ionicons name="close" size={32} color="white" />
            </Pressable>
            
            <FlatList
                ref={flatListRef}
                data={media}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.url}-${index}-${orientation.width}-${orientation.height}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                initialScrollIndex={initialIndex}
                getItemLayout={(_, index) => ({
                    length: orientation.width,
                    offset: orientation.width * index,
                    index,
                })}
                // Force re-render when orientation changes
                extraData={`${orientation.width}x${orientation.height}-${orientation.isLandscape ? 'landscape' : 'portrait'}`}
                // Improve performance
                removeClippedSubviews={false}
                maxToRenderPerBatch={3}
                windowSize={3}
                // Ensure full screen usage and proper orientation handling
                style={{ 
                    width: orientation.width, 
                    height: orientation.height 
                }}
                // Disable scroll temporarily during orientation transitions for smoother experience
                scrollEnabled={!orientation.isTransitioning}
                // Optimize for orientation changes
                maintainVisibleContentPosition={{
                    minIndexForVisible: 0,
                    autoscrollToTopThreshold: 100,
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    media: {
        width: '100%',
        height: '100%',
    },
});

export default ImageGalleryModal;