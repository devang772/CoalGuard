import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Server, HardDrive, ShieldCheck, RefreshCw, Trash2 } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../services/api";
import { BrandHeader } from "../components/BrandHeader";
import { AppCard } from "../components/ui/AppCard";
import { AppInput } from "../components/ui/AppInput";
import { AppButton } from "../components/ui/AppButton";
import { COLORS, RADIUS, SPACING } from "../constants/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState(API_BASE_URL);

  const handleClearCache = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert("Cache Cleared", "Local storage and offline draft cache have been reset.");
    } catch (error) {
      Alert.alert("Error", "Could not clear local storage.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <BrandHeader subtitle="System Configuration" />

          <Text style={styles.title}>Mobile App Settings</Text>

          {/* Backend Connection */}
          <AppCard variant="glass" style={styles.card}>
            <Text style={styles.sectionLabel}>Backend Endpoint URL</Text>
            <AppInput
              label="EXPO_PUBLIC_API_URL"
              value={apiUrl}
              onChangeText={setApiUrl}
              icon={<Server size={18} color={COLORS.primary} />}
            />
            <Text style={styles.subtext}>
              Set to your local backend IP e.g. http://192.168.1.100:8000/api/v1 for testing.
            </Text>
          </AppCard>

          {/* Storage & Offline Settings */}
          <AppCard variant="glass" style={styles.card}>
            <Text style={styles.sectionLabel}>Offline Cache Management</Text>
            <View style={styles.row}>
              <HardDrive size={18} color={COLORS.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Clear Offline Cache</Text>
                <Text style={styles.rowSub}>Reset pending queue and stored token data.</Text>
              </View>
            </View>

            <AppButton
              title="Clear Local Storage Cache"
              variant="outline"
              size="md"
              icon={<Trash2 size={16} color={COLORS.destructive} />}
              onPress={handleClearCache}
              style={{ marginTop: 10, borderColor: COLORS.destructive }}
              textStyle={{ color: COLORS.destructive }}
            />
          </AppCard>
        </ScrollView>
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
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginVertical: 12,
  },
  card: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  subtext: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  rowTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  rowSub: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
});
