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
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        }
      };

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
          ...(Platform.OS === 'web' && { href: '/(tabs)' })
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t('saved'),
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="heart-outline" size={24} color={color} />,
          ...(Platform.OS === 'web' && { href: '/(tabs)/saved' })
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('map'),
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={24} color={color} />,
          ...(Platform.OS === 'web' && { href: '/(tabs)/map' })
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
          ...(Platform.OS === 'web' && { href: '/(tabs)/settings' })
        }}
      />
      <Tabs.Screen
        name="listings/[id]"
        options={{
          href: null, // Hide this screen from the tab bar on both platforms
          headerShown: false
        }}
      />
    </Tabs>
  );
}
