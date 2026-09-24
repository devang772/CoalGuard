import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight, AlertTriangle, FileText } from "lucide-react-native";
import { useInspection } from "../../context/InspectionContext";
import { SeverityLevel } from "../../types";
import { BrandHeader } from "../../components/BrandHeader";
import { SeveritySelector } from "../../components/SeveritySelector";
import { GPSLocationCard } from "../../components/GPSLocationCard";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { AppCard } from "../../components/ui/AppCard";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function ObservationScreen() {
  const router = useRouter();
  const {
    location,
    setLocationData,
    severity,
    setSeverityLevel,
    hazards,
    toggleHazard,
    remarks,
    setRemarksText,
  } = useInspection();

  const hazardList = [
    "Slope Tension Crack",
    "Haul Road Erosion",
    "Methane Gas Spike",
    "Dumper Alarm Fault",
    "Rockfall Hazard",
    "Dust Control Deficit",
  ];

  const handleNext = () => {
    router.push("/inspection/review");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <BrandHeader subtitle="Step 4 of 5: Hazard & GPS Tagging" />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepTitle}>Observations & Hazard Tagging</Text>
          <Text style={styles.subtext}>
            Tag specific mine hazards, calibrate GPS coordinates, and set overall risk severity.
          </Text>

          {/* Real GPS Location Card */}
          <GPSLocationCard location={location} onLocationCaptured={setLocationData} />

          {/* Severity Selector */}
          <SeveritySelector selected={severity} onSelect={setSeverityLevel} />

          {/* Hazard Tags Toggle Box */}
          <AppCard variant="glass" style={styles.card}>
            <Text style={styles.cardLabel}>Flagged Hazard Categories</Text>
            <View style={styles.hazardChipGrid}>
              {hazardList.map((h) => {
                const isChecked = hazards.includes(h);
                return (
                  <TouchableOpacity
                    key={h}
                    style={[styles.chip, isChecked && styles.chipActive]}
                    onPress={() => toggleHazard(h)}
                    activeOpacity={0.8}
                  >
                    <AlertTriangle
                      size={12}
                      color={isChecked ? COLORS.textInverse : COLORS.warning}
                    />
                    <Text style={[styles.chipText, isChecked && styles.chipTextActive]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </AppCard>

          {/* Remarks & Field Notes */}
          <AppCard variant="glass" style={styles.card}>
            <Text style={styles.cardLabel}>Inspector Field Remarks</Text>
            <AppInput
              placeholder="Enter overall findings, remediation notes, or instructions..."
              multiline
              numberOfLines={4}
              value={remarks}
              onChangeText={setRemarksText}
              containerStyle={{ marginBottom: 0 }}
              style={styles.multilineInput}
            />
          </AppCard>

          <AppButton
            title="Review & Verify Inspection"
            variant="primary"
            size="lg"
            icon={<ArrowRight size={18} color={COLORS.textInverse} />}
            onPress={handleNext}
            style={{ marginTop: SPACING.md, marginBottom: 30 }}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    padding: SPACING.md,
  },
  topHeader: {
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  stepTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: SPACING.md,
  },
  card: {
    marginBottom: SPACING.md,
  },
  cardLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  hazardChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: COLORS.warning,
    borderColor: COLORS.warning,
  },
  chipText: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: "700",
  },
  chipTextActive: {
    color: COLORS.textInverse,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 8,
  },
  scrollContent: {
    paddingBottom: 30,
  },
});
