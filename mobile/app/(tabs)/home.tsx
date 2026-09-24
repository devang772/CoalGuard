import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ShieldCheck,
  ArrowRight,
  Crosshair,
  Activity,
  Scan,
  Check,
  MapPin,
  AlertTriangle,
  User,
  Zap,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useInspection } from "../../context/InspectionContext";
import { MOCK_MINES } from "../../constants/mockData";
import { InspectionData } from "../../types";
import { fetchInspectionsList } from "../../services/inspection";
import { AppButton } from "../../components/ui/AppButton";
import { AppCard } from "../../components/ui/AppCard";
import { InspectionCard } from "../../components/InspectionCard";
import { OfflineBanner } from "../../components/ui/OfflineBanner";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedMine, selectMine, location } = useInspection();

  const [recentInspections, setRecentInspections] = useState<InspectionData[]>([]);
  const [mineMenuOpen, setMineMenuOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      const list = await fetchInspectionsList();
      setRecentInspections(list.slice(0, 3));
    }
    loadData();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header - Matching Reference Image */}
        <View style={styles.topHeader}>
          <View style={styles.brandRow}>
            <View style={styles.logoSquare}>
              <ShieldCheck size={20} color={COLORS.primary} strokeWidth={2.2} />
              <View style={styles.logoDot} />
            </View>
            <Text style={styles.brandTitle}>FIELD OPS</Text>
          </View>

          <View style={styles.statusDotRow}>
            <TouchableOpacity
              style={styles.userBadge}
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.8}
            >
              <User size={14} color={COLORS.primary} />
              <Text style={styles.userName}>{user?.name.split(" ")[1] || "Amit"}</Text>
            </TouchableOpacity>
            <View style={styles.greenDot} />
          </View>
        </View>

        {/* Offline Queue Banner */}
        <OfflineBanner />

        {/* Hero Mine Terrain Card - Matching Reference Image */}
        <View style={styles.mineTerrainCard}>
          <ImageBackground
            source={require("../../assets/coalguard-mine-hero.jpg")}
            style={styles.heroImgBg}
            imageStyle={{ borderRadius: RADIUS.lg }}
          >
            <View style={styles.heroOverlay}>
              {/* Target Reticle Overlay */}
              <View style={styles.targetReticle}>
                <Crosshair size={26} color={COLORS.primaryBright} strokeWidth={2} />
              </View>

              <View style={styles.zoneTagBox}>
                <Text style={styles.zoneTagText}>
                  {selectedMine ? selectedMine.name.toUpperCase() : "ZONE B - BENCH 04"}
                </Text>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Quick Inspection Launch Section - Matching Reference Image */}
        <View style={styles.newInspSection}>
          <Text style={styles.eyebrow}>NEW INSPECTION</Text>
          <Text style={styles.sectionHeadline}>Slope & Safety Condition Check</Text>

          {/* Side-by-side Telemetry Cards */}
          <View style={styles.telemetryRow}>
            <AppCard variant="glass" style={styles.telemetryCard}>
              <Crosshair size={18} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.telemLabel}>GPS status</Text>
                <Text style={styles.telemValue} numberOfLines={1}>
                  {location ? `${location.latitude.toFixed(4)}° N` : "23.7957° N"}
                </Text>
              </View>
            </AppCard>

            <AppCard variant="glass" style={styles.telemetryCard}>
              <Activity size={18} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.telemLabel}>AI status</Text>
                <Text style={styles.telemValue}>Analyzing</Text>
              </View>
            </AppCard>
          </View>

          {/* Evidence Status Row */}
          <AppCard variant="glass" style={styles.evidenceRowCard}>
            <Scan size={18} color={COLORS.primary} />
            <Text style={styles.evidenceText}>Image evidence captured</Text>
            <Check size={18} color={COLORS.primary} />
          </AppCard>

          {/* Solid Mint Green Primary Action Button - Matching Reference */}
          <TouchableOpacity
            style={styles.solidPrimaryBtn}
            onPress={() => router.push("/inspection/site")}
            activeOpacity={0.85}
          >
            <Text style={styles.solidPrimaryBtnText}>Start New Inspection</Text>
            <ArrowRight size={18} color={COLORS.textInverse} />
          </TouchableOpacity>
        </View>

        {/* Mine Switcher Accordion */}
        <TouchableOpacity
          style={styles.switchMineBtn}
          onPress={() => setMineMenuOpen(!mineMenuOpen)}
          activeOpacity={0.7}
        >
          <MapPin size={14} color={COLORS.primary} />
          <Text style={styles.switchMineText}>
            Assigned: {selectedMine?.name} ({mineMenuOpen ? "Close ▲" : "Switch ▼"})
          </Text>
        </TouchableOpacity>

        {mineMenuOpen && (
          <View style={styles.mineDropdown}>
            {MOCK_MINES.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.mineDropdownItem,
                  selectedMine?.id === m.id && styles.mineDropdownItemActive,
                ]}
                onPress={() => {
                  selectMine(m);
                  setMineMenuOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.mineDropdownName,
                    selectedMine?.id === m.id && { color: COLORS.primary },
                  ]}
                >
                  {m.name}
                </Text>
                <Text style={styles.mineDropdownSub}>{m.location}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Inspections Section */}
        <View style={styles.recentSectionHeader}>
          <Text style={styles.recentTitle}>Field Inspection Logs</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/inspections")}>
            <Text style={styles.viewAllText}>View Register →</Text>
          </TouchableOpacity>
        </View>

        {recentInspections.map((item) => (
          <InspectionCard key={item.id} item={item} />
        ))}
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
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoSquare: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surfaceStrong,
    borderColor: COLORS.border,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  logoDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primaryBright,
  },
  brandTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: "SpaceGrotesk-Bold",
  },
  statusDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  userName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryBright,
  },
  mineTerrainCard: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderColor: COLORS.border,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  heroImgBg: {
    width: "100%",
    height: 210,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(5, 8, 7, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
    position: "relative",
  },
  targetReticle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderColor: COLORS.primaryBright,
    borderWidth: 1,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  zoneTagBox: {
    position: "absolute",
    bottom: 12,
    left: 14,
  },
  zoneTagText: {
    color: COLORS.primaryBright,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  newInspSection: {
    marginBottom: SPACING.md,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionHeadline: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 14,
  },
  telemetryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  telemetryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginVertical: 0,
  },
  telemLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  telemValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  evidenceRowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginVertical: 0,
    marginBottom: 14,
  },
  evidenceText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  solidPrimaryBtn: {
    height: 50,
    backgroundColor: COLORS.primaryBright,
    borderRadius: RADIUS.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  solidPrimaryBtnText: {
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: "800",
  },
  switchMineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  switchMineText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  mineDropdown: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 8,
    marginBottom: SPACING.md,
    gap: 6,
  },
  mineDropdownItem: {
    padding: 8,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surfaceStrong,
  },
  mineDropdownItemActive: {
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  mineDropdownName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  mineDropdownSub: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  recentSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  recentTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
});
