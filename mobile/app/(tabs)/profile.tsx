import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { User, ShieldCheck, MapPin, Settings, LogOut, Server, HardDrive } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../services/api";
import { BrandHeader } from "../../components/BrandHeader";
import { AppCard } from "../../components/ui/AppCard";
import { AppButton } from "../../components/ui/AppButton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logoutUser } = useAuth();

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/(auth)/onboarding");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <BrandHeader subtitle="Inspector Profile & Settings" />

        {/* User Card */}
        <AppCard variant="glow" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarBox}>
              <User size={32} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user?.name || "Inspector Amit Sharma"}</Text>
              <Text style={styles.userRole}>
                {user?.role.replace(/_/g, " ") || "SAFETY INSPECTOR"}
              </Text>
              <Text style={styles.userEmail}>{user?.email || "amit.sharma@coalguard.gov.in"}</Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <StatusBadge status="ACTIVE" size="sm" />
            <Text style={styles.badgeText}>DGMS Certified Field Inspector</Text>
          </View>
        </AppCard>

        {/* Mine Site Details */}
        <AppCard variant="glass" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Assigned Mine Site</Text>
          <View style={styles.infoRow}>
            <MapPin size={16} color={COLORS.primary} />
            <View>
              <Text style={styles.infoValue}>Jharia Block 4 Open Pit</Text>
              <Text style={styles.infoSub}>DGMS Zone 1 - East (Dhanbad, Jharkhand)</Text>
            </View>
          </View>
        </AppCard>

        {/* Backend & Environment Settings */}
        <AppCard variant="glass" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>System Connection Specs</Text>

          <View style={styles.infoRow}>
            <Server size={16} color={COLORS.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>EXPO_PUBLIC_API_URL</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {API_BASE_URL}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.settingsLink}
            onPress={() => router.push("/settings")}
            activeOpacity={0.7}
          >
            <Settings size={14} color={COLORS.primary} />
            <Text style={styles.settingsLinkText}>Configure API Endpoint & Local Storage</Text>
          </TouchableOpacity>
        </AppCard>

        {/* Logout Action */}
        <View style={{ marginTop: SPACING.md }}>
          <AppButton
            title="Sign Out of Terminal"
            variant="danger"
            size="lg"
            icon={<LogOut size={18} color="#ffffff" />}
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  profileCard: {
    marginVertical: SPACING.md,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: COLORS.primary,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  userRole: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingTop: 10,
  },
  badgeText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  sectionCard: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  infoValue: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  infoSub: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  settingsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surfaceStrong,
    borderColor: COLORS.borderHighlight,
    borderWidth: 1,
    padding: 10,
    borderRadius: RADIUS.xs,
    marginTop: 8,
  },
  settingsLinkText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
});
