import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { COLORS, RADIUS } from "../../constants/theme";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  style?: ViewStyle;
}

export function StatusBadge({ status, size = "md", style }: StatusBadgeProps) {
  const getColors = () => {
    const s = status.toUpperCase();

    if (["PASSED", "COMPLIANT", "SAFE", "LOW", "ACTIVE"].includes(s)) {
      return { bg: "rgba(16, 185, 129, 0.18)", text: COLORS.safe, border: COLORS.safe };
    }
    if (["FAILED", "NON_COMPLIANT", "CRITICAL"].includes(s)) {
      return { bg: "rgba(244, 63, 94, 0.18)", text: COLORS.destructive, border: COLORS.destructive };
    }
    if (["WARNING", "HIGH", "MEDIUM"].includes(s)) {
      return { bg: "rgba(245, 158, 11, 0.18)", text: COLORS.warning, border: COLORS.warning };
    }
    if (["PENDING_SYNC", "NOT_APPLICABLE", "IN_PROGRESS"].includes(s)) {
      return { bg: "rgba(56, 189, 248, 0.18)", text: COLORS.info, border: COLORS.info };
    }

    return { bg: "rgba(129, 166, 154, 0.18)", text: COLORS.textMuted, border: COLORS.textMuted };
  };

  const colors = getColors();
  const isSm = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingHorizontal: isSm ? 6 : 10,
          paddingVertical: isSm ? 2 : 4,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: colors.text }]} />
      <Text style={[styles.text, { color: colors.text, fontSize: isSm ? 10 : 11 }]}>
        {status.replace(/_/g, " ")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    alignSelf: "flex-start",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
