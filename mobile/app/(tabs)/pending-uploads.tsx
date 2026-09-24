import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WifiOff, RefreshCw, CheckCircle2, UploadCloud, AlertCircle } from "lucide-react-native";
import { useInspection } from "../../context/InspectionContext";
import { BrandHeader } from "../../components/BrandHeader";
import { InspectionCard } from "../../components/InspectionCard";
import { AppButton } from "../../components/ui/AppButton";
import { AppCard } from "../../components/ui/AppCard";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function PendingUploadsScreen() {
  const { pendingList, syncPending, refreshPendingCount } = useInspection();
  const [syncing, setSyncing] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const handleSyncAll = async () => {
    setSyncing(true);
    setResultMsg(null);
    const res = await syncPending();
    setSyncing(false);
    if (res.syncedCount > 0) {
      setResultMsg(`Successfully synced ${res.syncedCount} offline inspection(s) to CoalGuard backend.`);
    } else if (res.failedCount > 0) {
      setResultMsg("Network backend unreachable. Inspections safely retained in local queue.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <BrandHeader subtitle="Offline Queue Manager" />
        </View>

        <Text style={styles.title}>Pending Upload Queue</Text>
        <Text style={styles.subtext}>
          Inspections captured underground or in remote pit areas with no internet are queued locally.
        </Text>

        {resultMsg && (
          <View style={styles.resultBox}>
            <AlertCircle size={16} color={COLORS.primary} />
            <Text style={styles.resultText}>{resultMsg}</Text>
          </View>
        )}

        {pendingList.length > 0 ? (
          <>
            <AppCard variant="glow" style={styles.syncCard}>
              <View style={styles.syncHeader}>
                <WifiOff size={20} color={COLORS.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.queueCountText}>
                    {pendingList.length} Inspection{pendingList.length > 1 ? "s" : ""} Waiting
                  </Text>
                  <Text style={styles.queueSubText}>
                    Ready to upload to CoalGuard Command Server
                  </Text>
                </View>
              </View>

              <AppButton
                title={syncing ? "Syncing Batch..." : "Sync All Pending Inspections"}
                variant="primary"
                size="md"
                loading={syncing}
                icon={<RefreshCw size={16} color={COLORS.textInverse} />}
                onPress={handleSyncAll}
              />
            </AppCard>

            <FlatList
              data={pendingList}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <InspectionCard item={item} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : (
          <View style={styles.emptyBox}>
            <CheckCircle2 size={48} color={COLORS.safe} />
            <Text style={styles.emptyTitle}>Queue Clean & Synced!</Text>
            <Text style={styles.emptySub}>
              All your field safety inspections have been successfully transmitted to the central database.
            </Text>
          </View>
        )}
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
  headerRow: {
    marginBottom: 8,
  },
  title: {
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
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: RADIUS.xs,
    padding: 10,
    marginBottom: SPACING.md,
  },
  resultText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  syncCard: {
    marginBottom: SPACING.md,
  },
  syncHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  queueCountText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  queueSubText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    gap: 10,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
