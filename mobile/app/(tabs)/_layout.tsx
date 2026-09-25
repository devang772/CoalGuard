import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useAuthStore } from '../../src/store/auth';
import { getTabsForRole } from '../../src/lib/rbac';
import { colors } from '../../src/theme/colors';

export default function TabsLayout() {
  const { user } = useAuthStore();
  const roleTabs = getTabsForRole(user?.role || 'safety_officer');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.emerald,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#0B1215',
          borderTopColor: '#1A2B26',
          height: 65,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          href: roleTabs.some((t) => t.name === 'tasks') ? ('/(tabs)/tasks' as any) : null,
          tabBarIcon: ({ color, size }) => <Feather name="clipboard" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          href: roleTabs.some((t) => t.name === 'report') ? ('/(tabs)/report' as any) : null,
          tabBarIcon: ({ color }) => (
            <View style={styles.centerButton}>
              <Feather name="plus" size={28} color="#05080A" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="capa"
        options={{
          title: 'CAPA',
          href: roleTabs.some((t) => t.name === 'capa') ? ('/(tabs)/capa' as any) : null,
          tabBarIcon: ({ color, size }) => <Feather name="shield" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.emerald,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 8,
    shadowColor: colors.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
