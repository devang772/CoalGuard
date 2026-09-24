import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle2, WifiOff, Home, PlusCircle } from "lucide-react-native";
import { BrandHeader } from "../../components/BrandHeader";
import { AppCard } from "../../components/ui/AppCard";
import { AppButton } from "../../components/ui/AppButton";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function SuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isOffline = params.isOffline === "true";
  const message = (params.message as string) || "Inspection recorded successfully.";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.brandBox}>
          <BrandHeader subtitle="Inspection Submission Complete" />
        </View>

        <AppCard variant="glow" style={styles.card}>
          {isOffline ? (
            <View style={styles.iconBoxWarning}>
              <WifiOff size={48} color={COLORS.warning} />
            </View>
          ) : (
            <View style={styles.iconBoxSafe}>
              <CheckCircle2 size={48} color={COLORS.safe} />
            </View>
          )}

          <Text style={styles.title}>
            {isOffline ? "Saved to Offline Sync Queue" : "Inspection Transmitted!"}
          </Text>

          <Text style={styles.message}>{message}</Text>

          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>STATUS:</Text>
            <Text style={[styles.statusValue, { color: isOffline ? COLORS.warning : COLORS.safe }]}>
              {isOffline ? "PENDING SYNC (LOCAL STORE)" : "SYNCED TO CENTRAL DATABASE"}
            </Text>
          </View>
        </AppCard>

        <View style={styles.btnRow}>
          <AppButton
            title="Return to Dashboard"
            variant="primary"
            size="lg"
            icon={<Home size={18} color={COLORS.textInverse} />}
            onPress={() => router.replace("/(tabs)/home")}
          />

          <AppButton
            title="Start Another Inspection"
            variant="outline"
            size="md"
            icon={<PlusCircle size={16} color={COLORS.primary} />}
            onPress={() => router.replace("/inspection/site")}
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
    justifyContent: "center",
    minHeight: "100%",
  },
  brandBox: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  card: {
    padding: SPACING.lg,
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  iconBoxSafe: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconBoxWarning: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  statusBox: {
    backgroundColor: COLORS.surfaceStrong,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.xs,
    padding: 10,
    alignItems: "center",
    width: "100%",
  },
  statusLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  statusValue: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  btnRow: {
    gap: 12,
  },
});
