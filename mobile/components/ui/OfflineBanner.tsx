import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { WifiOff, RefreshCw } from "lucide-react-native";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";
import { useInspection } from "../../context/InspectionContext";

export function OfflineBanner() {
  const { pendingCount, syncPending } = useInspection();
  const [syncing, setSyncing] = React.useState(false);

  if (pendingCount === 0) return null;

  const handleSync = async () => {
    setSyncing(true);
    await syncPending();
    setSyncing(false);
  };

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <WifiOff size={16} color={COLORS.warning} />
        <Text style={styles.text}>
          {pendingCount} Inspection{pendingCount > 1 ? "s" : ""} Pending Sync
        </Text>
      </View>
      <TouchableOpacity
        style={styles.syncBtn}
        onPress={handleSync}
        disabled={syncing}
        activeOpacity={0.7}
      >
        <RefreshCw size={12} color={COLORS.textInverse} />
        <Text style={styles.syncText}>{syncing ? "Syncing..." : "Sync Now"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: COLORS.warning,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: "700",
  },
  syncBtn: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  syncText: {
    color: COLORS.textInverse,
    fontSize: 11,
    fontWeight: "800",
  },
});
