import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { Check, X, Minus, ShieldAlert } from "lucide-react-native";
import { ChecklistItem, ChecklistStatus } from "../types";
import { AppCard } from "./ui/AppCard";
import { COLORS, RADIUS, SPACING } from "../constants/theme";

interface ChecklistItemCardProps {
  item: ChecklistItem;
  onStatusChange: (id: string, status: ChecklistStatus, remarks?: string) => void;
}

export function ChecklistItemCard({ item, onStatusChange }: ChecklistItemCardProps) {
  const [remarks, setRemarks] = React.useState(item.remarks || "");

  const handleStatus = (status: ChecklistStatus) => {
    onStatusChange(item.id, status, remarks);
  };

  const handleRemarksBlur = () => {
    onStatusChange(item.id, item.status, remarks);
  };

  return (
    <AppCard variant="glass" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.clauseBadge}>
          <ShieldAlert size={10} color={COLORS.primary} />
          <Text style={styles.clauseText}>{item.dgmsClause}</Text>
        </View>
        <Text style={styles.category}>{item.category}</Text>
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>

      {/* Button options: Compliant / Non-Compliant / N/A */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnCompliant,
            item.status === "COMPLIANT" && styles.btnCompliantActive,
          ]}
          onPress={() => handleStatus("COMPLIANT")}
          activeOpacity={0.8}
        >
          <Check
            size={14}
            color={item.status === "COMPLIANT" ? COLORS.textInverse : COLORS.safe}
          />
          <Text
            style={[
              styles.btnText,
              { color: item.status === "COMPLIANT" ? COLORS.textInverse : COLORS.safe },
            ]}
          >
            Compliant
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnNonCompliant,
            item.status === "NON_COMPLIANT" && styles.btnNonCompliantActive,
          ]}
          onPress={() => handleStatus("NON_COMPLIANT")}
          activeOpacity={0.8}
        >
          <X
            size={14}
            color={item.status === "NON_COMPLIANT" ? "#ffffff" : COLORS.destructive}
          />
          <Text
            style={[
              styles.btnText,
              {
                color:
                  item.status === "NON_COMPLIANT" ? "#ffffff" : COLORS.destructive,
              },
            ]}
          >
            Non-Compliant
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnNA,
            item.status === "NOT_APPLICABLE" && styles.btnNAActive,
          ]}
          onPress={() => handleStatus("NOT_APPLICABLE")}
          activeOpacity={0.8}
        >
          <Minus
            size={14}
            color={item.status === "NOT_APPLICABLE" ? COLORS.textInverse : COLORS.textMuted}
          />
          <Text
            style={[
              styles.btnText,
              {
                color:
                  item.status === "NOT_APPLICABLE" ? COLORS.textInverse : COLORS.textMuted,
              },
            ]}
          >
            N/A
          </Text>
        </TouchableOpacity>
      </View>

      {/* Optional Remarks TextInput */}
      <TextInput
        style={styles.remarksInput}
        placeholder="Add remark or field observation note..."
        placeholderTextColor={COLORS.textSubtle}
        value={remarks}
        onChangeText={setRemarks}
        onBlur={handleRemarksBlur}
      />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  clauseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clauseText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  category: {
    color: COLORS.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  title: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  btn: {
    flex: 1,
    height: 36,
    borderRadius: RADIUS.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
  },
  btnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  btnCompliant: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  btnCompliantActive: {
    backgroundColor: COLORS.safe,
    borderColor: COLORS.safe,
  },
  btnNonCompliant: {
    backgroundColor: "rgba(244, 63, 94, 0.08)",
    borderColor: "rgba(244, 63, 94, 0.3)",
  },
  btnNonCompliantActive: {
    backgroundColor: COLORS.destructive,
    borderColor: COLORS.destructive,
  },
  btnNA: {
    backgroundColor: "rgba(129, 166, 154, 0.08)",
    borderColor: "rgba(129, 166, 154, 0.3)",
  },
  btnNAActive: {
    backgroundColor: COLORS.textMuted,
    borderColor: COLORS.textMuted,
  },
  remarksInput: {
    backgroundColor: COLORS.surfaceStrong,
    borderColor: COLORS.borderSubtle,
    borderWidth: 1,
    borderRadius: RADIUS.xs,
    color: COLORS.text,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
