import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, FlatList, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ visible, media, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const flatListRef = useRef<FlatList>(null);
    const videoRef = useRef<Video>(null);

    useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex);
            flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
        }
    }, [visible, initialIndex]);

    const handleScroll = (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
        if (index !== currentIndex) {
            setCurrentIndex(index);
        }
    };
    
    const renderItem = ({ item }: { item: MediaItem }) => {
        if (item.type === 'video') {
            return (
                <View style={styles.mediaContainer}>
                    <Video
                        ref={videoRef}
                        source={{ uri: item.url }}
                        style={styles.media}
                        resizeMode={ResizeMode.CONTAIN}
                        useNativeControls
                        shouldPlay={false}
                    />
                </View>
            );
        }
        return (
            <View style={styles.mediaContainer}>
                <Image
                    source={{ uri: item.url }}
                    style={styles.media}
                    contentFit="contain"
                />
            </View>
        );
    };

    if (!visible) return null;

    return (
        <View style={styles.container}>
            <Pressable style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={32} color="white" />
            </Pressable>
            
            <FlatList
                ref={flatListRef}
                data={media}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.url}-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                initialScrollIndex={initialIndex}
                getItemLayout={(_, index) => ({
                    length: screenWidth,
                    offset: screenWidth * index,
                    index,
                })}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        zIndex: 10,
    },
    mediaContainer: {
        width: screenWidth,
        height: screenHeight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    media: {
        width: '100%',
        height: '100%',
    },
});

export default ImageGalleryModal;