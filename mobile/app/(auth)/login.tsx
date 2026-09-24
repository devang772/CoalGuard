import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mail, Lock, LogIn, ShieldCheck, ArrowLeft, UserCheck } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { BrandHeader } from "../../components/BrandHeader";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { AppCard } from "../../components/ui/AppCard";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { loginUser, isLoading } = useAuth();

  const [email, setEmail] = useState("amit.sharma@coalguard.gov.in");
  const [password, setPassword] = useState("Inspector123!");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Please provide both email address and password.");
      return;
    }

    setErrorMsg(null);
    const res = await loginUser(email, password);
    if (res.success) {
      router.replace("/(tabs)/home");
    } else {
      setErrorMsg(res.error || "Login authentication failed.");
    }
  };

  const fillQuickDemo = (role: "INSPECTOR" | "MANAGER") => {
    if (role === "INSPECTOR") {
      setEmail("amit.sharma@coalguard.gov.in");
      setPassword("Inspector123!");
    } else {
      setEmail("rajesh.manager@coalguard.gov.in");
      setPassword("Manager123!");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Bar */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={20} color={COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <BrandHeader subtitle="Inspector Command Terminal" />
            <Text style={styles.headline}>Field Portal Login</Text>
            <Text style={styles.subtext}>
              Sign in with your CoalGuard safety auditor credentials to sync offline field inspections.
            </Text>
          </View>

          {/* Form Card */}
          <AppCard variant="glass" style={styles.formCard}>
            <AppInput
              label="Official Email"
              placeholder="e.g. inspector@coalguard.gov.in"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              icon={<Mail size={18} color={COLORS.primary} />}
            />

            <AppInput
              label="Security Password"
              placeholder="••••••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon={<Lock size={18} color={COLORS.primary} />}
            />

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text style={styles.forgotText}>Forgot Password or PIN?</Text>
            </TouchableOpacity>

            <AppButton
              title="Authenticate & Enter Portal"
              variant="primary"
              size="lg"
              loading={isLoading}
              icon={<LogIn size={18} color={COLORS.textInverse} />}
              onPress={handleLogin}
              style={{ marginTop: 8 }}
            />
          </AppCard>

          {/* Demo Login Quick Fill */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>QUICK DEMO ONE-TAP LOGIN</Text>
            <View style={styles.demoButtons}>
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => {
                  fillQuickDemo("INSPECTOR");
                  handleLogin();
                }}
              >
                <UserCheck size={14} color={COLORS.primary} />
                <Text style={styles.demoBtnText}>Inspector Amit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => {
                  fillQuickDemo("MANAGER");
                  handleLogin();
                }}
              >
                <ShieldCheck size={14} color={COLORS.accent} />
                <Text style={styles.demoBtnText}>Manager Rajesh</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 40,
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
  headerSection: {
    marginBottom: SPACING.lg,
  },
  headline: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 4,
  },
  subtext: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  formCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  errorBox: {
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    borderColor: COLORS.destructive,
    borderWidth: 1,
    borderRadius: RADIUS.xs,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.destructive,
    fontSize: 12,
    fontWeight: "600",
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  demoSection: {
    marginTop: SPACING.xs,
  },
  demoTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 10,
  },
  demoButtons: {
    flexDirection: "row",
    gap: 10,
  },
  demoBtn: {
    flex: 1,
    height: 42,
    backgroundColor: COLORS.surfaceStrong,
    borderColor: COLORS.borderHighlight,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  demoBtnText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
});
