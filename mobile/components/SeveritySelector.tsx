import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { AlertOctagon, AlertTriangle, AlertCircle, ShieldCheck } from "lucide-react-native";
import { SeverityLevel } from "../types";
import { COLORS, RADIUS, SPACING } from "../constants/theme";

interface SeveritySelectorProps {
  selected: SeverityLevel;
  onSelect: (severity: SeverityLevel) => void;
}

export function SeveritySelector({ selected, onSelect }: SeveritySelectorProps) {
  const tiers: Array<{
    level: SeverityLevel;
    label: string;
    icon: React.ReactNode;
    activeBg: string;
    activeBorder: string;
    textColor: string;
  }> = [
    {
      level: "LOW",
      label: "Low Risk",
      icon: <ShieldCheck size={16} color={selected === "LOW" ? "#ffffff" : COLORS.safe} />,
      activeBg: COLORS.safe,
      activeBorder: COLORS.safe,
      textColor: COLORS.safe,
    },
    {
      level: "MEDIUM",
      label: "Medium Risk",
      icon: <AlertCircle size={16} color={selected === "MEDIUM" ? "#ffffff" : COLORS.warning} />,
      activeBg: COLORS.warning,
      activeBorder: COLORS.warning,
      textColor: COLORS.warning,
    },
    {
      level: "HIGH",
      label: "High Hazard",
      icon: <AlertTriangle size={16} color={selected === "HIGH" ? "#ffffff" : "#f97316"} />,
      activeBg: "#f97316",
      activeBorder: "#f97316",
      textColor: "#f97316",
    },
    {
      level: "CRITICAL",
      label: "Critical Danger",
      icon: <AlertOctagon size={16} color={selected === "CRITICAL" ? "#ffffff" : COLORS.destructive} />,
      activeBg: COLORS.destructive,
      activeBorder: COLORS.destructive,
      textColor: COLORS.destructive,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Hazard Severity Assessment</Text>
      <View style={styles.grid}>
        {tiers.map((tier) => {
          const isSelected = selected === tier.level;
          return (
            <TouchableOpacity
              key={tier.level}
              activeOpacity={0.8}
              style={[
                styles.tierBtn,
                {
                  borderColor: isSelected ? tier.activeBorder : COLORS.border,
                  backgroundColor: isSelected ? tier.activeBg : COLORS.surface,
                },
              ]}
              onPress={() => onSelect(tier.level)}
            >
              {tier.icon}
              <Text
                style={[
                  styles.tierText,
                  { color: isSelected ? "#ffffff" : tier.textColor },
                ]}
              >
                {tier.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tierBtn: {
    width: "48%",
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  tierText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
