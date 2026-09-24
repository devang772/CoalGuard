import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight, ShieldCheck, Camera } from "lucide-react-native";
import { useInspection } from "../../context/InspectionContext";
import { BrandHeader } from "../../components/BrandHeader";
import { ChecklistItemCard } from "../../components/ChecklistItemCard";
import { AppButton } from "../../components/ui/AppButton";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function ChecklistScreen() {
  const router = useRouter();
  const { checklist, updateChecklistStatus } = useInspection();

  const compliantCount = checklist.filter((c) => c.status === "COMPLIANT").length;
  const nonCompliantCount = checklist.filter((c) => c.status === "NON_COMPLIANT").length;

  const handleNext = () => {
    router.push("/inspection/camera");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <BrandHeader subtitle="Step 2 of 5: Safety Checklist" />
        </View>

        {/* Title & Progress Summary */}
        <View style={styles.header}>
          <Text style={styles.stepTitle}>DGMS Regulatory Audit Checklist</Text>
          <View style={styles.summaryBar}>
            <Text style={styles.summaryText}>
              Compliant: <Text style={{ color: COLORS.safe }}>{compliantCount}</Text> | Non-Compliant:{" "}
              <Text style={{ color: COLORS.destructive }}>{nonCompliantCount}</Text> | Total:{" "}
              {checklist.length}
            </Text>
          </View>
        </View>

        {/* Checklist Items ScrollView */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {checklist.map((item) => (
            <ChecklistItemCard
              key={item.id}
              item={item}
              onStatusChange={updateChecklistStatus}
            />
          ))}

          <AppButton
            title="Proceed to Evidence Camera Capture"
            variant="primary"
            size="lg"
            icon={<Camera size={18} color={COLORS.textInverse} />}
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
    paddingBottom: 0,
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
  header: {
    marginBottom: 10,
  },
  stepTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  summaryBar: {
    backgroundColor: COLORS.surfaceStrong,
    borderColor: COLORS.border,
    borderWidth: 1,
    padding: 8,
    borderRadius: RADIUS.xs,
  },
  summaryText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 20,
  },
});
