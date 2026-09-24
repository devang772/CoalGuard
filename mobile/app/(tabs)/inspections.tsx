import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClipboardCheck, Search, Filter, PlusCircle } from "lucide-react-native";
import { InspectionData } from "../../types";
import { fetchInspectionsList } from "../../services/inspection";
import { BrandHeader } from "../../components/BrandHeader";
import { InspectionCard } from "../../components/InspectionCard";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function InspectionsScreen() {
  const router = useRouter();
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PASSED" | "FAILED" | "PENDING">("ALL");

  useEffect(() => {
    async function loadData() {
      const list = await fetchInspectionsList();
      setInspections(list);
    }
    loadData();
  }, []);

  const filteredInspections = inspections.filter((item) => {
    const matchesSearch =
      item.mineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.inspectorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "PASSED") return item.status === "PASSED";
    if (activeTab === "FAILED") return item.status === "FAILED";
    if (activeTab === "PENDING") return item.status === "PENDING_SYNC" || !item.synced;
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <BrandHeader subtitle="Inspection Archives" />
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => router.push("/inspection/site")}
            activeOpacity={0.8}
          >
            <PlusCircle size={16} color={COLORS.textInverse} />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Safety Inspection Register</Text>

        {/* Search Bar */}
        <AppInput
          placeholder="Search by mine name, inspector or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={<Search size={16} color={COLORS.primary} />}
          containerStyle={{ marginBottom: 10 }}
        />

        {/* Status Filter Tabs */}
        <View style={styles.tabsRow}>
          {(["ALL", "PASSED", "FAILED", "PENDING"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab === "PENDING" ? "Pending Sync" : tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Inspection List */}
        <FlatList
          data={filteredInspections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <InspectionCard item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <ClipboardCheck size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Inspections Found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your search query or status filter.
              </Text>
            </View>
          }
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
    paddingBottom: 0,
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
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
  },
  newBtnText: {
    color: COLORS.textInverse,
    fontSize: 12,
    fontWeight: "800",
  },
  tabsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    height: 32,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  tabTextActive: {
    color: COLORS.textInverse,
  },
  listContent: {
    paddingBottom: 30,
  },
  emptyBox: {
    padding: 30,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
});
