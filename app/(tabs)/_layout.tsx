import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage } from '@/context/language-provider';



export default function TabsLayout() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = themeColors[theme];

  // Configure Tabs differently for web vs native
  const tabScreenOptions = Platform.OS === 'web'
    ? {
        tabBarActiveTintColor: colors.primary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        }
      }
    : {
        tabBarActiveTintColor: colors.primary,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
          // iOS-specific styling for notch/dynamic island
          ...(Platform.OS === 'ios' && {
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }),
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: 'bold' as const,
          color: colors.text,
          // iOS-specific spacing to account for notch/dynamic island
          ...(Platform.OS === 'ios' && {
            paddingTop: 8,
            paddingBottom: 4,
          }),
        },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          // iOS-specific styling
          ...(Platform.OS === 'ios' && {
            shadowColor: 'transparent',
            elevation: 0,
            height: 90, // Increased height for better touch targets
            paddingBottom: 30, // Account for iPhone home indicator
          }),
        }
      };

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('feed'),
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
          ...(Platform.OS === 'web' && { href: '/(tabs)' })
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t('saved'),
          tabBarIcon: ({ color }) => <Ionicons name="heart-outline" size={24} color={color} />,
          ...(Platform.OS === 'web' && { href: '/(tabs)/saved' })
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('map'),
          tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={24} color={color} />,
          ...(Platform.OS === 'web' && { href: '/(tabs)/map' })
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
          ...(Platform.OS === 'web' && { href: '/(tabs)/settings' })
        }}
      />
      <Tabs.Screen
        name="listings/[id]"
        options={{
          href: null, // Hide this screen from the tab bar on both platforms
          headerShown: true
        }}
      />
    </Tabs>
  );
}
