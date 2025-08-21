import { Tabs } from 'expo-router';
import { Chrome as HomeIcon, Settings as SettingsIcon, Search as SearchIcon } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#00A896',
      tabBarInactiveTintColor: '#6B7280',
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <HomeIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <SearchIcon size={size} color={color} />,
          href: null, // Hide from tab bar, accessed programmatically
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <SettingsIcon size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
