// hooks/useOrientation.ts
import { useState, useEffect, useRef } from 'react';
import { Dimensions, Platform } from 'react-native';

export interface Orientation {
  isPortrait: boolean;
  isLandscape: boolean;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape';
  isTransitioning: boolean;
}

export const useOrientation = (): Orientation => {
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onChange = (result: { window: any }) => {
      // Indicate that an orientation transition is in progress
      setIsTransitioning(true);
      
      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      // Update screen data immediately
      setScreenData(result.window);
      
      // Mark transition as complete after a brief delay to allow for smooth animations
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, Platform.OS === 'ios' ? 300 : 150); // iOS has longer transition animations
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    
    return () => {
      subscription?.remove();
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const { width, height } = screenData;
  const isPortrait = height >= width;
  const aspectRatio = width / height;

  return {
    isPortrait,
    isLandscape: !isPortrait,
    width,
    height,
    aspectRatio,
    orientation: isPortrait ? 'portrait' : 'landscape',
    isTransitioning,
  };
};

export default useOrientation;