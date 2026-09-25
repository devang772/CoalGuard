import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore, DEMO_USERS } from '../../src/store/auth';
import { loginApi } from '../../src/api/endpoints';
import { BigButton } from '../../src/components/BigButton';
import { colors } from '../../src/theme/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [phone, setPhone] = useState('9876543210');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await loginApi(phone, password);
      login(res.user, res.access_token);
      router.replace('/(auth)/permissions' as any);
    } catch (e: any) {
      Alert.alert('Login Error', e.message || 'Unable to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const quickLoginRole = (roleKey: keyof typeof DEMO_USERS) => {
    const user = DEMO_USERS[roleKey];
    login(user, 'mock-jwt-token');
    router.replace('/(auth)/permissions' as any);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Feather name="shield" size={40} color={colors.emerald} />
        </View>
        <Text style={styles.title}>KHANAN NETRA</Text>
        <Text style={styles.subtitle}>Netra Mobile · Mine Governance Platform</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Phone Number / मोबाइल नंबर</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter 10-digit number"
          placeholderTextColor="#64748B"
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Password / पासवर्ड</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#64748B"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <BigButton
          title="Login / प्रवेश करें"
          onPress={handleLogin}
          loading={loading}
          style={{ marginTop: 24 }}
        />
      </View>

      {/* Demo Quick-Login Chips */}
      <View style={styles.demoSection}>
        <Text style={styles.demoHeader}>⚡ Demo Quick Login Roles:</Text>
        <View style={styles.chipGrid}>
          <TouchableOpacity style={styles.chip} onPress={() => quickLoginRole('safety_officer')}>
            <Text style={styles.chipText}>🛡️ Safety Officer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chip} onPress={() => quickLoginRole('mine_manager')}>
            <Text style={styles.chipText}>🏗️ Mine Manager</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chip} onPress={() => quickLoginRole('worker')}>
            <Text style={styles.chipText}>👷 Worker</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chip} onPress={() => quickLoginRole('contractor_admin')}>
            <Text style={styles.chipText}>📋 Contractor Admin</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#05080A',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#0D1518',
    borderWidth: 1.5,
    borderColor: '#1A2B26',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.emerald,
    marginTop: 4,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#0D1518',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.emerald,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#1A2B26',
    backgroundColor: '#05080A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1A2B26',
    backgroundColor: '#05080A',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  eyeBtn: {
    padding: 8,
  },
  demoSection: {
    marginTop: 30,
  },
  demoHeader: {
    color: colors.emerald,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#0D1518',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  chipText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
