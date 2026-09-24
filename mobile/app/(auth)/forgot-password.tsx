import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Mail, Send, CheckCircle } from "lucide-react-native";
import { BrandHeader } from "../../components/BrandHeader";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { AppCard } from "../../components/ui/AppCard";
import { COLORS, SPACING } from "../../constants/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>

        <BrandHeader subtitle="Security Recovery" />

        <View style={styles.header}>
          <Text style={styles.title}>Reset Credentials</Text>
          <Text style={styles.subtext}>
            Enter your official CoalGuard email to receive a security reset link or auditor PIN.
          </Text>
        </View>

        <AppCard variant="glass" style={styles.card}>
          {!submitted ? (
            <>
              <AppInput
                label="Registered Email"
                placeholder="inspector@coalguard.gov.in"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon={<Mail size={18} color={COLORS.primary} />}
              />
              <AppButton
                title="Send Recovery Link"
                variant="primary"
                size="lg"
                icon={<Send size={16} color={COLORS.textInverse} />}
                onPress={handleSubmit}
              />
            </>
          ) : (
            <View style={styles.successBox}>
              <CheckCircle size={40} color={COLORS.safe} />
              <Text style={styles.successTitle}>Recovery Sent!</Text>
              <Text style={styles.successMsg}>
                Instructions have been sent to {email}. Follow the email link to reset your PIN.
              </Text>
              <AppButton
                title="Return to Login"
                variant="outline"
                size="md"
                onPress={() => router.replace("/(auth)/login")}
                style={{ marginTop: 16 }}
              />
            </View>
          )}
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: SPACING.md,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    marginVertical: SPACING.md,
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtext: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    padding: SPACING.lg,
  },
  successBox: {
    alignItems: "center",
    paddingVertical: SPACING.md,
    gap: 8,
  },
  successTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  successMsg: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
});
