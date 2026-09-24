import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRight, ShieldCheck, Activity, CheckCircle2, Crosshair } from "lucide-react-native";
import { BrandHeader } from "../../components/BrandHeader";
import { AppButton } from "../../components/ui/AppButton";
import { AppCard } from "../../components/ui/AppCard";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <BrandHeader />
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>SYSTEM LIVE</Text>
          </View>
        </View>

        {/* Hero Banner Container */}
        <View style={styles.heroCard}>
          <ImageBackground
            source={require("../../assets/coalguard-mine-hero.jpg")}
            style={styles.heroImage}
            imageStyle={{ borderRadius: RADIUS.lg, opacity: 0.55 }}
          >
            <View style={styles.heroVignette}>
              {/* Target Reticle Overlay */}
              <View style={styles.targetReticle}>
                <Crosshair size={28} color={COLORS.primaryBright} strokeWidth={2} />
              </View>

              {/* Eyebrow */}
              <View style={styles.eyebrowBox}>
                <View style={styles.eyebrowLine} />
                <Text style={styles.eyebrowText}>AI-POWERED FIELD INTELLIGENCE</Text>
              </View>

              {/* Main Headline */}
              <Text style={styles.heroTitle}>
                Intelligence for{"\n"}
                <Text style={styles.titleHighlight}>Safer Mines.</Text>
              </Text>

              <Text style={styles.heroTagline}>
                AI-Driven Safety Governance & DGMS Compliance for Modern Open-Pit & Underground Operations.
              </Text>
            </View>
          </ImageBackground>
        </View>

        {/* Capability Metric Grid */}
        <View style={styles.metricsGrid}>
          <AppCard variant="glass" style={styles.metricCard}>
            <Text style={styles.metricValue}>24+</Text>
            <Text style={styles.metricLabel}>Mines Monboarded</Text>
          </AppCard>
          <AppCard variant="glass" style={styles.metricCard}>
            <Text style={styles.metricValue}>98%</Text>
            <Text style={styles.metricLabel}>Compliance Visibility</Text>
          </AppCard>
          <AppCard variant="glass" style={styles.metricCard}>
            <Text style={styles.metricValue}>24/7</Text>
            <Text style={styles.metricLabel}>Real-Time Telemetry</Text>
          </AppCard>
        </View>

        {/* Core Field Features */}
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <CheckCircle2 size={16} color={COLORS.primary} />
            <Text style={styles.featureText}>Offline-First Field Inspection Queueing</Text>
          </View>
          <View style={styles.featureItem}>
            <CheckCircle2 size={16} color={COLORS.primary} />
            <Text style={styles.featureText}>Instant GPS Geo-Tagging & Photo Evidence</Text>
          </View>
          <View style={styles.featureItem}>
            <CheckCircle2 size={16} color={COLORS.primary} />
            <Text style={styles.featureText}>Automated DGMS Safety Checklist Scoring</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.ctaBox}>
          <AppButton
            title="Inspector Portal Login"
            variant="primary"
            size="lg"
            icon={<ArrowRight size={18} color={COLORS.textInverse} />}
            onPress={() => router.push("/(auth)/login")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primaryBright,
  },
  liveText: {
    color: COLORS.primaryBright,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  heroCard: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderColor: COLORS.border,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  heroImage: {
    width: "100%",
    minHeight: 250,
  },
  heroVignette: {
    flex: 1,
    backgroundColor: "rgba(5, 8, 7, 0.65)",
    padding: SPACING.md,
    justifyContent: "center",
  },
  targetReticle: {
    alignSelf: "center",
    width: 50,
    height: 50,
    borderRadius: 25,
    borderColor: COLORS.primaryBright,
    borderWidth: 1,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  eyebrowBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  eyebrowLine: {
    width: 16,
    height: 1,
    backgroundColor: COLORS.primaryBright,
  },
  eyebrowText: {
    color: COLORS.primaryBright,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
    marginBottom: 6,
  },
  titleHighlight: {
    color: COLORS.primaryBright,
  },
  heroTagline: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: SPACING.md,
  },
  metricCard: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    marginVertical: 0,
  },
  metricValue: {
    color: COLORS.primaryBright,
    fontSize: 20,
    fontWeight: "800",
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  featureList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderColor: COLORS.border,
    borderWidth: 1,
    gap: 10,
    marginBottom: SPACING.lg,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  ctaBox: {
    gap: 12,
  },
});
