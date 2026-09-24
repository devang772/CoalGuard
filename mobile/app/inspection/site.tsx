import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, MapPin, ArrowRight, CheckCircle2 } from "lucide-react-native";
import { useInspection } from "../../context/InspectionContext";
import { MOCK_MINES } from "../../constants/mockData";
import { Mine } from "../../types";
import { BrandHeader } from "../../components/BrandHeader";
import { AppCard } from "../../components/ui/AppCard";
import { AppButton } from "../../components/ui/AppButton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function SiteSelectionScreen() {
  const router = useRouter();
  const { selectedMine, selectMine, resetForm } = useInspection();

  const handleNext = () => {
    router.push("/inspection/checklist");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Header */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            resetForm();
            router.back();
          }}
        >
          <ArrowLeft size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Cancel Inspection</Text>
        </TouchableOpacity>

        <BrandHeader subtitle="Step 1 of 5: Mine Selection" />

        <View style={styles.header}>
          <Text style={styles.stepTitle}>Select Inspection Mine Site</Text>
          <Text style={styles.subtext}>
            Choose the active open-pit quarry or underground shaft site for safety auditing.
          </Text>
        </View>

        {/* Mine Roster List */}
        <View style={styles.mineList}>
          {MOCK_MINES.map((mine) => {
            const isSelected = selectedMine?.id === mine.id;
            return (
              <TouchableOpacity
                key={mine.id}
                activeOpacity={0.85}
                onPress={() => selectMine(mine)}
              >
                <AppCard
                  variant={isSelected ? "glow" : "glass"}
                  style={[styles.card, isSelected && styles.selectedCard]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.nameBox}>
                      <MapPin
                        size={16}
                        color={isSelected ? COLORS.primary : COLORS.textMuted}
                      />
                      <Text style={styles.mineName}>{mine.name}</Text>
                    </View>
                    {isSelected && <CheckCircle2 size={20} color={COLORS.primary} />}
                  </View>

                  <Text style={styles.location}>{mine.location}</Text>

                  <View style={styles.metaRow}>
                    <StatusBadge status={mine.status} size="sm" />
                    <Text style={styles.metaText}>DGMS: {mine.dgmsZone}</Text>
                    <Text style={styles.metaText}>Workers: {mine.activeWorkers}</Text>
                  </View>

                  <View style={styles.coordBox}>
                    <Text style={styles.coordText}>
                      Coordinates: {mine.latitude.toFixed(4)}° N, {mine.longitude.toFixed(4)}° E
                    </Text>
                  </View>
                </AppCard>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Next Button */}
        <AppButton
          title="Proceed to Safety Checklist"
          variant="primary"
          size="lg"
          icon={<ArrowRight size={18} color={COLORS.textInverse} />}
          onPress={handleNext}
          style={{ marginTop: SPACING.md }}
        />
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
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: SPACING.md,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    marginVertical: SPACING.md,
  },
  stepTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtext: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  mineList: {
    gap: 12,
  },
  card: {
    marginBottom: 0,
  },
  selectedCard: {
    borderColor: COLORS.primary,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nameBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  mineName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  location: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  coordBox: {
    backgroundColor: COLORS.surfaceStrong,
    padding: 6,
    borderRadius: RADIUS.xs,
  },
  coordText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: "700",
  },
});
