import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../constants/theme";
import { BrandHeader } from "../components/BrandHeader";

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/(auth)/onboarding");
      }
    }
  }, [isLoading, isAuthenticated]);

  return (
    <View style={styles.container}>
      <BrandHeader subtitle="Field Intelligence Platform" />
      <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
