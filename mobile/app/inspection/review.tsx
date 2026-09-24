import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, CheckCircle2, ShieldAlert, MapPin, Camera, FileText } from "lucide-react-native";
import { useInspection } from "../../context/InspectionContext";
import { BrandHeader } from "../../components/BrandHeader";
import { AppCard } from "../../components/ui/AppCard";
import { AppButton } from "../../components/ui/AppButton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function ReviewScreen() {
  const router = useRouter();
  const {
    selectedMine,
    checklist,
    photos,
    location,
    severity,
    hazards,
    remarks,
    submitInspectionForm,
  } = useInspection();

  const [submitting, setSubmitting] = useState(false);

  const compliantCount = checklist.filter((c) => c.status === "COMPLIANT").length;
  const nonCompliantCount = checklist.filter((c) => c.status === "NON_COMPLIANT").length;

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await submitInspectionForm();
    setSubmitting(false);

    router.replace({
      pathname: "/inspection/success",
      params: { message: res.message, isOffline: res.isOfflineSaved ? "true" : "false" },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <BrandHeader subtitle="Step 5 of 5: Final Review" />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepTitle}>Review & Verify Audit Entry</Text>
          <Text style={styles.subtext}>
            Confirm all field data before submitting to CoalGuard Command Database.
          </Text>

          {/* Mine Info Summary */}
          <AppCard variant="glow" style={styles.card}>
            <Text style={styles.sectionLabel}>Target Mine Site</Text>
            <Text style={styles.mineTitle}>{selectedMine?.name}</Text>
            <Text style={styles.mineSub}>{selectedMine?.location} ({selectedMine?.code})</Text>
          </AppCard>

          {/* Checklist Breakdown */}
          <AppCard variant="glass" style={styles.card}>
            <Text style={styles.sectionLabel}>Safety Checklist Summary</Text>
            <View style={styles.statRow}>
              <Text style={styles.statText}>Compliant Items: <Text style={{ color: COLORS.safe }}>{compliantCount}</Text></Text>
              <Text style={styles.statText}>Non-Compliant: <Text style={{ color: COLORS.destructive }}>{nonCompliantCount}</Text></Text>
            </View>
          </AppCard>

          {/* Severity & Hazards Summary */}
          <AppCard variant="glass" style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionLabel}>Assessed Hazard Severity</Text>
              <StatusBadge status={severity} />
            </View>
            {hazards.length > 0 ? (
              <View style={styles.hazardBox}>
                <Text style={styles.hazardTitle}>Flagged Hazards ({hazards.length}):</Text>
                <Text style={styles.hazardText}>{hazards.join(", ")}</Text>
              </View>
            ) : (
              <Text style={styles.noHazardsText}>No specific hazards flagged.</Text>
            )}
          </AppCard>

          {/* GPS Coordinates Summary */}
          <AppCard variant="glass" style={styles.card}>
            <Text style={styles.sectionLabel}>Geo-Location Fix</Text>
            {location ? (
              <View style={styles.coordRow}>
                <MapPin size={14} color={COLORS.primary} />
                <Text style={styles.coordText}>
                  {location.latitude.toFixed(6)}° N, {location.longitude.toFixed(6)}° E (±{location.accuracy ? location.accuracy.toFixed(1) : "5.0"}m)
                </Text>
              </View>
            ) : (
              <Text style={styles.noHazardsText}>Default Mine Site Coordinates</Text>
            )}
          </AppCard>

          {/* Photos Summary */}
          <AppCard variant="glass" style={styles.card}>
            <Text style={styles.sectionLabel}>Attached Evidence Photos ({photos.length})</Text>
            {photos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                {photos.map((p) => (
                  <Image key={p.id} source={{ uri: p.uri }} style={styles.thumbImage} />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noHazardsText}>No photos attached.</Text>
            )}
          </AppCard>

          {/* Remarks */}
          {remarks ? (
            <AppCard variant="glass" style={styles.card}>
              <Text style={styles.sectionLabel}>Inspector Remarks</Text>
              <Text style={styles.remarksText}>{remarks}</Text>
            </AppCard>
          ) : null}

          {/* Final Submit Button */}
          <AppButton
            title={submitting ? "Transmitting Data..." : "Confirm & Submit Inspection"}
            variant="primary"
            size="lg"
            loading={submitting}
            icon={<CheckCircle2 size={20} color={COLORS.textInverse} />}
            onPress={handleSubmit}
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
    marginBottom: SPACING.sm,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  mineTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  mineSub: {
    color: COLORS.primary,
    fontSize: 12,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  statText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  hazardBox: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    padding: 8,
    borderRadius: RADIUS.xs,
  },
  hazardTitle: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: "700",
  },
  hazardText: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 2,
  },
  noHazardsText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  coordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coordText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  photoRow: {
    gap: 8,
    marginTop: 4,
  },
  thumbImage: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surfaceStrong,
  },
  remarksText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 16,
  },
  scrollContent: {
    paddingBottom: 30,
  },
});
