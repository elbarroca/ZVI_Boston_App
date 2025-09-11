import React from 'react';
import { Pressable, Text, StyleSheet, Platform, DimensionValue, Dimensions } from 'react-native';

interface EmailAuthButtonProps {
  onPress: () => void;
  title: string;
  style?: object;
  textStyle?: object;
  width?: DimensionValue;
  buttonStyle?: object; // New prop for custom button styles
  maxWidth?: DimensionValue;
  disabled?: boolean;
}

export const EmailAuthButton: React.FC<EmailAuthButtonProps> = ({ onPress, title, style, textStyle, width = '100%', buttonStyle, maxWidth, disabled = false }) => {
  return (
    <Pressable
      style={({ pressed, hovered }) => [
        styles.baseButton,
        { width, maxWidth: maxWidth || (Platform.OS === 'web' ? 420 : Dimensions.get('window').width * 0.85) },
        (hovered) && !disabled && styles.buttonHovered,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
        buttonStyle, // Apply custom button styles
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, textStyle, disabled && styles.buttonTextDisabled]}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    backgroundColor: '#00A896', // Default background color
    paddingVertical: Platform.OS === 'web' ? 18 : 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: Platform.OS === 'web' ? 56 : 52,
    marginBottom: 12, // Default margin bottom
    marginTop: 12, // Default margin top
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.05,
  },
  buttonHovered: {
    // Placeholder for general button hover state if needed
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 18 : 17,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  buttonTextDisabled: {
    opacity: 0.7,
  },
});
