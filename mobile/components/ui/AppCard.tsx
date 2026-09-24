import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING } from "../../constants/theme";

interface AppCardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: "glass" | "solid" | "glow" | "outline";
}

export function AppCard({ children, style, variant = "glass" }: AppCardProps) {
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case "glass":
        return {
          backgroundColor: COLORS.surface,
          borderColor: COLORS.border,
          borderWidth: 1,
        };
      case "solid":
        return {
          backgroundColor: COLORS.surfaceStrong,
          borderColor: COLORS.borderSubtle,
          borderWidth: 1,
        };
      case "glow":
        return {
          backgroundColor: COLORS.surface,
          borderColor: COLORS.borderHighlight,
          borderWidth: 1,
          ...SHADOWS.glowPrimary,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderColor: COLORS.border,
          borderWidth: 1,
        };
      default:
        return {};
    }
  };

  return <View style={[styles.card, getVariantStyles(), style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
    ...SHADOWS.card,
  },
});
