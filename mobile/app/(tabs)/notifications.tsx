import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, AlertTriangle, AlertOctagon, Info, Check } from "lucide-react-native";
import { MOCK_ALERTS } from "../../constants/mockData";
import { AlertItem } from "../../types";
import { BrandHeader } from "../../components/BrandHeader";
import { AppCard } from "../../components/ui/AppCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function NotificationsScreen() {
  const [alerts, setAlerts] = useState<AlertItem[]>(MOCK_ALERTS);

  const markAllAsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <BrandHeader subtitle="Hazard & Risk Alerts" />
          <TouchableOpacity style={styles.readAllBtn} onPress={markAllAsRead}>
            <Check size={14} color={COLORS.primary} />
            <Text style={styles.readAllText}>Mark Read</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Field Hazard Alerts</Text>

        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <AppCard
              variant="glass"
              style={[
                styles.alertCard,
                !item.read && { borderColor: COLORS.borderHighlight },
              ]}
            >
              <View style={styles.cardHeader}>
                <StatusBadge status={item.severity} size="sm" />
                <Text style={styles.timestamp}>{item.timestamp}</Text>
              </View>

              <Text style={styles.alertTitle}>{item.title}</Text>
              <Text style={styles.mineName}>{item.mineName}</Text>
              <Text style={styles.alertDesc}>{item.description}</Text>
            </AppCard>
          )}
        />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
  },
  readAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  readAllText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 20,
  },
  alertCard: {
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  timestamp: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  alertTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  mineName: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
  },
  alertDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
});
