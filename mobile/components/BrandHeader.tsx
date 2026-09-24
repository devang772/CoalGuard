import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { COLORS } from "../constants/theme";

export function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <ShieldCheck size={20} color={COLORS.primaryBright} strokeWidth={2.2} />
        <View style={styles.brandNode} />
      </View>
      <View>
        <Text style={styles.title}>
          FIELD <Text style={styles.titleHighlight}>OPS</Text>
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceStrong,
    borderColor: COLORS.border,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  brandNode: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primaryBright,
  },
  title: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
    fontFamily: "SpaceGrotesk-Bold",
  },
  titleHighlight: {
    color: COLORS.primaryBright,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
