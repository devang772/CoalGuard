import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Calendar, User, MapPin, AlertTriangle, ShieldCheck, Camera } from "lucide-react-native";
import { InspectionData } from "../../types";
import { getInspectionById } from "../../services/inspection";
import { BrandHeader } from "../../components/BrandHeader";
import { AppCard } from "../../components/ui/AppCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { PhotoCard } from "../../components/PhotoCard";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function InspectionDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [inspection, setInspection] = useState<InspectionData | null>(null);

  useEffect(() => {
    async function loadInspection() {
      if (id) {
        const item = await getInspectionById(id as string);
        setInspection(item);
      }
    }
    loadInspection();
  }, [id]);

  if (!inspection) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading inspection details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formattedDate = new Date(inspection.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Back to Inspections</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BrandHeader subtitle={`Record ID: ${inspection.id}`} />

          {/* Header Summary */}
          <AppCard variant="glow" style={styles.card}>
            <View style={styles.headerRow}>
              <StatusBadge status={inspection.status} />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>

            <Text style={styles.mineTitle}>{inspection.mineName}</Text>
            <Text style={styles.inspectorText}>
              <User size={12} color={COLORS.primary} /> Inspector: {inspection.inspectorName}
            </Text>

            {inspection.location && (
              <View style={styles.coordRow}>
                <MapPin size={12} color={COLORS.accent} />
                <Text style={styles.coordText}>
                  GPS: {inspection.location.latitude.toFixed(6)}° N, {inspection.location.longitude.toFixed(6)}° E
                </Text>
              </View>
            )}
          </AppCard>

          {/* Flagged Hazards */}
          {inspection.hazards && inspection.hazards.length > 0 && (
            <AppCard variant="glass" style={styles.card}>
              <Text style={styles.sectionLabel}>Flagged Hazards & Violations</Text>
              <View style={styles.hazardChipBox}>
                {inspection.hazards.map((h, i) => (
                  <View key={i} style={styles.hazardChip}>
                    <AlertTriangle size={12} color={COLORS.warning} />
                    <Text style={styles.hazardChipText}>{h}</Text>
                  </View>
                ))}
              </View>
            </AppCard>
          )}

          {/* Checklist Findings Breakdown */}
          <AppCard variant="glass" style={styles.card}>
            <Text style={styles.sectionLabel}>Checklist Audit Breakdown</Text>
            {inspection.checklist.map((item) => (
              <View key={item.id} style={styles.checklistRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.clauseText}>{item.dgmsClause}</Text>
                  {item.remarks ? (
                    <Text style={styles.remarksText}>Remark: {item.remarks}</Text>
                  ) : null}
                </View>
                <StatusBadge status={item.status} size="sm" />
              </View>
            ))}
          </AppCard>

          {/* Photos */}
          {inspection.photos && inspection.photos.length > 0 && (
            <View style={{ marginBottom: SPACING.md }}>
              <Text style={styles.sectionTitle}>Attached Field Evidence ({inspection.photos.length})</Text>
              {inspection.photos.map((p) => (
                <PhotoCard key={p.id} photo={p} />
              ))}
            </View>
          )}

          {/* Inspector Field Remarks */}
          {inspection.remarks && (
            <AppCard variant="glass" style={styles.card}>
              <Text style={styles.sectionLabel}>Inspector Remarks</Text>
              <Text style={styles.remarksFull}>{inspection.remarks}</Text>
            </AppCard>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.textMuted,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dateText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  mineTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  inspectorText: {
    color: COLORS.text,
    fontSize: 12,
    marginBottom: 6,
  },
  coordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surfaceStrong,
    padding: 6,
    borderRadius: RADIUS.xs,
  },
  coordText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  hazardChipBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hazardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: COLORS.warning,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  hazardChipText: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: "700",
  },
  checklistRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    gap: 8,
  },
  itemTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  clauseText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "600",
  },
  remarksText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  remarksFull: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
