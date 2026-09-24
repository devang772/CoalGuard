import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { MapPin, Calendar, AlertTriangle, ChevronRight, User, Crosshair } from "lucide-react-native";
import { InspectionData } from "../types";
import { AppCard } from "./ui/AppCard";
import { StatusBadge } from "./ui/StatusBadge";
import { COLORS, RADIUS, SPACING } from "../constants/theme";

export function InspectionCard({ item }: { item: InspectionData }) {
  const router = useRouter();

  const formattedDate = new Date(item.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/inspection-details/${item.id}` as any)}
    >
      <AppCard variant="glass" style={styles.card}>
        <View style={styles.header}>
          <StatusBadge status={item.status} size="sm" />
          <Text style={styles.date}>
            <Calendar size={11} color={COLORS.textMuted} /> {formattedDate}
          </Text>
        </View>

        <Text style={styles.mineName}>{item.mineName}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <User size={11} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{item.inspectorName}</Text>
          </View>
          {item.location && (
            <View style={styles.metaItem}>
              <Crosshair size={11} color={COLORS.primary} />
              <Text style={styles.metaText}>
                {item.location.latitude.toFixed(4)}° N
              </Text>
            </View>
          )}
        </View>

        {item.hazards && item.hazards.length > 0 && (
          <View style={styles.hazardBox}>
            <AlertTriangle size={12} color={COLORS.warning} />
            <Text style={styles.hazardText} numberOfLines={1}>
              {item.hazards.join(", ")}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.photosCount}>
            📷 {item.photos ? item.photos.length : 0} Evidence Photos
          </Text>
          <View style={styles.arrowBox}>
            <Text style={styles.viewDetailsText}>View Log</Text>
            <ChevronRight size={14} color={COLORS.primary} />
          </View>
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  date: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  mineName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  hazardBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 6,
    borderRadius: RADIUS.xs,
    marginBottom: 8,
  },
  hazardText: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingTop: 8,
    marginTop: 2,
  },
  photosCount: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  arrowBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewDetailsText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },
});
