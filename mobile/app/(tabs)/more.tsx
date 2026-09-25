import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { colors } from '../../src/theme/colors';

export default function MoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login' as any);
  };

  const menuItems = [
    { title: 'Mine Live Map', icon: 'map-pin', route: '/map', desc: 'Polygon boundaries & hazard pins' },
    { title: 'My Reports & Trust Scores', icon: 'shield', route: '/my-reports', desc: 'Satya proof verification history' },
    { title: 'Notifications & Reminders', icon: 'bell', route: '/notifications', desc: 'Alerts, escalations & approvals' },
    { title: 'Sync Status & Outbox', icon: 'refresh-cw', route: '/sync', desc: 'Offline queue & master refresh' },
    { title: 'Attendance History', icon: 'calendar', route: '/attendance/history', desc: 'Worker attendance logs' },
    { title: 'Track Grievance', icon: 'search', route: '/grievance/track', desc: 'Status stepper via token' },
    { title: 'Profile', icon: 'user', route: '/profile', desc: 'User role, mine & device details' },
    { title: 'App Settings', icon: 'settings', route: '/settings', desc: 'Language, dark theme, app lock' },
    { title: 'Help & Tutorial', icon: 'help-circle', route: '/help', desc: 'Illustrated onboarding guide' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Summary Card */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>
            {user?.role?.toUpperCase().replace('_', ' ')} · {user?.mine_name}
          </Text>
        </View>
      </View>

      {/* Menu Grid */}
      <View style={styles.menuList}>
        {menuItems.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.8}
            style={styles.menuCard}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.iconBox}>
              <Feather name={item.icon as any} size={22} color={colors.emerald} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748B" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity activeOpacity={0.8} style={styles.logoutBtn} onPress={handleLogout}>
        <Feather name="log-out" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Logout / लॉग आउट</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 30,
    backgroundColor: '#05080A',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1518',
    padding: 18,
    borderRadius: 18,
    gap: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.emerald,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#05080A',
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  userRole: {
    fontSize: 13,
    color: colors.emerald,
    marginTop: 2,
    fontWeight: '700',
  },
  menuList: {
    gap: 10,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1518',
    padding: 16,
    borderRadius: 16,
    gap: 14,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  menuDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.danger,
  },
});
