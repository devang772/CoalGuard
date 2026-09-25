import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { useSettingsStore } from '../../src/store/settings';
import { useSyncStore } from '../../src/store/sync';
import { isOfficerRole } from '../../src/lib/rbac';
import { ConnectivityBanner } from '../../src/components/ConnectivityBanner';
import { SOSFab } from '../../src/components/SOSFab';
import { BigButton } from '../../src/components/BigButton';
import { MOCK_TASKS, MOCK_CAPAS, MOCK_NOTIFICATIONS } from '../../src/api/mock/data';
import { colors } from '../../src/theme/colors';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { locationSimulation } = useSettingsStore();
  const { pendingCount } = useSyncStore();
  const [refreshing, setRefreshing] = useState(false);

  const isOfficer = isOfficerRole(user?.role);
  const isInside = locationSimulation === 'inside';

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const overdueTasksCount = MOCK_TASKS.filter((t) => t.status === 'overdue').length;
  const todayTasksCount = MOCK_TASKS.filter((t) => t.status === 'pending').length;
  const openCapasCount = MOCK_CAPAS.filter((c) => c.status === 'open').length;

  return (
    <View style={styles.screen}>
      <ConnectivityBanner />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.emerald]} tintColor={colors.emerald} />}
      >
        {/* Top Header matching Reference Screenshot */}
        <View style={styles.headerBar}>
          <View style={styles.logoGroup}>
            <View style={styles.logoBadge}>
              <Feather name="shield" size={18} color={colors.emerald} />
              <View style={styles.badgeCheckDot} />
            </View>
            <Text style={styles.brandTitle}>FIELD OPS</Text>
          </View>

          <View style={styles.rightGroup}>
            <View style={styles.onlineDot} />
            <TouchableOpacity onPress={() => router.push('/notifications' as any)} style={styles.iconBtn}>
              <Feather name="bell" size={20} color="#FFF" />
              <View style={styles.notifBadge} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Mine Pit Vision Card matching Reference Screenshot */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800' }}
          style={styles.heroCard}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay}>
            <View style={styles.targetRing}>
              <Feather name="crosshair" size={28} color={colors.emeraldGlow} />
            </View>

            <View style={styles.heroFooter}>
              <Text style={styles.benchTag}>
                {isInside ? 'MOONIDIH UG · SEAM 03' : 'OUTSIDE MINE BOUNDARY'}
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* Tactical Telemetry Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.labelTag}>
            {isOfficer ? 'ACTIVE FIELD INSPECTION' : 'WORKER GOVERNANCE HUB'}
          </Text>
          <Text style={styles.sectionMainTitle}>
            {isOfficer ? 'Slope & Strata Condition Check' : `Welcome, ${user?.name || 'Worker'}`}
          </Text>
        </View>

        {/* Telemetry Cards Row (Matching Reference Screenshot) */}
        <View style={styles.telemetryRow}>
          <View style={styles.telemetryCard}>
            <View style={styles.cardHeaderRow}>
              <Feather name="crosshair" size={18} color={colors.emerald} />
              <Text style={styles.cardSubLabel}>GPS Locked</Text>
            </View>
            <Text style={styles.cardMainVal}>
              {isInside ? '23.7957° N' : 'Outside Boundary'}
            </Text>
          </View>

          <View style={styles.telemetryCard}>
            <View style={styles.cardHeaderRow}>
              <Feather name="activity" size={18} color={colors.emerald} />
              <Text style={styles.cardSubLabel}>AI Status</Text>
            </View>
            <Text style={styles.cardMainVal}>Analyzing</Text>
          </View>
        </View>

        {/* Verification Check Pill (Matching Reference Screenshot) */}
        <View style={styles.pillCard}>
          <View style={styles.pillLeft}>
            <Feather name="maximize" size={18} color={colors.emerald} />
            <Text style={styles.pillText}>Satya Proof Evidence Captured</Text>
          </View>
          <Feather name="check" size={20} color={colors.emerald} />
        </View>

        {/* Primary Action CTA Button (Matching Reference Screenshot) */}
        <BigButton
          title={isOfficer ? 'Submit Inspection' : 'Report Safety Hazard'}
          onPress={() => router.push(isOfficer ? ('/inspection/new' as any) : ('/report/voice' as any))}
          style={{ marginVertical: 16 }}
        />

        {/* Role Quick Summaries */}
        {isOfficer ? (
          <View style={styles.summaryGrid}>
            <TouchableOpacity style={styles.summaryCard} onPress={() => router.push('/(tabs)/tasks' as any)}>
              <Text style={styles.summaryNum}>{todayTasksCount}</Text>
              <Text style={styles.summaryLabel}>Today's Tasks</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.summaryCard, { borderColor: colors.danger }]} onPress={() => router.push('/(tabs)/tasks' as any)}>
              <Text style={[styles.summaryNum, { color: colors.danger }]}>{overdueTasksCount}</Text>
              <Text style={[styles.summaryLabel, { color: colors.danger }]}>Overdue Tasks</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.summaryCard} onPress={() => router.push('/(tabs)/capa' as any)}>
              <Text style={styles.summaryNum}>{openCapasCount}</Text>
              <Text style={styles.summaryLabel}>Open CAPAs</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.summaryCard, { borderColor: colors.info }]} onPress={() => router.push('/sync' as any)}>
              <Text style={[styles.summaryNum, { color: colors.info }]}>{pendingCount}</Text>
              <Text style={[styles.summaryLabel, { color: colors.info }]}>Pending Sync</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.workerGrid}>
            <TouchableOpacity style={styles.workerTile} onPress={() => router.push('/report/voice' as any)}>
              <View style={styles.tileIconCircle}>
                <Feather name="mic" size={24} color={colors.emerald} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tileTitle}>Speak to Report (🎤)</Text>
                <Text style={styles.tileSub}>Speak in Hindi, Bengali, Odia</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.workerTile} onPress={() => router.push('/attendance' as any)}>
              <View style={styles.tileIconCircle}>
                <Feather name="user-check" size={24} color={colors.emerald} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tileTitle}>Mark Geofenced Attendance</Text>
                <Text style={styles.tileSub}>Selfie + GPS verification</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.workerTile} onPress={() => router.push('/grievance/new' as any)}>
              <View style={styles.tileIconCircle}>
                <Feather name="message-square" size={24} color={colors.emerald} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tileTitle}>Raise Anonymous Grievance</Text>
                <Text style={styles.tileSub}>Confidential token tracking</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        )}

        {/* Notifications Section */}
        <View style={styles.notifSectionHeader}>
          <Text style={styles.notifSectionTitle}>Field Hazard Alerts</Text>
          <TouchableOpacity onPress={() => router.push('/notifications' as any)}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {MOCK_NOTIFICATIONS.map((item) => (
          <TouchableOpacity key={item.id} style={styles.notifCard} onPress={() => router.push('/notifications' as any)}>
            <Feather
              name={item.type === 'escalation' ? 'alert-triangle' : 'info'}
              size={20}
              color={item.type === 'escalation' ? colors.danger : colors.emerald}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>{item.title}</Text>
              <Text style={styles.notifMsg}>{item.message}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Floating SOS FAB Button */}
      <SOSFab />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#05080A',
  },
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 14,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0D1518',
    borderWidth: 1.5,
    borderColor: '#1A2B26',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeCheckDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emeraldGlow,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emeraldGlow,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0D1518',
    borderWidth: 1,
    borderColor: '#1A2B26',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  heroCard: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1A2B26',
  },
  heroImage: {
    borderRadius: 20,
    opacity: 0.6,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(5, 8, 10, 0.4)',
  },
  targetRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.emeraldGlow,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 160, 0.08)',
  },
  heroFooter: {
    position: 'absolute',
    bottom: 14,
    left: 16,
  },
  benchTag: {
    color: colors.emeraldGlow,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  labelTag: {
    color: colors.emerald,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionMainTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  telemetryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  telemetryCard: {
    flex: 1,
    backgroundColor: '#0D1518',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardSubLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  cardMainVal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pillCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D1518',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
    marginBottom: 14,
  },
  pillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#0D1518',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  summaryNum: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.emerald,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 4,
  },
  workerGrid: {
    gap: 10,
    marginTop: 8,
  },
  workerTile: {
    backgroundColor: '#0D1518',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  tileIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tileSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  notifSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  notifSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  seeAll: {
    color: colors.emerald,
    fontWeight: '700',
  },
  notifCard: {
    backgroundColor: '#0D1518',
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notifMsg: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
});
